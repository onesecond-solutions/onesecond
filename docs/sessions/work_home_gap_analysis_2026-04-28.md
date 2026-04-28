# pages/home.html 승격 진입 전 갭 분석 — 2026-04-28

> **단계:** 작업지시서 §0~10 분석 보고서 (코드 수정 0건). 팀장님 §10 결정 후 2차 phase.
> **참조 메인 트랙:** `docs/sessions/_INDEX.md` (Phase 1 — home은 진행 순서 2번, board ✅ / index ✅ 다음)
> **검수 한계:** Claude Code 라이브 브라우저 검수 불가. 정적 코드 분석 + 시안 비교 + 4/28 회귀 노트 검토 기반.

---

## 0. 정합성 검증 + §1 사전 정리 결과

| 항목 | 결과 |
|---|---|
| 메인 트랙 활성 | ✅ |
| 작업 브랜치 | `docs/home-gap-analysis` |
| **`feat/home-gpt-v1-adoption` 브랜치** | ❌ **이미 정리됨** (로컬·원격·reflog 0건) |
| **GPT v1 stash 보관물** | ❌ **이미 정리됨** (`git stash list` 빈 결과) |

→ 작업지시서 §1 "stash drop + 브랜치 삭제"는 **추가 작업 불필요**. 4/28 심야 노트(`docs/sessions/2026-04-28_0004.md`)에 stash·브랜치 보관 명시됐지만 이후 어느 시점에서 정리됨 (정확한 시점은 reflog에도 흔적 없어 미특정).

---

## 2~3. 사전 확인 — home 폴더 + 줄 수 + 특수성

### 파일 인벤토리

| 파일 | 줄 수 | 비고 |
|---|---|---|
| `claude_code/design_test/home/v1.html` | 873 | 초기 시안 |
| `claude_code/design_test/home/v1-full.html` | **821** | v1 완성본 (4/27 17:41 마지막 수정) |
| `claude_code/design_test/home/v2-full.html` | **1,202** | **프리미엄 리뉴얼** (확장 토큰 + A2 제거 + 6각 그라·aura) |
| `claude_code/design_test/home/notes.md` | 100 | v1 후속 수정 + 4/24 사고 단서 |
| `pages/home.html` (라이브) | **983** | fragment (DOCTYPE 0건, app.html이 D 영역에 fetch 렌더링) |

### home.html 특수성 — **fragment 페이지 (board/index와 다름)**

| 항목 | home.html 라이브 |
|---|---|
| HTML 형식 | **fragment** (DOCTYPE/`<html>`/`<body>` 0건) |
| 로딩 방식 | `app.html` D 영역에 `switchMenu('home')` 호출 시 fetch + innerHTML 주입 |
| `tokens.css` 참조 | **자체 link 없음** — 셸(app.html)이 미리 로드 |
| 페이지 로컬 `:root` | **0건** (override 없음. tokens.css 본체 값 그대로 사용) |
| JS 의존 외부 함수 | `window.homeNodeHover/Out/Click`, `window.homePreviewSearchEnter`, `window.homePreviewQuickToggle`, `window.homeTipCtaClick`, `switchMenu` 등 — app.html 또는 다른 컨텍스트에 정의 |

**시안 v1-full / v2-full**:
- 둘 다 **standalone HTML** (`<link rel="stylesheet" href="../../../css/tokens.css">` + 자체 `<head>`/`<body>`)
- 더블클릭 미리보기용 — 시안 폴더 README 정책 정합

→ **board/index 패턴(시안 통째 승격) 그대로 적용 불가**. 시안의 home **영역만 추출**해서 라이브 fragment에 넣어야 함.

---

## 4. home.html 특수성 점검 결론

| 항목 | 결과 |
|---|---|
| 단독 HTML vs fragment | **fragment** 100% |
| tokens.css 참조 방식 | 셸 의존 (라이브 fragment에서 직접 link 추가 시 중복 로드) |
| app.html D 영역 정합 | 라이브 home이 4/24 확정 레이아웃 사용 (좌측 30px 카피 패딩 / hex `margin-top: -160px` 수직 상승) |

---

## 5. 섹션 구조 갭

### 라이브 home.html 영역 (line 별)

| 위치 | 영역 | 책임 |
|---|---|---|
| 1-50 | 주석 + 메타 | 문서 |
| 30-340 | `.home-intro-*`, `.home-a2-preview-*`, `.home-quick-*` CSS | 페이지 헤더·검색·Quick 미리보기 |
| 105-190 | `.home-hex-*` SVG/노드/툴팁 CSS | **6각 다이어그램 (4/28 회귀 핵심)** |
| 425-490 | HTML 마크업 | intro 헤더 + A2 미리보기 + hex wrap 빈 컨테이너 |
| 487 | `<div class="home-hex-wrap" id="homeHexWrap"></div>` | **JS가 SVG 동적 렌더 마운트 포인트** |
| 495-983 | JS (`renderHex`, `renderTooltips`, `homeNodeClick` 등) | hex 6노드 + 툴팁 + CTA 동적 렌더 |

### 시안 v1-full.html home 영역

| 위치 | 영역 |
|---|---|
| 532 | `.home-intro-badge` |
| 573 | `.home-hex-wrap id="homeHexWrap"` (라이브와 동일 구조) |
| 599 | `<footer class="site-footer">` (단독 페이지 푸터, fragment 이전 시 제외) |
| 330-358 | `.home-hex-*` CSS (라이브와 거의 동일 클래스 체계) |

### 시안 v2-full.html (다른 패턴)

| 위치 | 영역 |
|---|---|
| 916 | `<main class="d">` (셸 흡수 구조) |
| 920 | `<section class="hero">` (라이브 home과 다른 섹션 구조) |
| 511-538 | `.hex-*` (home- 접두 **없음**, 다른 클래스 체계) |
| 1016 | `<footer class="footer">` |

→ **v2-full.html은 라이브 home과 클래스 체계 자체가 다름** (`hex-*` vs `home-hex-*`). 통째 채택 시 클래스 일괄 변경 필요.

### 시안↔라이브 매핑

| 라이브 클래스 | 시안 v1 | 시안 v2 | 갭 |
|---|---|---|---|
| `.home-intro-header` `.home-intro-badge` `.home-intro-title` `.home-intro-sub` | ✅ 존재 | ❌ (`.hero-*`로 다른 구조) | v1 1:1 매핑 / v2 클래스 체계 다름 |
| `.home-a2-preview-*` (검색·Quick 미리보기) | (확인 필요, 시안에 없을 가능성) | ❌ (시안 v2 A2 제거 명시) | 라이브 전용 가능성 |
| `.home-hex-wrap` `.home-hex-svg` `.home-hex-node` `.home-hex-line` | ✅ 동일 | ❌ (`.hex-*` 접두 없음) | v1 정합 |
| `.home-hex-tooltip` 6방향 (`[data-pos]`) | (확인 필요) | (확인 필요) | 라이브 v3.2 신규 (4/23) |
| `.home-hex-center` `.home-hex-logo-img` | (확인 필요) | (확인 필요) | 4/24 logo05.png 중앙 이동 흔적 |
| `<footer>` | `<footer class="site-footer">` 단독 페이지 푸터 | `<footer class="footer">` | **fragment에 footer 없음 — 시안 footer 가져오면 안 됨** |

---

## 6. 디자인 갭 (카테고리별)

### A. 색상 / 배경 — **이미 정합 (효익 거의 없음)**

| 항목 | 라이브 home | 시안 v1-full |
|---|---|---|
| 페이지 로컬 `:root` | **0건** | 자체 :root 있음 (라이브 4/24 확정값 일부 override) |
| 옛 브라운 fallback | **0건** (4/27 sweep 슬롯 4 베이스라인 0 검증) | **0건** |
| standalone hex | **1건** (`#b86a44` 어디 1곳) | 0건 |
| `--brown-*` 페이지 변수 | 0건 | 0건 |
| tokens.css 본체 의존 | 100% (var() 사용) | 시안 :root override + tokens.css |

→ **라이브 home은 이미 v1 라이트 톤 적용 완료 상태**. tokens.css 본체가 4/27 `71f08b0` 커밋으로 v1 톤 통합됐고, home은 페이지 로컬 override 0건이라 자동으로 새 톤이 적용됨. **시안 통째 승격의 색상 효익이 board/index와 달리 거의 0**.

### B. 여백 / 간격 — **4/24 확정 레이아웃 보존 영역**

`notes.md` 명시 (4/24 확정):
- `.home-intro-header` `padding: 12px 16px 12px 30px` (좌측 30px 카피 패딩)
- `.home-hex-wrap` `margin-top: calc(-40px * 4) = -160px` (수직 상승)
- v1 초안에서 이 두 값을 덮어버린 적 있음 → 4/25에 v1 후속 수정으로 복구

→ **승격 시 이 두 값 절대 덮어쓰지 말 것**. notes.md 명시: "홈은 어제 상태 그대로 유지. v1 오버라이드 전부 제거. 색상·호버 하이라이트만 유지."

### C. 타이포그래피
- 양쪽 모두 `var(--font-sans)`, `--text-*` 토큰 사용. 큰 차이 없음.

### D. 레이아웃 / 구조
- 라이브: app.html D 영역에 들어가는 fragment. 컨테이너 폭은 셸이 결정
- 시안 v1: standalone에서 `.d-inner { padding: 40px 32px; max-width: 900px }` 정의 (notes.md 명시) — fragment에 그대로 넣을 수 없음 (셸 D 영역과 충돌)
- 시안 v2: `<main class="d">` 셸 흡수 구조. 라이브는 이미 셸 안에 들어가 있어 중복

### E. 컴포넌트 — D 영역 콘텐츠 표준 정합

라이브 home은 D 영역 안에 직접 콘텐츠 펼침 (헤더 카드 / 본문 카드 컨테이너 분리 안 함). 다른 페이지(board/myspace 등)와 다름. **승격 시 표준 컨테이너 카드형으로 변경할지 결정 필요**.

### F. 반응형
- 라이브 home: 미디어쿼리 (확인 미진행, 별도 검수 필요)
- 시안 v1: tokens.css의 BP 사용
- 시안 v2: 더 다양한 BP 분기

### G. JS 동작

라이브 home에 정의된 함수 (line 495~):
- `angleToXY` / `renderHex` / `computeTooltipStyle` / `renderTooltips` / `escapeHTML` 등
- 6각 다이어그램 동적 SVG 렌더 + 툴팁 6방향 인터랙션 + 미리보기 로직

시안 v1-full에는 동일 함수가 있는지 검증 필요. 일부만 있을 가능성.

---

## 7. 4/28 회귀 사고 영역 특별 점검

### hexagon / 노드 / 도넛 마크업 패턴

라이브 SVG 패턴:
- `.home-hex-wrap` 빈 컨테이너 + JS `renderHex()` 동적 SVG 생성
- `.home-hex-node` `<g>` 요소 + `.home-hex-node-rect` `<rect>` + `.home-hex-node-label` `<text>` (SVG 내부)
- 라이브 = **SVG rect+text 패턴**

시안 v1-full:
- `.home-hex-svg`, `.home-hex-node-rect`, `.home-hex-node-label` 정의 존재 — **라이브와 동일 SVG 패턴**

시안 v2-full:
- `.hex-*` 다른 클래스 체계 + animation `nodeEnter` 추가 — **다른 패턴**

### 4/28 심야 회귀 가설 검증

| 가설 | 검증 결과 |
|---|---|
| **가설 1**: 옵션 B(HTML absolute 카드) 패턴이 라이브 SVG 컨테이너와 충돌 | ✅ **유력** — 라이브는 `<svg>` 안에 노드를 그림. HTML `<div absolute>`로 교체 시 SVG viewport 좌표계와 HTML 좌표계 충돌. CSS `position: absolute`가 SVG 좌표계 안에서는 의도대로 작동 안 함 |
| **가설 2**: `width: calc()` + `aspect-ratio` 조합 문제 | 검증 미완 — 4/28 노트에 명시됐으나 단독 사유 가능성은 낮음 |
| **가설 3**: 다른 원인 | hexagon·노드·도넛 동시 미표시 → 단일 컨테이너(`.home-hex-wrap`) 자체가 깨졌을 가능성. notes.md "홈 레이아웃 v1 오버라이드 전부 제거 사고"와 동일 패턴 |

### B 사이드바 "함께해요" 활성 오작동

**책임 분리**:
- home.html은 **fragment**. 사이드바(B 영역)는 **app.html 책임**
- home 진입 시 `switchMenu('home')` 호출 → app.html이 `data-menu="home"` 메뉴 활성 토글
- "함께해요" (`data-menu="together"`)가 잘못 활성된 건 app.html `_applyMenuActive` 또는 유사 로직 버그
- → **home.html 승격 작업과 무관한 별 트랙**. 이번 작업에서는 보고만, 별도 진단 필요

### v1 vs v2 차이 요약

| 항목 | v1-full | v2-full |
|---|---|---|
| 줄 수 | 821 | 1,202 (1.5×) |
| 클래스 체계 | `.home-hex-*` (라이브 1:1) | `.hex-*` (다른 체계) |
| 셸 흡수 | standalone | `<main class="d">` 셸 흡수 |
| 디자인 컨셉 | "초기" — 라이브 구조 보존 + 색상만 중성화 | **"프리미엄 리뉴얼"** — 확장 토큰 + A2 제거 + 6각 그라데이션 + aura |
| 라이브와의 정합성 | 높음 (1:1 매핑 가능) | 낮음 (클래스 일괄 변경 필요) |

---

## 8. 위험 영역

### 🔴 시안에만 있는 신규 요소
- v1: 명확한 신규 요소 적음 (라이브 구조 보존이 v1 의도)
- v2: A2 제거, 6각 그라·aura, hero 통계 카드, 듀얼 모니터 (확인 미완)

### 🟡 라이브에만 있는 기존 요소 (제거 시 누락 위험)
- **6방향 툴팁** (`.home-hex-tooltip` `[data-pos="12/2/4/6/8/10"]`) — 4/23 v3.2 신규. 시안에 미존재 추정
- **A2 미리보기** (검색 + Quick 드롭다운) — `.home-a2-preview-*` 클래스. 시안 v2는 A2 제거 명시
- **JS 동적 렌더** (`renderHex`, `renderTooltips`, etc.) — 라이브 핵심 동작. 시안에 동등 함수 미확인
- **4/24 확정 레이아웃** (좌측 30px / hex -160px) — notes.md "건드리지 말 것" 명시

### 🟠 외부 의존
- **app.html D 영역** — fragment 마운트 + window.* 함수 정의 + tokens.css 로드
- **B 사이드바 메뉴 활성 토글** — app.html 책임. home 자체 책임 아님
- **logo05.png** (`assets/images/logo/logo05.png`) — 라이브 home의 6각 중앙에서 사용 (`pages/home.html:664`)

---

## 9. 적용 방식 권장 — **(D) 승격 보류 + 부분 정렬** ⭐

### 전제 — board/index와 home의 본질적 차이

| 항목 | board/index | home |
|---|---|---|
| 페이지 형식 | standalone HTML | **fragment** |
| 색상 톤 | 라이브가 옛 브라운 → 시안 라이트 톤으로 큰 효익 | **이미 라이트 톤 적용 완료** (페이지 로컬 override 0건) |
| 시안 통째 승격 적합성 | 높음 | 낮음 (fragment + 4/24 확정 레이아웃 + JS 동적 SVG) |
| 4/28 회귀 이력 | 없음 | **있음** (HTML absolute 카드 패턴 실패) |

### 권장 — (D) 승격 보류 + 부분 정렬

**근거:**
1. 색상 효익 거의 없음 (이미 v1 라이트 톤 적용 완료)
2. 4/24 확정 레이아웃이 강제 보존 영역 (notes.md 명시)
3. JS 동적 SVG 렌더 + 6방향 툴팁(라이브 v3.2 신규)이 시안에 부재
4. 4/28 회귀 사고 직접 영역 — 재시도 시 사전 결정 사항 다수
5. v2-full 클래스 체계 자체가 다름 (대규모 변경)
6. **Phase 1 우선순위 재조정 가능** — home은 이미 운영 가능 상태, 다른 미진행 페이지(myspace/scripts/news/quick/together/admin) 우선 승격이 사이트 전체 톤 통일에 효익 큼

### 대안 옵션

| 옵션 | 설명 | 효익 | 위험 |
|:---:|---|---|---|
| (A) 시안 v1 통째 승격 | board/index 패턴 적용 시도 | 낮음 (이미 정합) | fragment 처리 + 4/24 레이아웃 보존 + footer 제외 등 변환 작업 多 |
| (B) v1 골격 + 라이브 함수 이식 | 라이브 SVG 패턴 + 시안 색·여백 미세 조정 | 미미 | 4/28 회귀 재발 가능성 |
| (C) v2 시각 요소만 부분 흡수 | hero 통계 / 도넛 / 라인 그라 / aura 등 시안 v2 요소만 라이브에 추가 | UX·시각 효익 있음 (사용자 인상 강화) | 4/28 옵션 B 패턴 실패 사례. SVG 패턴 보존 + HTML 추가 영역 분리 필요 |
| **(D) 승격 보류 + 부분 정렬 (권장)** | home은 운영 가능 상태로 보류. 다른 페이지 승격 우선 | Phase 1 진행 속도 ↑ | 4/24 레이아웃·SVG 안정성 보존 |

### v1 vs v2 의견 (시안 채택 시)

- **v1-full**: 라이브 클래스 1:1 정합. 4/28 회귀 직전 시도 영역. 색상 외 효익 적음.
- **v2-full**: 다른 클래스 체계. 통째 채택 시 라이브 home 통째 재작성 (가장 큰 변경). 단, 시각 효익 큼 (프리미엄 리뉴얼).
- → **v1보다 v2 시각 요소만 부분 흡수가 효익 대비 위험 균형 더 좋음** (옵션 C). 단 4/28 옵션 B 실패 패턴 회피 설계 필수.

---

## 10. 사전 결정 항목 (팀장님 §10 단계)

승격 전 결정 부탁:

| # | 항목 | 옵션 | 권장 |
|:---:|---|---|---|
| 1 | **적용 방식** | (A) 시안 v1 통째 / (B) v1 골격 + 함수 / (C) v2 시각 요소만 부분 / **(D) 승격 보류** | **(D)** — Phase 1 다음 페이지(scripts/myspace 등) 우선 |
| 2 | (D) 채택 시 home 처리 | (a) Phase 1 9번으로 후순위 이동 / (b) Phase 2(개편 후) 별 트랙 / (c) 영구 보류 | (a) — 우선순위만 후순위로 |
| 3 | (C) 채택 시 흡수 요소 우선순위 | hero 통계 / 중앙 도넛 / 라인 그라 / aura / Quick 메뉴 라벨 (5건) | hero 통계 + 중앙 도넛 (시각 효익 큼) |
| 4 | (C) 채택 시 옵션 B 실패 회피 설계 | (a) HTML absolute 카드 폐기, SVG 패턴 유지 / (b) `<foreignObject>` 사용 / (c) HTML 영역 별도 컨테이너 분리 | (c) — SVG 컨테이너 외부에 HTML 영역 추가 |
| 5 | 4/24 확정 레이아웃 (좌측 30px / hex -160px) | (a) 절대 보존 / (b) 시안 값으로 대체 | (a) — notes.md 명시 |
| 6 | A2 미리보기 (검색 + Quick 드롭다운) | (a) 보존 / (b) 시안 v2처럼 제거 | (a) — 운영 중 기능 |
| 7 | 6방향 툴팁 (`.home-hex-tooltip`) | (a) 보존 / (b) 시안 패턴으로 대체 | (a) — 라이브 v3.2 신규 |
| 8 | B 사이드바 "함께해요" 활성 오작동 | home 작업 범위에서 (a) 분리 (별 트랙) / (b) 함께 처리 | (a) — app.html 책임 영역 |

---

## 11. 라이브 검수 권장 (Claude Code 정적 분석 한계)

다음은 라이브 검수 영역 — 사용자 직접 확인 필요:

1. **라이브 home 현재 시각 상태** — hexagon·노드·도넛·툴팁 정상 표시 여부 (4/28 회귀 흔적 잔존 의심)
2. **4/24 확정 레이아웃 시각** — 좌측 30px 카피 패딩 / hex -160px 수직 상승이 의도대로 적용 중인지
3. **B 사이드바 "함께해요" 활성 오작동** — home 진입 시 메뉴 표시 정상 여부
4. **logo05.png 6각 중앙 표시** — 직전 헤더 logo05 회귀와 같은 영역 (이미지 미표시 여부)

---

## 12. 다음 단계

[§10 결정] 팀장님 옵션 답변 받으면 동일 브랜치(`docs/home-gap-analysis`) 종결 + 결정에 따라:
- (D) 채택: _INDEX.md 메인 트랙 표 갱신 (home 후순위 + 다음 페이지 진입)
- (A/B/C) 채택: 별도 작업지시서 + 새 fix/feat 브랜치

---

*본 보고서는 코드 수정 0건. pages/home.html / claude_code/design_test/home/* 어떤 파일도 수정하지 않음.*
