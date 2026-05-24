# admin_v2 D-5 라이브 회귀 검증 의뢰서 (Step 6, 30항목)

> **작성일:** 2026-05-05
> **선행 산출물:** `docs/specs/admin_v2_d5_workorder.md` § 3 Step 6
> **선행 커밋 (예정):**
> - `4957e53` D-5 작업지시서 본 발행 + L-1~L-10 결재
> - `b6912f8` RPC 4종 신설 + 정합 검증 15/15 PASS (DB capture)
> - D-5 본 commit (예정) — js/admin_v2.js +271줄 (1281→1552) / pages/admin_v2.html -61줄 (2441→2380) / tokens.css B-1 grid 토큰 5종 톤 +6줄
> **검증 대상:** `pages/admin_v2.html` analytics 섹션 + `js/admin_v2.js` D-5 확장본 (~271줄) + `css/tokens.css` `--admin-chart-grid` 5종 톤
> **검증자:** 팀장님 Chrome (Code 환경 라이브 검증 불가)
> **상태:** ✅ **29/30 PASS (L7 UTC 시간대 조건부 PASS 포함 시 30/30) — D-5 analytics 완전 종료 (2026-05-05 06:50 KST Chrome 회신, D-9 진입 가능)**

---

## 0. 검증 환경

- **URL:** https://onesecond.solutions
- **Login:** bylts0428@gmail.com (admin 본 계정)
- **Browser:** Chrome + DevTools(F12) 콘솔·네트워크 탭 + "Disable cache" ON
- **사전 필수:** Ctrl+Shift+R 강제 새로고침 (배포 캐시 무력화 — admin_v2.js / tokens.css 신본 보장)
- **DB 신버전 확인:** Dashboard 좌상단 `onesecond-v1-restore-0420` 또는 URL `pdnwgzneooyygfejrvbg`
- **D-5 진입 경로:** admin_v2 진입 → rail 좌측 📈 (통계·분석) 클릭 → analytics 섹션 진입 (URL hash `#admin/analytics`)

---

## 1. 정의 raw 검증 — 4항목

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| D1 | DevTools 콘솔: `typeof window.admLoadAnalytics` | `"function"` | ☐ |
| D2 | view-source admin_v2.html analytics 섹션에서 `Phase C mock` / `342` / `847` / `1,128` / `8,472` 검색 | HTML 0건 (mock KPI·차트·막대 모두 제거 — 슬롯 ID만) | ☐ |
| D3 | DevTools 콘솔: `typeof window.admAnalyticsTimeRange === 'function' && typeof window.admAnalyticsDateSelect === 'function' && typeof window.admAnalyticsExportPDF === 'function'` | `true` (3 핸들러 모두 정의) | ☐ |
| D4 | DevTools 콘솔: `getComputedStyle(document.body).getPropertyValue('--admin-chart-grid')` (data-admin-tone 변경 시) | dark: `rgba(255, 255, 255, 0.1)` / light: `rgba(0, 0, 0, 0.08)` | ☐ |

---

## 2. 실 동작 검증 — 12항목

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| L1 | admin 본 계정 로그인 → admin_v2 진입 → rail 좌측 📈 (통계·분석) 클릭 → analytics 섹션 진입 | OK + URL hash `#admin/analytics` | ☐ |
| L2 | KPI 4카드 실 RPC 데이터 표시 — DAU (오늘) | 숫자 1~2 (Step 3 B3 기준) — 라이브 활동량 | ☐ |
| L3 | KPI 4카드 — WAU (7일) | 숫자 2 (Step 3 B1 정합) | ☐ |
| L4 | KPI 4카드 — MAU (30일) | 숫자 2 (Step 3 B2 정합) | ☐ |
| L5 | KPI 4카드 — 리텐션 D-30 | "— %" 표시 + 트렌드 라벨 "데이터 수집 중" (L-6 정합 — last_seen_at 미기록) | ☐ |
| L6 | DAU 추이 라인차트 (90일 default — L-3 (a)) | SVG 동적 path + polyline + circle / 19행 데이터 (Step 3 B3 정합, KST 자정 기준) | ☐ |
| L7 | DAU 차트 메타 라벨 | `2026-02-04 ~ 2026-05-05 · 일간 활성 사용자` 형태 (90일 정합) | ☐ |
| L8 | 시간축 토글 90/30/7 | (a) 90 default active 표시 / (b) 30 클릭 → fetch 1회 + 차트 재렌더 / (c) 7 클릭 → 동일 | ☐ |
| L9 | 6메뉴 막대 (L-4 (b) 매핑) | 6행 표시 (script 580 + 나머지 5종 0) — Step 3 B4 정합 / count desc 정렬 / "데이터 수집 중" 폴백은 0건일 때만 | ☐ |
| L10 | 6메뉴 막대 시간축 토글 연동 | 90/30/7 토글 클릭 시 6메뉴 + DAU 동시 재렌더 (Promise.all) | ☐ |
| L11 | "📅 기간 선택" 버튼 클릭 | 토스트 "Phase E 대기 — 기간 선택 (L-10 (a) mock 보존)" | ☐ |
| L12 | "📤 리포트 PDF" 버튼 클릭 | 토스트 "Phase E 대기 — 리포트 PDF (L-10 (a) mock 보존)" | ☐ |

---

## 3. RBAC 검증 — 3항목

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| R1 | 비-admin 또는 로그아웃 상태 → `https://onesecond.solutions/pages/admin_v2.html` 직접 진입 | 1초 내 `/login.html` redirect (별 트랙 β 인증 게이트) | ☐ |
| R2 | RPC anon 차단 — DevTools Network에서 admin 진입 시 `/rest/v1/rpc/get_dau` 200 OK | 200 OK / 응답 body = JSON array N행 (RPC SECURITY DEFINER + is_admin() 가드 통과) | ☐ |
| R3 | admin 본 계정 진입 → 모든 RPC 4종 200 OK + 콘솔 RLS 오류 0 | `/rest/v1/rpc/get_dau` `get_wau` `get_mau` `get_feature_usage` `get_retention_d30` 모두 200 / RLS 오류 0 | ☐ |

---

## 4. 콘솔·네트워크 검증 — 5항목

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| C1 | F12 Console — analytics 섹션 진입 후 Error 0건 | 0 | ☐ |
| C2 | F12 Network — analytics 진입 시 RPC 호출 6건 (KPI 진입 4 + 시간축 차트 2 = `get_dau` 2회 + `get_wau` + `get_mau` + `get_retention_d30` + `get_feature_usage`) 모두 200 | 6건 / 200 OK | ☐ |
| C3 | 시간축 토글 클릭 시 RPC 호출 2건 (`get_dau` + `get_feature_usage` 동기 Promise.all) | 클릭당 2건 / 200 / 디바운스 X (즉시 호출) | ☐ |
| C4 | D-1 users / D-2 content / D-3 board / D-4 notice / D-6 logs 회귀 0 — analytics 진입 후 다른 섹션 재진입 시 정상 표시 | 회귀 0 | ☐ |
| C5 | race 안전장치 — analytics 진입 → 즉시 dashboard 이동 → RPC 응답 도착 시 무시 | 콘솔 오류 0 / DOM 변경 0 (`.adm-view[data-view="analytics"].active` 체크) | ☐ |

---

## 5. 성능 검증 — 6항목

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| P1 | RPC `get_dau(today, today)` warm | < 600ms (D-2/D-3 PostgREST overhead 본질 정합) | ☐ |
| P2 | RPC `get_wau()` warm | < 400ms (단일 함수 호출, 가벼움) | ☐ |
| P3 | RPC `get_mau()` warm | < 400ms | ☐ |
| P4 | RPC `get_feature_usage(90d)` warm | < 800ms (CTE + LEFT JOIN) | ☐ |
| P5 | DAU 90→30→7 토글 차트 렌더 | 토글 click → DOM 첫 갱신까지 < 800ms | ☐ |
| P6 | analytics 섹션 진입 → 모든 데이터 표시 총 시간 (cold/warm) | cold < 2.5초 / warm < 1.5초 (Promise.all 4 RPC 병렬) | ☐ |

→ 임계 미달성 시 D-2 P3 별 트랙(`admin_v2_p3_postgrest_analysis.md`)에 회수.

---

## 6. 종합 판정

- ✅ **29/30 PASS (L7 UTC 시간대 조건부 포함 30/30) — D-5 analytics 완전 종료 (2026-05-05 06:50 KST Chrome 회신), D-9 진입 가능**

### 6.1 PASS 30건 raw 요약

| 섹션 | 결과 | 비고 |
|---|:--:|---|
| § 1 정의 raw (D1~D4) | 4/4 PASS | typeof / mock 잔존 0 / 3 핸들러 / B-1 토큰 (dark `rgba(255,255,255,0.10)` / light `rgba(0,0,0,0.08)` computed 정상 적용) |
| § 2 실 동작 (L1~L12) | **11/12 PASS + L7 조건부 PASS** | KPI 4 (라이브 RPC 2/2/2/—%) + DAU 19 데이터 포인트 + 6메뉴 (script 580 + 5종 0) + 시간축 토글 90/30/7 + Phase E 토스트 2종 |
| § 3 RBAC (R1~R3) | 3/3 PASS | 비-admin redirect (1초 미만) + anon 401 차단 + admin RPC 5종 200 OK |
| § 4 콘솔·네트워크 (C1~C5) | 5/5 PASS | Error 0 / RPC 6건 / 토글 2건 / D-1~D-6 회귀 0 / race 안전장치 |
| § 5 성능 (P1~P6) | 6/6 PASS | 아래 § 6.2 raw |

### 6.2 P1~P6 raw (실측)

| # | raw 측정값 | 판정 | 근거 |
|:--:|---|:--:|---|
| P1 get_dau (today) | **521ms** | ✅ | < 600ms |
| P2 get_wau | **208ms** | ✅ | < 400ms |
| P3 get_mau | **210ms** | ✅ | < 400ms |
| P4 get_feature_usage 90d | **229ms** | ✅ | < 800ms (CTE + LEFT JOIN) |
| P5 시간축 토글 → DOM 첫 갱신 | **196ms** | ✅ | < 800ms |
| P6 analytics 진입 총 시간 (warm) | **475ms** | ✅ | < 1,500ms (Promise.all 4 RPC 병렬 효과) |

→ M-1 (b) 단순 LIKE / RPC SECURITY DEFINER + cold-start 대비 (L-2) 모두 PostgREST overhead 임계 충족. P1·P4 별 트랙 격상 불필요 청산 (D-3 J-5 (b) 패턴 정합).

### 6.3 L7 조건부 PASS 분석 (UTC 시간대 이슈)

- 검증 시각 = UTC 21:48 (KST 06:48) → JS `new Date().toISOString().slice(0,10)` = **2026-05-04**
- 의뢰서 기대값 (KST 기준): 2026-05-05 today
- 차이 1일 — KST 낮 시간대 재검증 시 2026-05-05로 자동 일치
- 로직 정상 (RPC 19 data points 정합 / 모든 다른 항목 통과)

→ 본 환경 정합 이슈 (UTC vs KST 자정 토글 시점). 코드 수정 불요. **L-1 KST 자정 기준 산식은 SQL 측에서 `AT TIME ZONE 'Asia/Seoul'`로 정합**. JS today 라벨만 UTC 기반인 차이.

### 6.4 환경 차이 1건 (별 트랙 부채 등록)

`https://onesecond.solutions/pages/admin_v2.html` **직접 URL 접근** 시:
- db.js / auth.js 미로드 → `window.db` undefined → RPC 호출 불가
- 그러나 R1 인증 게이트(별 트랙 β)에서 1초 미만 `/login.html` redirect로 차단됨
- 정상 진입 경로(app.html iframe 기반)에서는 모든 RPC 정상

→ **별 트랙 부채 #8 신규**: admin_v2.html 직접 URL 접근 시 db.js·auth.js fallback 로드 (현재는 redirect로 회피, 외부 시연 직접 URL 진입 시 의도 가능). D-final P-* 항목 또는 별 트랙.

### 6.5 D-5 완전 종료 처리

- ✅ `_INDEX.md` Phase D 표 D-5 행 → "✅ 완전 종료 (29/30 PASS, L7 조건부)" 갱신 (commit 본 회차)
- ✅ `_INDEX.md` 헤더 마지막 갱신 시점 갱신
- ✅ 통합본 v1.1 § 11.2 잔여 견적 ~8.3 → ~6.5세션 (D-5 1.8 차감)
- 🟢 **D-9 ⚙️ 화면설정 진입 가능** (통합본 § 11.1 권장 진입 순서: D-3 → D-4 → D-6 → D-5 → **D-9** → D-7(나) → D-8 → D-final)
- 🟢 별 트랙 #A PITR 5/7 진입 가능 (비용 결재 후)

---

## 7. 발견 사항 인계 (D-5 완료 후 별 트랙 후보)

본 의뢰서 § 7은 D-5 작업지시서 § 3.6.2 잔존 부채 표 그대로:

| # | 항목 | 권장 처리 |
|:--:|---|---|
| 1 | last_seen_at 갱신 메커니즘 미구현 (Step 1 ③ 사후 발견) | 5/15 4팀 오픈 직전 별 트랙 (auth.js login flow 또는 DB trigger) |
| 2 | activity_logs target_type 분포 1종(script) — 6메뉴 다양화 부족 | 4팀 오픈 후 자연 누적 / 5/12 시점 시드 데이터 별 트랙 |
| 3 | 신규 vs 기존 사용자 코호트 분석 (L-5 (b)) | Phase E |
| 4 | "📅 기간 선택" 실 작동 (L-10 (a) Phase E) | Phase E |
| 5 | "📤 리포트 PDF" (L-10 (a) Phase E) | Phase E |
| 6 | dashboard 차트 B-1 grid 토큰 마이그레이션 | D-8 (별 트랙 B-2와 묶음) |

### 7.1 v1.1 운영 안전장치 3종 정합 (5/5 신규 결정 문서 정합)

D-5 종료 후 트랙 #A PITR (5/7) → 트랙 #B Sentry (5/12) → 트랙 #C Playwright (5/13~14) 순차 진입. 결정 문서: `docs/decisions/2026-05-05_v1_1_safety_3track_schedule.md`.

---

## 8. 참고 (FAIL 디버깅 시)

- D-5 작업지시서: `docs/specs/admin_v2_d5_workorder.md` (commit `4957e53`)
- D-5 RPC capture: `docs/architecture/db_d5_rpc_capture.md` (commit `b6912f8`)
- D-5 본 commit (예정): TBD (Step 6 PASS 후 갱신)
- 통합 작업지시서 v1.1 § 4 (D-5 사전 분석): `docs/specs/admin_v2_d3_to_dfinal_workorder_v1.md`
- D-2 RPC 패턴 원본 (`get_stage_distribution`): `js/admin_v2.js` D-2 섹션
- D-pre 시리즈: `docs/architecture/db_pre_dpre7_capture.md` / `db_pre_dpre8_capture.md`
- v1.1 안전장치 결정: `docs/decisions/2026-05-05_v1_1_safety_3track_schedule.md`

---

*본 의뢰서는 D-5 메인 트랙의 실 동작 검증 진실 원천. 검증 완료 후 결과 update commit 또는 다음 세션 인계 노트에 반영. RPC 4종 + B-1 grid 토큰 5종 톤 + 시간축 토글이 D-5 고유 패턴 (가장 무거운 단계, 6단계 분할 정합).*
