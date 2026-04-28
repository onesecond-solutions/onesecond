# index.html 섹션 매핑 (한 장)

> **기준 시점:** 2026-04-28 · 총 2,045줄 (시안 v1-full 통째 승격 후)
> **기준 커밋:** (이번 커밋에서 갱신 — `git log -1` 기준)
> **갱신 사유:** design_test/index/v1-full.html 시안 통째 승격(`feat(index): v1 시안 전면 승격`)으로 13섹션 구조 → 6섹션 + 네비 + 푸터 + 모달 1개 구조로 재편.

| 영역 | 라인 | 섹션 클래스 / 태그 | 역할 (한 줄) | 핵심 카피 |
|:---:|:---:|---|---|---|
| 헤더 | 1308–1330 | `<nav class="nav" id="nav">` | 헤더 네비 (브랜드 + 인페이지 앵커 5개 + Sticky scrolled) | 원세컨드 1s · 소개 / 문제와 해답 / 6가지 기둥 / 함께해요 / 사용 대상 |
| A | 1332–1430 | `<section class="hero" id="hero">` | 히어로 (랜딩 메인) | (시안 카피 — 검수 후 확정) |
| B | 1432–1501 | `<section class="pain" id="pain">` | 문제와 해답 (라이브 reality-section 대응) | — |
| C | 1503–1560 | `<section class="pillars" id="pillars">` | 6가지 기둥 (라이브 features 5카드 → 6 기둥) | 원세컨드의 6가지 기둥 |
| D | 1562–1585 | `<section class="together" id="together">` | 커뮤니티 CTA — 클릭 시 `togetherIntroOverlay` 트리거 | 함께 만들어가는 원세컨드 |
| E | 1587–1623 | `<section class="target" id="target">` | 사용 대상 (설계사·매니저·보험사) | — |
| F | 1625–1794 | `<section class="signup" id="signup">` | 무료 가입 (인라인 폼, 모달 아님) | GET STARTED · 무료회원 가입하기 |
| 푸터 | 1796–1815 | `<footer class="footer">` | 푸터 (브랜드 + 서비스 소개 + 약관·개인정보 + 카카오) | © 2026 onesecond |
| 모달1 | 1817–1835 | `<div class="together-intro-overlay" id="togetherIntroOverlay">` | TOGETHER 인트로 모달 (D 섹션 CTA 트리거 → 가입 섹션 스크롤) | 함께 만들어가는 원세컨드 |

> **2026-04-28 폐기된 라이브 섹션** (시안 통째 승격으로 자연 제거):
> - `<section class="inaction-section">` (옛 B) — 폐기, 카피 비흡수 (사용자 결정 §5-2: 폐기)
> - `<section class="vs-section">` (옛 E, BEFORE/AFTER) — 폐기 (사용자 결정 §5-3: 폐기)
> - `<section class="target-cta-section">` (옛 G) → 시안 `target` 섹션으로 단순 흡수
> - `<section class="together-section">` (옛 H) → 시안 `together` 섹션으로 흡수
> - `#overlay` 가입 모달 (옛 모달1) → 시안 `<section class="signup">` 인라인 폼으로 패러다임 전환 (사용자 결정 §5-5: 인라인 채택)
> - `#privacy-overlay` 인라인 본문 모달 (옛 모달2) → `privacy.html` 외부 페이지로 분리 (사용자 결정 §5-6: 외부 페이지 전환)
>
> **외부 페이지 (별도 파일)**:
> - `privacy.html` — 개인정보처리방침 (가입 동의 체크박스 새 탭 진입)
> - `terms.html` — 이용약관 (가입 동의 체크박스 새 탭 진입)

**갱신 규칙**
- 스크롤 순서는 헤더 → A→B→C→D→E→F → 푸터. 모든 메인 섹션은 `<section>` 표준 (옛 C영역의 `<div class="hero-wrap">` 이슈 해소).
- `<section>` 태그 추가·삭제·이름 변경, 또는 라인 범위 이동 시 이 문서도 같은 커밋에서 업데이트.
- 인페이지 앵커 5개(`#hero`, `#pain`, `#pillars`, `#together`, `#target`, `#signup`)는 `<nav>` 메뉴와 1:1 매핑 (스크롤 위치 따라 `nav-item.active` 토글).
- 모달은 영역 알파벳 미부여 (메인 플로우와 독립적으로 트리거되므로). `togetherIntroOverlay`만 라이브 잔존 (`#overlay`, `#privacy-overlay`는 폐기).
