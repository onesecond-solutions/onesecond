# admin_v2 Phase D-4 작업지시서 — notice 섹션 실 데이터 연결

> **작성일:** 2026-05-04
> **작성자:** Claude Code
> **선행 산출물:**
> - 통합 작업지시서 v1.1: `docs/specs/admin_v2_d3_to_dfinal_workorder_v1.md` § 3 (D-4 사전 분석)
> - D-pre 시리즈: `admin_v2_phase_d_pre.md` + D-pre.5/6/7/8 capture 4건
> - D-1/D-2/D-3 작업지시서·의뢰서 패턴 정합
> **결재 결과:** 2026-05-04 K-1~K-6 일괄 승인 (옵션 I 권장값 6건)
> **상태:** 🟢 Step 1 사전 검증 진입 즉시 가능

---

## 0. 큰 그림 정합성 검증 (D-1·D-2·D-3 종료 시점)

1. `docs/sessions/_INDEX.md` 메인 트랙 = admin_v2 Phase D 진입 ✅
2. D-3 25/25 PASS 완전 종료 (`1c55171`) ✅
3. 통합 작업지시서 v1.1 발행 완료 (`23e1b2d`, D-9 ⚙️ 화면설정 추가) ✅
4. D-4 본 작업지시서 = 통합본 § 3 인용 + Step 분할 본문 ✅
5. 차단 조건 없음 → Step 1 사전 검증 진입

**현재 잔존 별 트랙 (병렬 가능, D-4 차단 0):**
- P3 PostgREST 분석 (Phase E 격상)
- scripts 보강 Step 1·3·4 Web 의뢰서 작성
- board seed data 다양화 (D-3 부채 #6, 별 트랙)
- D-9 ⚙️ 화면설정 (D-5 후 진입 권장)

---

## 1. 작업 배경

### 1.1 목표

admin_v2.html `notice` 섹션의 Phase C mock(활성 카드 4 + 작성 이력 5)을 실 Supabase 데이터로 전환 + role 분기 enum 5종 활성 + 토글 즉시 PATCH.

### 1.2 결재 결과 (K-1 ~ K-6, 2026-05-04 일괄 승인)

| # | 결정 | 채택 | 영향 |
|:--:|---|---|---|
| **K-1** ⭐ | 데이터 테이블 결정 | **(c) v2.0 대기 + mock 보존** (D-3 J-2 (b) 패턴 정합) — **5/4 재결재** | DB 변경 0건 + JS 측 NOTICE_*_MOCK 배열 + admin_v2.html mock 라벨만 동적. 사전 검증 raw 분석 결과 app_settings 컬럼 부재(role/expires_at/view_count)로 mock 풍부 메타데이터 표시 불가 → (a) → (c) 분기 |
| **K-2** | 노출 기간 default | (b) 1주 | 새 공지 작성 시 default 7일 |
| **K-3** | role 분기 표시 | (b) enum 5종 (전체/FREE/GA/원수사/매니저 이상) | mock 자유 텍스트 → enum 매핑 코드 |
| **K-4** | 토글 즉시 반영 | (a) 즉시 PATCH | 토글 클릭 → app_settings UPDATE 1회 |
| **K-5** | 신규 공지 작성 form | (b) Phase E | D-4 = 조회 + 토글 + 작성 이력만 |
| **K-6** | 조회수 표시 | (b) 별 트랙 | view_count 컬럼 신설은 별 트랙 |

### 1.3 D-1·D-2·D-3 결정 승계 (전 단계 공통 — G-*/H-*)

| # | 결정 | 본 단계 적용 |
|:--:|---|---|
| **G-1** | ROLE_LABEL admin = "어드민" | 작성 이력 작성자 표시 적용 |
| **H-1** | fetch 호출 = `window.db.fetch()` (401 자동 갱신) | 모든 함수 적용 |
| **H-2** | 페이징 = 20행 / 300ms 디바운스 / AND / count=exact | 작성 이력 페이징 시 적용 (D-4에서는 5행 표시만) |
| **H-3** | 401 자동 / 403 admExit / 500 토스트 / 1회 재시도 / Sentry hook | 모든 함수 적용 |
| **추-1** | js/admin_v2.js 확장 (D-2/D-3 패턴) | notice 섹션 함수 4~5종 추가 (~150~200줄) |
| **추-2** | mock 제거 시 활성 카드 4 + 작성 이력 5 모두 실 연결 | DB raw 기반 동적 렌더링 |
| **추-3** | 라이브 회귀 의뢰서 발행 (Chrome 위임) | ~20항목 |
| **추-4** | RLS 회귀 검증 | app_settings RLS admin 정합 (Step 1 ⑥) |

---

## 2. 변경 범위 (3파일, K-1 (c) 채택으로 DB 0건 + mock 보존)

| 파일 | 변경 유형 | 라인 |
|---|---|---|
| `js/admin_v2.js` | UPDATE — D-3 J-2 (b) 패턴 — NOTICE_ACTIVE_MOCK + NOTICE_HISTORY_MOCK + render 함수 + 토글 핸들러 | 끝부분 +120~160줄 (D-3 BOARD_REPORTS_MOCK 패턴 정합) |
| `pages/admin_v2.html` | UPDATE — notice mock 정적 → JS 측 이관 + 슬롯 ID + 라벨 갱신 (`[Phase C mock]` → `[v1.1 mock + v2.0 대기]`) | 라인 1960~2092 (~130줄 영향) |
| Supabase DB | **변경 0건** — app_settings 컬럼 부재로 K-1 (c) 채택. RLS 회귀 검증은 본 D-4 외 (별도 청산 완료 — `admin write app_settings` 정책 `is_admin()` 통일) | 0 |
| 라이브 회귀 의뢰서 | 신설 — `docs/specs/admin_v2_d4_live_regression_<date>.md` | ~20항목 |

**제외 (D-4 범위 외):**
- notices/banners 테이블 신설 (K-1 (c) v2.0 대기) — v2.0 (보험사 입점·CS 영업 시점)
- 신규 공지 작성 form (K-5 (b) Phase E)
- 조회수 표시 (K-6 (b) 별 트랙)
- 자동 만료 알림 — 별 트랙
- D-9 ⚙️ 화면설정 섹션의 배너 이미지 (별 단계 D-9에서 처리)
- 토글 즉시 PATCH 실작동 (K-4 (a) 결재는 v2.0 시점 적용 — D-4에서는 mock key/userId null로 토스트 즉시 표시, D-3 J-2 (b) 패턴 정합)

---

## 3. Step 분할 (5단계 — D-2·D-3 패턴, DB 변경 0건)

### Step 1 — 사전 검증 (DB·코드 변경 0건)

#### 1-1. SELECT 검증 (Supabase Dashboard SQL Editor — Chrome 위임)

```sql
-- ① 신버전 DB 확인 (CLAUDE.md 강제)
SELECT current_database();

-- ② app_settings 전수 raw + group_name 분포 (K-1 (a) 정합 — 기존 사용 그룹 확인)
SELECT COUNT(*) AS total FROM public.app_settings;
SELECT group_name, COUNT(*) AS cnt
FROM public.app_settings
GROUP BY group_name
ORDER BY cnt DESC NULLS LAST;

-- ③ K-1 (a) — 'notice' / 'banner' group 기존 사용 여부 (없으면 신규 도메인 정합)
SELECT key, value, label, group_name, updated_at
FROM public.app_settings
WHERE group_name IN ('notice', 'banner') OR key LIKE 'notice%' OR key LIKE 'banner%'
ORDER BY group_name, key;

-- ④ users.role 분포 (K-3 enum 5종 매핑 raw — admin/ga_*/insurer_*)
SELECT role, COUNT(*) AS cnt
FROM public.users
GROUP BY role
ORDER BY cnt DESC;

-- ⑤ users.plan 분포 (K-3 enum 분기 — FREE 사용자 표시 정합)
SELECT plan, COUNT(*) AS cnt
FROM public.users
GROUP BY plan
ORDER BY cnt DESC NULLS LAST;

-- ⑥ app_settings RLS 정책 raw (admin SELECT/UPDATE/INSERT 정합 회귀)
SELECT policyname, cmd, roles, qual AS using_clause, with_check AS with_check_clause
FROM pg_policies
WHERE schemaname='public' AND tablename='app_settings'
ORDER BY cmd, policyname;
```

#### 1-2. 검증 통과 기준

| # | 기준 | 영향 |
|:--:|---|---|
| ① | `postgres` 1행 | 신버전 확인 |
| ② | total ≥ 1 / group_name 분포 ≥ 1종 ('board_tab' 1건 이상 예상) | board.html 패턴 가동 확인 |
| ③ | 0행 또는 ≥1행 (둘 다 OK) — 0행이면 K-1 (a) 신규 도메인 / ≥1행이면 기존 데이터 검토 | K-1 (a) 정합 분기 |
| ④ | 9역할 (admin / ga_* 4종 / insurer_* 4종) 분포 정합 | K-3 enum 매핑 raw |
| ⑤ | plan 분포 (FREE / PRO / CRM 등) | K-3 분기 정합 |
| ⑥ | app_settings RLS — admin SELECT·UPDATE·INSERT 정합 (D-pre.7/8 학습 적용 — 인라인 EXISTS 0건 / `is_admin()` 통일) | D-pre 회귀 |

→ ① ⑥ FAIL 시 D-4 진입 차단. ② ~ ⑤ FAIL 시 결정 분기 (예: ③ 1행 이상 = 기존 데이터 정리 필요).

### Step 2 — js/admin_v2.js 확장 (D-3 J-2 (b) 패턴 정합, ~120~160줄)

#### 2-1. mock 배열 + 함수

| 함수 | 시그니처 | 정합 (K-1 (c) v2.0 대기) |
|---|---|---|
| `NOTICE_ACTIVE_MOCK` (배열) | 4행 — admin_v2.html 라인 1973~2023 raw 그대로 (제목/유형/대상/노출/조회수) | D-3 BOARD_REPORTS_MOCK 패턴 정합 |
| `NOTICE_HISTORY_MOCK` (배열) | 5행 — admin_v2.html 라인 2041~2086 raw 그대로 (유형/제목/role/작성자/상태/노출 기간) | 동일 |
| `fetchNoticeActiveMock()` | `→ Promise<Array<4행 mock>>` | mock 그대로 반환 |
| `fetchNoticeHistoryMock()` | `→ Promise<Array<5행 mock>>` | mock 그대로 반환 |
| `handleNoticeToggle(key)` | `→ Promise<boolean>` | key null이면 "v2.0 대기 mock — notices 테이블 신설 후 작동" 토스트 (D-3 patterns) |
| `handleNoticeAction(action, id)` | `→ Promise<boolean>` | 동일 토스트 패턴 (👁️ 상세 / ✏️ 편집) |

#### 2-2. render 함수 3종

| 함수 | 슬롯 ID | 정합 |
|---|---|---|
| `renderNoticeActiveCards(cards)` | `adm-notice-active-grid` (admin_v2.html `.adm-notice-grid` host) | 4행 카드 정적 mock 그대로 + 토글 스위치 (data-notice-key=null) |
| `renderNoticeHistory(rows)` | `adm-notice-history-tbody` (admin_v2.html `.adm-table tbody` host) | 5행 테이블 정적 mock 그대로 + 액션 버튼 (data-notice-id=null) |
| `attachNoticeActions()` | (이벤트 위임) | 토글 + 액션 버튼 클릭 → handle* 토스트 |

#### 2-3. 진입점

```js
window.admLoadNotice = async function () {
  var [active, history] = await Promise.all([
    fetchNoticeActiveMock(), fetchNoticeHistoryMock()
  ]);
  if (!document.querySelector('.adm-view[data-view="notice"].active')) return;
  if (active)  renderNoticeActiveCards(active);
  if (history) renderNoticeHistory(history);
  attachNoticeActions();
};
```

### Step 3 — admin_v2.html mock 제거 + 슬롯 ID 부여

#### 3-1. 변경 라인 2025~2156

| 변경 | 라인 | 내용 |
|---|---|---|
| § 헤더 라벨 | 2030 | `[Phase C mock]` → `[v1.1 라이브 — app_settings 정합]` |
| 활성 카드 4 | 2039~2088 | mock 4카드 → `<div id="adm-notice-active-grid">` 빈 호스트 |
| 작성 이력 테이블 | 2091~2155 | mock 5행 정적 → `<tbody id="adm-notice-history-tbody">` 빈 호스트 |
| view 라우팅 | 라인 2618~2625 | `else if (viewKey === 'notice') window.admLoadNotice();` 추가 |
| race 안전장치 | js/admin_v2.js 끝부분 | `else if (...notice"].active) window.admLoadNotice();` 추가 |

### Step 4 — 라이브 회귀 검증 의뢰서 발행

#### 4-1. 의뢰서 신설 — `docs/specs/admin_v2_d4_live_regression_2026-05-04.md` (~20항목)

| 섹션 | 수 | 핵심 |
|---|:--:|---|
| § 1 정의 raw (D1~D3) | 3 | typeof admLoadNotice / mock 잔존 0 / app_settings group_name='notice' raw |
| § 2 실 동작 (L1~L8) | 8 | 진입 / 활성 카드 4 / 토글 즉시 반영 / 작성 이력 5 / role 분기 표시 / 노출 기간 / 활성 카운트 / 헤더 라벨 |
| § 4 RBAC (R1~R2) | 2 | 비-admin 차단 / admin SELECT |
| § 5 콘솔·네트워크 (C1~C4) | 4 | Error 0 / 4xx 0 / 토글 PATCH / D-1·D-2·D-3 회귀 |
| § 6 성능 (P1~P3) | 3 | P1 KPI fetch / P2 토글 PATCH / P3 진입 총 시간 |
| **합계** | **20** | |

### Step 5 — 잔존 부채 등록 + _INDEX.md 갱신

#### 5-1. D-4 잔존 부채 후보

| # | 항목 | 권장 처리 |
|:--:|---|---|
| 1 | **notices/banners 테이블 신설 + RLS 4건** (K-1 (c) v2.0 대기) | v2.0 (보험사 입점·CS 영업 시점) |
| 2 | 신규 공지 작성 form (K-5 (b) Phase E) | Phase E (notices 테이블 신설 후) |
| 3 | 조회수 표시 (K-6 (b) 별 트랙) | view_count 컬럼 신설 별 트랙 (notices 테이블 신설 후) |
| 4 | 자동 만료 알림 (K-2 (b) 1주 default 만료 시) | 별 트랙 (Sentry/Slack hook) |
| 5 | 노출 통계 — admin이 활성 카드별 클릭 수 확인 | Phase E (D-5 analytics와 묶음) |
| 6 | 배너 이미지 — 본 D-4는 텍스트 공지만 / 배너는 D-9 ⚙️ 화면설정 섹션 4 처리 | D-9 진입 시 |
| 7 | ✅ **app_settings RLS `admin write app_settings` 정책 청산** (D-pre.8 sweep 누락 보강) — 5/4 D-4 Step 1 ⑥ FAIL 발견 → 즉시 청산 (DDL 1쌍, 인라인 EXISTS → `is_admin()` 통일) | 청산 완료 (capture mini-doc 보류 — 본 commit에 통합 기록) |

#### 5-2. _INDEX.md 갱신 (Step 4 PASS 회신 후)

- 헤더 마지막 갱신 시점
- Phase D 표 D-4 행 → "✅ 완전 종료 (라이브 회귀 NN/20 PASS)"
- 다음 세션 인계 노트에 D-6 logs 진입 가능 표기 (통합본 § 11.1 권장 진입 순서 정합)

#### 5-3. 라이브 회귀 PASS 후 commit + push

- D-4 본 작업 commit (Step 2 + 3) + 의뢰서 commit (Step 4) + _INDEX.md commit (Step 5)
- 단일 commit 묶음 가능 (G-3 단일 커밋 정합)

---

## 4. 절대 원칙 (통합본 v1.1 § 10.1 인용)

15건 모두 D-4 진입 시 적용. 본 단계 핵심:
- **#1** CLAUDE.md 신버전 확인 (Step 1 ① 강제)
- **#3** admin/role 검증 = SECURITY DEFINER `is_admin()` (app_settings RLS 회귀)
- **#4** DB 메타 통과 ≠ 라이브 안전 → Step 4 의뢰서 필수
- **#11** race 안전장치 — fetch 응답 도착 시 active view 재확인 (Step 2-3 admLoadNotice)
- **#12** mock UI 보존 vs 동적화 분리 — K-1 (a) app_settings 정합으로 mock 전체 동적화 (D-3 J-2 (b)와 다름)

---

## 5. 보고 양식 (Step 1 → 5 진행 중)

### 5.1 Step 1 사전 검증 결과 보고 (Chrome → Code)

각 SQL ① ~ ⑥ 결과 raw + 통과/실패 표 (D-3 9/9 패턴 가벼운 6/6 버전)

### 5.2 Step 2·3 코드 변경 보고 (Code → 팀장님)

- diff stat
- 신규 함수 5종 + render 3종 + 진입점 1
- admin_v2.html mock 제거 + 슬롯 ID 부여 + 라벨 갱신

### 5.3 Step 4 라이브 회귀 의뢰서 발행 + Chrome 위임

### 5.4 Step 4 라이브 회귀 결과 (Chrome → Code)

NN/20 PASS + FAIL raw

### 5.5 Step 5 _INDEX.md 갱신 + 다음 세션 인계 노트

---

## 6. 산출물 위치

| 산출물 | 경로 | 시점 |
|---|---|---|
| 본 작업지시서 | `docs/specs/admin_v2_d4_workorder.md` | 2026-05-04 |
| 사전 검증 SQL 6건 결과 raw | (이 화면 / Chrome 회신) | Step 1 |
| js/admin_v2.js 확장본 | `js/admin_v2.js` | Step 2 |
| admin_v2.html mock 제거본 | `pages/admin_v2.html` | Step 3 |
| 라이브 회귀 의뢰서 | `docs/specs/admin_v2_d4_live_regression_2026-05-04.md` | Step 4 |
| _INDEX.md 갱신 | `docs/sessions/_INDEX.md` | Step 5 |

---

## 7. 잔존 부채 (D-4 후 별 트랙 처리)

본 작업지시서 § 3.5.1 표 그대로 + D-1·D-2·D-3 잔존 누적 (통합본 § 1.5 표 참조).

---

## 8. 참고

- 통합 작업지시서 v1.1: `docs/specs/admin_v2_d3_to_dfinal_workorder_v1.md` § 3 (D-4 사전 분석)
- D-1 작업지시서·회귀 의뢰서: `admin_v2_d1_workorder.md` + `admin_v2_d1_live_regression_2026-05-03.md`
- D-2 작업지시서·회귀 의뢰서: `admin_v2_d2_workorder.md` + `admin_v2_d2_live_regression_2026-05-04.md` (P3 PostgREST 별 트랙 분리 사례)
- D-3 작업지시서·회귀 의뢰서: `admin_v2_d3_workorder.md` + `admin_v2_d3_live_regression_2026-05-04.md` (J-5 (b) RPC 격상 불필요 청산 사례)
- app_settings 컬럼 raw: `claude_code/_docs/supabase_dumps/q2_columns.csv`
- board.html app_settings 사용 패턴: `pages/board.html` 라인 1260 (`group_name=eq.board_tab` 패턴)
- D-pre 시리즈 capture: `docs/architecture/db_pre_dpre7_capture.md` + `db_pre_dpre8_capture.md`

---

*본 작업지시서는 D-pre.5/6/7/8 + D-1 + D-2 + D-3 학습 전건 반영. 적용 시 Step 1 사전 검증 결과에 따라 Step 2 진입 결정. 팀장님 승인 없이 Code 단독 진행 금지 (Step 1 결과 보고 → Step 2 진입 승인 대기).*
