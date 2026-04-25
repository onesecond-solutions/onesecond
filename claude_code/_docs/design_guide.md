# 원세컨드 디자인 가이드

> Claude Code·Claude AI가 UI 작업 시 참조하는 **불변 디자인 규칙**
> tokens.css 변수만 사용. 하드코딩 금지.

**최종 수정:** 2026-04-20

---

## 1. 절대 원칙 (위반 시 작업 반려)

1. **프레임 구조 §2 (라이브) 또는 §15 (v2 시안) 준수** — 명시적 결정 없이 임의 변경 금지
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

> **2026-04-25 갱신:** v2 시안에서는 A1+A2가 통합된 슬림 topbar로 진화함. 자세한 사양은 §15 참조. 라이브 승격 전까지는 본 §2 frame이 운영 표준.

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
| 2026-04-25 | v2 디자인 시스템 결정 박제 — A1+A2 통합 슬림 topbar, 사이드바 180px, 화이트+blur 글래스모피즘, 확장 토큰 시스템 (§15 신설). 라이브 승격은 4/30·5/9~10 단계적 |
| 2026-04-25 (재고) | A1 톤 결정 재고 — home topbar **사스브라운 항시 적용**으로 변경 (이전 "화이트+blur" 폐기). 라벨 헷갈림으로 의도 반대로 박제됐던 부분 정정. §15.2 갱신, `home/v2-full.html` 반영 |

---

## 15. v2 디자인 시스템 (2026-04-25 결정)

> **결정 배경:** 디자인 회의에서 v2-full.html 정식 채택. 기존 라이브 frame과는 다른 새 표준이며, 단계적으로 라이브 승격 진행.
>
> **정식 시안 파일:** `claude_code/design_test/home/v2-full.html`
> **5/6 베타 재출시:** v2-full 기반 4페이지 + 랜딩이 라이브로 나감
> **라이브 승격 일정:** 4/30(목) home·news·about·pricing → 5/9~10 나머지 앱 페이지

### 15.1 프레임 구조 진화 (§2 갱신)

기존 A1·A2 분리 → **A1+A2 통합 슬림 topbar**로 진화.

```
┌──────────────────────────────────────────┐
│  topbar (A1+A2 통합 슬림 헤더, sticky)    │
├──────┬───────────────────────┬───────────┤
│      │                       │           │
│  B   │          D            │     C     │
│180px │   (콘텐츠 영역)        │  (우측바)  │
│      │                       │           │
└──────┴───────────────────────┴───────────┘
                  푸터
```

### 15.2 topbar 핵심 스펙

| 속성 | 값 |
|---|---|
| `background` | `var(--gradient-brand)` (사스브라운 그라데이션 #A0522D → #D4845A) |
| `color` | `#fff` (자식 텍스트 기본 흰색 상속) |
| `border-bottom` | (없음 — 그라데이션 자체로 영역 구분) |
| `position` | `sticky; top: 0; z-index: var(--z-sticky)` |

→ A1 사스브라운 항시 적용. 라이브 `app.html` 브랜드 톤과 정합 (이전 결정 "화이트 + blur" 폐기, 2026-04-25 재고).

**자식 요소 색상 매핑 (사스브라운 배경 기준):**
- `.tb-brand` 텍스트: `#fff`
- `.tb-brand .accent`: `var(--accent-200)` (밝은 살구톤, 가시성 확보)
- `.tb-search` 컨테이너: `rgba(255,255,255,0.14)` 반투명 + 1px 화이트 18% 윤곽
- `.tb-search input` 텍스트: `#fff`, placeholder `rgba(255,255,255,0.55)`
- `.tb-search` 포커스 시: `rgba(255,255,255,0.96)` 거의 화이트 + accent-200 보더 + 자식 텍스트 다크로 자동 반전
- `.tb-status` / `.tb-alert` / `.tb-user`: 색칠된 알약 (각각 success / danger / 화이트 톤) — 사스브라운 배경 위에서도 가시성 충분, 그대로 유지
- `.tb-user` 텍스트만 명시적 `var(--color-text-primary)` (부모 흰색 상속 차단 — 흰색 배경 위 흰색 글자 방지)

### 15.3 확장 토큰 시스템

§3 기본 팔레트 위에 단계 팔레트가 추가됨:

- `--brand-50` ~ `--brand-900` (10단계)
- `--accent-50` ~ `--accent-600` (7단계)
- 그라데이션: `--gradient-brand`, `--gradient-brand-soft`, `--gradient-sunset`
- 엘레베이션: `--elevation-warm-1/2/3` (웜 톤 그림자)
- 레이아웃: `--header-h`, `--sidebar-width: 180px`, `--rightbar-width`

→ 정확한 값은 `claude_code/design_test/home/v2-full.html` `:root` 참조.
→ tokens.css 정식 이식은 4/30 작업 예정.

### 15.4 미해결 항목

- A2 영역 기능 이주 매핑 (인사말·유저정보·폰트 ctrl·카카오·어드민 진입) — 4/30 작업 시작 전 확정
- v2-full.html `:root` 인라인 오버라이드 → tokens.css 흡수 — 4/30
- v1·v1-full archive 처리 — 별도 진행
- §3 색상 팔레트, §6 여백, §10 컴포넌트 체크리스트 등 v2 기준으로 갱신 — 4/30 작업 중 점진적

### 15.5 적용 범위 — 진행 단계

| 페이지 | 시점 | 상태 |
|---|---|---|
| 인덱스 (랜딩) | 진행 중 | 시안 완료(`design_test/index/v1-full.html`), 라이브 승격 대기 |
| home·news·about·pricing | 4/30 작업일 | v2-full chrome 적용 + 라이브 승격 |
| scripts·board·myspace·quick·together·admin | 5/9~10 | chrome 적용 + 라이브 승격 |

→ 위 일정 외 페이지는 **§2 라이브 frame** 기준 우선.
