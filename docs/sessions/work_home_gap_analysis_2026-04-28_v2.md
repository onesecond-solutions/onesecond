# pages/home.html 승격 진입 전 갭 분석 v2 — 2026-04-28

> **단계:** 작업지시서 재점검 요청 v2 (코드 수정 0건). v1 보고서 결론 정정.
> **v1 정정 사유:** "라이브 home이 이미 라이트 톤 자동 적용, 시안 통째 승격 효익 거의 없음" 결론은 잘못된 도출. **":root override 0건"은 fragment 구조의 본질이지 시안 정합 증거가 아님**. 색상 외 영역(통계 카드·도넛·C 콘텐츠 등)에서 명백한 시각 차이 다수 발견.
> **v1 보고서 위치:** `docs/sessions/work_home_gap_analysis_2026-04-28.md` (참조용 보존, 결론은 본 v2가 우선)

---

## 0. 정합성 검증 — 통과
- 메인 트랙 활성, 작업 브랜치 `docs/home-gap-analysis-v2`
- v1 보고서 §1 stash·브랜치 폐기 결과(이미 정리됨) 그대로 유효

---

## 1. v1 결론 오류 정정

### 잘못된 추론
v1 §6-A: "라이브 home은 페이지 로컬 :root 0건 → tokens.css 본체 자동 적용 → 시안 승격 색상 효익 거의 없음"

### 정정
- ":root override 0건"은 **fragment 페이지의 본질**. home.html은 app.html에 fetch되어 들어가므로 **자체 :root 정의가 불가능**. 이게 "정합 증거"로 해석된 건 오류.
- **색상 외 영역에서 명백한 시각 차이 다수 존재**:
  - hero 통계 3카드 (시안에 있고 라이브에 없음)
  - hero 서브 카피 (양쪽 다른 문장)
  - 중앙 도넛 SVG (그라데이션 정의 양쪽 다름)
  - hero 배지 (단순 pill vs dot 강조 패턴)
  - C 영역 콘텐츠 (시안 실제 콘텐츠 vs 라이브 플레이스홀더)

### 사용자가 본 시안의 정체
- v1-full.html이 아닌 **v2-full.html** (1,202줄, "프리미엄 리뉴얼" 시안)
- v1-full는 라이브와 거의 동일한 구조 보존 (의도적). v2가 디자인 개편 시안.
- v1 보고서가 v1-full만 깊게 분석하고 v2는 표면만 본 것이 결정적 누락 원인

---

## 2. 5개 영역 시안(v2-full) vs 라이브 정확 비교

### 영역 1 — hero 통계 3카드 (17년 / 6가지 / 10단계)

| | 시안 v2-full | 라이브 home.html |
|---|---|---|
| 마크업 | `<div class="hero-stats">` 안 3개 카드 (line 933-947) | **❌ 마크업 자체 없음** |
| CSS | `.hero-stats` `.hero-stat-label` `.hero-stat-value` `.sub` (line 479-503) | 없음 |
| 콘텐츠 | "현장 경력 17년" / "핵심 카테고리 6가지" / "상담 단계 10단계" | — |
| **갭 종류** | **🔴 시안에만 있음 — 신규 추가 영역** | |

### 영역 2 — hero 카피

| | 시안 v2-full | 라이브 home.html |
|---|---|---|
| 메인 슬로건 | "통화 중 멈추는 순간, **원세컨드**가 이어갑니다" | **동일** |
| 서브 카피 | "**17년 대면 · TM 보험 현장**에서 검증된 멘트들. 고객이 멈추는 그 한마디 앞에, 읽기만 하면 되는 문장이 준비됩니다." | "17년 대면 · TM 보험 현장에서 나온 도구. 막히는 순간, 화면에 보이는 그대로 읽으세요." |
| 클래스 체계 | `.hero-badge` (with dot) / `.hero-title` (with .gradient .underline-accent) / `.hero-sub` (with strong) | `.home-intro-badge` / `.home-intro-title` (with .accent) / `.home-intro-sub` |
| **갭 종류** | 🟡 카피 문장 다름 + 클래스 체계 완전 다름 | |

### 영역 3 — 중앙 도넛 SVG (그라데이션)

| | 시안 v2-full | 라이브 home.html |
|---|---|---|
| SVG `<defs>` | `<linearGradient id="nodeHoverGrad">` 호버용 + `<radialGradient id="lineGrad" stop-color="#D4845A">` 라인용 (시안 line 989-1003) | **❌ defs 0건** (단순 stroke·fill만) |
| 중앙 컨테이너 | `.hex-center` + `.hex-center-inner` 2겹 (시안 line 1004) | `.home-hex-center` 단일 |
| 중앙 이미지 | `<img src="../../../assets/images/logo/logo05.png">` (시안 standalone 경로) | `.home-hex-logo-img` (`assets/images/logo/logo05.png` 라이브 경로) |
| 클래스 체계 | `.hex-*` (home- 접두 **없음**) | `.home-hex-*` |
| **갭 종류** | 🟡 그라데이션 정의 다름 + 컨테이너 2겹 vs 1겹 | |

### 영역 4 — C 영역 공지/추천 콘텐츠

| | 시안 v2-full | 라이브 |
|---|---|---|
| 마크업 위치 | `<aside class="c">` 시안 단독 페이지 안 (line 996+) | `app.html:668-671` `c-section#c-home` 안 (home.html fragment 외부) |
| 콘텐츠 1 | "오늘의 공지 / 4월 인수기준 변경 안내 / A·B사 공통 적용되는 기준 조정 사항. 30대 여성 표준체..." | "오늘의 공지 / 공지사항 / 오늘의 공지 내용이 표시됩니다." (플레이스홀더) |
| 콘텐츠 2 | "🔥 추천 / 오늘의 추천 스크립트 / 클로징 — 생각해볼게요 대응 3단계가 이번 주 가장 많이..." | "추천 배너 / 오늘의 추천 / 추천 스크립트 및 배너가 표시됩니다." (플레이스홀더) |
| 클래스 | `.c-card` (시안) | `.c-box` (라이브) |
| **갭 종류** | 🟠 **app.html 책임 영역** (home.html fragment와 별개). 흡수 시 app.html 수정 필요 | |

### 영역 5 — hero 배지 ("현직 보험 설계사가 직접 만든 TM 상담 도구")

| | 시안 v2-full | 라이브 |
|---|---|---|
| 마크업 | `<div class="hero-badge"><span class="dot"></span>현직 ...</div>` | `<div class="home-intro-badge">현직 ...</div>` |
| 시각 강조 | `.dot` 작은 원 점 + 시안 v2 디자인 토큰 (--brand-50 배경 등 추정) | pill 배지 단순 |
| **갭 종류** | 🟡 배지 패턴 다름 (dot 신규) — 텍스트 동일 | |

---

## 3. fragment 구조 제약 하에 시안 영역 흡수 방법

### 흡수 가능성 분류

home.html은 fragment (DOCTYPE/`<html>`/`<body>`/`<head>` 0건). 시안 흡수 시 다음 변환 필요:

| 시안 영역 | 흡수 방법 | 변환 필요 |
|---|---|---|
| hero 통계 3카드 | **fragment 직접 추가** (가장 단순) | 클래스명 `.hero-stats` → 라이브 컨벤션 정렬 결정 (`.home-hero-stats` 또는 `.hero-stats` 그대로) |
| hero 카피·배지 강화 | **기존 마크업 교체** | 클래스 체계 그대로 두고 카피만 교체 / 또는 새 클래스 도입 |
| 중앙 도넛 그라데이션 | **JS renderHex 함수 수정** + 시안 `<defs>` 추가 | 라이브 `.home-hex-svg` JS 동적 렌더 코드(line 593+)에 `<defs>` 삽입 로직 추가 |
| C 영역 콘텐츠 | **app.html `c-section#c-home` 직접 수정** | home.html fragment 작업 범위 외 — 별 트랙 |
| 배지 dot 패턴 | **마크업 + CSS 동시 추가** | `<span class="dot">` 추가 + `.home-intro-badge .dot` CSS 추가 |

### 클래스 체계 결정 필요

시안 v2: `.hero-*` (home- 접두 **없음**)
라이브: `.home-intro-*`, `.home-hex-*` (home- 접두 보유)

→ 흡수 시 두 옵션:
- **(a) 라이브 컨벤션 유지** (`.home-hero-stats` 등으로 변환): 클래스 namespace 정합. home 영역 임을 명확히 표시
- **(b) 시안 클래스 그대로** (`.hero-stats`): 시안 1:1 정합. 다른 페이지에서 같은 `.hero-*` 사용 시 namespace 충돌 가능

---

## 4. 4/24 확정 레이아웃 보존 영역 vs 흡수 충돌 점검

| 보존 영역 | 흡수 영역 | 충돌 여부 |
|---|---|---|
| `.home-intro-header padding: 12px 16px 12px 30px` (좌측 30px) | hero 통계 3카드 추가 | ❌ **충돌 없음** — 통계는 `.home-intro-header` 밖에 별 마크업 추가 (또는 안에 추가해도 padding-left 영향 X) |
| `.home-hex-wrap margin-top: calc(-40px * 4) = -160px` (수직 상승) | 중앙 도넛 그라데이션 (`<defs>` 추가) | ❌ **충돌 없음** — `<defs>`는 SVG 내부 정의, margin-top과 무관 |
| `.home-intro-header` 좌측 정렬 | hero 카피 강화 | ❌ **충돌 없음** — 마크업 변경하더라도 컨테이너 정렬 유지 가능 |
| 빠른실행 launcher (.c-quick-launcher app.html:654) | C 영역 콘텐츠 흡수 | ❌ **충돌 없음** — `.c-quick-launcher`는 `.c-section` **위**에 별 영역. 콘텐츠 갱신은 `c-section` 안 c-box만 영향 |

→ **모든 흡수 영역이 4/24 확정 레이아웃과 충돌 없음**. 안전 진행 가능.

---

## 5. C 영역 ⚡ 빠른 실행 버튼 보존 명시

**위치**: `app.html:654` `<div class="c-quick-launcher">` (`.c` 컬럼 최상단, c-section 위)

**보존 보장**:
- C 영역 콘텐츠 흡수는 `c-section#c-home` 안 `.c-box` 3개 콘텐츠 갱신만
- `.c-quick-launcher`는 `.c-section`과 별 마크업·별 영역 → 영향 없음
- 빠른실행 v2 사양 (메모리 `project_quick_overlay_v2_spec.md`)도 별 트랙 — 본 작업과 무관

---

## 6. 위험 영역 재정리

### 🔴 시안에만 있는 신규 요소
- hero 통계 3카드 (현장 경력 / 핵심 카테고리 / 상담 단계)
- 중앙 도넛 그라데이션 (`linearGradient`, `radialGradient`)
- hero 배지 dot (.dot 점 강조)
- C 영역 실제 콘텐츠 3건

### 🟡 라이브에만 있는 기존 요소 (제거 시 누락 위험)
- 6방향 툴팁 (`.home-hex-tooltip [data-pos]` — 4/23 v3.2 신규)
- A2 미리보기 (검색 + Quick 드롭다운)
- 4/24 확정 레이아웃 (좌측 30px / hex -160px)
- JS 동적 렌더 함수 (`renderHex`, `renderTooltips`, `homeNodeClick` 등)

### 🟠 외부 의존
- app.html `c-section#c-home` (C 영역 콘텐츠 책임)
- app.html B 사이드바 메뉴 활성 토글 (4/28 함께해요 오작동 영역)
- tokens.css 본체 (셸 로드)
- logo05.png

---

## 7. 적용 방식 재권장 — (C) 부분 흡수 단계 분할

v1 보고서의 (D) 승격 보류 권장은 **철회**. (C) 부분 흡수가 정답.

### 단계 분할 (위험·효익 순)

| 단계 | 흡수 영역 | 효익 | 위험 | 권장 |
|:---:|---|---|---|:---:|
| **C-1** | hero 통계 3카드 신규 추가 | 🟢 큰 시각 효익 (사용자 인상 강화), 17년 신뢰 강조 | 🟢 낮음 (별 마크업 추가) | ⭐ 1순위 |
| **C-2** | hero 배지 dot 패턴 강화 | 🟡 작은 시각 효익 | 🟢 낮음 (CSS only) | 2순위 |
| **C-3** | hero 서브 카피 갱신 ("검증된 멘트들. 고객이 멈추는 그 한마디 앞에, ...") | 🟡 카피 강화 (운영 가치 명확화) | 🟢 낮음 (텍스트만) | 3순위 |
| **C-4** | 중앙 도넛 그라데이션 (`<defs>` 추가) | 🟡 시각 디테일 향상 | 🟡 JS renderHex 수정 필요 | 4순위 |
| **C-5** | C 영역 c-section#c-home 콘텐츠 갱신 (app.html 수정) | 🟡 운영 데이터 진실성 (플레이스홀더 → 실제 카피) | 🟠 app.html 작업 범위 — **별 트랙** | 별 트랙 |

### 위험 회피 설계 (4/28 옵션 B 패턴 실패 회피)

- **SVG 컨테이너 외부에 HTML 영역 추가**: hero 통계 3카드는 `.home-hex-wrap` 외부 `<div>` (예: `.home-intro-header` 다음, `.home-hex-wrap` 위 또는 아래) → SVG viewport 좌표계와 충돌 없음
- **JS renderHex `<defs>` 추가는 SVG 내부 동작**: 좌표계 동일 → 충돌 위험 낮음
- **클래스 체계는 라이브 컨벤션 유지** (`.home-hero-stats` 등 home- 접두 추가) → namespace 정합

### 클래스 체계 권장
- **(a) 라이브 컨벤션 유지** 권장 (`.home-hero-stats` `.home-hero-stat-*` `.home-hero-badge-dot` 등 home- 접두)
- 근거: 라이브 home의 모든 클래스가 `.home-*` namespace. 일관성 유지가 유지보수 + 다른 페이지(index 등)와 namespace 충돌 회피에 유리.

---

## 8. 사전 결정 항목 재도출 (v1 → v2 정정)

v1 §10 결정 8건 중 **#1만 (D) → (C) 변경**, 나머지는 부분 갱신.

| # | 항목 | v1 권장 → **v2 권장** | 비고 |
|:---:|---|---|---|
| 1 | **적용 방식** | (D) 승격 보류 → **(C) 부분 흡수** | 5개 영역 명백한 시각 차이 확인됨 |
| 2 | (C) 채택 시 단계 분할 | — | **C-1 → C-2 → C-3 → C-4** 순. C-5는 별 트랙 |
| 3 | (C) 흡수 우선순위 | hero 통계 + 중앙 도넛 → **hero 통계 (1순위) / 배지 dot (2순위) / 카피 갱신 (3순위) / 도넛 그라데이션 (4순위)** | 위험 낮은 순 |
| 4 | (C) 옵션 B 회피 설계 | (c) HTML 영역 별도 컨테이너 분리 | 그대로 유지 |
| 5 | 4/24 확정 레이아웃 | (a) 절대 보존 | 그대로 유지 (충돌 없음 확인) |
| 6 | A2 미리보기 | (a) 보존 | 그대로 유지 |
| 7 | 6방향 툴팁 | (a) 보존 | 그대로 유지 |
| 8 | B 사이드바 "함께해요" 오작동 | (a) 분리 (별 트랙) | 그대로 유지 |
| 9 | **클래스 체계** (신규) | — | **(a) 라이브 컨벤션 (`home-` 접두) 유지** 권장 |
| 10 | **C 영역 콘텐츠 (C-5)** (신규) | — | **별 트랙** (app.html 수정 작업으로 분리) |

---

## 9. 라이브 검수 권장 (Claude Code 정적 분석 한계)

흡수 진입 전 사용자 직접 확인:

1. **라이브 home 6각 다이어그램 현재 시각 상태** — hexagon·노드·도넛·툴팁 정상 표시 여부 (4/28 회귀 흔적 잔존 의심)
2. **4/24 확정 레이아웃** — 좌측 30px / hex -160px 의도대로 표시되는지
3. **C 영역 c-section#c-home 현재 표시 카피** — 라이브 플레이스홀더 vs 운영 콘텐츠 여부
4. **B 사이드바 "함께해요" 활성 오작동** — home 진입 시 발생 여부 (별 트랙 진단용)

---

## 10. 다음 단계

[§8 결정] 팀장님 옵션 답변 받으면 **새 작업지시서**로 단계별 진행 (C-1 우선):

- C-1 단독 작업지시서: hero 통계 3카드 신규 추가 (가장 단순, 큰 효익)
- C-2~C-4: 후속 트랙 (각 단계 별 작업지시서 또는 묶음)
- C-5 (C 영역 콘텐츠): app.html 별 트랙

---

*본 보고서는 코드 수정 0건. pages/home.html / claude_code/design_test/home/* / app.html 어떤 파일도 수정하지 않음.*

*v1 보고서(`work_home_gap_analysis_2026-04-28.md`)는 참조용 보존. 결론은 본 v2가 최종.*
