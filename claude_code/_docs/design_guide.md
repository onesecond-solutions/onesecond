# 원세컨드 디자인 가이드

> Claude Code·Claude AI가 UI 작업 시 참조하는 **불변 디자인 규칙**
> tokens.css 변수만 사용. 하드코딩 금지.

**최종 수정:** 2026-04-20

---

## 1. 절대 원칙 (위반 시 작업 반려)

1. **프레임 구조(A1/A2/B/C/D) 절대 변경 금지**
2. **tokens.css custom property만 사용** — 하드코딩 색상·radius 금지
3. **최소 `--radius-sm` (8px) 이상** — 직각·2px 금지
4. **폰트는 em 단위** — px 고정 금지
5. **E영역 콘텐츠 파일만 수정** — app.html, app.js는 명시 요청 없이 건드리지 않음

---

## 2. 앱 프레임 구조

```
┌─────────────────────────────────────┐
│  A1  │  A2  (상단 헤더 영역)        │
├──────┴──────────────────────────────┤
│      │                              │
│  B   │          D                   │
│      │     (콘텐츠 영역)            │
│(사이드│     - 배너 슬롯              │
│ 바)   │     - pages/*.html 로드     │
│      │                              │
├──────┴──────────────────────────────┤
│  C  (하단 푸터)                     │
└─────────────────────────────────────┘
```

- A1: 좌측 상단 (로고·실시간·어드민)
- A2: 우측 상단 (인사말·유저정보)
- B: 사이드바 (메뉴)
- C: 하단 푸터
- D: 메인 콘텐츠 (page-banner-slot + fetch 로드)

---

## 3. 색상 팔레트

### 브랜드 색상
| 변수 | 값 | 용도 |
|---|---|---|
| `--color-brand` | `#A0522D` | 주색 (웜 테라코타 브라운) |
| `--color-brand-light` | `#C4733A` | hover·강조 |
| `--color-accent` | `#D4845A` | 포인트 (탭 언더라인·뱃지) |

### 배경·표면
| 변수 | 값 | 용도 |
|---|---|---|
| `--color-bg` | `#FAF8F5` | 전체 배경 (크림 아이보리) |
| `--color-surface` | `#FFFFFF` | 카드·모달 |
| `--color-surface-2` | `#F3EFE9` | 사이드바·입력창 |
| `--color-border` | `#E4DBCE` | 구분선 |

### 텍스트
| 변수 | 값 | 용도 |
|---|---|---|
| `--color-text-primary` | `#3D2C1E` | 주요 텍스트 |
| `--color-text-secondary` | `#7A5C44` | 보조 텍스트 |
| `--color-text-tertiary` | `#B89880` | 비활성·힌트 |

### 헤더 그라데이션
```css
background: linear-gradient(135deg, #A0522D 0%, #C4733A 100%);
```
> 기존 `#3d2b1f → #6b4226` 진한 다크브라운에서 밝은 웜 브라운으로 전환. 전체 밝은 톤 일관성 유지.

### 함께해요 섹션 (v1.1 신규)
| 변수 | 값 | 용도 |
|---|---|---|
| `--together-bg` | `#F9E4D5` | 배경 (밝은 피치) |
| `--together-accent` | `#c8753a` | 주황 강조 |

---

## 4. 폰트

### 패밀리
```css
--font-sans: "DM Sans", "Pretendard", "Noto Sans KR", sans-serif;
--font-mono: "JetBrains Mono", monospace;
```

### CDN 로드 방법
```html
<!-- DM Sans (Google Fonts) -->
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<!-- JetBrains Mono (Google Fonts) -->
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
<!-- Pretendard (jsdelivr — 기존 유지) -->
<link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" rel="stylesheet">
```

### 크기 (19px 기준)
| 용도 | em | 실제 px |
|---|---|---|
| 페이지 타이틀 (H1) | 1.263em | 24px |
| 섹션 타이틀 (H2) | 1.000em | 19px |
| 탭버튼 | 0.895em | 17px |
| 본문 | 0.842em | 16px |
| 라벨 | 0.790em | 15px |
| 작은 설명 | 0.632em | 12px |

### 폰트 크기 전역 제어
- `font-scale.js` + `_fontSizeMap` (app.html)
- 소(18px) / 중(19px, 기본) / 대(20px)
- 소/중/대 전환 시 D영역 `content-area`에 직접 px 주입

---

## 5. Border-radius

| 변수 | 값 | 용도 |
|---|---|---|
| `--radius-xs` | 6px | 뱃지·태그 |
| `--radius-sm` | 8px | 버튼·입력창 (최소 기준) |
| `--radius-md` | 12px | 카드·패널 |
| `--radius-lg` | 16px | 모달·시트 |
| `--radius-xl` | 20px | 사이드바·컨테이너 |
| `--radius-full` | 9999px | 토글·원형 |

**절대 금지:** `border-radius: 0`, `2px`, `4px` — 최소 `--radius-sm` 사용

---

## 6. 여백 (Spacing)

| 변수 | 값 |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |

---

## 7. 탭 스타일

### 언더라인 방식 (기본)
- 1차 탭: 3px 두께 언더라인
- 2차 탭: 2px 두께 언더라인
- 색상: `#c8753a` (주황)

### 탭바 공통 스타일
```css
.tabbar {
  border-top: 1px solid rgba(200, 117, 58, 0.15);
  padding-top: 4px;
}
.tab-btn {
  flex: 1 1 0;       /* flex-basis 0 필수 */
  padding: 13px;
}
.tab-label {
  white-space: normal;
  min-width: 0;
  word-break: keep-all;
  line-height: 1.25;
}
```

### 탭 반응형 (scripts.html 기준)
- 1400px 이하: 라벨 0.72em / 아이콘 1.1em
- 1200px 이하: 라벨 0.65em / 아이콘 1.0em
- 900px 이하: 탭바 숨김 → 모바일 UI 표시

### 탭 라벨 줄임말 (scripts.html)
- "필요성 강조 1" → 필요성①
- "필요성 강조 2" → 필요성②
- "상황 확인" → 상황확인
- "보장 분석" → 보장분석
- "상품 설명" → 상품설명
- "반론 대응" → 반론대응
- "2차 클로징" → 2차클로징

---

## 8. 페이지 배너 슬롯

D영역 최상단 표준 패턴. 다른 UI 구조 만들지 말 것.

```html
<div id="page-banner-slot"></div>
<!-- 페이지 실제 콘텐츠 -->
```

**작동 방식:**
```javascript
async function injectPageBanner(menuKey) {
  var slot = document.getElementById('page-banner-slot');
  if (!slot) return;
  var cacheKey = 'banner_img_' + menuKey;
  // app_settings에서 URL 조회 → 있으면 <img> 주입, 없으면 display:none
}
```

---

## 9. 코드 구조 규칙

### child page 구조
```javascript
// 각 page는 IIFE로 래핑되어 실행됨
// 따라서 모든 함수는 window 등록 필수

(function() {
  function myLocalFn() { ... }
  
  window.externalFn = function() { ... };  // ← 외부 호출은 window 등록
  
  window.addEventListener('appstate:ready', init);
})();
```

### 금지사항
- ❌ `<script defer>` — 동작 안 함
- ❌ `localStorage`, `sessionStorage` — 아티팩트 환경 X, 일반 코드 OK
- ❌ 전역 변수 오염 (window 직접 등록 외)

### 표준 부트 패턴
```javascript
window.addEventListener('appstate:ready', function() {
  // 페이지 초기화 로직
});
```

---

## 10. 컴포넌트 체크리스트

### 버튼
- [ ] `--radius-sm` 이상
- [ ] hover 상태 정의
- [ ] disabled 상태 정의
- [ ] 폰트 em 단위

### 카드
- [ ] `--radius-md` 이상
- [ ] `--color-surface` 배경
- [ ] `--color-border` 테두리

### 입력창
- [ ] `--radius-sm` 이상
- [ ] focus 상태 (브랜드 색 테두리)
- [ ] placeholder `--color-text-tertiary`

### 모달·오버레이
- [ ] `--radius-lg` 이상
- [ ] 배경 오버레이 `rgba(0,0,0,0.5)`
- [ ] 닫기 버튼 (`.close-btn` 재사용)

---

## 11. 모바일 반응형

### 브레이크포인트
- Desktop: 1000px 이상
- Tablet: 768px ~ 1000px
- Mobile: 767px 이하
- Small mobile: 380px 이하 (갤럭시 기본형)

### 모바일 규칙
- 탭바 숨김 → 전용 모바일 UI
- 2열 그리드 → 380px 이하는 1열 강제
- A1 헤더 압축 (padding·폰트 축소)
- `min-width: 0` + `overflow: hidden` (그리드 overflow 방지)

---

## 12. 작업 시 체크리스트

Claude Code·Claude AI는 UI 작업 전 반드시 확인:

- [ ] tokens.css 변수 사용하는가? (하드코딩 X)
- [ ] border-radius 최소 `--radius-sm` 인가?
- [ ] 폰트 크기가 em인가?
- [ ] A1/A2/B/C/D 프레임 건드리지 않았는가?
- [ ] child page의 모든 함수가 window 등록되었는가?
- [ ] `defer` 속성 안 썼는가?
- [ ] 모바일 반응형 고려했는가?
- [ ] page-banner-slot 유지했는가?

모두 체크 후 작업 진행.

---

## 13. 특이 케이스 메모

### quick.html
IIFE 래핑 예외. 전역 함수 직접 선언 가능.

### scripts.html
- 10개 탭 균등 분할
- 4열 동적 확장 그리드 (STEP 1·2·3)
- 열별 폰트 점진 확대
- 탭바 줄바꿈 허용

### 함께해요 (together.html)
- 주황 그라디언트 + NEW 배지
- 공감 오버레이 (`.together-intro-overlay`)
- 5번째 기둥 격상 (2026-04-20)

---

## 14. 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-04-15 | 초안 확정 — 밝은 웜 브라운 계열 / DM Sans + Pretendard / 라운드 우선 정책 |
| 2026-04-20 | v1.1 — 함께해요 토큰 추가, 탭 스타일·페이지 배너 슬롯 규정, 코드 구조 규칙(IIFE·window 등록) 명문화, 컴포넌트 체크리스트 추가 |
| 2026-04-23 | origin 이력 흡수 — CDN 로드 예시, 헤더 그라데이션 마이그레이션 노트, 변경 이력 섹션 신설 |
