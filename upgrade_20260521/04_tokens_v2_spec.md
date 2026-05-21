---
title: 원세컨드 디자인 토큰 v2 spec — tokens.css 재설계 본진
date: 2026-05-21
version: v2
status: Code 본인 작성 (단계 ②, navi_new.html reference 박힌 자리 추출)
reference:
  - upgrade_20260521/navi_new.html (라인 10~11 토큰 통째)
  - upgrade_20260521/01_디자인_시스템_spec_v1.md (Claude AI 웹 작성)
supersedes: css/tokens.css (브라운 박힌 자리 통째 폐기)
d_day: 2026-05-25 (월) 저녁 라이브 전환
---

# 디자인 토큰 v2 spec — 본진 (tokens.css 재설계)

## §1. 본진 (왜 v2 박는가)

### v1(브라운) 격차

기존 `css/tokens.css` 박힌 자리:
- 브라운 색상 (`--color-brand: #8B6F47` / `--brand-50 ~ --brand-700` 스케일)
- 별칭 박힌 자리 (`--color-text-primary` ≈ `--brand-700` 같은 자리)
- 다크 모드 분기 박지 X (라이트만 박힌 자리)
- 페이지별 하드코딩 본진 박힘 (app.html 14곳 + pages/*.html 박힌 자리)

→ 본 자리 박지 X 박힌 자리 = 토큰 무너진 자리. 별칭 박힌 자리 통째 폐기 박을 자리.

### v2 본진

- **인디고 강조 + 무채색 골격** (Claude AI 웹 spec § 1 본진 정합)
- **다크 기본 + 라이트 토글** (양쪽 동등 단일 스케일)
- **별칭 박지 X** = 단일 스케일 직박음
- **Pretendard 단독** (한글 가독성 최강)
- **navi_new.html 박힌 자리 reference** (라인 10~11 토큰 통째 정합)

---

## §2. 토큰 통째 (다크 + 라이트 양쪽 동등)

### 다크 모드 (기본)

```css
:root[data-theme="dark"], :root:not([data-theme]) {
  /* 표면 (60-30-10 본진) */
  --bg:        #0B0C0E;   /* 배경 60% — 거의-검정, 순검정 금지 */
  --s1:        #141518;   /* 표면1 카드 30% */
  --s2:        #1C1D21;   /* 표면2 강조 패널 */
  --sh:        #222328;   /* hover */
  --bd:        #26272B;   /* 테두리 (선 박지 X 박혀도 박힐 자리) */

  /* 텍스트 */
  --tp:        #F4F4F5;   /* 주 — 순백 박지 X */
  --ts:        #A1A1AA;   /* 보조 — 설명·라벨 */
  --tf:        #6B6D72;   /* 흐림 — 비활성·힌트 */
  --bodytx:    #D4D4D8;   /* 본문 박힌 자리 */

  /* 강조 (인디고 10%) */
  --ac:        #6366F1;   /* 강조 */
  --ach:       #7C7FF2;   /* 강조 hover */

  /* 카테고리 (게시판 자리) */
  --t-uw:      #22D3EE;   /* 인수 = cyan */
  --t-product: #6366F1;   /* 상품 = 인디고 */
  --t-event:   #E879F9;   /* 이벤트 = magenta */

  /* 상태 (다크·라이트 공통) */
  --ok:        #22C55E;   /* 성공 */
  --warn:      #F59E0B;   /* 경고 */
  --err:       #EF4444;   /* 오류 */
  --info:      #6366F1;   /* 정보 = 강조 통일 */
}
```

### 라이트 모드 (사용자 선택)

```css
:root[data-theme="light"] {
  /* 표면 */
  --bg:        #FBFBFC;   /* 순백 박지 X, 미세 쿨화이트 */
  --s1:        #FFFFFF;
  --s2:        #F4F4F6;
  --sh:        #EEEEF1;
  --bd:        #E4E4E7;

  /* 텍스트 */
  --tp:        #18181B;   /* 거의-검정 */
  --ts:        #52525B;
  --tf:        #A1A1AA;
  --bodytx:    #3F3F46;

  /* 강조 (다크와 동일 인디고) */
  --ac:        #6366F1;
  --ach:       #7C7FF2;

  /* 카테고리 (라이트 박은 자리 — 채도 본진) */
  --t-uw:      #0891B2;   /* 인수 = 짙은 cyan */
  --t-product: #6366F1;   /* 상품 = 인디고 */
  --t-event:   #C026D3;   /* 이벤트 = 짙은 magenta */

  /* 상태 */
  --ok:        #16A34A;
  --warn:      #D97706;
  --err:       #DC2626;
  --info:      #6366F1;
}
```

### 토큰 격차 점검 표 (v1 → v2)

| v1 박힌 자리 | v2 박을 자리 | 본진 |
|---|---|---|
| `--color-brand: #8B6F47` (브라운) | `--ac: #6366F1` (인디고) | 색 자체 본진 변경 |
| `--brand-50 ~ --brand-700` (브라운 스케일 11개) | 박지 X 박을 자리 | 별칭 자리 통째 폐기 |
| `--color-bg-primary` | `--bg` | 명명 단순화 |
| `--color-surface` | `--s1` | 명명 단순화 |
| `--color-text-primary` | `--tp` | 명명 단순화 |
| `--color-text-secondary` | `--ts` | 명명 단순화 |
| `--color-text-tertiary` | `--tf` | 명명 단순화 |
| `--color-border` | `--bd` | 명명 단순화 |
| `--shadow-sm` 등 | 박을 자리 (별도 §6) | shadow 토큰 본진 박을 자리 |
| `--radius-sm/md/lg` | 박을 자리 (§7) | radius 토큰 본진 박을 자리 |

---

## §3. 색상 사용 원칙 (3대)

### 원칙 1 — 강조색 아껴 쓰기

- 인디고(`--ac`)는 **주요 버튼·현재 위치·중요 링크에만**
- 나머지 = 무채색 (`--tp`/`--ts`/`--tf`)
- 모든 자리 인디고 박지 X = 격차

### 원칙 2 — 깊이는 명도 차이로

- 카드 박을 자리 = `--s1` 표면 박음 (배경 `--bg`보다 한 칸 위)
- **테두리 박지 X 박는 자리 정합** (`--bd` 박을 자리 = 정말 필요할 때만)
- 그림자 박을 자리 = 박지 X 박혀도 명도 차이로 박힘

### 원칙 3 — 브라운 통째 폐기

- `--color-brand` / `--brand-*` 스케일 = 박지 X
- 별칭 박지 X 박을 자리 (= 토큰 무너진 본진 원인)
- 새 토큰 = 단일 스케일

---

## §4. 타이포그래피

### 서체 — Pretendard 단독

```css
:root {
  --ff: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
  --ff-mono: 'JetBrains Mono', 'D2 Coding', monospace;
}
```

- 본문·UI 전체 = Pretendard (한글 가독성 최강)
- 디스플레이(큰 제목) = Pretendard 무게 700~800
- 숫자·코드 강조 = JetBrains Mono (보험료·수치 표시 시만)
- **폐기:** DM Sans 1순위 박힌 자리 (한글 서비스에 영문 본문 폰트 1순위 박지 X)

### 사이즈 — 16px 기준 1.25 계단

```css
:root {
  --fs-display: 1.75rem;   /* 28px — 페이지 대표 타이틀 (드물게) */
  --fs-h1:      1.375rem;  /* 22px — 페이지 제목 */
  --fs-h2:      1.125rem;  /* 18px — 섹션 헤더 */
  --fs-body:    1rem;      /* 16px — 본문 기준 ⭐ */
  --fs-sm:      0.875rem;  /* 14px — 카드 설명·보조 */
  --fs-label:   0.8125rem; /* 13px — 라벨·메타 */
  --fs-caption: 0.6875rem; /* 11px — 뱃지·태그 */
}
```

### 무게

```css
:root {
  --fw-normal:  400;  /* 본문 */
  --fw-medium:  500;  /* 강조 박지 X 박을 자리 = 박지 X (어중간 본진) */
  --fw-semibold:600;  /* 강조 */
  --fw-bold:    700;  /* 제목 */
  --fw-black:   800;  /* 디스플레이 */
}
```

### 가독성

```css
:root {
  --lh-body: 1.6;     /* 본문 (한글은 넉넉히) */
  --lh-heading: 1.3;  /* 제목 */
  --lh-tight: 1.2;    /* 캡션 */
  --ls-heading: -0.01em;  /* 제목만 살짝 좁게 */
}
```

---

## §5. 폰트 크기 컨트롤러 (4단계)

navi_new.html line 334~336 박힌 자리 정합:

```css
html { font-size: calc(100% * var(--fscale, 1)); }
/* 사용자 선택 박힌 자리 */
[data-fontsize="90"]  { --fscale: 0.9; }
[data-fontsize="100"] { --fscale: 1; }
[data-fontsize="110"] { --fscale: 1.1; }
[data-fontsize="125"] { --fscale: 1.25; }
```

### 적용 자리

- **본문 영역만** (사이드바·헤더 박지 X — 전체 확대 박을 자리 격차)
- localStorage 박힌 자리 저장 (`os_fontsize`)
- 사용자 메뉴에서 토글 (4단계: 90 / 100 / 110 / 125)

### 본진 ([[accessibility_low_vision]] 메모리 정합)

팀장님 본인 노안 명시 박힌 자리. 본 토글 = 노안·저시력 본진 정합.

---

## §6. 그림자 + 둥근 모서리

### 그림자 (최소)

```css
:root[data-theme="dark"] {
  --sh-sm: 0 1px 2px rgba(0,0,0,0.4);
  --sh-md: 0 4px 12px rgba(0,0,0,0.3);
  --sh-lg: 0 10px 30px rgba(0,0,0,0.3);
  --sh-fab: 0 8px 24px rgba(99,102,241,0.4);  /* FAB 인디고 그림자 */
}
:root[data-theme="light"] {
  --sh-sm: 0 1px 2px rgba(0,0,0,0.05);
  --sh-md: 0 4px 12px rgba(0,0,0,0.08);
  --sh-lg: 0 10px 30px rgba(0,0,0,0.12);
  --sh-fab: 0 8px 24px rgba(99,102,241,0.25);
}
```

### 둥근 모서리

```css
:root {
  --r-sm: 5px;     /* 작은 칩·뱃지 */
  --r-md: 9px;     /* 버튼·input */
  --r-lg: 12px;    /* 카드·패널 */
  --r-xl: 16px;    /* 모달 */
  --r-pill: 999px; /* pill 박힌 자리 */
}
```

CLAUDE.md 본진 정합: **모든 컴포넌트 최소 `--r-sm` 적용 / 직각 모서리 박지 X**

---

## §7. 다크/라이트 토글 본진

### 진입 자리

navi_new.html 박힌 자리 정합 (line 334):
```html
<div class="seg">
  <span onclick="setTheme('light')" id="sl">라이트</span>
  <span class="on" onclick="setTheme('dark')" id="sd">다크</span>
</div>
```

### JS 본진

```js
window.setTheme = function(mode) {
  document.documentElement.setAttribute('data-theme', mode);
  localStorage.setItem('os_theme', mode);
};
// 초기 로드 박힌 자리
(function() {
  var t = localStorage.getItem('os_theme') || 'dark';  // 기본 다크
  document.documentElement.setAttribute('data-theme', t);
})();
```

### 저장 위치 결재

| 안 | 본진 |
|---|---|
| **A (추천)** | localStorage 본진 (`os_theme`) — 사용자 본인 PC 박힌 자리 |
| B | DB `users.theme` 컬럼 박음 — 다중 기기 동기화 |
| C | A + B 통째 (localStorage 즉시 + DB 백그라운드 sync) | 

→ A안 추천: 라이브 즉시 박을 자리 본진. B는 별 트랙 박을 자리 (다중 기기 격차 자리).

---

## §8. 카테고리 색 적용 본진

게시판 본진 박힌 자리:
```css
.item { border-left: 3px solid var(--tc); }
/* HTML 박힌 자리 */
<div class="item" style="--tc:var(--t-uw)">인수 같음</div>
<div class="item" style="--tc:var(--t-product)">상품 같음</div>
<div class="item" style="--tc:var(--t-event)">이벤트</div>
```

→ navi_new.html line 364~368 본진 정합. 카테고리 색 = 게시글 border-left 박는 자리.

---

## §9. 페이지별 적용 본진 (D-day 박을 자리)

| 페이지 | 적용 본진 |
|---|---|
| `app.html` | 골격 + 사이드바 + 헤더 (검색바·알림·계정 메뉴 + 다크/라이트·폰트 컨트롤러) |
| `pages/board.html` | 탭 4개(4팀 단체방/네비방/스마트/지점) + 칩 5개 + 리스트 + 뷰어 + 카테고리 색 |
| `pages/search.html` | feat 브랜치 박힌 자리 + 인디고 적용 + 카테고리 색 |
| `pages/scripts.html` | 좌 리스트 + 우 본문 + 딸깍 인터랙션 |
| `pages/quick.html` | 그리드 + FAB |
| `pages/myspace.html` | 카드 그리드 + 통계 |
| `pages/team-management.html` | 팀원 명단 + 초대 + (서브팀 본진 추가는 D-day 후) |
| 알림 시스템 (feat 브랜치) | 인디고 적용 + 토스트 본진 |

### 제외 (별도 본진)

- ❌ `landing.html` (별도 본진)
- ❌ `home_v2.html` / `index.html` (별도 본진)

---

## §10. 기존 tokens.css 격차 — 브라운 잔존 자리

D-day 박을 자리 = `css/tokens.css` 통째 재작성 + `app.html` 하드코딩 자리 전수 제거:

| 자리 | 박힌 자리 | v2 박을 자리 |
|---|---|---|
| `meta name="theme-color"` | `#8B6F47` | `#0B0C0E` (다크 기본) |
| 헤더 그라데이션 | `#A0522D → #8B4423` | `var(--ac)` 또는 무채색 |
| 알림 배지 | `rgba(160,82,45,*)` | `var(--err)` 또는 인디고 |
| 사이드바 그라데이션 | `#A0522D → #8B4423` | 무채색 + hover만 인디고 |
| Quick 메뉴 | 브라운 | `var(--ac)` |
| C영역 알림 카드 | 브라운 | 무채색 + 카테고리 색 |

→ **총 14곳** (어제 인계 노트 본진 정합). D-day 작업지시서 § 4 자리 통째 박힘.

---

## §11. 미해결 / 후속 결재

1. **§7 토글 저장 위치** = localStorage vs DB (A안 추천)
2. **컨테이너 너비** = 1500px max-width (navi_new.html `.wrap` 박힘) — 데스크탑 본진
3. **반응형 브레이크포인트** = 1024px 본진 (navi_new.html 박힘)
4. **카테고리 색 추가** = `--t-notice` (공지 자리) 박을 자리 결재 (현재 3개 박힘)
5. **shadow·radius 토큰 명명** = `--sh-*` / `--r-*` 통일 (CLAUDE.md `--radius-sm` 박힌 자리 격차 정정 박을 자리)

---

## §12. D-day 박을 자리 흐름

```
[월요일 새벽 ~ 정오]
1. css/tokens.css 통째 재작성 (본 spec 기반)
2. app.html 브라운 14곳 전수 제거 + 토큰 참조 전환
3. js/theme.js 신규 박음 (setTheme + setFont + 초기 로드)

[월요일 정오 ~ 저녁]
4. pages/board.html 재작성 (navi_new.html 본진 정합)
5. pages/search.html 재작성 (feat 브랜치 본진 + 인디고)
6. pages/scripts.html 재작성
7. pages/quick.html 재작성
8. pages/myspace.html 재작성
9. pages/team-management.html 재작성
10. 알림 시스템 인디고 적용 (feat 브랜치 cherry-pick)

[월요일 저녁]
11. Netlify staging 검증
12. main merge → 라이브 전환
13. [[feedback_no_version_terms]] 발효 (D-day 직후)
```

---

**END OF SPEC v2**

> 본 v2 spec = 단계 ② 결과. 단계 ③ D-day 작업지시서 박을 자리에서 본 spec 통째 참조.
