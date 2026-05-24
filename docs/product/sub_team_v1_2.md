---
title: 서브팀 인큐베이팅 시스템 v1.2 spec — 다중 소속 + 체크박스 UI + 내보내기
status: 결재 완료 (2026-05-21 저녁)
phase: D-day(5/25) 이후 별도 트랙 진입 (Phase 1 ~3.5h)
owner: 임태성 실장 (bylts@naver.com, ga_manager) + Claude Code 실행
supersedes: docs/archive/_deprecated/sub_team_incubation_v1.md (v1, 5/14 결재)
version: v1.2
date: 2026-05-21
related:
  - docs/role_system.md (9 role 체계)
  - pages/team-management.html (기존 초대 기능 보존)
  - public.sub_teams / public.sub_team_members (신설)
---

# 서브팀 인큐베이팅 시스템 v1.2

## 1. v1과의 격차 (Why v1.2)

v1(2026-05-14 결재) 격차 4건:

| v1 | v1.2 정정 |
|---|---|
| 단일 소속 (`users.sub_team_id` 단일 컬럼) | **다중 소속** (`sub_team_members` 매핑 테이블) |
| UI 본진 미정 (탭 vs dropdown) | **한 화면 + 체크박스** (4팀 전체 명단 + 3개 서브팀 컬럼) |
| 졸업 처리 미정 | **체크 해제 = 해당 서브팀에서만 제외** (다른 서브팀 유지) |
| 내보내기 기능 없음 | **퇴사자 내보내기 신설** (admin 권한, is_active=false 비활성화) |

### 본 격차가 발생한 이유

팀장님 본인 명시 (2026-05-21 저녁):
> "복수 소속이야. 4팀 소속이면서, 임태성 실장 팀, 한재성 실장 팀, 한영미 실장 팀, 실제 현장에서 이런 경우들이 간혹 있어"

→ v1의 단일 소속 가정은 현장 실태와 격차. v1.2가 실태 정합.

---

## 2. 본진 (Why)

### 큰 그림 계층 (v1 그대로)

```
원세컨드 (SaaS)
  └─ GA (AZ금융)
      └─ 더원지점
          └─ 더원4팀 (29명 — Chrome 진단 2026-05-21 실측)
              └─ 서브팀 (인큐베이팅)
                  ├─ 한재성팀  (실장 = jaisung78@gmail.com)
                  ├─ 임태성팀  (실장 = bylts@naver.com)
                  └─ 한영미팀  (실장 = 미가입, 초대 선행 필요)
```

### 다중 소속 (실태)

한 사용자가 여러 서브팀에 동시 소속 가능. 예시:
- 김OO = 4팀 + 임태성팀 + 한재성팀 (3중 소속)
- 이OO = 4팀 + 한재성팀 + 한영미팀 (3중 소속)
- 박OO = 4팀 + 임태성팀만 (2중 소속)

각 실장이 본인 손으로 추가/제거. 자동 분류 없음.

### 인큐베이팅 본질

신규 입사자 → 실장이 본인 서브팀에 등록 → 일정 기간 인큐베이팅 → 정식 4팀원으로 졸업 또는 다른 실장 서브팀으로 이동.

---

## 3. DB 스키마

### 3-1. sub_teams 테이블 (v1 그대로, 보강)

```sql
CREATE TABLE public.sub_teams (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  name          text NOT NULL,                       -- "임태성팀" 등
  leader_id     uuid REFERENCES public.users(id),    -- 실장 (ga_manager)
  description   text,                                 -- 옵션
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE(team_id, name)
);

CREATE INDEX idx_sub_teams_team    ON public.sub_teams(team_id);
CREATE INDEX idx_sub_teams_leader  ON public.sub_teams(leader_id);
CREATE INDEX idx_sub_teams_active  ON public.sub_teams(is_active);

ALTER TABLE public.sub_teams ENABLE ROW LEVEL SECURITY;
```

### 3-2. sub_team_members 매핑 테이블 (신설 — v1.2 핵심)

```sql
CREATE TABLE public.sub_team_members (
  sub_team_id  uuid NOT NULL REFERENCES public.sub_teams(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at    timestamptz DEFAULT now(),
  added_by     uuid REFERENCES public.users(id),     -- 추가한 실장 추적
  PRIMARY KEY (sub_team_id, user_id)
);

CREATE INDEX idx_sub_team_members_user ON public.sub_team_members(user_id);
CREATE INDEX idx_sub_team_members_team ON public.sub_team_members(sub_team_id);

ALTER TABLE public.sub_team_members ENABLE ROW LEVEL SECURITY;
```

### 3-3. users.is_active 컬럼 신설 (퇴사자 처리)

```sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

CREATE INDEX idx_users_active ON public.users(is_active);
```

→ 퇴사자 = `is_active=false`. 데이터 보존 + 향후 복귀 가능 + 통계 정합.

### 3-4. v1 폐기 사항

```sql
-- v1에서 박았던 users.sub_team_id 단일 컬럼 폐기 (다중 소속 위해)
-- v1 실제 적용된 적 없으면 DROP 불필요
-- 만약 박혀 있다면:
ALTER TABLE public.users DROP COLUMN IF EXISTS sub_team_id;
```

### 3-5. posts 확장 (v1 그대로)

```sql
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_audience_target_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_audience_target_check
  CHECK (audience_target IN (
    'all',                  -- 전체 (지점)
    'team_internal',        -- 4팀 통째
    'sub_team_internal',    -- 본인 서브팀만
    'sub_team_cross',       -- 서브팀 + 다른 서브팀 4팀 전체 노출
    'insurer_internal',
    'manager_only'
  ));

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS audience_sub_team_id uuid REFERENCES public.sub_teams(id);

CREATE INDEX IF NOT EXISTS idx_posts_audience_sub_team ON public.posts(audience_sub_team_id);
```

---

## 4. RLS 정책 (다중 소속 정합)

### 4-1. SECURITY DEFINER 함수 (다중 소속 위해 배열 반환)

```sql
-- 본인 소속 팀
CREATE OR REPLACE FUNCTION public.get_user_team_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT team_id FROM public.users WHERE id = auth.uid();
$$;

-- 본인 소속 서브팀 (다중 = 배열)
CREATE OR REPLACE FUNCTION public.get_user_sub_team_ids()
RETURNS uuid[] LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(array_agg(sub_team_id), ARRAY[]::uuid[])
  FROM public.sub_team_members
  WHERE user_id = auth.uid();
$$;

-- 본인 실장 권한 (서브팀 리더인지)
CREATE OR REPLACE FUNCTION public.is_sub_team_leader(p_sub_team_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sub_teams
    WHERE id = p_sub_team_id AND leader_id = auth.uid()
  );
$$;
```

### 4-2. sub_teams 정책

```sql
-- SELECT: 본인 팀 서브팀 전체 보기 (3개 서브팀 모두 노출)
CREATE POLICY sub_teams_select_team
ON public.sub_teams FOR SELECT TO authenticated
USING (team_id = public.get_user_team_id());

-- INSERT: 실장(ga_manager) + 지점장 + admin
CREATE POLICY sub_teams_insert_leader
ON public.sub_teams FOR INSERT TO authenticated
WITH CHECK (
  public.get_user_role() IN ('admin', 'ga_branch_manager', 'ga_manager')
  AND team_id = public.get_user_team_id()
  AND leader_id = auth.uid()  -- 본인이 리더로만 생성 가능
);

-- UPDATE: 본인 서브팀만 + admin
CREATE POLICY sub_teams_update_leader
ON public.sub_teams FOR UPDATE TO authenticated
USING (leader_id = auth.uid() OR public.is_admin())
WITH CHECK (leader_id = auth.uid() OR public.is_admin());

-- DELETE: admin만
CREATE POLICY sub_teams_delete_admin
ON public.sub_teams FOR DELETE TO authenticated
USING (public.is_admin());
```

### 4-3. sub_team_members 정책 (핵심)

```sql
-- SELECT: 본인 팀 전체 멤버십 보기 (투명성 = 다른 실장 서브팀도 볼 수 있음)
CREATE POLICY sub_team_members_select_team
ON public.sub_team_members FOR SELECT TO authenticated
USING (
  sub_team_id IN (
    SELECT id FROM public.sub_teams WHERE team_id = public.get_user_team_id()
  )
);

-- INSERT: 본인 서브팀에만 추가 가능 (실장 권한)
CREATE POLICY sub_team_members_insert_leader
ON public.sub_team_members FOR INSERT TO authenticated
WITH CHECK (
  public.is_sub_team_leader(sub_team_id)
  OR public.is_admin()
);

-- DELETE: 본인 서브팀에서만 제거 가능 (실장 권한)
CREATE POLICY sub_team_members_delete_leader
ON public.sub_team_members FOR DELETE TO authenticated
USING (
  public.is_sub_team_leader(sub_team_id)
  OR public.is_admin()
);
```

### 4-4. posts SELECT (다중 소속 정합)

```sql
CREATE POLICY posts_select_multi_subscribe
ON public.posts FOR SELECT TO authenticated
USING (
  -- (1) 전체 공지
  audience_target = 'all'

  -- (2) 본인 팀 공지
  OR (audience_target = 'team_internal'
      AND team_id = public.get_user_team_id())

  -- (3) 본인 서브팀 공지 (다중 소속 = 본인 sub_team_ids 배열 안 박혀 있으면 OK)
  OR (audience_target = 'sub_team_internal'
      AND audience_sub_team_id = ANY(public.get_user_sub_team_ids()))

  -- (4) 다른 서브팀 공지 (cross, 4팀 전체 노출)
  OR (audience_target = 'sub_team_cross'
      AND audience_sub_team_id IN (
        SELECT id FROM public.sub_teams WHERE team_id = public.get_user_team_id()
      ))

  -- (5) admin 전체
  OR public.is_admin()
);
```

### 4-5. posts INSERT (서브팀 공지 작성)

```sql
CREATE POLICY posts_insert_sub_team
ON public.posts FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.get_user_role() IN ('admin', 'ga_branch_manager', 'ga_manager')
  AND (
    -- sub_team_internal/cross 작성 시 본인 서브팀만
    audience_target NOT IN ('sub_team_internal', 'sub_team_cross')
    OR public.is_sub_team_leader(audience_sub_team_id)
    OR public.is_admin()
  )
);
```

---

## 5. UI 본진 (한 화면 + 체크박스)

### 5-1. 진입 경로

`pages/team-management.html` 기존 페이지에 섹션 추가:

```
[기존 섹션]
1. 팀원 목록
2. 초대하기  ← 2026-05-17 박혀 있음 (한영미 초대 시 사용)
3. 보험사 협업 계정
4. 역할 구조 안내

[v1.2 신설 섹션]
5. ★ 서브팀 관리  ← 신설
6. ★ 퇴사자 내보내기  ← admin만 노출
```

### 5-2. 서브팀 관리 화면 모형

```
┌────────────────────────────────────────────────────────────────────────┐
│ 서브팀 관리 — 임태성 실장 로그인 중                                     │
│                                                                         │
│  내 서브팀: 임태성팀 (8명)         [+ 새 서브팀 만들기]                │
├────────────────────────────────────────────────────────────────────────┤
│ # │ 이름   │ 가입일      │임태성팀│한재성팀│한영미팀│ 작업          │
├───┼───────┼────────────┼───────┼───────┼───────┼──────────────┤
│ 1 │ 김OO  │ 2026-04-12 │ ☑ ▼   │ ☑     │ ☐     │              │
│ 2 │ 이OO  │ 2026-03-08 │ ☐     │ ☑     │ ☑     │              │
│ 3 │ 박OO  │ 2026-05-01 │ ☑ ▼   │ ☐     │ ☐     │              │
│ 4 │ 정OO  │ 2026-02-19 │ ☐     │ ☑     │ ☐     │              │
│ ... (4팀 29명 전체 노출)                                              │
└────────────────────────────────────────────────────────────────────────┘
       ▼ = 본인 컬럼 (체크 시 즉시 토글)
       체크박스만 (▼ 없음) = 다른 실장 컬럼 (읽기 전용)
```

### 5-3. 권한별 컬럼 동작

| 로그인 사용자 | 임태성팀 컬럼 | 한재성팀 컬럼 | 한영미팀 컬럼 |
|---|---|---|---|
| 임태성 실장 | 토글 가능 ▼ | 읽기 전용 | 읽기 전용 |
| 한재성 실장 | 읽기 전용 | 토글 가능 ▼ | 읽기 전용 |
| 한영미 실장 | 읽기 전용 | 읽기 전용 | 토글 가능 ▼ |
| admin (팀장님) | 모두 토글 가능 | 모두 토글 가능 | 모두 토글 가능 |

### 5-4. 새 서브팀 만들기

- 버튼 클릭 → 모달
- 입력: 서브팀 이름 (예: "임태성팀")
- 자동 채움: leader_id = 본인, team_id = 본인 팀
- 한 실장 = 한 서브팀만 만들 수 있음 (UNIQUE 제약)

### 5-5. 퇴사자 내보내기 (admin만)

```
┌────────────────────────────────────────────────────────────────────────┐
│ ⚠️ 퇴사자 내보내기 (admin 전용)                                         │
├────────────────────────────────────────────────────────────────────────┤
│ 4팀 명단에서 사용자 선택:                                              │
│  ○ 김OO (2026-04-12 가입)                                              │
│  ○ 이OO (2026-03-08 가입)                                              │
│  ...                                                                    │
│                                                                         │
│ 선택한 사용자: 김OO                                                    │
│ 처리 방식:                                                              │
│  ⦿ 비활성화 (is_active=false, 데이터 보존, 복귀 가능) ← 추천          │
│  ○ 완전 삭제 (위험, 작성 글·답변 통째 사라짐)                          │
│                                                                         │
│              [취소]   [내보내기 실행]                                  │
└────────────────────────────────────────────────────────────────────────┘
```

비활성화 시:
- `users.is_active = false` 설정
- `sub_team_members`에서 해당 user_id 전수 삭제 (모든 서브팀에서 제거)
- 작성 글·답변은 보존
- 로그인 차단 (`auth.users`에서 ban 또는 RLS로 차단)

---

## 6. Phase 본진 (D-day 5/25 이후)

| Phase | 작업 | 분량 | 시점 |
|---|---|---|---|
| **Phase 0** | 한영미 초대 + 가입 완료 | ~10분 | D-day 이전 |
| **Phase 1** | DB 마이그레이션 (sub_teams + sub_team_members + users.is_active + RLS + SECURITY DEFINER 함수 + 시드 3건) | ~2h | D-day 후 즉시 (5/26~) |
| **Phase 2** | UI 구현 (team-management.html에 서브팀 섹션 + 퇴사자 내보내기 admin 섹션) | ~3h | Phase 1 후 |
| **Phase 3** | 실제 멤버 배정 (각 실장이 본인 손으로 4팀 29명 분류) | ~30분 | Phase 2 후 |
| **Phase 4** | 라이브 검증 (다중 소속 + 공지 수신 + 권한 격리) | ~1세션 | Phase 3 후 |

---

## 7. 한영미 초대 절차 (Phase 0)

### 7-1. 초대 발송 (팀장님 직접)

1. https://onesecond.solutions 로그인 (admin 또는 ga_manager 계정)
2. 사이드바 → 팀원관리 클릭
3. **+ 팀원 초대** 버튼
4. 입력:
   - 이메일: 한영미님 이메일
   - 역할: **ga_manager (실장)** 선택
5. **초대 링크 생성** 클릭 → 클립보드 자동 복사
6. 카카오톡/SMS/이메일로 한영미님께 전달

### 7-2. 한영미님 가입

1. 초대 링크 클릭 (`/home_v2.html?invite=<token>`)
2. 가입 폼 → 이메일·이름·전화번호 입력
3. 비밀번호 설정
4. 가입 완료 → role=ga_manager 자동 적용

### 7-3. 가입 후 검증 SQL (Chrome AI 의뢰)

```sql
SELECT id, email, role, name, team, created_at
FROM public.users
WHERE email = '<한영미 이메일>';
```

기대 결과: role=ga_manager, team=4팀

---

## 8. 9개 role 체계 정합

본 spec은 [docs/role_system.md](../role_system.md) 9 role 체계 정합:

- 서브팀 리더 = `ga_manager` (실장)
- 서브팀 멤버 = `ga_member` (설계사/팀장 직책)
- admin = 전역 권한
- ga_branch_manager (지점장) = 본인 지점 전체 + 4팀 서브팀 감독

---

## 9. 회귀 신호 (작업 진입 시 점검)

- ✅ §0 중립 독립 SaaS 정합 (다른 GA·지점에도 서브팀 적용 가능)
- ✅ §4 고객정보 저장 안 함 (서브팀 = 영업 정보, 고객정보 없음)
- ✅ Supabase 신버전 정합 (`pdnwgzneooyygfejrvbg`)
- ✅ RLS 자기 참조 회피 (SECURITY DEFINER 함수 사용)
- ✅ §15 정체성 (체크박스 = 딸깍 한 번)
- ✅ D-day 이후 진입 (5/25 신버전 디자인 전환 안정화 후)
- ✅ 4팀 인원 = 29명 실측 (메모리 갱신 완료)

회귀 시 즉시 보고:
- ❌ 단일 소속 가정 (v1 격차 재발)
- ❌ 자동 분류 시도 (실장 수동 배정 본질 위반)
- ❌ 다른 실장 서브팀 임의 수정 (권한 격리 위반)
- ❌ 퇴사자 완전 삭제 기본 (비활성화가 본질, 데이터 보존)

---

## 10. v1 → v1.2 변경 요약

| 영역 | v1 | v1.2 |
|---|---|---|
| 소속 방식 | 단일 (`users.sub_team_id`) | **다중** (`sub_team_members` 매핑) |
| UI | 탭 vs dropdown 미정 | **한 화면 + 체크박스** |
| SECURITY DEFINER | `get_user_sub_team_id()` 단일 | `get_user_sub_team_ids()` **배열** |
| 졸업 처리 | 미정 | **체크 해제 = 해당 서브팀만 제외** |
| 내보내기 | 없음 | **admin 전용 신설** (is_active=false) |
| 사용자 비활성화 | 없음 | `users.is_active` 컬럼 신설 |
| 진입 시점 | 5/18 후 | **D-day 5/25 후** |
| 4팀 인원 | 약 40~50명 추정 | **29명 실측** (Chrome 진단 2026-05-21) |
| 한영미 가입 | 미확인 | **미가입 확정** → 초대 선행 |

---

## 11. 미해결 / 후속 결재

1. **서브팀 명명 규칙** — 자동 채움 ("임태성팀" = 실장 이름 + "팀") vs 실장 수동 입력. 추천: 자동 채움 (편의)
2. **새 입사자 자동 분기** — 신규 가입 시 어느 서브팀에 자동 추가할지, 또는 admin/지점장 수동 배정. 추천: 수동 (인큐베이팅 = 본인 책임 매니저 선택)
3. **인큐베이팅 졸업 단계** — 일정 기간(예: 3개월) 후 정식 4팀원 분류? 또는 영구 인큐베이팅? 추천: 영구 (실장 판단으로 체크 해제 시 자동 졸업)
4. **다른 GA·지점 확장** — 본 spec = 다른 팀에도 적용 가능 구조. Phase 5에서 확장 검증.
5. **인큐베이팅 통계 대시보드** — admin/지점장이 각 서브팀 현황·증감 모니터링. v1.3 후보.

---

**END OF SPEC v1.2**

> 본 v1.2 = 2026-05-21 저녁 결재. D-day 5/25 신버전 디자인 전환 안정화 후 Phase 1~4 순차 진입.
