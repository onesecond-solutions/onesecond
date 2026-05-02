# role 정의 전수 감사 + 5역할 잔존 반복 원인 분석 — 2026-05-02

> **작업 분류:** D-pre.5 Step C 발견 사항(`users_role_check` 5역할 잔존) 계기로 한 **반복 원인 근본 분석 + role 정의 전수 확인**
> **상태:** 🟡 분석·진단·권고만. SQL 실행 / 코드 변경 0건. **팀장님 결정 대기.**
> **작성:** 2026-05-02 / Claude Code (직접 코드 grep + Chrome 회신본 raw 활용)
> **CLAUDE.md 절대 원칙 준수:** DB / admin_v2.html / app.html / auth.js / db.js 변경 모두 0건
>
> **🔄 산출물 통합 결정:** 직전 의뢰 `d-pre5-role-check-investigation.md`(작성 중단) → 본 산출물로 **통합 흡수**. 사유: 본 의뢰가 직전 의뢰의 상위 집합 — 반복 원인 분석 + role 전수 확인이라는 더 큰 큰 그림이 직전 4안 분석을 자연 흡수. 분리 시 중복 + 큰 그림 흐려짐.

---

## 0. 메타 + 의뢰 배경

### 0.1 팀장님 직접 질문 (인용)

> "이 오류가 계속 반복적으로 나타나고 있는데, 왜 반복되고 있는 건지 그리고 현재 role이 정확하게 어떻게 정의되고 있는지 확인해 달라."

### 0.2 반복 패턴 시각화 (시계열)

| 시점 | 사고 / 발견 | 영역 |
|---|---|---|
| 2026-04-20 | DB 전체 리셋 시 5역할 + 'insurer' 단일 키 정의 도입 (`current_user_role()` 함수 등) | DB 함수·정책 |
| 2026-04-30 | D-pre 사전 분석에서 **'insurer 죽은 정책'** 발견 (`posts insurer board insert`/`update`) | DB RLS |
| 2026-05-01 | D-pre Step A·B·C 마이그레이션: 함수·default·RLS 5건·14곳 코드 정정 — **CHECK constraint 누락** | DB CHECK |
| 2026-05-02 (오전) | D-pre.5 Step C에서 **`users_role_check` 5역할 잔존** 발견 (CHECK constraint) | DB CHECK |
| 2026-05-02 (오후, 본 산출물) | 추가 발견 — **`pages/board.html` 라인 2213 'insurer' 단일 키 잔존** (어제 코드 정합 18곳에서 누락) | 코드 |

→ **반복 패턴 명확.** 일회성 누락이 아니라 **검토 영역 자체에 사각지대가 있다**는 신호.

### 0.3 § 0번 정합성 검증 (통과 명문화)

| # | 검증 | 결과 |
|:---:|---|:---:|
| 1 | D-pre.5 Step C 4건 통과 + 발견 1건(`users_role_check`) 명문화 | ✅ |
| 2 | 본 작업이 반복 원인 분석 + role 전수 확인 분석임을 인지 | ✅ |
| 3 | 신버전 DB(`pdnwgzneooyygfejrvbg`) 기준 + 어제 캡처본·D-pre.5 Step A/B/C raw 활용 | ✅ |
| 4 | 직전 의뢰(d-pre5-role-check-investigation.md) → 본 산출물로 통합 흡수 (사유 명문화) | ✅ |

---

## 1. § 1 현재 role 전수 정의 — DB 영역

### 1.1 6항목 raw 매트릭스

| # | 영역 | 사용 키 | 분류 | 정합 | 출처 |
|:---:|---|---|---|:---:|---|
| **a** | `users.role` 컬럼 정의 | text / YES / default `'ga_member'::text` | 기본값 9역할 | ✅ | D-pre.5 Step A § 1.1 (5/2) |
| **b** | `users_role_check` CHECK constraint | `admin / branch_manager / manager / member / insurer` (5값) | ⚠️ **비표준 5역할** (`staff` 누락 + `insurer` 추가) | ❌ | D-pre.5 Step C § 1.2 (5/2) |
| **c** | `handle_new_user` 트리거 함수 IN 절 | `ga_*` 4종 + `insurer_*` 4종 = 8키 (admin 제외 옵션 B) + 폴백 `'ga_member'` | 9역할 (admin 메타 가입 차단) | ✅ | `role_migration_plan.md` Step C-1.5 SQL 적용 (5/1) |
| **d** | RLS 정책 5건 (어제 정정 대상) | activity_logs ×2 (`ga_branch_manager`+`insurer_branch_manager` / `ga_manager`+`insurer_manager`) + script_usage_logs ×1 (`admin`+`ga_branch_manager`+`insurer_branch_manager`) + posts ×2 (`admin`+`insurer_*` 4종) | 9역할 | ✅ | 어제 캡처본 § 5 변경 매핑 |
| **e** | 다른 테이블 CHECK constraint | (미확인 — pg_constraint 전수 SELECT 필요) | ⚠️ 미검증 | ⚠️ | § 6.3 추가 SELECT 6-A 필요 |
| **f** | 함수/트리거 5역할 하드코딩 잔존 (handle_new_user 외) | (미확인 — pg_proc 전수 grep SELECT 필요) | ⚠️ 미검증 | ⚠️ | § 6.3 추가 SELECT 6-C·6-D 필요 |

### 1.2 (b) `users_role_check` raw 본문 (Chrome 회신본 / D-pre.5 Step C)

```sql
CHECK ((role = ANY (ARRAY[
  'admin'::text,
  'branch_manager'::text,
  'manager'::text,
  'member'::text,
  'insurer'::text
])))
```

**관찰:**
- 5값이 5역할 표준(admin/branch_manager/manager/member/**staff**)도 아님 — `staff` 누락 + `insurer` 추가
- v1 초기 가설(2026-04-20 db_full_reset.md 라인 686 `current_user_role()` 함수 정의 시점) 잔재로 추정
- 어제 D-pre 산출물 4종(role_migration_plan.md / db_schema_20260501.md / db_pre_migration_capture_20260501.md / admin_v2_phase_d_pre.md) **어디에도 `users_role_check` 키워드 0건** — 검토 영역 자체에서 누락

### 1.3 (c) `handle_new_user` 함수 정정 후 IN 절 (`role_migration_plan.md` Step C-1.5)

```sql
IF v_role IS NULL OR v_role NOT IN (
  'ga_branch_manager','ga_manager','ga_member','ga_staff',
  'insurer_branch_manager','insurer_manager','insurer_member','insurer_staff'
) THEN
  v_role := 'ga_member';
END IF;
```

→ admin 제외 8키 허용 + 폴백 `'ga_member'`. **자기 정의는 9역할 정합이지만 직후 INSERT가 `users_role_check` 통과 못함** — 함수와 CHECK constraint 정의 충돌.

### 1.4 (d) RLS 정책 9역할 정정 후 (어제 캡처본 § 5 raw)

| 정책 | 정정 후 본문 (raw) |
|---|---|
| `activity_logs_select_branch_manager` | `me.role IN ('ga_branch_manager','insurer_branch_manager')` |
| `activity_logs_select_manager` | `me.role IN ('ga_manager','insurer_manager') AND target.role IN ('ga_member','insurer_member')` |
| `admin_branch_manager_read_logs` (구 `admin read logs`) | `role IN ('admin','ga_branch_manager','insurer_branch_manager')` |
| `insurer_board_insert` (구 `insurer board insert`) | `role IN ('admin','insurer_branch_manager','insurer_manager','insurer_member','insurer_staff')` |
| `insurer_board_update` (구 `insurer board update`) | (insert와 동일, 비대칭 해소) |
| `admin_update_all_users` (구 `admin update all`) | `EXISTS (...me.role='admin'...)` (진짜 admin만) |

→ 6건 모두 9역할 정합 ✅. 다른 RLS 정책에 5역할 잔존 가능성은 § 6.3 6-B 추가 SELECT 필요.

### 1.5 (e)·(f) 미검증 영역 — 추가 SELECT 4건 (D-pre.6 Step A에 묶음 권장)

§ 6.3에 SQL 패키지 명시. 결과로:
- 다른 테이블 CHECK constraint 잔존 (예상 0건)
- handle_new_user 외 함수에 5역할 하드코딩 (예: `current_user_role()` 함수 — 4/24 노트는 부재라 명시했으나 신버전 재검증)
- 트리거 등록 상태 (handle_new_user 외 트리거)

---

## 2. § 2 현재 role 전수 정의 — 코드 영역

### 2.1 6항목 raw 매트릭스

| # | 영역 | 파일·라인 | 사용 키 | 정합 |
|:---:|---|---|---|:---:|
| **a-1** | auth.js ROLE_LABEL fallback | `js/auth.js` 100~109 | 9역할 9키 | ✅ |
| **a-2** | auth.js `isFreeTier()` / `isManagerOrAbove()` | `js/auth.js` 76~85 | 9역할 5키 (admin + ga·insurer manager·branch_manager) | ✅ |
| **a-3** | auth.js `isAdmin()` | `js/auth.js` 95~97 | `admin` 단일 | ✅ |
| **a-4** | auth.js `isPro()` | `js/auth.js` 89~92 | `plan==='pro'` + `isFreeTier()` | ✅ |
| **b-1** | db.js `window.ROLE_LABEL` (단일 진실 원천) | `js/db.js` 126~136 | 9역할 9키 | ✅ |
| **b-2** | scripts-page.js | `js/scripts-page.js` 281 | `window.ROLE_LABEL[u.role]` 참조 | ✅ (자체 정의 폐기 완료) |
| **c-1** | admin_v2.html 칩 라벨 9개 | `pages/admin_v2.html` 1531~1540 | 9역할 한국어 라벨 | ✅ |
| **c-2** | admin_v2.html 테이블 셀 role 뱃지 (D-1) | `pages/admin_v2.html` 1571~1688 | 9역할 9개 모두 1행+ | ✅ |
| **c-3** | admin_v2.html status 뱃지 (D-pre.5 후) | `pages/admin_v2.html` 909~912 + 1574~1693 | 3종 (active/suspended/pending) + online 파생 | ✅ |
| **d** | **app.html B-4 (3곳 잔존)** | `app.html` 960·971·1000 | `['manager','branch_manager']` (라인 960) / `['admin','branch_manager']` (라인 971·1000) | ⚠️ **5역할 단일 키 잔존** |
| **e-1** | pricing-content.html 매니저 무료 분기 | `pages/pricing-content.html` 244~247 | 9역할 4키 (`ga_*`+`insurer_*` manager·branch_manager) | ✅ |
| **e-2** | **pricing.html 자체 ROLE_LABEL** | `pricing.html` 225~235 | 9역할 9키 — **단 자체 정의** | ⚠️ **중복 정의 (window.ROLE_LABEL과 별개)** |
| **e-3** | pricing.html `isFreeRole` 분기 | `pricing.html` 264~267 | 9역할 4키 (`ga_*`+`insurer_*` manager·branch_manager) | ✅ |
| **f-1** | **board.html 보험사 게시판 작성 권한 가드** | `pages/board.html` **2213** | `['admin', 'insurer']` | 🚨 **5역할 + 'insurer' 단일 키 잔존 — 신규 발견** |
| **f-2** | board.html displayName 분기 | `pages/board.html` 2225~2228 | 9역할 4키 (`ga_*`+`insurer_*` manager·branch_manager) | ✅ |
| **f-3** | board.html anonRow 분기 | `pages/board.html` 2060 | `['ga_member', 'insurer_member']` | ✅ |

### 2.2 ⚠️ 신규 발견 — `pages/board.html` 라인 2213 5역할 + 'insurer' 잔존 🚨

```js
// pages/board.html 라인 2213 (현재 코드 raw)
if (board === 'insurer' && !['admin', 'insurer'].includes(s.role)) {
  alert('보험사게시판은 보험사 계정 또는 관리자만 작성할 수 있습니다.');
  return;
}
```

**위험도:**
- 9역할에 `'insurer'` 단일 키 = **0건 매치** (구 5역할 표준에도 없음, v1 초기 가설 잔재)
- 9역할 사용자 중 보험사 게시판 작성 시도 시 **admin만 통과, `insurer_*` 4종 모두 alert 차단**
- 출시 후 insurer 입점 첫 사용자 = 즉시 사고

**같은 파일 라인 2225~2228은 9역할 정합:**
```js
} else if (board === 'insurer' && [
  'ga_branch_manager', 'ga_manager',
  'insurer_branch_manager', 'insurer_manager'
].includes(s.role)) {
  displayName = org.company || s.name || '보험회사';
}
```

→ **같은 파일 안에서 라인 2213만 5역할/insurer + 라인 2225만 9역할** = 어제 D-pre Step A·B 18곳 정합에서 **부분 정합·부분 누락**. board.html 수정 시점에 라인 2225는 손댔으나 라인 2213은 visible 영역 밖이라 놓친 것으로 추정.

### 2.3 ⚠️ 신규 발견 — `pricing.html` 라인 225 자체 ROLE_LABEL 중복 정의

`docs/specs/admin_v2_phase_d_pre.md` § 3.3 라인 159~160에서 다음과 같이 명시했었음:

| 위치 | 현재 | 변경 (Step A) |
|---|---|---|
| `pages/pricing-content.html` 라인 225 | 자체 ROLE_LABEL admin 누락 | **폐기 → window.ROLE_LABEL 참조 (결정 B 정합)** |

→ 어제 작업의 의도는 **자체 ROLE_LABEL 폐기 + window.ROLE_LABEL 참조**. 그러나 실제 결과는 **자체 ROLE_LABEL을 9역할 9키로 정합 정정만 하고 폐기 안 함** (`pricing.html` 라인 225~235 자체 9키 정의 잔존).

**위험도:** 🟡 낮음 (현재 동작 정합)
- 동작은 9역할 정합 → 즉시 사고 위험 0
- 단 `db.js` `window.ROLE_LABEL`과 **2곳 정의 중복** = "단일 진실 원천" 원칙 위반
- 미래 9역할 라벨 변경 시 1곳만 갱신·1곳 누락 위험

### 2.4 별 트랙 B-4 — `app.html` 3곳 (어제 식별, 미처리)

```js
// app.html 라인 960 — isPro 헬퍼 (5역할)
var isPro = ['manager','branch_manager'].includes(role) || plan === 'pro';

// app.html 라인 971 — applyMenuSettings 가드 (5역할)
if (window.AppState && ['admin','branch_manager'].includes(window.AppState.role)) return;

// app.html 라인 1000 — applyGateSettings 가드 (5역할)
if (window.AppState && ['admin','branch_manager'].includes(window.AppState.role)) return;
```

→ `auth.js`의 `Auth.isPro()` 등이 9역할 정합이라 app.html 헬퍼는 이미 의미 중복(중복 정의). admin_v2 Phase D 후 처리 별 트랙 보존.

---

## 3. § 3 반복 원인 근본 분석 (4가지 측면)

### 3.1 (a) D-pre 산출물에서 **다뤄진 영역 vs 다뤄지지 않은 영역**

#### 3.1.a 다뤄진 영역 (어제 캡처본 § 5 변경 매핑 7행 + 코드 18곳)

| 영역 | 처리 |
|---|:---:|
| handle_new_user 함수 IN 절 + 폴백 | ✅ Step C-1.5 |
| users.role default | ✅ Step C-2 |
| users 데이터 UPDATE 매핑 | ✅ Step C-3 (실 변경 0) |
| RLS 정책 5건 재작성 | ✅ Step C-4 |
| users_admin_update_all 정정 | ✅ Step C-5 |
| library/news RLS 활성화 + 정책 7개 | ✅ Step C-6 |
| 코드 18곳 (js/db.js·auth.js·myspace·board·pricing-content 등) | ✅ Step A·B |

#### 3.1.b ⚠️ 다뤄지지 않은 영역

| 영역 | 누락 사유 |
|---|---|
| **테이블 CHECK constraint** (`users_role_check` 등) | 어제 항목 1 raw 캡처에 `pg_constraint` SELECT 자체가 빠짐. `pg_policies`(RLS) + `pg_proc`(함수)는 있으나 CHECK는 검토 영역 밖 |
| **handle_new_user 외 함수** (`current_user_role()` 등) | 4/24 노트에 "현 시점 부재"로 검증 종료. 이후 신버전 재검증 미실시 |
| **자체 ROLE_LABEL 폐기** (pricing.html 라인 225) | 어제 산출물에 "폐기" 명시했으나 실 작업은 자체 9키 정정만 진행 — 폐기 단계 **누락 또는 의도 변경** |
| **board.html 보험사 게시판 가드** (라인 2213) | 18곳 정합 영역에 명시 없음. 같은 파일 라인 2225는 정합됐으나 2213 누락 — **부분 정합** |
| **app.html B-4** (라인 960·971·1000) | CLAUDE.md 절대 원칙(app.html 명시 요청 없이 수정 금지) 보호 + 정책 결정 보류로 **의도된 별 트랙 보류** ✅ |

→ B-4는 **의도된 보류** ✅, 나머지 4개 영역은 **검토 영역 자체에서 사각지대**.

### 3.2 (b) 빠진 영역의 공통점 — 사각지대 패턴 4건

| # | 사각지대 패턴 | 사례 |
|:---:|---|---|
| **A** | **DB 메타데이터 영역 차이** (RLS·함수는 잡고 CHECK·index·trigger는 놓침) | `users_role_check` (CHECK), 다른 테이블 CHECK, handle_new_user 외 함수, 트리거 등록 상태 |
| **B** | **같은 파일 안 부분 정합** (visible 영역 정합·외부 영역 누락) | board.html 라인 2225 정합 + 2213 누락 |
| **C** | **v1 초기 가설 잔재** (`'insurer'` 단일 키 — 5역할에도 9역할에도 없는 키) | users_role_check 5값 + posts insurer board RLS + board.html 2213 + 4/20 db_full_reset.md `current_user_role()` 함수 정의 |
| **D** | **단일 진실 원천 위반** (자체 ROLE_LABEL 잔존, 폐기 명시했으나 부분 작업) | pricing.html 자체 ROLE_LABEL, app.html B-4 (auth.js 헬퍼와 의미 중복) |

### 3.3 (c) D-pre 검증 단계가 누락을 잡지 못한 이유

#### 3.3.a 검증 시나리오 자체 사각지대

어제 Step D 라이브 검증 4건 (`2026-05-01_2257.md` 라인 49~58):
- F-1 admin AppState 5건 ✅
- F-2-a admin_v2 풀스크린 진입 ✅
- F-2-b 5종 톤 토글 ✅
- F-2-c 4중 안전장치 ✅
- F-3 9역할 ROLE_LABEL ✅
- F-4 library/news RLS 200 OK ✅
- F-5 함수 raw (실 신규 가입 시 자연 검증)

**누락된 시나리오:**
- 🚨 **9역할 신규 가입 시뮬레이션** — admin 1명 환경에서 신규 가입은 발생 안 함. F-5는 "실 신규 가입 시 자연 검증"으로 미뤘으나 출시 전 검증 0건
- 🚨 **9역할 사용자 보험사 게시판 작성** — admin만 작성하면 통과 (board.html 2213이 admin 통과)
- 🚨 **CHECK constraint 위반 시뮬레이션** — admin row만 있으면 위반 발생 X. 9역할 메타로 신규 row INSERT 시도 시뮬레이션 없음
- 🚨 **다른 페이지 보안 가드 검증** — admin만 로그인하면 모든 가드 통과 (admin은 `'admin'` 단일 키 매치라 정합 외 잔존도 통과)

#### 3.3.b 검증 환경 한계

- **사용자 1명(admin) 환경**: 대부분의 5역할 잔존이 admin 통과 분기에 묶여있어 admin 로그인으로는 확인 불가
- **사용자 0명 가입 시도**: 가입 폼 검증 미실시
- **시뮬레이션 부재**: 9역할 메타 INSERT 시뮬레이션 SQL 없음

### 3.4 (d) 향후 누락 방지 체크리스트 (신규 제안 — § 4 참조)

§ 4에 정리.

---

## 4. § 4 향후 누락 방지 체크리스트 (role 정합 작업 표준)

### 4.1 DB 영역 8항목 (정합 작업 시작 시 1회 + 종료 시 1회 — 트리플 체크 의무)

```
□ 1. information_schema.columns — 대상 컬럼 default·type·nullable
□ 2. pg_constraint contype='c' — 모든 CHECK constraint 본문 grep (5역할 단일 키)
□ 3. pg_policies — RLS 정책 qual/with_check 본문 grep (5역할 단일 키)
□ 4. pg_proc — 모든 함수 본문 grep (5역할 단일 키 + 'insurer' 단일 키)
□ 5. information_schema.triggers — 트리거 등록 상태 + 함수 매핑
□ 6. pg_indexes — 인덱스 (role 컬럼 인덱스가 5역할 partial 인덱스인지 검증, 향후)
□ 7. v1 초기 가설 잔재 키 별도 검색 — `'insurer'` / `'staff'` / 기타 의심 키
□ 8. 9역할 신규 row INSERT 시뮬레이션 SQL 1건 (신규 가입 거동 검증)
```

### 4.2 코드 영역 6항목 (정합 작업 시작 시 1회 + 종료 시 1회)

```
□ 1. JS 파일 grep — `'branch_manager'`/`'manager'`/`'member'`/`'staff'`/`'insurer'` 단일 키 (정규식)
□ 2. JS 파일 grep — `role === 'X'` / `role !== 'X'` 패턴 (5역할 단일 키)
□ 3. JS 파일 grep — `[..., 'X', ...]` 배열 안 5역할 키 (5역할 단일 키)
□ 4. ROLE_LABEL 정의 grep — 단일 진실 원천(window.ROLE_LABEL) 외 자체 정의 0건 보장
□ 5. isPro / isAdmin / isFreeTier / isManagerOrAbove 헬퍼 grep — 5역할 단일 키 사용 여부
□ 6. 보안 가드 패턴 grep — `if (board === 'insurer'` 등 도메인 분기 시 role 비교 전수
```

### 4.3 검증 시나리오 4건 (라이브 검증 표준 추가)

```
□ 1. (admin 진입) admin_v2 풀스크린 + 9역할 데이터 fetch 정합
□ 2. (시뮬레이션) 9역할 메타로 신규 INSERT 1건 시도 — CHECK·트리거·RLS 통과 검증
□ 3. (시뮬레이션) 9역할 사용자 보험사 게시판 작성 — board.html 가드 + posts RLS 통과 검증
□ 4. (시뮬레이션) 9역할 사용자 admin_v2 진입 시도 — RBAC 거부 + admExit 호출 검증
```

### 4.4 작업지시서 § 0번 정합성 검증 강화 항목

```
□ 작업이 role 관련일 때 추가 점검:
  - DB 6항목 (4.1) 트리플 체크 적용 여부
  - 코드 6항목 (4.2) grep 패턴 적용 여부
  - 검증 시나리오 4건 (4.3) 적용 여부
□ "어제까지 정합 완료" 명시 시 검증 영역(scope) 명문화 의무
□ "별 트랙 보류"는 의도적 보류만 인정 — 사각지대로 인한 누락은 보류 X
```

---

## 5. § 5 통합 진단 + 위험도 매트릭스

### 5.1 잔존 부채 전수 (5/2 본 감사 기준)

| # | 잔존 위치 | 분류 | 위험도 | 시급성 | 처리 시점 권고 | 사유 |
|:---:|---|---|:---:|:---:|---|---|
| **1** | `users_role_check` (5값 비표준 — admin/branch_manager/manager/member/insurer) | DB CHECK | 🔴 **출시 차단** | 🔴 **즉시** | **D-pre.6** (5/2 같은 세션) | 9역할 신규 가입 시 INSERT 거부 → 트랜잭션 ROLLBACK → auth.users INSERT까지 영향 추정 → 가입 페이지 "가입 실패" 사고 |
| **2** | `pages/board.html` 라인 2213 `['admin', 'insurer']` | 코드 | 🔴 **insurer 입점 시 즉시 사고** | 🟡 **D-pre.6 직후 또는 D-1** | D-pre.6 묶음 또는 별 미니 트랙 | 9역할 출시 후 insurer_* 사용자 보험사 게시판 작성 시도 즉시 alert 차단. 단 admin·GA는 영향 없음 |
| **3** | `pricing.html` 라인 225 자체 ROLE_LABEL 9키 (window.ROLE_LABEL과 중복) | 코드 | 🟡 단일 진실 원천 위반 | 🟢 동작 정합 (즉시 위험 0) | admin_v2 Phase D 후 별 세션 | 동작은 9역할 정합. 미래 라벨 변경 시 1곳 누락 위험 |
| **4** | `app.html` 라인 960·971·1000 (`['manager','branch_manager']` / `['admin','branch_manager']`) | 코드 | 🟡 admin·9역할 매니저 우회 시 권한 분기 잘못 | 🟡 admin은 통과·매니저급은 일부 분기 X | admin_v2 Phase D 완료 후 별 세션 (B-4 등록됨) | CLAUDE.md 절대 원칙 보호 + 정책 결정 보류 |
| **5** | (미검증) 다른 테이블 CHECK constraint 5역할 잔존 | DB CHECK | ⚠️ 미확인 | 🟡 D-pre.6 Step A에 6-A SELECT 묶음 | D-pre.6 | pg_constraint 전수 SELECT로 검증 |
| **6** | (미검증) handle_new_user 외 함수 5역할 하드코딩 | DB 함수 | ⚠️ 미확인 | 🟡 D-pre.6 Step A에 6-C SELECT 묶음 | D-pre.6 | `current_user_role()` 등 4/20 정의 함수 부재 검증 + pg_proc 전수 grep |
| **7** | (미검증) RLS 정책 어제 5건 외 잔존 | DB RLS | ⚠️ 미확인 | 🟡 D-pre.6 Step A에 6-B SELECT 묶음 | D-pre.6 | pg_policies 전수 grep |
| **8** | (미검증) 트리거 handle_new_user 외 등록 | DB 트리거 | ⚠️ 미확인 | 🟢 낮음 | D-pre.6 Step A에 6-D SELECT 묶음 | information_schema.triggers 전수 |

### 5.2 위험도 분포 요약

- 🔴 출시 차단 1건 (#1)
- 🔴 insurer 입점 사고 1건 (#2) ⭐ **신규 발견**
- 🟡 동작 무영향이지만 부채 2건 (#3·#4) — 별 세션
- ⚠️ 미검증 4건 (#5·#6·#7·#8) — D-pre.6 Step A 추가 SELECT로 일거 해소

---

## 6. § 6 다음 액션 권고 + D-pre.6 트랙 사양 초안

### 6.1 추천 처리 순서 (5/2 같은 세션 내 진행 가능)

| 단계 | 작업 | 주체 | 예상 시간 |
|:---:|---|---|---|
| **(가)** | D-pre.5 Step D 라이브 검증 4건 (status/last_seen_at 회귀 0 확인) | 팀장님 | 5~10분 |
| **(나)** | D-pre.5 캡처본 § 3·§ 4 채움 + _INDEX.md ✅ 갱신 + 단일 커밋·푸시 | Code | 5분 |
| **(다)** | **D-pre.6 작업지시서 발행** (본 산출물 § 6.2 골격 채택 시) | 팀장님 | 즉시 |
| **(라)** | D-pre.6 Step A 추가 SELECT 8건 (DB 6항목 + 신규 INSERT 시뮬레이션 + 트리거) | Chrome | 10~15분 |
| **(마)** | D-pre.6 Step B DROP+ADD CONSTRAINT 분할 + board.html 라인 2213 정정 (1줄 변경) | Chrome + Code | 10분 |
| **(바)** | D-pre.6 Step C·D·E + 캡처본 + _INDEX.md + 푸시 | Code | 15분 |

→ **5/2 한 세션 내 D-pre.5 종료 + D-pre.6 완수 가능.**

### 6.2 D-pre.6 트랙 사양 초안

```
D-pre.6 — users_role_check 9역할 정정 + D-pre 누락 영역 전수 일거 해소

§ 0 정합성 검증 4항목 (본 산출물 § 0 + § 1 + § 2 매트릭스 활용)

§ 1 확정 사양
- (i) DROP CONSTRAINT users_role_check + ADD CONSTRAINT users_role_check (9키 9개)
- (ii) board.html 라인 2213 1줄 정정: ['admin', 'insurer'] → 9키 9개 (admin + insurer_* 4종 + ga_* 4종 또는 admin + insurer_* 4종만 — 결정 4 정합 검토)
- (iii) D-pre 누락 영역 전수 검증 SELECT 4건 묶음
- (iv) 시뮬레이션 INSERT 1건 (9역할 메타 INSERT → ROLLBACK 검증, 검증 후 ROLLBACK)

§ 2 작업 목적: 출시 차단 위험 해소 + D-pre 누락 영역 일거 정합

§ 3 Step A — 사전 검증 SELECT 8건
  A-0 신버전 DB 재확인
  A-1 users_role_check 현재 raw 재확인 (변경 직전 raw)
  A-2 users role 분포 (admin 1명 보존)
  A-3 admin row CHECK 통과 보장 검증
  A-4 (= 본 산출물 § 6.3 6-A) 다른 테이블 CHECK constraint 전수
  A-5 (= 6-B) RLS 정책 5역할 잔존 전수
  A-6 (= 6-C) 함수 5역할 하드코딩 전수
  A-7 (= 6-D) 트리거 등록 상태 전수

§ 4 Step B — DROP + ADD 분할 실행 + board.html 정정
  B-1 DROP CONSTRAINT users_role_check
  B-1 직후 검증: pg_constraint에 0건
  B-2 ADD CONSTRAINT users_role_check (9키 9개)
  B-2 직후 검증: 정의 raw + admin row 통과
  B-3 board.html 라인 2213 1줄 정정 (Code Edit)

§ 5 Step C — 사후 검증 SELECT 4건
  C-1 users_role_check 정의 9키 raw 검증
  C-2 admin row CHECK 통과
  C-3 (시뮬레이션) 9역할 메타 INSERT BEGIN; INSERT ...; ROLLBACK; — 통과 확인
  C-4 board.html 라인 2213 변경 후 grep 검증 (5역할 단일 키 0건)

§ 6 Step D — 라이브 검증 5건
  D-1~D-4 (D-pre.5와 동일 회귀 0 검증)
  D-5 (시뮬레이션) admin이 admin_v2에서 9역할 사용자 row 추가 시뮬레이션 (D-1 작업 후로 미룸 가능)

§ 7 Step E — 롤백 SQL (5역할 5키 복구 + board.html 라인 2213 복구)

§ 8 산출물:
- docs/architecture/db_pre_dpre6_capture.md 신설
- pages/board.html 라인 2213 1줄 변경
- docs/sessions/_INDEX.md Phase D 세부 단계 표 D-pre.6 행 추가

§ 11 절대 원칙:
- DB 변경: ALTER 2건 (DROP + ADD CONSTRAINT) + 시뮬레이션 ROLLBACK
- 코드 변경: board.html 1줄만 (작업지시서 § 1-ii 명시)
- admin_v2.html / app.html / auth.js / db.js 변경 0건
- pricing.html 자체 ROLE_LABEL 폐기는 D-pre.6 범위 외 (별 세션)
- app.html B-4 처리는 D-pre.6 범위 외 (admin_v2 Phase D 후)
```

### 6.3 D-pre.6 Step A에 묶음 권장 추가 SELECT 4건

```sql
-- ════════════════════════════════════════════════════════════════════════
-- D-pre.6 Step A 추가 검증 (D-pre 누락 영역 전수)
-- 모두 SELECT — DB 변경 0건. 결과 raw를 회신 부탁드립니다.
-- ════════════════════════════════════════════════════════════════════════

-- 6-A. 다른 테이블 CHECK constraint에 5역할/insurer 잔존 검색
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
-- 기댓값: users_role_check 1건만 (또는 추가 발견 시 D-pre.6 범위 확장)

-- 6-B. RLS 정책 본문에 5역할/insurer 단일 키 잔존 검색
SELECT
  schemaname, tablename, policyname,
  qual, with_check
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

-- 6-C. 함수 본문에 5역할/insurer 단일 키 잔존 검색 (handle_new_user 외)
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
-- 기댓값: 0행 (current_user_role 등 4/20 정의 함수가 부재이거나 9역할 정합)
-- 잔존 시: D-pre.6 범위 확장 검토

-- 6-D. 트리거 등록 상태 전수 (handle_new_user 외 트리거)
SELECT
  trigger_schema, trigger_name,
  event_object_schema, event_object_table,
  event_manipulation, action_timing, action_statement
FROM information_schema.triggers
WHERE trigger_schema IN ('public', 'auth')
ORDER BY trigger_schema, trigger_name;
-- 기댓값: on_auth_user_created (auth.users → handle_new_user) 1건 외 추가 점검
```

### 6.4 권장 9역할 9키 정의 (D-pre.6 ALTER SQL 후보)

```sql
ALTER TABLE public.users
DROP CONSTRAINT users_role_check;

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

→ CLAUDE.md 9역할 표 + handle_new_user IN 절(8키) + admin = **총 9키**.

### 6.5 board.html 라인 2213 정정 후보 (D-pre.6 § 1-ii)

```js
// 변경 전 (현재)
if (board === 'insurer' && !['admin', 'insurer'].includes(s.role)) {

// 변경 후 (옵션 (가) — 결정 4 정합, posts insurer_board_insert RLS와 일치)
if (board === 'insurer' && ![
  'admin',
  'insurer_branch_manager','insurer_manager','insurer_member','insurer_staff'
].includes(s.role)) {

// 변경 후 (옵션 (나) — GA 매니저급도 보험사 게시판 작성 허용 시 — 사업 결정 사항)
if (board === 'insurer' && ![
  'admin',
  'ga_branch_manager','ga_manager',
  'insurer_branch_manager','insurer_manager','insurer_member','insurer_staff'
].includes(s.role)) {
```

→ **(가) 추천** — 어제 결정 4(`insurer board insert` RLS = `admin` + `insurer_*` 4종)와 정합. GA 매니저급의 보험사 게시판 작성은 사업 결정 사항으로 v1.1 검토.

### 6.6 결정 필요 사항 (D-pre.6 작업지시서 발행 전)

| # | 결정 | 옵션 |
|:---:|---|---|
| 1 | D-pre.6 진입 시점 | **(a) D-pre.5 Step D 통과 후 즉시** ⭐ / (b) 분리 세션 |
| 2 | D-pre.6 board.html 라인 2213 정정 포함 여부 | **(a) 포함** ⭐ — DB CHECK constraint와 1:1 정합 / (b) 별 미니 트랙 |
| 3 | board.html 라인 2213 정정 사양 (§ 6.5) | **(가) admin + insurer_* 4종** ⭐ — RLS 정합 / (나) GA 매니저급 추가 — 사업 결정 |
| 4 | DROP+ADD CONSTRAINT vs NOT VALID 옵션 | **(a) DROP+ADD 단순** ⭐ — admin 1행만, 즉시 검증 / (b) NOT VALID — 운영 데이터 많을 때 |
| 5 | pricing.html 자체 ROLE_LABEL 폐기 시점 | **D-pre.6 범위 외** — admin_v2 Phase D 후 별 세션 |
| 6 | app.html B-4 (3곳) 처리 시점 | **D-pre.6 범위 외** — admin_v2 Phase D 완료 후 별 세션 (CLAUDE.md 절대 원칙 보호) |

---

## 7. 변경 이력

| 시각 | 변경 |
|---|---|
| 2026-05-02 (오후) | 신설 — role 정의 전수 감사 + 5역할 잔존 반복 원인 분석. DB 6항목 + 코드 6항목 raw 매트릭스. **신규 발견 1건**: `pages/board.html` 라인 2213 `['admin', 'insurer']` 5역할/insurer 잔존. 부채 8건 위험도 매트릭스. D-pre.6 트랙 사양 초안 + 추가 SELECT 4건 SQL 패키지 + board.html 정정 후보. 직전 의뢰(d-pre5-role-check-investigation.md) 통합 흡수. 팀장님 결정 대기. |

---

*본 산출물은 admin_v2.html / app.html / auth.js / db.js / DB / 그 외 코드 변경 모두 0건. information_schema·pg_constraint SELECT 미실행 (Chrome 회신본 + git 코드베이스 직접 grep만). 분석·진단·권고만.*
