# Admin 권한 RLS 점검 의뢰서 (Chrome AI)

> **작성일:** 2026-05-26
> **요청자:** Code (Claude Code Opus 4.7 1M)
> **결재 자리:** 팀장님 명시 허용 받음 — "단, (마)는 점검 SQL 의뢰만. 정책 수정은 결과 보고 후 별도 결재."
> **본질:** admin 권한 단일 진실 정합 점검 + 현재 RLS 정책 전수 보고. **수정 SQL 일체 X — 모든 쿼리 SELECT만.**

---

## 0. 대상 프로젝트 확인 (강제)

> **Chrome AI에게:** SQL 진입 전 다음을 먼저 Dashboard에서 확인하고 응답에 포함할 것.
>
> 1. Dashboard 좌상단 프로젝트 표시 = `onesecond-v1-restore-0420` 인가?
> 2. URL 프로젝트 ID = `pdnwgzneooyygfejrvbg` 로 시작하는가?
>
> 둘 다 YES면 진입. 하나라도 NO면 즉시 중단 보고.

(팀장님이 본 의뢰서 보내기 전 위 두 가지 직접 확인 완료. 2026-05-26 22:59 KST.)

---

## 1. 본질 (왜 본 점검을 진입하는가)

코드 측 점검에서 다음 격차 발견:

- **격차 #1 (BUG)** — `js/auth-guard.js`가 `os_user.role` 검사 (Supabase auth user 객체에는 role 컬럼 없음) → admin도 admin_v2/admin 페이지 진입 차단 가능성
- **격차 #2 (변수명 격차)** — `pages/board.html` line 8457 `var isAdmin = isFreeTier(...)` (admin + 4 매니저 5종) → admin 1순위 명시 안 됨

→ 단계 1 (프론트 정정)은 진입 완료. 본 의뢰서 = 단계 1 라이브 진입 후 **DB 측 RLS 정책이 admin을 일관되게 통과시키는지** 점검.

본 의뢰서 = SQL 4건 (모두 SELECT). **정책 변경 SQL 0건.** 결과 보고 후 정정 자리는 별도 결재 받기.

---

## 2. 점검 SQL (한 번에 한 쿼리씩, Dashboard 마지막 결과만 반환되므로 분리 가동)

### Query 1 — admin row 정합

```sql
SELECT
  au.id            AS auth_id,
  pu.id            AS public_id,
  pu.auth_user_id  AS public_auth_user_id,
  pu.email,
  pu.role,
  pu.plan,
  pu.name,
  (au.id = pu.id)            AS id_match,
  (au.id = pu.auth_user_id)  AS auth_user_id_match
FROM auth.users au
LEFT JOIN public.users pu ON pu.email = au.email
WHERE au.email = 'bylts0428@gmail.com';
```

**기대값:**
- `public_id` NOT NULL (admin row 존재)
- `role = 'admin'`
- `id_match` 또는 `auth_user_id_match` 중 하나 TRUE (RLS가 어느 쪽 컬럼을 보는가 확인용)

### Query 2 — RLS 정책 전수 (테이블별 definition)

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;
```

**점검 자리:** 각 테이블 정책 `qual` / `with_check`에 `is_admin()` 함수 또는 `role = 'admin'` 조건이 일관되게 박혀있는가? admin을 누락한 정책이 있는가?

### Query 3 — `is_admin()` 류 SECURITY DEFINER 함수 정의

```sql
SELECT
  proname,
  prosecdef        AS security_definer,
  pg_get_function_arguments(oid) AS args,
  pg_get_function_result(oid)    AS returns,
  pg_get_functiondef(oid)        AS definition
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proname IN ('is_admin', 'is_pro', 'current_user_role', 'is_manager_or_above', 'is_free_tier');
```

**점검 자리:**
- `security_definer = true` 인가?
- 함수 본문이 어느 컬럼을 보는가? (`auth.uid()` vs `current_user` vs JWT claim)
- admin 판정 일관성 (메모리 `rls_self_reference_avoidance` 정합)

### Query 4 — RLS 가동 테이블 목록

```sql
SELECT
  c.relname                AS table_name,
  c.relrowsecurity         AS rls_enabled,
  c.relforcerowsecurity    AS rls_forced,
  (SELECT COUNT(*) FROM pg_policies p
     WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS policy_count
FROM pg_class c
WHERE c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND c.relkind = 'r'
ORDER BY c.relname;
```

**점검 자리:**
- RLS 가동된 테이블에 정책이 0건인 자리 (RLS ON + 정책 X = 모든 접근 차단 = admin도 차단)
- RLS 비가동 테이블 (RLS OFF = 모든 접근 허용 = 보안 격차 후보)

---

## 3. 결과 보고 형식 (Chrome AI 답변 요청)

각 Query별로 다음 형식 박기:

```
### Query N 결과

[프로젝트 확인]
- Dashboard 좌상단: ✅ onesecond-v1-restore-0420
- URL 프로젝트 ID: ✅ pdnwgzneooyygfejrvbg

[raw 결과]
(SQL 결과 표를 그대로 자료)

[1줄 본질]
(이 결과가 admin 권한 정합에 어떤 의미인지 1줄 본질)

[격차 후보]
(admin이 차단될 가능성이 보이는 자리, 있으면 모두 자료. 없으면 "격차 후보 없음")
```

마지막에 **종합 본질 1단락** + **정정 권고 우선순위 (1~5건 자체)** 자체.

---

## 4. 절대 금지 (Chrome AI 강제)

- ❌ ALTER POLICY / CREATE POLICY / DROP POLICY 일체 X
- ❌ CREATE OR REPLACE FUNCTION 일체 X
- ❌ INSERT / UPDATE / DELETE 일체 X
- ❌ ALTER TABLE 일체 X
- ❌ "수정 진입했음" 같은 자율 행동 일체 X

→ 본 의뢰서 = **점검만**. 모든 정정 SQL은 결과 보고 후 팀장님 별도 결재 받음 후 별 의뢰서로 진입.

---

## 5. 의뢰서 자체 점검 (Chrome AI 본 의뢰서 받기 전 자체 자료)

- [ ] 모든 SQL이 SELECT 또는 pg_get_*() 함수 호출만 자료
- [ ] WHERE 조건이 specific row 제한 자료 (전수 fetch 격차 자료)
- [ ] 결과 자료에 토큰/시크릿/비밀번호 노출 자료 없음 자료
- [ ] 자료 4건 = 각각 별 RUN 자체 (Dashboard 마지막 쿼리만 반환)

---

**의뢰서 끝.**

Chrome AI 답변 받은 후 Code 자체 종합 → 팀장님께 정정 권고 우선순위 보고 → 별 결재 받은 후 별 의뢰서로 정정 SQL 진입.
