# D-pre.6 작업지시서 사양 분석 — AI 추천 vs Code 의견 (5질문 답변)

> **작업 분류:** D-pre.6 작업지시서 발행 전 사양 정렬 분석
> **상태:** 🟡 분석·의견 제시만. SQL 실행 / 코드 변경 0건. **팀장님 결정 대기.**
> **작성:** 2026-05-02 (D-pre.5 정상 종료 직후, 커밋 `87a5906` 시점)
> **CLAUDE.md 절대 원칙 준수:** DB / admin_v2.html / app.html / auth.js / db.js / board.html 변경 모두 0건
> **선행 산출물:** `docs/specs/role-definition-audit-2026-05-02.md` (커밋 `1365c55`, 538줄) / `docs/architecture/db_pre_dpre5_capture.md` (커밋 `87a5906`까지)

---

## 0. § 0 메타 + 의뢰 배경

### 0.1 D-pre.5 종료 직후 정렬 단계

D-pre.5 5단계(A·B·C·D·E) 정상 종료(커밋 `87a5906`). 발견 사항 2건이 D-pre.6으로 이관:

| # | 부채 | 위험 |
|:---:|---|---|
| 1 | `users_role_check` 5값 비표준 (`admin/branch_manager/manager/member/insurer`) | 🔴 9역할 신규 가입 100% 거부 = 출시 차단 |
| 2 | `pages/board.html` 라인 2213 `['admin', 'insurer'].includes(s.role)` | 🔴 insurer_* 사용자 보험사 게시판 작성 차단 |

D-pre.5 사양 결정 시 AI 추천 2종(active/inactive)을 Code가 admin_v2 mock 4값 + CSS 토큰 3종 직접 검증으로 반박 → 3종(active/suspended/pending) 정정에 도달. 본 D-pre.6도 동일 패턴.

### 0.2 § 0번 정합성 검증

| # | 검증 | 결과 |
|:---:|---|:---:|
| 1 | D-pre.5 정상 종료 (Step A~D 통과, 커밋 `87a5906`) | ✅ |
| 2 | 본 작업이 D-pre.6 사양 정렬 분석임을 인지 | ✅ |
| 3 | 신버전 DB(`pdnwgzneooyygfejrvbg`) 기준 | ✅ |
| 4 | 선행 산출물 role-definition-audit-2026-05-02.md § 6 D-pre.6 골격 초안 일치 검토 | ✅ |

---

## 1. § 1 AI(Claude 채팅) 추천 골격 + 4결정 raw 인용

### 1.1 AI 추천 골격 (Step A~F)

```
Step A — 사전 검증 SELECT (다른 잔존 영역 전수 확인)
  - A-1. users_role_check 현재 정의 raw 재확인
  - A-2. 다른 테이블의 c-type CHECK constraint 전수
  - A-3. RLS 정책 전수에서 5역할 단일 키 사용 검색
  - A-4. 함수/트리거 본문에서 5역할 키 하드코딩 검색
  - A-5. board.html 라인 2213 raw 재확인 (변경 직전 캡처)

Step B — DB 변경
  - B-1. ALTER TABLE: DROP CONSTRAINT users_role_check
  - B-2. ALTER TABLE: ADD CONSTRAINT users_role_check 9역할
  - B-3. (선택) Step A에서 발견된 추가 잔존 항목 정정

Step C — 코드 변경
  - C-1. board.html 라인 2213 1줄 정정

Step D — 사후 검증
  - D-1. CHECK constraint 9역할 정합 raw
  - D-2. 9역할 INSERT 시뮬레이션 (BEGIN; INSERT; ROLLBACK) 9건
  - D-3. board.html 정정 후 grep 재확인

Step E — 라이브 검증
  - 어제 4건 + insurer 게시판 영역 회귀 0 1건 추가

Step F — 캡처본 + _INDEX.md + 커밋·푸시
```

### 1.2 AI 추천 4가지 결정

| # | 결정 | AI 추천값 | 추천 사유 |
|:---:|---|---|---|
| 1 | Step A 범위 | **(a) 전수 검색** — A-2/A-3/A-4 모두 | SELECT만이라 안전, 모든 부채 한 번에 가시화 |
| 2 | board.html 정정 | **(가) RLS 정합** — `['admin', 'insurer_branch_manager', 'insurer_manager', 'insurer_member', 'insurer_staff']` | 산출물 기본 옵션, 명확함 |
| 3 | INSERT 시뮬레이션 | **(a) 9역할 모두 9건** | CHECK 정합 검증 핵심, ROLLBACK으로 안전 |
| 4 | 분담 | **(a) D-pre.5와 동일** (Chrome SQL+라이브 / Code 캡처본) | 검증된 흐름 |

---

## 2. § 2 질문 1 답변 — 골격 자체에 대한 Code 의견

### 2.1 결론

**AI 골격 6단계 대체로 타당.** 단 D-pre.5 학습 기반 4건 보강 권장.

### 2.2 보강 권장 4건

| # | 보강 항목 | 사유 |
|:---:|---|---|
| **2.2.a** | **롤백 SQL 보관 절 신설** (별도 § 또는 Step F 직전 § E 보관) | D-pre.5는 § 5 Step E 롤백 SQL 보관(자동 실행 금지)이 명문화됐으나 AI 골격엔 누락. CHECK constraint는 DROP+ADD 패턴이라 명확한 롤백 SQL 필요 (5역할 5키 복구) |
| **2.2.b** | **Step B-1·B-2 분할 실행 명시** | D-pre.5에서 표준화된 패턴 (어제 C-4 부분 실행 사고 회피 학습). DROP과 ADD를 별도 코드블록으로 분리 + 각 직후 검증 SELECT |
| **2.2.c** | **Step B + Step C 단일 커밋 묶음** | DB ALTER + board.html 1줄 정정을 단일 커밋. 어제 D-pre G-3 결정(단일 커밋 묶음) 정합. DB-코드 시간차 최소화 — DB ALTER 후 라이브 가입 시도해도 admin은 통과 (사고 0)이지만 일관성 우선 |
| **2.2.d** | **Step E "insurer 게시판 회귀 1건"의 검증 방식 명문화** | insurer_* 사용자 부재라 직접 검증 불가. 대안: **admin이 insurer 게시판 작성 시도 → 라인 2213 정정 후에도 admin 통과 → 라이브 검증 가능**. posts 테이블 INSERT 후 admin이 직접 삭제 또는 시뮬레이션 글 표시 + 검증 후 삭제 |

### 2.3 Step B vs Step C 순서 답변

**DB 먼저 → 코드 정정 → 단일 커밋** 권장.
- DB CHECK constraint은 진실 원천. 먼저 9키 정합 → 코드(board.html)도 9키 정합으로 따라감
- 같은 커밋에 묶으면 시간차 0 (라이브에 부분 정합 상태 노출 X)
- D-pre.5와 일관 — DB ALTER 후 라이브 검증 패턴 유지

### 2.4 Step E "insurer 게시판 회귀 검증" 의미 분석

| 검증 시나리오 | 가능 여부 | 검증 효과 |
|---|:---:|---|
| (i) admin 로그인 → 보험사 게시판 글 작성 시도 | ✅ 가능 | 라인 2213 정정 후 `'admin'`이 9키에 포함되어 통과. RLS `posts.insurer_board_insert`도 admin 허용. **회귀 0 검증** |
| (ii) insurer_* 사용자 작성 시도 | ❌ 불가 | 현재 사용자 0건. 가입 폼 분리 미구현 |
| (iii) DB SQL로 INSERT 시뮬레이션 | ⚠️ 가능하나 부담 | service_role 권한으로 우회. ROLLBACK 필수 |

→ **(i) admin 작성 시도 1건이 라이브 검증으로 충분.** 작성 후 admin이 직접 삭제하거나 ROLLBACK. 시뮬레이션 글 본문에 "[D-pre.6 회귀 검증, 검증 후 삭제 예정]" 표시 권장.

### 2.5 골격 보강 후 7단계 (Code 추천)

```
Step A — 사전 검증 SELECT (5건)
Step B — DB 변경 (DROP + ADD CONSTRAINT 분할)
Step C — 코드 변경 (board.html 라인 2213 1줄)
   ※ Step B + Step C 단일 커밋 묶음
Step D — 사후 검증 SELECT (3~4건)
Step E — 라이브 검증 (어제 4건 + insurer 게시판 admin 작성 1건)
Step F — 롤백 SQL 보관 (자동 실행 금지)
Step G — 캡처본 + _INDEX.md + 커밋·푸시
```

---

## 3. § 3 질문 2 답변 — Step A 범위 (AI 추천 (a) 전수 검색)

### 3.1 결론

**AI 추천 (a) 전수 검색 동의.** 모두 SELECT, 부담 0, 모든 부채 한 번에 가시화.

### 3.2 SELECT 4건 안전성 검증

| # | SELECT | 영역 | 안전성 |
|:---:|---|---|:---:|
| A-1 | `pg_constraint`에서 users_role_check 현재 정의 | DB 메타 | ✅ |
| A-2 | `pg_constraint contype='c'` 전수 + 5역할/insurer grep | DB 메타 | ✅ |
| A-3 | `pg_policies` 전수 + 5역할/insurer grep | DB 메타 | ✅ |
| A-4 | `pg_proc` 전수 + 5역할/insurer grep (handle_new_user 외) | DB 메타 | ✅ |
| A-5 | board.html 라인 2213 git raw 재확인 | 코드 | ✅ |

→ **5건 모두 SELECT + git Read = DB·코드 변경 0건.** Step A에 통합 권장.

### 3.3 SQL 패키지 (4건 + git Read 1건)

```sql
-- ════════════════════════════════════════════════════════════════════════
-- D-pre.6 Step A — 사전 검증 SELECT (5/2)
-- 신버전 DB (pdnwgzneooyygfejrvbg) 기준. 모두 SELECT — DB 변경 0건.
-- ════════════════════════════════════════════════════════════════════════

-- A-0. 신버전 DB 재확인
SELECT current_database() AS db, current_user AS usr;

-- A-1. users_role_check 현재 정의 raw 재확인 (변경 직전 캡처)
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.users'::regclass
  AND conname = 'users_role_check';

-- A-2. 다른 테이블 CHECK constraint 5역할/insurer 잔존 검색
SELECT
  conrelid::regclass AS table_name,
  conname,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype = 'c'
  AND conrelid::regclass::text LIKE 'public.%'
  AND (
    pg_get_constraintdef(oid) LIKE '%''branch_manager''%'
    OR pg_get_constraintdef(oid) LIKE '%''manager''%'
    OR pg_get_constraintdef(oid) LIKE '%''member''%'
    OR pg_get_constraintdef(oid) LIKE '%''staff''%'
    OR pg_get_constraintdef(oid) LIKE '%''insurer''%'
  );
-- 기댓값: users_role_check 1건 (또는 추가 발견 시 D-pre.6 범위 확장)

-- A-3. RLS 정책 본문 5역할/insurer 단일 키 잔존
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    COALESCE(qual,'')||COALESCE(with_check,'') LIKE '%''branch_manager''%'
    OR COALESCE(qual,'')||COALESCE(with_check,'') LIKE '%''manager''%'
    OR COALESCE(qual,'')||COALESCE(with_check,'') LIKE '%''member''%'
    OR COALESCE(qual,'')||COALESCE(with_check,'') LIKE '%''staff''%'
    OR COALESCE(qual,'')||COALESCE(with_check,'') LIKE '%''insurer''%'
  );
-- 기댓값: 0행 (어제 Step C-4·C-5에서 5건 모두 정정 완료)

-- A-4. 함수 본문 5역할/insurer 단일 키 잔존 (handle_new_user 외)
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  CASE WHEN length(pg_get_functiondef(p.oid)) > 500
       THEN substring(pg_get_functiondef(p.oid) FROM 1 FOR 500) || '...[truncated]'
       ELSE pg_get_functiondef(p.oid) END AS definition_excerpt
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname != 'handle_new_user'
  AND (
    pg_get_functiondef(p.oid) LIKE '%''branch_manager''%'
    OR pg_get_functiondef(p.oid) LIKE '%''manager''%'
    OR pg_get_functiondef(p.oid) LIKE '%''member''%'
    OR pg_get_functiondef(p.oid) LIKE '%''staff''%'
    OR pg_get_functiondef(p.oid) LIKE '%''insurer''%'
  );
-- 기댓값: 0행. current_user_role()이 4/24 노트 "부재" 명시 후 신버전에 재생성 안 됐는지 검증
```

### 3.4 A-5 board.html git Read

git 직접 Read (이미 D-pre.5 분석에서 검증):

```js
// pages/board.html 라인 2213 (현재 raw)
if (board === 'insurer' && !['admin', 'insurer'].includes(s.role)) {
  alert('보험사게시판은 보험사 계정 또는 관리자만 작성할 수 있습니다.');
  return;
}
```

→ 단일 행 변경. § 4 정정 옵션 참조.

### 3.5 추가 발견 시 처리 분기

A-2~A-4 결과:
- **0행 (예상)** → D-pre.6 범위 그대로 진행 (users_role_check + board.html만)
- **1행 이상 (추가 발견)** → 즉시 멈춰 보고. D-pre.6 범위 확장 vs D-pre.7 분리 결정 필요

---

## 4. § 4 질문 3 답변 — board.html 라인 2213 정정 옵션

### 4.1 결론

**AI 추천 (가) RLS 정합 채택 ⭐ 강력 동의.** (나)는 너무 광범위, (다)는 너무 좁음.

### 4.2 옵션 3안 비교 (실 코드 raw 검증 후)

| 옵션 | 사양 | 정합성 | 위험 |
|---|---|---|---|
| **(가) RLS 정합** ⭐ | `['admin', 'insurer_branch_manager', 'insurer_manager', 'insurer_member', 'insurer_staff']` (5키) | RLS `posts.insurer_board_insert` 정합 1:1 (어제 § 5 변경 매핑) | 0 |
| (나) ROLE_LABEL 참조 | `Object.keys(window.ROLE_LABEL).includes(s.role)` 또는 9키 모두 | **너무 광범위** — `ga_*` 4종까지 보험사 게시판 작성 허용. RLS와 비정합 (RLS는 ga_* 거부) | RLS 거부로 작성 시 즉시 alert 안 뜨고 INSERT 후 RLS 거부 — UX 나쁨 |
| (다) 라인 2225 정합 본 | `['ga_branch_manager', 'ga_manager', 'insurer_branch_manager', 'insurer_manager']` (매니저급 4키) | 라인 2225는 displayName 분기(회사명 표시)로 매니저급에 한정. **작성 권한과 다른 의미** | 어제 결정 4 (insurer_* 4종 모두 허용)와 비정합 |

### 4.3 같은 파일 라인 2225와 정합 일관성

```js
// 라인 2225~2228 (어제 9역할 정합본)
} else if (board === 'insurer' && [
  'ga_branch_manager', 'ga_manager',
  'insurer_branch_manager', 'insurer_manager'
].includes(s.role)) {
  displayName = org.company || s.name || '보험회사';
}
```

→ 라인 2225는 **displayName 분기** (보험사 작성 시 본명 vs 회사명 표시) — 매니저급 4명에 한정 (회사명 표시 권한). 라인 2213은 **작성 권한 자체** (insurer_* 4종 모두 허용). **두 라인은 별개 의미라 정합 일관성 X.**

→ 라인 2213은 RLS와 정합 (insurer_* 4종 + admin), 라인 2225는 매니저급 표시 분기 그대로 유지.

### 4.4 변경 라인 수

```js
// 변경 전 (현재)
if (board === 'insurer' && !['admin', 'insurer'].includes(s.role)) {

// 변경 후 ((가) RLS 정합)
if (board === 'insurer' && ![
  'admin',
  'insurer_branch_manager','insurer_manager','insurer_member','insurer_staff'
].includes(s.role)) {
```

→ **1줄 → 4줄로 확장.** 가독성 위해 줄바꿈 권장. `s.role` 비교 자체는 동일 패턴. 함수 의미 100% 보존.

또는 한 줄 유지:
```js
if (board === 'insurer' && !['admin','insurer_branch_manager','insurer_manager','insurer_member','insurer_staff'].includes(s.role)) {
```

→ 어느 형식이든 무방. 가독성 우선이면 4줄, 단일성 우선이면 1줄.

### 4.5 추천

**(가) RLS 정합, 줄바꿈 4줄 형식.** RLS와 1:1 정합 + 가독성.

---

## 5. § 5 질문 4 답변 — INSERT 시뮬레이션 범위 (AI 추천 (a) 9역할 모두)

### 5.1 결론

**AI 추천 (a) 9건 → 거부.** 부담 + 사고 위험 + RLS 우회 복잡 + 대안 충분.

→ **Code 추천: 시뮬레이션 0건.** 대신 **(c) pg_constraint 정의 raw 비교 + admin row CHECK 통과 검증**으로 충분.

### 5.2 거부 사유 4건

#### 5.2.a RLS 우회 복잡 (Default Deny 추정)

`docs/architecture/db_pre_migration_capture_20260501.md` § 3 + `db_schema_20260501.md` § 3 = **users 테이블 RLS 정책 4건** 중 INSERT 정책 명시 0건.

- PostgreSQL Default Deny — INSERT 정책 미정의 시 비-superuser INSERT 차단
- handle_new_user 트리거가 SECURITY DEFINER (`role_migration_plan.md` 라인 19, 132 raw) → **트리거를 통한 INSERT는 RLS 우회**
- 직접 INSERT (트리거 외부)는 RLS 적용 → **CHECK 위반 검증 전에 RLS 거부**
- service_role 권한(Supabase Dashboard SQL Editor)이면 RLS 우회 가능 → **CHECK 위반 정확 검증**

→ Chrome 에이전트가 Dashboard SQL Editor에서 service_role 권한으로 실행하면 가능하나, **CHECK constraint 정합 검증에 RLS 우회 권한 사용은 부담 큼**.

#### 5.2.b 9건 ROLLBACK 누락 위험

```sql
BEGIN;
INSERT INTO public.users (id, email, role, plan)
VALUES (gen_random_uuid(), 'sim_admin@test.com', 'admin', 'free');
-- 검증 SELECT
SELECT count(*) FROM public.users WHERE email = 'sim_admin@test.com';
-- 의도: 1행 (admin은 9키 통과)
ROLLBACK;
```

- 9건 각각 BEGIN/INSERT/SELECT/ROLLBACK 패턴
- ROLLBACK 누락 시 시뮬레이션 row 잔존 → admin 1명 환경 깨짐
- 9역할 각각 다른 email + 필수 컬럼(name, plan, status) 채우기 필요
- **부담 대비 검증 효과 낮음**

#### 5.2.c CHECK constraint은 ALTER 자체로 검증

`ALTER TABLE ADD CONSTRAINT ... CHECK (...)` 실행 시:
- PostgreSQL이 **모든 기존 행에 대해 CHECK 검증**
- admin 1행이 통과 못하면 **ALTER 자체 ERROR** (즉시 실패 + 자동 롤백)
- → ALTER 성공 = admin row 통과 자동 보장

→ **ALTER 성공 자체가 admin CHECK 통과 검증.** 추가 시뮬레이션 불요.

#### 5.2.d 9키 정합은 정의 raw 비교로 100% 검증

```sql
-- D-pre.5 Step C-2와 동일 패턴
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.users'::regclass
  AND conname = 'users_role_check';

-- 기댓값:
-- definition: CHECK ((role = ANY (ARRAY[
--   'admin', 'ga_branch_manager', 'ga_manager', 'ga_member', 'ga_staff',
--   'insurer_branch_manager', 'insurer_manager', 'insurer_member', 'insurer_staff'
-- ])))
```

→ 9키 raw 비교 = 100% 검증.

### 5.3 더 안전한 대안

| 검증 | 방식 | 비용 | 효과 |
|---|---|:---:|:---:|
| 9키 정의 정합 | pg_constraint definition raw 비교 | 0 | ⭐⭐⭐ |
| admin CHECK 통과 | ALTER 성공 자체 + admin row SELECT | 0 | ⭐⭐⭐ |
| 9역할 INSERT 통과 시뮬레이션 9건 | BEGIN/INSERT/ROLLBACK + service_role 우회 | 큼 | ⭐ (3·4와 중복) |

→ **시뮬레이션 거부, 정의 raw + ALTER 성공으로 충분.**

### 5.4 D-1로 미루는 별 트랙 옵션

작업지시서 § 의뢰 시 "더 안전한 대안" 검토:
- D-1 작업 시 admin_v2 "+ 신규 사용자" 액션 도입 시점 = 9역할 INSERT 첫 시도
- 그때 admin_v2 D-1 작업지시서에 "9역할 INSERT 1건 검증" 명시 (미리 시뮬레이션 안 해도 자연 검증)

→ **D-1로 미룸**도 선택지. 본 D-pre.6 범위 단순화 우선.

---

## 6. § 6 질문 5 답변 — 분담 (AI 추천 (a) D-pre.5와 동일)

### 6.1 결론

**AI 추천 (a) D-pre.5와 동일 분담 동의.** 단 D-pre.5 학습 3건 적용.

### 6.2 D-pre.5 학습 적용 3건

#### 6.2.a 작업지시서 § 잘림 패턴 4번 반복 → Code 자유 작성 표준화

D-pre.5 작업 중 § 4 산출물 형식 / § 7 절대 원칙 / § 9 커밋 메시지 양식 / § 10 흐름도 등이 4회 잘려 발행됨. Code가 자유 작성으로 진행하는 패턴이 효과적이었음.

**제안:** 본 D-pre.6 작업지시서 발행 시 § 4 산출물 형식·§ 9 커밋 메시지 양식 등을 **자유 위임** 또는 **D-pre.5 패턴 100% 채택** 명시. 잘림 시 Code 즉시 자유 작성 진행.

#### 6.2.b Step B 분할 실행 표준 유지

D-pre.5 Step B-1·B-2 분할 실행 + 각 직후 검증 SELECT 묶음 패턴이 어제 C-4 부분 실행 사고 회피에 효과적이었음. **D-pre.6 Step B-1(DROP) / B-2(ADD)도 동일 분할 실행** 강조.

#### 6.2.c board.html 정정은 Code 직접 Edit 가능

D-pre.5에서 코드 변경 0건이었으나 D-pre.6은 board.html 1줄 변경 포함. Chrome 의뢰 불요 — **Code Edit 도구로 직접 정정** 가능.

→ 분담 재정의:

| 작업 | 주체 | 비고 |
|---|---|---|
| Step A SELECT 패키지 발행 | Code | 채팅 화면 코드블록 |
| Step A 4건 SQL 실행 + 결과 회신 | Chrome | Dashboard SQL Editor |
| Step B-1·B-2 SQL 패키지 발행 | Code | 분할 실행 + 검증 묶음 |
| Step B-1·B-2 분할 실행 + 결과 회신 | Chrome | Dashboard SQL Editor |
| **Step C board.html 라인 2213 1줄 정정** | **Code** | Edit 도구 직접 |
| Step D 사후 검증 SQL 패키지 + grep 검증 | Code + Chrome | Code Edit 후 grep / Chrome SQL |
| Step E 라이브 검증 4건+1건 (admin insurer 작성) | 팀장님 / Chrome | Chrome 직접 |
| Step F 롤백 SQL 보관 | Code | 캡처본 명문화 |
| Step G 캡처본 + _INDEX.md + 단일 커밋·푸시 | Code | board.html + 캡처본 + _INDEX.md 한 커밋 |

### 6.3 단일 커밋 묶음 권장

**커밋 1건에:**
- `pages/board.html` (라인 2213 4줄 변경)
- `docs/architecture/db_pre_dpre6_capture.md` (신설)
- `docs/sessions/_INDEX.md` (D-pre.6 행 ✅ 갱신)

→ 어제 G-3 결정과 동일 패턴. board.html 부분 정합 회귀 위험 0.

---

## 7. § 7 통합 추천 사양 (AI vs Code 비교표)

| # | 항목 | AI 추천 | Code 의견 | 일치 | 통합 사양 |
|:---:|---|---|---|:---:|---|
| **1** | 골격 단계 수 | 6단계 (A·B·C·D·E·F) | **7단계** (롤백 SQL § 신설) | △ | 7단계 채택 (Step F 롤백 + Step G 마무리) |
| **2** | Step A 범위 | (a) 전수 검색 | (a) 전수 검색 (동의) | ✅ | A-1~A-4 SQL 4건 + A-5 git Read = 5건 |
| **3** | Step B 분할 실행 | (명시 없음) | **분할 실행 명시** | △ | B-1 DROP / B-2 ADD 별도 코드블록 + 각 직후 검증 |
| **4** | Step B+C 단일 커밋 | (명시 없음) | **단일 커밋 묶음** | △ | DB ALTER + board.html + 캡처본 + _INDEX.md 한 커밋 |
| **5** | board.html 정정 옵션 | (가) RLS 정합 | (가) RLS 정합 (동의) | ✅ | `['admin','insurer_branch_manager','insurer_manager','insurer_member','insurer_staff']` 5키 |
| **6** | board.html 변경 형식 | (명시 없음) | **줄바꿈 4줄** | — | 가독성 우선 4줄 형식 |
| **7** | INSERT 시뮬레이션 범위 | (a) 9건 모두 | **거부 — 시뮬레이션 0건** | ❌ | pg_constraint 정의 raw 비교 + admin row 통과로 충분 |
| **8** | 분담 | (a) D-pre.5와 동일 | (a) 동일 + **board.html은 Code 직접 Edit** | △ | board.html은 Code Edit, 나머지 D-pre.5 패턴 |
| **9** | 라이브 검증 추가 1건 | insurer 게시판 회귀 | **admin이 insurer 게시판 작성 시도 + 검증 후 삭제** | △ | admin 작성 → posts INSERT 성공 → 라이브 게시 확인 → admin 직접 삭제 |
| **10** | 롤백 SQL 보관 | (명시 없음) | **명시 권장** | △ | DROP + ADD 5역할 5키 복구 SQL 명문화, 자동 실행 금지 |

→ **AI vs Code 일치 2건 (#2, #5), Code 보강 7건, Code 반박 1건 (#7).**

---

## 8. § 8 D-pre.6 실행 작업지시서 골격 (확정 사양 기반)

```
# 작업지시서: D-pre.6 실행 — users_role_check 9역할 정합 + board.html 라인 2213 정정

§ 0 큰 그림 정합성 검증 4항목
  1. _INDEX.md Phase D 세부 단계 표 D-pre.6 행 = 🟡 작업지시서 대기 상태인지
  2. d-pre6-spec-analysis.md 산출물 존재 + 통합 사양 § 7 100% 준수
  3. D-pre.5 정상 종료 (커밋 87a5906) 유지
  4. role-definition-audit-2026-05-02.md (커밋 1365c55) 발견 사항 일치

§ 1 확정 사양
  - users_role_check: DROP + ADD CONSTRAINT 9키 (admin + ga_* 4종 + insurer_* 4종)
  - board.html 라인 2213: 5키 형식 (admin + insurer_* 4종) 줄바꿈 4줄
  - INSERT 시뮬레이션: 거부 (정의 raw 비교 + ALTER 성공으로 충분)
  - Step B + Step C 단일 커밋 묶음

§ 2 작업 목적
  - 출시 차단 위험 해소 (users_role_check 5역할 잔존)
  - insurer 입점 시 보험사 게시판 작성 사고 회피 (board.html 2213)
  - D-pre 누락 영역 전수 일거 검증 (Step A 4 SELECT)

§ 3 Step A — 사전 검증 SELECT 5건 (DB 변경 전 raw 캡처)
  A-0 신버전 DB 재확인 (current_database)
  A-1 users_role_check 현재 정의 raw (변경 직전 캡처)
  A-2 다른 테이블 CHECK constraint 5역할/insurer 잔존
  A-3 RLS 정책 본문 5역할/insurer 잔존
  A-4 함수 본문 5역할/insurer 잔존 (handle_new_user 외)
  A-5 board.html 라인 2213 git Read 캡처

§ 4 Step B — DB 변경 (DROP + ADD 분할 실행)
  B-1. ALTER TABLE DROP CONSTRAINT users_role_check
       + 직후 검증 SELECT (pg_constraint에 0건)
  B-2. ALTER TABLE ADD CONSTRAINT users_role_check 9키
       + 직후 검증 SELECT (정의 raw + admin row 통과)
  ※ B-1·B-2 별도 코드블록 분리 발행 + B-1 통과 후에만 B-2

§ 5 Step C — 코드 변경 (Code 직접 Edit)
  C-1. pages/board.html 라인 2213 (Edit 도구 직접)
       변경 전: !['admin', 'insurer'].includes(s.role)
       변경 후: ![
         'admin',
         'insurer_branch_manager','insurer_manager','insurer_member','insurer_staff'
       ].includes(s.role)
  C-2. grep 재확인 — 5역할/insurer 단일 키 잔존 0건

§ 6 Step D — 사후 검증 SELECT 3건
  D-1. users_role_check 정의 9키 raw 검증
  D-2. admin row CHECK 통과 (SELECT email,role)
  D-3. board.html 정정 후 git diff 검증

§ 7 Step E — 라이브 검증 5건
  E-1~E-4. D-pre.5와 동일 (로그인 / AppState / admin_v2 / 5종 톤)
  E-5. admin이 insurer 게시판 글 작성 → posts INSERT 성공 → 게시 확인 → admin 직접 삭제

§ 8 Step F — 롤백 SQL 보관 (자동 실행 금지)
  F-1. ALTER TABLE DROP CONSTRAINT users_role_check
  F-2. ALTER TABLE ADD CONSTRAINT users_role_check 5키 복구 (admin/branch_manager/manager/member/insurer)
  F-3. board.html 라인 2213 복구 (git revert 또는 Edit)

§ 9 Step G — 산출물 + 단일 커밋·푸시
  - docs/architecture/db_pre_dpre6_capture.md 신설 (§ 1~§ 5 raw + § 6 라이브 + § 7 롤백)
  - pages/board.html 1곳 변경
  - docs/sessions/_INDEX.md D-pre.6 행 ✅ 갱신
  - 단일 커밋: docs(d-pre6): users_role_check 9역할 정합 + board.html 라인 2213 정정

§ 10 절대 원칙
  - DB 변경: ALTER 2건만 (DROP + ADD CONSTRAINT)
  - 코드 변경: pages/board.html 1곳만 (라인 2213)
  - admin_v2.html / app.html / auth.js / db.js 변경 0건
  - pricing.html 자체 ROLE_LABEL 폐기 별 트랙 (D-pre.6 범위 외)
  - app.html B-4 3곳 별 트랙 (D-pre.6 범위 외)
  - INSERT 시뮬레이션 미실시 (정의 raw + ALTER 성공으로 검증)

§ 11 완료 조건
  1. § 0번 정합성 검증 4항목 통과
  2. Step A 사전 검증 5건 raw 저장
  3. Step B-1·B-2 분할 실행 통과
  4. Step C board.html Edit + grep 재확인
  5. Step D 사후 검증 3건 통과
  6. Step E 라이브 검증 5건 모두 ✅
  7. Step F 롤백 SQL 명문화
  8. _INDEX.md D-pre.6 행 ✅ 갱신
  9. 단일 커밋 + origin/main 푸시
  10. 팀장님 검토 대기 상태로 종료
```

---

## 9. § 9 리스크 / 미해결 질문

### 9.1 리스크

| # | 리스크 | 영향 | 완화 |
|:---:|---|---|---|
| **R1** | Step A에서 추가 5역할 잔존 발견 시 D-pre.6 범위 확장 | 작업 시간 1세션 → 1.5세션 | A-2~A-4 결과 0행 가정. 1행 이상이면 즉시 멈춰 보고 후 D-pre.7 분리 결정 |
| **R2** | DROP CONSTRAINT 후 ADD CONSTRAINT 사이 시간차에 9역할 가입 시도 | 신규 가입 0건 가정으로 위험 0 | 분할 실행 + 5분 내 완료. admin 1명만 있어 신규 가입 발생 가능성 0 |
| **R3** | board.html Edit 후 라이브 자동 배포 시간차 | 4분 (GitHub Pages) | 단일 커밋 묶음 + 푸시 직후 라이브 검증 (Step E) |
| **R4** | Step E "admin insurer 작성 + 삭제" 시 posts row 잔존 | 시뮬레이션 글 라이브 노출 | 작성 → 게시 확인 → 즉시 삭제. 또는 작성 본문에 "[D-pre.6 회귀 검증, 삭제 예정]" 표시 |
| **R5** | INSERT 시뮬레이션 거부 → 9역할 가입 거동 검증 부재 | 가입 폼 경유 첫 사고 시 발견 | D-1 admin_v2 "+ 신규 사용자" 액션 도입 시 검증 자연 발생. 또는 별 트랙 시뮬레이션 |

### 9.2 미해결 질문 (팀장님 결정 필요)

| # | 질문 | 옵션 |
|:---:|---|---|
| 1 | Step E E-5 admin insurer 작성 글 본문 | **(a) "[D-pre.6 회귀 검증]" 표시 후 삭제** ⭐ / (b) 즉시 삭제 / (c) DB SQL ROLLBACK |
| 2 | D-pre.6 진행 시점 | **(a) 5/2 같은 세션 내 즉시** ⭐ / (b) 분리 세션 |
| 3 | INSERT 시뮬레이션 | **(a) 거부 (Code 추천)** ⭐ / (b) D-1로 이월 / (c) 별 트랙 시뮬레이션 |
| 4 | board.html 변경 형식 | **(a) 줄바꿈 4줄 (가독성)** ⭐ / (b) 1줄 유지 (단일성) |
| 5 | Step B + Step C 단일 커밋 | **(a) 단일 커밋** ⭐ / (b) DB 커밋·코드 커밋 분리 |

---

## 10. 변경 이력

| 시각 | 변경 |
|---|---|
| 2026-05-02 (오후) | 신설 — D-pre.6 작업지시서 사양 분석. AI 추천 6단계 → Code 추천 7단계 (롤백 SQL § 신설 + 분할 실행 + 단일 커밋 + 시뮬레이션 거부). 통합 추천 사양 10행 표 + 미해결 질문 5건. 팀장님 결정 대기. |

---

*본 산출물은 admin_v2.html / app.html / auth.js / db.js / DB / pages/board.html 변경 모두 0건. information_schema·pg_constraint·pg_policies·pg_proc SELECT 미실행 (Chrome 회신본 + git 코드베이스 직접 grep만). 분석·의견 제시만.*
