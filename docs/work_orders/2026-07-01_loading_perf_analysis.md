# 로딩 성능 원인 분석 + A·B 개선 (2026-07-01)

> 총괄팀장(Code) 단독. 대표님 로딩 지연 측정(4원인) 접수 → 코드 교차검증 → A·B 착수(C·D 오늘 제외).
> 전체 사용자 로드 경로 = 임태성 게이트로 감쌀 수 없음 → 대표 승인·검수 필수. main 직접 push 0(PR).

## 대표님 측정 4원인 — 코드 교차검증 결과

| # | 측정 | 코드 확인 |
|---|---|---|
| 🔴1 | app.html 2.7MB, 인라인 JS 1.4MB | ✅ 2.73MB, 인라인 `<script>` 14블록, minify 0 |
| 🔴2 | 중복 API (loadHomeRecent 2회) | ✅ `appstate:ready`에서 `bootView`(showView→loadHomeRecent) + 별도 리스너(5414, `_homeRecentLoaded` 강제리셋+`force`) 두 경로가 홈 세트를 2회 |
| 🟡3 | 폰트 3MB, swap 미적용 | ✅ jsdelivr CDN pretendard.css, static 4종, self-host 아님 |
| 🟡4 | html2canvas 항상 blocking | ✅ 상단 `<script>` blocking. **하단(7198)에 이미 `loadHtml2Canvas()` 동적 로더 존재** → 상단은 사실상 불필요 |

## 오늘 범위 = A + B (대표 결재)

### A. 상단 blocking html2canvas 제거
- 상단 `<script src=cdnjs/html2canvas>` 제거 → 사용 시점 `loadHtml2Canvas()` 동적 로드로 통일.
- html2canvas 실행 지점 4곳 전부 lazy 경유로 정리:
  - `renderCardCanvas`(5927, **직접호출→수정**) / `_cmpCapture`(6683, 기존경유) / `mcCaptureCard`(7135, 기존경유) / `finalizeMakeCard`(8380, **직접호출+typeof체크→수정**)
- 카드 저장·복사·비교표 출력 시에만 194KB 로드(홈 첫 진입 파싱지연 해소).

### B. loadHomeRecent 중복 제거
- 5414 리스너에서 `_homeRecentLoaded=false` 강제리셋 + `loadHomeRecent(true)` → `loadHomeRecent()`(가드 존중)로 변경.
- 리스너의 정당한 목적(OAuth 콜백 후 실데이터 재로드)은 가드가 자동 처리:
  - 재방문(로그인·role 즉시확정): bootView가 실데이터 로드 → 가드 true → 5414 skip = **1회**
  - OAuth 콜백(bootView 시점 토큰 없음): placeholder만·가드 false 유지 → 5414가 실데이터 = **필요한 재로드 유지**

## 실측 (puppeteer-core + 시스템 Chrome, headless, before=main / after=본 브랜치)

### A — html2canvas 초기 요청 (비로그인 홈 로드)
| 지표 | before | after |
|---|---|---|
| html2canvas 초기 네트워크 요청 | **1건** | **0건** ✅ |
| 페이지 로드시간(단발·참고) | 641ms | 412ms |
| 홈 fetch 세트(회귀 확인) | 5건 | 5건(동일·깨진 요청 0) |

### B — loadHomeRecent 실행 횟수 (로그인 시뮬: os_token/os_user 주입, appstate:ready 1회)
| 지표 | before | after |
|---|---|---|
| loadHomeRecent 실행 | **2회(중복)** | **1회** ✅ |

→ 홈 API 세트(posts/users/board_reads/뱃지 등)가 로그인 진입 시 2배→1배.

## 완료 기준 대조
1. html2canvas 초기 blocking 요청 0건 → ✅ 측정(1→0)
2. 카드 저장·복사 정상 → 실행 4지점 전부 lazy 경유(정적 확정). 실제 클릭 = 로그인 라이브 검수(대표)
3. loadHomeRecent 1회 → ✅ 측정(2→1)
4. 초기 Fetch 수 감소 → A(html2canvas 1건 제거) + B(홈 세트 절반)
5. posts/users/board_reads/뱃지 중복 감소 → B로 중복 세트 제거
6. 첫 화면 표시시간 → 641→412ms(비로그인 단발 참고). 로그인 정밀치=대표 DevTools
7. 일반·임태성 회귀 없음 → 전역 로드(게이트 무관)·정적+비로그인 무회귀. 로그인 회귀 = 대표 라이브 검수

## 오늘 제외 (다음 트랙)
- C. Pretendard self-host·서브셋·font-display:swap(전역 폰트)
- D. app.html 분리·minify(대개편 트랙과 함께)

## 검수 안내
- 전체 사용자 영향 → **대표님 로그인 브라우저 DevTools Network before/after 확인 + 머지 결재** 필요.
- Netlify 자동빌드 중단 상태(Deploy Preview 미생성) → 검수는 대표 로컬/라이브 기준.
