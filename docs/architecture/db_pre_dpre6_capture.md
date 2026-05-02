# D-pre.6 마이그레이션 캡처본 — 2026-05-02

> **작업 분류:** users_role_check 9역할 정합 + activity_logs RLS 정책 2건 9역할 정합 + board.html 라인 2213 1줄 정정
> **상태:** 🟡 Step A 완료 (raw 캡처) → Step B 진행 중 → Step C·D·E·F·G 골격
> **신버전 DB 검증:** 프로젝트 ID `pdnwgzneooyygfejrvbg` (`onesecond-v1-restore-0420`) ✅
> **사양 출처:** `docs/specs/d-pre6-spec-analysis.md` (커밋 `8ab03cf`) § 7 통합 사양 — Code 추천 5결정 전면 채택
> **선행 산출물:** `docs/specs/role-definition-audit-2026-05-02.md` (커밋 `1365c55`) / `docs/architecture/db_pre_dpre5_capture.md` (커밋 `87a5906`까지) / `docs/architecture/db_pre_migration_capture_20260501.md` (5/1 D-pre Step C 직전 raw)
> **캡처 출처:** Claude in Chrome agent SQL Editor 직접 실행 결과 (Supabase Dashboard).
> **CLAUDE.md 절대 원칙 준수:** admin_v2.html / app.html / auth.js / db.js 변경 모두 0건. board.html 변경은 Step C 시점에만.

---

## 0. 메타

### 0.1 작업 범위 (D-pre.6 (A) 확장 결정 반영)

| Step | 작업 | 상태 |
|:---:|---|:---:|
| A | 사전 검증 SELECT 5건 (A-0~A-4) + A-5 board.html git Read | ✅ 완료 |
| B-1 | `ALTER TABLE DROP CONSTRAINT users_role_check` | 🟡 진행 중 |
| B-2 | `ALTER TABLE ADD CONSTRAINT users_role_check` 9키 | 대기 |
| B-3 | `DROP+CREATE POLICY activity_logs_select_branch_manager` 9역할 (D-pre Step C-4-a 사고 재정합) | 대기 |
| B-4 | `DROP+CREATE POLICY activity_logs_select_manager` 9역할 (D-pre Step C-4-b 사고 재정합) | 대기 |
| C-1 | `pages/board.html` 라인 2213 정정 (Code Edit 줄바꿈 4줄) | 대기 |
| D | 사후 검증 SELECT (CHECK + RLS 2건 + board.html grep) | 대기 |
| E | 라이브 검증 5건 (E-1~E-4 + E-5 admin insurer 작성→삭제) | 대기 |
| F | 롤백 SQL 보관 | 대기 |
| G | 단일 커밋·푸시 (board.html + 캡처본 + _INDEX.md) | 대기 |

### 0.2 5결정 전면 채택 (`d-pre6-spec-analysis.md` § 7 통합 사양)

| # | 결정 | 확정값 |
|:---:|---|---|
| 1 | INSERT 시뮬레이션 | (a) 거부 — 0건. ALTER + 정의 raw 비교 + admin row 통과로 충분 |
| 2 | 진행 시점 | (a) 5/2 같은 세션 즉시 |
| 3 | board.html 형식 | (a) 줄바꿈 4줄 |
| 4 | Step B+C 단일 커밋 | (a) 단일 커밋 묶음 |
| 5 | E-5 라이브 검증 | (a) admin이 "[D-pre.6 회귀 검증]" 표시 후 삭제 |

---

## 1. Step A — 사전 검증 결과 raw (DB 변경 전)

### 1.0 신버전 DB 재확인 (A-0)

| db | usr |
|---|---|
| `postgres` | `postgres` |

✅ 신버전(`pdnwgzneooyygfejrvbg`) 진입 확인.

### 1.1 users_role_check 현재 정의 raw (A-1)

| conname | definition |
|---|---|
| `users_role_check` | `CHECK ((role = ANY (ARRAY['admin'::text, 'branch_manager'::text, 'manager'::text, 'member'::text, 'insurer'::text])))` |

✅ 1행 (5역할 5키) — D-pre.5 Step C-2 결과와 동일. 변경 직전 raw 캡처 완료.

### 1.2 다른 테이블 CHECK constraint 잔존 검색 (A-2)

| schema_name | table_name | conname | definition |
|---|---|---|---|
| public | users | `users_role_check` | (A-1과 동일) |

✅ 1행 (`users_role_check`만 — 본 변경 대상). 다른 테이블 CHECK constraint 추가 부채 0건. R5 영역 해소.

### 1.3 RLS 정책 5역할 단일 키 잔존 검색 (A-3) ⚠️ 부채 2건 발견

| schemaname | tablename | policyname | cmd | qual (요약) | with_check |
|---|---|---|---|---|---|
| public | activity_logs | `activity_logs_select_branch_manager` | SELECT | `... me.role = 'branch_manager'::text AND target.branch = me.branch ...` | NULL |
| public | activity_logs | `activity_logs_select_manager` | SELECT | `... me.role = 'manager'::text AND target.team = me.team AND target.role = 'member'::text ...` | NULL |

**raw qual (1번):**
```sql
EXISTS (
  SELECT 1
  FROM (users me JOIN users target ON ((target.id = activity_logs.user_id)))
  WHERE ((me.id = auth.uid())
     AND (me.role = 'branch_manager'::text)
     AND (target.branch = me.branch))
)
```

**raw qual (2번):**
```sql
EXISTS (
  SELECT 1
  FROM (users me JOIN users target ON ((target.id = activity_logs.user_id)))
  WHERE ((me.id = auth.uid())
     AND (me.role = 'manager'::text)
     AND (target.team = me.team)
     AND (target.role = 'member'::text))
)
```

⚠️ **2행 발견. 어제 D-pre Step C-4-a / C-4-b가 미정착 상태.** § 1.A-3 특별 섹션에서 분석.

### 1.4 함수 본문 5역할 잔존 검색 (A-4)

`Success. No rows returned` (0행) ✅

→ handle_new_user 외 5역할 하드코딩 함수 부재. `current_user_role()`(4/20 db_full_reset.md 정의)도 4/24 노트 "부재" 명시 후 재생성 안 됨. R6 함수 영역 해소.

### 1.5 board.html 라인 2213 git Read (A-5) — Code 직접

```js
// pages/board.html 라인 2210~2216 (변경 직전 raw)
2210:  /* 보험사게시판 권한 체크 (프론트 방어) */
2211:  var s     = window.AppState || {};
2212:  var board = _currentBoard;
2213:  if (board === 'insurer' && !['admin', 'insurer'].includes(s.role)) {
2214:    alert('보험사게시판은 보험사 계정 또는 관리자만 작성할 수 있습니다.');
2215:    return;
2216:  }
```

→ Step C-1 변경 대상 라인 확정. 라인 2213 한 곳 (5키 5역할 → 5키 9역할 줄바꿈 4줄). 라인 2214~2216 alert·return 보존.

### 1.6 Step A 종합 판정

| # | 항목 | 결과 | 판정 |
|:---:|---|---|:---:|
| A-0 | 신버전 DB | postgres / postgres | ✅ |
| A-1 | users_role_check 정의 | 1행 (5역할 5키) | ✅ 변경 직전 raw |
| A-2 | 다른 테이블 CHECK | 1행 (users_role_check만) | ✅ 추가 부채 0 |
| A-3 | RLS 5역할 잔존 | **2행** | ⚠️ **D-pre.6 (A) 확장 결정으로 B-3·B-4 추가** |
| A-4 | 함수 5역할 잔존 | 0행 | ✅ |
| A-5 | board.html 라인 2213 | 5역할 + 'insurer' 5키 | ⚠️ Step C-1 변경 대상 |

---

## 1.A-3 (특별 섹션) 어제 D-pre Step C-4 사고 재발견 + 정의 raw 검증 누락 분석

### 1.A-3.1 사고 발견 경위

5/2 D-pre.6 Step A의 정의 raw 비교(`pg_policies` qual·with_check)에서 `activity_logs_select_branch_manager` / `activity_logs_select_manager` 두 정책의 qual이 **5역할 단일 키 그대로** 잔존 확인.

**비교 대상 데이터 4건:**

1. **어제 D-pre 캡처본 (5/1 21:00 시점) § 3.1 · § 3.2 raw** — 5역할 정의 (마이그레이션 직전)
2. **어제 캡처본 § 5 변경 매핑 표** — Step C-4 후 9역할 정정 명시
3. **5/1 22:57 세션 노트 라인 42** — "C-4 RLS 정책 5건 재작성 — 분할 재실행으로 완주"
4. **5/2 D-pre.6 Step A-3 결과** — 5역할 정의 그대로 잔존

→ **(1) ≡ (4)** 비교: 100% 동일. 즉 어제 (5/1) Step C-4-a / C-4-b가 **실 DB에 적용 안 된 채로** 마이그레이션이 종료됨. (2)·(3)의 "정정 완료/완주" 표시는 **잘못된 보고**.

### 1.A-3.2 사고 가설 3안

| # | 가설 | 검증 가능성 | 추정 |
|:---:|---|:---:|---|
| (i) DROP만 실행되고 CREATE 누락 | 정책 미존재로 검증 가능 | ❌ Step A-3에서 정책이 존재 → 가설 무효 |
| (ii) DROP+CREATE 모두 미실행 → 어제 SUCCESS 메시지가 잘못 회신됨 | 어제 SUCCESS 메시지 raw 부재 | 가능 |
| (iii) 분할 실행 시 다른 정책 5건과 헷갈려 activity_logs 2건만 미실행 | 어제 분할 실행 SQL 패키지 raw 부재 | 가능 |

→ **(ii) 또는 (iii) 추정.** 정확한 원인은 어제 Chrome 분할 재실행 시점의 SQL · 응답 raw 부재로 결정 불가.

### 1.A-3.3 근본 원인 — 정의 raw 검증 누락

가설과 무관하게 **확정된 사실**: 어제 Step C-4 직후 **정책 본문 정의 raw 비교 검증이 누락됐다.**

| 검증 단계 | 어제 5/1 | 5/2 D-pre.6 | 차이 |
|---|---|---|:---:|
| SUCCESS 메시지 확인 | ✅ | ✅ | — |
| 정책명 존재 확인 (`SELECT policyname FROM pg_policies WHERE ...`) | ✅ (추정) | ✅ | — |
| **qual·with_check 정의 raw 비교 (`pg_policies` 본문 인용 9역할 키 검증)** | ❌ **누락** | ✅ | **결정적 차이** |
| 정의에 5역할 단일 키 0건 grep | ❌ 누락 | ✅ | 결정적 차이 |

→ 어제 검증은 **"정책이 존재하느냐"** 수준에서 멈춤. 정책 존재 ≠ 정합 정착. **9역할 정의 적용 여부는 본문 raw 비교만이 검증** = 어제 누락한 검증.

### 1.A-3.4 향후 정합 검증 표준 채택

`role-definition-audit-2026-05-02.md` § 4.1·§ 4.2 누락 방지 체크리스트에 다음 표준 추가 명문화:

```
□ DB 마이그레이션 후 정합 검증은 다음 3단계 모두 필수:
  (1) ALTER/CREATE/DROP SUCCESS 메시지 확인
  (2) 대상 객체 존재/부재 확인
  (3) ⭐ 정의 raw 비교 (pg_get_constraintdef / pg_policies.qual / pg_get_functiondef
      본문 인용) — 5역할 단일 키 0건 grep + 9역할 키 명시 정합

(1)+(2)만으로 "정합 완료" 판정 금지. (3)이 누락되면 어제 C-4 사고 재발 위험.
```

본 D-pre.6는 (3)을 Step A·D 모두 적용 — 어제 사고 회피 패턴 표준화.

### 1.A-3.5 5/1 22:57 세션 노트 정정 결정

팀장님 결정 (본 의뢰 § 1): **세션 노트 정정 안 함.** 시간 역순 보고서 보존 — 5/1 22:57 시점에는 "분할 재실행으로 완주"로 잘못 보고된 상태였다는 사실 자체가 학습 자료. D-pre.6 캡처본 본 § 1.A-3에 사고 재발견 명문화로 충분.

---

## 2. Step B — 마이그레이션 실행 기록 (DB 변경)

> 🟡 **실행 대기.** Chrome 에이전트가 Step B-1·B-2·B-3·B-4 4단계 분할 실행 + 각 직후 검증 SELECT 통과 확인 후 다음 진행. 본 절은 raw 결과로 채움.

### 2.1 B-1. DROP CONSTRAINT users_role_check

```sql
ALTER TABLE public.users DROP CONSTRAINT users_role_check;
```

**실행 결과:** _(대기 중)_
**B-1 직후 검증:** _(대기 중 — pg_constraint에서 users_role_check 0행)_

### 2.2 B-2. ADD CONSTRAINT users_role_check 9키

```sql
ALTER TABLE public.users
ADD CONSTRAINT users_role_check
CHECK (role = ANY (ARRAY[
  'admin'::text,
  'ga_branch_manager'::text,
  'ga_manager'::text,
  'ga_member'::text,
  'ga_staff'::text,
  'insurer_branch_manager'::text,
  'insurer_manager'::text,
  'insurer_member'::text,
  'insurer_staff'::text
]));
```

**실행 결과:** _(대기 중)_
**B-2 직후 검증 1:** _(정의 raw 9키 정합)_
**B-2 직후 검증 2:** _(admin row CHECK 통과)_

### 2.3 B-3. activity_logs_select_branch_manager 9역할 정합

```sql
DROP POLICY activity_logs_select_branch_manager ON public.activity_logs;

CREATE POLICY activity_logs_select_branch_manager
ON public.activity_logs
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users me
    JOIN users target ON target.id = activity_logs.user_id
    WHERE me.id = auth.uid()
      AND me.role IN ('ga_branch_manager', 'insurer_branch_manager')
      AND target.branch = me.branch
  )
);
```

**실행 결과:** _(대기 중)_
**B-3 직후 검증:** _(qual에 9역할 키 명시 + 5역할 단일 키 0건)_

### 2.4 B-4. activity_logs_select_manager 9역할 정합

```sql
DROP POLICY activity_logs_select_manager ON public.activity_logs;

CREATE POLICY activity_logs_select_manager
ON public.activity_logs
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users me
    JOIN users target ON target.id = activity_logs.user_id
    WHERE me.id = auth.uid()
      AND me.role IN ('ga_manager', 'insurer_manager')
      AND target.team = me.team
      AND target.role IN ('ga_member', 'insurer_member')
  )
);
```

**실행 결과:** _(대기 중)_
**B-4 직후 검증:** _(qual에 9역할 키 명시 + 5역할 단일 키 0건)_

### 2.5 B-4 staff 미포함 사유 명문화

어제 캡처본 § 5 변경 매핑 표 (5/1 시점 어제 D-pre 결정):

| 정책 | 어제 정정 후 사양 |
|---|---|
| activity_logs_select_manager | `me.role IN ('ga_manager','insurer_manager')` AND `target.role IN ('ga_member','insurer_member')` |

→ **`ga_staff` / `insurer_staff` 모두 미포함.** 어제 D-pre 결정 정합. 사유:
- `me.role` (주체) — 매니저(실장) 직급만 권한 (staff 직급은 부하 활동 로그 조회 권한 없음)
- `target.role` (대상) — 매니저가 관리하는 멤버(설계사)만 (staff는 매니저 계열 부하가 아니라 별도 역할군)
- staff 직급의 활동 로그 조회 권한이 별도로 정의돼야 한다면 v1.1 별 트랙 결정

→ **본 D-pre.6 B-4는 어제 사양 그대로 9역할 정합** (manager 2종 + member 2종 = 4키).

---

## 3. Step C — 코드 변경 (Code 직접 Edit)

> 🟡 **실행 대기.** Step B-4 통과 후 Code가 `pages/board.html` 라인 2213 직접 Edit. 본 절은 변경 후 git diff raw로 채움.

### 3.1 변경 대상

| 파일 | 라인 | 변경 |
|---|:---:|---|
| `pages/board.html` | 2213 | 1라인 → 4라인 (줄바꿈 4줄 형식) |

### 3.2 변경 사양 (사전 정렬)

```js
// 변경 전 (현재)
if (board === 'insurer' && !['admin', 'insurer'].includes(s.role)) {

// 변경 후 (Code Edit 후)
if (board === 'insurer' && ![
  'admin',
  'insurer_branch_manager','insurer_manager','insurer_member','insurer_staff'
].includes(s.role)) {
```

→ 어제 결정 4 (RLS `posts.insurer_board_insert` 정합) + 본 분석 § 4.1 (가) RLS 정합 결정. admin + insurer_* 4종 = 5키.

### 3.3 변경 후 검증

_(대기 중 — git diff + grep으로 5역할 단일 키 0건)_

---

## 4. Step D — 사후 검증 SELECT (DB 변경 후 raw 캡처)

> 🟡 **실행 대기.** Step C 완료 후 4건 검증.

### 4.1 D-1. users_role_check 9키 정합 raw 검증

_(대기 중)_

### 4.2 D-2. admin row CHECK 통과

_(대기 중 — admin email/role 1행 정상)_

### 4.3 D-3. activity_logs RLS 정책 2건 9역할 정합 raw 검증

_(대기 중)_

### 4.4 D-4. board.html 정정 후 git diff + grep 검증

_(대기 중 — `'admin', 'insurer'` 단일 키 0건)_

---

## 5. Step E — 라이브 검증 (회귀 0 확인)

> 🟡 **실행 대기.** Step D 통과 후 팀장님 직접 검증.

| F | 검증 항목 | 결과 |
|:---:|---|:---:|
| E-1 | 로그인 정상 진입 | _(대기)_ |
| E-2 | admin AppState 5건 정상 출력 | _(대기)_ |
| E-3 | admin_v2 풀스크린 진입 | _(대기)_ |
| E-4 | 5종 톤 토글 정상 동작 | _(대기)_ |
| E-5 | admin이 "[D-pre.6 회귀 검증]" 보험사 게시판 작성 → posts INSERT 성공 → 게시 확인 → admin 직접 삭제 | _(대기)_ |

---

## 6. Step F — 롤백 SQL 보관 (자동 실행 금지)

> ⚠️ **자동 실행 금지.** Step E 회귀 발견 시 또는 사용자 명시 지시 시에만 실행.

### 6.1 F-1. users_role_check 5역할 5키 복구

```sql
ALTER TABLE public.users DROP CONSTRAINT users_role_check;

ALTER TABLE public.users
ADD CONSTRAINT users_role_check
CHECK (role = ANY (ARRAY[
  'admin'::text,
  'branch_manager'::text,
  'manager'::text,
  'member'::text,
  'insurer'::text
]));
-- 단 admin row가 'admin'에 통과하므로 안전. 그러나 9역할 신규 가입 거부 사고 재발 위험 → 평시 사용 금지.
```

### 6.2 F-2. activity_logs_select_branch_manager 5역할 복구

```sql
DROP POLICY activity_logs_select_branch_manager ON public.activity_logs;

CREATE POLICY activity_logs_select_branch_manager
ON public.activity_logs
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users me
    JOIN users target ON target.id = activity_logs.user_id
    WHERE me.id = auth.uid()
      AND me.role = 'branch_manager'::text
      AND target.branch = me.branch
  )
);
```

### 6.3 F-3. activity_logs_select_manager 5역할 복구

```sql
DROP POLICY activity_logs_select_manager ON public.activity_logs;

CREATE POLICY activity_logs_select_manager
ON public.activity_logs
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users me
    JOIN users target ON target.id = activity_logs.user_id
    WHERE me.id = auth.uid()
      AND me.role = 'manager'::text
      AND target.team = me.team
      AND target.role = 'member'::text
  )
);
```

### 6.4 F-4. board.html 라인 2213 복구

`git revert` 또는 Code Edit으로 변경 전 1줄 형식 복구.

```js
if (board === 'insurer' && !['admin', 'insurer'].includes(s.role)) {
```

### 6.5 롤백 부수 효과

- F-1·F-2·F-3 모두 DB 변경. F-4는 코드 변경
- 데이터 손실 0 (admin row 보존)
- 9역할 신규 가입 100% 거부 사고 재발 위험으로 **평시 사용 금지**

---

## 7. 안전망 조합 (3중 방어, D-pre.5 패턴 정합)

| 단계 | 안전망 | 회복 시간 |
|:---:|---|---|
| 🛡️ 1차 | § 6 Step F 롤백 SQL (단계별 명시) | 즉시 (DB 3건 + 코드 1건) |
| 🛡️ 2차 | 본 캡처본 (§ 1·§ 2·§ 3·§ 4 raw + 어제 캡처본 § 3.1·§ 3.2 raw) | ~10분 (수동 SQL 재작성) |
| 🛡️ 3차 | Daily 백업 (5/2 02:14 추정 시점) | ~30분 (Dashboard 복원) |

**비용:** $0 (PITR $111/월 회피, 어제 D-pre 결정 정합).

---

*본 캡처본은 D-pre.6 마이그레이션 단일 진실 원천. § 1·1.A-3 채움 + § 2·3·4·5 골격. Step B 결과 회신 받으면 § 2 raw 채움, Step C 직후 § 3 채움, Step D·E 후 § 4·5 채움.*
