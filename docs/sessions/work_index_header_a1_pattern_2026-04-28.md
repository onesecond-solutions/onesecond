# index.html 헤더 A1 패턴 이식 분석 보고서 — 2026-04-28

> **단계:** 작업지시서 §1 보고서 단계 (코드 수정 0건). 팀장님 §2 결정 후 2차 phase 진입.
> **목적:** app.html A1 헤더 라이트 톤 패턴(`fd8b264`, `1ab35c4`)을 index/privacy/terms 헤더에 이식하는 사전 분석.
> **메모리 정합:** "브라운 면적 40%→20% 축소" 디자인 개편 원칙 적용 단계.

---

## 0. 정합성 검증 — 통과
- 메인 트랙 활성, index 승격 후 fix 트랙 정합 ✅
- 메모리 디자인 개편 원칙 정합 ✅
- 작업 브랜치: `feat/index-header-a1-pattern`

---

## 1. app.html A1 헤더 스타일 추출 (4/28 라이트 톤 결과)

| 항목 | A1 값 | 출처 |
|---|---|---|
| **배경** | `#FFFFFF` (순백, 불투명) | `app.html:32` |
| **하단 라인** | `border-bottom: 1px solid color-mix(in srgb, var(--color-brand) 40%, transparent)` | `app.html:34` |
| **텍스트 색 (기본)** | `var(--color-text-primary)` (#1F2937 차콜) | `app.html:33` |
| **로고 파일** | `assets/images/logo/logo03.jpg` (JPG, height 32px) | `app.html:587` |
| **로고 CSS** | `.brand-logo { height: 32px; width: auto; display: block; flex-shrink: 0; }` | `app.html:52` |
| **텍스트 마크** | `.brand-text` 1.5em / fw-bold / `var(--color-brand)` (#A0522D 브라운) | `app.html:54-58` |
| **우측 칩** | transparent + hover 시 `var(--color-surface-2)` | `app.html:62-67` |
| **sticky scrolled 변형** | **없음** — 항상 라이트 톤 유지 (grep 결과 0건) | — |
| **모바일 BP** | `767px` — 로고만 표시 (텍스트 숨김), 우측 칩·알림 숨김, 아바타 압축 | `app.html:526-` |
| **그림자** | scrolled 시 `box-shadow: 0 2px 8px rgba(0,0,0,0.04)` (현재 .scrolled 미사용) | (해당 영역 없음) |

→ **A1의 본질**: 항상 라이트 톤 + 브라운 40% 라인 + 그림자 0. 스크롤 톤 변환 없음.

---

## 2. index.html 현재 헤더 추출

| 항목 | 현재 값 | 출처 |
|---|---|---|
| **배경** | `rgba(255,255,255,0.82)` 반투명 + `backdrop-filter: blur(20px) saturate(180%)` | `index.html:102-104` |
| **하단 라인** | `1px solid rgba(229,231,235,0.6)` 라이트 그레이 알파 | `index.html:105` |
| **텍스트 색 (기본)** | `.nav-item { color: var(--color-text-secondary); }` `.nav-brand { color: var(--color-text-primary); }` | `index.html:172-` |
| **로고 파일** | `assets/images/logo/logo05.png` (PNG 투명본, height 32px) | `index.html:1299` |
| **로고 CSS** | `.nav-brand-logo { height: 32px; width: auto; display: block; flex-shrink: 0; }` | `index.html:140` |
| **텍스트 마크** | `<span>원세컨드</span>` 1.25em / fw 900 / `var(--color-text-primary)` 차콜 | `index.html:132-138` |
| **우측 영역** | `.nav-login` (transparent + hover) + `.nav-cta` (브라운 그라데이션 채움 CTA) | `index.html:177-203` |
| **sticky scrolled 변형** | ⚠️ **있음 — 풀 브라운 변환** (`background: var(--brand-700) #66331A` + 텍스트 흰색 8건) | `index.html:111-122` |
| **모바일 BP** | `880px` — `.nav-menu`, `.nav-brand span` 숨김 | `index.html:213-216` |

---

## 3. 핵심 차이 5건

### 3-1. ⚠️ sticky scrolled 동작이 가장 큰 차이 (메모리 정합 핵심)

- **A1**: scrolled 변형 자체 없음 → 항상 라이트 톤
- **index 현재**: `.nav.scrolled { background: var(--brand-700) }` + 텍스트 흰색 변환 8건
- 메모리 "브라운 면적 40%→20% 축소" 정합하려면 → **`.nav.scrolled` 블록 통째 폐기 또는 라이트 변형**

### 3-2. 배경 투명도

- **A1**: 순백 불투명 `#FFFFFF`
- **index**: 반투명 0.82 + backdrop-filter blur
- 의도된 시안 효과 vs A1 정합 트레이드오프

### 3-3. 하단 라인 색상

- **A1**: 브라운 40% 알파 (액센트 효과)
- **index**: 라이트 그레이 알파 (중성)
- A1 패턴 가져오면 라이트 배경에 브라운 라인 액센트 → 메모리 "라인만 남김" 의도와 정합

### 3-4. 로고 파일 — 직전 회귀 근본 원인

- **A1**: `logo03.jpg` (JPG, 라이트 배경에서 검증)
- **index**: `logo05.png` (PNG 투명본, **직전 라이브 미표시 회귀** — 사용자 화면 캡처에서 확인)
- → A1 동일로 통일하면 회귀 근본 해결 + 일관성

### 3-5. 모바일 BP

- **A1**: 767px (셸 표준)
- **index**: 880px (nav-menu 인페이지 앵커 5개 숨김 위치)
- 인페이지 앵커가 가로 공간 차지 → 880이 자연스러움
- 강제 통일 시 880~767 구간에서 nav-menu 노출로 회귀 가능 → **현재 880 보존 권장**

---

## 4. 이식 가능성 평가

**그대로 복사**: ❌ 불가능
- A1: `.a1` grid (1fr / 검색창 420 / 1fr) + 칩 4개 (실시간·전산장애·알림·아바타)
- index: `.nav-inner` grid (auto/1fr/auto) + nav-menu 인페이지 앵커 5개 + 로그인·CTA
- HTML 구조 자체가 다름

**CSS 패턴만 이식**: ✅ 가능 + 권장
- A1의 색·라인·sticky 톤 패턴을 index `.nav` 클래스에 적용
- HTML 구조는 index 그대로

---

## 5. 결정 필요 항목 (팀장님 §2 단계)

다음을 결정해 주시면 2차 phase 진입:

| # | 항목 | 옵션 | 권장 |
|:---:|---|---|---|
| 1 | **배경 투명도** | (a) A1 동일 `#FFFFFF` 순백 / (b) 현재 `rgba(255,255,255,0.82)` + blur 보존 | (a) — A1 정합 |
| 2 | **하단 라인** | (a) A1 동일 `color-mix(in srgb, var(--color-brand) 40%, transparent)` / (b) 현재 라이트 그레이 보존 | (a) — 메모리 "라인만" 정합 |
| 3 | **scrolled 변형** | (a) `.nav.scrolled` 블록 통째 폐기 (A1 = 항상 라이트) / (b) 라이트 유지 + box-shadow만 추가 / (c) 현재 풀 브라운 보존 | (a) — 메모리 핵심 정합 |
| 4 | **로고 파일** | (a) `logo03.jpg` 복귀 (A1 동일) / (b) `logo05.png` 유지 / (c) 다른 파일 | (a) — 직전 회귀 근본 해결 + 일관성 |
| 5 | **모바일 BP** | (a) 현재 880 보존 (nav-menu 자연 숨김) / (b) A1 767로 통일 | (a) — 회귀 방지 |
| 6 | **CTA 처리** | (a) `.nav-cta` 브라운 그라데이션 채움 보존 (액센트) / (b) outline 형태로 변경 (브라운 면적 추가 축소) | (a) — 액센트 보존 |
| 7 | **privacy/terms 적용 범위** | (a) 동일 fix 일괄 / (b) index만 | (a) — 작업지시서 §3 결정대로 |

---

## 6. 권장 시나리오 — (1a · 2a · 3a · 4a · 5a · 6a · 7a)

**핵심 변경 4건** (index.html `.nav` 영역만):

```css
/* 변경 #1·#2: 배경 + 하단 라인 (A1 패턴 정합) */
.nav {
  background: #FFFFFF;                           /* 0.82 + blur → 순백 */
  border-bottom: 1px solid color-mix(in srgb, var(--color-brand) 40%, transparent);
  /* backdrop-filter 라인 제거 */
  /* transition은 그대로 보존 */
}

/* 변경 #3: scrolled 블록 통째 폐기 — A1과 동일 */
/* 기존 .nav.scrolled { ... } 8건 모두 삭제 */

/* 변경 #4: 로고 파일 logo05.png → logo03.jpg (A1 동일) */
/* index/privacy/terms 3 파일 src 교체 */
```

**예상 diff 규모**:
- index.html: -10줄 (.nav.scrolled 블록 8줄 + backdrop-filter 2줄), +1줄 (border-bottom 갱신), 그 외 1줄(src) → 약 10건 변경
- privacy/terms: src 교체 1건씩

---

## 7. privacy/terms 헤더 동일 fix 적용 범위

| 항목 | privacy/terms 적용 |
|---|---|
| 배경 라이트 | 이미 `rgba(255,255,255,0.92)` + blur(10) — 거의 같으나 A1 순백으로 통일 시 변경 |
| 하단 라인 | 현재 `1px solid var(--neutral-200)` → A1 브라운 40% 알파로 통일 |
| scrolled 변형 | 두 파일 모두 sticky 미사용 → 적용 대상 없음 |
| 로고 파일 | logo05.png → logo03.jpg 교체 |
| 모바일 BP | 현재 880 적용 중 → 보존 |

---

## 8. 라이브 검수 권장 5개 영역 (Claude Code 정적 분석 한계)

Claude Code는 다음 직접 확인 불가 — 팀장님 라이브 검수 영역:

1. **logo03.jpg 라이트 헤더 시각 정합** — 현재 추정만 (logo05 미표시 회귀 근본 원인 미특정 상태)
2. **순백 배경 vs 시안 의도(반투명 blur)** — 어느 쪽이 페이지 톤과 더 어울리는지
3. **브라운 40% 라인 두께** — 1px이 너무 옅거나 진한지
4. **scrolled 폐기 시 sticky 시각 신호** — 라인만으로 충분한 분리감인지 (그림자 추가 필요 여부)
5. **모바일 360/390/480px** — 변경 후에도 헤더 정렬 정상

---

## 9. 다음 단계

[2단계 결정] 팀장님 옵션 선택 7건 답변 받으면 **동일 브랜치(`feat/index-header-a1-pattern`)에서 2차 커밋** → main `--no-ff` 머지 → push → 브랜치 삭제.

본 보고서는 1차 커밋 후 작업 브랜치에 올라가 GitHub에서 직접 검토 가능.

---

*본 보고서는 코드 수정 0건. index.html / privacy.html / terms.html / app.html 어떤 파일도 수정하지 않음.*
