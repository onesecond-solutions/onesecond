# admin_v2 Phase D-5 작업지시서 — analytics 섹션 실 데이터 + RPC 4종 신설

> **작성일:** 2026-05-05
> **작성자:** Claude Code
> **선행 산출물:**
> - 통합 작업지시서 v1.1: `docs/specs/admin_v2_d3_to_dfinal_workorder_v1.md` § 4 (D-5 사전 분석)
> - D-pre 시리즈: `admin_v2_phase_d_pre.md` + D-pre.5/6/7/8 capture 4건
> - D-1/D-2/D-3/D-4/D-6 작업지시서·의뢰서 패턴 정합
> - **D-2 별 트랙 #3 학습:** `get_stage_distribution()` RPC 패턴 (SECURITY DEFINER + `is_admin()` + REVOKE/GRANT)
> **결재 결과:** 2026-05-05 L-1~L-10 일괄 승인 (옵션 I 권장값 10건)
> **상태:** 🟢 Step 1 사전 검증 진입 즉시 가능

---

## 0. 큰 그림 정합성 검증 (D-1·D-2·D-3·D-4·D-6 종료 시점)

1. `docs/sessions/_INDEX.md` 메인 트랙 = admin_v2 Phase D 진행 중 ✅
2. D-1 17/17 / D-2 24/25 / D-3 25/25 / D-4 20/20 / D-6 20/20 PASS 완전 종료 ✅
3. 통합 작업지시서 v1.1 § 11.1 권장 진입 순서: D-3 → D-4 → D-6 → **D-5** → D-9 → D-7(나) → D-8 → D-final ✅
4. D-5 본 작업지시서 = 통합본 § 4 인용 + Step 분할 본문 ✅
5. 차단 조건 없음 → Step 1 사전 검증 진입

**현재 잔존 별 트랙 (병렬 가능, D-5 차단 0):**
- P3 PostgREST 분석 (Phase E 격상)
- scripts 보강 Step 1·3·4 Web 의뢰서 작성
- board / notice seed data 다양화 (외부 시연 직전)
- D-9 ⚙️ 화면설정 (D-5 후 진입 권장)
- D-6 잔존 부채 10건 (system_logs Sentry / event_type 동적 채움 / 9역할 시드 등)
- 5/5 신규 별 트랙 — `index_hero_headline_c_plus.md` (5/12 이후 적용) / `team4_vault_phase1.md` (5/12 이후 진입, 미해결 이슈 #20)

---

## 1. 작업 배경

### 1.1 목표

admin_v2.html `analytics` 섹션의 Phase C mock(KPI 4 + DAU 90일 라인 + 6메뉴 막대)를 실 Supabase 데이터로 전환 + **RPC 4종 신설** + 별 트랙 B-1 grid 토큰 마이그레이션.

### 1.2 결재 결과 (L-1 ~ L-10, 2026-05-05 일괄 승인)

| # | 결정 | 채택 | 영향 |
|:--:|---|---|---|
| **L-1** | 집계 윈도우 KST 자정 | D-2 fetchContentKPI 패턴 (`setUTCHours(15,0,0,0)`) | UTC ↔ KST 변환 표준 |
| **L-2** ⭐ | RPC cold-start 대비 | D-2 별 트랙 #3 학습 — `get_stage_distribution` 패턴 정합 | SECURITY DEFINER + `is_admin()` 가드 + REVOKE/GRANT 표준 |
| **L-3** | 차트 시간축 default | (a) 90일 (mock 정합) | 시연 가치 + 시간축 토글 90/30/7일 3종 |
| **L-4** | 6메뉴 표준 | (b) 매핑 (script/home/together/myspace/library/notice) | UX 안정 + raw 부족 시 0 표시 |
| **L-5** | 신규 vs 기존 사용자 분리 | (b) 별 트랙 (코호트 분석 Phase E) | D-5 무거움 |
| **L-6** | 데이터 부족 표시 | "데이터 수집 중" 라벨 — 0행 시 mock 자리 표시 | activity_logs 742건 / event_type 2종 / users 2명 (D-6 Step 1 raw) |
| **L-7** | 차트 grid line 토큰 | 별 트랙 B-1 — `--admin-chart-grid` 신규 5종 톤 정의 | dashboard·D-3·D-5 일괄 마이그레이션 |
| **L-8** | DAU/WAU/MAU 정의 | DAU = 오늘 / WAU = 지난 7일 / MAU = 지난 30일 / 리텐션 D-30 = 가입 후 30일 이내 last_seen_at 갱신 비율 | 명문화 |
| **L-9** | RPC SECURITY DEFINER 표준 | D-2 패턴 (REVOKE PUBLIC + GRANT authenticated + REVOKE anon + `is_admin()` 가드) | 표준 |
| **L-10** | "📅 기간 선택" / "📤 리포트 PDF" 버튼 | (a) mock 보존 + 토스트 "Phase E" | D-6 CSV 패턴 정합 |

### 1.3 D-1~D-4·D-6 결정 승계 (전 단계 공통)

| # | 결정 | 본 단계 적용 |
|:--:|---|---|
| **G-1** | ROLE_LABEL admin = "어드민" | KPI/막대 raw에서 활용 |
| **H-1** | fetch 호출 = `window.db.fetch()` (401 자동 갱신) | 모든 함수 적용 |
| **H-3** | 401 자동 / 403 admExit / 500 토스트 / 1회 재시도 / Sentry hook | 모든 함수 적용 |
| **추-1** | js/admin_v2.js 확장 (D-1~D-6 패턴) | analytics 섹션 함수 7~9종 + render 4종 (~300~400줄) |
| **추-2** | mock 제거 시 KPI 4 + DAU 90일 라인 + 6메뉴 막대 모두 실 연결 | DB raw + 데이터 부족 표시 (L-6) |
| **추-3** | 라이브 회귀 의뢰서 발행 | ~30항목 |
| **추-4** | RLS 회귀 검증 | activity_logs RLS admin SELECT 회귀 (Step 1 ④) |
| **별-1** | B-1 grid 토큰 신규 | dashboard·D-3·D-5 일괄 마이그레이션 (Step 5에 묶음) |

---

## 2. 변경 범위 (3파일 + RPC 4종 + B-1 토큰)

| 파일 | 변경 유형 | 라인 |
|---|---|---|
| `js/admin_v2.js` | UPDATE — analytics 섹션 함수 + RPC 호출 4종 + render 4종 + 시간축 토글 | +300~400줄 |
| `pages/admin_v2.html` | UPDATE — analytics mock 제거 + B-1 grid 토큰 적용 | 라인 1810~1955 (~145줄 영향) |
| `css/tokens.css` | UPDATE — `--admin-chart-grid` 5종 톤 정의 (별 트랙 B-1) | +20~30줄 |
| Supabase DB | **RPC 4종 신설** + 권한 정합 | 함수 4 + REVOKE/GRANT 12 + COMMENT 4 |
| 라이브 회귀 의뢰서 | 신설 — `docs/specs/admin_v2_d5_live_regression_<date>.md` | ~30항목 |

**제외 (D-5 범위 외):**
- 신규 vs 기존 사용자 분리 (L-5 (b) Phase E 코호트 분석)
- "📅 기간 선택" / "📤 리포트 PDF" 실 작동 (L-10 (a) 토스트 "Phase E")
- 6메뉴 외 라이브 raw target_type 추가 표시 (L-4 (b) 매핑 6종 고정 — 별 트랙)
- B-1 dashboard 차트 마이그레이션 (별 트랙 B-2와 묶어 D-8에서 처리)

---

## 3. Step 분할 (6단계 — RPC 4종으로 Step 2·3 분리)

### Step 1 — 사전 검증 (DB·코드 변경 0건)

#### 1-1. SELECT 검증 (Supabase Dashboard SQL Editor — Chrome 위임)

```sql
-- ① 신버전 DB 확인 (CLAUDE.md 강제)
SELECT current_database();

-- ② activity_logs 90일 raw 카운트 + target_type 분포 (L-4 매핑 raw 검증)
SELECT COUNT(*) AS total_90d
FROM public.activity_logs
WHERE created_at >= now() - interval '90 days';

SELECT target_type, COUNT(*) AS cnt
FROM public.activity_logs
WHERE target_type IS NOT NULL
GROUP BY target_type
ORDER BY cnt DESC LIMIT 20;

-- ③ users 가입 + 활동 분포 (L-8 리텐션 D-30 raw — created_at + last_seen_at)
SELECT COUNT(*) AS total_users FROM public.users;

SELECT
  COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days') AS users_new_30d,
  COUNT(*) FILTER (WHERE last_seen_at IS NOT NULL) AS users_with_last_seen,
  COUNT(*) FILTER (WHERE last_seen_at >= now() - interval '7 days') AS users_active_7d,
  COUNT(*) FILTER (WHERE last_seen_at >= now() - interval '30 days') AS users_active_30d
FROM public.users;

-- ④ activity_logs RLS 정책 raw (D-pre.6/7/8 회귀 + D-6 Step 1.5 admin_read_all_logs is_admin() 통일 회귀)
SELECT policyname, cmd, qual AS using_clause
FROM pg_policies
WHERE schemaname='public' AND tablename='activity_logs'
ORDER BY cmd, policyname;

-- ⑤ RPC 충돌 확인 (get_dau / get_wau / get_mau / get_feature_usage / get_retention_d30)
SELECT proname, pronargs, prokind
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('get_dau', 'get_wau', 'get_mau', 'get_feature_usage', 'get_retention_d30');

-- ⑥ activity_logs 인덱스 raw (D-6 Step 1 ⑥ 정합 — idx_activity_logs_user_id + created_at)
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname='public' AND tablename='activity_logs'
ORDER BY indexname;

-- ⑦ is_admin() 함수 존재 확인 (RPC 4종이 USING (is_admin()) 가드 — D-pre.7/8 통일 회귀)
SELECT proname, prosecdef AS security_definer, provolatile
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace AND proname = 'is_admin';
```

#### 1-2. 검증 통과 기준

| # | 기준 | 영향 |
|:--:|---|---|
| ① | `postgres` 1행 | 신버전 확인 |
| ② | total_90d ≥ 1 / target_type 분포 ≥ 1종 (script 580 추정 — D-6 Step 1 ③ 정합) | L-4 매핑 정합 |
| ③ | total_users ≥ 1 / users_active_30d ≥ 1 (리텐션 D-30 산식 raw) | L-8 정의 정합 |
| ④ | RLS 6건 — admin SELECT `is_admin()` 단일 호출 (D-6 Step 1.5 회귀) | D-pre 회귀 |
| ⑤ | 5건 모두 0행 (RPC 충돌 0) | RPC 신설 안전 |
| ⑥ | 인덱스 ≥ 1건 (`idx_activity_logs_user_id` + `idx_activity_logs_created_at` 활용) | RPC 성능 정당화 |
| ⑦ | is_admin() 1행 / `security_definer = true` / `provolatile = 's'` (STABLE) | RPC 4종 가드 표준 |

→ ①·④·⑤·⑦ FAIL 시 D-5 진입 차단. ②·③·⑥ FAIL 시 결정 분기.

### Step 2 — RPC 4종 SQL 본 작성 + 권한 정합 (Chrome 위임, 1트랜잭션)

#### 2-1. RPC 4종 시그니처

| RPC | 시그니처 | 데이터 원천 | 매핑 |
|---|---|---|---|
| `get_dau(start_date date, end_date date)` | `RETURNS TABLE(day date, dau bigint)` | `activity_logs.user_id` distinct GROUP BY day::date | DAU 90일 라인차트 |
| `get_wau()` | `RETURNS bigint` | 지난 7일 distinct user_id | WAU KPI |
| `get_mau()` | `RETURNS bigint` | 지난 30일 distinct user_id | MAU KPI |
| `get_feature_usage(start_date date, end_date date)` | `RETURNS TABLE(feature text, count bigint)` | activity_logs.target_type GROUP BY (L-4 (b) 6종 매핑) | 6메뉴 막대 |
| `get_retention_d30()` | `RETURNS numeric` | users 가입 후 30일 이내 last_seen_at 갱신 비율 | 리텐션 D-30 KPI |

#### 2-2. RPC 4종 표준 패턴 (L-9 — D-2 별 트랙 #3 정합)

각 RPC 모두:
- `LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public`
- `IF NOT public.is_admin() THEN RAISE EXCEPTION 'permission denied' USING ERRCODE = '42501'; END IF;`
- `REVOKE ALL ON FUNCTION ... FROM PUBLIC;` + `GRANT EXECUTE ON FUNCTION ... TO authenticated;` + `REVOKE EXECUTE ON FUNCTION ... FROM anon;`
- `COMMENT ON FUNCTION ...` 메타 추가

→ 본 SQL 본문은 Step 1 통과 후 별도 발행 (1트랜잭션, ~150~200줄 SQL).

### Step 3 — RPC 정합 검증 12건 (Chrome 위임)

각 RPC × 3 검증 = 12건:

| RPC | 검증 1 (anon 차단) | 검증 2 (authenticated admin 호출) | 검증 3 (결과 raw) |
|---|---|---|---|
| `get_dau` | anon JWT 호출 → 42501 | admin 호출 → 90일 raw | rows = 0 ~ 90 (날짜별) |
| `get_wau` | 동일 | 동일 | bigint ≥ 0 |
| `get_mau` | 동일 | 동일 | bigint ≥ 0 |
| `get_feature_usage` | 동일 | 동일 | rows ≤ 20 / target_type 분포 |
| `get_retention_d30` | 동일 | 동일 | 0.0 ≤ numeric ≤ 100.0 |

(get_wau / get_mau는 정적 함수로 검증 1·2·3 동일 패턴, 1 RPC당 3 검증 = 5 RPC × 3 = 15건. 그러나 wau/mau는 묶어서 12건 권장.)

### Step 4 — js/admin_v2.js 확장 (~300~400줄)

#### 4-1. fetch 함수 (RPC 4종 호출)

| 함수 | 시그니처 | RPC |
|---|---|---|
| `fetchAnalyticsKPI()` | `→ Promise<{dau, wau, mau, retention}>` | get_dau (오늘만) + get_wau + get_mau + get_retention_d30 (Promise.all 4종) |
| `fetchDAU90d(days)` | `→ Promise<Array<{day, dau}>>` | get_dau (90/30/7일 동적) |
| `fetchFeatureUsage(days)` | `→ Promise<Array<{feature, count}>>` | get_feature_usage (90/30/7일 동적) |

#### 4-2. render 함수 4종

| 함수 | 슬롯 ID |
|---|---|
| `renderAnalyticsKPI({dau, wau, mau, retention})` | `adm-analytics-kpi-grid` (4 KPI 카드) |
| `renderDAUChart(rows, days)` | `adm-analytics-dau-chart` (SVG 라인차트 area + line + grid) |
| `renderFeatureUsage(rows)` | `adm-analytics-feature-usage` (6메뉴 막대) |
| `renderAnalyticsMeta()` | KPI 메타 (집계 윈도우 KST 자정 기준 표시) |

#### 4-3. 진입점 + 시간축 토글

```js
window.admLoadAnalytics = async function () {
  if (!window.db) return;
  var [kpi, dau, feat] = await Promise.all([
    fetchAnalyticsKPI(), fetchDAU90d(90), fetchFeatureUsage(90)
  ]);
  if (!document.querySelector('.adm-view[data-view="analytics"].active')) return;
  if (kpi)  renderAnalyticsKPI(kpi);
  if (dau)  renderDAUChart(dau, 90);
  if (feat) renderFeatureUsage(feat);
};

window.admAnalyticsTimeRange = function (days) {
  // 90 / 30 / 7 토글 (L-3 (a) default 90)
  Promise.all([fetchDAU90d(days), fetchFeatureUsage(days)]).then(function (r) {
    if (r[0]) renderDAUChart(r[0], days);
    if (r[1]) renderFeatureUsage(r[1]);
  });
};
```

### Step 5 — admin_v2.html mock 제거 + B-1 grid 토큰 (별 트랙 묶음)

#### 5-1. admin_v2.html 변경 (라인 1810~1955)

| 변경 | 내용 |
|---|---|
| § 헤더 라벨 | `[Phase C mock]` → `[v1.1 라이브 — RPC 4종 + activity_logs 정합]` |
| KPI 4카드 | mock 텍스트(342/1,028/2,847/47%) → 슬롯 id 부여 (`adm-analytics-kpi-dau` 등 4종) |
| DAU 90일 차트 | SVG 정적 → `<svg id="adm-analytics-dau-chart">` 빈 호스트 + grid line CSS 변수화 |
| 6메뉴 막대 | mock 6종 정적 → `<div id="adm-analytics-feature-usage">` 빈 호스트 |
| 시간축 토글 | onclick=`window.admAnalyticsTimeRange(90/30/7)` |
| "📅 기간 선택" / "📤 리포트 PDF" | onclick → 토스트 "Phase E" (L-10 (a)) |

#### 5-2. css/tokens.css B-1 grid 토큰 신설 (5종 톤)

```css
/* 별 트랙 B-1 — chart grid line 토큰 (D-5 도입, dashboard·D-3 별 트랙 묶음 D-8) */
:root[data-admin-tone="light"] {
  --admin-chart-grid: rgba(0, 0, 0, 0.08);
}
:root[data-admin-tone="warm"],
:root[data-admin-tone="slate"],
:root[data-admin-tone="black"],
:root[data-admin-tone="navy"] {
  --admin-chart-grid: rgba(255, 255, 255, 0.10);
}
```

→ admin_v2.html 차트 SVG에서 `stroke="var(--admin-chart-grid)"` 적용 (5종 톤 자동 정합).

### Step 6 — 라이브 회귀 의뢰서 발행 + 잔존 부채 등록 + _INDEX.md 갱신

#### 6-1. 의뢰서 신설 — `docs/specs/admin_v2_d5_live_regression_<date>.md` (~30항목)

| 섹션 | 수 | 핵심 |
|---|:--:|---|
| § 1 정의 raw | 4 | typeof admLoadAnalytics / mock 잔존 0 / RPC 4종 시그니처 / B-1 토큰 정의 |
| § 2 실 동작 | 12 | KPI 4 + DAU 90일 차트 + 6메뉴 막대 + 시간축 토글 90/30/7 |
| § 4 RBAC | 3 | 비-admin 차단 / RPC anon 차단 / admin SELECT |
| § 5 콘솔·네트워크 | 5 | Error 0 / 4xx 0 / 병렬 호출 (Promise.all 4 RPC) / D-1·D-2·D-3·D-4·D-6 회귀 / race |
| § 6 성능 | 6 | RPC P1~P4 + P5 차트 렌더 + P6 진입 총 시간 |
| **합계** | **30** | |

#### 6-2. D-5 잔존 부채 후보

| # | 항목 | 권장 처리 |
|:--:|---|---|
| 1 | 신규 vs 기존 사용자 코호트 분석 (L-5 (b)) | Phase E |
| 2 | "📅 기간 선택" 실 작동 (L-10 (a) Phase E) | Phase E |
| 3 | "📤 리포트 PDF" (L-10 (a) Phase E) | Phase E |
| 4 | dashboard 차트 B-1 grid 토큰 마이그레이션 | D-8 (별 트랙 B-2와 묶음) |
| 5 | 6메뉴 외 target_type 추가 표시 (L-4 (b) 매핑 외 분포) | 별 트랙 |
| 6 | DAU/WAU/MAU 시드 데이터 (L-6 0 표시 → 실 raw) | 5/12 4팀 오픈 후 자연 누적 |

#### 6-3. _INDEX.md 갱신

- 헤더 마지막 갱신 시점
- Phase D 표 D-5 행 → "✅ 완전 종료 (NN/30 PASS)"
- 통합본 v1.1 § 11.2 잔여 견적 ~8.3 → ~6.5세션 (D-5 1.8 차감)
- 다음 세션 인계 노트에 D-9 ⚙️ 화면설정 진입 가능 표기

#### 6-4. 라이브 회귀 PASS 후 commit + push

본 D-5는 단계 많아 commit 분할:
- commit A: 작업지시서 발행 + Step 1 raw
- commit B: RPC 4종 SQL (Step 2) + 검증 12건 (Step 3) capture mini-doc
- commit C: js/admin_v2.js + admin_v2.html + tokens.css (Step 4·5)
- commit D: 회귀 의뢰서 (Step 6)
- commit E: NN/30 PASS 완전 종료 + _INDEX.md 갱신

---

## 4. 절대 원칙 (통합본 v1.1 § 10.1 인용)

15건 모두 D-5 진입 시 적용. 본 단계 핵심:
- **#1** CLAUDE.md 신버전 확인 (Step 1 ① 강제)
- **#3** admin/role 검증 = SECURITY DEFINER `is_admin()` (RPC 4종 가드)
- **#4** DB 메타 통과 ≠ 라이브 안전 → Step 6 의뢰서 필수
- **#5** RPC SECURITY DEFINER + REVOKE/GRANT 표준 (D-2 별 트랙 #3 정합)
- **#11** race 안전장치 — fetch 응답 도착 시 active view 재확인 (Step 4 admLoadAnalytics)
- **#12** mock UI 보존 vs 동적화 — L-6 "데이터 수집 중" 라벨 표준 + L-10 mock 보존 (D-3 J-2 (b) / D-4 K-1 (c) / D-6 M-2 (c) 패턴 누적)
- **#14** RPC cold-start 대비 (D-2 별 트랙 #3 학습 — STABLE SECURITY DEFINER)

---

## 5. 보고 양식 (Step 1 → 6 진행 중)

### 5.1 Step 1 사전 검증 결과 보고 (Chrome → Code)

각 SQL ① ~ ⑦ 결과 raw + 통과/실패 표 (D-6 6/6 + ⑦ 추가)

### 5.2 Step 2 RPC 4종 SQL 발행 (Code → Chrome)

1트랜잭션 SQL ~150~200줄 발행

### 5.3 Step 3 RPC 정합 검증 12건 (Chrome → Code)

각 RPC × 3 검증 = 12건 raw

### 5.4 Step 4·5 코드 변경 보고 (Code → 팀장님)

- diff stat
- 신규 함수 7~9종 + render 4종 + B-1 토큰 신설
- admin_v2.html mock 제거 + 슬롯 ID + 시간축 토글 + tokens.css B-1

### 5.5 Step 6 라이브 회귀 의뢰서 발행 + Chrome 위임

### 5.6 Step 6 라이브 회귀 결과 (Chrome → Code)

NN/30 PASS + FAIL raw

### 5.7 _INDEX.md 갱신 + 다음 세션 인계 노트

---

## 6. 산출물 위치

| 산출물 | 경로 | 시점 |
|---|---|---|
| 본 작업지시서 | `docs/specs/admin_v2_d5_workorder.md` | 2026-05-05 |
| 사전 검증 SQL 결과 raw | (이 화면 / Chrome 회신) | Step 1 |
| RPC 4종 SQL 본문 | (Step 2 발행) | Step 2 |
| RPC 정합 검증 raw | (Chrome 회신) | Step 3 |
| js/admin_v2.js 확장본 | `js/admin_v2.js` | Step 4 |
| admin_v2.html mock 제거본 | `pages/admin_v2.html` | Step 5 |
| tokens.css B-1 토큰 | `css/tokens.css` | Step 5 |
| 라이브 회귀 의뢰서 | `docs/specs/admin_v2_d5_live_regression_<date>.md` | Step 6 |
| _INDEX.md 갱신 | `docs/sessions/_INDEX.md` | Step 6 |

---

## 7. 잔존 부채 (D-5 후 별 트랙 처리)

본 작업지시서 § 3.6.2 표 + D-1~D-4·D-6 잔존 누적 (통합본 § 1.5 표 + 별 트랙 후보 표 § B-1 통합).

---

## 8. 참고

- 통합 작업지시서 v1.1: `docs/specs/admin_v2_d3_to_dfinal_workorder_v1.md` § 4 (D-5 사전 분석)
- D-2 작업지시서·회귀 의뢰서 (RPC 패턴 원본): `admin_v2_d2_workorder.md` + `admin_v2_d2_live_regression_2026-05-04.md`
- D-2 별 트랙 #3 RPC `get_stage_distribution` (참고 패턴): `js/admin_v2.js` 라인 ~ + DB 함수
- D-6 작업지시서·회귀 의뢰서 (검색·필터 디바운스 + activity_logs 정합 원본): `admin_v2_d6_workorder.md` + `admin_v2_d6_live_regression_2026-05-05.md`
- D-pre 시리즈 capture: `docs/architecture/db_pre_dpre6_capture.md` + `db_pre_dpre7_capture.md` + `db_pre_dpre8_capture.md`
- 별 트랙 후보 표: 통합본 § (별 트랙 후보) B-1 차트 grid line 5종 톤 무대비

---

*본 작업지시서는 D-pre.5/6/7/8 + D-1~D-4 + D-6 학습 전건 반영. 적용 시 Step 1 → 2 → 3 → 4·5 → 6 순차 진행. 팀장님 승인 없이 Code 단독 진행 금지 (Step별 결과 보고 → 다음 Step 진입 승인 대기). 단일 세션 완주 어려울 수 있음 — Step 1·2·3까지 본 세션 우선 / Step 4·5·6 다음 세션 분할 가능.*
