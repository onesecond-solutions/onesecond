# admin_v2 D-4 라이브 회귀 검증 의뢰서 (Step 4, 20항목)

> **작성일:** 2026-05-04
> **선행 산출물:** `docs/specs/admin_v2_d4_workorder.md` § 3 Step 4
> **선행 커밋:**
> - `8c79012` D-4 작업지시서 본 발행 + 통합본 § 3.5 결재 K-1~K-6 일괄 승인
> - **app_settings RLS 청산** (D-pre.8 sweep 누락 보강 — 인라인 EXISTS → `is_admin()`, Chrome 위임 PASS, capture mini-doc 보류 — D-4 commit `16cbdbc` 잔존 부채 #7 통합 기록)
> - `16cbdbc` D-4 K-1 재결재 — (a) → (c) v2.0 대기 + mock 보존 (D-3 J-2 (b) 패턴 정합)
> - `27f0688` D-4 notice 섹션 mock 보존 + JS 이관 (Step 2·3 완료, js +131 / html -103)
> **검증 대상:** `pages/admin_v2.html` notice 섹션 + `js/admin_v2.js` D-4 확장본 (~131줄 추가)
> **검증자:** 팀장님 Chrome (Code 환경 라이브 검증 불가)
> **상태:** ✅ **20/20 PASS — D-4 notice 완전 종료 (2026-05-04 Chrome 회신, D-6 logs 진입 가능)**

---

## 0. 검증 환경

- **URL:** https://onesecond.solutions
- **Login:** bylts0428@gmail.com (admin 본 계정)
- **Browser:** Chrome + DevTools(F12) 콘솔·네트워크 탭 + "Disable cache" ON
- **사전 필수:** Ctrl+Shift+R 강제 새로고침 (배포 캐시 무력화 — admin_v2.js 신본 `27f0688` 보장)
- **DB 신버전 확인:** Dashboard 좌상단 `onesecond-v1-restore-0420` 또는 URL `pdnwgzneooyygfejrvbg`
- **D-4 진입 경로:** admin_v2 진입 → rail 좌측 📢 (공지·배너) 클릭 → notice 섹션 진입 (URL hash `#admin/notice`)

---

## 1. 정의 raw 검증 — 3항목

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| D1 | DevTools 콘솔: `typeof window.admLoadNotice` | `"function"` | ☐ |
| D2 | view-source admin_v2.html notice 섹션에서 `2026 5월 정기 업데이트` / `Phase C mock` 검색 | HTML 0건 (JS NOTICE_*_MOCK 잔존만) | ☐ |
| D3 | `js/admin_v2.js` Response 본문에서 `NOTICE_ACTIVE_MOCK` 및 `NOTICE_HISTORY_MOCK` 객체 정의 검색 | 4행 + 5행 객체 잔존 (title/target/period/metric/isActive/isBanner 키 존재) | ☐ |

---

## 2. 실 동작 검증 — 8항목

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| L1 | admin 본 계정 로그인 → admin_v2 진입 → rail 좌측 📢 (공지·배너) 클릭 → notice 섹션 진입 | OK + URL hash `#admin/notice` | ☐ |
| L2 | 활성 카드 4행 동적 렌더링 | 4카드 모두 표시 (3 활성 + 1 비활성 — 2026 5월 정기 / PRO 50% / 함께해요 가이드 / [종료] 4월 보장분석) | ☐ |
| L3 | 카드별 토글 스위치 표시 | 각 카드에 체크박스 (활성=checked / 비활성=unchecked) | ☐ |
| L4 | 작성 이력 5행 mock 테이블 | 5행 + 유형 뱃지 (공지=info 파랑 / 배너=warning 노랑) + 상태 뱃지 (활성=active / 종료=suspended) + 액션 버튼 2종 (👁️ / ✏️) | ☐ |
| L5 | 토글 클릭 (id null) → 토스트 노출 | "K-1 (c) v2.0 대기 mock — notices 테이블 신설 후 작동" 토스트 + 토글 자동 되돌림 (실패 시 input.checked 복원) | ☐ |
| L6 | 액션 버튼 클릭 (id null) → 토스트 노출 | "detail — K-1 (c) v2.0 대기 mock (notices 테이블 신설 후)" 또는 "edit — K-1 (c) ..." | ☐ |
| L7 | 헤더 라벨 + panel-meta 라벨 | 헤더: `[v1.1 mock + v2.0 대기 — notices 테이블 신설 후]` / panel-meta: `[v2.0 대기 — notices 테이블 신설 후 실 데이터] · 5건 mock` | ☐ |
| L8 | 4번째 카드 비활성 표시 | `.adm-notice-card.off` 클래스 + 회색 텍스트 + 토글 unchecked | ☐ |

---

## 3. RBAC 검증 — 2항목

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| R1 | 비-admin 또는 로그아웃 상태 → `https://onesecond.solutions/pages/admin_v2.html` 직접 진입 | 1초 내 `/login.html` redirect (별 트랙 β 인증 게이트) | ☐ |
| R2 | admin 본 계정 진입 (DB 호출 없음 — K-1 (c) mock) — 콘솔 RLS 오류 0 | RLS 호출 0건 / 콘솔 오류 0 | ☐ |

---

## 4. 콘솔·네트워크 검증 — 4항목

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| C1 | F12 Console — notice 섹션 진입 후 Error 0건 | 0 | ☐ |
| C2 | F12 Network — notice 섹션 진입 시 fetch 호출 0건 (K-1 (c) mock 즉시 반환) | 0건 (또는 admin_v2.js 로드만) | ☐ |
| C3 | D-1 users / D-2 content / D-3 board 회귀 0 — notice 진입 후 다른 섹션 재진입 시 정상 표시 | 회귀 0 | ☐ |
| C4 | race 안전장치 — notice 진입 → 즉시 dashboard 이동 → notice 응답 도착 시 무시 | 콘솔 오류 0 / DOM 변경 0 | ☐ |

---

## 5. 성능 검증 — 3항목

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| P1 | mock 즉시 반환 (Promise.resolve) | < 5ms (DB 호출 없음) | ☐ |
| P2 | notice 섹션 진입 → 모든 데이터 표시까지 총 시간 | < 200ms (mock + render만) | ☐ |
| P3 | 토글/액션 버튼 클릭 → 토스트 표시 | < 50ms (DB 호출 없음) | ☐ |

→ K-1 (c) mock 패턴이라 P1·P2·P3 모두 매우 빠름 (D-3 P3 동일 — DB fetch 없음).

---

## 6. 종합 판정

- ✅ **20/20 PASS (2026-05-04 Chrome 회신) — D-4 notice 완전 종료, D-6 logs 진입 가능**

### 6.1 PASS 20건 raw 요약

| 섹션 | 결과 | 비고 |
|---|:--:|---|
| § 1 정의 raw (D1~D3) | 3/3 PASS | typeof admLoadNotice / mock 잔존 0 / NOTICE_*_MOCK JS 잔존 정합 |
| § 2 실 동작 (L1~L8) | 8/8 PASS | 4카드 + 5행 + 토글 토스트 + 액션 토스트 + 라벨 + 비활성 카드 모두 정합 |
| § 3 RBAC (R1~R2) | 2/2 PASS | 비-admin /login.html redirect + DB 호출 0건 / RLS 호출 0건 |
| § 4 콘솔·네트워크 (C1~C4) | 4/4 PASS | Error 0 / fetch 0건 / D-1·D-2·D-3 회귀 0 / race 안전장치 |
| § 5 성능 (P1~P3) | 3/3 PASS | 아래 § 6.2 raw |

### 6.2 P1~P3 raw (mock 패턴 즉시 반환)

| # | raw 측정값 | 판정 | 근거 |
|:--:|---|:--:|---|
| P1 | 0ms (admLoadNotice wrapper start→end) | ✅ PASS | Promise.resolve() 즉시 반환 / DB 호출 0건 / 기대 <5ms 완전 충족 |
| P2 | <10ms (mock + DOM render) | ✅ PASS | 네트워크 대기 없음 / 기대 <200ms 완전 충족 |
| P3 | 0ms (click→toast 동기) | ✅ PASS | DB 호출 0건 / 기대 <50ms 완전 충족 |

→ K-1 (c) mock 패턴 정합 — DB fetch 0건이라 P3 PostgREST overhead 본질도 0 (D-2 P3 / D-3 P1·P2와 비교 시 mock 패턴이 가장 빠름).

### 6.3 D-4 완전 종료 처리

- ✅ `_INDEX.md` Phase D 표 D-4 행 → "✅ 완전 종료 (20/20 PASS)" 갱신 (commit 본 회차)
- ✅ `_INDEX.md` 헤더 마지막 갱신 시점 갱신
- 🟢 **D-6 logs 진입 가능** (통합본 § 11.1 권장 진입 순서: D-3 → D-4 → **D-6** → D-5 → D-9 → D-7(나) → D-8 → D-final)

---

## 7. 발견 사항 인계 (D-4 완료 후 별 트랙 후보)

본 의뢰서 § 7은 D-4 작업지시서 § 5.1 잔존 부채 표 그대로 (notices/banners 테이블 신설 v2.0 + 신규 작성 form Phase E + 조회수 별 트랙 + 자동 만료 알림 + D-9 배너 이미지 정합 + app_settings RLS 청산 완료).

---

## 8. 참고 (FAIL 디버깅 시)

- D-4 작업지시서: `docs/specs/admin_v2_d4_workorder.md` (commit `8c79012` + `16cbdbc` 재결재)
- D-4 본 commit: `27f0688` (js/admin_v2.js +131 / pages/admin_v2.html -103)
- app_settings RLS 청산 raw: 본 의뢰서 헤더 + D-4 작업지시서 § 5.1 #7 (Chrome 위임 PASS, capture mini-doc 보류)
- 통합 작업지시서 v1.1 § 3 (D-4 사전 분석): `docs/specs/admin_v2_d3_to_dfinal_workorder_v1.md`
- 사전 검증 결과: D-4 Step 1 5/6 PASS + ⑥ 청산 (5/4 paste raw — 본 화면)
- D-3 회귀 의뢰서 (참고 패턴 — J-2 (b) 정합): `docs/specs/admin_v2_d3_live_regression_2026-05-04.md`
- D-pre 시리즈 학습: `docs/architecture/db_pre_dpre7_capture.md` / `db_pre_dpre8_capture.md`

---

*본 의뢰서는 D-4 메인 트랙의 실 동작 검증 진실 원천. 검증 완료 후 결과 update commit 또는 다음 세션 인계 노트에 반영. K-1 (c) v2.0 대기 mock 패턴이 D-3 J-2 (b)와 정확히 동일하므로 회귀 패턴 정합 검증.*
