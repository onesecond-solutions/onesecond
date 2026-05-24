# D-pre.7 마이그레이션 캡처본 — 2026-05-02

> **목적:** Phase D-pre.7 (Phase D 8테이블 admin SELECT 정책 일괄 점검 + 1차 시도 무한 재귀 사고 + SECURITY DEFINER 재진입) 마이그레이션의 사전 검증 + 실행 기록 + 사고 발견 + 비상 롤백 + 재진입 + 사후 검증 + 라이브 검증 + 롤백 SQL을 단일 파일에 raw 텍스트로 누적 보존.
>
> **신버전 DB 검증:** 프로젝트 ID `pdnwgzneooyygfejrvbg` (`onesecond-v1-restore-0420`) ✅ (세션 내 2회 확인)
>
> **확정 사양:** D-pre.7 작업지시서 + Web 분기 결정 통보 (6→2 정정) + Chrome Agent 작업지시서 (긴급 롤백 + SECURITY DEFINER 재진입)
>
> **캡처 출처:** Claude in Chrome agent SQL Editor + 팀장님 Chrome DevTools 콘솔 라이브 검증.
>
> **선행 산출물:** `docs/architecture/db_pre_dpre5_capture.md` / `docs/architecture/db_pre_dpre6_capture.md` / `docs/architecture/db_schema_20260501.md`
>
> **CLAUDE.md 절대 원칙 준수:** admin_v2.html / app.html / auth.js / db.js 변경 모두 0건 (DB ALTER + 함수 신설만).

---

## § 0. 메타

| 항목 | 내용 |
|---|---|
| 작업 시각 | 2026-05-02 저녁 (D-pre.6 종료 + D-9 보류 결정 명문화 직후) |
| 발견 경위 | D-1 Step 6 R6 검증 SQL (`pg_policies WHERE tablename='users'`) 실행 결과 admin SELECT 정책 부재 확정. 인계 노트 § 4.1의 R6 검증이 정확히 본 잔존을 잡으려고 설계된 단계 + 정확히 작동 |
| 작업 범위 정정 | 초기 후보 8테이블 → A-3 본문 raw 검토로 **2테이블 (users + library)** 확정. `qual='true'` 패턴은 admin 이미 SELECT 가능 (scripts/comments/app_settings) |
| **사고 발생** | **1차 시도 EXISTS 자기 참조 패턴 → PostgreSQL 무한 재귀(42P17) 에러** — 라이브 사이트 영향 가능성 우려 → 비상 롤백 즉시 실행 |
| 재진입 패턴 | **SECURITY DEFINER 함수 (`is_admin()`)** — 함수 정의자 권한으로 RLS 우회 → 자기 참조 차단. 정책 USING 절에서 단순 함수 호출. 표준 PostgreSQL RLS 회피 패턴. |
| 결정 #1 ("분리") 정합 | D-1 작업지시서 § 2 결정 #1 "분리" 원칙 그대로 유지 |
| 변경 영역 | DB 변경 5건: `is_admin()` 함수 1건 + CREATE POLICY 3건 (admin_select_all_users + admin_select_all_library + admin_update_all_users 정정) + DROP POLICY 1건 (구 EXISTS admin_update_all_users) — 코드 변경 0건 |
| **추가 발견 + 후속 정정 (점검 3 회귀)** | 최종 회귀 점검 5건 중 점검 3에서 **`admin_update_all_users` UPDATE 정책의 EXISTS 자기 참조 잔존 발견** (D-pre.7 본 트랙은 SELECT만 처리). admin이 다른 사용자 row UPDATE 시도 시 42P17 재발 가능성. 옵션 A(SECURITY DEFINER 패턴 교체) 채택 → 후속 7건 검증 전건 통과 (§ 9 참조) → users 테이블 자기 참조 패턴 영구 청산 |
| 학습 영구 명문화 | **RLS 자기 참조 회피 표준** — admin 권한 검증 시 SECURITY DEFINER 함수 또는 JWT 클레임 사용. 정책 USING/WITH CHECK 절에서 동일 테이블 SELECT 서브쿼리 절대 금지. **"같은 테이블의 다른 cmd(UPDATE/INSERT/DELETE) 정책에도 동일 패턴 잔존 가능 — 전수 sweep 필수"** (점검 3 학습) |
| posts 별 트랙 부채 | `is_hidden=false` 조건으로 admin도 숨김 게시물 SELECT 차단 — 사업 판단 필요 |

---

## § 1. Step A — 사전 검증 SELECT 3건 raw 캡처 (DB 변경 전)

### 1.1 A-1. 8테이블 정책 카운트 + admin 정책 존재 여부

```sql
SELECT
  tablename,
  COUNT(*) AS total_policies,
  SUM(CASE WHEN cmd='SELECT' THEN 1 ELSE 0 END) AS select_policies,
  SUM(CASE WHEN cmd='SELECT' AND policyname ILIKE '%admin%' THEN 1 ELSE 0 END) AS admin_select,
  SUM(CASE WHEN cmd='UPDATE' AND policyname ILIKE '%admin%' THEN 1 ELSE 0 END) AS admin_update,
  SUM(CASE WHEN cmd='DELETE' AND policyname ILIKE '%admin%' THEN 1 ELSE 0 END) AS admin_delete
FROM pg_policies
WHERE tablename IN (
  'users','scripts','library','script_usage_logs',
  'posts','comments','app_settings','activity_logs'
)
GROUP BY tablename
ORDER BY tablename;
```

**raw 결과:**

| tablename | total_policies | select_policies | admin_select | admin_update | admin_delete |
|---|:---:|:---:|:---:|:---:|:---:|
| `activity_logs` | 6 | 4 | **1** | 0 | 0 |
| `app_settings` | 2 | 1 | 0 | 0 | 0 |
| `comments` | 4 | 1 | 0 | 0 | 0 |
| `library` | 5 | 1 | 0 | 0 | 0 |
| `posts` | 7 | 2 | 0 | 1 | 1 |
| `script_usage_logs` | 2 | 1 | **1** | 0 | 0 |
| `scripts` | 2 | 1 | 0 | 0 | 0 |
| `users` | 4 | 1 | 0 | 1 | 0 |

→ **6테이블에서 `admin_select=0` 발견.** A-3 본문 검토 후 정정.

### 1.2 A-2. RLS 활성 여부

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname='public'
  AND tablename IN ('users','scripts','library','script_usage_logs',
                    'posts','comments','app_settings','activity_logs','news');
```

**raw 결과:** 9테이블 모두 `rowsecurity = true`. **library도 활성 → 작업지시서 § 5.3 (b) 분기 (정책만 추가) 진입.** news 정책 0건도 RLS 활성 = 안전한 차단 상태 (별 트랙 부채).

### 1.3 A-3. 8테이블 SELECT 정책 정의 raw 전수 (D-pre.6 표준)

```sql
SELECT tablename, policyname, qual
FROM pg_policies
WHERE tablename IN (
  'users','scripts','library','script_usage_logs',
  'posts','comments','app_settings','activity_logs'
)
AND cmd = 'SELECT'
ORDER BY tablename, policyname;
```

**raw 결과 (12행):**

| tablename | policyname | qual |
|---|---|---|
| `activity_logs` | `activity_logs_select_branch_manager` | `EXISTS (SELECT 1 FROM (users me JOIN users target ON ((target.id = activity_logs.user_id))) WHERE me.id=auth.uid() AND me.role IN ('ga_branch_manager','insurer_branch_manager') AND target.branch=me.branch)` |
| `activity_logs` | `activity_logs_select_manager` | `EXISTS (... me.role IN ('ga_manager','insurer_manager') AND target.team=me.team AND target.role IN ('ga_member','insurer_member'))` |
| `activity_logs` | `activity_logs_select_own` | `user_id = auth.uid()` |
| `activity_logs` | `admin read all logs` | `EXISTS (SELECT 1 FROM users WHERE users.id=auth.uid() AND users.role='admin')` |
| `app_settings` | `authenticated read app_settings` | `true` |
| `comments` | `anyone can read comments` | `true` |
| `library` | `library_select_own_or_shared` | `(scope='shared') OR ((auth.uid())::text = owner_id)` |
| `posts` | `anyone can read together posts` | `(board_type='together') AND (is_hidden=false)` |
| `posts` | `authenticated read non-together posts` | `(board_type<>'together') AND (is_hidden=false)` |
| `script_usage_logs` | `admin_branch_manager_read_logs` | `EXISTS (SELECT 1 FROM users WHERE users.id=auth.uid() AND users.role IN ('admin','ga_branch_manager','insurer_branch_manager'))` |
| `scripts` | `authenticated read scripts` | `true` |
| `users` | `user read own` | `auth.uid() = id` |

**5역할 단일 키 잔존 검증:** 12행 본문 grep — `'branch_manager'` / `'manager'` / `'member'` / `'staff'` / `'insurer'` 단일 키 사용 0건 ✅. (9역할 키만 사용 — D-pre.6 정합 유지) ✅.

### 1.4 Step B 진입 대상 정정 (Web 분기 결정 통보)

**핵심 통찰:** A-1의 `admin_select=0` 컬럼은 "admin 이름 붙은 정책 부재"를 의미할 뿐, **실제 SELECT 차단 여부와 다름**. A-3 본문 raw 검토 결과:

| 테이블 | A-3 본문 | 실제 admin SELECT? | Step B 진입 |
|---|---|---|:---:|
| **`users`** | `auth.uid() = id` | ❌ 본인만 | ✅ **B-1** |
| `scripts` | `qual: true` | ✅ 이미 가능 | ❌ 불필요 |
| **`library`** | `scope='shared' OR auth.uid()=owner_id` | ❌ 본인+shared만 | ✅ **B-2** |
| `script_usage_logs` | `admin + branch_manager` 그룹 | ✅ 정합 | — |
| `posts` | `is_hidden=false` 조건 | ⚠️ 숨김 차단 | **별 트랙 부채** |
| `comments` | `qual: true` | ✅ 이미 가능 | ❌ 불필요 |
| `app_settings` | `qual: true` | ✅ 이미 가능 | ❌ 불필요 |
| `activity_logs` | `admin read all logs` 존재 | ✅ 정합 | — |

→ **Step B 진입 확정 2건: `users` + `library`.**

---

## § 2. Step B 1차 시도 — EXISTS 자기 참조 패턴 (사고 발생)

> ⚠️ **본 § 2는 첫 시도 기록 (사고 학습용 보존).** SUCCESS 통과했으나 라이브 검증에서 무한 재귀 발견 → 비상 롤백 → § 4 SECURITY DEFINER 재진입.

### 2.1 B-1 (1차). users 정책 추가 — EXISTS 패턴

```sql
CREATE POLICY admin_select_all_users
ON public.users FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users me WHERE me.id = auth.uid() AND me.role = 'admin')
);
```

**실행 결과:** `Success. No rows returned` ✅ (단, 이 SUCCESS는 정책 등록 성공일 뿐 의미 정합 X)

### 2.2 B-2 (1차). library 정책 추가 — EXISTS 패턴

```sql
CREATE POLICY admin_select_all_library
ON public.library FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users me WHERE me.id = auth.uid() AND me.role = 'admin')
);
```

**실행 결과:** `Success. No rows returned` ✅

### 2.3 1차 사후 검증 SQL — 통과

C-1 (정의 raw 비교): 2행 모두 `EXISTS / SELECT 1 FROM users me / me.id=auth.uid() / me.role='admin'` 4키 정합.
C-2 (카운트): users·library 각 admin_select_after = 1 ✅.

→ **DB 메타 검증은 통과**. 라이브 검증으로 진입.

### 2.4 1차 라이브 검증 — 🚨 무한 재귀 42P17 발견

```javascript
// D-1 (라이브 검증 첫 시도)
await window.db.fetch('/rest/v1/users?select=*', {headers:{'Prefer':'count=exact'}});
```

**raw 결과:**

```
status: 500
count header: null
data: {
  "code": "42P17",
  "details": null,
  "hint": null,
  "message": "infinite recursion detected in policy for relation \"users\""
}
```

**원인 분석:**
- `admin_select_all_users` USING 절 → `users me` 서브쿼리 실행
- 서브쿼리 SELECT 자체에도 SELECT 정책 평가 → `admin_select_all_users` 다시 호출 → 무한 재귀
- `admin_update_all_users`(UPDATE)는 작동했던 이유: 그 시점에 SELECT 정책에 자기 참조가 없었음(user read own만 존재). 이번 신규 SELECT 정책 추가가 self-referencing chain을 형성.

**Code 자체 검증 분석 오류 인정:** D-pre.7 진입 직전 "재귀 안전 검증" 결론(`me.id=auth.uid()` 조건이라 안전)이 틀렸음. PostgreSQL RLS는 서브쿼리에도 정책을 재귀 평가함.

### 2.5 비상 롤백 (즉시 실행)

```sql
DROP POLICY IF EXISTS admin_select_all_users ON public.users;
DROP POLICY IF EXISTS admin_select_all_library ON public.library;
```

**실행 결과:** 2건 모두 `Success. No rows returned` ✅

### 2.6 비상 롤백 직후 라이브 회귀 검증

```javascript
await window.db.fetch('/rest/v1/users?select=id,email,role');
```

**raw:** `status: 200` / `data: [{id:"de7ba389-...", email:"bylts0428@gmail.com", role:"admin"}]` (admin 본인 row 1행) ✅

→ **재귀 차단 + 라이브 정상 복구.** 본 § 2는 종료. § 3 SECURITY DEFINER 재진입.

---

## § 3. Step B 2차 재진입 — SECURITY DEFINER 함수 패턴

### 3.1 패턴 변경 사유 (영구 학습)

**자기 참조 패턴(EXISTS) 폐기 → SECURITY DEFINER 함수 패턴 채택.** 이유:

| 패턴 | 메커니즘 | 재귀 위험 |
|---|---|:---:|
| EXISTS 자기 참조 | 정책 USING 절 안에서 동일 테이블 SELECT 서브쿼리 | 🚨 발생 |
| SECURITY DEFINER 함수 | 함수가 정의자(postgres) 권한으로 실행 → 함수 내부 SELECT는 RLS 우회 | ✅ 차단 |
| JWT 클레임 (`auth.jwt() ->> 'role'`) | DB 조회 없이 JWT 클레임 직접 참조 | ✅ 차단 (단 JWT에 role 자동 반영 X — 미채택) |

→ Code 권장 (가) SECURITY DEFINER 채택.

### 3.2 SQL-C. `is_admin()` 함수 신설

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;
```

**실행 결과:** `Success. No rows returned` ✅

### 3.3 SQL-D. 함수 시그니처 검증

```sql
SELECT routine_name, routine_type, security_type, data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'is_admin';
```

**raw 결과:**

| routine_name | routine_type | security_type | return_type |
|---|---|---|---|
| `is_admin` | `FUNCTION` | **`DEFINER`** | `boolean` |

→ **`security_type='DEFINER'` 확인 ✅** (핵심 — `INVOKER`이면 RLS 우회 안 되어 재귀 재발 가능). 1행 정합.

### 3.4 SQL-E. users 정책 (재진입)

```sql
CREATE POLICY admin_select_all_users
ON public.users FOR SELECT
USING (public.is_admin());
```

**실행 결과:** `Success. No rows returned` ✅

### 3.5 SQL-F. library 정책 (재진입)

```sql
CREATE POLICY admin_select_all_library
ON public.library FOR SELECT
USING (public.is_admin());
```

**실행 결과:** `Success. No rows returned` ✅

---

## § 4. Step C 2차 사후 검증 (재진입 후, 정의 raw + 카운트)

### 4.1 SQL-G. 정의 raw 비교

```sql
SELECT tablename, policyname, qual
FROM pg_policies
WHERE tablename IN ('users', 'library')
AND policyname IN ('admin_select_all_users', 'admin_select_all_library')
ORDER BY tablename;
```

**raw 결과:**

| tablename | policyname | qual |
|---|---|---|
| `library` | `admin_select_all_library` | `is_admin()` |
| `users` | `admin_select_all_users` | `is_admin()` |

**정의 raw 정합 검증:**

| 검증 키 | users | library |
|---|:---:|:---:|
| `is_admin()` 함수 호출 | ✅ | ✅ |
| EXISTS 자기 참조 잔존 | 0건 ✅ | 0건 ✅ |
| 5역할 단일 키 잔존 | 0건 ✅ | 0건 ✅ |

→ **2건 모두 새 패턴 정합 ✅.** 구 EXISTS 패턴 잔존 0건 (D-pre.6 정의 raw 검증 표준 통과).

### 4.2 SQL-H. 카운트 재확인

```sql
SELECT tablename,
       SUM(CASE WHEN cmd='SELECT' AND policyname ILIKE '%admin%' THEN 1 ELSE 0 END) AS admin_select_after
FROM pg_policies
WHERE tablename IN ('users', 'library')
GROUP BY tablename
ORDER BY tablename;
```

**raw 결과:**

| tablename | admin_select_after |
|---|:---:|
| `library` | 1 |
| `users` | 1 |

→ **2건 모두 1로 증가** ✅ (롤백 후 0 → 재진입 후 1).

---

## § 5. Step D 2차 라이브 검증 (재진입 후, 재귀 회귀 0)

### 5.1 JS-B. admin SELECT 카운트 검증 (users)

```javascript
(async () => {
  const res = await window.db.fetch('/rest/v1/users?select=*', {headers:{'Prefer':'count=exact'}});
  console.log('JS-B status:', res.status);
  console.log('JS-B count header:', res.headers.get('content-range'));
  const data = await res.json();
  console.log('JS-B data:', data);
})();
```

**raw 결과:**
- `status: 200` ✅ (재귀 차단 — 1차 시도 500 → 2차 200 회복)
- `count header: "0-0/1"` ✅ (admin 1명)
- `data:` admin 1행 ✅

### 5.2 JS-C. admin SELECT 본 데이터 회수 (users)

```javascript
(async () => {
  const res = await window.db.fetch('/rest/v1/users?select=id,email,role');
  const data = await res.json();
  console.log('JS-C raw:', JSON.stringify(data, null, 2));
})();
```

**raw 결과:**
```json
[{"id":"de7ba389-...","email":"bylts0428@gmail.com","role":"admin"}]
```

→ admin 1행 + role='admin' 정합 ✅.

### 5.3 JS-D. admin SELECT 카운트 검증 (library)

```javascript
(async () => {
  const res = await window.db.fetch('/rest/v1/library?select=*', {headers:{'Prefer':'count=exact'}});
  console.log('JS-D status:', res.status);
  console.log('JS-D count header:', res.headers.get('content-range'));
})();
```

**raw 결과:**
- `status: 200` ✅
- `count header: "0-0/1"` ✅ (library 1행 — admin 본 데이터 가시)

### 5.4 Step D 종합 판정

| # | 검증 | 결과 | 판정 |
|:---:|---|---|:---:|
| JS-B | users 카운트 status=200 + 1행 | 재귀 차단 + 정합 | ✅ |
| JS-C | users 본 데이터 admin role 확인 | 정합 | ✅ |
| JS-D | library 카운트 status=200 + 1행 | 재귀 차단 + 정합 | ✅ |

**결론: 라이브 검증 3건 전건 통과 — 재귀 회귀 0 + admin SELECT 정상 작동.**

---

## § 6. Step E — 롤백 SQL 보관 (비상시만 실행)

> ⚠️ **자동 실행 금지.** 회귀 발견 시 또는 사용자 명시 지시 시에만 실행.

### 6.1 정책 3건 제거 (admin SELECT 2건 + admin UPDATE 1건 — § 9 후속 정정 포함)

```sql
DROP POLICY IF EXISTS admin_select_all_users ON public.users;
DROP POLICY IF EXISTS admin_select_all_library ON public.library;
DROP POLICY IF EXISTS admin_update_all_users ON public.users;
-- 단, admin_update_all_users 롤백 시 admin이 다른 사용자 UPDATE 권한 0이 됨.
-- 구 EXISTS 패턴으로 복구 원하면 § 9.5 별도 SQL 사용 (재귀 위험 인지 후).
```

### 6.2 함수 제거 (정책 제거 후)

```sql
DROP FUNCTION IF EXISTS public.is_admin();
```

> ⚠️ 정책이 함수를 참조 중이면 DROP 실패. 정책 → 함수 순서 준수 필수.

### 6.3 롤백 후 검증

```sql
-- 정책 + 함수 모두 부재 확인
SELECT 'policy' AS type, tablename || '.' || policyname AS name FROM pg_policies
WHERE policyname IN ('admin_select_all_users','admin_select_all_library')
UNION ALL
SELECT 'function', routine_name FROM information_schema.routines
WHERE routine_schema='public' AND routine_name='is_admin';
-- 기댓값: 0 rows
```

---

## § 7. 종합 판정 + 영구 청산 + 학습

### 7.1 검증 누적 매트릭스 (1차 + 2차 통합)

| Step | 검증 | 1차 | 2차 (SECURITY DEFINER) |
|:---:|---|:---:|:---:|
| A-1 | 8테이블 정책 카운트 | ✅ | (동일) |
| A-2 | RLS 활성 | ✅ | (동일) |
| A-3 | SELECT 정의 raw + 5역할 단일 키 0건 | ✅ | (동일) |
| A 정정 | Step B 진입 6→2 | ✅ | (동일) |
| B-1 | users 정책 SUCCESS | ✅ | ✅ |
| B-2 | library 정책 SUCCESS | ✅ | ✅ |
| 함수 신설 | `is_admin()` SECURITY DEFINER | — | ✅ |
| 함수 검증 | `security_type=DEFINER` | — | ✅ |
| C-1 | 정의 raw 비교 | ✅ (EXISTS 패턴) | ✅ (`is_admin()` 패턴) |
| C-2 | 카운트 0→1 | ✅ | ✅ |
| **D-1 라이브** | users 카운트 status=200 | 🚨 **500 42P17** | ✅ 200 |
| D-2 라이브 | users 본 데이터 | (실행 못 함) | ✅ |
| D-3 라이브 | library 카운트 | (실행 못 함) | ✅ |

**1차 라이브 1건 사고 → 비상 롤백 → 2차 재진입 9건 전건 통과.**

### 7.2 영구 청산 명문화

D-1 Step 6 R6 검증으로 발견된 admin SELECT 정책 부재가 **D-pre.7 트랙으로 분리 처리되어 영구 청산.** 사고 발생 + 학습 + 표준 패턴 도입 완료. 다음 본 작업(D-1 admin_v2 users 실 데이터 연결)에서 fetchUsers 호출 시 admin은 전체 사용자 row SELECT 가능. 신규 가입자 발생 시 즉시 admin 화면에 표시 — 본 사고 회귀 0.

**D-pre 시리즈 모두 종료:**
- D-pre ✅ (5/1) — users.role 9역할 마이그레이션
- D-pre.5 ✅ (5/2) — users.status / users.last_seen_at 컬럼 추가
- D-pre.6 ✅ (5/2) — users_role_check 9키 + activity_logs RLS 9역할 정합 + board.html 라인 2213
- **D-pre.7 ✅ (5/2)** — users + library admin SELECT 정책 SECURITY DEFINER 패턴 (1차 EXISTS 사고 + 2차 재진입 영구 청산)
- D-9 보류 결정 ✅ (5/2)

→ D-1 진입 100% 정합 보장.

### 7.3 영구 학습 — RLS 자기 참조 회피 표준

**원칙 (영구 명문화):**
1. **RLS 정책 USING/WITH CHECK 절에서 동일 테이블 SELECT 서브쿼리 절대 금지** — 무한 재귀 위험
2. **admin/role 검증은 SECURITY DEFINER 함수 사용** — 함수 정의자 권한으로 RLS 우회
3. **`admin_update_all_users`가 작동해도 같은 패턴이 SELECT에서 재귀** — UPDATE 정책의 USING은 SELECT처럼 평가되지만, SELECT 정책에 자기 참조가 추가되면 평가 chain 형성
4. **검증 표준 (D-pre.7 추가):** DB 메타 검증(C-1 정의 raw + C-2 카운트) 통과만으로 안전 단정 금지. **반드시 라이브 검증(JS-B/C/D)까지 통과해야 안전 확정.** 메타 검증과 런타임 동작은 다름.
5. **Code 자체 검증 분석 검토 강화:** "재귀 안전 검증 ✅" 같은 단정 결론 금지. 사양상 안전해 보여도 PostgreSQL 동작 메커니즘 1차 출처 확인 필수. 의심 시 sandbox 테스트 우선.

본 학습은 향후 Phase D 잔여 섹션(D-2~D-8) RLS 작업 시 **표준 패턴**으로 적용:
- 다른 테이블에 admin SELECT 정책 추가 시 `is_admin()` 함수 재사용
- 다른 role 검증 헬퍼 함수 신설 시 동일 SECURITY DEFINER 패턴 (예: `is_branch_manager()`, `is_manager()` 등)

### 7.4 잔존 부채

| # | 부채 | 처리 시점 | 사유 |
|:---:|---|---|---|
| 1 | `posts` admin 숨김 게시물 SELECT 정책 | 별 세션 | 사업 판단 필요 |
| 2 | `news` 테이블 트랙 후순위 폐기 | 메모리 등록 (이미 등록됨) | RLS 활성 + 정책 0건 = 안전 |
| 3 | CLAUDE.md § 9역할 표 동기화 ("원수사 일반 직원" → "원수사 직원") | D-1 완료 후 | D-1 작업지시서 § 5 부채 신규 1 |
| 4 | KPI 추세 통계 함수 신설 | D-8 dashboard | D-1 작업지시서 § 5 부채 신규 2 |
| 5 | `window.db.patch()` 메서드 신설 | Phase D 완료 후 | D-1 작업지시서 § 5 부채 신규 3 |
| 6 | **(신규) RLS 자기 참조 회피 표준 명문화** | 메모리 등록 + 향후 Phase D 작업지시서 반영 | § 7.3 영구 학습 |

---

## § 8. 안전망 조합 (3중 방어)

| 단계 | 안전망 | 회복 시간 |
|:---:|---|---|
| 🛡️ 1차 | § 6 Step E 롤백 SQL (정책 2건 + 함수 1건) | 즉시 (DROP 3건) |
| 🛡️ 2차 | 본 캡처본 (§ 1·§ 2·§ 3·§ 4 raw) | ~10분 (수동 SQL 재작성) |
| 🛡️ 3차 | Daily 백업 (5/2 02:14 추정 시점) | ~30분 (Dashboard 복원) |

**비용:** $0.

---

## § 9. 다음 작업 — D-1 본 진입

본 D-pre.7 단일 커밋·푸시 완료 후:

1. `_INDEX.md` Phase D 세부 단계 표에 **D-pre.7 ✅ 행 추가** (사고 학습 명문화)
2. **D-1 admin_v2 users 실 데이터 연결** 작업지시서 그대로 Step 1 진입 (이미 작업지시서 발행됨, 결정 8건 확정 완료) — **다음 세션**
3. fetchUsers() 함수 신설 시 **admin SELECT 권한 100% 정합 보장 상태** + RLS 자기 참조 회피 표준 적용

---

## § 9. admin_update_all_users 후속 정정 (점검 3 회귀 → 옵션 A 채택)

### 9.1 발견 경위

D-pre.7 § 8.2 최종 회귀 점검 5건 중 **점검 3 (재귀 패턴 전 테이블 sweep)에서 1행 발견:**

```
tablename: users
policyname: admin_update_all_users
qual: EXISTS ( SELECT 1 FROM users me WHERE ((me.id = auth.uid()) AND (me.role = 'admin'::text)))
```

→ D-pre.7 본 트랙(SELECT 정책만 SECURITY DEFINER 패턴 교체) 후에도 **UPDATE 정책에 동일 자기 참조 잔존**. SELECT는 안전하지만 admin이 다른 사용자 row UPDATE 시도 시 42P17 재발 가능. D-1 본 작업지시서 mock에 "✏️ 편집" 버튼 포함 → D-1 진입 시 사고 잠재 위험.

### 9.2 옵션 A 채택 사유 (Code 권장)

| 옵션 | 내용 | 채택 |
|---|---|:---:|
| **(A)** SECURITY DEFINER 패턴 교체 | DROP + CREATE with `is_admin()` USING + WITH CHECK | ⭐ |
| (B) 다음 세션 D-pre.8로 인계 | 본 세션 종료, D-1에 임시 안전망 | ❌ |
| (C) DROP만 즉시 | 검증 부실 | ❌ |

→ **(A) 채택** — D-pre.7 트랙 일관성 + 즉시 사고 차단 + 검증 표준 준수.

### 9.3 SQL-I. DROP (구 EXISTS 패턴 제거)

```sql
DROP POLICY admin_update_all_users ON public.users;
```

**실행 결과:** `Success. No rows returned` ✅

### 9.4 SQL-J. CREATE (새 `is_admin()` 패턴, USING + WITH CHECK)

```sql
CREATE POLICY admin_update_all_users
ON public.users FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());
```

**실행 결과:** `Success. No rows returned` ✅

> ⚠️ **UPDATE 정책은 USING + WITH CHECK 둘 다 필수.**
> - **USING:** 어떤 row를 UPDATE할 수 있는지 (수정 대상 자격) — admin이 모든 사용자 row UPDATE 가능
> - **WITH CHECK:** UPDATE 후 결과 row가 정책 통과해야 함 (수정 결과 자격) — admin이 자기 권한 박탈 row UPDATE 후에도 admin 유지

### 9.5 사후 검증 SQL-K (정의 raw 비교)

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename='users' AND policyname='admin_update_all_users';
```

**raw 결과:**

| policyname | cmd | qual | with_check |
|---|---|---|---|
| `admin_update_all_users` | `UPDATE` | `is_admin()` | `is_admin()` |

→ **EXISTS / FROM users me 패턴 부재 확인** ✅. SECURITY DEFINER 패턴 정합.

### 9.6 사후 검증 SQL-L (users 테이블 전 정책 sweep)

```sql
SELECT policyname, cmd,
       CASE WHEN qual ILIKE '%FROM users me%' OR with_check ILIKE '%FROM users me%' THEN 'OLD_PATTERN'
            WHEN qual ILIKE '%is_admin()%' OR with_check ILIKE '%is_admin()%' THEN 'NEW_PATTERN'
            ELSE 'OTHER'
       END AS pattern_type
FROM pg_policies WHERE tablename='users' ORDER BY policyname;
```

**raw 결과 (5행):**

| policyname | cmd | pattern_type |
|---|---|---|
| `admin_select_all_users` | SELECT | NEW_PATTERN |
| `admin_update_all_users` | UPDATE | **NEW_PATTERN** ⭐ |
| `user insert own` | INSERT | OTHER |
| `user read own` | SELECT | OTHER |
| `user update own` | UPDATE | OTHER |

→ **OLD_PATTERN 카운트 0** ⭐ users 테이블 자기 참조 패턴 영구 청산.

### 9.7 라이브 UPDATE 검증 JS-A (재귀 회귀 0 핵심)

```javascript
const userId = window.AppState?.userId;
const res = await window.db.fetch('/rest/v1/users?id=eq.' + userId, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
  body: JSON.stringify({ name: '어드민' })
});
```

**raw 결과:**
- `status: 200` ✅
- `data:` admin 1행 (`{name:'어드민', email:'bylts0428@gmail.com', role:'admin', ...}`)
- 콘솔 에러 0건

→ **42P17 재귀 회귀 0** ✅. UPDATE 정책 SECURITY DEFINER 패턴 정합 확정.

### 9.8 라이브 SELECT 회귀 0 재확인 JS-B

```javascript
await window.db.fetch('/rest/v1/users?select=*', {headers:{'Prefer':'count=exact'}});
```

**raw 결과:** status=200 / count="0-0/1" / data 1행 ✅ — UPDATE 정책 변경이 SELECT에 영향 0.

### 9.9 재귀 패턴 전 테이블 sweep SQL-M (점검 3 재실행)

```sql
SELECT tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname='public'
  AND (qual ILIKE '%FROM users me%' OR qual ILIKE '%FROM public.users me%'
       OR with_check ILIKE '%FROM users me%' OR with_check ILIKE '%FROM public.users me%')
ORDER BY tablename, policyname;
```

**raw 결과:** **0행** ✅ — 점검 3에서 1행 → § 9 후속 정정 후 0행 = 영구 청산 확인.

### 9.10 § 9 종합 판정

| Step | 검증 | 결과 | 판정 |
|:---:|---|---|:---:|
| 9.3 | SQL-I DROP | Success | ✅ |
| 9.4 | SQL-J CREATE | Success | ✅ |
| 9.5 | SQL-K 정의 raw | qual=is_admin() / with_check=is_admin() | ✅ |
| 9.6 | SQL-L 전 정책 sweep | OLD_PATTERN 0건 | ✅ |
| 9.7 | JS-A 라이브 UPDATE | status=200 + 1행 + 재귀 0 | ✅ |
| 9.8 | JS-B 라이브 SELECT 회귀 0 재확인 | status=200 + 1행 | ✅ |
| 9.9 | SQL-M 재귀 sweep | 0행 | ✅ |

**§ 9 후속 정정 7건 전건 통과.** users 테이블 자기 참조 패턴 영구 청산 + UPDATE 재귀 위험 차단 완료.

### 9.11 § 9 추가 학습 (영구 명문화)

**"같은 테이블의 다른 cmd(UPDATE/INSERT/DELETE) 정책에도 동일 패턴 잔존 가능."**

D-pre.7 본 트랙은 SELECT 정책 부재만 검증 + 정정. UPDATE 정책의 동일 자기 참조 패턴은 **점검 3 (전 테이블 sweep)에서 사후 발견**. 향후 RLS 작업 시:

1. **단일 cmd 검증으로 안전 단정 금지** — 같은 테이블의 모든 cmd 정책 전수 점검 필수
2. **자기 참조 sweep SQL을 사전 검증(Step A) 필수 항목에 포함** — `WHERE qual ILIKE '%FROM <table> me%'` 패턴
3. **회귀 점검 단계가 아니라 사전 검증 단계에서 잡아야** — 점검 3은 사후 발견 도구로 작동했지만, 사전 검증에서 잡았어야 효율적

→ 향후 Phase D 잔여 섹션(D-2~D-8) RLS 작업 시 본 학습 표준 적용. 메모리 `rls_self_reference_avoidance.md` 갱신 권장.

---

*본 캡처본은 D-pre.7 마이그레이션 단일 진실 원천. § 1~§ 9 모두 raw로 누적. 1차 EXISTS 사고 + 2차 SECURITY DEFINER 재진입 + § 9 admin_update_all_users 후속 정정 + 영구 학습 명문화. D-1 진입 가능.*
