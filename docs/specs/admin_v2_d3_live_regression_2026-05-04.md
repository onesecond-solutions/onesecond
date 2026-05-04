# admin_v2 D-3 라이브 회귀 검증 의뢰서 (Step 4, 25항목)

> **작성일:** 2026-05-04
> **선행 산출물:** `docs/specs/admin_v2_d3_workorder.md` § 3 Step 4
> **선행 커밋:**
> - `a3aa439` D-3 작업지시서 본 발행 + 통합본 § 2.6 결재 J-1~J-7 일괄 승인
> - `f5c6c5e` D-3 board 섹션 실 데이터 연결 (Step 2·3 완료, js +278 / html -67)
> **검증 대상:** `pages/admin_v2.html` board 섹션 + `js/admin_v2.js` D-3 확장본 (~278줄 추가)
> **검증자:** 팀장님 Chrome (Code 환경 라이브 검증 불가)
> **상태:** 🟡 검증 대기

---

## 0. 검증 환경

- **URL:** https://onesecond.solutions
- **Login:** bylts0428@gmail.com (admin 본 계정)
- **Browser:** Chrome + DevTools(F12) 콘솔·네트워크 탭 + "Disable cache" ON
- **사전 필수:** Ctrl+Shift+R 강제 새로고침 (배포 캐시 무력화 — admin_v2.js 신본 `f5c6c5e` 보장)
- **DB 신버전 확인:** Dashboard 좌상단 `onesecond-v1-restore-0420` 또는 URL `pdnwgzneooyygfejrvbg`
- **D-3 진입 경로:** admin_v2 진입 → rail 좌측 📋 (게시판 관리) 클릭 → board 섹션 진입 (URL hash `#admin/board`)

---

## 1. 정의 raw 검증 — 4항목

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| D1 | DevTools 콘솔: `typeof window.admLoadBoard` | `"function"` | ☐ |
| D2 | view-source admin_v2.html 진입 후: `2,847` 또는 `11,428` 또는 `Phase C mock` 검색 (board 섹션 mock 잔존) | board 섹션 0건 (HTML 주석 외) | ☐ |
| D3 | view-source: `이도윤` / `최민지` / `김지훈` / `정수아` / `박서연` 검색 (J-2 (b) — 신고 mock 작성자명은 JS 측 BOARD_REPORTS_MOCK 잔존, HTML 측 0) | HTML 0건 / `js/admin_v2.js` 5명 모두 BOARD_REPORTS_MOCK 잔존 | ☐ |
| D4 | DevTools Network → `admin_v2.js` Response 본문에 `BOARD_REPORTS_MOCK` 검색 | 5행 mock 객체 잔존 (board / title / author / reasonLabel / count / ago 키 존재) | ☐ |

---

## 2. 실 동작 검증 — 9항목

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| L1 | admin 본 계정 로그인 → admin_v2 진입 → rail 좌측 📋 (게시판 관리) 클릭 → board 섹션 진입 | OK + URL hash `#admin/board` | ☐ |
| L2 | KPI 3카드 실 데이터 표시 | 전체 게시글=4 / 댓글=0 / 신고 대기=5 (mock) | ☐ |
| L3 | 게시판별 활동 라인차트 SVG 동적 렌더링 (`<g id="adm-board-activity-chart">` 내부 polyline 생성) | team 1 polyline + together 1 polyline + 보험사 회색 점선 1 line + grid 4 + y축 라벨 (max=1, 0) | ☐ |
| L4 | 라인차트 시연 raw 정합 | team 4/27 1건 + together 4/17·4/18·4/19 각 1건 = 4포인트 (sparse 정상 — 별 트랙 #6 seed data) | ☐ |
| L5 | 신고 5행 mock 테이블 표시 | 5행 (이도윤·최민지·김지훈·정수아·박서연 / 게시판 뱃지 + 신고 사유 뱃지 + 신고수 + 접수 + 액션 3종 버튼) | ☐ |
| L6 | 신고 5행 panel-meta 라벨 | "[v2.0 대기 — post_reports 테이블 신설 후 실 데이터] · 5건 mock" | ☐ |
| L7 | 액션 버튼 3종 (👁️ 숨김 / 🗑️ 삭제 / ⛔ 정지) 표시 | 5행 모두 3개 버튼 노출 | ☐ |
| L8 | 액션 버튼 클릭 (J-2 (b) postId/userId null 정합) → 토스트 노출 | "postId 없음 (J-2 (b) v2.0 대기 mock — 실 데이터 연결 후 작동)" 또는 "userId 없음 ..." | ☐ |
| L9 | 섹션 헤더 라벨 | `[v1.1 라이브 + v2.0 대기]` 표시 | ☐ |

---

## 3. RBAC 검증 — 3항목

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| R1 | 비-admin 또는 로그아웃 상태 → `https://onesecond.solutions/pages/admin_v2.html` 직접 진입 | 1초 내 `/login.html` redirect (별 트랙 β 인증 게이트) | ☐ |
| R2 | admin 본 계정으로 posts/comments 정상 SELECT (KPI / 차트 / 테이블 모두 표시) | RLS 자기 참조 회귀 0 / 콘솔 RLS 오류 0 | ☐ |
| R3 | 액션 버튼 권한 (admin 전용) — 비-admin이 PATCH/DELETE 시도 시 RLS 차단 | (D-3 라이브 환경에서는 admin 본 계정만 이용 — RLS 본질 검증은 D-final) | ☐ |

---

## 4. 콘솔·네트워크 검증 — 5항목

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| C1 | F12 Console — board 섹션 진입 후 Error 0건 (warning 무관) | 0 | ☐ |
| C2 | F12 Network — 4xx·5xx 응답 0건 | 0 | ☐ |
| C3 | posts KPI fetch + comments KPI fetch + posts 90일 활동 fetch **병렬** (Network 타임라인에서 동시 시작) | 거의 동시 시작 (< 50ms 차이) | ☐ |
| C4 | D-1 users / D-2 content 섹션 회귀 0 — board 진입 후 users/content 재진입 시 정상 표시 | 회귀 0 | ☐ |
| C5 | race 안전장치 — board 진입 → 즉시 dashboard 이동 → board 응답 도착 시 무시 | 콘솔 오류 0 / DOM 변경 0 | ☐ |

---

## 5. 성능 검증 — 4항목

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| P1 | KPI fetch 라운드트립 (posts + comments 병렬) | < 200ms 권장 (P3 PostgREST overhead 본질로 별 트랙 #5/4 분석 — 권장값 미달도 OK) | ☐ |
| P2 | 90일 활동 fetch 라운드트립 (`/posts?select=created_at,board_type&created_at=gte.{90일전}`) | < 200ms 권장 (4행 작은 데이터셋) | ☐ |
| P3 | 모더레이션 액션 PATCH 라운드트립 (J-2 (b) postId null로 fetch 발생 X — 토스트 즉시 표시) | < 50ms (DB 호출 X) | ☐ |
| P4 | board 섹션 진입 → 모든 데이터 표시까지 총 시간 | < 1초 | ☐ |

→ P1·P2 ≥ 1초 시 J-5 (b) RPC `get_board_activity_90d` 신설 별 트랙 격상 (D-2 별 트랙 #3 패턴).

---

## 6. 종합 판정

- **25항목 PASS / FAIL 표기 후 본 의뢰서를 update commit 또는 별 노트로 인계**
- **전건 PASS:** "25/25 PASS — D-3 board 완전 종료, D-4 notice 진입 가능" 한 줄 회신
- **D-3 25/25 PASS** = D-3 작업지시서 § 5.2 _INDEX.md 갱신 + 다음 세션 인계 노트 반영 (`_INDEX.md` Phase D 표 D-3 행 → "✅ 완전 종료")
- **FAIL 1건 이상:** 항목 번호 + 콘솔/네트워크 raw 첨부 → Code에 회신 → 후속 fix 트랙 진입

---

## 7. 발견 사항 인계 (D-3 완료 후 별 트랙 후보)

| # | 항목 | 권장 |
|:--:|---|---|
| 1 | post_reports 테이블 신설 (J-2 (b) v2.0 대기) | v2.0 (보험사 입점 시점) |
| 2 | 신고 자동 알림 (J-7 (a) D-3 범위 외) | Phase E 또는 별 트랙 |
| 3 | 보험사 게시판 v2.0 차트 라인 활성 (J-4 (a) 회색 점선 보존 후) | v2.0 |
| 4 | J-5 (b) `get_board_activity_90d` RPC 신설 (P1·P2 FAIL 시 격상) | 별 트랙 (P1·P2 결과에 따라) |
| 5 | 모더레이션 액션 토스트 메시지 표준화 (D-1 `.adm-toast` 재활용) | D-1 누적 |
| 6 | **board seed data 다양화** — posts 4 → 20~30건 / comments 0 → 5~15건 / 90일 활동 분포 sparse → dense | 별 트랙 (외부 시연·원수사 영업 시점 전 적용) — D-3 Step 1 ② ③ ④ raw 발견 (5/4) |
| 7 | KPI 추세 라벨 ("▲ 84건 vs 지난 주") 동적화 | Phase E (D-2 잔존 부채 #5와 동일) |

---

## 8. 참고 (FAIL 디버깅 시)

- D-3 작업지시서: `docs/specs/admin_v2_d3_workorder.md` (commit `a3aa439`)
- D-3 본 commit: `f5c6c5e` (js/admin_v2.js +278 / pages/admin_v2.html -67)
- 통합 작업지시서 § 2 (D-3 사전 분석): `docs/specs/admin_v2_d3_to_dfinal_workorder_v1.md`
- 사전 검증 결과: D-3 Step 1 9/9 PASS (5/4 paste raw — 본 화면)
- D-1 회귀 의뢰서 (참고 패턴): `docs/specs/admin_v2_d1_live_regression_2026-05-03.md`
- D-2 회귀 의뢰서 (참고 패턴 + P3·P4 별 트랙 분리 사례): `docs/specs/admin_v2_d2_live_regression_2026-05-04.md`
- D-pre 시리즈 학습: `docs/architecture/db_pre_dpre7_capture.md` / `db_pre_dpre8_capture.md`

---

*본 의뢰서는 D-3 메인 트랙의 실 동작 검증 진실 원천. 검증 완료 후 결과 update commit 또는 다음 세션 인계 노트에 반영. P1·P2 FAIL 시 J-5 (b) RPC 격상은 D-2 별 트랙 #3 패턴 모방.*
