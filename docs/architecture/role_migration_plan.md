# 9역할 마이그레이션 계획 — 2026-05-01 (Phase D-pre 항목 2 초안)

> **신버전 프로젝트:** `pdnwgzneooyygfejrvbg` (`onesecond-v1-restore-0420`)
> **선행 산출물:** `docs/architecture/db_schema_20260501.md` (항목 1, 팀장님 승인 #1 완료)
> **선행 결정:** 결정 1~6 + 결정 8 확정 / 결정 7(users 신규 컬럼) 보류
> **상태:** **🟡 SQL 초안 — 실행 금지.** 팀장님 승인 #2 받기 전까지 텍스트로만 존재.
> **CLAUDE.md 절대 원칙 준수:** DB 변경 0건 / admin_v2.html·js/db.js 수정 0건 (D-pre 단계 전체)

---

## 1. 사전 검증 결과 요약

### 1.1 항목 1 출발점

- **users.role 분포 (raw):** `admin: 1` 외 0건. 5역할(`member`/`manager`/`branch_manager`/`staff`) 사용자 0명. **데이터 변환 부담 0건.**
- **30개 RLS 정책 중 9역할 분기 필요:** 4개 (activity_logs ×2 + script_usage_logs ×1 + posts insurer board ×1)
- **library / news rowsecurity = false** — RLS 비활성. 결정 6 → 활성화 + 정책 추가 포함
- **D-5 RPC 0개** — handle_new_user 트리거 1건만 (D-5 RPC 신규 생성은 D-5 작업지시서로 이월)
- **handle_new_user SECURITY DEFINER 트리거 본문 검증 완료 (2026-05-01, Case 1 확정 🚨)** — 5역할 하드코딩 IN 절 박혀 있음. **함수 정정 필수.** § 3.1·§ 3.1.5 참조

### 1.1.a handle_new_user 본문 검증 결과 (쿼리 7-A·7-B raw 인용)

**트리거 attach (쿼리 7-B raw):**
- `trigger_name`: `on_auth_user_created`
- `event_object_schema`: `auth` / `event_object_table`: `users` (즉 `auth.users`)
- `event_manipulation`: `INSERT` / `action_timing`: `AFTER`
- `action_statement`: `EXECUTE FUNCTION handle_new_user()`
- → **표준 패턴.** Supabase Auth 가입 → auth.users INSERT → AFTER 트리거 → public.users 자동 생성.

**함수 본문 핵심 (쿼리 7-A raw 인용):**
```sql
-- ⚠️ 5역할 하드코딩 IN 절 (마이그레이션 후 9역할 가입 시 'member' 덮어쓰기 — 회귀)
IF v_role IS NULL OR v_role NOT IN ('member', 'manager', 'branch_manager', 'staff') THEN
  v_role := 'member';
END IF;
```

**핵심 발견 4건 (raw 검증):**
1. ⚠️ **5역할 하드코딩 IN 절** — 9역할 가입 시 'member'로 덮어쓰여 회귀. **함수 정정 필수**
2. ✅ **'admin' 허용 목록 제외** — 메타데이터 가입 불가. 보안 우위. 팀장님 결정 = 9역할 마이그레이션 후에도 **'admin' 그대로 제외 (옵션 B 확정)**
3. ✅ **plan = 'free' 하드코딩** — D-7 결제 미도입과 정합. v1.1 결제 도입 시 별도 수정 (지금 결정 안 함)
4. ✅ **ON CONFLICT (id) DO NOTHING** — 중복 가입 방지. 마이그레이션 후에도 보존

### 1.2 결정 8건 반영 정합

| 결정 | 마이그레이션 SQL 영향 |
|---|---|
| 1. D-7 billing 제외 | 본 SQL 영향 0 (D-7은 mock UI 보존) |
| 2. D-4 notice = app_settings | 본 SQL 영향 0 (D-4 작업지시서로 이월) |
| 3. D-6 logs = activity_logs 단일 | 본 SQL 영향 0 (D-6 작업지시서로 이월) |
| **4. insurer 4종 모두 권한** | ⭐ posts insurer board 정책 9역할 분기 SQL 본 단계 포함 |
| **5. 발견 3 정합 정정** | ⭐ users "admin update all" 정책 정정 SQL 본 단계 포함 |
| **6. library/news RLS 활성화** | ⭐ ENABLE ROW LEVEL SECURITY + 기본 정책 SQL 본 단계 포함 |
| 7. users 신규 컬럼 보류 | 본 SQL 영향 0 (D-1 작업 시 결정) |
| 8. RPC 검증 | 사전 SELECT 결과로 D-5 RPC 신규 생성은 D-5 작업지시서로 이월 |

---

## 2. 9역할 매핑 규칙

### 2.1 핵심 매핑 (5역할 → 9역할)

| 구 5역할 | 신 9역할 매핑 | 사유 |
|---|---|---|
| `admin` | `admin` (그대로) | 무접두어, 전역 권한 |
| `branch_manager` | `ga_branch_manager` (default) | GA 지점장이 다수, 원수사 도입은 v2.0 |
| `manager` | `ga_manager` (default) | GA 실장이 다수 |
| `member` | `ga_member` (default) | GA 설계사가 다수 |
| `staff` | `ga_staff` (default) | GA 스텝이 다수 |

### 2.2 원수사(insurer_*) 사용자 식별 규칙

현재 users 행 1건 = admin이라 원수사 사용자 0건. 향후 신규 가입자는 다음 3가지 방식 중 결정 필요:
- (a) 가입 폼에서 GA / 원수사 선택 라디오 추가 (Phase D-1 또는 별 트랙)
- (b) `users.company` 컬럼 값으로 자동 판별 (예: company가 보험사 화이트리스트 매치 시 insurer_*)
- (c) admin이 수동으로 admin_v2 D-1 사용자 편집 화면에서 변경

→ **본 마이그레이션 SQL에서는 처리 안 함** (현재 사용자 admin 1명, 미래 가입자는 가입 흐름 결정 사항).

### 2.3 손실 데이터 검증

**예상 손실: 0건.**
- admin → admin (변경 0)
- 5역할 사용자 → 9역할 매핑 (현재 0건이므로 NO-OP)

검증 SQL (마이그레이션 직후 실행 권장):
```sql
SELECT role, COUNT(*) FROM public.users
WHERE role NOT IN (
  'admin',
  'ga_branch_manager','ga_manager','ga_member','ga_staff',
  'insurer_branch_manager','insurer_manager','insurer_member','insurer_staff'
)
GROUP BY role;
-- 0행 기대 (모든 role이 9역할 중 하나)
```

---

## 3. DB 마이그레이션 SQL 초안 (실행 금지 — 팀장님 승인 #2 후 항목 3 통해 실 진행)

### ⚠️ 실행 순서 절대 준수

> Step C-1(본문 재검증) → **C-1.5(함수 정정 SQL ⭐ 신규)** → C-2(default 변경) → C-3(UPDATE 매핑) → C-4(RLS 정책 4개) → C-5(users 정책 정정) → C-6(library/news RLS 활성화)

### 3.1 Step C-1: handle_new_user 트리거 본문 재검증 (마이그레이션 직전 실행 — 깨짐 방지)

```sql
-- 항목 2 단계에서 이미 본문 검증 완료 (2026-05-01, Case 1 확정).
-- 그러나 마이그레이션 실행 시점에 본문이 변경되지 않았는지 재검증 필수
-- (Step C-1.5 함수 정정 직전 raw 비교 권장)
SELECT pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'handle_new_user';
```

**점검 포인트:**
- 본문이 § 1.1.a 인용본과 동일한지 raw diff (특히 IN 절 5역할 그대로인지)
- 다르면 함수 변경 발생 — 본 마이그레이션 계획 재검토 필요
- 동일하면 → Step C-1.5 함수 정정 SQL 그대로 진행

### 3.1.5 Step C-1.5: handle_new_user 함수 정정 (5역할 IN → 9역할 8종 IN, 결정 옵션 B)

```sql
-- ⭐ 옵션 B 확정: 'admin' IN 절 제외 (메타데이터 가입 불가, SQL로만 admin 생성 정책 유지)
-- 9역할 중 'admin' 외 8종만 IN 절에 포함, 폴백 default 'ga_member'

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_role text := meta->>'role';
BEGIN
  -- 9역할 중 'admin' 외 8종만 메타데이터 가입 허용 (옵션 B)
  IF v_role IS NULL OR v_role NOT IN (
    'ga_branch_manager', 'ga_manager', 'ga_member', 'ga_staff',
    'insurer_branch_manager', 'insurer_manager', 'insurer_member', 'insurer_staff'
  ) THEN
    v_role := 'ga_member';  -- 폴백 (기존 'member' → 'ga_member' 매핑 정합)
  END IF;

  INSERT INTO public.users (
    id, email, name, phone, company, branch, role, team, plan, created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(meta->>'name', ''),
    NULLIF(meta->>'phone', ''),
    NULLIF(meta->>'company', ''),
    NULLIF(meta->>'branch', ''),
    v_role,
    NULLIF(meta->>'team', ''),
    'free',  -- D-7 결제 미도입 정합 / v1.1 결제 도입 시 별도 수정
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;
```

**변경 요약:**
- ✅ IN 절: 5역할 → 9역할 8종 (admin 제외, 옵션 B)
- ✅ 폴백: `'member'` → `'ga_member'`
- ✅ `'admin'` 메타데이터 가입 차단 유지 (보안 정책)
- ✅ `plan = 'free'` 하드코딩 보존 (D-7 미도입 정합)
- ✅ `ON CONFLICT (id) DO NOTHING` 보존 (중복 방지)
- ✅ `SECURITY DEFINER` + `SET search_path TO 'public'` 보존
- ✅ 트리거 attach 변경 0 (`auth.users` AFTER INSERT 그대로)

**검증 SQL (Step C-1.5 직후):**
```sql
-- 함수 본문 재출력 → 9역할 IN 절로 변경됐는지 확인
SELECT pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'handle_new_user';
-- IN 절에 'ga_branch_manager' 포함 + 폴백 'ga_member' 기대
```

### 3.2 Step C-2: users.role default 변경

```sql
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'ga_member';
```

**검증:**
```sql
SELECT column_default FROM information_schema.columns
WHERE table_schema='public' AND table_name='users' AND column_name='role';
-- 'ga_member'::text 기대
```

### 3.3 Step C-3: 기존 사용자 role UPDATE (5역할 → 9역할)

```sql
-- 현재 admin 1명만 존재 → 실제 변경 0건. 안전망으로 4건 모두 포함.
UPDATE public.users SET role = 'ga_member'         WHERE role = 'member';
UPDATE public.users SET role = 'ga_manager'        WHERE role = 'manager';
UPDATE public.users SET role = 'ga_branch_manager' WHERE role = 'branch_manager';
UPDATE public.users SET role = 'ga_staff'          WHERE role = 'staff';
-- admin은 변경 없음 (그대로 유지)
```

**검증:**
```sql
SELECT role, COUNT(*) FROM public.users GROUP BY role;
-- admin: 1 (그대로) / 다른 5역할 키 0건 기대
```

### 3.4 Step C-4: 30개 RLS 정책 중 4개 9역할 분기 재작성

#### 3.4.a `activity_logs.select_branch_manager`

```sql
DROP POLICY IF EXISTS "activity_logs_select_branch_manager" ON public.activity_logs;

CREATE POLICY "activity_logs_select_branch_manager"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users me
    JOIN public.users target ON target.id = activity_logs.user_id
    WHERE me.id = auth.uid()
      AND me.role IN ('ga_branch_manager', 'insurer_branch_manager')
      AND target.branch = me.branch
  )
);
```

#### 3.4.b `activity_logs.select_manager`

```sql
DROP POLICY IF EXISTS "activity_logs_select_manager" ON public.activity_logs;

CREATE POLICY "activity_logs_select_manager"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users me
    JOIN public.users target ON target.id = activity_logs.user_id
    WHERE me.id = auth.uid()
      AND me.role IN ('ga_manager', 'insurer_manager')
      AND target.team = me.team
      AND target.role IN ('ga_member', 'insurer_member')
  )
);
```

#### 3.4.c `script_usage_logs.admin_branch_manager_read`

```sql
DROP POLICY IF EXISTS "admin read logs" ON public.script_usage_logs;

CREATE POLICY "admin_branch_manager_read_logs"
ON public.script_usage_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'ga_branch_manager', 'insurer_branch_manager')
  )
);
```

#### 3.4.d `posts.insurer_board_insert` + `insurer_board_update` (결정 4 — insurer_* 4종 모두 + 발견 2 비대칭 정합)

```sql
DROP POLICY IF EXISTS "insurer board insert" ON public.posts;

CREATE POLICY "insurer_board_insert"
ON public.posts
FOR INSERT
TO authenticated
WITH CHECK (
  board_type = 'insurer_board'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
      AND users.role IN (
        'admin',
        'insurer_branch_manager','insurer_manager','insurer_member','insurer_staff'
      )
  )
);

DROP POLICY IF EXISTS "insurer board update" ON public.posts;

CREATE POLICY "insurer_board_update"
ON public.posts
FOR UPDATE
TO authenticated
USING (
  board_type = 'insurer_board'
  AND (
    author_id = (auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN (
          'admin',
          'insurer_branch_manager','insurer_manager','insurer_member','insurer_staff'
        )
    )
  )
);
```

→ **INSERT/UPDATE 모두 admin + insurer_* 4종 통일** (발견 2 비대칭 정합 정리, 결정 4 정합).

### 3.5 Step C-5: users "admin update all" 정합 정정 (결정 5 / 발견 3)

```sql
-- 기존: 정책명 "admin update all"이지만 qual = auth.uid() = id (본인만)
-- + roles {public} (anonymous 포함) — 동작 불일치 + 보안 흠
DROP POLICY IF EXISTS "admin update all" ON public.users;

-- 신설: 진짜 admin이 다른 사용자 모두 update 가능
CREATE POLICY "admin_update_all_users"
ON public.users
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users me
    WHERE me.id = auth.uid() AND me.role = 'admin'
  )
);

-- "user update own" 정책은 그대로 유지 (authenticated 본인 행 수정)
-- "user read own" / "user insert own"도 그대로
```

**검증:**
- admin 사용자가 다른 행 update 시 200 OK 기대
- 일반 사용자가 본인 행 외 update 시 403 기대

### 3.6 Step C-6: library / news RLS 활성화 + 기본 정책 (결정 6 / 발견 4)

```sql
-- ── 6.1 library RLS 활성화 ────────────────────────────────────────────
ALTER TABLE public.library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "library_select_own_or_shared"
ON public.library FOR SELECT TO authenticated
USING (
  scope = 'shared'
  OR (auth.uid())::text = owner_id
);

CREATE POLICY "library_insert_own"
ON public.library FOR INSERT TO authenticated
WITH CHECK ((auth.uid())::text = owner_id);

CREATE POLICY "library_update_own"
ON public.library FOR UPDATE TO authenticated
USING ((auth.uid())::text = owner_id);

CREATE POLICY "library_delete_own"
ON public.library FOR DELETE TO authenticated
USING ((auth.uid())::text = owner_id);

CREATE POLICY "library_admin_all"
ON public.library FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- ── 6.2 news RLS 활성화 ───────────────────────────────────────────────
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "news_select_active"
ON public.news FOR SELECT TO authenticated
USING (is_active = true);

CREATE POLICY "news_admin_all"
ON public.news FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);
```

⚠️ `library.scope` 값 정합 확인 필요 — 'shared' 외 다른 값('personal' / 'team' 등) 사용 시 정책 분기 추가 (별도 SELECT 권장).

---

## 4. 영향 파일 grep 결과 + 라인별 변경안 (Step B 준비)

### 4.1 영향 파일 6개 (admin_v1_20260430.html 백업본 무시)

| 파일 | 라인 | 현재 코드 (raw 인용) | 변경 방향 |
|---|---|---|---|
| `js/db.js` | 126~132 | `window.ROLE_LABEL = { member:'팀장', manager:'실장', branch_manager:'지점장', staff:'스텝', admin:'관리자' }` | **9역할 9키 확장** (항목 3 작업) |
| `js/auth.js` | 30 | `role: '', // users.role (member/manager/branch_manager/staff/admin)` | 주석 9역할로 갱신 |
| `js/auth.js` | 79 | `\|\| ['manager', 'branch_manager', 'admin'].includes(s.role)` | `['ga_manager','ga_branch_manager','insurer_manager','insurer_branch_manager','admin']` 또는 매니저 이상 판별 함수 |
| `js/auth.js` | 84 | `return window.AppState.role === 'admin'` | (admin 그대로 — 변경 0) |
| `js/auth.js` | 89~91 | `var map = window.ROLE_LABEL \|\| { member:'팀장', manager:'실장', branch_manager:'지점장', staff:'스텝', admin:'관리자' }` | 인라인 fallback 9역할로 확장 |
| `js/scripts-page.js` | 270~273 | `const ROLE_LABEL = { member:'팀장', manager:'실장', branch_manager:'지점장', staff:'스텝' }` (admin 빠짐 + 자체 정의) | window.ROLE_LABEL 참조로 통합 권장 (자체 정의 폐기) |
| `pages/myspace.html` | 956 | `const isLeader = (role === 'manager' \|\| role === 'branch_manager' \|\| role === 'admin')` | `['ga_manager','ga_branch_manager','insurer_manager','insurer_branch_manager','admin'].includes(role)` |
| `pages/myspace.html` | 1189 | (956 동일 패턴) | 동일 |
| `pages/board.html` | 1274 | `var isAdmin = (role === 'admin')` | (admin 그대로 — 변경 0) |
| `pages/board.html` | 1679 | `var isAdmin = ['admin', 'branch_manager', 'manager'].includes(s.role)` | (`isAdmin`이라 명명됐지만 매니저 이상 의미 — 9역할 분기 필요) |
| `pages/board.html` | 2060 | `if (board === 'insurer' && role === 'member')` | `if (board === 'insurer' && role IN ga_*/insurer_member)` 결정 4 정합 |
| `pages/board.html` | 2225 | `else if (board === 'insurer' && ['manager', 'branch_manager'].includes(s.role))` | 9역할 매니저 이상 + insurer_* 결정 4 정합 |
| `pages/pricing-content.html` | 244 | `if (role === 'manager' \|\| role === 'branch_manager')` | 9역할 매니저 이상 (admin 무료 정합 — 매니저 이상 무료 원칙 CLAUDE.md) |
| `pages/pricing-content.html` | 225 | `const ROLE_LABEL = { member:'팀장', ... }` (admin 빠짐) | window.ROLE_LABEL 참조로 통합 |
| `pages/pricing-content.html` | 254, 286 | `['manager','branch_manager'].includes(role)` | 9역할 매니저 이상 |

**총 변경 위치: 14곳 / 6개 파일.**

### 4.2 무료 혜택 대상 정합 (CLAUDE.md 명시 원칙 검증)

> CLAUDE.md: "**무료 혜택 대상**: `admin` + 각 소속의 `branch_manager`·`manager` (매니저 이상 무료 원칙)"

→ 9역할 무료 = `admin` + `ga_branch_manager` + `ga_manager` + `insurer_branch_manager` + `insurer_manager` (5종)

→ `pricing-content.html` 라인 244·254·286 / `board.html` 라인 1679 / `auth.js` 라인 79는 **5종 통일 함수 도입 권장:**

```js
// js/auth.js 신규 헬퍼 (Step B 신설안)
function isFreeTier(role) {
  return ['admin', 'ga_branch_manager', 'ga_manager', 'insurer_branch_manager', 'insurer_manager'].includes(role);
}
function isManagerOrAbove(role) {
  return isFreeTier(role); // 의미 alias
}
```

→ 영향 파일에서 `['manager','branch_manager','admin']` 식 패턴을 `isFreeTier(role)` 또는 `isManagerOrAbove(role)`로 일괄 교체.

---

## 5. Phase 1 마이그레이션 절차 (Step A·B·C·D)

### Step A — 코드 (DB 변경 없음)

**A-1.** `js/db.js` 라인 126~132 `window.ROLE_LABEL` 9역할 확장 (항목 3 산출물)

**A-2.** `js/auth.js` 라인 89~91 인라인 fallback 9역할 동기화 + 라인 79 `isFreeTier()` 헬퍼 신설 + 라인 30 주석 9역할 갱신

**A-3.** 코드 변경 후 라이브 검증:
- 현재 admin 1명 로그인 → ROLE_LABEL 정합 확인
- 구 5역할 키 fallback 작동 확인 (DB 마이그레이션 미완 상태)

### Step B — 영향 파일 일괄 수정 (DB 변경 없음)

영향 14곳 모두 `isFreeTier()` / `isManagerOrAbove()` 헬퍼 차용 또는 9역할 명시 매핑. (별도 작업지시서 발행 권장 — `js/scripts-page.js` 자체 ROLE_LABEL 폐기 + `pages/board.html` insurer 분기 결정 4 정합 등)

### Step C — DB 마이그레이션 (Supabase 자동백업 직후)

1. **사전 검증:** Supabase Dashboard에서 자동백업 시점 확인 + 수동 백업 1회 추가 권장
2. **C-1:** handle_new_user 트리거 본문 SELECT (§ 3.1)
3. **C-2:** users.role default 변경 (§ 3.2)
4. **C-3:** UPDATE 매핑 4건 (§ 3.3)
5. **C-4:** RLS 정책 4개 재작성 (§ 3.4)
6. **C-5:** users 정책 정정 (§ 3.5)
7. **C-6:** library/news RLS 활성화 (§ 3.6)
8. **검증 SQL:** § 2.3 + § 3.5 검증 + 30개 정책 재계 확인

### Step D — 라이브 검증

- (1) admin 1명 로그인 정상 (`window.AppState.role === 'admin'` 확인)
- (2) admin_v2 진입 정상 (D-1 칩 카운트 SELECT 작동 — Phase D-1 작업 후)
- (3) library / news 진입 시 RLS 정책 작동 (admin은 모두 가능, 신규 사용자는 본인/공개)
- (4) Sentry 또는 콘솔 에러 0건

---

## 6. 롤백 SQL (각 단계별)

### 6.1 Step C-1 롤백 — 본문 재검증만 수행한 단계라 롤백 불요 (SELECT뿐)

### 6.1.5 Step C-1.5 롤백 — handle_new_user 함수 5역할 원본 복구 (쿼리 7-A raw 그대로)

```sql
-- ⚠️ Step C-1.5 함수 정정 실패 시 5역할 하드코딩 원본으로 복구
-- (쿼리 7-A raw 본문 그대로 — 2026-05-01 캡처)
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_role text := meta->>'role';
BEGIN
  IF v_role IS NULL OR v_role NOT IN ('member', 'manager', 'branch_manager', 'staff') THEN
    v_role := 'member';
  END IF;

  INSERT INTO public.users (
    id, email, name, phone, company, branch, role, team, plan, created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(meta->>'name', ''),
    NULLIF(meta->>'phone', ''),
    NULLIF(meta->>'company', ''),
    NULLIF(meta->>'branch', ''),
    v_role,
    NULLIF(meta->>'team', ''),
    'free',
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;
```

**롤백 시 주의:**
- 함수 정정 후 신규 가입자가 9역할 메타로 가입했다면, 롤백 시 5역할 IN 절에 매치되지 않아 'member'로 덮어씌워짐 → **이미 가입한 9역할 사용자 데이터 회귀 손실 위험**
- 따라서 함수 정정 롤백은 마이그레이션 직후 즉시(신규 가입 0건 상태)만 안전

### 6.2 Step C-2 롤백 (default 복원)

```sql
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'member';
```

### 6.3 Step C-3 롤백 (UPDATE 역매핑)

```sql
UPDATE public.users SET role = 'member'         WHERE role = 'ga_member';
UPDATE public.users SET role = 'manager'        WHERE role = 'ga_manager';
UPDATE public.users SET role = 'branch_manager' WHERE role = 'ga_branch_manager';
UPDATE public.users SET role = 'staff'          WHERE role = 'ga_staff';
-- admin은 변경 없음

-- ⚠️ insurer_* 4종 사용자는 5역할에 매핑 불가
-- 롤백 시점에 insurer_* 사용자 0건이라면 안전, 1건 이상이면 데이터 손실
SELECT role, COUNT(*) FROM public.users
WHERE role LIKE 'insurer_%' GROUP BY role;
-- 0건 기대 (마이그레이션 직후 롤백 시점)
```

### 6.4 Step C-4 롤백 (RLS 정책 4개 복원)

```sql
-- 4-a 복원
DROP POLICY IF EXISTS "activity_logs_select_branch_manager" ON public.activity_logs;
CREATE POLICY "activity_logs_select_branch_manager"
ON public.activity_logs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users me
    JOIN users target ON target.id = activity_logs.user_id
    WHERE me.id = auth.uid()
      AND me.role = 'branch_manager'
      AND target.branch = me.branch
  )
);

-- 4-b ~ 4-d 동일 패턴 (구 정책 본문 — 쿼리 3 raw에서 인용)
-- (간결성 위해 본 절은 핵심 1건만 표기. 항목 2 SQL 제출 시 raw 본문 4건 모두 첨부)
```

### 6.5 Step C-5 롤백 (users 정책 복원)

```sql
DROP POLICY IF EXISTS "admin_update_all_users" ON public.users;

CREATE POLICY "admin update all"
ON public.users FOR UPDATE TO public
USING (auth.uid() = id);
-- (구 정책 본문 — 쿼리 3 raw에서 인용 / 이름·동작 불일치 그대로 복원)
```

### 6.6 Step C-6 롤백 (library / news RLS 비활성화)

```sql
DROP POLICY IF EXISTS "library_select_own_or_shared" ON public.library;
DROP POLICY IF EXISTS "library_insert_own"           ON public.library;
DROP POLICY IF EXISTS "library_update_own"           ON public.library;
DROP POLICY IF EXISTS "library_delete_own"           ON public.library;
DROP POLICY IF EXISTS "library_admin_all"            ON public.library;
ALTER TABLE public.library DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "news_select_active" ON public.news;
DROP POLICY IF EXISTS "news_admin_all"     ON public.news;
ALTER TABLE public.news DISABLE ROW LEVEL SECURITY;
```

---

## 7. 검증 시나리오 (Step D)

### 7.1 매핑 정합성

```sql
-- 7.1.1 9역할 외 잔존 행 검사 (0행 기대)
SELECT role, COUNT(*) FROM public.users
WHERE role NOT IN (
  'admin',
  'ga_branch_manager','ga_manager','ga_member','ga_staff',
  'insurer_branch_manager','insurer_manager','insurer_member','insurer_staff'
)
GROUP BY role;

-- 7.1.2 admin 1명 보존 검증
SELECT id, email, role FROM public.users WHERE role = 'admin';
```

### 7.2 RLS 정책 재작성 검증

```sql
-- 7.2.1 30개 정책 재계 (Step C-4·C-5·C-6 후 30 + 7 신규 = 37개 기대)
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
-- 기대: 37 (기존 30 - DROP 5건 + 추가 12건 = 37)
-- 산출 = 30 - 5(branch_manager 1 + manager 1 + insurer 1 + admin read script_usage_logs 1 + admin update all users 1) + 12 (4 분기 + admin_update_all_users 1 + library 5 + news 2) = 37
-- ⚠️ 정확 카운트는 Step C 직후 SELECT로 재검증 권장

-- 7.2.2 9역할 분기 정책 본문 확인
SELECT policyname, qual, with_check FROM pg_policies
WHERE schemaname = 'public'
  AND (qual LIKE '%ga_%' OR qual LIKE '%insurer_%' OR with_check LIKE '%ga_%' OR with_check LIKE '%insurer_%')
ORDER BY tablename, policyname;
```

### 7.3 라이브 동작 검증 (admin 1명 기준 — 결정 F 5종 통과 기준)

- **F-1.** admin 1명 정상 로그인 → `window.AppState.role === 'admin'` 확인
- **F-2.** admin이 admin_v2 페이지 진입 가능 (5종 톤 토글 작동, 4중 안전장치 작동)
- **F-3.** 9역할 모두 ROLE_LABEL 한국어 표시 (`getRoleLabel('ga_member')` → "GA 설계사" 등)
- **F-4.** library / news 새 RLS 정책 작동 (Step C-6)
  - admin은 모두 SELECT/INSERT/UPDATE/DELETE 가능
  - 일반 사용자(미래)는 본인 자료 + scope='shared'만 SELECT 가능 (library)
  - 일반 사용자는 is_active=true만 SELECT 가능 (news)
- **F-5.** handle_new_user 트리거 — 신규 가입 자동 처리 보존 (Step C-1.5)
  - **F-5.1.** 9역할 정상 메타로 가입 (예: `raw_user_meta_data = {"role": "ga_member"}`) → public.users.role = 'ga_member' 정확 생성
  - **F-5.2.** 잘못된 role 메타로 가입 (예: `{"role": "invalid"}` 또는 누락) → 폴백 'ga_member' 적용 확인
  - **F-5.3.** admin role 메타로 가입 (`{"role": "admin"}`) → IN 절 'admin' 제외 → 폴백 'ga_member' 적용 (옵션 B 정합 확인)
  - **F-5.4.** admin 계정은 SQL로만 생성 가능 확인 (`UPDATE users SET role = 'admin' WHERE id = ...` 또는 새 admin은 SQL INSERT 후 auth.users 매칭)

### 7.4 부수 검증 (F-5 외)

- **추가-1.** admin이 다른 사용자 update 시도 → 200 OK (Step C-5 정정 효과)
- **추가-2.** admin_v2 D-1 칩 카운트 SELECT → admin 1명 표시 + 9역할 칩 모두 0명 표시 (마이그레이션 직후 신규 가입 0건 상태)
- **추가-3.** 콘솔·Sentry 에러 0건

---

## 8. 보류 항목 (결정 7 정합)

### users 신규 컬럼 (status / last_seen_at)

작업지시서 결정 7에 따라 **본 마이그레이션 SQL에서 ALTER 제외.** D-1 작업 시 별도 결정.

D-1 mock 영향 (`db_schema_20260501.md` 절 5.1):
- `users.status` 컬럼 부재 → mock "온라인 / 활성 / 정지 / 가입대기" 매핑 갭
- `users.last_seen_at` 부재 → mock "마지막 접속" + KPI "활성 사용자 (7일)" 매핑 갭

→ 대안 후보 (D-1 결정 사항):
- (a) status / last_seen_at 신규 ALTER ADD COLUMN
- (b) activity_logs 집계 (last login = MAX(created_at))로 last_seen_at 대체
- (c) auth.users.last_sign_in_at 활용 (Supabase 내장 컬럼)

---

## 9. 팀장님 승인 #2 요청

### 9.1 결정 필요 사항 (항목 2 단계에서 추가 식별)

| # | 항목 | 영향 |
|:---:|---|---|
| A | Step A·B 시점 (코드 마이그레이션 → 영향 파일 14곳 일괄 수정 → DB 마이그레이션 순서) | 라이브 안전성 (현재 사용자 admin 1명이라 회귀 영향 작음, 단 신규 가입 자동 처리 트리거 점검 필수) |
| B | `js/scripts-page.js` 자체 ROLE_LABEL 폐기 / `pages/pricing-content.html` 자체 ROLE_LABEL 폐기 → window.ROLE_LABEL 통합 여부 | 코드 일관성 (작업지시서 명시 X — 추천 사항) |
| C | `isFreeTier()` / `isManagerOrAbove()` 헬퍼 도입 — js/auth.js 신설 | 영향 14곳 일괄 정합 / 추후 9역할 확장 안전 |
| D | Step C 실행 시점 (Supabase 자동백업 직후 vs 별도 수동 백업 + 실행) | 안전성 우선 = 수동 백업 추가 |
| E | Step C-1 트리거 본문 점검 SELECT 별도 실행 시점 (마이그레이션 직전) | 마이그레이션 깨짐 방지 |
| F | 라이브 검증 (Step D) 통과 기준 — 회귀 0건 vs 일부 인지된 borderline 허용 | Step D 통과 기준 |

### 9.2 승인 #2 시 진입 가능 항목

- **항목 3 진입** — `docs/specs/admin_v2_phase_d_pre.md` 신규 작성 (ROLE_LABEL 9역할 한국어 라벨 확정 + 호환성 처리 방안 + admin_v2 칩 라벨 정합)

### 9.3 본 산출물의 위치

- `docs/architecture/role_migration_plan.md` (본 파일)
- 항목 1 산출물 `docs/architecture/db_schema_20260501.md`와 한 쌍

---

*본 산출물은 admin_v2.html 코드 변경 0건, DB 변경 0건, js 파일 변경 0건. SQL 텍스트 초안 + grep 결과 + 절차 + 롤백 SQL만 작성. 실 실행은 항목 3·4 승인 후 별도 작업지시서로.*
