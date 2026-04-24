# home 페이지 디자인 테스트 노트

## v1 (2026-04-25)

### 🛠️ v1 후속 수정 (2026-04-25 03:56)

**문제**: 어제(2026-04-24, 커밋 `664df74`)에서 확정된 홈 레이아웃 2가지를 v1 오버라이드가 덮어버렸음.

| 원본 home.html | v1 초안(잘못) |
|---|---|
| `.home-intro-header` `padding: 12px 16px 12px 30px` (좌측 30px) | `padding: 24px 0 40px` — 좌측 이동 제거됨 ❌ |
| `.home-hex-wrap` `margin-top: calc(-40px * 4) = -160px` (상승) | `margin: 16px auto 56px` — 수직 상승 제거됨 ❌ |

**수정**: 홈 레이아웃은 어제 상태 그대로 유지. `.home-intro-header`, `.home-hex-wrap`, `.home-intro-title`, `.home-intro-sub` 오버라이드 전부 제거. 색상·호버 하이라이트만 유지.

**교훈**: 팀장님의 "여백 확대" 지시는 "홈을 제외한 다른 페이지들이 촘촘"한 문제를 가리킨 것. 홈은 이미 정리된 레이아웃이라 건드리면 안 됨.

---

### 무엇을

`pages/home.html`의 원본 구조·레이아웃은 100% 유지한 채, 색상 토큰만 중성화한 테스트 버전.

### 왜

- **브라운 과잉**: 원본은 전체가 웜 테라코타 브라운으로 물들어 있어 "강조"가 작동하지 않음
- **촘촘함**: 홈 외 다른 페이지가 전반적으로 답답해 보이는데, 동일 시스템(토큰)으로 구현되어 있어 홈에서도 원칙을 미리 검증할 필요

### 어떻게

#### 1. :root 토큰 오버라이드 (tokens.css 수정 없음)

```css
--color-bg:             #FAF8F5 → #FFFFFF
--color-surface-2:      #F3EFE9 → #F6F7F9
--color-border:         #E4DBCE → #E5E7EB
--color-text-primary:   #3D2C1E → #1F2937
--color-text-secondary: #7A5C44 → #6B7280
--color-text-tertiary:  #B89880 → #9CA3AF
--gradient-header:      브라운 그라 → transparent
--shadow-* :            웜 브라운 → 뉴트럴 차콜
```

`--color-brand (#A0522D)` / `--color-brand-light (#C4733A)` / `--color-accent (#D4845A)` **값은 유지**. 사용처만 강조 포인트로 한정.

#### 2. 브라운이 남는 지점 (의도적)

- `.home-intro-badge` 텍스트 — `--color-accent` 유지 (배지 포인트)
- `.home-intro-title .accent` "원세컨드" 단어 — `--color-accent` 유지 (문구 강조)
- `.home-hex-tip-header` 툴팁 헤더 — `--color-brand` 유지 (대화 포인트)
- `.home-hex-tip-cta` CTA 버튼 — `--color-accent` 채움 유지
- `.home-hex-node` 호버 fill — 옅은 웜 `#FFF8F3` (인터랙션 피드백)

#### 3. 여백 (홈은 제외)

홈은 어제 레이아웃 그대로 유지 (좌측 30px 카피 · -160px hex 상승). 여백 확대 원칙은 **홈 외 다른 페이지**에 적용 예정.

**v1-full.html에서만 적용된 전역 여백**:
- `.d-inner`: `padding: 40px 32px` + `max-width: 900px` (콘텐츠 영역 여백)
- B 사이드바: `padding: 32px 16px` (원본 `24px 16px`에서 약간 확대)
- C 우측바 `.c-box` 내부: `padding: 20px` (원본 `16px`에서 확대)

### 미리보기

2가지 버전:

**v1.html — 콘텐츠 영역만**
```
C:\limtaesung\github\onesecond\claude_code\design_test\home\v1.html
```
→ home.html 콘텐츠만 단독 프리뷰 (프레임 없음)

**v1-full.html — app.html 쉘 포함 완전체** ✅ 추천
```
C:\limtaesung\github\onesecond\claude_code\design_test\home\v1-full.html
```
→ A1 헤더 + A2 헤더 + B 사이드바 + D 콘텐츠 + C 우측바 + 푸터 전체 프레임 포함
→ 실제 원세컨드 화면과 동일한 구성, 디자인 원칙 전체 적용

더블클릭 → 브라우저. 예상 결과:
- 전체 톤이 순백 + 뉴트럴 그레이 (브라운 기반 95% 제거)
- A1 헤더: 브라운 그라데이션 → 순백 + 하단 보더
- B 사이드바: 브라운 그라 → 쿨 오프화이트 + 활성 메뉴만 브라운
- 푸터: 브라운 → 쿨 오프화이트
- 6각형은 그대로, 호버 시에만 옅은 웜 하이라이트
- 중앙 로고, 툴팁 헤더(갈색), 활성 메뉴(브라운 채움), 액센트 단어만 포인트로 살아있음
- 섹션 간 여백이 원본보다 넓음

### 알려진 제한 (테스트 독립 실행 한계)

- 6각형 노드의 "바로가기" 버튼 클릭 → `switchMenu` 스텁이 alert 표시
- 🔍 검색기 노드 → Enter 누르면 `doSearch` 스텁 alert
- ⚡ 빠른실행 노드 → "TEST 모드: 프로덕션 환경에서만 동작" 메시지 표시
- 이상은 의도적 — 디자인 확인만 목적

### 다음 버전 후보

- v2: 여백을 한 단계 더 (카드 padding 40px, card gap 56px) — "에어리" 방향 극단
- v3: 다크 모드 기본값 검토
- v4: Primary 버튼 컬러를 비-브라운(예: 슬레이트)으로 교체했을 때 브랜드 정체성 유지 여부
