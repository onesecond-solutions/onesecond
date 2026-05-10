# Phase 1 Step 5 — 보험사 회원가입 폼 작업지시서

> **작성일:** 2026-05-09 오후 (Step 2-bis 본질 종료 직후)
> **메인 트랙:** v2.0 원수사 입점 모델 Phase 1 / **Step 5 (1.0세션)**
> **선행 종료:** Step 0 + 0-bis + 0-tris + 2 + **2-bis** + 3 + 4 (8/18 = 44.4%)
> **진실 원천:** `docs/specs/v2_insurer_admission_phase1_v2.md` § 1 + § 5 + § 6 + § 7
> **DB 신버전:** `pdnwgzneooyygfejrvbg` (onesecond-v1-restore-0420)
> **목적:** 9역할 회원가입 + 4중 방어 (도메인 화이트리스트 + Auth 이메일 인증 + status='pending' + 매니저 승인) 명문화 + 결재 9건 박스 + 5단계 작업 분할.

---

# § 1. Step 5 진입 컨텍스트

## 1-1. 현재 라이브 인프라 상태 (Step 2-bis 종료 시점)

| 영역 | 상태 |
|---|---|
| `handle_new_user` trigger | ✅ 9역할 8종 IN 절 + 폴백 `'ga_member'` (5/1 PASS) — admin 메타 가입 차단 (옵션 B) |
| `insurers` 테이블 | ✅ 31사 INSERT (5/7) — domain TEXT NULL 허용 (사후 admin 입력) |
| `users` 컬럼 | ✅ `insurer_id` / `branch_id` / `team_id` / `status` (active/suspended/pending, default 'active') / `last_seen_at` |
| `branches` / `teams` / IEB | ✅ 신설 + 시드 (더원지점 1 + 1팀~4팀) — IEB 0 row (Step 5 시점부터 INSERT) |
| SECURITY DEFINER 함수 | ✅ 17종 (admin/role/team/branch/IEB/setting 검증) |
| RLS posts 정책 | ✅ 17건 (5/9 sweep) + 자기참조 잔재 0건 |
| Auth 이메일 인증 (Confirm email ON) | ✅ Step 4 완료 (5/8) — `email_confirmed_at` 분기 가동 |

**라이브 사용자 분포 (5/9 점심 기준):**
- `admin` 1명 (bylts0428@gmail.com)
- `ga_member` 2명
- 9역할 중 6역할(`ga_branch_manager` / `ga_manager` / `ga_staff` / `insurer_*` 4종) 가입자 0건

## 1-2. 라이브 폼 라인 (4중 방어 미반영)

**위치:** `index.html` 인라인 `<section class="signup" id="signup">` (라인 1632~2087, 별도 `signup.html` 부재)

| 필드 | 라인 | 현 상태 |
|---|---|---|
| `f-name` | 1682 | 자유 입력 |
| `f-role` select | 1687~1693 | **3 옵션만:** `member` / `manager` / `branch_manager` (5역할 시절 잔존, 9역할 미반영) ⚠️ |
| `f-phone` | 1704 | 자유 입력 |
| `f-email` | 1709 | 자유 입력 (도메인 화이트리스트 부재) |
| `f-pw` / `f-pw2` | 1718 / 1727 | 자유 입력 |
| `f-company` | 1745 | free text 50자 (보험사 31사 드롭다운 부재) |
| `f-branch` | 1749 | free text 50자 (branches 시드 미연동) |
| `f-team` | 1756 | free text 30자 (teams 시드 미연동) |

**doSubmit() 흐름 (라인 1983~2066):**
```
POST {SUPABASE_URL}/auth/v1/signup
body.data = { name, phone, company, branch, role, team }
↓ Auth 가입 성공
↓ trigger handle_new_user (5/1 9역할 정정 PASS)
↓ public.users INSERT (id/email/name/phone/company/branch/role/team, plan='free', status='active')
↓ email_confirmed_at 분기 (Auth 인증 완료 시 즉시 vs 메일 발송 안내)
```

**부재 4건 (Step 5 본 작업):**
1. 보험사 임직원 / GA 분기 (인덱스 첫 단계)
2. 도메인 화이트리스트 검증 (`insurers.domain` 매칭)
3. status='pending' 분기 (보험사 임직원 default)
4. 매니저 승인 흐름 (`insurer_branch_manager` 또는 `admin` UPDATE)

## 1-3. 4중 방어 흐름도 (spec v2 § 1)

```
가입 진입 [index.html #signup]
   │
   ├─ 1단계: 사이트 분기
   │   ├─ "보험사 임직원" 카드
   │   │   └─ 보험사 31사 드롭다운 → 도메인 화이트리스트 검증 (1차 클라 + 2차 서버)
   │   │       └─ 직급 입력 → insurer_* 4역할 매핑
   │   │           └─ Auth 가입 (이메일 인증 ON)
   │   │               └─ trigger 또는 RPC: status='pending' INSERT
   │   │                   └─ 매니저 승인 대기 (insurer_branch_manager 또는 admin UPDATE → 'active')
   │   │
   │   └─ "GA 설계사·매니저" 카드
   │       └─ 회사·지점·팀 입력 (5/15 4팀 약 40~50명 시드 드롭다운 권장 → § 결정 D7)
   │           └─ 직급 입력 → ga_* 4역할 매핑
   │               └─ Auth 가입 (이메일 인증 ON)
   │                   └─ trigger handle_new_user → public.users (status='active' 즉시)
   │
   └─ 공통: 약관 동의 + 개인정보 수집 동의
```

**4중 방어 매트릭스:**
| # | 방어 | 적용 대상 | 위치 | Step 5 책임 |
|---|---|---|---|---|
| 1 | 도메인 화이트리스트 | 보험사 임직원만 | 클라 1차 + 서버 2차 | ⭐ Step 5 신설 |
| 2 | Auth 이메일 인증 | 전원 | Supabase Auth | ✅ Step 4 완료 |
| 3 | status='pending' | 보험사 임직원만 (D 결정 D3) | trigger 또는 RPC | ⭐ Step 5 신설 |
| 4 | 매니저 승인 | 보험사 임직원만 | admin_v2 D-1 융합 (D 결정 D4) | ⭐ Step 5 신설 (UI는 Phase 1 Step 10~15 흡수) |

---

# § 2. 라이브 raw 인용 (index.html 핵심 라인)

## 2-1. 현재 폼 select (1687~1693, 5역할 잔존)

```html
<select class="form-select" id="f-role" onchange="onRoleChange(); clearFieldError('f-role','e-role')">
  <option value="">선택해 주세요</option>
  <option value="member">팀장 / 설계사</option>
  <option value="manager">매니저 / 실장</option>
  <option value="branch_manager">지점장 / 센터장</option>
</select>
```

**관찰:**
- 9역할 8종 키 중 3종만 5역할 키로 노출 (`member` / `manager` / `branch_manager`)
- `staff` 옵션 부재 (4종 매핑 불가)
- 보험사 측 4역할 (`insurer_*`) 노출 부재 (사이트 분기 미반영)
- trigger는 9역할 받을 준비 완료지만 폼이 5역할 전송 → trigger 폴백으로 `'ga_member'` 자동 매핑됨 (현 가입자 2명 모두 `ga_member`)

## 2-2. 현재 doSubmit() 코어 (2002~2017)

```javascript
var authRes = await fetch(SUPABASE_URL + '/auth/v1/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
  body: JSON.stringify({
    email: email,
    password: pw,
    data: {
      name:    document.getElementById('f-name').value.trim(),
      phone:   document.getElementById('f-phone').value.trim(),
      company: document.getElementById('f-company').value.trim(),
      branch:  document.getElementById('f-branch').value.trim(),
      role:    document.getElementById('f-role').value,
      team:    document.getElementById('f-team').value.trim()
    }
  })
});
```

**관찰:**
- `data` 메타데이터 → `auth.users.raw_user_meta_data` 박힘 → trigger `handle_new_user`가 `public.users` INSERT
- `branch` / `team`은 free text 그대로 저장 (`branches.name` / `teams.name` 매칭 0건 — branch_id / team_id NULL 유지)
- `insurer_id` 메타데이터 부재 → trigger도 INSERT 안 함 (보험사 임직원 식별 불가)
- `status` 메타데이터 부재 → trigger의 INSERT는 `users.status` 컬럼 미언급 → DEFAULT 'active' 자동 적용

## 2-3. 현재 handle_new_user trigger 본문 (5/1 PASS, 진실 원천 `db_pre_migration_capture_20260501.md` § 1 + `role_migration_plan.md` § 3.1.5)

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_role text := meta->>'role';
BEGIN
  IF v_role IS NULL OR v_role NOT IN (
    'ga_branch_manager', 'ga_manager', 'ga_member', 'ga_staff',
    'insurer_branch_manager', 'insurer_manager', 'insurer_member', 'insurer_staff'
  ) THEN
    v_role := 'ga_member';
  END IF;

  INSERT INTO public.users (
    id, email, name, phone, company, branch, role, team, plan, created_at
  ) VALUES (
    NEW.id, NEW.email,
    NULLIF(meta->>'name', ''),  NULLIF(meta->>'phone', ''),
    NULLIF(meta->>'company', ''), NULLIF(meta->>'branch', ''),
    v_role, NULLIF(meta->>'team', ''),
    'free', NOW()
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;
```

**관찰:**
- 9역할 IN 절 ✅ (admin 차단)
- `insurer_id` / `branch_id` / `team_id` / `status` 메타데이터 미참조 — Step 5 결정 D5에 따라 trigger 정정 또는 별 RPC
- `plan = 'free'` 하드코딩 (D-7 결제 미도입 정합)
- `ON CONFLICT (id) DO NOTHING` 보존 (중복 방지)

---

# § 3. 결재 대기 결정 9건 (결정 박스) ✅ **결재 완료 (2026-05-09 오후, 9건 모두 Code 추천 채택)**

> 결재 결과: D1=(a) / D2=(a) / D3=(a) / D4=(a) / D5=(b) / D6=(a) / D7=(c) / D8=(b) / D9=(b)
> 본 § 3 진입 = § 4 작업 단위 진입 권한 확정.

## 3-D1. 보험사 / GA 분기 첫 화면 UX

**옵션:**
- (a) **큰 카드 2개 첫 화면** (시각적 강조) — 폼 진입 전 사이트 선택, 선택 후 폼 펼침 ⭐ Code 추천
- (b) 라디오 버튼 폼 첫 줄 (즉시 인식)
- (c) 첫 select 드롭다운 (회사명 select에서 분기 흡수)

**영향:**
- (a): index.html 신규 마크업 + JS 상태 머신 추가 (~80줄). UX 본질 = "보험사 vs GA 먼저, 그 다음 직급". 시안 디자인 패턴 정합 (board.html 카드 그리드 톤 재활용 가능).
- (b): 마크업 변경 최소 (~20줄), UX 약함.
- (c): 드롭다운 31사 + "일반 GA 설계사" 통합 → UX 혼동 위험.

**Code 추천:** (a) — UX 본질 + 차별화 + 4중 방어 의식 형성.
**롤백:** index.html 1632~ section 라이브 git revert.

**결재:** ✅ **(a) 채택** (2026-05-09)

---

## 3-D2. 도메인 화이트리스트 검증 위치

**옵션:**
- (a) **클라 1차 + 서버 2차** (D-pre.7 학습 정합 — DB 메타 통과 ≠ 라이브 안전) ⭐ Code 추천
- (b) 클라만 (1차 검증, JS 우회 가능 위험)
- (c) 서버만 (UX 안 좋음 — 가입 시도 후에야 차단)

**영향:**
- (a): 클라에서 `SELECT id FROM insurers WHERE domain = $1` (anon RLS) → trigger에 추가 검증 → 양쪽 통과 시만 INSERT. RLS 정책 신설 1건 필요 (`insurers anon select domain only`).
- (b): SUPABASE_KEY anon 노출 상태에서 JS 우회 가능 (index.html 라인 1981 참조).
- (c): 가입 폼 작성 후 가입 버튼 클릭 → 차단 메시지 → UX 약함.

**Code 추천:** (a) — D-pre.7 학습 (RLS 자기 참조 회피 + 서버 강제) 정합.
**위험:** anon에 insurers.domain SELECT 노출 → 31사 도메인 정보 공개. 단, public 정보(보험사 도메인은 공식 사이트로 검색 가능)이므로 risk 낮음.
**롤백:** RLS 정책 DROP + handle_new_user trigger 도메인 검증 부분 제거.

**결재:** ✅ **(a) 채택** (2026-05-09)

---

## 3-D3. status='pending' 적용 범위

**옵션:**
- (a) **보험사 임직원만 pending, GA는 active default** ⭐ Code 추천
- (b) 전원 pending (admin이 모든 가입 승인)
- (c) 첫 입점 보험사 + 신규 GA만 pending / 4팀 약 40~50명 active

**영향:**
- (a): trigger가 메타 `intent='insurer'` 시 `status='pending'` INSERT, 그 외 'active' 자동. 4팀 약 40~50명은 가입 즉시 사용 가능. spec § 1 #3 D-pre.5 활용 정합.
- (b): admin 운영 부담 폭증 (4팀 인원 + 보험사 + 향후 가입자 모두 일일이 승인). Phase 1 일정 (5/15) 위협.
- (c): GA 신규 = 신규 회원가입 가능한 GA가 늘어날 때 (5/22 이후 Phase 2 진입). 5/15 4팀 안정화 동안은 (a)와 동일.

**Code 추천:** (a) — 4팀 오픈 트래픽 흡수 + 보험사 임직원만 검증 게이트.
**롤백:** trigger DROP 후 5/1 PASS 시점 본문으로 복원.

**결재:** ✅ **(a) 채택** (2026-05-09)

---

## 3-D4. 매니저 승인 UI 진입

**옵션:**
- (a) **admin_v2 D-1 users 섹션 융합 (Phase 1 Step 10~15에서 흡수)** ⭐ Code 추천
- (b) Step 5 단독 신규 페이지 (`pages/insurer_approval.html`)
- (c) Dashboard SQL 임시 (admin 직접 UPDATE)

**영향:**
- (a): Step 10~15 admin 융합 트랙에 D-1 신규 카드 1개 ("승인 대기 N명") + UPDATE RPC 1건 (`admin_approve_user(user_id)`). Phase 1 16단계 안에서 자연 흡수.
- (b): 신규 페이지 + 라우팅 + RBAC 추가 = ~1.5세션 별도 비용. Step 5 본질 초과.
- (c): 5/15 첫 입점 보험사 0건 가정 시 1주일 동안만 임시. 이후 (a)로 전환.

**Code 추천:** (a) — Phase 1 Step 10~15 (admin 융합 2.4세션) 안에서 자연 흡수, Step 5 본질 = 폼 + DB.
**Step 5 책임:** RPC `admin_approve_user(user_id UUID)` 신설 + RLS 정책 1건. UI는 Step 10~15.
**롤백:** RPC DROP.

**결재:** ✅ **(a) 채택** (2026-05-09) — admin_v2 D-1 융합, Step 5는 RPC 신설까지만, UI는 Phase 1 Step 10~15 흡수

---

## 3-D5. handle_new_user trigger 정정 vs 별 RPC

**옵션:**
- (a) **trigger 본문에 status / insurer_id / branch_id / team_id 분기 추가 정정**
- (b) **trigger 그대로 + 회원가입 직후 별도 RPC `complete_signup(insurer_id, branch_id, team_id, status)` 호출** ⭐ Code 추천
- (c) trigger 그대로 + 클라에서 직접 UPDATE public.users (RLS 통과 필요)

**영향:**
- (a): trigger 부수효과 증가, 디버깅 복잡. SECURITY DEFINER 함수 변경 위험 (5/1 학습 정합).
- (b): 책임 분리 명확. RPC = SECURITY DEFINER, JWT 사용자 본인 row 한정 UPDATE. trigger는 5/1 PASS 본문 그대로.
- (c): 클라 직접 UPDATE는 RLS 정책 신설 필요, 보안 위험 증가 (사용자가 자기 status='active' 강제 가능).

**Code 추천:** (b) — trigger 부수효과 최소 + 5/1 학습 정합 + 책임 분리.
**구현:** RPC `complete_signup(p_insurer_id UUID, p_branch_id UUID, p_team_id UUID, p_status TEXT)` SECURITY DEFINER, `auth.uid()` 본인 row만 UPDATE, status 옵션 valid (pending/active만).
**롤백:** RPC DROP.

**결재:** ✅ **(b) 채택** (2026-05-09) — trigger 5/1 PASS 본문 그대로, 별 RPC `complete_signup` 신설

---

## 3-D6. 직급 입력 UI 형식

**옵션:**
- (a) **한국어 직급 select → JS에서 ga_*/insurer_* 자동 매핑** (D1 분기 정합) ⭐ Code 추천
- (b) 사이트 분기 후 직급 select 별도 (보험사 4종 select / GA 4종 select 분리)
- (c) 직급 input + JS validation (자유 입력 → 매핑 위험)

**영향:**
- (a): 한국어 select 1개 (지점장/센터장 / 매니저/실장 / 설계사·팀장 / 스텝/총무) + JS 매핑 함수. D1 사이트 분기 결과로 ga_* / insurer_* 접두어 자동 부여.
- (b): select 2개 노출/숨김 토글, 마크업 중복.
- (c): 자유 입력은 매핑 실패 위험 + 9역할 정합 깨짐.

**Code 추천:** (a) — D1과 분기 정합 + 마크업 단순.
**매핑 매트릭스:**
```
사이트 분기 = 보험사:
  지점장/센터장 → insurer_branch_manager
  매니저/실장   → insurer_manager
  설계사·팀장   → insurer_member
  스텝/총무    → insurer_staff
사이트 분기 = GA:
  지점장/센터장 → ga_branch_manager
  매니저/실장   → ga_manager
  설계사·팀장   → ga_member
  스텝/총무    → ga_staff
```
**롤백:** index.html select 5역할 옵션 git revert.

**결재:** ✅ **(a) 채택** (2026-05-09) — 한국어 직급 select + JS 자동 매핑 (D1 분기 결과로 ga_*/insurer_* 접두어 부여)

---

## 3-D7. GA 측 회사명 / 지점 / 팀명 처리 (5/15 4팀 약 40~50명용)

**옵션:**
- (a) 시드 드롭다운만 (더원지점 + 1팀~4팀, 신규 회사·지점·팀 가입 거부)
- (b) free text 유지 + 매니저 승인 시 매핑
- (c) **하이브리드 — 회사명 시드 드롭다운 + 지점/팀 드롭다운 + "기타 입력" 옵션** ⭐ Code 추천

**영향:**
- (a): 4팀 약 40~50명 가입 100% 매핑 자동 / 향후 신규 GA 거부 → Phase 2 (5/22~) 시점에 풀림.
- (b): 4팀 인원 free text 입력 시 오타·표기 혼선 → 매니저 일일이 매핑 부담. trigger가 branch_id / team_id NULL INSERT 후 별 트랙 매핑.
- (c): 시드 일치하면 자동 ID 매핑, 일치 안하면 free text 저장 + 매니저 승인 시 매핑. UX 부드러움.

**Code 추천:** (c) — 5/15 4팀 인원 자동 매핑 + 신규 가입자 흐름 보존.
**구현:** 회사명 select (AZ금융 / 기타) → 더원지점 select (1팀~4팀 / 기타) → 자동 매핑.
**위험:** 5/15 4팀 인원 직급 분포 사전 매핑 자료 없으면 ga_member 일괄 가입 후 매니저가 일부 ga_manager 승격 (별 트랙 운영 데이터).
**롤백:** select 마크업 → free text 복원.

**결재:** ✅ **(c) 채택** (2026-05-09) — 하이브리드 (시드 일치 자동 매핑 + "기타 입력" 보존)

---

## 3-D8. 이메일 인증 한국어 템플릿 (#31 미해결)

**옵션:**
- (a) Step 5 통합 처리 (Supabase Dashboard 템플릿 한국어 작성 + 적용)
- (b) **별 트랙 분리** ⭐ Code 추천 (Step 5 본질 = 폼 + DB, 메일 템플릿은 운영 별도)

**영향:**
- (a): Step 5 1.0세션 분량 초과 우려. Dashboard 작업 = 라이브 코드 0건 (별도 안전).
- (b): 5/15 오픈 시점에 영문 템플릿 그대로 → UX 약함 but 가입 흐름 정상. 별 트랙으로 5/12~14 사이 처리.

**Code 추천:** (b) — Step 5 본질 = 코드·DB. 별 트랙 #37 신설 권장.

**결재:** ✅ **(b) 채택** (2026-05-09) — 별 트랙 #37 분리, Step 5 본질 = 폼 + DB

---

## 3-D9. 닭-달걀 첫 보험사 매니저 생성 시점

**옵션:**
- (a) Step 5에서 admin_v2 D-1 매니저 직접 생성 흐름 포함
- (b) **Phase 1 종료 후로 미룸 (admin 직접 SQL/Dashboard로 첫 매니저 생성)** ⭐ Code 추천

**영향:**
- (a): Step 5 분량 초과 (~1.5세션). admin_v2 UI 추가 마크업.
- (b): Phase 1 5/15 오픈 = GA 4팀 약 40~50명 우선. 첫 보험사 입점은 Phase 1 종료 후 영업 트랙 (별 트랙).

**Code 추천:** (b) — Phase 1 골격 단계 본질 + 영업 트랙 분리.

**결재:** ✅ **(b) 채택** (2026-05-09) — Phase 1 종료 후 영업 트랙으로 미룸 (별 트랙 #39)

---

# § 4. 작업 단위 분할 (5단계)

> 결정 9건 결재 후 진입. 각 단계는 독립 commit + 검증 RUN 분리 (Supabase RUN 단위 세션 분리 학습 정합).

## 4-A. Step 5-A: 사전 분석 + 라이브 raw 캡처 ✅ **종료 (2026-05-09 오후)**

**산출물:**
- `docs/architecture/db_step5_pre_capture.md` (Chrome 실행 + Code 명문화) ✅
  - 10블록 raw + 사고 신호 4건 사전 점검 모두 PASS
  - 신버전 ID `pdnwgzneooyygfejrvbg` 검증 ✅
  - `handle_new_user` 5/1 PASS 본문 정합 회귀 ✅
  - branches/teams UUID raw 확보 (Step 5-C 시드 매핑 직접 활용)
  - complete_signup / admin_approve_user 함수 부재 확인 → Step 5-B 신설 대상 확정
  - insurers RLS 정책 3건 raw (anon 정책 0건 → Step 5-B 신설 대상 확정)

**🚨 신규 발견 (작업 흐름 영향):**
- **insurers 31사 domain 컬럼 전부 NULL (0/31 SET)** → D2 결재 (a) "클라+서버 도메인 화이트리스트 검증" 전제 비어있음
- → § 8-X 후속 결재 대기 (D2-bis) 신설

## 4-B. Step 5-B: DB 신설 (RPC 2건 + RLS 정책 1건 + 28사 도메인 UPDATE) ✅ **종료 (2026-05-09 오후)**

**산출물:**
- `docs/architecture/db_step5_b_capture.md` (Chrome RUN 1+2+3 PASS, RPC 2 + RLS 1 + 28사 UPDATE) ✅
  - RUN 1 Pre-flight 6/6 PASS
  - RUN 2 메인 트랜잭션 BEGIN~COMMIT (RPC 2 + RLS 1 + 28사 UPDATE) 에러 없이 완료
  - RUN 3 사후 검증 6/6 PASS (28사 SET / 3사 NULL / 그룹 공통 4건 / 사용자 무영향)

**잠재 발견 (별 트랙 #45 신설):** RPC 2종 PUBLIC EXECUTE 잔존 (PostgreSQL default GRANT). 본문 로직으로 실질 차단되어 보안 위험 0이지만 best practice로 `REVOKE FROM PUBLIC` 추가 권장. Step 5-C 후 또는 별 트랙 단독 처리.

---

## 4-B. Step 5-B 원본 SQL (참조용 보존)

**트랜잭션 1건 (BEGIN ~ COMMIT 한 RUN, RUN 단위 세션 분리 학습 정합):**

```sql
BEGIN;

-- RPC 1: 회원가입 직후 메타 보강 (status / insurer_id / branch_id / team_id 본인 row UPDATE)
CREATE OR REPLACE FUNCTION public.complete_signup(
  p_insurer_id UUID DEFAULT NULL,
  p_branch_id  UUID DEFAULT NULL,
  p_team_id    UUID DEFAULT NULL,
  p_status     TEXT DEFAULT 'active'
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth.uid() is null';
  END IF;
  IF p_status NOT IN ('active', 'pending') THEN
    RAISE EXCEPTION 'invalid status: %', p_status;
  END IF;

  UPDATE public.users
  SET insurer_id = p_insurer_id,
      branch_id  = p_branch_id,
      team_id    = p_team_id,
      status     = p_status
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_signup(UUID, UUID, UUID, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_signup(UUID, UUID, UUID, TEXT) FROM anon;

-- RPC 2: 매니저 승인 (insurer_branch_manager 또는 admin)
CREATE OR REPLACE FUNCTION public.admin_approve_user(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  caller_role TEXT := get_my_role();
  target_insurer_id UUID;
BEGIN
  IF NOT (is_admin() OR caller_role = 'insurer_branch_manager') THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT insurer_id INTO target_insurer_id FROM public.users WHERE id = p_user_id;
  IF target_insurer_id IS NULL THEN
    RAISE EXCEPTION 'target user has no insurer_id';
  END IF;

  -- insurer_branch_manager는 본인 회사만 승인 가능
  IF caller_role = 'insurer_branch_manager'
     AND target_insurer_id != current_user_insurer_id() THEN
    RAISE EXCEPTION 'cross-insurer approval denied';
  END IF;

  UPDATE public.users SET status = 'active' WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_approve_user(UUID) TO authenticated;

-- RLS 정책 신설 1: anon insurers.domain SELECT (도메인 화이트리스트 검증용)
CREATE POLICY insurers_select_anon_domain_check ON insurers FOR SELECT TO anon
USING (domain IS NOT NULL);

-- RLS 정책 신설 2: pending status 사용자 자기 row SELECT (가입 직후 본인 상태 확인)
-- (기존 정책 점검 후 부재 시만 신설 — Step 5-A 캡처 후 결정)

COMMIT;
```

**검증 RUN 별도 (RUN 단위 세션 분리 학습 정합):**
```sql
-- 함수 2종 본문 재출력
SELECT proname, pg_get_functiondef(oid) FROM pg_proc
WHERE proname IN ('complete_signup', 'admin_approve_user') AND pronamespace = 'public'::regnamespace;

-- RLS 정책 신설 1건 확인
SELECT tablename, policyname, roles FROM pg_policies
WHERE tablename = 'insurers' AND policyname = 'insurers_select_anon_domain_check';

-- 권한 확인
SELECT routine_name, grantee, privilege_type FROM information_schema.routine_privileges
WHERE routine_name IN ('complete_signup', 'admin_approve_user');
```

## 4-C. Step 5-C: 라이브 코드 신설 (index.html 폼 분기 + JS + trigger 정정) ✅ **종료 (2026-05-09 오후)**

**산출물:**
- `index.html` 본 빌드 (2090 → 2524줄, +434줄)
  - 사이트 분기 카드 2개 (보험사 임직원 / GA 설계사·매니저)
  - 보험사 폼 (31사 optgroup 손/생 select + 도메인 화이트리스트 + 직급)
  - GA 폼 (회사·지점·팀 시드 하이브리드 select + free text fallback)
  - JS 신설 함수 7건 (`selectSite` / `onInsurerChange` / `checkInsurerDomain` / `onGaCompanyChange` / `onGaBranchChange` / `onGaTeamChange` / `mapToRoleKey`)
  - JS 정정 함수 3건 (`onRoleChange` / `validate` / `doSubmit`)
  - 4중 방어 #1 + #3 + 9역할 매핑 + slug→UUID 매핑 (anon SELECT)
- `handle_new_user` trigger 4컬럼 추가 정정 (D5 재결재 (a))
  - DECLARE에 `v_status` 추가 + valid 체크
  - INSERT 컬럼 10 → 14개 (`+insurer_id` / `+branch_id` / `+team_id` / `+status`)
  - 9역할 IN 절 + 폴백 'ga_member' + plan='free' + ON CONFLICT 보존
  - 캡처: `docs/architecture/db_step5_handle_new_user_capture.md` (Chrome RUN 1+2+3 PASS)

**D5 재결재 흐름 (b → a):**
- 원래 결재 (b) "trigger 무변경 + RPC `complete_signup` 호출"
- 본 진입 직전 발견: Auth 이메일 인증 ON 상태에서 signup 직후 session 부재 → RPC 차단
- (a) 재결재: trigger 정정 (4컬럼 추가) + RPC 호출 폐기
- `complete_signup` RPC = Phase 1.5+ 정보 변경 용도로 보존 (DROP 안 함)
- `admin_approve_user` RPC = Step 10~15 admin 융합 트랙 그대로 보존

**Code 검수:**
- `var(--*)` 토큰 사용 492회 (룰 정합)
- `tokens.css` / `app.html` / `app.js` / `login.html` 무변경 (룰 정합)
- 직각 모서리 0건 / em·token 우선

---

## 4-C. Step 5-C 원본 SQL/JS 설계 (참조용 보존)

**index.html 변경:**
- 사이트 분기 첫 화면 카드 2개 마크업 (D1 결정 정합) — 라인 1632 직전 또는 직후 삽입
- 보험사 분기 시: 회사 31사 select + 도메인 화이트리스트 검증 JS + 직급 select (한국어 4종)
- GA 분기 시: 회사 select (AZ금융 / 기타) + 지점 select (더원지점 / 기타) + 팀 select (1팀~4팀 / 기타) + 직급 select
- doSubmit() 정정:
  - 직급 → 9역할 자동 매핑 (D6 매핑 매트릭스)
  - 보험사 분기 시 도메인 클라 검증 + 매핑된 insurer_id 메타 박힘
  - Auth signup 성공 직후 RPC `complete_signup` 호출 (D5 결정 정합)
- success 흐름 분기:
  - 보험사: "이메일 인증 + 매니저 승인 대기" 안내
  - GA: 기존 흐름 (이메일 인증 안내)

**JS 함수 신설 (~150줄 예상):**
```javascript
// 사이트 분기 상태 머신
window.gSignupSite = null;  // 'insurer' | 'ga' | null
window.selectSite = function(site) { ... };
window.mapRoleToKey = function(site, gradeKr) { ... };  // D6 매핑

// 도메인 화이트리스트 검증 (anon RLS 통과)
window.checkInsurerDomain = async function(email, insurerId) { ... };

// 가입 후 메타 보강
window.completeSignup = async function(jwt) { ... };
```

**파일 영향 추정:**
- `index.html`: +180~250줄 마크업 + JS, -10줄 (5역할 select)
- `css/tokens.css`: 0줄 (기존 토큰 활용 가정)

**라이브 검증:** Chrome 시나리오 8건 (사이트 2 × 직급 4)

## 4-D. Step 5-D: Auth 메타 정합 + 라이브 회귀 (~1시간)

**Chrome 라이브 회귀 시나리오 (9건):**

| # | 시나리오 | 기대 결과 |
|---|---|---|
| 1 | 보험사 분기 → 메리츠화재 + 도메인 일치 + 지점장 | insurer_branch_manager + status='pending' |
| 2 | 보험사 분기 → 메리츠화재 + 도메인 불일치 | 클라 차단 (가입 시도 불가) |
| 3 | 보험사 분기 → 도메인 화이트리스트 우회 시도 (개발자 도구) | trigger / RPC 단계에서 서버 차단 |
| 4 | GA 분기 → 더원지점 + 1팀 + 설계사 | ga_member + status='active' + branch_id / team_id 매핑 ✅ |
| 5 | GA 분기 → 더원지점 + 4팀 + 매니저 | ga_manager + status='active' |
| 6 | GA 분기 → "기타 회사" + free text + 스텝 | ga_staff + status='active' + branch_id / team_id NULL |
| 7 | 이메일 중복 가입 | "이미 가입된 이메일" 토스트 + 로그인 안내 |
| 8 | Auth 인증 메일 미클릭 + 로그인 시도 | 로그인 차단 + 메일 확인 안내 (Step 4 정합 회귀) |
| 9 | admin_v2 D-1 진입 → status='pending' 사용자 visible | admin 가시성 ✅ (Step 10~15 융합 트랙 진입 전 회귀 확인) |

**검증 SQL (RUN 별도):**
```sql
-- 가입 후 public.users row 정합
SELECT id, email, role, status, insurer_id, branch_id, team_id, created_at
FROM public.users WHERE created_at > NOW() - INTERVAL '1 hour';

-- 9역할 분포
SELECT role, status, COUNT(*) FROM public.users GROUP BY role, status ORDER BY 1, 2;

-- IEB 부재 회귀 (5/9 시점 0 row → Step 5 후에도 0 row, 향후 보험사 임직원 가입 시 INSERT)
SELECT COUNT(*) FROM insurer_employee_branches;
```

## 4-E. Step 5-E: 종료 + commit + 인계 노트 (~30분)

**커밋:**
- commit 1: `docs(specs): Step 5 작업지시서 발행`
- commit 2: `docs(architecture): Step 5-A 사전 캡처`
- commit 3: `feat(db): Step 5-B RPC 2종 + RLS 1정책`
- commit 4: `feat(signup): Step 5-C 보험사·GA 분기 폼 + 직급 매핑`
- commit 5: `docs(sessions): Step 5 종료 인계 노트` (또는 /session-end 자동 생성)

**인계:**
- _INDEX.md 헤더 갱신 (Phase 1 진행률 8/18 → 9/18, 50%)
- spec v2 § 7-4-9 신설 (Step 5 종료 매트릭스)

---

# § 5. 검증 매트릭스 (9역할 × 4중 방어 = 36 시나리오)

> Step 5-D Chrome 9건 + admin_v2 융합 트랙(Step 10~15) 9건 + Phase 1 Step 16 통합 9건 = 27건 라이브 회귀.
> Step 5 단독 책임은 9건 (§ 4-D 표).

## 5-1. 4중 방어 사전 검증 (Step 5-A 단계)

| 방어 | 검증 SQL | 통과 조건 |
|---|---|---|
| 도메인 화이트리스트 | `SELECT slug, domain FROM insurers WHERE domain IS NOT NULL` | 31사 중 X사 ≥ 25 (≥80%) |
| Auth 이메일 인증 | Supabase Dashboard Auth Settings | "Confirm email" ON ✅ (Step 4 회귀) |
| status='pending' | `SELECT column_name, column_default FROM information_schema.columns WHERE table_name='users' AND column_name='status'` | DEFAULT 'active' (D-pre.5 정합) |
| 매니저 승인 | `\df admin_approve_user` | Step 5-B 후 함수 존재 ✅ |

## 5-2. 9역할 회귀 (Step 5-D + Phase 1 Step 16)

| role | Step 5 단독 | Step 10~15 융합 | Step 16 통합 |
|---|---|---|---|
| `admin` | (메타 차단 회귀) | admin_v2 진입 회귀 | 9역할 가시성 종합 |
| `ga_branch_manager` | 가입 시나리오 | 매니저 라운지 | 본인 지점 R/W |
| `ga_manager` | 가입 시나리오 | 실장님 공지 작성 | 본인 팀 R/W |
| `ga_member` | 가입 시나리오 (4팀 약 40~50명 표준) | — | 스마트 게시판 R |
| `ga_staff` | 가입 시나리오 | — | 본인 팀 R |
| `insurer_branch_manager` | 가입 + admin 직접 생성 회귀 | 본인사 게시판 | 매니저 승인 흐름 |
| `insurer_manager` | 가입 + 매니저 승인 흐름 | — | 본인사 게시판 |
| `insurer_member` | 가입 + 매니저 승인 흐름 | — | 담당 지점 R |
| `insurer_staff` | 가입 + 매니저 승인 흐름 | — | 담당 지점 R |

---

# § 6. 위험·롤백

## 6-1. 위험 매트릭스

| # | 위험 | 완화 | 위험도 |
|---|---|---|---|
| 1 | trigger 변경 시 신규 가입 깨짐 | D5 (b) 채택 시 trigger 무변경 | 🟢 낮음 |
| 2 | RPC `complete_signup` SECURITY DEFINER 권한 누설 | `auth.uid()` 본인 row 한정 + status valid 체크 | 🟢 낮음 |
| 3 | 도메인 화이트리스트 anon RLS 누설 | public 정보(보험사 도메인 공식 사이트)이므로 risk 낮음 | 🟢 낮음 |
| 4 | 4팀 약 40~50명 직급 분포 사전 매핑 부재 | 일괄 ga_member 가입 후 매니저 승격 (별 트랙) | 🟡 중간 |
| 5 | 가짜 보험사 임직원 우회 가입 | 4중 방어 (도메인 + Auth + pending + 매니저 승인) | 🟢 낮음 |
| 6 | admin_v2 D-1 융합 지연 → pending 사용자 무한 대기 | Step 5-B에 admin Dashboard SQL 임시 승인 가이드 포함 | 🟡 중간 |
| 7 | 도메인 변경 (예: 메리츠 → meritzfire.co.kr) | admin이 insurers.domain UPDATE 가능 (admin_v2 D-7 융합) | 🟢 낮음 |

## 6-2. 롤백 시나리오

**Step 5-B 롤백 (DB 변경 취소):**
```sql
BEGIN;
DROP FUNCTION IF EXISTS public.complete_signup(UUID, UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.admin_approve_user(UUID);
DROP POLICY IF EXISTS insurers_select_anon_domain_check ON insurers;
COMMIT;
```

**Step 5-C 롤백 (라이브 코드 취소):**
- `git revert <commit>` (index.html 변경 1건만 취소)
- 5역할 select 옵션 자동 복원

**Step 5-D 라이브 회귀 실패 시:**
- 각 시나리오 단독 격리 → Step 5-B/5-C 부분 롤백
- 가입 차단 위험 시 즉시 (a) Step 5-C git revert 후 (b) Step 5-A 본문 재진입

---

# § 7. 별 트랙 분리 후보

| 별 트랙 # | 후보 | 분리 사유 |
|---|---|---|
| **#37** | 이메일 인증 한국어 템플릿 (Supabase Dashboard) | D8 (b) 채택 시 별 트랙. 5/12~14 사이 처리 권장 |
| **#38** | 5/15 4팀 약 40~50명 직급 분포 사전 매핑 운영 데이터 | 영업 트랙 (Code 책임 외) — 4팀 인원 명단 확보 후 ga_manager / ga_member 사전 매핑 |
| **#39** | 첫 보험사 매니저 admin 직접 생성 흐름 (닭-달걀) | D9 (b) 채택 시 Phase 1 종료 후 영업 트랙 |
| **#40** | admin_v2 D-1 매니저 승인 UI (Phase 1 Step 10~15 융합) | Step 5 본질 외 — admin_v2 융합 트랙 흡수 |

---

# § 7-A. ⚠️ Step 5-A 신규 발견 후속 결재 대기 (D2-bis)

> **상황:** Step 5-A 캡처에서 발견 — insurers 31사 domain 컬럼 전부 NULL.
> **본 결재 = Step 5-B 진입 직전 강제 결재 항목.**

## 7-A-1. D2-bis: 31사 도메인 INSERT 시점

**옵션:**
- (가) **Step 5-B에 31사 도메인 INSERT 트랜잭션 포함** ⭐ Code 추천
  - admin이 공식 도메인 사전 입력 (공개 정보)
  - 정합 검증 어려운 일부는 NULL 유지 (사후 admin 입력)
  - 닭-달걀 #39 별 트랙 정합
- (나) Step 5-B = RLS 정책만 신설, 도메인 INSERT는 5/15 후 별 트랙 #41
  - Phase 1 동안 보험사 임직원 가입 페이지 "준비 중"
- (다) 도메인 화이트리스트 자체를 Phase 2 (5/22~)로 미룸
  - D2 결재 (a) → (b 클라만) 또는 매니저 승인 단독 게이트로 재결재 필요
  - spec v2 § 1 "4중 방어" 본질 변경

**Code 추천:** (가) — 공개 정보 사전 입력 = 영업 부담 0 + 4중 방어 본질 보존.

**(가) 채택 시 데이터 입력 권장 패턴:**
- 31사 공식 도메인 = 공개 (각 사 채용/IR 페이지에서 확인 가능)
- 입력 형식: `@meritzfire.com` (`@` 포함, 도메인 부분만)
- 일부 보험사는 그룹사 공통 도메인 사용 가능 → 별도 admin 결정
- INSERT 위치: Step 5-B 트랜잭션 안 (RPC 신설과 묶음) 또는 별도 RUN

**결재:** [ ] (가)  [ ] (나)  [ ] (다)  [ ] 다른 의견: ____

---

# § 8. 다음 단계 인계

## 8-1. Step 5 종료 후 _INDEX.md 헤더 갱신 항목

```
> 마지막 갱신: 2026-05-1X — Step 5 종료 (보험사·GA 분기 폼 + 4중 방어 + RPC 2종 + 직급 매핑).
  9/18 (50%). 잔여 Step 6+7+8+9+10~15+16 = ~8.6세션.
```

## 8-2. spec v2 § 7-4-9 신설 항목

```markdown
### 7-4-9. Step 5 종료 인계 (다음 메인 트랙 = Step 6)

종료: 보험사·GA 분기 폼 + 도메인 화이트리스트 + status='pending' + 매니저 승인 RPC.
잔여 9건: Step 6 (insurer.html 동적 라우팅 0.5세션) + 7~9 + 10~15 + 16.
```

## 8-3. 5/9 점심 인계 노트 정합 (`docs/sessions/2026-05-09_1253.md` 참조)

다음 세션 첫 액션 = ⭐ Step 5 진입 (1.0세션) → 본 작업지시서 발행 = 정합 ✅.

---

# § 9. 결재 후 진입 절차

1. 팀장님이 § 3 결정 9건 결재 (각 박스 ✅ 표기 또는 의견)
2. Code가 결재 결과 본 MD 갱신 + commit 1 (`docs(specs): Step 5 작업지시서 발행 + 결재 9건 확정`)
3. Step 5-A 진입 (사전 캡처 SQL Editor RUN, ~30분)
4. Step 5-B 진입 (RPC 2 + RLS 1 트랜잭션, ~45분)
5. Step 5-C 진입 (index.html 폼 분기 + JS, ~1.5시간)
6. Step 5-D 진입 (Chrome 라이브 회귀 9건, ~1시간)
7. Step 5-E 종료 + commit + 인계 노트 (~30분)

**예상 총 분량:** 1.0세션 (~4시간), 9역할 가입 게이트 + 4중 방어 명문화 완료.

---

본 작업지시서는 Code 발행. 팀장님 결재 후 본 MD § 4 진입.

진실 원천:
- `docs/specs/v2_insurer_admission_phase1_v2.md` (메인 spec, 1163줄)
- `docs/architecture/role_migration_plan.md` § 3.1.5 (handle_new_user 정정 raw)
- `docs/architecture/db_pre_migration_capture_20260501.md` § 1 (5/1 PASS 본문)
- `docs/sessions/2026-05-09_1253.md` (Step 2-bis 종료 인계)
- 메모리 `supabase_sql_editor_session_isolation.md` (RUN 단위 세션 분리 학습)
- 메모리 `rls_self_reference_avoidance.md` (D-pre.7 학습)
