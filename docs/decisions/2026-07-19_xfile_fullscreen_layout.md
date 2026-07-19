# 2026-07-19 X-FILE = 풀스크린 레이아웃 영구 운영 원칙

> **대표 확정(2026-07-19).** X-FILE(허브·보험 팩토리·"내 보험 어때?"·향후 추가 화면 전체)은 **진입 자체가 풀스크린**이다. 앱 사이드바를 제외한 오른쪽 콘텐츠 영역 전체(가로+세로)를 쓴다. X-FILE 밖 일반 화면(홈 등)은 기존 폭 제한을 그대로 유지한다.

## 배경

- `#v-xfile`은 `app.html`에서 `<div class="wrap view" id="v-xfile">` — 앱 공통 컨테이너 클래스 `.wrap`(`css/app-views.css:900`, `max-width:1500px`)을 그대로 물려받고 있었다.
- 이 1500px 상한과 `js/xfile.js` 주입 CSS의 860px 카드 상한 + `margin:0 auto` 중앙정렬은 **대표 의도가 아니었다** — X-FILE은 대표가 데스크톱 풀와이드에서 쓰는 작업 도구인데, 일반 콘텐츠 화면(홈 등)과 같은 폭 제한을 그대로 상속받아 넓은 모니터에서 가운데 좁은 박스로 갇혀 있었다.
- 세로도 마찬가지 — `pages/insurance-factory.html`의 `.if-workspace{height:720px}` 고정 높이 때문에 브라우저를 아무리 키워도 3컬럼 작업실이 남는 세로를 못 썼다.

## 원칙

1. **진입 자체가 풀스크린.** 특정 화면에서만 클래스를 켰다 껐다 하는 토글 방식이 아니라, `#v-xfile`(id 선택자)이 `.wrap`(class 선택자)보다 CSS 특이도가 높다는 점을 이용해 X-FILE 뷰가 DOM에 존재하는 동안은 항상 풀스크린이 되도록 만든다. `#v-xfile`은 X-FILE 뷰일 때만 존재하므로 "진입=자동 풀스크린 / 이탈=일반 폭 유지"가 별도 상태 관리 없이 성립한다.
2. **전역 `.wrap` 규칙(`css/app-views.css:900`)은 절대 변경하지 않는다.** X-FILE 전용 규칙은 전부 `#v-xfile` 스코프 안에서만 선언한다(`js/xfile.js`의 `injectStyleOnce` 주입 CSS).
3. **X-FILE 밖 일반 화면은 회귀 0.** 홈을 비롯한 다른 뷰는 여전히 `.wrap`의 `max-width:1500px`을 그대로 따른다 — X-FILE에서 다른 화면으로 나가면 즉시 원래 폭으로 돌아온다.
4. **세로도 같은 원칙.** 앱 헤더 아래~브라우저 하단까지 남은 세로를 전부 채운다. 매직넘버 `calc(100vh - 74px)` 같은 고정 오프셋 대신, `.main`(100vh) → `.body` → `#v-xfile` → 화면별 콘텐츠로 이어지는 flex/grid 높이 사슬을 연결해 어떤 화면 높이 조합에서도 안전하게 계산되도록 한다.
5. **내부 콘텐츠는 필요하면 그 안에서만 좁힌다.** 예: "내 보험 어때? v2.0"은 모바일 폰 프레임을 그대로 보여주는 미리보기라 `max-width:520px`로 의도적으로 좁게 유지한다. 이런 개별 콘텐츠 단위의 폭 제한은 허용하되, **X-FILE 바깥 컨테이너(`#v-xfile` 자체, `.xf-card`, `.xf-topbar` 등 최상위 래퍼)가 860px/1500px로 강제 제한해서는 안 된다.**

## 구현 요약 (`feat/xfile-fullscreen-layout`)

- `js/xfile.js` (`injectStyleOnce` 주입 CSS): `#v-xfile{max-width:none;width:100%;display:flex;flex-direction:column;...}` 추가 — `.wrap`의 `max-width:1500px`뿐 아니라, 앱 공통 `.view.on{display:block}`(2클래스, 특이도가 `.wrap{display:flex}`보다 높음)이 `#v-xfile`의 실제 레이아웃을 block으로 강제하던 기존 결함도 함께 바로잡았다. `.xf-topbar`/`.xf-card`의 860px 상한 + `margin:0 auto`를 제거해 `width:100%`로 전환. 보험 팩토리 iframe(`.xf-card-factory`/`.xf-factory-frame`)은 `flex:1` 체인으로 남은 세로 전부를 채우도록 변경(기존 `calc(100vh - 74px)` 매직넘버 폐기).
- `pages/insurance-factory.html`: `.if-app{height:100vh;overflow:hidden}` · `.if-main{grid-template-rows:auto 1fr auto}` · `.if-workspace{height:100%}`(기존 `height:720px` 고정 폐기)로 이어지는 grid 높이 사슬을 만들어 3컬럼 작업실이 실제 남은 세로를 채우게 했다. 3컬럼 내부는 기존 `.if-col`/`.if-scroll`(`flex:1;min-height:0;overflow:auto`) 패턴이 이미 독립 스크롤을 구현하고 있어 그대로 재사용. 860px 이하 모바일은 기존 `.narrow` 폴백(3컬럼 숨김 + 안내 문구)을 그대로 유지, `.if-main`도 모바일 미디어쿼리 안에서 `auto auto auto`로 되돌려 회귀를 방지했다.

## 적용 범위

X-FILE 허브 · 보험 팩토리 · "내 보험 어때?"(check·check-v2) · 향후 X-FILE 하위에 추가되는 모든 화면(의료실비/암/뇌·심장/수술비/종합보험/보장분석/간병인 등 현재 "준비 중" 자리 포함) — 전부 이 풀스크린 원칙을 상속한다. 새 X-FILE 화면을 추가할 때 별도 CSS 작업 없이 `#v-xfile` 하위에만 넣으면 자동으로 풀스크린이 적용된다.

## 검증

1366 / 1440 / 1920px 데스크톱 폭 + 390px 모바일 폭에서 `.main`/`#v-xfile`/보험 팩토리 3컬럼의 computed width·height를 직접 측정해 확인(가로·세로 모두 잔여 영역을 정확히 채움, `overflow-x` 0, 콘솔 에러 0). 홈 화면은 1920px에서도 `max-width:1500px` 그대로 유지되어 X-FILE 진입·이탈 전환에 회귀가 없음을 확인. 상세 측정치는 PR 본문 참고.
