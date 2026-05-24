---
title: 서브팀 인큐베이팅 시스템 v1 spec — 다중 소속 + 하이브리드 채널
status: 결재 박힘 (2026-05-14 야간)
phase: 5/18 4팀 오픈 후 본진 진입 (Phase 1 ~3h)
owner: 팀장님 본진 + Claude Code 실행
related:
  - docs/role_system.md (9 role 체계)
  - public.teams / public.sub_teams (신설)
  - pages/board.html (.notice-room-shell 자리)
---

# 서브팀 인큐베이팅 시스템 v1 spec

## 1. 본질 (Why)

**4팀 안에 3개 서브팀(인큐베이팅팀) 박혀 있음** (2026-05-14 팀장님 본인 명시 박힘):
- 한재성팀
- 임태성팀
- 한영미팀

본 자리 = 보험 영업 GA 운영 본진. 신규 입사자 인큐베이팅 본진 = 실장(ga_manager) 박힌 자리가 자체 서브팀 박힘. **실장 = 서브팀 리더 = 인큐베이팅 매니저** 본진.

### 큰 그림 계층

```
원세컨드 (SaaS)
  └─ GA (보험대리점, AZ)
      └─ 지점/센터 (더원지점)
          └─ 팀 (더원4팀, 40~50명)
              └─ ★서브팀 (인큐베이팅, 각 ~13~16명)
                  ├─ 한재성팀
                  ├─ 임태성팀
                  └─ 한영미팀
```

### 다중 소속 본진 (팀장님 본인 명시 박힘)

> "인큐베이팅팀은 4팀 공지도 받아야 하고, 임태성팀 공지도 받아야 하고, 한영미팀 공지도 받아야해"

한 사용자(예: 한재성팀 본인) = **세 자리 동시 박힘 자리:**
1. ✅ 4팀 공지 (team_internal)
2. ✅ 본인 서브팀 공지 (한재성팀, sub_team_internal)
3. ✅ 다른 서브팀 공지 (임태성팀 / 한영미팀, sub_team_cross_visible)

본 자리 본진 = **다중 구독 본진**. 본인 박지 X 박힌 자리 = sub_team_internal 박힌 자리 일반 자리.

---

## 2. 채널 본진 (하이브리드)

**팀장님 본인 명시 박힘:** "포함이지만 또 따로 독립된 공간도 필요해"

### 매트릭스

| 채널 | board_type | 박힌 자리 | 본진 |
|---|---|---|---|
| 4팀 단톡방 | `manager_notice` | 전 4팀 사용자 (40~50명) | ✅ 박힘 (현재 박힌 자리) |
| 네비게이션방 | `navigation` | 더원지점 전체 (~100명) | ✅ 박힘 (현재 박힌 자리) |
| **★ 한재성팀방** | `sub_team_chat` | 한재성팀 사용자만 박힘 자리 | 🆕 신설 |
| **★ 임태성팀방** | `sub_team_chat` | 임태성팀 사용자만 박힘 자리 | 🆕 신설 |
| **★ 한영미팀방** | `sub_team_chat` | 한영미팀 사용자만 박힘 자리 | 🆕 신설 |

### 사용자 본인 박힐 자리

한 사용자(예: 한재성팀 본인 박힘 자리) 박힐 자리 = **5개 자리 진입 박힐 자리:**
1. 4팀 단톡방 (모든 4팀 공지)
2. 네비게이션방 (지점 전체 공지)
3. 본인 서브팀방 (한재성팀방)
4. 다른 서브팀방 (임태성팀방, 한영미팀방) — 다중 구독 본진 정합

---

## 3. DB 스키마

### 3-1. sub_teams 테이블 신설

```sql
CREATE TABLE public.sub_teams (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  name          text NOT NULL,                       -- "한재성팀" / "임태성팀" / "한영미팀"
  leader_id     uuid REFERENCES public.users(id),    -- 실장(ga_manager)
  member_count  int DEFAULT 0,
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

### 3-2. users.sub_team_id 박음

```sql
ALTER TABLE public.users
  ADD COLUMN sub_team_id uuid REFERENCES public.sub_teams(id) ON DELETE SET NULL;

CREATE INDEX idx_users_sub_team ON public.users(sub_team_id);
```

### 3-3. posts.audience_target 확장 + audience_sub_team_id 박음

```sql
-- audience_target 확장
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_audience_target_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_audience_target_check
  CHECK (audience_target IN (
    'all',                 -- 전체 (지점)
    'team_internal',       -- 4팀 통째
    'sub_team_internal',   -- 본인 서브팀만 (private)
    'sub_team_cross',      -- 서브팀 공지 + 다른 서브팀 박힐 자리 (4팀 전체에 박힘)
    'insurer_internal',
    'manager_only'
  ));

-- audience_sub_team_id 박음 (sub_team_internal·cross 박힌 자리 본인 박힐 자리)
ALTER TABLE public.posts
  ADD COLUMN audience_sub_team_id uuid REFERENCES public.sub_teams(id);

CREATE INDEX idx_posts_audience_sub_team ON public.posts(audience_sub_team_id);
```

### 3-4. board_type 박힘 자리

```sql
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_board_type_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_board_type_check
  CHECK (board_type IN (
    'qna',
    'manager_notice',   -- 4팀 단톡방
    'navigation',       -- 더원지점 네비게이션방
    'sub_team_chat',    -- 신설 ★ 서브팀방
    'insurer',
    'archive_legacy'
  ));
```

---

## 4. RLS 정책 (다중 구독 본진)

### 4-1. sub_teams SELECT

```sql
-- 전 사용자 = 본인 팀 박힌 자리 서브팀 박힘 자리
CREATE POLICY sub_teams_select_team
ON public.sub_teams FOR SELECT TO authenticated
USING (
  team_id = (SELECT team_id FROM public.users WHERE id = auth.uid())
);
```

### 4-2. posts SELECT (다중 구독 본진)

```sql
CREATE POLICY posts_select_multi_subscribe
ON public.posts FOR SELECT TO authenticated
USING (
  /* (1) 전체 공지 = 전 사용자 박힘 */
  audience_target = 'all'

  /* (2) 본인 팀 공지 = 본인 team_id 박힌 자리 박힘 */
  OR (audience_target = 'team_internal'
      AND team_id = (SELECT team_id FROM public.users WHERE id = auth.uid()))

  /* (3) 본인 서브팀 공지 = 본인 sub_team_id 박힌 자리 박힘 */
  OR (audience_target = 'sub_team_internal'
      AND audience_sub_team_id = (SELECT sub_team_id FROM public.users WHERE id = auth.uid()))

  /* (4) 다른 서브팀 공지 (cross) = 본인 team_id 일치 박힌 자리 박힘 (4팀 전체 박힘) */
  OR (audience_target = 'sub_team_cross'
      AND audience_sub_team_id IN (
        SELECT id FROM public.sub_teams WHERE team_id = (SELECT team_id FROM public.users WHERE id = auth.uid())
      ))

  /* (5) admin 박힘 */
  OR public.is_admin()
);
```

⚠️ **RLS 자기 참조 회피 표준** ([[rls_self_reference_avoidance]] 메모리 정합) — 본 자리 SELECT 서브쿼리 박힌 자리 본인 박힐 자리. 본 자리 박을 자리 = 본 자리 박힌 자리 본인 박힐 자리 SECURITY DEFINER 함수 박을 자리 본인 박힐 자리:

```sql
CREATE OR REPLACE FUNCTION public.get_user_team_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT team_id FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_sub_team_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT sub_team_id FROM public.users WHERE id = auth.uid();
$$;
```

본 자리 박힐 자리 본인 박힐 자리 RLS 박힌 자리 본인 박힐 자리 = `public.get_user_team_id()` / `public.get_user_sub_team_id()` 박힐 자리.

### 4-3. posts INSERT (실장 + admin)

```sql
CREATE POLICY posts_insert_sub_team
ON public.posts FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.get_user_role() IN ('admin', 'ga_branch_manager', 'ga_manager')
  /* sub_team_internal·cross = 본인 sub_team_id 박힌 자리 본인 박힐 자리 */
  AND (audience_target NOT IN ('sub_team_internal','sub_team_cross')
       OR audience_sub_team_id = public.get_user_sub_team_id()
       OR public.is_admin())
);
```

---

## 5. UI 본진

### 5-1. 사용자 본인 박힐 자리 진입

```
[메뉴 진입]
  └─ 현장의 소리 (board)
      ├─ 4팀 단톡방 (manager_notice) ✅ 박힘
      ├─ 더원지점 네비게이션방 (navigation) ✅ 박힘
      └─ 서브팀 채팅 (sub_team_chat) 🆕 신설
          ├─ [한재성팀] (탭 또는 dropdown)
          ├─ [임태성팀]
          └─ [한영미팀]
```

### 5-2. 서브팀 셸 본진 (단톡방 셸 재사용)

본 자리 박힐 자리 본인 박힐 자리 = 단톡방 셸(`.notice-room-shell`) 박힌 자리 본진 그대로 박힐 자리. 본진 본인 박힐 자리:
- 헤더 명명 = "한재성팀 채팅방" / "임태성팀 채팅방" / "한영미팀 채팅방"
- 메시지 풍선 본진 동일 (notice-msg-row.is-other / is-mine)
- [딸깍] 패턴 동일 (반복 학습 본진 정합)
- [최신글] 박힘 자리 동일

### 5-3. 서브팀 전환 본진

- **탭 본진** = 4팀 단톡방 옆에 [한재성팀] [임태성팀] [한영미팀] 박힐 자리
- **dropdown 본진** = "▼ 서브팀 박힘 자리" 박힐 자리 (탭 너무 많을 자리 박힐 가능)

본 자리 박힐 자리 = 결재 박을 자리 (5/18 후 본진 진입 시).

---

## 6. Phase 본진

| Phase | 본진 | 분량 | 시점 |
|---|---|---|---|
| **Phase 1 (v1.0)** | DB 신설(sub_teams + users.sub_team_id + posts 확장) + RLS + SECURITY DEFINER 함수 + 시드 3건(한재성팀/임태성팀/한영미팀) | ~2h | 5/18 후 즉시 |
| **Phase 2 (v1.1)** | board.html 서브팀 채팅 탭 박힘 + sub_team_chat 본진 | ~3h | 5/18 + 1주 |
| **Phase 3 (v1.2)** | 다중 구독 본진 라이브 검증 + UI 본진 + 푸시 알림 | ~1세션 | 5/18 + 2주 |
| **Phase 4 (v2.0)** | 인큐베이팅 자동화 본진 (신규 입사자 자동 서브팀 박힘, 실장 박힐 자리 본인 박힐 자리) | 큰 본진 | 6~7월 |

---

## 7. 5/18 4팀 오픈 시 본진 자리

**결재 박힘: 5/18 = 4팀 통째 박힘 자리 본진 (서브팀 박지 X)**

- 4팀 단톡방 = 모든 4팀 사용자 박힘 (현재 박힌 자리 정합)
- 네비게이션방 = 더원지점 전체 박힘 (현재 박힌 자리 정합)
- 서브팀방 = 박지 X (5/18 후 진입)

Phase 1 진입 시(5/18 후):
1. DB SQL 박음 (Supabase Dashboard) — sub_teams + users.sub_team_id + posts 확장 + RLS
2. SECURITY DEFINER 함수 박음 (get_user_team_id / get_user_sub_team_id)
3. 시드 3건 INSERT (한재성팀 / 임태성팀 / 한영미팀)
4. 4팀 사용자 본인 박힐 자리 sub_team_id UPDATE
5. 라이브 검증 (현 4팀 단톡방 회귀 0건 정합)

---

## 8. 미해결 / 후속 결재

1. **서브팀 전환 본진** = 탭 vs dropdown (UI 본진 결재 자리)
2. **서브팀 명명 본진** = "한재성팀" 박힌 자리 본진 = 실장 이름 자동 박힐지 본인 명시 박힐지 결재
3. **서브팀 멤버 박힐 자리** = 신규 입사자 박힐 자리 자동 박힘 본진 vs 실장 수동 박힘 본진
4. **인큐베이팅 본진 단계** = 신규 입사자가 인큐베이팅 박힌 자리 → 정식 4팀원 박힐 자리 = 단계 본진 박힐 자리 결재
5. **권한 본진** = 실장 박힌 자리 본인 서브팀 박힐 자리 외 다른 서브팀 박지 X 박힐 자리 본진 결재
6. **다중 구독 본진 시각** = 4팀 단톡방 + 한재성팀방 + 임태성팀방 + 한영미팀방 = 4개 자리 박힘 자리 = 사용자 본인 박힐 자리 한 자리에서 박힐지 (통합 뷰) 또는 별 자리(분기 뷰) 박힐지 결재

---

## 9. §15 정체성 본진 정합

- ✅ 딸깍 한 번 = 서브팀 전환 박힐 자리 정합
- ✅ 반복 패턴 박힘 = 단톡방 셸 박힘 자리 본진 그대로 박힐 자리 (학습 정합)
- ✅ 자기 발견 학습 = 사용자 본인 박힐 자리 박힐 가능
- ✅ 중독 회로 = 다중 구독 본진 = 본인 박지 X 박힌 자리 본인 박힐 자리 박힘 자리 정합

---

## 10. 회귀 신호 (작업 진입 시 점검)

- ✅ §0 중립 독립 SaaS 정합 (다른 GA·지점에도 서브팀 본진 박힐 자리 정합)
- ✅ §4 고객정보 저장 X (서브팀 = 영업 정보, 고객정보 X)
- ✅ Supabase 신버전 정합 (`pdnwgzneooyygfejrvbg`)
- ✅ RLS 자기 참조 회피 표준 (SECURITY DEFINER 함수 박음)
- ✅ §15 정체성 본진 (딸깍 + 학습·중독 본진 정합)
- ✅ 5/18 4팀 오픈 본진 박지 X 박을 자리 (5/18 후 진입 정합)

---

**END OF SPEC v1**

> 본 v1 = 4팀 인큐베이팅 본진 영구 spec. 5/18 후 진입 시 본 spec 통째 본인 박힐 자리.
