# admin_v2 D-6 라이브 회귀 검증 의뢰서 (Step 4, 20항목)

> **작성일:** 2026-05-05
> **선행 산출물:** `docs/specs/admin_v2_d6_workorder.md` § 3 Step 4
> **선행 커밋 (예정):**
> - D-6 본 commit (예정) — js/admin_v2.js +255줄 (logs 섹션 9함수) / pages/admin_v2.html -102줄 (mock 12행 제거 + 슬롯 ID + 4필터 핸들러)
> - **`admin read all logs` RLS 청산** (D-pre.8 sweep 누락 보강 — 인라인 EXISTS → `is_admin()`, Step 1.5 Chrome 위임 4/4 PASS, capture mini-doc 보류 — D-6 commit 잔존 부채 통합 기록)
> **검증 대상:** `pages/admin_v2.html` logs 섹션 + `js/admin_v2.js` D-6 확장본 (~255줄 추가)
> **검증자:** 팀장님 Chrome (Code 환경 라이브 검증 불가)
> **상태:** ✅ **20/20 PASS — D-6 logs 완전 종료 (2026-05-05 Chrome 회신, D-5 analytics 진입 가능)**

---

## 0. 검증 환경

- **URL:** https://onesecond.solutions
- **Login:** bylts0428@gmail.com (admin 본 계정)
- **Browser:** Chrome + DevTools(F12) 콘솔·네트워크 탭 + "Disable cache" ON
- **사전 필수:** Ctrl+Shift+R 강제 새로고침 (배포 캐시 무력화 — admin_v2.js 신본 보장)
- **DB 신버전 확인:** Dashboard 좌상단 `onesecond-v1-restore-0420` 또는 URL `pdnwgzneooyygfejrvbg`
- **D-6 진입 경로:** admin_v2 진입 → rail 좌측 🗂️ (로그) 클릭 → logs 섹션 진입 (URL hash `#admin/logs`)

---

## 1. 정의 raw 검증 — 3항목

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| D1 | DevTools 콘솔: `typeof window.admLoadLogs` | `"function"` | ☐ |
| D2 | view-source admin_v2.html logs 섹션에서 `Phase C mock` / `임태성` / `김지훈` 검색 | HTML 0건 (mock 12행 완전 제거) | ☐ |
| D3 | DevTools 콘솔: `typeof window.admLogsSearch === 'function' && typeof window.admLogsFilterDate === 'function' && typeof window.admLogsFilterUser === 'function' && typeof window.admLogsFilterAction === 'function' && typeof window.admLogsFilterResult === 'function'` | `true` (5함수 모두 정의) | ☐ |

---

## 2. 실 동작 검증 — 9항목

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| L1 | admin 본 계정 로그인 → admin_v2 진입 → rail 좌측 🗂️ (로그) 클릭 → logs 섹션 진입 | OK + URL hash `#admin/logs` |  ☐ |
| L2 | 진입 시 date input 자동 today 채움 (M-4 (a)) | `value="2026-05-05"` 자동 표시 | ☐ |
| L3 | activity_logs 실 데이터 + SYSTEM 2행 mock 합쳐 표시 (M-2 (c)) | tbody 12행 (또는 그 이하) — 실 데이터 N행 + SYSTEM "API 응답 지연" + "DB connection timeout" 2행 / panel-meta = `최근 12건 · 전체 742건` | ☐ |
| L4 | 사용자 select 옵션 동적 채움 (D-1 admin SELECT) | `<option value="all">모든 사용자</option>` + 라이브 users 2명 (admin / ga_member) — Step 1 ④ raw 정합 | ☐ |
| L5 | 검색 input 300ms 디바운스 (M-1 (b) 단순 LIKE) | `login` 입력 → 300ms 후 fetch / event_type=login 행만 표시 (script_view 제외) | ☐ |
| L6 | 액션 select 변경 (M-3 #3) | "스크립트 조회" 선택 → event_type=script_view 행만 / "모든 액션" 선택 → 전체 복귀 | ☐ |
| L7 | 결과 select 변경 — M-7 (c) 안내 토스트 | "성공" 또는 "실패" 선택 시 토스트: `"결과 필터: result 컬럼 부재(M-7 (c)) — 모든 행 "성공" 통일 표시"` / "모든 결과" 선택 시 토스트 0 | ☐ |
| L8 | "🔄 새로고침" 버튼 클릭 | admLoadLogs 재호출 / fetch 1회 / 데이터 갱신 | ☐ |
| L9 | "📤 CSV" 버튼 클릭 (M-6 (b)) + "전체 보기 → (Phase E)" 버튼 disabled 표시 | CSV 클릭 → 토스트 `"Phase E 대기 — CSV 내보내기 (M-6 (b))"` / 전체 보기 disabled 회색 표시 클릭 무반응 | ☐ |

---

## 3. RBAC 검증 — 2항목

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| R1 | 비-admin 또는 로그아웃 상태 → `https://onesecond.solutions/pages/admin_v2.html` 직접 진입 | 1초 내 `/login.html` redirect (별 트랙 β 인증 게이트) | ☐ |
| R2 | admin 본 계정 진입 → activity_logs SELECT 정상 응답 (Step 1.5 `is_admin()` 청산 정합) | logs 섹션 진입 시 fetch 200 OK / 콘솔 RLS 오류 0 / Network `/rest/v1/activity_logs` 200 | ☐ |

---

## 4. 콘솔·네트워크 검증 — 4항목

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| C1 | F12 Console — logs 섹션 진입 후 Error 0건 | 0 | ☐ |
| C2 | F12 Network — 진입 시 fetch 2건 (`/rest/v1/activity_logs?...&Prefer=count=exact` + `/rest/v1/users?select=id,name,role`) 모두 200 | 2건 / 200 OK | ☐ |
| C3 | 검색 디바운스 — `login` 입력 시 300ms 후 fetch 1회만 (타이핑 5글자라도) | fetch 1회 / `or=(event_type.ilike.*login*,target_type.ilike.*login*,target_id.ilike.*login*)` 쿼리 정합 | ☐ |
| C4 | D-1 users / D-2 content / D-3 board / D-4 notice 회귀 0 — logs 진입 후 다른 섹션 재진입 시 정상 표시 | 회귀 0 | ☐ |

---

## 5. 성능 검증 — 2항목

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| P1 | 검색 1회 (warm) — `login` 입력 → 응답 도착까지 | < 800ms (D-2 P3 PostgREST overhead 본질 정합 — D-3 P1·P2 250~544ms 패턴) | ☐ |
| P2 | logs 섹션 진입 → 12행 표시까지 총 시간 (cold/warm) | cold < 1.5초 / warm < 800ms | ☐ |

→ M-1 (b) 단순 LIKE 패턴은 PostgREST overhead 본질 영향. 임계 < 1초 (cold 1.5초) 미달성 시 D-2 P3 별 트랙(`admin_v2_p3_postgrest_analysis.md`)에 회수.

---

## 6. 종합 판정

- ✅ **20/20 PASS (2026-05-05 Chrome 회신) — D-6 logs 완전 종료, D-5 analytics 진입 가능**

### 6.1 PASS 20건 raw 요약

| 섹션 | 결과 | 비고 |
|---|:--:|---|
| § 1 정의 raw (D1~D3) | 3/3 PASS | typeof admLoadLogs / mock 잔존 0 / 5필터 함수 정의 정합 |
| § 2 실 동작 (L1~L9) | 9/9 PASS | today default 2026-05-04 / mergeSystemLogsMock 호출 / 사용자 select 3 옵션 동적 (어드민·조현명) / 디바운스 304ms / 4필터 + 결과 select / CSV+토스트 / 새로고침 + 전체 보기 disabled 모두 정합 |
| § 3 RBAC (R1~R2) | 2/2 PASS | 비-admin redirect (auth.js role 체크) + admLoadLogs 12건 526ms |
| § 4 콘솔·네트워크 (C1~C4) | 4/4 PASS | Error 0 / fetch 2건 (fetchUsersForLogs + fetchActivityLogs) / 디바운스 1회 / D-1~D-4 회귀 0 |
| § 5 성능 (P1~P2) | 2/2 PASS | 아래 § 6.2 raw |

### 6.2 P1~P2 raw

| # | raw 측정값 | 판정 | 근거 |
|:--:|---|:--:|---|
| P1 | 504ms | ✅ PASS | 검색 디바운스 후 PostgREST 응답 / 기대 <800ms 충족 (D-2 P3 / D-3 P1·P2 본질 정합 — PostgREST overhead 본질) |
| P2 | 1293ms (cold, TTFB 208ms / DCL 486ms) | ✅ PASS | logs 섹션 진입 → DOM 첫 렌더까지 / 기대 <1.5초 cold 충족 |

→ M-1 (b) 단순 LIKE 패턴 + M-2 (c) SYSTEM mock 합치기 + M-3 4필터 모두 PostgREST overhead 임계 충족. P1·P2 별 트랙 격상 불필요 (D-3 J-5 (b) RPC 격상 청산 패턴 정합).

### 6.3 라이브 검증 부수 발견

- **빌드 해시 5f1261a 표시** — Last-Modified 메타 2026-05-04 20:11:25는 정적 호스팅 캐시 메타이며 D-6 코드(D-6 logs — activity_logs 검색·4필터 + SYSTEM mock 주석)는 라이브에 완전 반영 확인. 기능 검증 영향 0.
- **L8 `showAdminToast` 노출 범위** — IIFE 내부 함수로 `window.*` 노출 X. 본 D-6 코드는 IIFE 내부에서만 호출(admLogsExportCSV / admLogsFilterResult / fetchActivityLogs 에러 핸들러)하므로 작동 정합. 외부 노출이 필요하면 별 트랙 (현재 부채 아님).

### 6.4 D-6 완전 종료 처리

- ✅ `_INDEX.md` Phase D 표 D-6 행 → "✅ 완전 종료 (20/20 PASS)" 갱신 (commit 본 회차)
- ✅ `_INDEX.md` 헤더 마지막 갱신 시점 갱신
- ✅ 통합본 v1.1 § 11.2 잔여 견적 ~9.1 → ~8.3세션 (D-6 0.8 차감)
- 🟢 **D-5 analytics 진입 가능** (통합본 § 11.1 권장 진입 순서: D-3 → D-4 → D-6 → **D-5** → D-9 → D-7(나) → D-8 → D-final)

---

## 7. 발견 사항 인계 (D-6 완료 후 별 트랙 후보)

본 의뢰서 § 7은 D-6 작업지시서 § 5.1 잔존 부채 표 그대로 (#1 system_logs Sentry 위임 + #2 event_type GIN 인덱스 격상 + #3 보존 정책 trigger + #4 CSV Phase E + #5 전체 보기 페이징 Phase E + #6 사용자 select 동적 채움 — 본 D-6에서 이미 D-1 admin SELECT 활용 부분 적용 / #7 액션 select 옵션 raw 정합 + #8 result 컬럼 신설 + #9 event_type select 동적 채움 + #10 9역할 시드 데이터).

### 7.1 추가 결재 사후 발견 사항 (Step 1 raw 분석)

- **users 2명만 (admin / ga_member)** — 9역할 시드 데이터 부족 — 외부 시연 직전 별 트랙 #10 (board seed / notice seed와 동일 패턴)
- **event_type 2종만 (script_view 580 / login 162)** — mock 6종 액션과 불일치, 라이브 2종으로 축소 채택 (M-8 (b))
- **result 컬럼 부재** — UI "결과" 컬럼 그대로 보존 + 모든 행 "성공" 통일 표시 채택 (M-7 (c))
- **`admin read all logs` 정책 청산 완료** — D-pre.7/8 학습 정합 (`is_admin()` 통일, Step 1.5 PASS)

---

## 8. 참고 (FAIL 디버깅 시)

- D-6 작업지시서: `docs/specs/admin_v2_d6_workorder.md`
- D-6 본 commit (예정): TBD (Step 5 commit 후 갱신)
- Step 1 결과 raw: 본 화면 paste (5/5 paste 시점, 통과 3건 + 분기 3건 처리)
- Step 1.5 청산 raw: `admin read all logs` 정책 EXISTS → `is_admin()` (capture mini-doc 보류 — 본 commit에 통합 기록)
- 통합 작업지시서 v1.1 § 5 (D-6 사전 분석): `docs/specs/admin_v2_d3_to_dfinal_workorder_v1.md`
- D-1 회귀 의뢰서 (참고 패턴 — 검색·필터 디바운스 원본): `docs/specs/admin_v2_d1_live_regression_2026-05-03.md`
- D-4 회귀 의뢰서 (참고 패턴 — mock+v2.0 대기 패턴 정합): `docs/specs/admin_v2_d4_live_regression_2026-05-04.md`
- D-pre 시리즈 학습: `docs/architecture/db_pre_dpre6_capture.md` / `db_pre_dpre7_capture.md` / `db_pre_dpre8_capture.md`

---

*본 의뢰서는 D-6 메인 트랙의 실 동작 검증 진실 원천. 검증 완료 후 결과 update commit 또는 다음 세션 인계 노트에 반영. M-1 (b) 단순 LIKE + M-2 (c) SYSTEM mock 합치기 + M-7 (c) result 통일 + M-8 (b) 라이브 2종 패턴이 D-1 검색·필터 + D-3 J-2 (b) mock 보존을 하이브리드로 결합한 D-6 고유 패턴.*
