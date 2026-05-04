# admin_v2 D-2 라이브 회귀 검증 의뢰서 (Step 4, 23항목)

> **작성일:** 2026-05-04
> **선행 산출물:** `docs/specs/admin_v2_d2_workorder.md` § 3 Step 4
> **선행 커밋:** `0ca8e17 feat(admin_v2): D-2 content 섹션 실 데이터 연결`
> **검증 대상:** `pages/admin_v2.html` content 섹션 + `js/admin_v2.js` D-2 확장본 (~281줄 추가)
> **검증자:** 팀장님 Chrome (Code 환경 라이브 검증 불가)
> **상태:** 🟡 검증 대기

---

## 0. 검증 환경

- **URL:** https://onesecond.solutions
- **Login:** bylts0428@gmail.com (admin 본 계정)
- **Browser:** Chrome + DevTools(F12) 콘솔·네트워크 탭 + "Disable cache" ON
- **사전:** Ctrl+Shift+R 강제 새로고침 (배포 캐시 무력화)
- **DB 신버전 확인:** Dashboard 좌상단 `onesecond-v1-restore-0420` 또는 URL `pdnwgzneooyygfejrvbg`

---

## 1. 정의 raw 검증 — 4항목

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| D1 | DevTools 콘솔: `typeof window.admLoadContent` | `"function"` | ☐ |
| D2 | view-source admin_v2.html 진입 후: `3,847` 또는 `Phase C mock` 검색 | content 섹션 0건 | ☐ |
| D3 | view-source: `김지훈` 또는 `박서연` (mock 작성자명) 검색 | content 섹션 0건 (notice/logs 잔존은 D-4/D-6 범위, 정합) | ☐ |
| D4 | DevTools Network → `admin_v2.js` Response 본문에 `STAGE_LABELS_KO` 검색 | 객체 정의 잔존 (10키: opening/opening_rejection/...) | ☐ |

---

## 2. 실 동작 검증 — 9항목

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| L1 | admin 본 계정 로그인 → admin_v2 진입 → rail 좌측 📋 (콘텐츠) 클릭 → content 섹션 진입 | OK + URL hash `#admin/content` | ☐ |
| L2 | KPI 3카드 실 데이터 표시 | 전체 스크립트=59 / 전체 자료=1 / 오늘 작성=0 (또는 5/4 이후 변동분) | ☐ |
| L3 | stage 도넛 SVG 동적 렌더링 (`<g id="adm-content-stage-donut">` 내부 10개 circle 생성) | 10 circle / 중앙 텍스트 = 59 | ☐ |
| L4 | 단계별 비율 범례 10행 + "최다: 상품 설명 24%" 표시 (product 14/59 ≈ 24%) | 10행 / 최다 라벨 동적 | ☐ |
| L5 | 최근 콘텐츠 테이블 행 표시 (scripts + library merge, created_at desc) | 8행 또는 (scripts 59 + library 0~1) — 행 수 유한, 정렬 정합 | ☐ |
| L6 | 타입 뱃지 색 분기 (스크립트=info 파랑 / 자료=success 초록) | 정합 | ☐ |
| L7 | 자료 행은 stage / use_count / save_count "—" 표시 (scope=neq.private 필터로 "임태성 자료 추가하기 제목 테스트" 차단됨, 다른 자료 있으면 표시) | "—" 표시 정합 / 차단 정합 | ☐ |
| L8 | 작성자 = `owner_email` 표시 (예: bylts0428@gmail.com) | OK | ☐ |
| L9 | 작성일 상대 시간 ("3시간 전" / "어제" / "2일 전" / "2026-04-15" 자동 분기) | 정합 | ☐ |

---

## 3. STAGE_LABELS_KO 매핑 검증 — 추가 1항목

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| K1 | 단계별 비율 범례 10행의 한국어 라벨이 다음과 정확히 일치 | "오프닝 / 도입 반론 / 상황 확인 / 니즈 강조 / 니즈 강조 ② / 보장 분석 / 상품 설명 / 반론 대응 / 클로징 / 2차 클로징" 10개 | ☐ |

---

## 4. RBAC 검증 — 3항목

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| R1 | 비-admin 또는 로그아웃 상태 → `https://onesecond.solutions/pages/admin_v2.html` 직접 진입 | 1초 내 `/login.html` redirect (별 트랙 β 인증 게이트) | ☐ |
| R2 | admin 본 계정으로 scripts/library 정상 SELECT (KPI / 도넛 / 테이블 모두 표시) | RLS 자기 참조 회귀 0 / 콘솔 RLS 오류 0 | ☐ |
| R3 | 행 액션 버튼 클릭 (👁️ 또는 ✏️) → 토스트 노출 ("상세 보기 — Phase D 후 구현" 또는 동등) | 토스트 5초 후 사라짐 | ☐ |

---

## 5. 콘솔·네트워크 검증 — 5항목

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| C1 | F12 Console — content 섹션 진입 후 Error 0건 (warning은 무관) | 0 | ☐ |
| C2 | F12 Network — 4xx·5xx 응답 0건 | 0 | ☐ |
| C3 | scripts fetch + library fetch **병렬** (Network 타임라인에서 동시 시작) | 거의 동시 시작 (< 50ms 차이) | ☐ |
| C4 | D-1 users 섹션 회귀 0 — content 진입 후 users 재진입 시 정상 표시 | 회귀 0 | ☐ |
| C5 | race 안전장치 — content 진입 → 즉시 dashboard 이동 → content 응답 도착 시 무시 | 콘솔 오류 0 / DOM 변경 0 | ☐ |

---

## 6. 성능 검증 — 2항목 (옵션)

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| P1 | stage 분포 fetch 라운드트립 (`/scripts?select=stage&limit=10000`) 시간 | < 200ms (59행 부담 적음) | ☐ |
| P2 | content 섹션 진입 → 모든 데이터 표시까지 총 시간 | < 1초 | ☐ |

→ 1초 이상 소요 시 별 트랙 #3 (`get_stage_distribution` RPC 신설) 우선순위 격상.

---

## 7. 종합 판정

- **23항목 PASS / FAIL 표기 후 본 의뢰서를 update commit 또는 별 노트로 인계**
- **전건 PASS:** "23/23 PASS — D-2 완전 종료, D-3 board 진입 가능" 한 줄 회신
- **FAIL 1건 이상:** 항목 번호 + 콘솔/네트워크 raw 첨부 → Code에 회신 → 후속 fix 트랙 진입

---

## 8. 발견 사항 인계 (D-2 완료 후 별 트랙 후보)

| # | 항목 | 권장 |
|:--:|---|---|
| 1 | scripts.use_count 59건 모두 0 → script_usage_logs 집계 → use_count 갱신 RPC/트리거 신설 | D-pre.8 § 5.5 참고 |
| 2 | library_total = 1 (시연 가치 ↓) → seed data 추가 (다양한 자료 5~10건) | 별 트랙 |
| 3 | "전체 보기" 버튼 → content 풀 페이지 (페이징·검색·필터) | I-7 결정 — D-2 후 별 트랙 |
| 4 | KPI 추세 라벨 "▲ N건 vs 지난 달" 동적화 (기간 비교 RPC 신설) | Phase E |
| 5 | scripts.save_count 또는 saves 테이블 신설 (사용자 북마크 도메인) | I-4 별 트랙 |
| 6 | content 메뉴 pane 잔여 항목(.pending) Phase E 범위 정합 | Step 3-7 |
| 7 | stage 분포 RPC `get_stage_distribution` 신설 (라운드트립 최적화) | I-2 — P1 결과에 따라 |

---

## 9. 참고 (FAIL 디버깅 시)

- D-2 작업지시서: `docs/specs/admin_v2_d2_workorder.md` (commit `5f1261a`)
- D-2 본 commit: `0ca8e17` (js/admin_v2.js +281 / pages/admin_v2.html -100)
- 사전 검증 결과: D-2 Step 1 (1)~(8) 8/8 클리어 (5/4 paste raw)
- D-pre 시리즈 학습: `docs/architecture/db_pre_dpre7_capture.md` / `db_pre_dpre8_capture.md`
- D-1 회귀 의뢰서 (참고 패턴): `docs/specs/admin_v2_d1_live_regression_2026-05-03.md`

---

*본 의뢰서는 D-2 메인 트랙의 실 동작 검증 진실 원천. 검증 완료 후 결과 update commit 또는 다음 세션 인계 노트에 반영.*
