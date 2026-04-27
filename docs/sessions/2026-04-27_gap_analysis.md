# 디자인 시안 vs 라이브 갭 분석 — 1차분 (4 페이지)

> **생성 시각:** 2026-04-27
> **분석 도구:** Claude Code Explore subagent ×4 병렬 + main agent 통합
> **분석 기준:** `claude_code/design_test/README.md` v1 디자인 원칙 (브라운 95→5%, 여백 촘촘함 해소 — 단 home 제외)
> **글로벌 토큰 본체:** `css/tokens.css` (5592749 시점)

---

## 분석 범위

### 1차분 (본 문서)
- home (시안 v2-full.html 기준 — README 권장 최신)
- board (이미 v1 적용 — 잔여 갭만)
- admin
- myspace

### 2차분 (별도 단계 — 본 보고서 검토 후 진행)
- quick / scripts (v2) / together / news / index

---

## 1. home

### 시안 의도

프리미엄 리뉴얼: 중성 톤 배경 위에 웹 타이포·스페이싱·그라데이션·아우라 효과로 브라운을 5% 포인트(헤더·아이콘·강조 배지·툴팁·호버)로 축소. 라이브의 2026-04-24 확정 레이아웃(좌측 30px 카피 패딩, hex -160px 수직 상승) 그대로 유지하고 색상만 중성화.

### 카테고리별 갭 (요약)

**색상 (🔴 12건)**
- `--color-bg` 시안 `#FFFFFF` (v2:21) — 본체 갱신 완료. 라이브 home.html 자체는 글로벌 참조라 적용됨
- `--color-surface-2` 시안 `#FAFAF8` (v2:23) vs 본체 `#F6F7F9` — **불일치 (시안 v2의 미세 다른 값)**
- 헤더 그라데이션, elevation 톤, hero-badge 색상 등 시안의 신규 정의 미적용

**여백 (🟡 권장 — home은 README 명시 "여백 규칙 미적용" 페이지)**
- `.d-inner max-width: 1000px` (v2:399) 라이브 부재
- 좌측 30px·hex -160px 핵심 레이아웃은 **일치 (시안 의도대로 유지)**

**타이포 (🟡)**
- `.hero-title` clamp 반응형 font-size (v2:437) 라이브는 고정값
- 나머지 폰트 weight·line-height 사실상 일치

**레이아웃 (🟡)**
- `.d::before` mesh gradient 배경 오버레이 (v2:389~395) 라이브 부재
- `.hero-stats` flex 블록 (v2:480) 라이브 부재

**컴포넌트 (🟡)**
- `.hero-badge .dot` pulseDot 애니메이션 (v2:433) 라이브 미정의
- `.hex-center::before` 아우라 + auraBreathe 애니 (v2:604~614) 라이브 부재
- `.hex-center-inner` 로고 박스 + float (v2:615~634) 라이브는 이미지 직접 렌더
- nodeHoverGrad / lineGrad SVG 그라 (v2:973~978) 라이브 부재
- nodeEnter / hexReveal 출현 애니 라이브 부재, nodeBreathing은 라이브가 단순화됨

**반응형 (🟡)**
- 시안 768px / 라이브 640px 브레이크포인트 다름
- 라이브에만 태블릿(641~1024) 중간 반응형, 모바일 hex-wrap 360px·로고 88px 축소 정의

**JS (🟢 대부분)**
- NODES 데이터 필드명만 다름(구조 동일), `homeTipCtaClick` ↔ `tipCta` 함수명 차이
- escapeHTML XSS 가드는 라이브가 추가
- 시안 alert 스텁은 비교 제외

### 우선순위 집계
- 🔴 12 / 🟡 18 / 🟢 35+

---

## 2. board (잔여 갭)

### 시안 의도

색상 95→5% 중성화 + 게시글 카드를 박스형 → 시안 리스트형(`.brd-*`) 변환 + 탭바 active 톤 액센트화. **이미 라이브 적용 완료** (커밋 `ebb9b3b` board v1 overhaul, `5592749` shell v1 — `.pg-outer` 스코프 오버라이드 제거 + `.pg-bottom-bar` 그레이톤).

### 잔여 갭

**색상 (🔴 2건)**
- `.pg-content-block` 라이브 fallback `var(--color-bg, #FAF8F5)` (board.html:122) — fallback 표기가 구버전 브라운. 시안은 `transparent` (시안:147). 글로벌 토큰 갱신으로 실효 렌더는 동일하지만 코드 정합성상 정리 권장
- `.pg-content-block` border fallback `var(--color-border, #E4DBCE)` (board.html:121) — 동일 사유

**레이아웃 (🔴 1건)**
- `.pg-content-block overflow: visible` (라이브:119) vs `overflow: hidden` (시안:147) — 시안 의도와 다른 동작. 콘텐츠 넘침 노출 가능

**여백 (🟡 1건)**
- `.pg-outer padding-bottom: 24px` (board.html:24) vs `var(--space-10)=40px` (시안 의도) — 시안 v1 디자인 원칙(여백 확대) 미달

**여백 (🟢 1건)**
- `.pg-outer gap: 6px` vs 16px(`var(--space-4)`) — 미세 차이

**그림자 (참고)**
- 시안 board.html은 라이브에서 이미 `.pg-outer` 스코프 오버라이드 제거됨 → 글로벌 본체의 `--shadow-*` 사용. 본체는 여전히 웜 브라운 톤 `rgba(61, 44, 30, ...)` (tokens.css:120~122). 시안은 차콜 톤 `rgba(17, 24, 39, ...)`. **이는 board만의 문제 아니라 글로벌 토큰 정합 사안 → 토큰 작업 단계로 이송**

### 시안 :root 토큰 (board)
이미 본체에 반영 완료된 7값(색상). 미반영: shadow 차콜 톤, neutral-*/brand-50,400,700/accent-50,200/gradient-brand/elevation-warm-2/ring-accent/z-sticky.

### 우선순위 집계
- 🔴 3 (코드 정합 2 + 레이아웃 1) / 🟡 1 / 🟢 1

---

## 3. admin

### 시안 의도

Make.com 스타일 2단 사이드바(72px 아이콘 레일 + 256px 확장 메뉴) + 슬림 헤더(64px) + 분석 대시보드 그리드(KPI 4칼럼 + 차트 2fr+사이드 1fr). 색상은 완전 뉴트럴, 브라운은 강조 포인트만 30%.

### 카테고리별 갭

**색상 (🔴 6~8건)**
- `--color-surface-2` 라이브 fallback `#F3EFE9` 웜 베이지 (admin.html:14) — 시안 `#F6F7F9` 쿨 그레이
- `--color-border` 라이브 fallback `#E4DBCE` 웜 베이지 (admin.html:67) — 시안 `#E5E7EB`
- `--color-text-primary/secondary/tertiary` 라이브 fallback 모두 브라운계 — 시안 그레이계
- 그림자 톤 — 라이브 글로벌 본체 여전히 웜 브라운 (tokens.css:120~122)
- 라이브 본체에 페이지 자체 그라데이션 헤더 (라인 29) — 시안은 슬림 헤더로 헤더 그라 미사용

**레이아웃 (🔴 1건 + 🟡 2건)**
- 🔴 전체 구조: 시안 3단 그리드 (72px 레일 + 256px 메뉴 + 1fr 본체, 시안:54~58) vs 라이브 5단 블록 (header + tab + content + footer, admin.html:10~19)
- 🟡 헤더 높이: 시안 64px (시안:56) vs 라이브 ~120px (admin.html:29)
- 🟡 메인 콘텐츠 패딩: 시안 32px (시안:308) vs 라이브 20px (admin.html:99)

**컴포넌트 (🔴 1건 + 🟡 다수)**
- 🔴 탭바: 시안 세로 레일(이모지+툴팁, 시안:94~132) vs 라이브 가로 텍스트탭 (admin.html:74~87) — 패러다임 차이
- 🟡 KPI 카드: 시안 정교한 top/bottom 분리 + 아이콘 배지 vs 라이브 단순 border-bottom
- 🟡 타임라인 dot 색상 구분: 시안만 정교

**여백 / 타이포 (🟡 다수)**
- 카드 간격 시안 16px / 라이브 12px
- 테이블 패딩 시안 12·14·20px / 라이브 10·14px
- 시안 px 기반 / 라이브 em 기반 → 가독성 톤 차이

**반응형 (🟡)**
- 시안 1280·900 두 단계 / 라이브 768 단일

**JS (🟢)**
- 라이브가 admFetch + Supabase + 모달 + 검색 모두 구현 완료 (시안은 alert 스텁). 기능 보존하며 UI만 시안 톤으로 재정의 권장

### 시안 :root (admin 고유)
- 상태 색상 Tailwind 팔레트 (`--color-success/danger/warning/info`) — 본체 미정의
- 그림자 차콜 톤 (`--shadow-sm/md/lg`) — 본체는 브라운 톤
- `--shadow-rail` (4px 0 16px ...) / `--shadow-menu` (6px 0 16px ...) — Make.com 사이드바 전용. 본체 미정의

### 우선순위 집계
- 🔴 8 / 🟡 8 / 🟢 4

---

## 4. myspace

### 시안 의도

뉴트럴 팔레트로 브라운 95→5% 축소 + 여백 확대(카드 패딩 24→32, 카드 간격 20→40, line-height 1.55→1.75, 좌우 16→32, max-width 900px). 4열 카드 그리드(`.mys-grid`) 레이아웃.

### 카테고리별 갭

**색상 (🔴 6~7건 + 🟡 1건)**
- `:root` 폴백값 모두 웜 브라운 (myspace.html:5~10) — 글로벌 토큰이 #FFFFFF 등으로 갱신되어 실효 렌더는 시안과 일치하지만 fallback 표기가 구버전. board와 동일 사유
- 페이지 배경 `.pg-outer` 라이브 `#F3EFE9` (myspace.html:15) vs 시안 투명 (시안:104) — fallback 동일 사유
- 모달 오버레이 톤 (라이브:173) — 웜 브라운 그림자 (🟡)

**여백 (🔴 4건 + 🟡 4건)**
- `.d` 컨텐츠 패딩 시안 `32 40 40px` (시안:80) — 라이브에 해당 구조 없음 (`.pg-outer` 직접 사용)
- `.pg-outer` 패딩 시안 16px (시안:104) vs 라이브 6px (myspace.html:16)
- `.pg-outer` 간격 시안 16px (시안:104) vs 라이브 6px (myspace.html:20)
- `.pg-content-inner` 패딩 시안 24px (시안:119) vs 라이브 14·20·16px (myspace.html:60)
- `.mys-card` 패딩 시안 20px (시안:137) vs 라이브 18·18·12px (myspace.html:87)
- 🟡 `.mys-card` 간격, `.pg-tab-btn` 패딩, `pg-tab-bar` 패딩 미세 차이

**타이포 (🟡 3건 + 🟢 4건)**
- 카드 제목 시안 `0.9375em` vs 라이브 `0.8947em`
- 본문 시안 `0.8em` vs 라이브 `0.842em`

**레이아웃 (🔴 2건 + 🟡 2건)**
- 🔴 그리드 방식: 시안 4열 카드 그리드 `.mys-grid` (시안:132) vs 라이브 탭+섹션 기반 분기 (myspace.html:86~119)
- 🔴 페이지 헤더: 시안 제목+아이콘 (시안:105~110) vs 라이브 배너 슬롯 (myspace.html:212)
- 🟡 탭바 위치, 콘텐츠 분기 구조 차이

**컴포넌트 (🟡 2건 + 🟢 3건)**
- 🟡 카드 다중 스타일 (라이브 `.mys-card / .mys-list-shell / .write-hero` 등 — 시안은 단일)
- 🟡 버튼 블록화 (라이브 width 380px) vs 시안 인라인
- 🟢 모달, 폼 필드, 상세 다이얼로그 — 라이브 추가 기능 (보존 권장)

**반응형 (🟢)**
- 라이브에만 모바일(@768px) 처리. 시안 미정의

**JS (🟢)**
- 함수명 차이만 (`switchTab` vs `switchMySpaceTab`), 실제 Supabase 저장은 라이브 구현

### 시안 :root (myspace 고유)
- `--color-text-placeholder` 본체 미정의
- shadow-sm/md/lg 차콜 톤 — 본체는 브라운 톤
- neutral-100/200/700/800, brand-50/400/500/700, accent-50/200/400, gradient-brand, color-success-bg, color-danger-bg, elevation-warm-2, ring-accent, z-sticky — 본체 미정의

### 우선순위 집계
- 🔴 12 / 🟡 10 / 🟢 8

---

## 5. 글로벌 토큰 갭 통합 표 (1차분 4페이지 기준)

본체 `css/tokens.css`에 미정의되어 있고, 시안 1개 이상에서 사용된 토큰을 모두 모은 표.

### 5-1. 뉴트럴 스케일 (시안 출처: home, board, myspace)

| 토큰 | 값 | 사용 페이지 |
|---|---|---|
| --neutral-50 | #FAFBFC | home |
| --neutral-100 | #F4F5F7 | home, board, myspace |
| --neutral-200 | #E5E7EB | home, board, myspace |
| --neutral-300 | #D1D5DB | home |
| --neutral-400 | #9CA3AF | home |
| --neutral-500 | #6B7280 | home |
| --neutral-600 | #4B5563 | home |
| --neutral-700 | #374151 | home, board, myspace |
| --neutral-800 | #1F2937 | home, board, myspace |
| --neutral-900 | #111827 | home |

### 5-2. Brand 스케일 (시안 출처: home, board, myspace)

| 토큰 | 값 | 사용 페이지 |
|---|---|---|
| --brand-50 | #FDF4EF | home, board, myspace |
| --brand-100 | #F9E3D2 | home |
| --brand-200 | #F0C19A | home |
| --brand-300 | #DE9B66 | home |
| --brand-400 | #C4733A | home, board(별칭), myspace |
| --brand-500 | #A0522D | home, board(별칭), myspace — 본체는 `--color-brand`로 존재 |
| --brand-600 | #824220 | home |
| --brand-700 | #66331A | home, board, myspace |
| --brand-800 | #4A2610 | home |
| --brand-900 | #2E1808 | home |

### 5-3. Accent 스케일 (시안 출처: home, board, myspace)

| 토큰 | 값 | 사용 페이지 |
|---|---|---|
| --accent-50 | #FEF3EA | home, board, myspace |
| --accent-100 | #FCDFC7 | home |
| --accent-200 | #F8B583 | home, board, myspace |
| --accent-300 | #EA9664 | home |
| --accent-400 | #D4845A | home, board(별칭), myspace — 본체는 `--color-accent`로 존재 |
| --accent-500 | #B46940 | home |
| --accent-600 | #945130 | home |

### 5-4. Surface / Border / Text 보조

| 토큰 | 값 | 사용 페이지 |
|---|---|---|
| --color-surface-3 | #F5F5F2 | home |
| --color-border-strong | var(--neutral-300) | home |
| --color-text-placeholder | var(--neutral-400) / #9CA3AF | home, myspace |
| --color-text-inverse | #FFFFFF | home |

### 5-5. 상태 색상 (Status — admin/home/board/myspace 다수)

| 토큰 | 값 | 사용 페이지 |
|---|---|---|
| --color-success | #10B981 | home, admin |
| --color-success-bg | #ECFDF5 | home, board, myspace |
| --color-danger | #EF4444 | home, admin |
| --color-danger-bg | #FEF2F2 | home, board, myspace |
| --color-warning | #F59E0B | home, admin |
| --color-warning-bg | #FFFBEB | home |
| --color-info | #3B82F6 | home, admin |
| --color-info-bg | #EFF6FF | home |

### 5-6. 그라데이션

| 토큰 | 값 | 사용 페이지 |
|---|---|---|
| --gradient-brand | `linear-gradient(135deg, var(--brand-500) 0%, var(--accent-400) 100%)` | home, board, myspace — 본체는 동일 의미 값(`#A0522D 0% → #C4733A 100%`)로 존재하나 종착점이 다름(브랜드-라이트 vs 액센트) |
| --gradient-brand-soft | `linear-gradient(135deg, var(--brand-50) 0%, var(--accent-50) 100%)` | home |
| --gradient-sunset | `linear-gradient(135deg, #F8B583 0%, #D4845A 50%, #A0522D 100%)` | home |
| --gradient-fade-b | `linear-gradient(180deg, transparent 0%, var(--brand-50) 100%)` | home |
| --gradient-mesh | radial-gradient 4 레이어 | home |

### 5-7. Elevation / Ring / Shadow 차콜 톤

| 토큰 | 값 | 사용 페이지 |
|---|---|---|
| --elevation-warm-2 | `0 4px 14px -4px rgba(160, 82, 45, 0.14), ...` | home, board, myspace |
| --elevation-warm-3 | `0 12px 24px -6px rgba(160, 82, 45, 0.18), ...` | home |
| --elevation-warm-4 | `0 24px 40px -8px rgba(160, 82, 45, 0.22), ...` | home |
| --elevation-glow | `0 0 0 4px rgba(212, 132, 90, 0.12), ...` | home |
| --ring-brand | `0 0 0 4px rgba(160, 82, 45, 0.14)` | home |
| --ring-accent | `0 0 0 4px rgba(212, 132, 90, 0.18)` | home, board, myspace |
| **shadow-sm 차콜 재정의** | `0 2px 6px rgba(17, 24, 39, 0.06)` | board, myspace, admin (본체는 현재 브라운 톤 `rgba(61, 44, 30, 0.08)`) |
| **shadow-md 차콜 재정의** | `0 4px 14px rgba(17, 24, 39, 0.08)` | board, myspace, admin |
| **shadow-lg 차콜 재정의** | `0 8px 28px rgba(17, 24, 39, 0.12)` | board, myspace, admin |
| --shadow-rail | `4px 0 16px rgba(26,26,26,0.06)` | admin (Make.com 사이드바 전용) |
| --shadow-menu | `6px 0 16px rgba(26,26,26,0.04)` | admin |

### 5-8. Z-index / 기타

| 토큰 | 값 | 사용 페이지 |
|---|---|---|
| --z-sticky | 20 | board, myspace |

### 5-9. 본체 갱신 필요 (이미 정의되어 있으나 시안과 값 불일치)

| 토큰 | 본체 현재 | 시안 값 | 페이지 |
|---|---|---|---|
| --color-surface-2 | #F6F7F9 | #FAFAF8 (home v2 미세) / #F6F7F9 (board, myspace) | home v2가 다름 |
| --shadow-sm | `0 2px 6px rgba(61, 44, 30, 0.08)` (브라운) | `0 2px 6px rgba(17, 24, 39, 0.06)` (차콜) | board, myspace, admin 모두 |
| --shadow-md | 브라운 톤 | 차콜 톤 | 동일 |
| --shadow-lg | 브라운 톤 | 차콜 톤 | 동일 |

---

## 1차분 결론 — 패턴 발견

1. **공통 fallback 표기 부채**: 라이브 페이지(`board`, `myspace`)가 `var(--color-*, #구브라운)` 형태로 fallback에 옛 브라운값을 보존. 글로벌 토큰이 갱신되어 실효 렌더는 일치하지만 코드 정합성·신규 작업자 혼란 위험. 작업 일괄 정리 가치 있음.

2. **shadow 톤 글로벌 부채**: shell-v1 머지로 색상 6값은 본체 갱신됐으나 `--shadow-sm/md/lg`는 여전히 브라운 톤. 4개 시안 모두 차콜 톤으로 재정의함 → 본체 갱신이 페이지별 작업보다 효율적.

3. **신규 토큰 카테고리 5묶음**: neutral-*, brand-*/accent-* 풀스케일, 상태 색상(success/danger/warning/info), gradient-*, elevation-warm-*/ring-*. home v2가 가장 광범위한 사용처. 본체 도입 우선순위는 페이지 작업 결정 후 재산정.

4. **레이아웃·컴포넌트 차이의 작업 비중 격차**:
   - home: 색상·애니메이션 중심 (구조는 일치)
   - board: 잔여 갭 미미 (이미 적용)
   - admin: **레이아웃 패러다임 차이 — 가로 탭 → 세로 레일** (작업 부담 큼)
   - myspace: **레이아웃 패러다임 차이 — 탭+섹션 → 4열 그리드** + 여백 확대 (작업 부담 큼)

---

---

## 6. quick

### 시안 의도

Quick 메뉴 풀페이지(B 사이드바 진입). 시안은 단일 컬럼 안내 + 테이블. 라이브는 동적 콘텐츠 로드 + 우측 패널(추천/최근) 2열 레이아웃 추가.

### 카테고리별 갭

**색상 (🔴 3건 + 🟡 2건)**
- 🔴 `.pg-outer` 라이브 배경 `#F3EFE9` 웜 베이지 (quick.html:15) vs 시안 transparent (시안:104)
- 🔴 `.qck-content-head` fallback `#F3EFE9` (quick.html) — 라이브 fallback이 웜 베이지
- 🔴 **푸터 배경 라이브 `var(--color-brand)` 브라운 채움** (quick.html:167 부근) vs 시안 `var(--color-surface-2)` (시안:123) — 시안과 180도 반대
- 🟡 헤더 아이콘 opacity 35→15 (라이브 더 흐림)
- 🟡 fallback 텍스트 색상 `#7A5C44` 잔존

**여백 (🔴 2건 + 🟡 3건)**
- 🔴 `.pg-outer` padding 라이브 `6px + 24px bottom` vs 시안 `var(--space-4)=16px`
- 🔴 `.pg-outer` gap 라이브 6px vs 시안 16px
- 🟡 `.qck-body-inner` padding 16px vs 20px
- 🟡 `.qck-content-slot` padding 20px vs 24px

**레이아웃 (🟢 6건)** — 모두 라이브 신규 (보존 가치)
- 🟢 `.qck-body-inner` 2열 grid `1fr 200px` (quick.html:99~100) — 우측 패널 신규
- 🟢 우측 `.qck-right-panel` + `.qck-panel-card` 신규 컴포넌트
- 🟢 미디어 쿼리 `max-width: 900px` 신규

**컴포넌트 (🔴 1건 + 🟡 4건)**
- 🔴 테이블 정적 스타일 극소화 (라이브:134) — 시안은 thead 배경·nth-child even·padding 명시 (시안:135~138)
- 🟡 `.qck-content-head-badge` LIVE 뱃지 시안 부재 → 라이브에 미적용
- 🟡 fallback border `#E4DBCE`

**JS (🟢 5건)** — 모두 라이브 신규 보존
- 동적 fetch `quick_contents`, `_initQuickPanel`, `toggleMirrorScript`, `_boot` + appstate:ready

### 우선순위 집계
- 🔴 6 / 🟡 14 / 🟢 21

### 시안 :root (quick)
1차 패턴과 거의 동일 — neutral-100/200/700/800, brand-50/400/500/700, accent-50/200/400, gradient-brand, color-success-bg, color-danger-bg, elevation-warm-2, ring-accent, z-sticky, color-text-placeholder. shadow-sm/md/lg는 차콜 톤.

---

## 7. scripts (v2 기준)

### 시안 의도

**세로 탭바(좌측 180px sticky) + 우측 3열 동적 그리드** 레이아웃 — 좌측에서 10단계 선택 → 우측 그리드가 STEP별 동적 확장. 단일 사스브라운 강조.

### 카테고리별 갭

**색상 (🔴 1건 + 🟡 3건)**
- 🟡 라이브 `--stg-1~10-fg/bg` 10단계 그라데이션 토큰 (scripts.html:13~22) vs 시안 단일 사스브라운 — 라이브 비즈니스 결정(단계별 시각화)으로 보임. 보존 가치 검토 필요
- 🟡 라이브 sc-col-4 `#FFFBF5` (웜톤) 잔존
- 🟡 그림자 톤: 시안 차콜, 라이브는 단계 특화 그림자 + 본체 브라운

**레이아웃 (🔴 5건 핵심)**
- 🔴 **세로 탭바(180px sticky) vs 가로 탭바** — 가장 큰 갭 (scripts.html:32~93 vs 시안:256~272)
- 🔴 그리드 열 구조: 시안 `180px 1fr`(세로탭+본문) vs 라이브 `130px 3.5fr 1.5fr 2.5fr`(4열 가로)
- 🔴 세로탭 sticky `top: calc(64px + var(--space-4))` (시안:271) — 라이브 부재
- 🔴 1200px 반응형 단계 부재 (라이브)
- 🔴 sc-col-padding 시안 40px vs 라이브 20px (시안의 호흡 확장 의도 미반영)

**여백 (🟡 다수)**
- 상세 본문 padding 40px vs 20px (정확 2배 차이)
- 카드 내부 패딩 32px vs 20px (시안 1.6배)
- 세로탭 내부 패딩 16px (라이브는 구조 자체 다름)

**컴포넌트 (🟡)**
- 활성 항목 배경: 시안 `var(--brand-50)` vs 라이브 `var(--stg-bg)` (단계 동적)
- 현장팁 색상: 고정 브라운 vs 동적 단계색
- 탭 그림자 톤 차이

**반응형 (🔴 2건)**
- 1200px 단계 시안 ↔ 라이브 직접 모바일로
- 모바일은 라이브가 더 정교 (4-STEP UI mRenderStep1~4) — 보존 가치

**JS (🟡 + 🟢)**
- 라이브가 비동기 Supabase fetch + 단계 색상 동적 주입 + 4-STEP 모바일 — 보존
- `applyStageVars()` 단계별 색상 주입 함수는 다색상 시스템 유지 시 핵심

### 우선순위 집계
- 🔴 5 / 🟡 9 / 🟢 3

### 시안 :root (scripts v2) — 1차와 동일 + Layout 토큰

`--text-tab`, `--text-h2`, `--text-body` 시안 출처 텍스트 토큰 추가 추적 필요. 본체 미정의.

---

## 8. together

### 시안 의도

웰컴 톤 페이지 — 타이틀 3단(제목·부제·설명), 헤더 그라, 여유있는 공간 + 카드 패딩 32px / 카드 간격 40px / line-height 1.75 / 좌우 32px / 색상 95→5%.

### 카테고리별 갭

**색상 (🔴 6건)**
- 🔴 `.pg-outer` 라이브 fallback `#F3EFE9` (together.html:28) — 페이지 배경 통째 웜 베이지
- 🔴 surface-2 / border / text-primary/secondary/tertiary 모두 라이브 fallback이 옛 브라운 (together.html:33, 133)
- 🔴 **푸터 라이브 `var(--color-accent)` + `#fff` 글자** (together.html:276~277) vs 시안 `var(--color-surface-2)` + `text-secondary` (시안:123) — quick과 동일한 시안 180도 반대 패턴

**여백 (🔴 3건 + 🟡 다수)**
- 🔴 `.pg-outer` padding 라이브 8px vs 시안 `var(--space-8) var(--space-10)` = 32·40px (together.html:29-31 vs 시안)
- 🔴 `.pg-outer` gap 8px vs 16px
- 🔴 `.pg-body` padding 6·0px vs 24px (시안의 "촘촘함 해소" 의도 정반대)

**컴포넌트 (🔴 3건)**
- 🔴 배지 색상: 시안 `#E8F4FD/#E8FDE8/#FDF4E8` 밝은 톤 vs 라이브 rgba 브라운/액센트 톤 (together.html:210~220)

**레이아웃 (🟢 다수)** — 라이브 신규 보존
- 헤더 `::after` gloss 효과
- 헤더 텍스트 래퍼 `.pg-header-text`
- Item flex column + flex-wrap (반응형 개선)

**반응형 (🟢 3건)** — 라이브 640px 모바일 처리

**JS (🟢 6건)** — 모두 라이브 신규 보존
- `togetherSwitchTab`, `loadTogetherPosts` (Supabase), `togetherOpenWrite` 모달, `renderBadge`, `esc` XSS, 폼 검증

### 우선순위 집계
- 🔴 12 / 🟡 11 / 🟢 13

---

## 9. news

### 시안 의도

v2 크롬(슬림 헤더 64 + 사이드바 180) + pg-* 표준 레이아웃 통합. 카드 리스트형 + 카테고리 뱃지(브라운 톤). 라이브는 2026-04-25 표준 pg-* 재작성된 이력 있으나 시안의 헤더 톤·탭 박스화 미반영.

### 카테고리별 갭

**색상 (대부분 🟢)**
- 시안 :root 토큰값과 본체 일치 (color-bg/surface-2/border/text 6값 모두 ✓)
- 🟡 그림자 톤만 차이 (시안 차콜 vs 본체 브라운)

**여백 (🔴 2건 + 🟡 1건)**
- 🔴 카드 패딩 라이브 16~18px vs 시안 20px (news.html:89 vs 시안:161)
- 🔴 콘텐츠 좌우 라이브 16px vs 시안 24px (33% 감소)
- 🟡 카드 간 간격 10px vs 8px (근소)

**레이아웃 (🔴 2건)**
- 🔴 **헤더**: 라이브 `linear-gradient` + 120px 고정 (news.html:19~20) vs 시안 투명 + 좌정렬 (시안:115)
- 🔴 **탭 영역**: 라이브 border-bottom 언더라인 (news.html:48~55) vs 시안 박스(bg+border, 카드 스타일) (시안:128)

**타이포 (🟡 4건)**
- 카드 제목 0.942em vs 0.975em (-3.3%)
- 카드 요약 line-height 1.55 vs 1.65
- 카테고리 뱃지 0.790em vs 0.6875em (라이브 14.7% 큼)
- 탭 굵기 500 vs 600 (semibold)

**컴포넌트 (🟡 2건)**
- 카테고리 뱃지: 시안 brand-50 + brand-500 vs 라이브 surface-2 + accent
- 호버 효과: 시안 background 변화만 vs 라이브 그림자 + 테두리

**JS (🟢)** — 라이브 fetch API + 함수명 차이만

### 우선순위 집계
- 🔴 4 / 🟡 7 / 🟢 4

### 시안 :root (news)
1차 패턴 동일 + 본체와 색상 6값 모두 일치 (오히려 본체 갱신 후 가장 잘 정렬된 페이지).

---

## 10. index (랜딩)

### 시안 의도

"프리미엄 네비 + 듀얼 모니터 + 병합 섹션 + **인라인 가입 폼**". 시안은 가입 폼을 페이지 내 섹션으로 구조화, 라이브는 모달 오버레이. 토큰 체계가 가장 광범위.

### 카테고리별 갭

**색상 (🔴 1건 + 🟡 6건)**
- 🟡 시안 중성 팔레트(brand 10 + accent 7 + neutral 11 = 28 토큰) vs 라이브 brown-dark/mid/light/pale 4단계 + 인라인 hex 다수
- 🟡 배경 시안 `#FFFFFF` 순백 vs 라이브 `#fdf8f3` 크림 — 라이브 hero 배경 기울기 의존성 있음
- 🟡 그라데이션: 시안 토큰 5종 vs 라이브 인라인 다수

**레이아웃 (🔴 1건 + 🟡 3건)**
- 🔴 **가입 폼 구조: 시안 인라인(섹션 흐름) vs 라이브 모달 오버레이** — 가장 큰 갭 (라이브:#overlay)
- 🟡 nav: 시안 sticky top:24 (라이브 fixed)
- 🟡 hero 그리드 비율 좌우 역순 (시안 1fr 1.1fr / 라이브 1.1fr 1fr)
- 🟡 섹션 순서 다름 (라이브 inaction 섹션 신규)

**JS (🔴 4건 + 🟡 11건)** — **라이브 전용 함수 15개 분류**

| 분류 | 함수 | 결정 |
|---|---|---|
| 🔴 제거 (모달 인프라) | `openModal` (라이브:2071), `closeModal` (2072), `handleOverlayClick` (2073), `handleHeader` (2234) | 4개 — 시안은 인라인 폼 + CSS .nav.scrolled |
| 🟡 보존 (약관 모달) | `showPrivacy` (2221), `closePrivacy` (2222), `confirmPrivacy` (2223) | 3개 — 시안에도 약관 보기 필요 |
| 🟡 보존 (TOGETHER 오버레이) | `openTogetherIntro`, `closeTogetherIntro`, `handleTogetherIntroOverlayClick`, `goToTogether` (2055~2064) | 4개 |
| 🟡 수정 (TOGETHER → 가입 흐름) | `startTrialFromIntro` (2067) | 1개 — 모달 → 인라인 앵커 |
| 🟡 보존 (3D/카운터 애니) | `applyTilt` (2246), `applyTiltIn` (2279), `tick` (2307) | 3개 — 시안 hero 임팩트 |
| 🟡 보존 (회원가입) | `doSubmit` (2130) | 1개 — 시안에도 필요 (B-2b 부분 이식 완료) |

**여백 (🟡 4건)**
- nav 높이 +12px (72 vs 60)
- hero padding 80/32/96 vs 64/40/72 (시안 더 여유)
- 섹션 간 padding 96px 일관성 vs 라이브 80~100 혼재

**타이포 (🟡 5건)**
- hero title clamp 36~96px vs 34~56px (시안 임팩트 거의 2배)
- 폰트 스택 시안 DM Sans+Pretendard / 라이브 Noto Sans KR

**컴포넌트 (🟡 3건)**
- 버튼: 시안 gradient / 라이브 단색 + shimmer
- form input border 색 차이
- 모달 구조 자체가 라이브에만 존재 → 제거 시 영향 큼

**반응형 (🟢 2건)** — breakpoint 미세 차이

### 우선순위 집계
- 🔴 6 / 🟡 26 / 🟢 3

### 시안 :root (index) — 가장 광범위 (~100 토큰)

추가 발견 (1차 home v2 + 다음):
- **--text-* 11단계** (xs/sm/base/lg/xl/2xl/3xl/4xl/5xl/6xl/7xl)
- **--leading-* 6단계** (none/tight/snug/normal/relaxed/loose)
- **--tracking-* 6단계** (tightest~widest)
- **--fw-* 5단계** (regular/medium/semibold/bold/black) — 본체에 fw-bold 등 일부 존재
- **--ease-* 4종** (out/in-out/spring/smooth)
- **--duration-* 4종** (fast/normal/slow/slower)
- **--radius-* 9단계** (xs/sm/(default)/md/lg/xl/2xl/3xl/full)
- **--space-* 풀 스케일** (1/2/3/4/5/6/7/8/10/12/14/16/20/24/32) — 본체에 일부만
- **--elevation-1~5** (차콜 톤)
- **--elevation-warm-2/3/4** + **--ring-brand/accent**
- **--nav-h: 72px**

---

## 11. 1차+2차 통합 글로벌 토큰 갭 최종 표

### 11-1. 색상 토큰

| 카테고리 | 토큰 수 | 핵심 사용 |
|---|---|---|
| Neutral 50~900 | 10개 | home·index·board·myspace·quick·scripts·together·news 다수 |
| Brand 50~900 (color-brand 별칭 제외) | 9개 | home·index 풀, 나머지 부분 |
| Accent 50~600 (color-accent 별칭 제외) | 6개 | home·index 풀, 나머지 부분 |
| Surface-3 / Border-strong | 2개 | home·index |
| Text-placeholder / Text-inverse | 2개 | home·index·myspace·quick·scripts 등 |
| 상태 색상 (success/danger/warning/info × 2) | 8개 | home·admin·index 다수, 나머지 일부 |

**색상 누계: 약 37개**

### 11-2. 그라데이션·그림자·링

| 토큰 | 사용 |
|---|---|
| --gradient-brand | home·board·myspace·index·scripts·together·news |
| --gradient-brand-soft | home·index·scripts |
| --gradient-sunset | home·index |
| --gradient-fade-b | home·index |
| --gradient-mesh | home·index |
| --elevation-1 ~ -5 (차콜 톤) | index 풀, home v2 일부 |
| --elevation-warm-2/3/4 | home·index·board·myspace·scripts 등 |
| --ring-brand | home·index |
| --ring-accent | 거의 모든 페이지 |
| --shadow-rail / --shadow-menu | admin 전용 |

**그라/그림자 누계: 약 16개**

### 11-3. 시스템 토큰 (index 시안 광범위 정의)

| 카테고리 | 토큰 수 | 본체 정의 상태 |
|---|---|---|
| --text-* (xs~7xl) | 11개 | 본체에 일부만(--text-tab 등 도메인 토큰 존재) |
| --leading-* (none~loose) | 6개 | 본체 미정의 |
| --tracking-* (tightest~widest) | 6개 | 본체 미정의 |
| --fw-* (regular~black) | 5개 | 본체에 fw-bold 등 일부 정의 |
| --ease-* (out/in-out/spring/smooth) | 4개 | 본체에 transition만(timing 별도) |
| --duration-* (fast~slower) | 4개 | 본체 미정의 |
| --radius-* (xs~3xl, full) | 9개 | 본체에 sm/md/full 등 일부 |
| --space-* (1~32 풀) | 14개 (옵션 1의 7/12/16/20 외에 14·24·32 추가) | 본체에 일부 |

**시스템 누계: 약 59개 (일부는 본체 부분 존재)**

### 11-4. 레이아웃·기타

| 토큰 | 사용 |
|---|---|
| --nav-h: 72px | index |
| --z-sticky: 20 | board·myspace·quick·scripts·together |
| --sidebar-width: 180px | 모든 페이지 (본체 정의됨) |

### 11-5. 본체 갱신 필요 (이미 정의되어 있으나 시안과 값 불일치)

| 토큰 | 본체 현재 | 시안 값 | 페이지 |
|---|---|---|---|
| --color-surface-2 | #F6F7F9 | #F6F7F9 (8개 페이지) / **#FAFAF8** (home v2만) | 분기 발생 |
| --shadow-sm | `rgba(61, 44, 30, 0.08)` 브라운 | `rgba(17, 24, 39, 0.06)` 차콜 | 모든 페이지 시안에서 차콜 톤 |
| --shadow-md | 브라운 | 차콜 | 동일 |
| --shadow-lg | 브라운 | 차콜 | 동일 |
| --gradient-header | 브라운 그라 (현재) | home v2는 transparent 권고 | home만 |

### 통합 결과

**1차에서 ~54개 + α** 라고 추정했던 것이 실제로는:
- **색상 ~37 + 그라/그림자 ~16 + 시스템(text/leading/tracking/fw/ease/duration/radius/space) ~59 + 레이아웃 3 = 합 ~115개**
- 이 중 본체에 일부 부분 정의된 토큰(fw-bold, radius-sm/md/full, space 일부 등)을 제외하면 **순 신규 추가 필요 토큰 약 80~95개**
- 본체 갱신 필요 4건 (shadow 톤 3 + surface-2 분기 1)

**옵션 1(여백 4개)은 전체의 ~3%에 불과.** 토큰 정합 작업의 진짜 범위는 옵션 1의 25~30배.

---

## 12. 페이지별 작업 부담도 매트릭스 (9 페이지 전체)

부담도: **소** (~30분~1h) / **중** (~2~4h) / **대** (~1~2일+검수)

| 페이지 | 색상 | 여백 | 타이포 | 레이아웃 | 컴포넌트 | 반응형 | JS | 종합 | 비고 |
|---|---|---|---|---|---|---|---|---|---|
| home | 소~중 | 제외¹ | 소 | 소 | 중~대 | 소 | 소 | **중** | 색상 fallback 정리 + 신규 토큰 의존 + hero 애니메이션(aura/float/nodeEnter) 다수. 구조는 일치 |
| board | 소 | 소 | — | 소 | — | — | — | **소** | 잔여 갭 4건 (fallback 2 + overflow 1 + padding-bottom 1). 1~2시간 |
| admin | 중 | 소~중 | 소 | **대**² | 중 | 소 | — | **대** | 가로 탭 → Make.com 세로 레일 패러다임. JS Supabase·모달·검색 보존 |
| myspace | 소 | 중~대 | 소 | **대**² | 소 | — | — | **대** | 탭+섹션 → 4열 그리드 패러다임 + 여백 확대 다수 |
| quick | 중 | 중 | 소 | 소³ | 중 | 소 | — | **중** | 푸터 브라운→그레이, 극단 여백, 우측 패널은 라이브 보존 |
| scripts | 중⁴ | 중 | — | **대**² | 중 | 중 | 소 | **대** | 가로 탭바 → 세로 탭 sticky + 단색/다색 시스템 결정 |
| together | 중 | 중 | 소 | 소 | 중 | — | — | **중** | 색상 fallback + 푸터 반전 + 여백 확대. 모달·동적 보존 |
| news | 소 | 소 | 소 | 중 | 소 | — | — | **소~중** | 헤더 박스화 + 탭 카드화. 색상은 본체 갱신 후 가장 잘 정렬됨 |
| index | 중 | 중 | 중 | **대**⁵ | 중 | 소 | 중 | **대** | 가입 폼 모달 → 인라인 + JS 함수 15개 분류·재배치 |

¹ home은 README가 명시한 "여백 규칙 미적용" 페이지 (2026-04-24 레이아웃 보존)
² 레이아웃 패러다임 차이 — 작업이 페이지 골격 재작성 수준
³ quick은 라이브 우측 패널이 시안 부재 → 보존 결정 후 색상·여백만 정리하면 구조 재작성 불필요
⁴ scripts는 라이브의 단계별 색상 시스템(`--stg-*`)이 비즈니스 결정인지 확인 필요. 단색 시안 적용 vs 다색 라이브 유지 결정에 따라 부담 변동
⁵ index는 모달 → 인라인 변경 시 약관/TOGETHER 오버레이 함수 보존 + Supabase doSubmit 보존 필요

### 부담도 분포

- **소**: board (1)
- **소~중**: news (1)
- **중**: home, quick, together (3)
- **대**: admin, myspace, scripts, index (4)

---

## 13. 패턴 분석 — 1차 → 2차 변화

### 기존 패턴 검증

**패턴 1. fallback 표기 부채** ✅ **2차에서도 동일 양상**
- quick (`#F3EFE9`, `#7A5C44`, `#E4DBCE`), together (`#F3EFE9`, `#3D2C1E`, `#7A5C44`, `#B89880`) — 라이브 페이지 곳곳에 옛 브라운 fallback 잔존
- 글로벌 토큰 갱신으로 실효 렌더는 일치하지만 코드 정합성 문제. board·myspace·quick·together 4페이지 모두 동일 패턴 → **글로벌 sweep 작업 가치 명확**
- 예외: news는 fallback 표기 거의 없음 (2026-04-25 재작성 직후라 정합 양호)

**패턴 2. shadow 톤 글로벌 부채** ✅ **2차에서도 동일 양상**
- 8개 시안 모두 `--shadow-sm/md/lg`를 차콜 톤(`rgba(17, 24, 39, ...)`)으로 재정의
- 본체는 여전히 브라운 톤(`rgba(61, 44, 30, ...)`) — shell-v1 머지에서 누락됨
- **본체 1회 갱신이 페이지별 작업보다 훨씬 효율적** — 토큰 작업의 가장 작은 가성비 좋은 구간

**패턴 3. 레이아웃 패러다임 차이** ✅ **2차에서 더 강해짐**
- 1차: admin (가로탭→세로레일), myspace (탭+섹션→4열 그리드)
- 2차 추가: scripts (가로탭→세로탭 sticky), index (모달→인라인 폼)
- **9개 중 4개가 패러다임 차이** — 가벼운 색상·여백 작업으론 시안 의도 달성 불가. 페이지 골격 재작성 수준

### 새로운 패턴 발견

**패턴 4. 푸터 색상 반전** 🆕
- quick·together 양쪽 다 라이브 푸터가 **브라운 채움 + 흰 글자** (`var(--color-brand)` 또는 `var(--color-accent)` + `#fff`)
- 시안은 둘 다 **라이트 그레이 + secondary 텍스트** (`var(--color-surface-2)` + `var(--color-text-secondary)`)
- board는 이미 fix됨 (shell-v1에서 `.pg-bottom-bar` 그레이톤 처리). 다른 페이지 sweep 가치 있음

**패턴 5. 라이브가 시안보다 정교한 영역** 🆕
- 모달, Supabase fetch, escapeHTML XSS 가드, 모바일 반응형 4-STEP UI, 동적 색상 주입 — 라이브 본운영 코드는 시안 정적 레퍼런스보다 풍부
- **시안 적용 ≠ 통째 교체**. 시안은 디자인 의도만 가져가고 라이브의 보존 가치 있는 동적 로직은 유지해야 함
- 특히 scripts·together·myspace·index에서 강하게 나타남
- 1636 세션 B-2c "통째 승격" 가정 오류 발견 사실(`design_test_to_live_diff.md` 메모리)이 9개 페이지 모두에 일반화 가능

**패턴 6. 시안 토큰 시스템의 깊이** 🆕
- 1차에선 ~54개 토큰 부재로 추정. 2차 index 분석으로 transition·duration·radius·text-scale·leading·tracking·fw까지 합치면 **순 신규 약 80~95개**
- 본체는 색상 6값 + 일부 시스템 토큰만 정의. **시스템 토큰(text/leading/tracking/ease/duration/radius)은 거의 비어있음**
- 옵션 1(여백 4개)은 전체의 ~3%. 토큰 정합 작업 범위가 25~30배 확장됨

---

*보고서 끝. 작업 우선순위 합의 단계 대기.*
