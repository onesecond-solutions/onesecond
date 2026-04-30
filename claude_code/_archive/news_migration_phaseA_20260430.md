# news.html 시안 승격 트랙 — Phase A 분석 (보존본)

> **보존 사유:** 2026-04-30 admin_v2 풀 스케일 구축 작업지시서로 트랙 후순위 폐기 결정 (§4-2).
> **재개 시점:** v1.5~v2.0 보험뉴스 엔진 가동 시점에 함께 처리.
> **작성:** Claude Code, 2026-04-30
> **원본 트랙:** `_INDEX.md` 미해결 #10 (news.html 표준 `.pg-outer` 마이그레이션 + design_test/news/v1-full.html 시안 승격)

---

## 1. 분석 시점 자료

- 라이브: `pages/news.html` (298줄, 2026-04-30 ee64d9a 헤더·푸터 룩 board 통일 직후)
- 시안: `claude_code/design_test/news/v1-full.html` (433줄, 2026-04-25 작성)
- 표준 기준점: `pages/myspace.html` (1671줄, 4/29 저녁 부분 흡수 Phase 1 완주)
- 공통 토큰: `css/tokens.css` L262-266 (`--pg-header-bottom`/`--pg-tab-bottom`/`--pg-content-gap`/`--pg-item-gap`/`--pg-side-padding`)

## 2. myspace 표준 패턴 분석

### 외곽·간격 토큰 (5종, tokens.css L262-266)
- `--pg-side-padding`: 6px (D 영역 .pg-outer 좌우 padding)
- `--pg-header-bottom`: var(--space-4)=16px (header → tab 사이)
- `--pg-tab-bottom`: var(--space-4)=16px (tab → content 사이)
- `--pg-content-gap`: var(--space-4)=16px (안내박스 → 리스트 사이)
- `--pg-item-gap`: var(--space-4)=16px (그리드 아이템 간격)

### 외곽 컨벤션 (myspace L14-22)
```css
.pg-outer {
  padding: var(--pg-side-padding);
  padding-bottom: var(--space-10);
  display: flex; flex-direction: column;
  gap: 0;  /* 블록 간격은 각자 margin-bottom 토큰으로 */
  min-height: 100%;
}
```

### 6개 표준 블록 (board/myspace 공통)
1. `.pg-header-block > .pg-page-header` (헤더, transparent)
2. `.pg-tab-block > .pg-tab-bar > .pg-tab-btn` (박스 래퍼 안 밑줄 탭)
3. `.pg-content-block > .pg-content-inner` (라운드 박스 콘텐츠)
4. `.pg-footer-block > .pg-bottom-bar` (그레이 푸터)

## 3. 라이브 news.html vs 표준 — 차이점 11건

| # | 항목 | 라이브 (현재) | 표준 (myspace) | 처리 |
|:---:|---|---|---|---|
| 1 | 외곽 클래스 | `.news-outer` (height:100% + overflow:hidden) | `.pg-outer` (min-height:100% + 간격 토큰) | 클래스 변경 + 간격 토큰 |
| 2 | 헤더 블록 | `.news-header` (룩만 board 통일됨, ee64d9a) | `.pg-header-block > .pg-page-header` | 래퍼 추가 + 클래스명 변경 |
| 3 | 탭바 | `.news-tab-bar` (박스 래퍼 없음, 밑줄만) | `.pg-tab-block > .pg-tab-bar` (박스 안 밑줄) | 박스 래퍼 추가 |
| 4 | 탭 버튼 | `.news-tab-btn` (밑줄형) | `.pg-tab-btn` (밑줄형, 거의 동일) | 클래스명 변경 |
| 5 | 콘텐츠 영역 | `.news-content` (flex:1 + overflow:auto + padding 16px) | `.pg-content-block > .pg-content-inner` (라운드 박스) | 박스 래퍼 추가 |
| 6 | 카드/리스트 | `.news-card` 카드형 (border + radius + margin 10px 하드코딩) | 시안 `.news-item` 리스트형 (border-bottom만) | **결정 필요 (Q1)** |
| 7 | 카테고리 배지 | `--color-accent` 단일 톤 | 시안 `--brand-50/--brand-500` 브라운 톤 | **결정 필요 (Q2)** |
| 8 | 푸터 | `.news-footer` (룩만 board 통일됨, ee64d9a) | `.pg-footer-block > .pg-bottom-bar` | 래퍼 추가 + 클래스명 변경 |
| 9 | 간격 하드코딩 | margin-bottom 10px / padding 16px / gap 12px 등 | `var(--pg-content-gap)` `var(--pg-item-gap)` | 토큰 치환 |
| 10 | JS 셀렉터 | `.news-tab-btn` (querySelector) | `.pg-tab-btn`로 변경 필요 | JS 1줄 변경 |
| 11 | 데이터 fetch | Supabase `news` 테이블 (`window.newsFilterTab`) | 라이브 함수 이식 (옵션 A) | 유지 |

## 4. 마이그레이션 Plan

### 변경 라인 수 추정
- 라이브 news.html: 298줄 → 약 290~310줄
- CSS 영향: 약 80~100줄 변경
- HTML 영향: 외곽~본문 약 30~50줄 재구성
- JS 영향: 약 5~10줄 (셀렉터 + 렌더링 함수)

### 영향 범위
- CSS: news.html 인라인 `<style>` 블록만 (tokens.css 변경 없음)
- HTML: news.html 골격 전면 재구성 (외곽 → 콘텐츠까지 6개 블록 표준 구조)
- JS: news.html 인라인 `<script>` 내 `newsFilterTab` 셀렉터 + `newsRender` 렌더 템플릿 변경 (Supabase fetch·`AppState.ready` 부트는 100% 보존)
- app.html / app.js / 다른 페이지: 변경 없음

### 위험 요소

| 위험 | 영향도 | 대응 |
|---|:---:|---|
| `.news-tab-btn` → `.pg-tab-btn` 셀렉터 변경 시 JS 미갱신 → 탭 작동 불가 | 🔴 높음 | querySelector 동시 변경 + 라이브 검수 시 탭 4개 클릭 확인 |
| 콘텐츠 영역 스크롤 동작 변경 (`flex:1; overflow-y:auto` → `.pg-content-block { flex:1 }`) | 🟡 중간 | myspace에서 동일 구조로 작동 검증됨 (작업지시서 #10 해소 동기) |
| Supabase 데이터 0건/오류 시 빈 상태(`#news-empty`) 표시 흐름 끊김 | 🟡 중간 | 시안의 `.news-empty` 클래스 보존 (DOM ID도 호환) |
| `.news-card` 카드 → 리스트 전환 시 사용자 시각 변경(확인 필요) | 🟠 낮음 | **결정 항목 #6(Q1) 응답 따름** |
| design_guide 브라운 면적 20% 원칙 — 시안의 brand-50/500 카테고리 배지 그대로 가져오면 카드 6~10개 분량 미세 증가 | 🟢 낮음 | 카테고리 배지는 작은 칩 단위 (전체 면적 무시 수준) |

## 5. 결정 대기 항목 (Phase B 진입 전 답변 필요)

### Q1. 카드 vs 리스트 — 콘텐츠 내부 골격
- (a) 시안 그대로 리스트형 (`.news-list > .news-item`, border-bottom 구분, board와 동일) — 작업지시서 옵션 A "시안 골격 채택" 문구와 정합
- (b) 라이브 카드형 유지 — 카드 외곽선 + radius + margin, 시안 골격은 외곽만 채택하고 내부는 카드 유지

> **권장: (a)**. 작업지시서 옵션 A 명시 + board.html과 일관성 + design_guide "여백 우선·브라운 면적 축소"에 부합.

### Q2. 카테고리 배지 톤
- (a) 시안 그대로 brand-50 + brand-500 (브라운 톤 칩, 작은 면적이라 20% 원칙 영향 없음)
- (b) 라이브 그대로 `--color-accent` + `--color-surface-2` (오렌지 액센트)

> **권장: (a)**. 시안 채택 정합 + 카테고리 4종이라 작은 면적.

### Q3. 시안 v1-full에 있는 chrome 코드 (topbar/menu/footer 등) 처리
- 시안 `v1-full.html`은 standalone HTML로 chrome까지 포함. 라이브 news.html은 app.html 내부에서 콘텐츠 영역만 차지하는 partial. **chrome 코드는 100% 무시·미이식** (myspace 승격과 동일 패턴).

### Q4. 카드/아이템 데이터 click 동작
- 라이브 동작 보존: `<a class="news-card-link" href="..." target="_blank">` 원문 보기 링크 유지 / 시안의 시연용 alert는 폐기.

## 6. 미해결 이슈 #10 처리

본 마이그레이션 완주 시 `_INDEX.md` 미해결 #10(news 표준 `.pg-outer` 마이그레이션) 자동 해소.

## 7. 트랙 재개 시 진입점

1. 본 문서 정독 → 분석 결과 그대로 활용
2. Q1·Q2 답변 받기 (재개 시점 다시 확인)
3. Phase B 코드 작성 진입
4. Phase C 라이브 검수 (4페이지 일관성)
5. _INDEX.md 미해결 #10 해소 처리

---

*폐기 결정 근거: 보험뉴스 메뉴 숨김 결정으로 사용자 동선 단절 + 라이브 룩 통일 우선순위 0 + v1.5~v2.0 보험뉴스 엔진 가동 시점에 함께 처리 (작업지시서 §4-2).*
