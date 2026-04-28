# index.html 승격 진입 전 갭 분석 — 2026-04-28

> **목적:** design_test 시안 라이브 승격 트랙(메인 트랙) Phase 1 — 1번 페이지 `index.html` 승격 작업 진입 전 갭 사전 진단. **코드 수정 0건, 보고서만.**
> **작업 권장 방식 결정** + **privacy/terms 처리 방향** + **위험 영역 사전 식별**이 본 보고서의 산출물.
> **참조:** `docs/sessions/_INDEX.md` (메인 트랙) / `claude_code/design_test/README.md` (승격 진행 순서) / `docs/index_section_map.md` (라이브 섹션 매핑)

---

## 0. 큰 그림 정합성 — 통과

- 메인 트랙: ✅ 활성 (`docs/sessions/_INDEX.md` 9-31줄)
- index.html이 1번: ✅ (`design_test/README.md` 승격 진행 순서 표)
- 단 _INDEX.md는 index.html을 "부분(가입 폼 등)"으로 표기 — 승격 관점에서는 "전면 승격 미진행". 부분 작업 이력만 있음 (`d8a7d50`, `70545bd` 등)

---

## 1. 사전 확인

### 파일 존재 + 줄 수

| 항목 | 시안 (`claude_code/design_test/index/`) | 라이브 (저장소 루트) |
|---|---|---|
| 메인 페이지 | `v1-full.html` — **1,911줄** | `index.html` — **2,354줄** |
| 개인정보처리방침 | `privacy.html` — **291줄** | ❌ **없음** (라이브는 `#privacy-overlay` 인라인 모달) |
| 이용약관 | `terms.html` — **219줄** | ❌ **없음** |

### 메타 문서

- `claude_code/design_test/index/` 폴더 안 README/STATUS/notes.md: **없음**

---

## 2. 섹션 구조 갭 (`docs/index_section_map.md` 기준)

### 라이브 13개 섹션·블록

| 영역 | 라인 | 클래스 / 태그 | 역할 |
|:---:|:---:|---|---|
| A | 1448 | `<header>` | 헤더 네비 (로고 + 로그인 + 가입) |
| B | 1457 | `<section.inaction-section>` | IN ACTION — 도구 정체성 |
| C | 1500 | `<div.hero-wrap>` ⚠️ | 히어로 (현실 공격형) |
| D | 1604 | `<section.reality-section>` | 공감 (현실 정의) |
| E | 1631 | `<section.vs-section>` | 대비 (BEFORE · AFTER) |
| F | 1668 | `<section.features>` | 기능 펜타곤 + 5카드 |
| G | 1798 | `<section.target-cta-section>` | 대상별 CTA (설계사·매니저·보험사) |
| H | 1835 | `<section.together-section>` | 커뮤니티 CTA |
| J | 1856 | `<footer>` | 푸터 |
| 모달1 | 1865 | `#overlay` (`.overlay`) | 가입 모달 (모달 형태) |
| 모달2 | 2004 | `#privacy-overlay` (`.privacy-overlay`) | 개인정보 모달 (인라인 본문) |
| 모달3 | 2034 | `#togetherIntroOverlay` (`.together-intro-overlay`) | TOGETHER 인트로 모달 |

### 시안 6 섹션 + 네비 + 푸터

| 라인 | 클래스 | 역할 |
|:---:|---|---|
| 1214 | `<nav.nav>` | 헤더 네비 (브랜드 + 인페이지 앵커 5개 + Sticky) |
| 1238 | `<section.hero>` | 히어로 |
| 1338 | `<section.pain>` | 문제와 해답 |
| 1409 | `<section.pillars>` | 6가지 기둥 |
| 1468 | `<section.together>` | 함께해요 |
| 1493 | `<section.target>` | 사용 대상 |
| 1531 | `<section.signup>` | 무료 가입 (인라인 폼, 모달 아님) |
| 1702 | `<footer.footer>` | 푸터 |

### 갭 매핑 (라이브 ↔ 시안 클래스명·역할 대응)

| 라이브 영역 | 시안 대응 | 갭 종류 |
|---|---|---|
| A `<header>` | `<nav.nav>` (line 1214) | **클래스명 다름**. 시안은 인페이지 앵커 5개 + Sticky scrolled 토글 (`onScroll` line 1732). 라이브는 로그인·가입 CTA 중심 |
| B `inaction-section` | (대응 없음) | **시안에 없음** — 시안 hero에 흡수되었거나 폐기 |
| C `hero-wrap` (div ⚠️) | `<section.hero>` | **태그·구조 다름**. 시안은 표준 `<section>`, 라이브는 `<div>` (index_section_map.md L10에 주의 표시) |
| D `reality-section` | `<section.pain>` | 역할 유사 (현실 공감 / 문제와 해답). 클래스명·세부 구조 다름 |
| E `vs-section` | (대응 없음) | **시안에 없음** — BEFORE/AFTER 대비 섹션 폐기 |
| F `features` | `<section.pillars>` | 5카드 → 6 기둥. 클래스명·요소 수 다름 |
| G `target-cta-section` | `<section.target>` | 대상별 CTA 동일 컨셉, 클래스명 다름 |
| H `together-section` | `<section.together>` | 동일 컨셉. 단 라이브는 `goToTogether → openTogetherIntro` 모달 트리거, 시안은 직접 `<section>` |
| J `<footer>` | `<footer.footer>` | 동일 컨셉 |
| 모달1 `#overlay` (가입) | `<section.signup>` 인라인 | **패러다임 다름** — 라이브 모달 ↔ 시안 인라인 |
| 모달2 `#privacy-overlay` | `privacy.html` 외부 | **패러다임 다름** — 라이브 인라인 본문 모달 ↔ 시안 외부 페이지 |
| 모달3 `#togetherIntroOverlay` | (대응 없음) | **시안에 없음** — 라이브 전용 기능 |

### 핵심 카피 변경 가능성

- B `inaction-section` 카피("통화 중 멈추는 순간, 원세컨드가") — 라이브 모달1 안에도 동일 카피 있음(`ml-title`). 시안에는 없음. **삭제 또는 hero로 흡수 결정 필요**
- C `hero-wrap` 카피("메시지 330개. 필요한 건 단 3개.") — 시안 hero에 동일/유사 카피 존재 여부 미확인 (보고서 분량상 별도 검수 필요)
- E `vs-section` 카피("카톡 단톡방 vs 원세컨드") — 시안 폐기 시 카피 손실. **존속 결정 필요**

---

## 3. 디자인 갭 (카테고리별)

### A. 색상 / 배경

| 항목 | 라이브 | 시안 |
|---|---|---|
| 토큰 시스템 | **페이지 로컬 `:root`** + `--brown-dark/mid/light/pale` (옛 브라운 4종) | **`tokens.css` 외부 의존** + 자체 :root에 v1 라이트 톤 |
| `tokens.css` link | ❌ 없음 | ✅ `<link rel="stylesheet" href="../../../css/tokens.css">` |
| 색상 시스템 | `--brown-dark #3d2b1f` / `--brown-mid #6b4226` / `--brown-light #a0724a` / `--brown-pale #f5ede4` (4 색만) | `--neutral-50~900` (10단) + `--brand-50~900` (10단) + `--accent-50~600` (7단) + status 4 + gradient 4 + elevation 5 + ring 2 |
| `--brown-*` 사용 횟수 | **30회** | 0회 |
| 옛 브라운 6값 fallback | 0건 (이미 sweep 검증 통과) | 0건 |
| unique hex 사용 | **91개** (다양·일관성 의문) | **46개** (시스템 정돈) |
| 그라데이션 | 인라인 위주 (예: `linear-gradient(180deg,#F8F4EF 0%,#F2EAE1 100%)` 모달 안) | 토큰화 (`--gradient-brand`, `--gradient-sunset`, `--gradient-mesh` 등) |
| 그림자 시스템 | 산발적 (rgba 직접) | `--elevation-1~5` + `--elevation-warm-2~4` 토큰 |

→ **색상 시스템이 완전히 다름.** 라이브는 페이지 로컬 옛 브라운 4종 직접 사용, 시안은 v1 라이트 톤 + 디자인 토큰 시스템 풀세트. 승격 시 페이지 전체 색상 마이그레이션 발생.

### B. 여백 / 간격

`design_test/README.md` v1 디자인 원칙 (2026-04-25 확정):
- 카드 내부 패딩: 24 → 32px (+33%)
- 카드 간 간격: 20 → 40px (+100%)
- 섹션 타이틀 아래: 8 → 16px (+100%)
- 컨텐츠 좌우 여백: ~16 → 32px (+100%)
- 컨텐츠 max-width: 없음 → 900px

→ 라이브 index.html은 위 원칙 미적용 추정 (촘촘함 가능성). 시안은 적용. **승격 시 호흡감 확장**.

### C. 타이포그래피

| 항목 | 라이브 | 시안 |
|---|---|---|
| 폰트 토큰 | (검증 안 됨) | `--text-xs ~ --text-7xl` 11단 + `--tracking-tightest ~ widest` 7단 + `--leading-none ~ loose` 6단 |
| 글꼴 import | (검증 필요) | DM Sans 9..40 weights 6단(400~900) + JetBrains Mono + Pretendard |

### D. 레이아웃 / 구조

- C영역 라이브 `<div.hero-wrap>` 비표준 ⚠️ (`docs/index_section_map.md:10` 주의) → 시안 `<section.hero>` 표준화로 전환 가능
- 시안 `pillars` 6 기둥 vs 라이브 `features` 5 카드 → 카드 수 / 그리드 columns 차이
- 시안 가입은 인라인 (signup section) — 모달 제거 가능. 라이브는 모달 (#overlay) 별 마크업 + body lock JS

### E. 컴포넌트

- **버튼·CTA**: 시안에 `--ring-brand`, `--ring-accent` 포커스 링 토큰 / `--gradient-sunset` CTA — 라이브 미적용
- **카드**: 시안에 `--elevation-warm-*` 따뜻한 그림자 토큰 (브라운 톤) — 라이브 미적용
- **모달**: 라이브 3개 모달 vs 시안 0개 (인라인)

### F. 반응형

| | 라이브 (브레이크포인트) | 시안 (브레이크포인트) |
|---|---|---|
| 개수 | 10+ | 9 |
| 주요 BP | 480 / 700 / 740 / 768 / 860 / 960 | 560 / 640 / 880 / 900 / 960 / 1024 |

→ 부분 겹침 (640, 768/740, 960) + 시안만 1024 (3열→2열 그리드 분기) — 비교적 정돈된 시스템.

### G. JS 동작

| 함수 / 동작 | 라이브 | 시안 |
|---|---|---|
| Sticky Header (`scrolled` 토글) | ✅ `handleHeader` (line 2236, scrollY > 8) | ✅ `onScroll` (line 1732, scrollY > 20) — 다른 임계값 + 추가로 인페이지 섹션 활성 표시(`nav-item.active`) |
| 가입 폼 검증 (`onRoleChange`, `fmtPhone`, `clearFieldError`, `toggleRegPw`, `validate`) | ✅ 동일 | ✅ 동일 |
| `doSubmit` (Supabase 가입) | ✅ (line 2130) | ✅ (line 1824) — 4/25 `d8a7d50` 커밋으로 라이브에서 시안으로 이식 완료 |
| 가입 모달 토글 (`openModal`, `closeModal`, `handleOverlayClick`) | ✅ | ❌ (인라인이라 불필요) |
| TOGETHER 인트로 모달 (`openTogetherIntro`, `closeTogetherIntro`, `handleTogetherIntroOverlayClick`, `startTrialFromIntro`, `goToTogether`) | ✅ | ❌ |
| Privacy 모달 (`showPrivacy`, `closePrivacy`, `confirmPrivacy`) | ✅ | ❌ (외부 페이지로 처리) |
| `prefers-reduced-motion` 감지 | ✅ (line 2232) | (검증 미진행) |

---

## 4. 위험 영역

### 🔴 시안에만 있는 신규 요소 (회귀 위험 높음)

1. **인라인 가입 폼** (`section.signup`) — 모달 → 인라인 패러다임 전환. 사용자 가입 동선·이탈률 영향 가능
2. **인페이지 섹션 활성 표시** (스크롤 위치 따라 `nav-item.active` 토글) — 신규 동작
3. **Sticky 네비 임계값 다름** (라이브 8px → 시안 20px)
4. **6 기둥 (pillars)** — 라이브 5 카드 → 1개 추가. 컨텐츠 보강 필요

### 🟡 라이브에만 있는 기존 요소 (제거 시 누락 위험)

1. **B `inaction-section`** — 시안 대응 없음. 핵심 카피 ("통화 중 멈추는 순간") 보존 위치 결정 필요
2. **E `vs-section` BEFORE/AFTER** — 시안 폐기. "카톡 단톡방 vs 원세컨드" 컨셉 손실
3. **모달3 `#togetherIntroOverlay`** — 라이브 전용 기능. 시안 승격 시 어떻게 처리할지 결정 (보존 / 삭제 / 변형)
4. **인라인 privacy 본문** — 광범위한 inline style + 옛 브라운 톤 (`#6C4A33`, `#5C3D2E`, `#7A5238`) 다수. 외부 페이지 전환 시 본문 옮기기 필요
5. **페이지 로컬 `--brown-*` 30회 사용** — 시안 톤으로 마이그레이션 시 모든 사용처 교체

### 🟠 외부 의존

| 의존 | 라이브 | 시안 | 갭 |
|---|---|---|---|
| `tokens.css` | ❌ 미연결 | ✅ `../../../css/tokens.css` | **승격 시 라이브에 link 추가** 필요 |
| `privacy.html` (외부 페이지) | ❌ 없음 | ✅ 291줄 | **시안 폴더에서 라이브 루트로 복사** 필요 |
| `terms.html` (외부 페이지) | ❌ 없음 | ✅ 219줄 | **시안 폴더에서 라이브 루트로 복사** 필요 |
| `app.html` 진입 (가입 후 redirect) | ✅ `window.location.href = "app.html"` | ✅ 동일 | 동일 |
| `login.html` redirect | ✅ | ✅ | 동일 |
| 카카오 오픈채팅 외부 링크 | ✅ | (검증 미진행) | 보존 필요 |

---

## 5. 적용 방식 권장 — **(A) 시안 그대로 승격 (board 패턴)** + 사전 결정 4건

### 권장: (A) — 시안 통째 승격

**근거:**

1. **board가 이미 (A) 옵션 B로 처리됐고 깨끗하게 정착** (`ebb9b3b`) — 같은 패턴 반복이 일관성 + 위생
2. **가입 폼 함수 이미 시안에 이식됨** (`d8a7d50` — `doSubmit` Supabase 연동) → 시안 가입 폼이 이미 동작
3. **시안의 v1 라이트 톤 + 디자인 토큰 시스템이 라이브의 페이지 로컬 옛 브라운보다 정돈** — 승격 = 시스템 통합 효과
4. **라이브의 인라인 privacy 본문은 옛 브라운 hex(`#6C4A33` 등) + 광범위 inline style** — 위생 정리 시점에 시안 외부 페이지 패러다임 전환 자연스러움
5. **board 사례에서 잔여 갭은 후속 정리(`fd12351 fix(board): 잔여 갭 5건 정리`)로 처리** — 이번도 동일 패턴 가능

### 승격 사전 결정 필요 4건

| # | 항목 | 옵션 |
|:---:|---|---|
| 1 | **`inaction-section` 카피 처리** ("통화 중 멈추는 순간, 원세컨드가") | (a) hero로 흡수 / (b) 폐기 / (c) 시안에 신규 섹션 추가 |
| 2 | **`vs-section` BEFORE/AFTER 처리** | (a) 폐기 (시안 단순화 의도 존중) / (b) 시안에 별도 섹션 추가 |
| 3 | **`#togetherIntroOverlay` 처리** | (a) 시안 `together` 섹션 클릭 시 모달 보존 / (b) 모달 폐기, 시안 섹션만 / (c) 모달 → 별도 신규 페이지 |
| 4 | **가입 폼 패러다임** | (a) 시안 인라인 채택 (모달 제거) / (b) 라이브 모달 패러다임 시안에 적용 (시안 하단 인라인 → 모달 변환) |

### 대안 (B) 시안 골격 + 라이브 함수 이식 (옵션 A) — 비권장

이미 가입 폼 함수는 시안에 이식되어 있어 (B)의 실익이 적음. 단 위 결정 4건에서 라이브 모달 패러다임 보존을 강하게 원하는 경우만 검토.

### 대안 (C) 부분 적용 — 사용자가 위험 회피 우선 시 단계 분할

- C-1: 색상 시스템만 v1 라이트 톤으로 (페이지 로컬 `--brown-*` → tokens.css + brand/neutral)
- C-2: 섹션 구조 일부 (hero / signup 등 부분 교체)
- C-3: 전체 리뉴얼 (= (A))

→ 단계 분할은 안전하지만 1주일+ 일정. 메인 트랙 7페이지 진행 속도 저하.

---

## 6. privacy.html / terms.html 처리

### 사실

- **시안 폴더에 두 파일 존재** (privacy 291줄 / terms 219줄, 4/25 작성)
- **라이브 루트에 두 파일 모두 없음**
- 라이브 `#privacy-overlay` 본문은 인라인 모달 (옛 브라운 hex 다수, inline style 광범위)
- 라이브에 별도 terms 모달은 없음 (현재 가입 시 어떻게 표시되는지 확인 필요)

### 권장

- **시안 폴더의 두 파일을 라이브 루트로 그대로 이동·복사** + 시안 패러다임(외부 페이지 링크) 채택
- 라이브 `#privacy-overlay` 인라인 모달 본문 폐기 → 외부 페이지 링크로 전환
- 라이브 `showPrivacy/closePrivacy/confirmPrivacy` JS 폐기 또는 외부 페이지 진입으로 변환
- 단, 가입 모달 안 동의 체크 단계에서 인라인 모달이 필요하다면 그 부분만 보존

### 메모리 기록 검증
"이미 잘 디자인됨"은 시안 파일에 대한 평가로 추정. 라이브 루트에 없으므로 그대로 채택 OK.

---

## 7. 다음 단계 결정 항목 (팀장님)

승격 진행 전 다음 결정 부탁드립니다:

1. **적용 방식**: (A) 시안 통째 승격 / (B) 시안 골격 + 라이브 함수 이식 / (C) 단계 분할 — **권장 (A)**
2. **`inaction-section` 카피 처리** (위 §5 결정 사전 4건 #1)
3. **`vs-section` BEFORE/AFTER 처리** (#2)
4. **`#togetherIntroOverlay` 처리** (#3)
5. **가입 폼 패러다임** (인라인 vs 모달, #4)
6. **privacy/terms 외부 페이지 전환 OK?**

위 결정 후 별도 작업지시서 발행 → board와 동일 패턴(시안 통째 적용 → 잔여 갭 후속 정리)으로 진행 가능.

---

## 8. 참조

- `docs/sessions/_INDEX.md` — 메인 트랙
- `claude_code/design_test/README.md` — 승격 진행 순서 (Phase 1, 1번이 index)
- `docs/index_section_map.md` — 라이브 13섹션 매핑 (4/23 기준 2,386줄, 현재 2,354줄로 32줄 감소)
- `docs/work_order_template.md` — 작업지시서 표준 (0번 큰 그림 정합성 검증 필수)

---

*본 보고서는 코드 수정 0건. index.html / privacy.html / terms.html 어떤 파일도 수정하지 않음.*
