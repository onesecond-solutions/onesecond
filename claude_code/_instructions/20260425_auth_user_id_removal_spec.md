# auth_user_id 컬럼 제거 및 표준화 작업지시서

> **작성일:** 2026-04-23
> **작성자:** Claude Code (2026-04-23 오후 진단 결과 기반)
> **예상 실행일:** 2026-04-25 ~ 04-26 (주말)
> **작업 성격:** 단기 핫픽스 대신 **근본 해결(C 옵션)** — auth_user_id 컬럼 전면 제거 + RLS 재설계
> **실행 범위:** DB(RLS·트리거·스키마) + 프론트(index.html 가입 코드 + 앱 코드 전역 참조)
> **서비스 영향:** 실행 중 짧은 점검 시간 필요 (예상 4~5시간 일괄 실행)

---

## 1. 배경 및 목적

### 현재 문제점

1. `public.users.auth_user_id` 컬럼은 `claude_code/_docs/supabase_schema.md`에서 **"레거시 컬럼, 재설계 시 제거 예정"** 으로 문서화되어 있으나 **아직 현역 사용 중**
2. 현재 RLS 정책 (`q5_rls_policies.csv`)이 `auth_user_id = auth.uid()` 를 매칭 키로 사용:
   - admin: `users.auth_user_id = auth.uid() AND users.role = 'admin'`
   - branch_manager: `me.auth_user_id = auth.uid() AND me.role = 'branch_manager' AND target.branch = me.branch`
   - manager: `me.auth_user_id = auth.uid() AND me.role = 'manager' AND target.team = me.team`
3. 회원가입 시 `auth_user_id` 컬럼 DEFAULT가 `gen_random_uuid()` 이고, 클라이언트 가입 코드(`index.html` doSubmit)가 이 컬럼을 세팅하지 않음 → **무작위 uuid가 들어가 auth.uid()와 매칭 안 됨** → 관리자/매니저 RLS 권한이 조용히 실패
4. 결과: "반쪽 계정" (public.users는 있지만 auth.users와 연결 끊김) 발생. 2026-04-20 배포 시 2명 가입 실패의 직접적 원인으로 추정.

### 왜 C(전면 제거)를 선택했는가

단기 핫픽스(A: 클라이언트 PATCH에 auth_user_id 포함 / B: 트리거 수정)도 가능하지만 아래 이유로 **C 근본 해결**로 결정:

- 서비스 일시 중단 가능 시점 (가입자 소수, 약 4명)
- **데이터 적을 때 뒤집기 최적기** — 계정이 늘어날수록 롤백 난이도 증가
- 레거시 컬럼이 현역 RLS 매칭 키로 쓰이는 이중 구조 자체가 부채
- 20260420_db_full_reset.md 에 이미 명시된 장기 방향과 일치

### 성공 기준

- [ ] `public.users.id = auth.users.id` 단일 매칭 구조 확립
- [ ] `public.users.auth_user_id` 컬럼 DROP 완료
- [ ] RLS 정책 전체가 `auth.uid() = users.id` 기반으로 전환
- [ ] `handle_new_user` 트리거에서 auth_user_id 참조 제거
- [ ] 프론트 코드(index.html, app.html, js/*.js 등) 전역에서 auth_user_id 참조 0건
- [ ] admin · branch_manager · manager · member 각 역할 로그인/권한 검증 통과
- [ ] 신규 가입 1건 테스트 통과 후 테스트 계정 정리

---

## 2. 사전 체크리스트 (실행 전날 또는 당일 아침)

- [ ] **Supabase DB 백업 스냅샷 생성** (Dashboard → Database → Backups 또는 `supabase db dump`)
  - 백업 파일명 예: `backup_20260425_pre_auth_user_id_removal.sql`
- [ ] **팀장님 admin 계정(bylts0428@gmail.com) 로그인 가능 확인** — 작업 시작 직전 실제 로그인 테스트
- [ ] **가입자 실사용 없음 확인** — 카톡 오픈채팅(https://open.kakao.com/o/svu80Moi)에 "점검 중" 공지 게시
- [ ] **현재 RLS 정책 전체 export**: Supabase SQL Editor에서 아래 쿼리 실행 후 결과 저장
  ```sql
  SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
  FROM pg_policies
  WHERE schemaname IN ('public')
  ORDER BY tablename, policyname;
  ```
  → `claude_code/_docs/supabase_dumps/pre_c_work_rls_policies.csv` 로 저장
- [ ] **현재 handle_new_user 트리거 본문 export**:
  ```sql
  SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';
  ```
  → 결과를 `claude_code/_docs/supabase_dumps/pre_c_work_handle_new_user.sql` 로 저장
- [ ] **계정 정리 Part A/B (20260423 지시서) 선행 완료** 확인 — 데이터 정합성 검증 대상 최소화
- [ ] **사전 진단 SQL Q0/Q1/Q2/Q3 결과 확보** (20260423 진단 보고서 참조)

---

## 3. 실행 순서 (순서 엄수, 각 Step 후 팀장님 확인)

### Step 1: 데이터 정합성 확인 및 정정

**목적:** 기존 모든 계정이 `id = auth_user_id` 상태인지 확인 후 불일치 정정.

**1-1. 현재 불일치 계정 조회**

```sql
SELECT id, email, role, auth_user_id,
       (id = auth_user_id) AS is_matched
FROM public.users
WHERE id IS DISTINCT FROM auth_user_id;
```

**1-2. 불일치 계정 정정 (id = auth.users.id 가 유일한 진실)**

```sql
-- 먼저 auth.users와 id가 매칭되는 public.users만 남기는지 확인
SELECT pu.id, pu.email, pu.auth_user_id, au.id AS auth_id
FROM public.users pu
LEFT JOIN auth.users au ON au.id = pu.id
WHERE au.id IS NULL;  -- public.users엔 있지만 auth.users엔 없는 고아 계정

-- 고아 계정 발견 시 개별 판단 후 삭제 (admin 제외)
-- DELETE FROM public.users WHERE id = '<orphan_id>' AND email <> 'bylts0428@gmail.com';

-- 정상 매칭 계정의 auth_user_id를 id로 강제 동기화
UPDATE public.users SET auth_user_id = id WHERE auth_user_id <> id;

-- 검증
SELECT count(*) AS mismatch_after_update
FROM public.users
WHERE id IS DISTINCT FROM auth_user_id;
-- 기대값: 0
```

**1-3. admin 계정 단독 재확인**

```sql
SELECT pu.id, pu.email, pu.role, pu.auth_user_id,
       au.id AS auth_id,
       (pu.id = au.id) AS perfect_match
FROM public.users pu
JOIN auth.users au ON au.id = pu.id
WHERE pu.email = 'bylts0428@gmail.com';
```

→ 결과 1건 + `perfect_match = true` 확인. 체크 실패 시 **즉시 중단**하고 수동 정정.

---

### Step 2: RLS 정책 전면 교체

**원칙:** `auth_user_id = auth.uid()` 매칭을 `id = auth.uid()` 로 전환.

**2-1. 기존 정책 DROP**

사전 체크리스트의 export CSV 기준으로 모든 기존 정책 DROP. 예시 패턴:

```sql
-- public.users 관련
DROP POLICY IF EXISTS "admin read users" ON public.users;
DROP POLICY IF EXISTS "branch_manager read branch users" ON public.users;
DROP POLICY IF EXISTS "manager read team users" ON public.users;
DROP POLICY IF EXISTS "users read own profile" ON public.users;
DROP POLICY IF EXISTS "users update own profile" ON public.users;

-- activity_logs
DROP POLICY IF EXISTS "branch_manager read branch logs" ON public.activity_logs;
DROP POLICY IF EXISTS "manager read team logs" ON public.activity_logs;

-- script_usage_logs, posts, comments, library, scripts 등 auth_user_id 참조하는 모든 정책
-- (사전 export CSV 기준으로 DROP 문 생성)
```

**2-2. 새 정책 CREATE (id 기반)**

```sql
-- public.users — 본인 프로필 읽기/수정
CREATE POLICY "users read own profile" ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users update own profile" ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- admin 전체 읽기
CREATE POLICY "admin read all users" ON public.users
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users me
    WHERE me.id = auth.uid() AND me.role = 'admin'
  ));

-- branch_manager: 같은 branch의 사용자 읽기
CREATE POLICY "branch_manager read branch users" ON public.users
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users me
    WHERE me.id = auth.uid()
      AND me.role = 'branch_manager'
      AND me.branch = public.users.branch
  ));

-- manager: 같은 team의 member 읽기
CREATE POLICY "manager read team users" ON public.users
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users me
    WHERE me.id = auth.uid()
      AND me.role = 'manager'
      AND me.team = public.users.team
      AND public.users.role = 'member'
  ));

-- activity_logs, script_usage_logs 등 하위 테이블의 정책도 동일한 패턴으로 재작성
-- (사전 export CSV 기준 1:1 매핑 후 auth_user_id → id로 교체)
```

> **⚠️ current_user_role() 헬퍼 함수 존재 여부 확인 필요**
> q5 덤프에 `public.current_user_role()` 호출 흔적 있음. 이 함수가 내부적으로 auth_user_id를 쓴다면 함수 자체도 재작성 필요.
> `SELECT prosrc FROM pg_proc WHERE proname = 'current_user_role';` 로 확인.

---

### Step 3: handle_new_user 트리거 수정

**3-1. 현재 트리거 본문 재확인**

```sql
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';
```

**3-2. 새 트리거 정의**

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at)
  VALUES (NEW.id, NEW.email, now());
  RETURN NEW;
END;
$$;
```

> - `id = NEW.id` (auth.users.id)가 PK로 직접 들어감
> - `auth_user_id` 참조 제거 (Step 6에서 컬럼 DROP되므로 여기서 선제 제거)
> - `role`, `plan` 등은 default에 맡김 (role은 'member', plan은 NULL)

**3-3. 트리거 재등록 확인** (트리거 자체는 유지, 함수 본문만 교체되므로 재작업 불필요)

```sql
SELECT trigger_name, event_object_schema, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

---

### Step 4: 회원가입 코드 수정 (index.html)

**대상:** `index.html` doSubmit 함수 (현재 라인 2156~2252)

**4-1. profileData에서 id 제거 검토**

현재 코드:
```js
const profileData = {
  id:      userId,           // ← 트리거가 이미 생성하므로 PATCH에서 제외됨
  name:    ...,
  ...
};
// ...
const { id: _omitId, email: _omitEmail, ...updateData } = profileData;
```

→ 그대로 유지해도 무방하지만, `auth_user_id` 관련 어떤 세팅·참조도 들어가면 안 됨 (이미 없음 확인).

**4-2. RLS 전환 후 PATCH Authorization 헤더 재검토**

현재 PATCH에 `Authorization: Bearer ${SUPABASE_KEY}` (anon key) 사용 중 — 새 RLS 정책에서 `auth.uid()` 매칭이 필요하므로 **가입 직후 얻은 access_token으로 교체해야 할 수 있음**. 테스트 시 확인:

```js
// authRes에서 access_token 추출
const accessToken = authData.access_token || authData.session?.access_token;

// PATCH 시 Authorization 헤더 교체
'Authorization': `Bearer ${accessToken}`
```

단, 이메일 인증 대기 상태에선 access_token 없을 수 있음. 이 경우 트리거가 이미 row 생성했고 클라이언트 PATCH는 실패해도 로그인 후 "내 정보 수정"으로 보강 가능하므로 **profileSaved = false fallback 경로**(현재 코드 라인 2239~2241)로 처리.

---

### Step 5: 앱 코드 전역 auth_user_id 참조 검색 및 제거

**5-1. 전역 grep**

```bash
# 프론트엔드 파일 전체에서 auth_user_id 참조 찾기
grep -rn "auth_user_id" . \
  --include="*.html" \
  --include="*.js" \
  --include="*.css" \
  --include="*.md" \
  --exclude-dir=node_modules \
  --exclude-dir=.git
```

**5-2. 예상 수정 대상**

현재(2026-04-23 기준) 확인된 auth_user_id 참조:
- `claude_code/_docs/supabase_schema.md` — 문서 (스키마 설명, 제거 기록 추가)
- `claude_code/_context/00_MASTER.md:282` — "레거시" 언급 (제거 완료 기록으로 갱신)
- `claude_code/_context/99_ARCHIVE.md:332` — 히스토리 (유지, 작업 이력)
- `claude_code/_instructions/20260420_db_full_reset.md` — 구 지시서 (본 지시서로 대체됐다는 주석 추가)
- **런타임 코드(app.html, auth.js, index.html 등)에는 2026-04-23 기준 직접 참조 없음으로 확인됨**

**5-3. 수정 원칙**

- 모든 `auth_user_id` 참조를 `id`로 대체
- 런타임 코드에서 발견되면 즉시 제거 또는 대체
- 문서에서는 "제거 완료" 기록으로 정정

---

### Step 6: 컬럼 DROP

**⚠️ 마지막 단계. 앞 Step 1~5가 전부 완료되고 검증 통과된 후에만 실행.**

```sql
-- 최종 확인: auth_user_id 참조하는 정책이 남아있지 않은지
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE qual ILIKE '%auth_user_id%' OR with_check ILIKE '%auth_user_id%';
-- 기대값: 0 rows

-- 최종 확인: auth_user_id 참조하는 함수가 남아있지 않은지
SELECT proname FROM pg_proc WHERE prosrc ILIKE '%auth_user_id%';
-- 기대값: 0 rows

-- 컬럼 DROP
ALTER TABLE public.users DROP COLUMN auth_user_id;

-- 검증
SELECT column_name 
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users' 
  AND column_name = 'auth_user_id';
-- 기대값: 0 rows
```

---

### Step 7: 검증

**7-1. admin 로그인 테스트** (브라우저 수동)
- [ ] Chrome 시크릿 창에서 `bylts0428@gmail.com`으로 로그인 성공
- [ ] 사이드바·A1·A2 정상 표시
- [ ] 화면설정 페이지 진입 가능, 메뉴 숨김 설정 저장·조회 정상
- [ ] applyMenuSettings / applyGateSettings 정상 동작 (admin이므로 설정 무시 → 모든 메뉴 표시)

**7-2. 신규 계정 가입 테스트** (테스트 계정 1개)
- [ ] 새 이메일 주소로 가입 → signUp 성공
- [ ] `public.users`에 트리거로 row 자동 생성 확인:
  ```sql
  SELECT id, email FROM public.users WHERE email = '<test_email>';
  ```
- [ ] `public.users.id = auth.users.id` 자동 매칭 확인:
  ```sql
  SELECT pu.id = au.id AS matched
  FROM public.users pu
  JOIN auth.users au ON au.email = pu.email
  WHERE pu.email = '<test_email>';
  -- 기대값: matched = true
  ```
- [ ] PATCH 완료 후 name/phone/company 등 필드 채워짐 확인
- [ ] 해당 테스트 계정으로 로그인 → 본인 프로필만 읽기·수정 가능 (RLS 동작)

**7-3. 각 역할별 RLS 동작 테스트**

role별 테스트 계정이 현재 없으므로 Part A/B 계정 정리 후 또는 SQL로 임시 role 변경:

```sql
-- 테스트 계정의 role을 일시적으로 바꿔가며 확인 (주의: 테스트 후 원복)
UPDATE public.users SET role = 'branch_manager', branch = '테스트지점' 
WHERE email = '<test_email>';

-- 로그인 후 본인 + 같은 branch 사용자만 보이는지 확인
```

**7-4. 검증 완료 후 테스트 계정 삭제**

```sql
DELETE FROM public.users WHERE email = '<test_email>';
-- auth.users는 Supabase Dashboard UI에서 수동 삭제 권장
```

---

## 4. 롤백 계획

각 Step별 롤백은 **사전 체크리스트에서 export한 CSV/SQL 파일**을 원본으로 사용.

### Step 1 롤백
```sql
-- Step 1-2의 UPDATE auth_user_id 는 되돌리기 어려움 (원래 무작위 uuid였으므로)
-- 대신 백업 스냅샷에서 복구 권장
```

### Step 2 롤백
```sql
-- 새 정책 DROP
DROP POLICY IF EXISTS "users read own profile" ON public.users;
-- ... (Step 2-2에서 만든 정책 전부)

-- 기존 정책 재생성 (pre_c_work_rls_policies.csv 기준)
CREATE POLICY "admin read users" ON public.users ...
```

### Step 3 롤백
```sql
-- pre_c_work_handle_new_user.sql 내용으로 CREATE OR REPLACE
```

### Step 4 롤백
```bash
git revert <step4_commit_hash>
```

### Step 5 롤백
```bash
git revert <step5_commit_hash>
```

### Step 6 롤백 (가장 복잡)
```sql
-- DROP COLUMN 후에는 default 복원 불가
-- 컬럼 재생성 필요:
ALTER TABLE public.users ADD COLUMN auth_user_id uuid DEFAULT gen_random_uuid();
UPDATE public.users SET auth_user_id = id;
-- 이후 Step 2 롤백까지 수행해야 원상복귀
```

### 최악의 경우

**백업 스냅샷에서 전체 복구**: Supabase Dashboard → Database → Backups → Restore
→ 그 동안 가입 시도 데이터는 손실. 점검 공지에 "N시 이후 가입 데이터 손실 가능" 사전 안내.

---

## 5. 예상 소요 시간

| 단계 | 소요 시간 |
|---|:---:|
| 사전 준비 (백업, export, 공지) | 30분 |
| Step 1 (데이터 정합성) | 20분 |
| Step 2 (RLS 전면 교체) | 60분 |
| Step 3 (트리거 수정) | 15분 |
| Step 4 (index.html 수정 + 테스트) | 45분 |
| Step 5 (전역 grep 및 코드 정리) | 20분 |
| Step 6 (컬럼 DROP) | 10분 |
| Step 7 (검증) | 60분 |
| **합계** | **약 4시간 10분** |

여유 포함 **반나절(4~5시간)** 확보 권장. 중간에 예상 못 한 정책/함수 발견 가능성 있음.

---

## 6. 주말 묶음 (병행 가능 작업)

이번 C 작업과 회원가입 코드가 겹치므로, 같은 세션에서 처리하면 효율적인 작업:

- [ ] **OTP 회원가입 전환** (Magic Link → `signInWithOtp` + `verifyOtp`)
  - C 작업 Step 4 (index.html doSubmit)와 같은 함수 수정
  - 한국식 UX: 이메일 입력 → 코드 6자리 수신 → 코드 입력 → 가입 완료
  - `supabase.auth.signInWithOtp({ email })` + `supabase.auth.verifyOtp({ email, token, type: 'email' })`
- [ ] **회원가입 폼 핸드폰 번호 수집 보강** (`public.users.phone` 컬럼)
  - Step 4 index.html 수정 시 함께
  - 유효성 검증 정규식 추가 (`^01[016789]-?\d{3,4}-?\d{4}$`)
- [ ] **계정 정리 Part A/B** (20260423 지시서)
  - **C 작업 _전_에 먼저 실행 권장** → 데이터 정합성 검증 대상 감소
  - admin 1개만 남기면 Step 1 불일치 정정 대상 없음
- [ ] **login.html 미해결 버그 2건** (myspace "준비 중" + A1 이름/이메일 미표시)
  - RLS 전환 후 동작 확인 겸 수정 타이밍 맞음

### 권장 작업 순서 (주말)

1. 계정 정리 Part A (사전 조회) → 결과 확인
2. 계정 정리 Part B (삭제 실행) → admin 1개만 남김
3. 본 C 작업 시작 (사전 체크리스트 → Step 1~7)
4. OTP 전환 + 핸드폰 번호 수집 (Step 4 수정 시 같이)
5. login.html 버그 수정 + 전체 회귀 테스트

---

## 7. 주의사항

- [ ] **각 Step 완료 후 팀장님 확인 받고 다음 Step 진행** — Claude Code 단독 판단으로 전체 자동 실행 금지
- [ ] **실제 DROP COLUMN (Step 6)은 팀장님이 SQL Editor에서 직접 실행** — 되돌리기 가장 어려운 작업
- [ ] **auth 스키마(auth.users 등) 직접 수정 금지** — Supabase 관리 영역. Dashboard UI로만 접근
- [ ] **작업 중 발견된 예상 외 상황은 즉시 중단하고 보고** — 예: 사전 export에 없던 RLS 정책 추가 발견, current_user_role 함수가 auth_user_id에 얽혀 있음 등
- [ ] **기존 지시서 `20260420_db_full_reset.md`는 본 지시서로 일부 대체됨** — 본 지시서 완료 후 20260420 문서에 "auth_user_id 제거는 본 지시서에 따라 완료" 주석 추가
- [ ] **Claude Code 세션 시작 시 이 지시서 상단부터 순서대로 재확인** — 세션 끊김 시 컨텍스트 복구 용이

---

## 8. 실행 시 체크리스트 (한 장 요약)

```
[사전]
□ 백업 스냅샷 생성
□ 점검 공지 게시
□ RLS/트리거 export

[Step 1] 데이터 정합성
□ 불일치 계정 조회
□ 고아 계정 정리
□ UPDATE auth_user_id = id
□ admin 단독 perfect_match 확인

[Step 2] RLS 전면 교체
□ 기존 정책 DROP
□ 새 정책 CREATE (id 기반)
□ current_user_role 함수 재확인

[Step 3] 트리거 수정
□ 현재 본문 재확인
□ CREATE OR REPLACE

[Step 4] index.html 가입 코드
□ doSubmit 수정
□ PATCH Authorization 토큰 검증

[Step 5] 전역 grep 및 코드 정리
□ 런타임 코드 auth_user_id 0건 확인
□ 문서 정정

[Step 6] 컬럼 DROP ⚠️ 팀장님 직접 실행
□ 정책·함수 잔존 확인 (0건)
□ ALTER TABLE DROP COLUMN
□ 컬럼 제거 검증

[Step 7] 검증
□ admin 로그인
□ 신규 가입 테스트
□ 역할별 RLS 동작
□ 테스트 계정 정리

[후처리]
□ 점검 공지 해제
□ 세션 요약(/session-end)
□ 20260420 지시서에 완료 주석 추가
```

---

## 부록 A — 이번 지시서와 관련된 진단 기록

**2026-04-23 Claude Code 진단 세션 주요 발견:**

1. `auth_user_id` DEFAULT `gen_random_uuid()` → 가입 코드가 세팅 안 하면 무작위 uuid (q2_columns.csv:118 확인)
2. RLS 정책 3건 이상이 auth_user_id를 매칭 키로 사용 (q5_rls_policies.csv:6,9-10,13-14)
3. 회원가입 코드 위치: `index.html` doSubmit (라인 2156~2252) — app.html/auth.js/login.html 아님
4. 트리거 존재 확인: `on_auth_user_created` (auth.users AFTER INSERT) → `handle_new_user()` 실행 (q6/q7)
5. 트리거 본문은 덤프에 없음 — 실행 시 `SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user'` 로 선확인 필요

**관련 기존 문서:**
- `claude_code/_context/00_MASTER.md` — 5-4항 관리자 예외 원칙
- `claude_code/_docs/supabase_schema.md` — auth_user_id "레거시" 명시
- `claude_code/_instructions/20260420_db_full_reset.md` — DB 전면 재설계 구상 (본 지시서로 세부 대체)
- `docs/index_section_map.md` — index.html 영역 매핑

---

*이 지시서는 Claude Code가 2026-04-23 진단 세션에서 생성했으며, 2026-04-25~26 주말에 팀장님 지시하에 실행될 예정이다.*
