# 원세컨드 컨텍스트 업데이트 — 2026-04-23 home 페이지 준비 완료

> **작성일:** 2026-04-23
> **세션 종료 시점:** home.html 신규 작성 직전 (Step 1 진입 직전)
> **다음 세션 시작 지점:** 지시서 v3.1의 Step 1 — `pages/home.html` 신규 작성
> **PC 위치:** 집 PC

---

## 🎯 1. 오늘 완료된 작업

### 1-1. pull 충돌 정리 (옵션 A — 단편 머지)
- origin/main에 미반영 16개 untracked 파일 발견 → diff 비교 후 정리
- **SAME 13개:** 삭제 (origin 버전이 들어옴)
- **`.gitignore`:** origin 살리기 (origin이 신규 통합본 + `!claude_code/**` 예외 포함)
- **`Supabase Snippet List Public Tables.csv`:** origin 살리기 (LF/CRLF 차이만)
- **`design_guide.md`:** 단편 머지 (로컬 301줄 + origin 이력 4건 흡수 = 322줄)
  - A. 헤더 그라데이션 마이그레이션 노트 흡수
  - B. CDN 로드 방법 소섹션 흡수
  - C. 라운드 원칙 코멘트 한 줄 확장
  - D. ## 14 변경 이력 섹션 신설 (2026-04-15 / 04-20 / 04-23 행)
- **커밋:** `a163de0 docs(design): origin 이력 흡수 + 로컬 운영본 통합`

### 1-2. tokens.css 검증 (수정 없음, 보고만)

**🟥 불일치 2건 (home.html 작성 시 직접 영향):**
| 항목 | design_guide | tokens.css 실제 | 처리 |
|---|---|---|---|
| `--together-bg`, `--together-accent` | `#F9E4D5`, `#c8753a` 명시 | **미정의** | home.html에서 사용 불가, 일반 토큰 대체 |
| 작은 설명 폰트 | `0.632em` | `--text-xs: 0.684em` | **tokens 실값 0.684em 신뢰** |

**🟢 design_guide 미문서화이지만 home.html에 적극 활용 권장:**
- `--gradient-header` (헤더 배경)
- `--color-success/danger/warning/info`
- `--color-overlay/-dark`, `--color-sidebar-bg/text/active/hover`
- **`--fw-regular(400) / medium(500) / semibold(600) / bold(700) / black(900)`** (폰트 가중치)
- `--shadow-sm/md/lg/xl`
- **`--transition-fast(0.12s) / normal(0.18s) / slow(0.28s)`**
- `--sidebar-width 220px`, `--rightbar-width 220px`, `--header-a1 80px`, `--header-a2 70px`

**🟢 공통 유틸리티 클래스 (`tokens.css:142~324`) — 재정의 금지, 그대로 사용:**
- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost` → 지시서 4-8 하단 CTA 3개에 그대로 활용
- `.card`, `.input`, `.loading-placeholder`, `.page-header`, `.section-title`

### 1-3. 지시서 v3.1 보강 (팀장님 직접 수정)
- **3.5절** "공통 자산 활용 원칙" 신규 추가 (tokens 검증 결과 반영)
- **Step 0**에 tokens.css 숙지 + 지시서 3.5절 정독 추가
- **보고 형식 11-5** "공통 자산 활용 결과" 항목 추가

### 1-4. app.html 준비
- `window.loadQuickDdItems = loadQuickDdItems;` 한 줄 추가
- 위치: `app.html:1397` (toggleQuickDropdown 다음 줄 — 빠른실행 짝 함수 인접)
- 정렬: 4공백 패딩으로 인접 라인과 `=` 위치 통일

### 1-5. 커밋 + 푸시
- `ae87448 chore: home 페이지 준비 — loadQuickDdItems 전역 노출 + 지시서 v3.1 보강`
- 2 files changed, 956 insertions (app.html +1, 지시서 +955)

---

## 🎯 2. 다음 세션 시작 지점

**작업:** 지시서 v3.1의 **Step 1** — `pages/home.html` 신규 작성 (기존 447줄 완전 교체)

**확정된 결정 사항 (이전 세션 Q1~Q5):**

| Q | 항목 | 결정 |
|---|---|---|
| Q1 | 어제 재작성본 처리 | **신규 작성** (재활용 0%, 디스크에 380줄 재작성본 없었음) |
| Q2 | 기존 4개 패널 | **완전 제거** (나의 스크립트 / 보험뉴스 / 최신 게시글 / Leader Pick) |
| Q3 | 검색기 인라인 미리보기 | **(a) Enter만 작동.** 실시간 드롭다운 ❌, fetchSearchPreview 재구현 ❌, A2 mirror ❌. placeholder "검색어 입력 후 Enter", 안내 "💡 Enter를 누르면 스크립트, 게시글, 업무자료를 한번에 검색할 수 있어요" |
| Q4 | `window.loadQuickDdItems` 노출 | ✅ **추가 완료** (커밋 `ae87448`) |
| Q5 | `home-upgrade-bar` (PRO 띠) | **제거.** 6각 홈에 포함 안 함 |

---

## 🎯 3. 다음 세션 첫 명령

**병렬 view (3개):**
1. `claude_code/_instructions/20260423_home_hexagon_spec.md` (지시서 v3.1 — 특히 3.5절·Step 0·11-5 신규 항목)
2. `css/tokens.css` 142~324줄 (공통 유틸리티 클래스 — `.btn`/`.card`/`.input`/`.loading-placeholder`/`.page-header`/`.section-title`)
3. `app.html` 1395~1402줄 (loadQuickDdItems 노출 라인 확인)

**그 후:** Step 1 — `pages/home.html` 신규 작성 시작 (~500줄 대공사 예상)

---

## 🎯 4. home.html 작성 시 핵심 주의사항

- **금지:** `index.html`, `home.html` (백업 없이 직접 교체 — 마음의 준비), `tokens.css`, 다른 `pages/*.html`, `auth.js`
- **A2 구조 수정 금지** — home.html에서 다음 함수만 **호출**:
  - `window.toggleQuickDropdown`
  - **`window.loadQuickDdItems`** ← 오늘 추가됨
  - `window.openQuickOverlay(key)`
  - `window.doSearch(q)` (Enter 시)
- **검색 미리보기 결정 근거:** A2의 `fetchSearchPreview`(app.html:1129)는 `#search-dropdown` ID 하드코딩. home에서 재사용 시 결과가 잘못된 곳에 표시됨 → 그래서 Q3 = (a) Enter만 작동
- **모바일 breakpoint:** 640px (지시서 5-1)
- **공통 자산 우선:** 새 클래스 정의 전에 tokens.css의 공통 클래스 사용 가능 여부 먼저 확인
- **폐기 원칙:** `pages/welcome.html` 생성 ❌, Supabase 스키마 변경 ❌, feature flag 추가 ❌

---

## 🎯 5. 보존된 폐기 항목

- `claude_code/_instructions/20260422_welcome_page_spec_v2.md` — welcome.html 신설 방침 폐기. **untracked로 보존 중** (삭제 X). 다음 세션에서도 add 하지 말 것
- DB 재설계 작업 (`20260420_db_full_reset.md`)은 별도 트랙. 현재 home.html 작업과 무관

---

## 🎯 6. 환경 상태 (세션 종료 시점)

- **브랜치:** `main` (origin/main과 동기화 완료)
- **마지막 커밋:** `ae87448 chore: home 페이지 준비 — loadQuickDdItems 전역 노출 + 지시서 v3.1 보강`
- **이전 커밋:** `a163de0 docs(design): origin 이력 흡수 + 로컬 운영본 통합`
- **untracked 1개:** `claude_code/_instructions/20260422_welcome_page_spec_v2.md` (의도된 보존)
- **사이트 동작:** 정상 (오늘 작업은 라이브 영향 없음 — app.html에 window 노출 한 줄 추가뿐)

---

## 📝 다음 세션 시작 한 줄 요약

> "지시서 v3.1 + tokens.css 142~324줄 + app.html 1395~1402줄을 병렬 view 한 다음, Q1~Q5 결정대로 `pages/home.html` 신규 작성 시작."
