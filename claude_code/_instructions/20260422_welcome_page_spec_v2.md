# Welcome 페이지 작업지시서 — 6각형 인터랙티브 다이어그램 (v2)

> **작성일:** 2026-04-22
> **버전:** v2 (2026-04-22 수정)
> **작성자:** Claude AI (총괄 기획자)
> **실행자:** Claude Code
> **대상 파일:** `pages/welcome.html` (신규), `js/auth.js` (부분 수정), `app.html` (메뉴 1줄 추가)
> **안전 원칙:** 기존 동작 보존, 새 파일 추가, Feature Flag 가능 구조
>
> **v1 → v2 변경사항:**
> - 노드 클릭 동작: 2-step(설명→CTA 이동) → **1-step(즉시 이동)**로 변경
> - 데스크탑: 호버 시 설명 툴팁 자동 표시, 클릭 시 해당 페이지로 즉시 이동
> - 모바일: 카드형 레이아웃 (설명+버튼 한 화면에), 탭 1번 = 즉시 이동
> - 6개 탐색 유도 장치 제거 (진행률 표시 등 없음)
> - 하단 CTA 문구: "모두 둘러봤어요" → "지금 시작하기"
> - 4-6, 4-7, 5, 8-3, 9-1, 4-8절 수정됨

---

## 🎯 0. 팀장님께 먼저 (Claude Code가 시작 전 반드시 확인)

이 작업은 **"사이트 뒤엎기"가 아닙니다.**

- 신규 파일 1개 생성 (`pages/welcome.html`)
- 기존 파일 2개에 라인 추가만 (`js/auth.js`, `app.html`)
- 기존 동작 100% 보존
- 문제 생기면 Feature Flag 또는 파일 삭제로 즉시 롤백 가능

**작업 전 체크:**
- [ ] 팀장님이 지시서 전체 읽고 승인 표시하셨는가?
- [ ] 현재 `index.html`·`home.html` 미커밋 변경은 **건드리지 말 것**
- [ ] 이 작업지시서의 Step 1~Step 4 순서대로만 진행

---

## 🎯 1. 프로젝트 개요

### 1-1. 배경 (WHY)
2026-04-20 AZ금융서비스 더원지점 4팀 40명에 원세컨드 배포 후, **"이것밖에 없는데 유료야?"** 반응 발생.

원인:
- 카톡 입소문으로 유입 → `index.html`(랜딩) 안 읽음
- 로그인 직행 → 홈 화면에서 정체성 재확인 기회 없음
- 결과: 원세컨드가 뭘 하는 도구인지 모르는 채로 기능 하나만 보고 판단

### 1-2. 목표 (WHAT)
**첫 로그인 사용자에게 원세컨드의 정체성을 1회 강제로 전달.**
- 강제 = 반드시 거치되, 5~30초면 파악 가능한 가벼움
- 정체성 = "6가지 기능이 유기적으로 연결된 TM 상담 도구"

### 1-3. 해결 방식 (HOW)
**6각형 인터랙티브 다이어그램 페이지 신설.**
- 덩그러니 6각형 하나만 화면에 표시
- 중앙: 원세컨드 로고 + 한 줄 카피
- 6개 꼭지점: 핵심 메뉴 6개 (클릭 시 설명 패널 열림)
- 하단: 건너뛰기·완료 버튼

### 1-4. 범위 (SCOPE)

**포함:**
- `pages/welcome.html` 신규 생성
- 첫 로그인 라우팅 로직 (`auth.js`)
- 좌측 메뉴 "원세컨드 소개" 항목 추가 (`app.html`)
- Supabase `users.onboarding_dismissed_at` 컬럼 활용

**제외 (이번 작업 아님):**
- `index.html` 수정 (고민 중 상태라 건드리지 않음)
- `home.html` 수정 (고민 중 상태라 건드리지 않음)
- 다른 page/*.html 수정

---

## 🎯 2. 파일 수정 목록

| 순번 | 파일 | 작업 | 변경 라인 수 (예상) |
|---|---|---|---|
| 1 | `pages/welcome.html` | **신규 생성** | ~400 라인 |
| 2 | `js/auth.js` | 라우팅 로직 추가 | +15 ~ +20 |
| 3 | `app.html` | 좌측 메뉴 1줄 추가 + switchMenu 분기 | +3 ~ +5 |
| 4 | Supabase SQL | `onboarding_dismissed_at` 컬럼 확인·추가 | 1 SQL |

**기존 파일 덮어쓰기 없음. 추가만.**

---

## 🎯 3. Supabase 준비 (Step 1)

### 3-1. `users.onboarding_dismissed_at` 컬럼 확인

**Claude Code가 먼저 할 일:**
1. Supabase MCP 또는 Claude in Chrome으로 `public.users` 테이블 스키마 조회
2. `onboarding_dismissed_at` 컬럼 **존재 여부 확인**

**컬럼이 없으면 추가 SQL (팀장님이 Supabase SQL Editor에서 직접 실행):**

```sql
ALTER TABLE public.users
ADD COLUMN onboarding_dismissed_at timestamptz DEFAULT null;

COMMENT ON COLUMN public.users.onboarding_dismissed_at IS
'첫 로그인 시 welcome 페이지를 본 시점. NULL이면 아직 안 봄.';
```

**컬럼이 이미 있으면 스킵.**

### 3-2. 판정 로직

```
onboarding_dismissed_at IS NULL
  → 첫 로그인 (welcome 페이지 강제 표시)

onboarding_dismissed_at IS NOT NULL
  → 재방문 (welcome 스킵, 홈 직행. 좌측 메뉴에서만 접근 가능)
```

### 3-3. Feature Flag (선택적, 안전 장치)

**`app_settings` 테이블에 welcome 활성화 토글 추가 (권장):**

```sql
INSERT INTO public.app_settings (group_name, key, value)
VALUES ('feature_flag', 'welcome_page_enabled', 'true')
ON CONFLICT DO NOTHING;
```

**Claude Code는 auth.js에서 이 설정을 확인 후 라우팅:**
- `welcome_page_enabled = 'true'` + `onboarding_dismissed_at IS NULL` → welcome 표시
- 그 외 → 기존대로 home

**문제 생기면 `welcome_page_enabled = 'false'`로 1초 만에 비활성화 가능.**

---

## 🎯 4. `pages/welcome.html` 신규 생성 (Step 2)

### 4-1. 파일 구조 규칙 (중요)

**프로젝트 표준 준수:**
- [ ] DOCTYPE/html/head/body 태그 **포함 금지** (app.html 셸이 감쌈)
- [ ] 모든 함수는 `window.XXX` 전역 등록 (IIFE 래핑 구조)
- [ ] CSS 하드코딩 금지, `var(--...)` 토큰만 사용
- [ ] `defer` 금지, `appstate:ready` 이벤트 사용
- [ ] 폰트 단위 `em` (px 금지)
- [ ] 최소 `--radius-sm (8px)` 이상 (직각 금지)

### 4-2. 화면 구조 (HTML 블록)

```
┌────────────────────────────────────────────────┐
│  [상단 인사 배너]                                 │
│  환영합니다, ○○○님                              │
│  원세컨드가 이렇게 작동합니다 (6각형을 눌러 알아보세요) │
├────────────────────────────────────────────────┤
│                                                │
│            [6각형 다이아몬드 SVG]                 │
│                                                │
│              ┌─────────┐                       │
│              │ 스크립트 │                       │
│              └─────────┘                       │
│                                                │
│   ┌─────────┐       ┌──────────────┐           │
│   │ 현장 Q&A│       │ 빠른실행      │           │
│   └─────────┘       └──────────────┘           │
│                                                │
│        ┌──────────┐ ← 중앙                      │
│        │ 원세컨드  │                            │
│        │ 17년현장 │                             │
│        │  도구    │                             │
│        └──────────┘                            │
│                                                │
│   ┌─────────┐       ┌──────────────┐           │
│   │ MY SPACE │       │ 함께해요      │          │
│   └─────────┘       └──────────────┘           │
│                                                │
│              ┌─────────┐                       │
│              │ 검색기   │                       │
│              └─────────┘                       │
│                                                │
├────────────────────────────────────────────────┤
│  [설명 패널 — 노드 클릭 시 아래쪽에 슬라이드로 표시]  │
│  📜 스크립트                                     │
│  17년 현장 경험이 담긴 멘트 56개...               │
│  [스크립트 보러 가기 →]                          │
├────────────────────────────────────────────────┤
│  [하단 CTA 영역]                                 │
│  [모두 둘러봤어요 →]  [나중에 볼게요]  [건너뛰기]  │
└────────────────────────────────────────────────┘
```

### 4-3. 6각형 SVG 배치 좌표

**6각형(다이아몬드) 기하학적 배치:**

```
viewBox="0 0 600 600"

중앙:  (300, 300)        ← 원세컨드 로고
노드1: (300, 60)          ← 스크립트 (상단)
노드2: (510, 180)         ← 현장 Q&A (우상)
노드3: (510, 420)         ← 빠른실행 (우하)
노드4: (300, 540)         ← MY SPACE (하단)
노드5: (90, 420)          ← 함께해요 (좌하)
노드6: (90, 180)          ← 검색기 (좌상)

노드 크기: width 140 × height 80 (둥근 사각형, radius 12)
선: 중앙에서 각 노드로 6개 line (stroke-width 2)
```

### 4-4. 노드 6개 데이터 (고정 — 그대로 사용)

```javascript
const NODES = [
  {
    id: 'scripts',
    label: '📜 스크립트',
    position: 'top',
    title: '📜 스크립트',
    description: '17년 현장 경험이 담긴 멘트 56개. 도입 → 필요성 → 반론 대응까지. 상담 흐름 그대로 준비됐습니다.',
    cta: '스크립트 보러 가기',
    target: 'scripts'
  },
  {
    id: 'board',
    label: '💬 현장 Q&A',
    position: 'top-right',
    title: '💬 현장 Q&A',
    description: '설계사들의 질문과 답변이 쌓이는 곳. 혼자 고민하지 말고, 팀 동료들의 경험을 활용하세요.',
    cta: '현장 Q&A 보러 가기',
    target: 'board'
  },
  {
    id: 'quick',
    label: '⚡ 빠른실행',
    position: 'bottom-right',
    title: '⚡ 빠른실행',
    description: '자주 쓰는 회사 양식, 연결 페이지를 한 번 클릭으로 바로 실행. 상담 중 화면 전환 없이 끝냅니다.',
    cta: '빠른실행 보러 가기',
    target: 'quick'
  },
  {
    id: 'myspace',
    label: '📁 MY SPACE',
    position: 'bottom',
    title: '📁 MY SPACE',
    description: '나만의 자료를 저장하는 공간. 자주 쓰는 멘트, 회사 양식, 개인 스크립트를 한 곳에서 관리.',
    cta: 'MY SPACE 보러 가기',
    target: 'myspace'
  },
  {
    id: 'together',
    label: '🤝 함께해요',
    position: 'bottom-left',
    title: '🤝 함께해요',
    description: '원세컨드는 현장의 목소리로 만들어집니다. 불편한 점, 필요한 기능을 직접 제안할 수 있습니다.',
    cta: '함께해요 보러 가기',
    target: 'together'
  },
  {
    id: 'search',
    label: '🔍 검색기',
    position: 'top-left',
    title: '🔍 검색기',
    description: '원하는 스크립트, 질문, 자료를 검색어 하나로 즉시 찾기. 더 이상 스크롤할 필요 없습니다.',
    cta: '검색해 보기',
    target: 'search'
  }
];
```

**⚠️ 주의:** `target` 값은 현재 `app.html`의 `switchMenu()` 함수가 받는 메뉴 키와 일치해야 함. Claude Code가 `app.html` 확인 후 정확한 키로 조정할 것 (예: 'scripts' vs 'script', 'myspace' vs 'my_space' 등).

### 4-5. 중앙 로고 + 카피

```html
<div class="welcome-center">
  <div class="welcome-logo">원세컨드</div>
  <div class="welcome-tagline">17년 현장이 담긴<br>TM 상담 도구</div>
</div>
```

**스타일:**
- 로고: `font-size: 1.5em; font-weight: var(--fw-black); color: var(--color-brand);`
- 카피: `font-size: 0.842em; color: var(--color-text-secondary); margin-top: 8px;`
- 중앙 박스: `border: 2px solid var(--color-brand); border-radius: var(--radius-lg); padding: var(--space-5);`
- 클릭 불가 (cursor: default)

### 4-6. 노드 상호작용 (v2: 호버 + 즉시 이동)

**핵심 변경:** 클릭 1번 = 즉시 해당 페이지로 이동. 설명은 호버로만 표시.

**초기 상태:**
- 모든 노드: 기본 배경 `var(--color-surface)`, 테두리 `var(--color-border)`, 텍스트 `var(--color-text-primary)`
- 살짝 펄스 애니메이션 (pulse 2s infinite) — 주목 유도

**호버 상태 (데스크탑):**
- 0.3초 후 설명 툴팁 fade-in (노드 하단 또는 측면)
- 배경 `var(--color-surface-2)`
- 테두리 `var(--color-accent)`
- 살짝 확대 `transform: scale(1.05)`
- 하단 설명 패널도 함께 업데이트 (해당 노드의 정보 표시)

**마우스 떠남 상태 (데스크탑):**
- 0.2초 후 툴팁 fade-out
- 기본 상태로 복귀

**클릭 상태 (모든 기기 공통):**
1. `onboarding_dismissed_at = now()` UPDATE (완료 처리)
2. 즉시 해당 페이지로 이동 (`window.switchMenu(target)`)
3. 설명 패널 볼 필요 없이 바로 실행

**모바일 (640px 이하):**
- 호버 없음 (터치 디바이스)
- 카드형 레이아웃으로 설명이 항상 보임 (5절 참조)
- 카드 어디든 탭 → 즉시 이동

**시각적 피드백:**
- 노드 클릭 순간 살짝 눌리는 애니메이션 (0.1초 scale 0.95)
- 페이지 전환은 즉시 (지연 없음)

---

### 4-7. 설명 패널 (v2: 호버 트리거 + 정보 표시만)

**핵심 변경:** 설명 패널은 **정보 표시 전용**. "페이지 이동 버튼"은 패널에 없음. 노드 자체가 버튼임.

**데스크탑 동작:**

```html
<div id="welcome-detail-panel" class="welcome-detail">
  <div class="welcome-detail-icon">{아이콘}</div>
  <div class="welcome-detail-title">{title}</div>
  <div class="welcome-detail-desc">{description}</div>
  <div class="welcome-detail-hint">노드를 클릭하면 바로 이동합니다</div>
</div>
```

- **초기 상태:** `display: none` 또는 기본 안내 문구 ("노드에 마우스를 올려보세요")
- **노드 호버 시:** 해당 노드 정보로 업데이트 + fade-in
- **마우스 떠남 시:** 0.3초 후 fade-out 또는 "마우스를 올려보세요" 기본 상태 복귀

**스타일 (데스크탑):**
- 다이어그램 하단에 고정 위치 (항상 공간 확보, 레이아웃 흔들림 없음)
- 배경 `var(--color-surface)`, 테두리 `var(--color-border)`, `border-radius: var(--radius-lg)`
- 높이: 120px 고정 (내용 길이와 무관하게 일관성)

**모바일 (640px 이하):**

설명 패널을 별도로 만들지 않음. 대신 **각 카드 내부에 설명 포함** (5절 참조).

**CTA 버튼 없음 (v1과 차이점):**

v1에서는 설명 패널 내부에 `[스크립트 보러 가기 →]` 버튼이 있었으나, **v2에서는 제거**.
- 이유: 노드 자체가 버튼 역할 = 2-step 불필요
- 클릭하면 바로 이동하므로 중복 버튼은 혼란만 가중

---

### 4-8. 하단 CTA 버튼 3개 (v2: 문구 변경)

```html
<div class="welcome-footer">
  <button class="welcome-btn welcome-btn-primary" onclick="window.welcomeComplete('start')">
    지금 시작하기 →
  </button>
  <button class="welcome-btn welcome-btn-secondary" onclick="window.welcomeComplete('later')">
    나중에 볼게요
  </button>
  <button class="welcome-btn welcome-btn-ghost" onclick="window.welcomeComplete('skip')">
    건너뛰기
  </button>
</div>
```

**v1 → v2 변경:**
- `"모두 둘러봤어요 →"` → `"지금 시작하기 →"`
- 이유: 이제 "둘러보는 것"이 필수가 아님. 아무 노드도 안 눌러도 이 버튼 누르면 홈으로 이동. "시작하기"가 현재 설계와 정합.

**3개 버튼 모두 동일 동작:**
1. `onboarding_dismissed_at = now()` UPDATE
2. `app.html`의 홈 메뉴로 전환 `switchMenu('home')`

**스타일 차이만 존재 (심리적 선택지):**
- Primary: `background: var(--color-brand); color: #fff;`
- Secondary: `background: var(--color-surface-2); color: var(--color-text-primary);`
- Ghost: `background: transparent; color: var(--color-text-tertiary);`

**심리적 해석:**
- "지금 시작하기" = 적극적 사용자 (노드 클릭 없이 바로 시작)
- "나중에 볼게요" = 관심은 있으나 지금은 바쁨
- "건너뛰기" = 빨리 가고 싶음

**중요:** 어느 버튼이든 노드 1개 클릭과 **동일 효과** (onboarding 완료 + 홈 이동).
단, 노드 클릭은 "해당 기능으로 직행"이고, 하단 버튼은 "홈으로 이동"이 차이점.

---

### 4-9. 재방문 모드 (좌측 메뉴에서 클릭 시)

URL: `app.html?page=welcome&mode=revisit`

**차이점:**
- [ ] 상단 인사 배너 문구 변경: "원세컨드가 이렇게 작동합니다" (처음 인사 제거)
- [ ] 하단 3개 버튼 → **1개 버튼**: "돌아가기" (홈으로 이동)
- [ ] `onboarding_dismissed_at` **업데이트 안 함** (이미 처리됨)

**Claude Code 구현 힌트:**
```javascript
const urlParams = new URLSearchParams(window.location.search);
const isRevisit = urlParams.get('mode') === 'revisit';

if (isRevisit) {
  // 재방문 모드 UI
} else {
  // 첫 로그인 모드 UI
}
```

---

## 🎯 5. 모바일 대응 (Step 2-2) — v2: 카드형 레이아웃

### 5-1. 반응형 breakpoint

```css
@media (max-width: 640px) {
  /* 모바일 레이아웃 */
}
```

### 5-2. 모바일에서 6각형 대신 카드형 2x3 그리드

**이유:**
- 480~360px에서 6각형 텍스트 9~11px로 축소 → 가독성 불가
- 모바일은 호버 없음 → 설명이 화면에 **항상 보여야 함**
- 메모리 교훈: 기존 펜타곤도 모바일 가독성 이슈 있었음

**v1 → v2 차이:** 카드 내부에 **아이콘 + 제목 + 설명 + "바로가기" 안내**를 한 번에 표시. 설명 패널 별도 없음.

**모바일 레이아웃:**

```
┌──────────────────────────────────┐
│  [상단 인사]                       │
│  환영합니다, ○○○님                 │
│                                  │
│  ┌──────────────────┐              │
│  │    원세컨드        │              │
│  │ 17년 현장이 담긴   │              │
│  │  TM 상담 도구      │              │
│  └──────────────────┘              │
├──────────────────────────────────┤
│                                  │
│  ┌─────────────┐  ┌─────────────┐ │
│  │ 📜           │  │ 💬           │ │
│  │ 스크립트     │  │ 현장 Q&A     │ │
│  │             │  │             │ │
│  │ 17년 현장의  │  │ 설계사들의   │ │
│  │ 멘트 56개    │  │ 질문과 답변  │ │
│  │             │  │             │ │
│  │ 탭하여 이동 →│  │ 탭하여 이동 →│ │
│  └─────────────┘  └─────────────┘ │
│                                  │
│  ┌─────────────┐  ┌─────────────┐ │
│  │ ⚡           │  │ 📁           │ │
│  │ 빠른실행     │  │ MY SPACE    │ │
│  │             │  │             │ │
│  │ 한 번 클릭   │  │ 나만의       │ │
│  │ 으로 바로    │  │ 자료 공간    │ │
│  │             │  │             │ │
│  │ 탭하여 이동 →│  │ 탭하여 이동 →│ │
│  └─────────────┘  └─────────────┘ │
│                                  │
│  ┌─────────────┐  ┌─────────────┐ │
│  │ 🤝           │  │ 🔍           │ │
│  │ 함께해요     │  │ 검색기       │ │
│  │             │  │             │ │
│  │ 원세컨드     │  │ 원하는 내용  │ │
│  │ 함께 만들기  │  │ 즉시 찾기    │ │
│  │             │  │             │ │
│  │ 탭하여 이동 →│  │ 탭하여 이동 →│ │
│  └─────────────┘  └─────────────┘ │
│                                  │
├──────────────────────────────────┤
│  [하단 CTA 3개 (가로 배치)]         │
│  [지금 시작하기] [나중에] [건너뛰기] │
└──────────────────────────────────┘
```

### 5-3. 카드 HTML 구조 (모바일 전용)

```html
<div class="welcome-mobile-grid">
  <div class="welcome-mobile-card"
       onclick="window.welcomeGotoTarget('scripts')"
       data-node-id="scripts">
    <div class="welcome-mobile-card-icon">📜</div>
    <div class="welcome-mobile-card-title">스크립트</div>
    <div class="welcome-mobile-card-desc">
      17년 현장 경험이 담긴 멘트 56개.
      도입부터 반론 대응까지.
    </div>
    <div class="welcome-mobile-card-hint">탭하여 이동 →</div>
  </div>

  <!-- 나머지 5개 카드 동일 구조 -->
</div>
```

### 5-4. 모바일 CSS

```css
@media (max-width: 640px) {
  /* 6각형 SVG 숨김 */
  .welcome-diamond-wrap { display: none; }

  /* 데스크탑용 설명 패널 숨김 (카드 안에 설명 포함됨) */
  .welcome-detail { display: none; }

  /* 중앙 로고를 상단으로 이동 */
  .welcome-center-wrap {
    position: static;
    transform: none;
    margin: 0 auto var(--space-5);
    max-width: 280px;
  }

  /* 2x3 카드 그리드 */
  .welcome-mobile-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
    padding: var(--space-4);
  }

  /* 개별 카드 */
  .welcome-mobile-card {
    background: var(--color-surface);
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    cursor: pointer;
    transition: all var(--transition-normal);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: var(--space-2);
    min-height: 160px;
  }

  .welcome-mobile-card:active {
    transform: scale(0.97);
    background: var(--color-surface-2);
    border-color: var(--color-accent);
  }

  .welcome-mobile-card-icon {
    font-size: 1.8em;
    line-height: 1;
  }

  .welcome-mobile-card-title {
    font-size: 0.895em;
    font-weight: var(--fw-bold);
    color: var(--color-text-primary);
  }

  .welcome-mobile-card-desc {
    font-size: 0.737em;
    color: var(--color-text-secondary);
    line-height: 1.5;
    flex: 1;
  }

  .welcome-mobile-card-hint {
    font-size: 0.684em;
    font-weight: var(--fw-bold);
    color: var(--color-accent);
    margin-top: auto;
  }

  /* 하단 CTA 버튼 가로 배치 */
  .welcome-footer {
    flex-direction: row;
    justify-content: space-between;
    gap: var(--space-2);
    padding: 0 var(--space-4);
  }

  .welcome-btn {
    padding: var(--space-2) var(--space-3);
    font-size: 0.790em;
    flex: 1;
  }
}

/* 데스크탑에서는 모바일 그리드 숨김 */
@media (min-width: 641px) {
  .welcome-mobile-grid { display: none; }
}
```

### 5-5. HTML 구조 (데스크탑·모바일 동시 렌더)

welcome.html 본문에 **두 가지 레이아웃을 모두 포함**하고 CSS로 미디어 쿼리 분기.

```html
<!-- 데스크탑: 6각형 SVG -->
<div class="welcome-diamond-wrap">
  <svg class="welcome-diamond-svg" ...>
    <!-- 6개 노드 -->
  </svg>
  <div class="welcome-center-wrap">
    <!-- 중앙 로고 -->
  </div>
</div>

<!-- 데스크탑: 설명 패널 (호버 시 내용 변경) -->
<div id="welcome-detail-panel" class="welcome-detail">
  <!-- 동적 내용 -->
</div>

<!-- 모바일: 카드 그리드 -->
<div class="welcome-mobile-grid">
  <!-- 6개 카드 -->
</div>
```

**장점:** 브라우저 크기 변경 시 자동 전환, JS 분기 불필요.

---

## 🎯 6. `js/auth.js` 수정 (Step 3)

### 6-1. 수정 위치

`auth.js` 파일의 `init()` 함수 내부, `loadUser()` 호출 **직후**.

### 6-2. 현재 코드 (참고)

```javascript
async function init() {
  var token  = window.db.getToken();
  var userId = resolveUserId();

  if (!token || !userId) {
    window.location.href = 'index.html';
    return;
  }

  // ... (토큰 갱신 로직)

  // DB에서 사용자 정보 fetch
  await loadUser();
}
```

### 6-3. 추가할 코드

`loadUser()` 호출 **뒤에** 다음 블록 추가:

```javascript
  // DB에서 사용자 정보 fetch
  await loadUser();

  // ── Welcome 페이지 라우팅 판정 ────────────────────────────
  // 첫 로그인 사용자에게 welcome 페이지 강제 표시
  // 조건:
  //   1. users.onboarding_dismissed_at IS NULL
  //   2. app_settings에서 welcome_page_enabled = 'true'
  //   3. 현재 URL이 welcome 페이지가 아님 (무한 루프 방지)
  //   4. URL에 ?skipWelcome=1 파라미터 없음 (관리자 테스트용)
  try {
    var urlParams = new URLSearchParams(window.location.search);
    var currentPage = urlParams.get('page');
    var skipWelcome = urlParams.get('skipWelcome') === '1';

    if (currentPage !== 'welcome' && !skipWelcome) {
      // Feature Flag 확인
      var flagRes = await window.db.fetch(
        '/rest/v1/app_settings?group_name=eq.feature_flag&key=eq.welcome_page_enabled&select=value'
      );
      var flagData = flagRes.ok ? await flagRes.json() : [];
      var welcomeEnabled = flagData[0] && flagData[0].value === 'true';

      if (welcomeEnabled) {
        // 사용자의 onboarding 상태 확인
        var userCheckRes = await window.db.fetch(
          '/rest/v1/users?id=eq.' + window.AppState.userId + '&select=onboarding_dismissed_at'
        );
        if (userCheckRes.ok) {
          var userCheckData = await userCheckRes.json();
          if (userCheckData[0] && userCheckData[0].onboarding_dismissed_at === null) {
            // 첫 로그인 → welcome 페이지로 리다이렉트
            window.location.href = 'app.html?page=welcome';
            return;
          }
        }
      }
    }
  } catch (e) {
    // welcome 라우팅 실패해도 앱은 정상 진행 (안전 장치)
    console.warn('Welcome routing check failed:', e);
  }
  // ── Welcome 라우팅 판정 끝 ────────────────────────────────
```

### 6-4. 안전 원칙

- `try-catch`로 감쌈 → welcome 로직 실패해도 앱 정상 진행
- Feature Flag 꺼져있으면 자동 스킵
- `?skipWelcome=1` 파라미터로 관리자 우회 가능
- 무한 루프 방지 (currentPage 확인)

---

## 🎯 7. `app.html` 수정 (Step 4)

### 7-1. 좌측 메뉴에 "원세컨드 소개" 항목 추가

**찾을 위치:** app.html의 사이드바 메뉴 영역 (`<nav>` 또는 `.menu-list` 내부)
**Claude Code 지시:** 기존 메뉴 배열 또는 HTML에서 맨 아래 또는 로그아웃 바로 위에 다음 추가:

```html
<!-- 기존 메뉴들... -->
<div class="menu-item" data-menu="welcome" onclick="switchMenu('welcome')">
  <span class="menu-icon">💡</span>
  <span class="menu-label">원세컨드 소개</span>
</div>
```

**위치 우선순위:**
1. 기존 사이드바 마지막 메뉴 아래
2. 로그아웃 버튼 바로 위

### 7-2. `switchMenu('welcome')` 처리

`switchMenu` 함수 내부 (또는 라우팅 로직)에 welcome 케이스 추가:

```javascript
function switchMenu(menuKey) {
  // 기존 로직...

  if (menuKey === 'welcome') {
    // 재방문 모드로 welcome 페이지 로드
    window.location.href = 'app.html?page=welcome&mode=revisit';
    return;
  }

  // 기존 로직 계속...
}
```

### 7-3. URL 파라미터로 welcome 페이지 로드

`app.html`이 로드될 때 `?page=welcome`이면 `pages/welcome.html`을 콘텐츠 영역에 로드해야 함.

**이미 기존에 페이지 로딩 로직이 있다면 그대로 활용.** 예:
```javascript
const urlParams = new URLSearchParams(window.location.search);
const pageParam = urlParams.get('page');
if (pageParam) {
  switchMenu(pageParam);  // 기존 라우팅 활용
}
```

**없다면 추가 필요.** Claude Code가 app.html 구조 확인 후 판단.

---

## 🎯 8. Welcome 페이지 핵심 JavaScript 함수

### 8-1. 완료 처리 함수

```javascript
window.welcomeComplete = async function(mode) {
  // mode: 'done' | 'later' | 'skip' | 'target'
  try {
    var res = await window.db.fetch(
      '/rest/v1/users?id=eq.' + window.AppState.userId,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ onboarding_dismissed_at: new Date().toISOString() })
      }
    );

    if (res.ok) {
      // activity_logs 기록 (선택)
      window.db.fetch('/rest/v1/activity_logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          user_id: window.AppState.userId,
          event_type: 'welcome_completed',
          target_type: null,
          target_id: null,
          meta: { mode: mode }
        })
      }).catch(function() {});

      // 홈으로 이동
      window.switchMenu ? window.switchMenu('home') : (window.location.href = 'app.html');
    }
  } catch (e) {
    console.error('Welcome complete failed:', e);
    // 실패해도 홈으로 이동 (사용자 이탈 방지)
    window.switchMenu ? window.switchMenu('home') : (window.location.href = 'app.html');
  }
};
```

### 8-2. 특정 메뉴로 이동 함수

```javascript
window.welcomeGotoTarget = async function(targetMenu) {
  // onboarding 완료 처리
  await window.welcomeComplete('target');

  // 해당 메뉴로 전환
  if (window.switchMenu) {
    window.switchMenu(targetMenu);
  } else {
    window.location.href = 'app.html?page=' + targetMenu;
  }
};
```

### 8-3. 노드 상호작용 핸들러 (v2: 호버 + 즉시 이동)

```javascript
// ─────────────────────────────────────────────────────
// 호버 핸들러 — 데스크탑 전용
// ─────────────────────────────────────────────────────
window.welcomeNodeHover = function(nodeId) {
  var node = NODES.find(function(n) { return n.id === nodeId; });
  if (!node) return;

  // 설명 패널 업데이트 (CTA 버튼 없이 정보만)
  var panel = document.getElementById('welcome-detail-panel');
  if (!panel) return;

  panel.innerHTML =
    '<div class="welcome-detail-icon">' + (node.label.split(' ')[0] || '') + '</div>' +
    '<div class="welcome-detail-title">' + node.title + '</div>' +
    '<div class="welcome-detail-desc">' + node.description + '</div>' +
    '<div class="welcome-detail-hint">노드를 클릭하면 바로 이동합니다</div>';
  panel.classList.add('active');

  // 노드 시각 강조
  var nodeEl = document.getElementById('welcome-node-' + nodeId);
  if (nodeEl) nodeEl.classList.add('hover');
};

window.welcomeNodeHoverOut = function(nodeId) {
  var nodeEl = document.getElementById('welcome-node-' + nodeId);
  if (nodeEl) nodeEl.classList.remove('hover');

  // 패널은 유지 (마지막 호버한 정보 계속 표시)
  // 또는 기본 안내로 복귀하려면:
  // var panel = document.getElementById('welcome-detail-panel');
  // panel.classList.remove('active');
};

// ─────────────────────────────────────────────────────
// 클릭 핸들러 — 데스크탑·모바일 공통
// 클릭 = 즉시 해당 페이지로 이동 + onboarding 완료
// ─────────────────────────────────────────────────────
window.welcomeNodeClick = async function(nodeId) {
  var node = NODES.find(function(n) { return n.id === nodeId; });
  if (!node) return;

  // 클릭 피드백 애니메이션 (0.1초)
  var nodeEl = document.getElementById('welcome-node-' + nodeId);
  if (nodeEl) {
    nodeEl.classList.add('clicking');
    setTimeout(function() {
      nodeEl.classList.remove('clicking');
    }, 100);
  }

  // 즉시 페이지 이동 (onboarding 완료 처리 포함)
  await window.welcomeGotoTarget(node.target, node.id);
};

// ─────────────────────────────────────────────────────
// 재방문 모드 클릭 핸들러
// 재방문 시에는 onboarding 업데이트 없이 이동만
// ─────────────────────────────────────────────────────
window.welcomeNodeClickRevisit = function(nodeId) {
  var node = NODES.find(function(n) { return n.id === nodeId; });
  if (!node) return;

  // 즉시 해당 메뉴로 전환 (onboarding 건드리지 않음)
  if (window.switchMenu) {
    window.switchMenu(node.target);
  } else {
    window.location.href = 'app.html?page=' + node.target;
  }
};
```

### 8-4. welcomeGotoTarget 함수 업데이트 (v2)

v1의 `welcomeGotoTarget`은 `welcomeComplete('target')` 호출 후 메뉴 전환이었는데,
v2에서는 **클릭한 노드 ID를 로그에 남기도록** 개선:

```javascript
window.welcomeGotoTarget = async function(targetMenu, sourceNodeId) {
  try {
    // onboarding 완료 처리
    await window.db.fetch(
      '/rest/v1/users?id=eq.' + window.AppState.userId,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ onboarding_dismissed_at: new Date().toISOString() })
      }
    );

    // activity_logs 기록 (어느 노드를 눌렀는지)
    window.db.fetch('/rest/v1/activity_logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        user_id: window.AppState.userId,
        event_type: 'welcome_node_click',
        target_type: 'navigation',
        target_id: sourceNodeId || null,
        meta: { target: targetMenu, mode: 'first_login' }
      })
    }).catch(function() {});

  } catch (e) {
    console.warn('welcomeGotoTarget: onboarding update failed:', e);
    // 실패해도 페이지 이동은 진행 (사용자 이탈 방지)
  }

  // 해당 메뉴로 전환
  if (window.switchMenu) {
    window.switchMenu(targetMenu);
  } else {
    window.location.href = 'app.html?page=' + targetMenu;
  }
};
```

### 8-5. HTML 이벤트 바인딩 예시

**데스크탑 SVG 노드:**
```html
<g class="welcome-node"
   id="welcome-node-scripts"
   onmouseenter="welcomeNodeHover('scripts')"
   onmouseleave="welcomeNodeHoverOut('scripts')"
   onclick="welcomeNodeClick('scripts')">
  <rect class="welcome-node-rect" x="230" y="20" width="140" height="80"/>
  <text class="welcome-node-label" x="300" y="60">📜 스크립트</text>
</g>
```

**모바일 카드:**
```html
<div class="welcome-mobile-card"
     onclick="welcomeNodeClick('scripts')"
     data-node-id="scripts">
  <div class="welcome-mobile-card-icon">📜</div>
  <div class="welcome-mobile-card-title">스크립트</div>
  <div class="welcome-mobile-card-desc">17년 현장 경험이 담긴 멘트 56개</div>
  <div class="welcome-mobile-card-hint">탭하여 이동 →</div>
</div>
```

---

## 🎯 9. 스타일 참고 (CSS 샘플)

### 9-1. 6각형 SVG 컨테이너 (v2: 호버+즉시이동 방식)

```css
.welcome-diamond-wrap {
  position: relative;
  width: 100%;
  max-width: 600px;
  margin: var(--space-8) auto;
  aspect-ratio: 1 / 1;
}

.welcome-diamond-svg {
  width: 100%;
  height: 100%;
}

.welcome-diamond-line {
  stroke: var(--color-border);
  stroke-width: 2;
  fill: none;
}

.welcome-node {
  cursor: pointer;
  transition: all var(--transition-normal);
  transform-origin: center;
}

.welcome-node-rect {
  fill: var(--color-surface);
  stroke: var(--color-border);
  stroke-width: 1.5;
  rx: var(--radius-md);
  ry: var(--radius-md);
  transition: all var(--transition-normal);
}

.welcome-node-label {
  font-size: 0.842em;
  font-weight: var(--fw-bold);
  fill: var(--color-text-primary);
  text-anchor: middle;
  dominant-baseline: central;
  pointer-events: none; /* 클릭 이벤트가 rect로 전달되도록 */
}

/* 호버 상태 (데스크탑) */
.welcome-node:hover .welcome-node-rect,
.welcome-node.hover .welcome-node-rect {
  fill: var(--color-surface-2);
  stroke: var(--color-accent);
  stroke-width: 2;
}

.welcome-node:hover,
.welcome-node.hover {
  transform: scale(1.05);
}

/* 클릭 순간 피드백 */
.welcome-node.clicking {
  transform: scale(0.95);
  transition: transform 0.1s ease-out;
}

/* 펄스 애니메이션 (주목 유도) */
@keyframes welcome-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
}

.welcome-node:not(:hover):not(.hover):not(.clicking) {
  animation: welcome-pulse 2s ease-in-out infinite;
}

/* 호버 중에는 펄스 중단 */
.welcome-node:hover,
.welcome-node.hover {
  animation: none;
}
```

### 9-1-2. 설명 패널 (v2: CTA 버튼 없는 정보 표시만)

```css
.welcome-detail {
  max-width: 600px;
  margin: var(--space-5) auto 0;
  padding: var(--space-5) var(--space-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: var(--space-2);
  opacity: 0.6;
  transition: opacity var(--transition-normal);
}

.welcome-detail.active {
  opacity: 1;
  border-color: var(--color-accent);
}

.welcome-detail-icon {
  font-size: 2em;
  line-height: 1;
}

.welcome-detail-title {
  font-size: 1.1em;
  font-weight: var(--fw-black);
  color: var(--color-text-primary);
}

.welcome-detail-desc {
  font-size: 0.895em;
  color: var(--color-text-secondary);
  line-height: 1.6;
  max-width: 480px;
}

.welcome-detail-hint {
  font-size: 0.790em;
  color: var(--color-accent);
  font-weight: var(--fw-bold);
  margin-top: var(--space-2);
}

/* 초기 상태: "노드에 마우스를 올려보세요" 안내 */
.welcome-detail:not(.active)::before {
  content: "⬆ 6개 영역에 마우스를 올려보세요";
  font-size: 0.895em;
  color: var(--color-text-tertiary);
}

.welcome-detail:not(.active) > * {
  display: none;
}
```

---

### 9-2. 중앙 로고 박스

```css
.welcome-center-wrap {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: var(--space-5);
  background: var(--color-surface);
  border: 2px solid var(--color-brand);
  border-radius: var(--radius-lg);
  text-align: center;
  pointer-events: none;
}

.welcome-logo {
  font-size: 1.5em;
  font-weight: var(--fw-black);
  color: var(--color-brand);
}

.welcome-tagline {
  font-size: 0.842em;
  color: var(--color-text-secondary);
  margin-top: var(--space-1);
  line-height: 1.5;
}
```

### 9-3. 하단 CTA 버튼

```css
.welcome-footer {
  display: flex;
  gap: var(--space-3);
  justify-content: center;
  margin-top: var(--space-8);
  flex-wrap: wrap;
}

.welcome-btn {
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-sm);
  font-size: 0.895em;
  font-weight: var(--fw-bold);
  cursor: pointer;
  border: 1.5px solid transparent;
  transition: all var(--transition-fast);
  font-family: inherit;
}

.welcome-btn-primary {
  background: var(--color-brand);
  color: #fff;
  border-color: var(--color-brand);
}
.welcome-btn-primary:hover {
  background: var(--color-brand-light);
}

.welcome-btn-secondary {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
  border-color: var(--color-border);
}

.welcome-btn-ghost {
  background: transparent;
  color: var(--color-text-tertiary);
  border-color: var(--color-border);
}
```

---

## 🎯 10. 검증 체크리스트

### 10-1. 구조 검사
- [ ] `pages/welcome.html` 파일 정상 생성
- [ ] DOCTYPE/html/head/body 태그 없음
- [ ] 모든 함수 `window.XXX` 등록
- [ ] CSS 하드코딩 색상 없음 (모두 `var(--...)`)
- [ ] 폰트 단위 `em` 사용

### 10-2. 기능 검사 (첫 로그인 모드, v2)
- [ ] 신규 가입 → 첫 로그인 시 자동으로 welcome 페이지 표시됨
- [ ] 6각형 SVG 렌더링 정상 (데스크탑)
- [ ] 중앙 "원세컨드" 로고 + "17년 현장이 담긴 TM 상담 도구" 카피 표시
- [ ] 6개 노드 모두 표시, 각 위치 정확
- [ ] **데스크탑: 노드 호버 시 설명 패널 자동 업데이트 (CTA 버튼 없음)**
- [ ] **데스크탑: 노드 호버 시 노드 확대 (scale 1.05) + 펄스 애니메이션 중단**
- [ ] **데스크탑: 마우스 떠남 시 패널 그대로 유지 또는 기본 안내 복귀**
- [ ] **데스크탑: 노드 클릭 시 즉시 해당 페이지 이동 (설명 다시 볼 필요 없음)**
- [ ] **모바일: 카드 탭 1번 = 즉시 해당 페이지 이동**
- [ ] 노드 클릭 / 카드 탭 시 onboarding_dismissed_at UPDATE 됨
- [ ] activity_logs에 welcome_node_click 이벤트 기록됨 (어느 노드 눌렀는지)
- [ ] 하단 3개 버튼 중 어느 것 눌러도 홈으로 이동 + onboarding 완료
- [ ] "지금 시작하기" 버튼 문구 정확 (v1의 "모두 둘러봤어요" 아님)
- [ ] 이후 재로그인 → welcome 스킵, 홈 직행

### 10-3. 기능 검사 (재방문 모드)
- [ ] 좌측 메뉴 "원세컨드 소개" 클릭 → welcome 페이지 로드
- [ ] URL에 `?mode=revisit` 파라미터
- [ ] 상단 인사 배너 간소화됨
- [ ] 하단 버튼 "돌아가기" 1개만 표시
- [ ] "돌아가기" 클릭 → 홈으로 이동 (onboarding 변경 없음)

### 10-4. Feature Flag 검사
- [ ] `app_settings.welcome_page_enabled = 'false'` 설정 → welcome 스킵됨
- [ ] `app_settings.welcome_page_enabled = 'true'` 설정 → welcome 표시됨

### 10-5. 모바일 검사 (640px 이하, v2)
- [ ] 6각형 SVG 숨김 + 2x3 카드 그리드 표시
- [ ] 각 카드에 아이콘 + 제목 + 설명 + "탭하여 이동 →" 안내 모두 표시
- [ ] 중앙 "원세컨드" 로고가 카드 그리드 위로 이동
- [ ] 카드 탭 1번 = 즉시 해당 페이지로 이동
- [ ] 카드 탭 시 살짝 눌리는 피드백 (scale 0.97)
- [ ] 데스크탑용 설명 패널은 모바일에서 숨김
- [ ] 하단 CTA 3개 버튼 가로 배치 (flex-direction: row)
- [ ] 세로 스크롤 정상
- [ ] 호버 이벤트 발생 안 함 (터치 전용 확인)

### 10-6. 권한·엣지 케이스
- [ ] admin 계정도 welcome 표시 (차단 안 함)
- [ ] manager 계정도 welcome 표시
- [ ] member 계정 welcome 표시
- [ ] onboarding_dismissed_at 컬럼 NULL이면 welcome 표시
- [ ] onboarding_dismissed_at 컬럼 값 있으면 welcome 스킵
- [ ] Supabase 연결 실패 시 welcome 스킵하고 홈 직행 (앱 정상 동작)

### 10-7. 디자인 검사
- [ ] 웜 브라운 팔레트 일관성
- [ ] 최소 radius-sm 이상
- [ ] 폰트 일관성 (Pretendard + DM Sans)
- [ ] 전환 애니메이션 부드러움

---

## 🎯 11. 배포 단계

### Step 1: Supabase 준비
1. 팀장님: Supabase SQL Editor에서 `onboarding_dismissed_at` 컬럼 확인
2. 없으면 ALTER TABLE 실행
3. `app_settings`에 `welcome_page_enabled = 'false'` INSERT (처음엔 OFF로)

### Step 2: Claude Code 파일 생성
1. `pages/welcome.html` 생성
2. `js/auth.js` 수정
3. `app.html` 수정
4. **커밋만 하고 푸시 안 함** — 팀장님 검증 대기

### Step 3: 로컬 검증
1. 로컬 서버로 welcome.html 단독 접근 테스트
2. 6각형 렌더링, 노드 클릭, 설명 패널 확인
3. 문제 없으면 다음 단계

### Step 4: 제한 배포 (팀장님만)
1. `welcome_page_enabled = 'true'` 설정
2. 팀장님 본인 계정 `onboarding_dismissed_at` NULL로 설정
3. 로그인 → welcome 페이지 표시 확인
4. 6개 노드 모두 클릭 → 홈 이동 확인
5. 재로그인 → welcome 스킵 확인

### Step 5: 전체 배포
1. Git push
2. 라이브 사이트 배포 완료 확인
3. 기존 40명 사용자는 `onboarding_dismissed_at` 이미 NULL이므로 다음 로그인 시 welcome 표시됨
4. (선택) 기존 사용자 영향 주기 싫으면 마이그레이션 SQL 실행:
   ```sql
   UPDATE public.users
   SET onboarding_dismissed_at = NOW()
   WHERE created_at < '2026-04-22';
   ```
   → 기존 사용자 스킵, 신규만 welcome 거침

---

## 🎯 12. 금지 사항

1. **`index.html` 수정 금지** — 고민 중 상태
2. **`home.html` 수정 금지** — 고민 중 상태
3. **다른 `pages/*.html` 수정 금지** — 이번 작업 범위 아님
4. **`tokens.css` 수정 금지** — 기존 변수만 사용
5. **`db.js` 수정 금지** — 기존 API만 호출
6. **기존 `auth.js` 함수 시그니처 변경 금지** — 추가만
7. **하드코딩 색상 금지**
8. **직각 `border-radius: 0` 금지**
9. **px 고정 폰트 금지**
10. **팀장님 확인 전 "완료" 선언 금지**

---

## 🎯 13. 작업 후 보고 형식

Claude Code는 작업 완료 시 다음을 보고:

### 1. 파일 목록
- `pages/welcome.html` (신규, N 라인)
- `js/auth.js` (+N 라인)
- `app.html` (+N 라인)

### 2. Supabase 변경사항
- 컬럼 추가 SQL 실행 여부
- Feature Flag 등록 여부

### 3. 검증 체크리스트 결과
위 10절 체크리스트 각 항목 O / X / N/A

### 4. 의심 구간
- 6각형 SVG 좌표가 의도대로 나오는지
- 모바일 breakpoint 적절한지
- Feature Flag 로직 안정성

### 5. 미적용 또는 판단 보류한 부분
- `NODES` 배열의 `target` 메뉴 키가 실제 `switchMenu`와 일치하는지 확인 필요
- 설명 패널 애니메이션 방식 (slide vs fade)

### 6. 다음 개선 후보
- 각 노드별 샘플 데이터 미리보기 (스크립트 1개 엿보기 등)
- 완료 카운터 "6/6 탐색 완료!" 축하 메시지
- "새 기능 업데이트 시 다시 보기" 기능

---

## 🎯 14. 참고 문서

- `00_MASTER.md` — 불변 원칙
- `design_guide.md` — 디자인 토큰 규칙
- `supabase_schema.md` — users 테이블 스키마
- `auth.js` — 현재 init() 함수 구조
- `app.html` — switchMenu 함수 구조

---

## 📝 문서 끝

**이 작업지시서는 원세컨드 정체성 전달 문제 해결을 위한 독립적인 신규 기능 구축이다.**

**핵심 원칙:**
- 기존 파일 건드리지 않음 (welcome.html 신규 생성)
- 기존 동작 보존 (auth.js, app.html 추가만)
- Feature Flag로 즉시 on/off 가능
- 문제 생기면 파일 삭제로 롤백

**성공 기준:**
첫 로그인 사용자 100%가 welcome 페이지를 거치며, 6개 노드 중 최소 1개라도 클릭 후 해당 메뉴로 이동.

---

**작성자:** Claude AI (총괄 기획자)
**승인:** 팀장님 임태성
**실행:** Claude Code
