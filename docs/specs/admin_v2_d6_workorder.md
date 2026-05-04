# admin_v2 Phase D-6 작업지시서 — logs 섹션 실 데이터 연결

> **작성일:** 2026-05-05
> **작성자:** Claude Code
> **선행 산출물:**
> - 통합 작업지시서 v1.1: `docs/specs/admin_v2_d3_to_dfinal_workorder_v1.md` § 5 (D-6 사전 분석)
> - D-pre 시리즈: `admin_v2_phase_d_pre.md` + D-pre.5/6/7/8 capture 4건
> - D-1/D-2/D-3/D-4 작업지시서·의뢰서 패턴 정합
> **결재 결과:** 2026-05-05 M-1~M-6 일괄 승인 (옵션 I 권장값 6건)
> **상태:** 🟢 Step 1 사전 검증 진입 즉시 가능

---

## 0. 큰 그림 정합성 검증 (D-1·D-2·D-3·D-4 종료 시점)

1. `docs/sessions/_INDEX.md` 메인 트랙 = admin_v2 Phase D 진행 중 ✅
2. D-1 17/17 / D-2 24/25 / D-3 25/25 / D-4 20/20 PASS 완전 종료 ✅
3. 통합 작업지시서 v1.1 § 11.1 권장 진입 순서: D-3 → D-4 → **D-6** → D-5 → D-9 → D-7(나) → D-8 → D-final ✅
4. D-6 본 작업지시서 = 통합본 § 5 인용 + Step 분할 본문 ✅
5. 차단 조건 없음 → Step 1 사전 검증 진입

**현재 잔존 별 트랙 (병렬 가능, D-6 차단 0):**
- P3 PostgREST 분석 (Phase E 격상)
- scripts 보강 Step 1·3·4 Web 의뢰서 작성
- board seed data 다양화 (D-3 부채 #6, 별 트랙)
- notice seed data 다양화 (D-4 부채, 별 트랙)
- D-9 ⚙️ 화면설정 (D-5 후 진입 권장)

---

## 1. 작업 배경

### 1.1 목표

admin_v2.html `logs` 섹션의 Phase C mock(검색·필터바 + 12행)을 실 Supabase activity_logs 데이터로 전환 + 검색·4필터 디바운스 + SYSTEM 행 mock 보존 (M-2 (c)).

### 1.2 결재 결과 (M-1 ~ M-6, 2026-05-05 일괄 승인)

| # | 결정 | 채택 | 영향 |
|:--:|---|---|---|
| **M-1** | 검색 인덱스 | **(b) 단순 LIKE** | PostgREST `or=(action.ilike.*q*,target.ilike.*q*)` 패턴. event_type GIN 인덱스 신설 X (성능 raw 측정 후 격상 가능) |
| **M-2** ⭐ | system_logs 처리 | **(c) mock 보존 + 별 트랙 Sentry 위임** (D-3 J-2 (b) / D-4 K-1 (c) 패턴 정합) | activity_logs 실 데이터 + SYSTEM 2행 mock 합치기. system_logs 테이블 신설 X |
| **M-3** | 필터 우선순위 | **날짜 → 사용자 → 액션 → 결과** 표준 채택 | UI 좌→우 배치 정합 |
| **M-4** | 시간축 default | **(a) 오늘** (`new Date().toISOString().slice(0,10)`) | 진입 시 자동 today 선택 |
| **M-5** | 로그 보존 정책 | **(b) 영구** D-6 범위 외 (별 트랙) | 자동 삭제 trigger 신설 X |
| **M-6** | CSV 내보내기 | **(b) Phase E** | "📤 CSV" 버튼 클릭 시 토스트 "Phase E 대기" |

### 1.3 D-1·D-2·D-3·D-4 결정 승계 (전 단계 공통 — G-*/H-*)

| # | 결정 | 본 단계 적용 |
|:--:|---|---|
| **G-1** | ROLE_LABEL admin = "어드민" | logs 테이블 `사용자` 컬럼 role 라벨 매핑 적용 |
| **H-1** | fetch 호출 = `window.db.fetch()` (401 자동 갱신) | 모든 함수 적용 |
| **H-2** | 페이징 = 20행 / **300ms** 디바운스 / AND / count=exact | 검색 input 300ms 디바운스 + 12행 표시(D-6 mock 정합) → "전체 보기" Phase E |
| **H-3** | 401 자동 / 403 admExit / 500 토스트 / 1회 재시도 / Sentry hook | 모든 함수 적용 |
| **추-1** | js/admin_v2.js 확장 (D-1/D-2/D-3 패턴) | logs 섹션 함수 5~7종 추가 (~180~220줄) |
| **추-2** | mock 제거 시 12행 → 실 activity_logs + SYSTEM 2행 mock 합치기 | M-2 (c) 정합 |
| **추-3** | 라이브 회귀 의뢰서 발행 (Chrome 위임) | ~20항목 |
| **추-4** | RLS 회귀 검증 | activity_logs RLS admin SELECT 정합 (Step 1 ⑤ — D-pre.6/7 청산 회귀) |

---

## 2. 변경 범위 (2파일 + DB 변경 0건)

| 파일 | 변경 유형 | 라인 |
|---|---|---|
| `js/admin_v2.js` | UPDATE — D-1 검색·필터 디바운스 패턴 정합 — fetchActivityLogs + renderLogsTable + 4필터 핸들러 + admLoadLogs + race 안전장치 | 끝부분 +180~220줄 |
| `pages/admin_v2.html` | UPDATE — logs mock 제거 + 슬롯 ID + 라벨 갱신 + 4필터 input/select id 부여 | 라인 2000~2162 (~162줄 영향) |
| Supabase DB | **변경 0건** — activity_logs 정합 (D-pre.6/7 청산 회귀만). M-1 (b) LIKE로 인덱스 신설 X / M-2 (c) system_logs 미신설 / M-5 (b) 보존 trigger X | 0 |
| 라이브 회귀 의뢰서 | 신설 — `docs/specs/admin_v2_d6_live_regression_2026-05-05.md` | ~20항목 |

**제외 (D-6 범위 외):**
- system_logs 테이블 신설 (M-2 (c) mock 보존 — Sentry 위임 별 트랙)
- event_type GIN 인덱스 (M-1 (b) — 성능 raw 측정 후 격상 가능)
- 로그 보존 정책 trigger (M-5 (b) 영구 보관 — 별 트랙)
- CSV 내보내기 실 작동 (M-6 (b) Phase E — 본 D-6에서는 "📤 CSV" 버튼 클릭 시 토스트만)
- 전체 보기 페이징 (H-2 페이징 패턴은 본 D-6 12행 표시 + 5,847건 메타에서는 미적용 — Phase E)
- "🔄 새로고침" 버튼 실 작동 (본 D-6에서는 admLoadLogs 재호출만 — 별 별도 사양 없음)

---

## 3. Step 분할 (5단계 — D-2·D-3·D-4 패턴, RPC 0건)

### Step 1 — 사전 검증 (DB·코드 변경 0건)

#### 1-1. SELECT 검증 (Supabase Dashboard SQL Editor — Chrome 위임)

```sql
-- ① 신버전 DB 확인 (CLAUDE.md 강제)
SELECT current_database();

-- ② activity_logs 컬럼 raw + 전수 행 수 + 최신 5행 raw (M-3 필터 매핑 정합)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='activity_logs'
ORDER BY ordinal_position;

SELECT COUNT(*) AS total FROM public.activity_logs;

SELECT * FROM public.activity_logs
ORDER BY created_at DESC NULLS LAST
LIMIT 5;

-- ③ action / target / result 컬럼 분포 (M-3 4필터 매핑 raw — admin_v2.html 라인 2028~2041 select 옵션 정합)
-- 컬럼명은 ② 결과 raw에 따라 정확화. 추정: action / target / result 또는 event_type / target_table / status
-- ②에서 컬럼명 raw 확인 후 본 ③을 컬럼명에 맞춰 재실행
SELECT action, COUNT(*) AS cnt FROM public.activity_logs GROUP BY action ORDER BY cnt DESC LIMIT 20;
SELECT target, COUNT(*) AS cnt FROM public.activity_logs WHERE target IS NOT NULL GROUP BY target ORDER BY cnt DESC LIMIT 20;
SELECT result, COUNT(*) AS cnt FROM public.activity_logs GROUP BY result ORDER BY cnt DESC;

-- ④ users.role 분포 (RBAC 정합 회귀 — D-pre.6 9역할 정합 회귀 검증)
SELECT role, COUNT(*) AS cnt
FROM public.users
GROUP BY role
ORDER BY cnt DESC;

-- ⑤ activity_logs RLS 정책 raw (D-pre.6/7 청산 회귀 — 인라인 EXISTS 0건 / is_admin() 통일 검증)
SELECT policyname, cmd, roles, qual AS using_clause, with_check AS with_check_clause
FROM pg_policies
WHERE schemaname='public' AND tablename='activity_logs'
ORDER BY cmd, policyname;

-- ⑥ activity_logs 인덱스 raw (M-1 (b) LIKE 정당화 — event_type GIN 인덱스 부재 확인)
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname='public' AND tablename='activity_logs'
ORDER BY indexname;
```

#### 1-2. 검증 통과 기준

| # | 기준 | 영향 |
|:--:|---|---|
| ① | `postgres` 1행 | 신버전 확인 |
| ② | total ≥ 1 / 컬럼 6종 raw 확인 (created_at + user_id + action + target + result + 1종 추가 추정) | M-3 필터 매핑 raw 정합 |
| ③ | action 분포 ≥ 6종 / target 분포 ≥ 1종 / result 분포 (성공/실패/대기/경고) ≥ 2종 | 4필터 select 옵션 정합 + mock 6종 액션 옵션과 비교 |
| ④ | 9역할 (admin / ga_* 4종 / insurer_* 4종) 분포 정합 | D-pre.6 회귀 |
| ⑤ | RLS — admin SELECT 정합 (D-pre.7/8 학습 적용 — 인라인 EXISTS 0건 / `is_admin()` 통일) | D-pre 회귀 |
| ⑥ | 인덱스 ≥ 1건 (`(user_id, created_at DESC)` 추정 — 통합본 § 5.3) / event_type GIN 인덱스 부재 (M-1 (b) 정합) | 검색 성능 정당화 |

→ ① ⑤ FAIL 시 D-6 진입 차단. ② ~ ④ FAIL 시 결정 분기 (예: ② 컬럼 raw 차이 시 Step 2 fetch SELECT 컬럼 수정).

### Step 2 — js/admin_v2.js 확장 (D-1 검색·필터 디바운스 패턴 정합, ~180~220줄)

#### 2-1. fetch 함수

| 함수 | 시그니처 | 정합 |
|---|---|---|
| `SYSTEM_LOGS_MOCK` (배열) | 2~3행 — admin_v2.html 라인 2102~2107(API 응답 지연) + 라인 2134~2139(DB connection timeout) raw 그대로 | M-2 (c) mock 보존 |
| `fetchActivityLogs(opts)` | `→ Promise<{ rows, total }>` | `window.db.fetch()` + `?select=*&order=created_at.desc&limit=12` + opts 분기: search → `or=(action.ilike.*q*,target.ilike.*q*)` / date → `created_at=gte.*&created_at=lt.*+1d` / userId → `user_id=eq.*` / action → `action=eq.*` / result → `result=eq.*` |
| `mergeSystemLogsMock(rows, opts)` | `(rows, opts) → mergedRows` | M-2 (c) — opts 시간 범위에 SYSTEM mock 시각 포함 시 합쳐서 정렬. 사용자/액션/결과 필터 활성 시 SYSTEM 자동 제외 |

#### 2-2. render 함수 + 디바운스 핸들러

| 함수 | 슬롯 ID | 정합 |
|---|---|---|
| `renderLogsTable(rows)` | `adm-logs-tbody` (admin_v2.html `<tbody id="adm-logs-tbody">`) | 12행 row → 시각 / 사용자 + role badge / 액션 / 대상 / 결과 badge / 상세. SYSTEM 행은 user_id null + 시스템/오류 badge |
| `renderLogsMeta(total)` | `adm-logs-meta` (admin_v2.html `.adm-panel-meta` host) | "최근 N건 · 전체 NN,NNN건" |
| `admLogsSearch` (debounced 300ms) | input `id="adm-logs-search"` | H-2 정합 |
| `admLogsFilterDate(val)` | input `id="adm-logs-date"` | M-3 #1 |
| `admLogsFilterUser(val)` | select `id="adm-logs-user-filter"` | M-3 #2 |
| `admLogsFilterAction(val)` | select `id="adm-logs-action-filter"` | M-3 #3 |
| `admLogsFilterResult(val)` | select `id="adm-logs-result-filter"` | M-3 #4 |

#### 2-3. 진입점 + race 안전장치

```js
window.admLoadLogs = async function () {
  if (!window.db) return;
  // M-4 (a): 진입 시 today default
  var today = new Date().toISOString().slice(0,10);
  var dateInput = document.getElementById('adm-logs-date');
  if (dateInput && !dateInput.value) dateInput.value = today;

  var result = await fetchActivityLogs({ date: dateInput ? dateInput.value : today });
  if (!document.querySelector('.adm-view[data-view="logs"].active')) return; // race
  if (result) {
    var merged = mergeSystemLogsMock(result.rows, { date: dateInput.value });
    renderLogsTable(merged);
    renderLogsMeta(result.total);
  }
  attachLogsHandlers();
};
```

### Step 3 — admin_v2.html mock 제거 + 슬롯 ID 부여

#### 3-1. 변경 라인 2000~2162

| 변경 | 라인 | 내용 |
|---|---|---|
| § 헤더 라벨 | 2007 | `[Phase C mock]` → `[v1.1 라이브 — activity_logs 정합]` |
| 검색 input | 2019 | `id="adm-logs-search" oninput="admLogsSearch(this.value)"` |
| date input | 2021 | `id="adm-logs-date" onchange="admLogsFilterDate(this.value)"` (value 빈값 — JS에서 today default 주입) |
| user select | 2022~2027 | `id="adm-logs-user-filter" onchange="admLogsFilterUser(this.value)"` (옵션은 mock 그대로 — 동적 채움 별 트랙) |
| action select | 2028~2036 | `id="adm-logs-action-filter" onchange="admLogsFilterAction(this.value)"` (옵션 mock 그대로 — Step 1 ③ raw 후 정합 검토) |
| result select | 2037~2041 | `id="adm-logs-result-filter" onchange="admLogsFilterResult(this.value)"` |
| § 패널 메타 | 2049 | `<div class="adm-panel-meta" id="adm-logs-meta">로딩…</div>` |
| 로그 테이블 | 2060~2157 | mock 12행 정적 → `<tbody id="adm-logs-tbody"></tbody>` 빈 호스트 |
| view 라우팅 | js/admin_v2.js 진입점 routing | `else if (viewKey === 'logs') window.admLoadLogs();` |
| race 안전장치 | js/admin_v2.js 끝부분 | (Step 2 진입점 내부에 포함됨) |
| CSV / 새로고침 | 2010~2011 | `📤 CSV` → `onclick="window.admToast('Phase E 대기 — CSV 내보내기')"` (M-6 (b)) / `🔄 새로고침` → `onclick="window.admLoadLogs()"` |

### Step 4 — 라이브 회귀 검증 의뢰서 발행

#### 4-1. 의뢰서 신설 — `docs/specs/admin_v2_d6_live_regression_2026-05-05.md` (~20항목)

| 섹션 | 수 | 핵심 |
|---|:--:|---|
| § 1 정의 raw (D1~D3) | 3 | typeof admLoadLogs / mock 잔존 0 / activity_logs raw |
| § 2 실 동작 (L1~L9) | 9 | 진입(today default) / 검색 디바운스 300ms / 4필터 (날짜/사용자/액션/결과) / 12행 표시 / SYSTEM 2행 mock 합쳐 표시 / 정렬 created_at DESC / 새로고침 / CSV 토스트 / 전체 보기 |
| § 4 RBAC (R1~R2) | 2 | 비-admin 차단 / admin SELECT |
| § 5 콘솔·네트워크 (C1~C4) | 4 | Error 0 / 4xx 0 / 검색 GET PostgREST / D-1·D-2·D-3·D-4 회귀 |
| § 6 성능 (P1~P2) | 2 | P1 검색 1회 (warm) / P2 진입 총 시간 (cold/warm) |
| **합계** | **20** | |

### Step 5 — 잔존 부채 등록 + _INDEX.md 갱신

#### 5-1. D-6 잔존 부채 후보

| # | 항목 | 권장 처리 |
|:--:|---|---|
| 1 | **system_logs 테이블 신설 + Sentry 통합** (M-2 (c) 별 트랙) | Sentry SDK 도입 시점 또는 v2.0 |
| 2 | event_type GIN 인덱스 (M-1 (b) — 성능 raw 측정 후 격상) | P1 ≥ 800ms 기록 누적 시 별 트랙 |
| 3 | 로그 보존 정책 trigger 90일/1년 (M-5 (b) 영구 → 변경 시) | 데이터 누적 raw 검토 후 별 트랙 |
| 4 | CSV 내보내기 실 작동 (M-6 (b) Phase E) | Phase E (D-7/D-8 후) |
| 5 | 전체 보기 페이징 (H-2 정합 — 12행 → 20행/페이지) | Phase E |
| 6 | 사용자 필터 select 동적 채움 (현재는 mock 4명 옵션 그대로) | 별 트랙 (D-1 users 데이터 join) |
| 7 | 액션 select 옵션 raw 정합 (Step 1 ③ 분포 확인 후) | Step 1 결과로 분기 결정 |

#### 5-2. _INDEX.md 갱신 (Step 4 PASS 회신 후)

- 헤더 마지막 갱신 시점
- Phase D 표 D-6 행 → "✅ 완전 종료 (라이브 회귀 NN/20 PASS)"
- 다음 세션 인계 노트에 D-5 analytics 진입 가능 표기 (통합본 § 11.1 권장 진입 순서 정합)

#### 5-3. 라이브 회귀 PASS 후 commit + push

- D-6 본 작업 commit (Step 2 + 3) + 의뢰서 commit (Step 4) + _INDEX.md commit (Step 5)
- 단일 commit 묶음 가능 (G-3 단일 커밋 정합)

---

## 4. 절대 원칙 (통합본 v1.1 § 10.1 인용)

15건 모두 D-6 진입 시 적용. 본 단계 핵심:
- **#1** CLAUDE.md 신버전 확인 (Step 1 ① 강제)
- **#3** admin/role 검증 = SECURITY DEFINER `is_admin()` (activity_logs RLS 회귀)
- **#4** DB 메타 통과 ≠ 라이브 안전 → Step 4 의뢰서 필수
- **#11** race 안전장치 — fetch 응답 도착 시 active view 재확인 (Step 2-3 admLoadLogs)
- **#12** mock UI 보존 vs 동적화 분리 — M-2 (c) SYSTEM 행 mock 보존 + activity_logs 동적 (D-3/D-4와 다른 하이브리드 패턴)
- **#13** 검색 디바운스 300ms = H-2 표준 (D-1 정합)

---

## 5. 보고 양식 (Step 1 → 5 진행 중)

### 5.1 Step 1 사전 검증 결과 보고 (Chrome → Code)

각 SQL ① ~ ⑥ 결과 raw + 통과/실패 표 (D-4 6/6 패턴)

### 5.2 Step 2·3 코드 변경 보고 (Code → 팀장님)

- diff stat
- 신규 함수 7~9종 (fetch 1 + render 2 + 디바운스 핸들러 5 + 진입점 1 + merge 1)
- admin_v2.html mock 제거 + 슬롯 ID 부여 + 라벨 갱신

### 5.3 Step 4 라이브 회귀 의뢰서 발행 + Chrome 위임

### 5.4 Step 4 라이브 회귀 결과 (Chrome → Code)

NN/20 PASS + FAIL raw

### 5.5 Step 5 _INDEX.md 갱신 + 다음 세션 인계 노트

---

## 6. 산출물 위치

| 산출물 | 경로 | 시점 |
|---|---|---|
| 본 작업지시서 | `docs/specs/admin_v2_d6_workorder.md` | 2026-05-05 |
| 사전 검증 SQL 6건 결과 raw | (이 화면 / Chrome 회신) | Step 1 |
| js/admin_v2.js 확장본 | `js/admin_v2.js` | Step 2 |
| admin_v2.html mock 제거본 | `pages/admin_v2.html` | Step 3 |
| 라이브 회귀 의뢰서 | `docs/specs/admin_v2_d6_live_regression_2026-05-05.md` | Step 4 |
| _INDEX.md 갱신 | `docs/sessions/_INDEX.md` | Step 5 |

---

## 7. 잔존 부채 (D-6 후 별 트랙 처리)

본 작업지시서 § 3.5.1 표 그대로 + D-1·D-2·D-3·D-4 잔존 누적 (통합본 § 1.5 표 참조).

---

## 8. 참고

- 통합 작업지시서 v1.1: `docs/specs/admin_v2_d3_to_dfinal_workorder_v1.md` § 5 (D-6 사전 분석)
- D-1 작업지시서·회귀 의뢰서: `admin_v2_d1_workorder.md` + `admin_v2_d1_live_regression_2026-05-03.md` (검색·필터 디바운스 원본 패턴)
- D-2 작업지시서·회귀 의뢰서: `admin_v2_d2_workorder.md` + `admin_v2_d2_live_regression_2026-05-04.md` (P3 PostgREST 별 트랙 분리 사례)
- D-3 작업지시서·회귀 의뢰서: `admin_v2_d3_workorder.md` + `admin_v2_d3_live_regression_2026-05-04.md` (J-5 (b) RPC 격상 불필요 청산 사례)
- D-4 작업지시서·회귀 의뢰서: `admin_v2_d4_workorder.md` + `admin_v2_d4_live_regression_2026-05-04.md` (K-1 (c) v2.0 대기 + mock 보존 패턴)
- D-pre 시리즈 capture: `docs/architecture/db_pre_dpre6_capture.md` + `db_pre_dpre7_capture.md` + `db_pre_dpre8_capture.md`

---

*본 작업지시서는 D-pre.5/6/7/8 + D-1 + D-2 + D-3 + D-4 학습 전건 반영. 적용 시 Step 1 사전 검증 결과에 따라 Step 2 진입 결정. 팀장님 승인 없이 Code 단독 진행 금지 (Step 1 결과 보고 → Step 2 진입 승인 대기).*
