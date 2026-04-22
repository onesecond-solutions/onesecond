# Home 페이지 6각 다이어그램 개편 작업지시서

> **작성일:** 2026-04-23
> **버전:** v3.1 (2026-04-23 tokens.css 검증 기반 3.5절 보강)
> **작성자:** Claude AI (총괄 기획자)
> **실행자:** Claude Code
> **대상 파일:** `pages/home.html` (기존 파일 재작성 or 개편), `app.html` (필요 시 소폭 조정)
> **안전 원칙:** welcome.html 신설하지 않음. home.html 자체가 6각 다이어그램 홈. 첫 로그인/재방문 구분 없음.
>
> **v2 → v3 핵심 변경:**
> - `pages/welcome.html` 신설 **폐기**
> - `onboarding_dismissed_at` 컬럼, `welcome_page_enabled` feature flag **폐기**
> - `auth.js` 라우팅 로직 **폐기**
> - **`home.html` 자체가 6각 홈** — 모든 사용자가 로그인하면 이 화면을 봄
> - 검색기/빠른실행 노드 → **A2 UI 복제본을 6각형 위쪽에 인라인 펼침**
> - 나머지 4개 노드(스크립트/현장 Q&A/MY SPACE/함께해요) → `switchMenu(target)`로 이동
>
> **v3 → v3.1 보강 (2026-04-23):**
> - 3.5절 "공통 자산 활용 원칙" 신규 추가
> - tokens.css 검증 결과 공통 유틸리티 클래스(`.btn`, `.card`, `.input`, `.loading-placeholder`, `.page-header`, `.section-title`) 발견
> - 지시서 4~6절 CSS 샘플은 "참고용 예시"로 격하 — tokens.css 공통 자산이 우선
> - 예상 코드량 30~40% 절감, 디자인 일관성 자동 보장

---

## 🎯 0. 팀장님께 먼저 (Claude Code가 시작 전 반드시 확인)

**이 작업은 "home.html 개편"입니다. welcome.html 신설이 아닙니다.**

- `pages/home.html` 기존 파일 활용 (어제 미커밋 재작성본 380라인 있음)
- `pages/welcome.html` **생성 금지**
- `auth.js` **수정 금지**
- Supabase 컬럼/플래그 **추가 금지**
- `app.html` 수정은 최소화

**작업 전 체크:**
- [ ] 팀장님이 지시서 전체 읽고 승인 표시하셨는가?
- [ ] 현재 `pages/home.html`의 미커밋 상태 먼저 `view` 명령으로 확인 (어제 재작성한 380라인이 남아 있음)
- [ ] 확인 결과 기반으로 "재활용 vs 새로 작성" 본인이 판단

---

## 🎯 1. 프로젝트 개요

### 1-1. 배경 (WHY)

2026-04-20 AZ금융서비스 더원지점 4팀 40명에 원세컨드 배포 후, **"이것밖에 없는데 유료야?"** 반응 발생.

원인 진단:
- 카톡 입소문 유입 → `index.html`(랜딩) 안 읽음
- 로그인 직행 → 홈 화면이 기능 나열식 카드라 "이게 원세컨드의 전부인가" 오해
- 결과: 6가지 핵심 기능이 **유기적으로 연결된 도구**라는 정체성이 안 보임

### 1-2. 목표 (WHAT)

**홈 화면 자체를 정체성 전달 장치로 재설계.**
- 홈 = 6각 다이어그램 (중앙 원세컨드 + 6개 핵심 메뉴)
- 사용자가 홈에 들어올 때마다 자동으로 "원세컨드 = 6개 기능의 유기체"를 인식
- 매번 강제가 아니라, **자연스러운 탐색 UI**가 되어 반복 노출되도록 설계

### 1-3. 해결 방식 (HOW)

**기존 home.html을 6각 다이어그램 홈으로 개편.**

- 중앙: 원세컨드 로고 + "17년 현장이 담긴 TM 상담 도구" 카피
- 6개 외곽 노드: 스크립트 / 현장 Q&A / 빠른실행 / MY SPACE / 함께해요 / 검색기
- 하단: 호버 시 설명 패널 업데이트
- 검색기·빠른실행 노드: **실제 UI 복제본을 6각형 위에 인라인 펼침** (페이지 이동 없음)
- 나머지 4개 노드: 클릭 시 해당 메뉴로 `switchMenu()` 이동

### 1-4. 범위 (SCOPE)

**포함:**
- `pages/home.html` 개편 (어제 재작성본 기반으로 판단 후 진행)
- 검색기/빠른실행 UI 인라인 미리보기 영역 신설
- A2 검색창/빠른실행의 동작 함수 재활용

**제외 (이번 작업 아님):**
- `pages/welcome.html` 생성 금지
- `js/auth.js` 수정 금지
- Supabase 스키마 변경 금지
- 다른 `pages/*.html` 수정 금지
- `app.html`의 기존 A2 구조 수정 금지 (A2 함수를 **호출**만 할 것)

---

## 🎯 2. 파일 수정 목록

| 순번 | 파일 | 작업 | 변경 라인 수 (예상) |
|---|---|---|---|
| 1 | `pages/home.html` | 개편 또는 재작성 (판단 후) | ~500 라인 |
| 2 | `app.html` | 필요 시 home-mode CSS만 소폭 조정 | 0 ~ +10 |

**기존 파일 덮어쓰기는 home.html에만 적용. 다른 파일은 건드리지 않음.**

---

## 🎯 3. 어제 미커밋 home.html 처리 방침

### 3-1. 먼저 확인

Claude Code는 작업 시작 전 다음을 수행:

```
1. `pages/home.html` view (전체 또는 요약)
2. 어제 재작성본이 다음 조건을 얼마나 충족하는지 평가:
   - 6각 다이어그램 SVG 구조 ✅
   - 6개 노드 + 중앙 로고 ✅
   - 호버 시 설명 패널 업데이트 ✅
   - 펄스 애니메이션 ✅
   - 모바일 대응 (≤640px)
3. **부족한 것:**
   - 검색기/빠른실행 노드 클릭 시 A2 UI 복제본 인라인 펼침 기능
```

### 3-2. 판단 기준

- **기반 코드 품질이 양호하면** → 검색기/빠른실행 인라인 미리보기 기능만 추가 (권장)
- **구조적 문제가 있으면** → 이 지시서 기준으로 새로 작성
- 판단 근거를 보고서에 명시

### 3-3. 판단 후 작업

어느 쪽이든 최종 결과물은 본 지시서의 4~8절 요구사항을 **100% 충족**해야 함.

---

## 🎯 3.5. 공통 자산 활용 원칙 (2026-04-23 보강)

### 3.5-1. 배경

2026-04-23 tokens.css 검증 결과, **tokens.css 파일(142~324줄)에 이미 풍부한 공통 유틸리티 클래스와 CSS 변수가 정의되어 있음**이 확인되었다.

이 지시서 4~6절의 CSS 샘플은 `.home-*` 접두사로 많은 커스텀 클래스를 정의하고 있으나, **대부분 tokens.css의 기존 공통 클래스로 대체 가능**하다. 이를 활용하면:
- 코드량 30~40% 절감 예상
- 디자인 일관성 자동 보장 (전체 페이지와 스타일 동기화)
- 유지보수 단일 포인트 (tokens.css 수정 시 home도 자동 반영)

### 3.5-2. 절대 원칙

1. **커스텀 클래스 작성 전 tokens.css 먼저 검색** — 같거나 유사한 클래스가 이미 있으면 그것을 사용
2. **하드코딩된 값이 있다면 tokens.css의 CSS 변수로 대체 가능한지 확인**
3. **커스텀이 꼭 필요한 경우에만** `.home-*` 접두사로 신규 정의 (예: 6각형 SVG 전용 스타일)

### 3.5-3. 활용 대상 공통 자산

**CSS 클래스 (tokens.css 142~324줄 정의됨, 재정의 금지):**

| 클래스 | 용도 | home.html 활용처 |
|---|---|---|
| `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost` | 표준 버튼 (radius/transition/hover 완비) | 인라인 미리보기의 버튼 (단, 지시서에서 하단 CTA 3개는 제거됨 — 해당 없음) |
| `.card` | 표준 카드 (--radius-lg, --color-border) | A2 UI 미리보기 컨테이너 |
| `.input` | 표준 입력창 (focus 시 accent 테두리) | 검색 미리보기 input |
| `.loading-placeholder` | 로딩 표시 | 빠른실행 항목 로드 중 |
| `.page-header` | 그라데이션 헤더 박스 | 상단 안내 타이틀 ("상담 중, 원세컨드는 이렇게 작동합니다") |
| `.section-title` | 강조색 섹션 타이틀 | 필요 시 미리보기 영역 라벨 |

**CSS 변수 (--XXX 형태, design_guide.md 3~6절 참조):**
- 색상: `--color-brand`, `--color-accent`, `--color-surface`, `--color-surface-2`, `--color-border`, `--color-text-primary/secondary/tertiary`
- Radius: `--radius-xs/sm/md/lg/xl/full`
- Spacing: `--space-1 ~ --space-10`
- 폰트 가중치: `--fw-*` (tokens.css 확인 필요)
- Transition: `--transition-fast (0.12s)`, `--transition-normal (0.18s)`, `--transition-slow (0.28s)`
- 레이아웃: `--sidebar-width (220px)`, `--rightbar-width (220px)`, `--header-a1 (80px)`, `--header-a2 (70px)`

**기타:**
- `--gradient-header` 그라데이션 변수 (확인 후 활용)
- `--text-xs` (실값 0.684em, 신뢰 가능)

### 3.5-4. 4~6절 CSS 샘플 해석 규칙

이 지시서 4~6절에 작성된 CSS 샘플은 **"참고용 예시"**이며, 공통 자산으로 대체 가능한 부분은 우선 대체한다.

**예시 — 지시서 5-4절의 `.home-search-input-row`:**

```css
/* 지시서 원문 — 참고용 */
.home-search-input-row {
  display: flex;
  align-items: center;
  background: var(--color-surface-2);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-4);
  gap: var(--space-2);
}

/* 실제 적용 — tokens.css의 .input 클래스 활용 */
<div class="input">
  <span class="search-icon">🔍</span>
  <input type="text" placeholder="검색어 입력 후 Enter">
</div>
/* 별도 .home-search-input-row 정의 불필요 */
```

**예시 — 지시서의 `.home-a2-preview` 컨테이너:**

```css
/* 지시서 원문 — 참고용 */
.home-a2-preview {
  max-width: 640px;
  margin: 0 auto var(--space-5);
  background: var(--color-surface);
  border: 1.5px solid var(--color-accent);
  border-radius: var(--radius-lg);
  padding: var(--space-5) var(--space-6);
  ...
}

/* 실제 적용 — .card 기반 + 꼭 필요한 커스텀만 */
<div class="card home-a2-preview" ...>
/* .home-a2-preview는 fade-in 애니메이션·max-width·accent 테두리만 커스텀 */
```

### 3.5-5. 커스텀이 꼭 필요한 영역 (참고)

다음은 tokens.css 공통 자산으로 대체 불가능한, home.html 고유 정의가 필요한 영역:
- 6각형 SVG 레이아웃 (`.home-hex-wrap`, `.home-hex-svg`, `.home-hex-node` 등)
- 중앙 로고·카피 박스 (`.home-hex-center`)
- 호버 설명 패널 (`.home-detail-panel` — 별도 스타일 필요)
- 미리보기 영역 fade-in 애니메이션 (keyframes)
- 노드 펄스 애니메이션 (keyframes)

### 3.5-6. 알려진 불일치 사항 (수정 금지)

2026-04-23 검증 결과 발견된 불일치. **이번 작업에서 수정하지 말 것.**

- **`--together-*` 변수**: design_guide에 명시됐으나 tokens.css에 없음. 함께해요 페이지에서 일반 브랜드 토큰(`--color-brand-light` 등)으로 대체되어 동작 중. home.html에서도 사용 안 함.
- **`--text-xs` 변수**: tokens.css에는 있으나 design_guide에 명시 안 됨. 실값 0.684em로 신뢰 가능.

### 3.5-7. 구현 체크리스트

home.html 작성 시 각 CSS 블록마다 확인:

- [ ] 이 스타일이 tokens.css의 공통 클래스로 대체 가능한가?
- [ ] 하드코딩 값 없이 모두 CSS 변수(`var(--...)`)를 사용하는가?
- [ ] 커스텀 클래스가 꼭 필요하다면 `.home-*` 접두사로 명명했는가?
- [ ] 공통 유틸리티 클래스와 커스텀 클래스를 조합할 때 충돌 없는가?

---

## 🎯 4. `pages/home.html` 화면 구조

### 4-1. 파일 구조 규칙 (필수 준수)

- [ ] DOCTYPE/html/head/body 태그 **포함 금지** (app.html 셸이 감쌈)
- [ ] 모든 함수는 `window.XXX` 전역 등록 (IIFE 래핑 구조)
- [ ] CSS 하드코딩 금지, `var(--...)` 토큰만 사용
- [ ] `defer` 금지, `appstate:ready` 이벤트 사용
- [ ] 폰트 단위 `em` (px 금지)
- [ ] 최소 `--radius-sm (8px)` 이상 (직각 금지)

### 4-2. 화면 레이아웃

```
┌────────────────────────────────────────────────┐
│  [상단 안내 타이틀]                               │
│  상담 중, 원세컨드는 이렇게 작동합니다              │
├────────────────────────────────────────────────┤
│                                                │
│  ┌─ A2 UI 인라인 미리보기 영역 ──────────────┐  │  ← 기본 hidden
│  │                                          │  │    검색기/빠른실행 노드
│  │  (검색기 or 빠른실행 UI 복제본)           │  │    클릭 시 펼침
│  │                                          │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│            [6각형 다이아몬드 SVG]                 │
│                                                │
│              ┌─────────┐                       │
│              │ 스크립트 │                       │
│              └─────────┘                       │
│                                                │
│   ┌─────────┐       ┌──────────────┐           │
│   │ 검색기   │       │ 현장 Q&A     │           │
│   └─────────┘       └──────────────┘           │
│                                                │
│        ┌──────────┐ ← 중앙                      │
│        │ 원세컨드  │                            │
│        │ 17년현장 │                             │
│        │  도구    │                             │
│        └──────────┘                            │
│                                                │
│   ┌─────────┐       ┌──────────────┐           │
│   │ 함께해요 │       │ 빠른실행      │           │
│   └─────────┘       └──────────────┘           │
│                                                │
│              ┌─────────┐                       │
│              │ MY SPACE │                       │
│              └─────────┘                       │
│                                                │
├────────────────────────────────────────────────┤
│  [설명 패널 — 호버 시 아래쪽 업데이트]              │
│  "⬆ 6개 영역에 마우스를 올려보세요"               │
└────────────────────────────────────────────────┘
```

### 4-3. 6각형 SVG 배치 좌표 (어제 재작성본 기준 — 유지 권장)

```
viewBox="0 0 520 500" (어제 재작성본 기준. 유지 권장)
또는 viewBox="0 0 600 600" (새로 작성 시 무난한 기준)

중앙:  (260, 250) or (300, 300)    ← 원세컨드 로고
노드1: 상단 (12시 방향)              ← 스크립트
노드2: 1시 ~ 2시 방향                ← 현장 Q&A
노드3: 4시 ~ 5시 방향                ← 빠른실행
노드4: 하단 (6시 방향)               ← MY SPACE
노드5: 7시 ~ 8시 방향                ← 함께해요
노드6: 10시 ~ 11시 방향              ← 검색기

노드 크기: width 140 × height 80 (둥근 사각형, radius var(--radius-md))
선: 중앙에서 각 노드로 6개 line (stroke-width 2, stroke: var(--color-border))
```

어제 재작성본이 이미 6각 SVG 렌더링에 성공했다면 **좌표·viewBox 그대로 유지**. 새로 짤 때만 위 기준 적용.

### 4-4. 노드 6개 데이터 (확정)

```javascript
const NODES = [
  {
    id: 'scripts',
    label: '📜 스크립트',
    position: 'top',
    title: '📜 스크립트',
    description: '17년 현장 경험이 담긴 멘트. 도입 → 필요성 → 반론 대응까지. 상담 흐름 그대로 준비됐습니다.',
    behavior: 'navigate',
    target: 'scripts'
  },
  {
    id: 'board',
    label: '💬 현장 Q&A',
    position: 'top-right',
    title: '💬 현장 Q&A',
    description: '설계사들의 질문과 답변이 쌓이는 곳. 혼자 고민하지 말고, 팀 동료들의 경험을 활용하세요.',
    behavior: 'navigate',
    target: 'board'
  },
  {
    id: 'quick',
    label: '⚡ 빠른실행',
    position: 'bottom-right',
    title: '⚡ 빠른실행',
    description: '자주 쓰는 회사 양식, 연결 페이지를 한 번 클릭으로 실행. 상단 헤더의 「빠른 실행」버튼을 눌러보세요.',
    behavior: 'inline-preview',
    previewType: 'quick'
  },
  {
    id: 'myspace',
    label: '📁 MY SPACE',
    position: 'bottom',
    title: '📁 MY SPACE',
    description: '나만의 자료를 저장하는 공간. 자주 쓰는 멘트, 회사 양식, 개인 스크립트를 한 곳에서 관리.',
    behavior: 'navigate',
    target: 'myspace'
  },
  {
    id: 'together',
    label: '🤝 함께해요',
    position: 'bottom-left',
    title: '🤝 함께해요',
    description: '원세컨드는 현장의 목소리로 만들어집니다. 불편한 점, 필요한 기능을 직접 제안할 수 있습니다.',
    behavior: 'navigate',
    target: 'together'
  },
  {
    id: 'search',
    label: '🔍 검색기',
    position: 'top-left',
    title: '🔍 검색기',
    description: '스크립트, 게시글, 업무자료를 검색어 하나로 즉시 찾기. 상단 헤더의 검색창이 같은 기능입니다.',
    behavior: 'inline-preview',
    previewType: 'search'
  }
];
```

**⚠️ 중요 — behavior 2종:**
- `navigate`: 클릭 시 `switchMenu(target)` 호출 (페이지 이동)
- `inline-preview`: 클릭 시 6각형 위 미리보기 영역에 A2 UI 복제본 렌더 (페이지 이동 없음)

**⚠️ target 검증:** Claude Code는 `app.html`의 `switchMenu()`가 받는 메뉴 키와 일치하는지 확인.
- 예상: `scripts`, `board`, `myspace`, `together` 모두 이미 존재
- 의심 시 `data-menu` 속성으로 사이드바 확인

### 4-5. 중앙 로고 + 카피

```html
<div class="home-hex-center">
  <div class="home-hex-logo">원세컨드</div>
  <div class="home-hex-tagline">17년 현장이 담긴<br>TM 상담 도구</div>
</div>
```

- 로고: `font-size: 1.5em; font-weight: var(--fw-black); color: var(--color-brand);`
- 카피: `font-size: 0.842em; color: var(--color-text-secondary);`
- 중앙 박스: `border: 2px solid var(--color-brand); border-radius: var(--radius-lg);`
- 클릭 불가 (`pointer-events: none` 또는 `cursor: default`)

---

## 🎯 5. 핵심 신규 기능 — A2 UI 인라인 미리보기

### 5-1. 개념

**사용자가 "검색기" 노드 클릭:**
- 6각형 위쪽 영역에 A2 검색창 UI 복제본이 나타남
- 실제로 타이핑·검색 가능
- 하단 안내: "상단 헤더에도 똑같이 있어요 — 언제든 바로 사용할 수 있습니다"

**사용자가 "빠른실행" 노드 클릭:**
- 6각형 위쪽 영역에 "⚡ 빠른 실행 ▾" 버튼 + 드롭다운 복제본이 나타남
- 드롭다운 자동으로 펼쳐진 상태
- 실제 항목 클릭 가능
- 하단 안내: "상단 헤더에도 똑같이 있어요"

**다른 노드 클릭 또는 영역 밖 클릭:**
- 미리보기 영역 숨김 (fade-out)

### 5-2. HTML 구조

```html
<!-- 6각형 위쪽에 배치 -->
<div id="home-a2-preview" class="home-a2-preview" style="display:none;">
  <div class="home-a2-preview-inner">
    <!-- 검색기 미리보기 -->
    <div id="home-a2-preview-search" class="home-a2-preview-slot" style="display:none;">
      <div class="home-a2-preview-label">🔍 검색기</div>
      <div class="home-search-wrap">
        <div class="home-search-input-row">
          <span class="home-search-icon">🔍</span>
          <input class="home-search-input" type="text"
                 placeholder="스크립트, 게시글, 업무자료 검색..." autocomplete="off"
                 oninput="window.homePreviewSearchInput(this.value)"
                 onkeydown="if(event.key==='Enter')window.homePreviewSearchEnter(this.value)">
          <button class="home-search-clear" onclick="window.homePreviewSearchClear()" style="display:none;">✕</button>
        </div>
        <div class="home-search-dropdown" id="home-search-preview-dropdown" style="display:none;"></div>
      </div>
      <div class="home-a2-preview-hint">
        💡 상단 헤더에도 똑같이 있어요 — 언제든 바로 사용할 수 있습니다
      </div>
    </div>

    <!-- 빠른실행 미리보기 -->
    <div id="home-a2-preview-quick" class="home-a2-preview-slot" style="display:none;">
      <div class="home-a2-preview-label">⚡ 빠른실행</div>
      <div class="home-quick-wrap">
        <button class="home-quick-btn" onclick="window.homePreviewQuickToggle(event)">
          ⚡ 빠른 실행 ▾
        </button>
        <div class="home-quick-dropdown show" id="home-quick-preview-dropdown">
          <div id="home-quick-preview-items">
            <div class="home-quick-dd-item" style="color:#aaa;font-size:0.75em;padding:10px var(--space-4);">불러오는 중...</div>
          </div>
        </div>
      </div>
      <div class="home-a2-preview-hint">
        💡 상단 헤더에도 똑같이 있어요 — 언제든 바로 사용할 수 있습니다
      </div>
    </div>
  </div>
</div>
```

### 5-3. 핵심 동작 원칙

**1. A2 함수 재사용**

가능한 경우 `app.html`의 기존 검색/빠른실행 함수를 재호출. 직접 구현이 필요하면 **A2 동작과 일치**하게 작성.

```javascript
// 검색기 미리보기: A2의 onSearchInput / doSearch 로직 재호출
window.homePreviewSearchInput = function(value) {
  // 기존 A2 함수를 재활용하거나, 동일한 검색 로직 실행
  if (window.onSearchInput) {
    window.onSearchInput(value);
    // A2 dropdown 대신 home preview dropdown에 결과 렌더
  }
};

// 빠른실행 미리보기: 기존 빠른실행 항목을 가져와 렌더
window.homePreviewLoadQuickItems = async function() {
  // A2와 같은 API로 빠른실행 항목 fetch → #home-quick-preview-items 에 렌더
  // 기존 loadQuickItems() 같은 함수가 있다면 그대로 호출
};
```

**2. 미리보기 영역 제어**

```javascript
// 검색기 미리보기 표시
window.homeShowPreview = function(previewType) {
  var container = document.getElementById('home-a2-preview');
  var searchSlot = document.getElementById('home-a2-preview-search');
  var quickSlot = document.getElementById('home-a2-preview-quick');

  if (!container) return;

  // 슬롯 전환
  searchSlot.style.display = (previewType === 'search') ? 'block' : 'none';
  quickSlot.style.display = (previewType === 'quick') ? 'block' : 'none';

  // 컨테이너 표시 (fade-in)
  container.style.display = 'block';
  requestAnimationFrame(function() {
    container.classList.add('show');
  });

  // 빠른실행 선택 시 항목 로드
  if (previewType === 'quick' && window.homePreviewLoadQuickItems) {
    window.homePreviewLoadQuickItems();
  }

  // 검색기 선택 시 input 포커스
  if (previewType === 'search') {
    setTimeout(function() {
      var inp = container.querySelector('.home-search-input');
      if (inp) { try { inp.focus(); } catch(e) {} }
    }, 120);
  }
};

// 미리보기 숨김
window.homeHidePreview = function() {
  var container = document.getElementById('home-a2-preview');
  if (!container) return;
  container.classList.remove('show');
  setTimeout(function() { container.style.display = 'none'; }, 250);
};
```

**3. 노드 클릭 핸들러 — behavior 분기**

```javascript
window.homeNodeClick = function(nodeId) {
  var node = NODES.find(function(n) { return n.id === nodeId; });
  if (!node) return;

  // 클릭 피드백 애니메이션 (0.1초)
  var nodeEl = document.getElementById('home-node-' + nodeId);
  if (nodeEl) {
    nodeEl.classList.add('clicking');
    setTimeout(function() { nodeEl.classList.remove('clicking'); }, 100);
  }

  if (node.behavior === 'inline-preview') {
    // 검색기 / 빠른실행: 미리보기 펼침
    window.homeShowPreview(node.previewType);
  } else if (node.behavior === 'navigate') {
    // 나머지 4개: 해당 메뉴 이동
    if (window.switchMenu) {
      window.switchMenu(node.target);
    }
  }
};
```

**4. 영역 밖 클릭 시 미리보기 숨김**

```javascript
// 6각형·노드·미리보기 영역 외부 클릭 시 숨김
document.addEventListener('click', function(e) {
  var container = document.getElementById('home-a2-preview');
  var hexWrap = document.querySelector('.home-hex-wrap');
  if (!container || container.style.display === 'none') return;

  if (!container.contains(e.target) && !hexWrap.contains(e.target)) {
    window.homeHidePreview();
  }
});
```

### 5-4. CSS 샘플

```css
.home-a2-preview {
  max-width: 640px;
  margin: 0 auto var(--space-5);
  background: var(--color-surface);
  border: 1.5px solid var(--color-accent);
  border-radius: var(--radius-lg);
  padding: var(--space-5) var(--space-6);
  opacity: 0;
  transform: translateY(-10px);
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.home-a2-preview.show {
  opacity: 1;
  transform: translateY(0);
}

.home-a2-preview-inner {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.home-a2-preview-label {
  font-size: 0.790em;
  font-weight: var(--fw-bold);
  color: var(--color-accent);
  letter-spacing: 0.3px;
}

.home-a2-preview-hint {
  font-size: 0.737em;
  color: var(--color-text-tertiary);
  text-align: center;
  margin-top: var(--space-2);
  padding-top: var(--space-3);
  border-top: 1px dashed var(--color-border);
}

/* 검색창 — A2와 시각적 일치 */
.home-search-wrap {
  position: relative;
}
.home-search-input-row {
  display: flex;
  align-items: center;
  background: var(--color-surface-2);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-4);
  gap: var(--space-2);
}
.home-search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 0.895em;
  font-family: inherit;
  color: var(--color-text-primary);
  outline: none;
}

/* 빠른실행 — A2와 시각적 일치 */
.home-quick-wrap {
  position: relative;
}
.home-quick-btn {
  background: var(--color-brand);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-5);
  font-size: 0.8125em;
  font-weight: var(--fw-bold);
  font-family: inherit;
  cursor: pointer;
}
.home-quick-dropdown {
  margin-top: var(--space-2);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  max-height: 280px;
  overflow-y: auto;
}
.home-quick-dd-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  font-size: 0.8125em;
  color: var(--color-text-primary);
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.home-quick-dd-item:last-child { border-bottom: none; }
.home-quick-dd-item:hover { background: var(--color-surface); }
```

---

## 🎯 6. 6각 다이어그램 (노드·호버·클릭)

### 6-1. 노드 호버 (데스크탑)

```javascript
window.homeNodeHover = function(nodeId) {
  var node = NODES.find(function(n) { return n.id === nodeId; });
  if (!node) return;

  // 설명 패널 업데이트
  var panel = document.getElementById('home-detail-panel');
  if (!panel) return;

  panel.innerHTML =
    '<div class="home-detail-icon">' + (node.label.split(' ')[0] || '') + '</div>' +
    '<div class="home-detail-title">' + node.title + '</div>' +
    '<div class="home-detail-desc">' + node.description + '</div>' +
    (node.behavior === 'inline-preview'
      ? '<div class="home-detail-hint">노드를 클릭하면 바로 미리보기가 나타납니다</div>'
      : '<div class="home-detail-hint">노드를 클릭하면 해당 페이지로 이동합니다</div>');
  panel.classList.add('active');

  // 노드 시각 강조
  var nodeEl = document.getElementById('home-node-' + nodeId);
  if (nodeEl) nodeEl.classList.add('hover');
};

window.homeNodeHoverOut = function(nodeId) {
  var nodeEl = document.getElementById('home-node-' + nodeId);
  if (nodeEl) nodeEl.classList.remove('hover');
  // 패널은 그대로 유지 (마지막 호버 정보 표시)
};
```

### 6-2. 기본 상태

홈 진입 시:
- 중앙 "원세컨드" 로고 + 6각형만 표시
- 하단 설명 패널: "⬆ 6개 영역에 마우스를 올려보세요"
- 미리보기 영역: 숨김
- 노드: 은은한 펄스 애니메이션 (2s infinite)

### 6-3. 상태 전이

```
[초기 상태]
  ↓ 호버
[호버 상태] — 해당 노드 설명 패널에 표시
  ↓ 클릭 (navigate 노드)
[switchMenu 호출 → 페이지 이동]

[초기 상태]
  ↓ 호버
[호버 상태]
  ↓ 클릭 (inline-preview 노드)
[미리보기 영역 fade-in + 해당 UI 표시]
  ↓ 다른 노드 클릭 or 영역 밖 클릭
[미리보기 영역 fade-out]
```

### 6-4. 모바일 (≤640px)

- 호버 없음 (터치 디바이스)
- 6각형은 유지하되 노드 크기 축소
- 노드 탭 = 즉시 동작 (navigate 또는 inline-preview)
- 미리보기 영역은 6각형 위쪽에 그대로 표시 (화면 폭에 맞게 축소)
- 설명 패널 숨김 (모바일에서는 탭 = 즉시 반응)

---

## 🎯 7. `app.html` 조정 (최소)

### 7-1. 원칙

**A2 구조 자체는 건드리지 않음.** home.html에서 A2 함수를 **호출**할 수 있게만 유지.

### 7-2. 필요 시 조정 사항

home.html의 인라인 미리보기가 A2 함수를 호출할 때, 해당 함수가 `window.XXX`로 노출되어 있는지 확인:
- `window.onSearchInput`
- `window.doSearch`
- `window.toggleQuickDropdown` 또는 빠른실행 항목 로드 함수

**노출 안 되어 있으면** `app.html`에서 `window.XXX = XXX;` 한 줄만 추가. 이 외 수정 금지.

### 7-3. home-mode CSS 처리

어제 작업에서 `body.home-mode { ... }` CSS 분기가 추가되었음. 이게 유지될 경우:
- A2 숨김 유지 (home에서는 6각형 중심 UI)
- 단, 미리보기 영역은 home.html 내부에 있으므로 영향 없음

home-mode가 부작용을 일으키면 **제거하지 말고 팀장님께 보고**. 팀장님이 판단.

---

## 🎯 8. 검증 체크리스트

### 8-1. 구조 검사
- [ ] `pages/home.html` 개편 완료
- [ ] DOCTYPE/html/head/body 태그 없음
- [ ] 모든 함수 `window.XXX` 등록
- [ ] CSS 하드코딩 색상 없음 (모두 `var(--...)`)
- [ ] 폰트 단위 `em` 사용
- [ ] `pages/welcome.html` 생성 안 됨 (금지 준수)
- [ ] `auth.js` 수정 안 됨 (금지 준수)

### 8-2. 6각 다이어그램 기능
- [ ] 로그인 → 홈 진입 시 6각형 즉시 표시
- [ ] 중앙 "원세컨드" 로고 + "17년 현장이 담긴 TM 상담 도구" 카피 표시
- [ ] 6개 노드 모두 표시, 위치 정확
- [ ] 노드 호버 시 설명 패널 업데이트 (데스크탑)
- [ ] 노드 호버 시 노드 확대 (scale 1.05) + 펄스 중단
- [ ] 초기 상태 하단 안내: "⬆ 6개 영역에 마우스를 올려보세요"

### 8-3. navigate 노드 (4개)
- [ ] 스크립트 클릭 → `switchMenu('scripts')` 호출
- [ ] 현장 Q&A 클릭 → `switchMenu('board')` 호출
- [ ] MY SPACE 클릭 → `switchMenu('myspace')` 호출
- [ ] 함께해요 클릭 → `switchMenu('together')` 호출

### 8-4. inline-preview 노드 (2개)
- [ ] 검색기 클릭 → 6각형 위에 검색 UI 복제본 fade-in
- [ ] 검색창에 입력 시 실제로 검색 동작 (A2와 동일 결과)
- [ ] 빠른실행 클릭 → 6각형 위에 빠른실행 드롭다운 복제본 fade-in (항목 자동 로드, 펼쳐진 상태)
- [ ] 빠른실행 항목 클릭 시 실제로 해당 기능 실행
- [ ] 검색기 → 빠른실행 노드 전환 시 슬롯 교체
- [ ] 빠른실행 → 검색기 노드 전환 시 슬롯 교체
- [ ] 영역 밖 클릭 시 미리보기 fade-out

### 8-5. A2 재사용
- [ ] 검색 결과 포맷이 A2와 동일
- [ ] 빠른실행 항목이 A2와 동일한 데이터 출처
- [ ] A2 함수 직접 호출 우선, 불가 시 동일 로직 재구현

### 8-6. 모바일 (≤640px)
- [ ] 6각형 유지 (축소된 형태)
- [ ] 노드 탭 = 즉시 반응 (호버 없음)
- [ ] navigate 노드 탭 → switchMenu
- [ ] inline-preview 노드 탭 → 미리보기 영역 표시
- [ ] 미리보기 영역 모바일 폭에 맞게 축소

### 8-7. 안정성
- [ ] 미리보기 영역에서 에러 발생 시 홈 전체 깨지지 않음 (try-catch)
- [ ] A2 함수가 없어도 크래시 없이 fallback
- [ ] 빠른실행 항목 로드 실패 시 "불러오는 중..." 대신 에러 메시지 표시

---

## 🎯 9. 금지 사항

1. **`pages/welcome.html` 생성 금지** — 이번 설계에서 폐기됨
2. **`js/auth.js` 수정 금지** — 라우팅 분기 없음
3. **Supabase 스키마 변경 금지** — `onboarding_dismissed_at` 등 신규 컬럼 불필요
4. **`app_settings` feature flag 추가 금지** — `welcome_page_enabled` 폐기
5. **`index.html` 수정 금지**
6. **다른 `pages/*.html` 수정 금지**
7. **`tokens.css` 수정 금지**
8. **A2 기존 구조 파괴 금지** — home.html에서 A2 함수를 **호출**만, **수정**은 금지
9. **하드코딩 색상 / 직각 border-radius / px 고정 폰트 금지**
10. **팀장님 확인 전 "완료" 선언 금지**
11. **Claude Code 자율 판단으로 NODES 추가·삭제 금지** — 6개 고정

---

## 🎯 10. 작업 순서

### Step 0: 현황 파악 + 공통 자산 숙지 (2026-04-23 보강)
1. **지시서 3.5절 반드시 먼저 정독** — 공통 자산 활용 원칙
2. `css/tokens.css` 142~324줄을 `view`로 읽고 이미 정의된 공통 클래스 목록 파악
   - `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`
   - `.card`, `.input`, `.loading-placeholder`
   - `.page-header`, `.section-title`
   - (기타 재활용 가능한 것 발견 시 목록에 추가)
3. `pages/home.html` 현재 내용 view
4. 어제 재작성본(380라인)이 4~6절 요구사항을 얼마나 충족하는지 평가
5. `app.html`에서 A2의 `onSearchInput`, 빠른실행 관련 함수가 `window.XXX`로 노출되어 있는지 확인
   - 지난 세션에서 `window.loadQuickDdItems` 한 줄이 추가되었는지 확인 (Step 2에서 실제 추가되었음)
6. 평가 결과 보고 → 재활용 vs 새로 작성 판단
7. **판단 시 공통 자산 우선 활용 원칙 적용**: 기존 380라인이 `.home-*` 커스텀 CSS 가득이면 재활용 대신 신규 작성이 더 깔끔할 수 있음

### Step 1: home.html 개편
1. 판단대로 개편 또는 재작성 진행
2. **3.5-7 체크리스트를 각 CSS 블록마다 적용**
3. 기존 기능(6각 다이어그램, 호버, 펄스)은 유지
4. 신규 기능(인라인 미리보기)만 추가
5. 6각형 SVG·중앙 로고·펄스 애니메이션 등 커스텀 필요 영역은 `.home-*` 접두사 유지
6. 버튼·입력창·카드·헤더 영역은 tokens.css의 공통 클래스 우선 활용

### Step 2: A2 함수 호출 연결
1. 검색 미리보기 input에서 A2의 검색 로직 호출
2. 빠른실행 미리보기 드롭다운에 A2와 동일한 빠른실행 항목 로드
3. 필요 시 `app.html`에 `window.XXX` 노출 한 줄만 추가

### Step 3: 로컬 검증
1. 로그인 → 홈 진입 → 6각형 표시 확인
2. 4개 navigate 노드 동작 확인
3. 검색기·빠른실행 인라인 미리보기 동작 확인
4. 영역 밖 클릭 시 미리보기 숨김 확인
5. 모바일 폭(≤640px)에서 동작 확인

### Step 4: 보고
- 아래 11절 형식대로 보고

### Step 5: 팀장님 승인 후 커밋
- `feat(home): 6각 다이어그램 홈 개편 + 검색기·빠른실행 인라인 미리보기`

---

## 🎯 11. 작업 후 보고 형식

### 11-1. 파일 목록
- `pages/home.html` (변경 라인 수: +N / -N)
- `app.html` (필요 시 변경 라인 수)

### 11-2. 어제 재작성본 처리 결정
- 재활용 / 새로 작성 선택 + 이유

### 11-3. 검증 체크리스트 결과
위 8절 체크리스트 각 항목 O / X / N/A

### 11-4. A2 함수 연결 상태
- 검색: 어느 함수를 호출했는지 (또는 재구현 이유)
- 빠른실행: 어느 함수/API로 항목 로드했는지

### 11-5. 공통 자산 활용 결과 (2026-04-23 신규)
- tokens.css의 공통 클래스 중 사용한 것 목록
- 사용한 CSS 변수 목록 (주요한 것)
- 커스텀 클래스(`.home-*`) 개수와 사용 이유
- 3.5-7 체크리스트 준수 여부

### 11-6. 의심 구간
- 6각형 SVG 좌표가 의도대로 나오는지
- 미리보기 영역 fade 애니메이션 자연스러운지
- 모바일 breakpoint 적절한지

### 11-7. 미적용 또는 판단 보류
- 판단 어려웠던 부분과 선택지

### 11-8. 다음 개선 후보
- 미리보기에서 "상단 헤더로 이동" 버튼
- 첫 호버 시 살짝 더 큰 애니메이션으로 시선 유도
- 검색 결과 개수 상단 표시

---

## 🎯 12. 참고 문서

- `00_MASTER.md` — 불변 원칙
- `design_guide.md` — 디자인 토큰 규칙
- `app.html` — A2 구조 (검색·빠른실행 함수 출처)
- `onesecond_context_update_20260422.md` — 어제 home.html 재작성 맥락
- **폐기됨:** `20260422_welcome_page_spec_v2.md` (welcome.html 신설 방침은 취소됨)

---

## 📝 문서 끝

**이 작업지시서는 "home.html = 6각 다이어그램 홈" 통합 설계를 위한 것이다.**

**핵심 원칙:**
- welcome.html 신설 없음 — home.html 자체가 정체성 전달 장치
- DB·auth 변경 없음 — 모든 로그인 사용자가 홈에서 자동 노출
- 검색기·빠른실행은 페이지 이동 없이 **실물 UI 인라인 펼침**
- 나머지 4개는 기존대로 `switchMenu()` 이동
- A2 기존 구조 보존 (함수 호출만)

**성공 기준:**
1. 로그인 직후 홈에서 6각 다이어그램 정상 표시
2. 검색기 노드 클릭 시 6각형 위에 검색창 펼쳐지며 실제 검색 가능
3. 빠른실행 노드 클릭 시 6각형 위에 빠른실행 드롭다운 펼쳐지며 실제 항목 클릭 가능
4. 나머지 4개 노드는 해당 메뉴로 이동

---

**작성자:** Claude AI (총괄 기획자)
**승인:** 팀장님 임태성
**실행:** Claude Code
