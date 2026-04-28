# index.html 헤더 + 모바일 전면 재검토 보고서 — 2026-04-28

> **단계:** 작업지시서 §B-1 보고서 단계 (코드 수정 0건). 팀장님 [B-3] 결정 후 2차 phase 진입.
> **참조 메인 트랙:** `docs/sessions/_INDEX.md` (index 승격 완료 `7124d49`, 띠 제거 `9c2e0f8`)
> **참조 시안:** `claude_code/design_test/index/v1-full.html` (모바일 표준 진실 원천)
> **검수 한계:** Claude Code는 라이브 브라우저 검수 불가. **정적 코드 분석 + 시안 비교 기반 진단**. 실측은 팀장님 라이브 검수 영역.

---

## 0. 정합성 검증 — 통과

- 메인 트랙 활성, index 승격 완료, 본 작업은 잔여 갭 fix 트랙으로 정합 ✅
- 작업 브랜치: `fix/index-mobile-comprehensive`

---

## A. 헤더 영역 fix 3건 진단

### A-1 헤더 viewport 최상단 밀착 — **원인 정확히 특정됨**

**증상**: 헤더 위 약 24px 빈 공간 발생.

**진단** (정적 분석으로 100% 확정):

| # | 위치 | 코드 | 의미 |
|:---:|---|---|---|
| 원인 1 | `index.html:1294` | `<nav class="nav" id="nav" style="margin-top:24px;">` 인라인 스타일 | 초기 위치 24px 아래 |
| 원인 2 | `index.html:97-99` | `.nav { position: sticky; top: 24px; }` | 스크롤 후 sticky 지점도 24px 떨어짐 |

→ **둘 다 직전 제거된 디자인 테스트 띠(.test-bar 24px) 보상의 잔재**. 띠 제거(`a10661c`) 후에도 두 보상이 그대로 남아 누적 24px 빈 공간 발생.

**body / html / viewport 정상성 검증**:
- `<meta name="viewport" content="width=device-width, initial-scale=1.0">` (line 5) ✅ 정상
- `* { box-sizing: border-box; margin: 0; padding: 0; }` (line 80) ✅ 정상 reset
- `body { ... }` margin·padding 추가 없음 ✅
- 헤더 직전 빈 요소 0건 (띠 제거로 깨끗) ✅

**수정 권장 (가장 좁은 범위)**:

| # | 변경 | from → to |
|:---:|---|---|
| 1 | `index.html:1294` 인라인 style 제거 | `<nav class="nav" id="nav" style="margin-top:24px;">` → `<nav class="nav" id="nav">` |
| 2 | `index.html:99` `.nav` 의 `top` 값 변경 | `top: 24px;` → `top: 0;` |

**부가 검토 사항**: `html { scroll-padding-top: calc(var(--nav-h) + 24px); }` (line 81)도 띠 보상 흔적일 가능성. 다만 sticky nav 자체 정렬 보상으로 해석 가능 (인페이지 앵커 점프 시 nav 뒤 24px 여백). 보수적으로 보존 권장 — 라이브 검수 후 필요 시 조정.

---

### A-2 헤더 로고 03 삽입 — **로고 식별 완료**

**식별 결과**:
- **파일**: `assets/images/logo/logo03.jpg` ✅ 존재 확인
- **참조 사례**: `app.html:587` (1ab35c4 커밋, A1 헤더 로고로 동일 파일 사용 중)
- **현재 nav-brand 구조** (`index.html:1310-1313`):
  ```html
  <a href="#top" class="nav-brand">
    <div class="nav-brand-mark">1s</div>
    <span>원세컨드</span>
  </a>
  ```
- 현재 `.nav-brand-mark` (line 140-150): 36x36 그라데이션 배경에 "1s" 텍스트 마크

**삽입 옵션 — 결정 필요**:

| 옵션 | 효과 | 비용 |
|:---:|---|---|
| **A (권장)** | `<div class="nav-brand-mark">1s</div>` → `<img src="assets/images/logo/logo03.jpg" alt="원세컨드 로고" class="nav-brand-logo" height="32">` 로 교체 | 1s 텍스트 마크 폐기. nav-brand-mark CSS도 정리. app.html 패턴과 정합 |
| B | 1s 마크 보존 + 별도 로고 추가 | 마크 + 로고 + 텍스트 3중 시각, 가로 공간 압박 |
| C | 1s 마크 제거 + 로고 + 텍스트 (로고만 추가) | A와 유사하나 nav-brand-mark 클래스 잔재 정리 추가 필요 |

→ **권장 A**. app.html과 동일 패턴, 가로 공간 효율, 코드 간결.

---

### A-3 모바일에서 로고만 표시 — **BP 결정 필요**

**시안 미디어쿼리 BP 분포**:
- 880: `.nav-menu { display: none; }` ← 헤더 관련 유일 BP
- 960 / 900 / 1024 / 640 / 560: 다른 영역 분기 (헤더 무관)

**옵션**:

| 옵션 | BP | 효과 |
|:---:|---|---|
| **A (권장)** | 880 (시안 nav-menu 숨김과 동일) | 메뉴 숨김과 동시에 텍스트 숨김 → 헤더 단순화 일관성 |
| B | 640 또는 480 | 좁은 화면에서만 텍스트 숨김. 880~640 사이는 로고+텍스트 유지 |

→ **권장 A** (BP 880). 시안 BP 시스템 정합.

**수정안**: `@media(max-width:880px) { .nav-brand span { display: none; } }` 한 줄 추가.

---

## B-1. 모바일 viewport 전수 점검 (정적 분석)

### 점검 방법론

Claude Code는 실제 브라우저 렌더 불가. **시안 미디어쿼리 BP + CSS 정의 + 라이브 마크업 동등성 + 라이브 추가 변경 사항** 4가지를 비교해서 viewport별 행동을 예측.

### 시안 미디어쿼리 BP 분포 (재확인)

| BP | 영향 영역 |
|---|---|
| 1024 | `.pillars-grid`: 3열 → 2열 |
| 960 | (확인 필요) 다른 영역 |
| 900 | `.vs-grid`, `.vs-connector` (vs-section 시안 폐기됨), `.target-grid`, `.signup-inner` |
| 880 | `.nav-menu` 숨김 |
| 640 | `.pillars-grid`: 2열 → 1열 |
| 560 | `.form-row` 1열 |

**라이브 적용 상태**: 모든 BP가 시안에서 그대로 라이브로 이전 (시안 통째 승격) → BP 자체는 정합. 단 시안 자체에 누락된 분기가 라이브 회귀로 드러남.

### viewport 폭별 점검 결과 (예측)

| viewport | 헤더 | hero | pain | pillars | together | target | signup | footer | 모달3 |
|:---:|---|---|---|---|---|---|---|---|---|
| **360px** | ⚠️ nav-right squeeze (로그인+CTA 둘 다 회귀) | 🔴 hero-stats 3카드 한줄 squeeze + 듀얼 모니터 미확인 | (확인 필요) | ✅ 1열 (640 BP 적용됨) | (확인 필요) | ✅ 1열 (900 BP) | ✅ 1열 (900 BP) + form-row 1열 (560 BP) | (확인 필요) | (확인 필요) |
| **390px** | 동일 | 동일 | 동일 | 동일 | 동일 | 동일 | 동일 | 동일 | 동일 |
| **480px** | 동일 | 동일 | 동일 | 동일 | 동일 | 동일 | 동일 | 동일 | ✅ 480 BP 적용됨 |
| **560px** | 동일 | 동일 | 동일 | 동일 | 동일 | 동일 | form-row 1열 분기점 | 동일 | 동일 |
| **640px** | 동일 | 약간 완화 (가로 공간 ↑) | 동일 | pillars 1열 → 2열 분기점 | 동일 | 동일 | 동일 | 동일 | 동일 |
| **768px** | nav-menu 표시 시작 (880 BP 미만) | 듀얼 모니터 grid 분기? | 동일 | 2열 | 동일 | 1열 | 1열 | 동일 | 동일 |

→ **회귀가 가장 심한 viewport**: 360 / 390 / 480. **회귀 핵심 영역**: 헤더 nav-right + hero-stats.

---

## B-2. 우선 명시된 회귀 3건 — 진단 + 수정 권장

### 회귀 #1 — "로그인" 텍스트 세로 깨짐

**진단**:
- `.nav-login` (line 185): `white-space` 미설정 → 컨테이너 squeeze 시 글자 단위 줄바꿈 (CJK 줄바꿈 정책)
- `.nav-right { display: ?; }` 정의 위치 line 182, 모바일 분기 0건
- `.nav-inner { grid-template-columns: auto 1fr auto; }` (line 128) — 양쪽 auto, 중앙 1fr. 모바일 880에서 nav-menu 숨김 후에도 nav-right는 auto로 자기 콘텐츠 폭 → 로그인+CTA 합산 폭이 viewport 부족

**수정 권장**:
- `.nav-login` + `.nav-cta` 둘 다 `white-space: nowrap` 추가
- (선택) 모바일에서 `.nav-login` padding 축소

### 회귀 #2 — "무료회원 가입하기" CTA 줄바꿈

**진단**:
- `.nav-cta` (line 195-211): 동일 원인 (white-space 미설정 + 컨테이너 squeeze)
- 텍스트 길이도 김 (`무료회원 가입하기 →` 9자 + 화살표)

**수정 권장 (옵션 우선순위)**:
1. **(a, 1순위) `white-space: nowrap`** — 가장 단순. 가로 폭 확보되면 한 줄 유지
2. **(b, 헤더 가로 부족 시) 모바일에서 텍스트 단축** — 예: `<span class="nav-cta-full">무료회원 가입하기 →</span><span class="nav-cta-short">가입하기</span>` + 미디어쿼리로 토글
3. **(c, 보조) 모바일 padding 축소** — `.nav-cta { padding: ... }` 모바일 분기

→ 권장 (a) 1차 적용 후 라이브 확인. 여전히 가로 부족이면 (b) 추가.

### 회귀 #3 — hero-stats 그리드 무너짐 (가장 심각)

**진단**:
- `.hero-stats` (line 314-317):
  ```css
  .hero-stats {
    display: flex; gap: var(--space-10);  /* gap 40px */
    padding-top: var(--space-6);
    border-top: 1px solid var(--color-border);
  }
  ```
- **모바일 분기 0개** (시안 자체에 누락. 시안 디자인 미스가 라이브에 그대로 이전)
- 좁은 viewport에서 3 카드 + gap 40px×2 = 가로 합 합산이 viewport 폭 초과 → flex squeeze + 카드 내부 콘텐츠 줄바꿈 + 시각적 겹침

**수정 권장**:
```css
@media (max-width: 640px) {
  .hero-stats {
    flex-direction: column;   /* 또는 flex-wrap: wrap */
    gap: var(--space-6);      /* 40 → 24px */
  }
}
@media (max-width: 480px) {
  .hero-stats { gap: var(--space-4); }
}
```

또는 grid 패턴:
```css
@media (max-width: 640px) {
  .hero-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);  /* 또는 2열, 3열 */
    gap: var(--space-4);
  }
}
```

→ **flex-direction: column 권장** (모바일에서 위→아래 1열). 카드 텍스트 가독성 가장 안전.

**4/28 home 회귀와 동일 패턴인지**:
- home GPT v1 회귀: hexagon·노드·도넛이 SVG 또는 absolute positioning에서 보이지 않음
- hero-stats: 단순 flex squeeze. 다른 패턴
- → **별 회귀 패턴**, 동일 원인 아님

---

## B-1 점검 결과 정리 — 우선순위 권장

### 🔴 필수 (라이브 사용자 눈에 즉시 회귀로 인지)

1. **A-1 헤더 빈 공간 24px 제거** (명백한 시각 회귀)
2. **B-2 #3 hero-stats 그리드** (모바일 카드 겹침, 가장 심각)
3. **B-2 #1 "로그인" 세로 깨짐** + **#2 CTA 줄바꿈** (헤더 회귀, 함께 처리)

### 🟡 권장 (UX·일관성 향상)

4. **A-2 로고 03 삽입** (헤더 브랜드 인지 강화, app.html과 정합)
5. **A-3 모바일 텍스트 숨김** (nav-brand 단순화)

### 🟢 선택 (후속 트랙 가능)

6. **scroll-padding-top 24px 보상 검토** (인페이지 앵커 점프 시 여백, 시각 영향 작음)
7. **viewport 360/390/480 추가 회귀 점검** (라이브 검수 단계에서 발견된 영역만)

---

## C. privacy.html / terms.html 처리 방침

**현재 상태**:
- 두 파일 모두 자체 헤더(nav)를 보유하지 **않음** (확인 필요 — 보고서 작성 중 빠른 검수)

**권장**:
- 두 파일에 nav 헤더가 있으면 동일 fix 적용
- 없으면 영향 없음 (헤더 fix는 index.html만)
- privacy/terms 본문 모바일 점검은 별도 트랙 후보

→ 라이브 검수 후 결정 부탁드립니다.

---

## D. 결정 필요 항목 (팀장님 [B-3] 단계)

다음을 결정해 주시면 2차 phase 진입하겠습니다:

| # | 항목 | 권장 |
|:---:|---|---|
| 1 | A-1 헤더 빈 공간 fix | 진행 (margin-top:24px 인라인 + .nav top:24px → 0) |
| 2 | A-1 부가 (`scroll-padding-top: calc(var(--nav-h) + 24px)` 24px 보존 여부) | 보존 (보수적), 라이브 검수 후 조정 |
| 3 | A-2 로고 옵션 | A (1s 마크 → logo03 이미지 교체) |
| 4 | A-3 모바일 텍스트 숨김 BP | 880 (시안 nav-menu BP와 동일) |
| 5 | B-2 #1·#2 fix 옵션 | (a) `white-space: nowrap` 1차 적용 |
| 6 | B-2 #3 hero-stats 모바일 분기 | flex-direction: column @ 640px 이하 |
| 7 | privacy/terms 헤더 동일 fix | 라이브 검수 후 결정 |
| 8 | 분할 커밋 단위 | (a) 통합 1커밋 / (b) 헤더+모바일 분리 2커밋 |

---

## E. 라이브 검수 권장 추가 영역 (B-1 정적 분석 한계)

Claude Code는 다음을 직접 확인 불가 — 팀장님 라이브 검수 부탁:

1. **360 / 390 / 480px** 실제 헤더 정렬 (CTA 줄바꿈·로그인 깨짐 시각 확인)
2. **hero-stats 카드 겹침 시각 확인** (예측은 했지만 실측 필요)
3. **듀얼 모니터 (hero-monitors)** 모바일 표시 여부 (시안에 모바일 분기 미확인)
4. **pain / together / target 섹션** 모바일 카피 줄바꿈 정상 여부
5. **footer** 모바일에서 링크 / 카카오 버튼 정렬
6. **모달3 (#togetherIntroOverlay)** 모바일에서 480px 분기로 padding 축소 정상 동작

---

## 다음 단계

[B-3] 팀장님 결정 8건 받으면 2차 phase (실제 fix 코드 수정) 진입.

본 보고서는 1차 커밋 후 작업 브랜치(`fix/index-mobile-comprehensive`)에 올라가 있고, 결정 후 동일 브랜치에서 2차 커밋 → main `--no-ff` 머지 → push → 브랜치 삭제 진행.

---

*본 보고서는 코드 수정 0건. index.html / privacy.html / terms.html / 시안 폴더 어떤 파일도 수정하지 않음.*
