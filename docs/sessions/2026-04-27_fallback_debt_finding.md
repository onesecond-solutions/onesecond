# 옛 브라운 fallback 부채 발견 — 2026-04-27

> **발견 시점:** 2026-04-27 PR 2 (board 잔여 정리) 2-2 사전 점검 단계
> **발견자:** Claude Code (PR 2 작업 전 board.html grep 점검 중)
> **현재 처리:** PR 2는 옵션 A(보고서 명시 5건만)로 축소 진행. 본 부채는 별도 PR 트랙으로 이송

---

## ① 발견 경위

PR 2 (board 잔여 정리) 2-2 단계에서 작업 전 사전 보고를 위해 board.html의 옛 브라운 fallback 위치를 grep으로 정확 확인하던 중, 갭 분석 보고서(`docs/sessions/2026-04-27_gap_analysis.md` board 섹션)가 명시한 2건(`.pg-content-block`의 `var(--color-bg, #FAF8F5)` / `var(--color-border, #E4DBCE)`) 외에 **board.html 전체에 옛 브라운 fallback이 약 90건+ 잔존**한다는 사실을 확인.

```
grep pattern: var\(--color-(bg|surface|surface-2|border|text-primary|text-secondary|text-tertiary)\s*,\s*#
target: pages/board.html
result: 약 80건 (CSS) + 약 11건 (JS 인라인) = ~91건
```

(예외: `var(--color-surface, #fff)` 형태는 흰색 fallback이라 회귀 위험 없음 — 정리 대상에서 제외)

---

## ② 영역별 건수

### CSS `<style>` 블록 (board.html line ~140 ~ ~750) — 약 70건

옛 브라운 7값 fallback 패턴:
- `var(--color-border, #E4DBCE)` — 옛 웜 베이지
- `var(--color-bg, #FAF8F5)` — 옛 크림
- `var(--color-surface-2, #F3EFE9)` — 옛 베이지
- `var(--color-text-primary, #3D2C1E)` — 옛 다크 브라운
- `var(--color-text-secondary, #7A5C44)` — 옛 미디엄 브라운
- `var(--color-text-tertiary, #B89880)` — 옛 라이트 브라운

**주요 사용처**: `.cat-pill`, `.empty-*`, `.loading-*`, 모달(detail/write/insurer), 댓글, attach, 입력 폼, 버튼 등 board UI 거의 전체

### JS 인라인 스타일 문자열 — 약 11건

라인: 1053, 1219, 1220, 1226, 1227, 1571, 1578, 1579, 1759, 1775, 1777

동적 HTML 생성 시 `'background:var(--color-surface-2,#F3EFE9);'` 형태로 옛 브라운 fallback 문자열 포함. 댓글 렌더링·인수기준 카드·attach 빈 상태·detail 모달 등에서 발견.

---

## ③ 갭 분석 보고서의 한계 — 부분만 본 비교

`docs/sessions/2026-04-27_gap_analysis.md`의 board 섹션은 sub-agent가 시안 vs 라이브 비교 시 **`.pg-content-block` 영역만 자세히 봤기 때문에** 그 외 fallback이 누락됨.

- 보고서: 색상 fallback 잔존 = 2건 (`.pg-content-block` 배경/border)
- 실제: 색상 fallback 잔존 = 약 90건+ (CSS 블록 + JS 인라인)
- **보고서는 실제 부채의 약 1/45에 해당하는 부분만 명시** = 보고서 단독으로 작업 범위 산정 시 위험

### 이 한계가 의미하는 것

1단계 갭 분석은 **시안과 라이브의 디자인 의도 차이**를 추출하는 데는 적합했으나, **라이브 코드의 코드 품질·기술 부채(fallback 표기 정합성)**까지 전수 점검하지는 못함. 두 작업은 다른 성격이며, 후자는 별도의 sweep 단위 점검이 필요.

---

## ④ 9개 페이지 전체 동일 패턴 가능성 — 매우 높음

board는 1개 페이지 표본. 같은 부채가 다른 8개 페이지(home / admin / myspace / quick / scripts / together / news / index)에도 동일 패턴으로 존재할 가능성 매우 높음.

근거:
- 모든 페이지는 같은 옛 브라운 토큰 시대(2026-04-15 이전)에 작성됨
- 갭 분석 1차 보고서에서 "fallback 표기 부채 패턴" 이미 4페이지(quick, together, board, myspace) 잔존 확인
- shell-v1 머지에서 글로벌 토큰을 시안 값으로 갱신했으나 페이지 코드의 fallback 표기는 그대로 둠 (실효 렌더만 갱신, 코드 정합성은 미수반)

전체 9개 페이지 fallback 부채 추정 규모: **약 500~900건+** (board 90건 × 6~10 페이지 비례 추정)

---

## ⑤ 다음 PR 트랙으로 이송 — 통합 sweep PR 권장

### 처리 방향

- **PR 2 (현재)**: 옵션 A 채택 — 보고서 명시 5건만 정리. 회사 시간 슬롯 내 PR 0 검수와 함께 안전 마무리.
- **PR ?? (별도 트랙)**: 9개 페이지 fallback 통합 sweep. 단일 PR로 묶음 처리 또는 페이지별 분리 처리 결정 필요. 작업지시서는 팀장님이 별도 의뢰 예정.

### 통합 sweep PR 시 고려사항

1. **CSS 영역 자동 정리** — 정규식 sweep 가능
   ```
   var\(--color-border,\s*#E4DBCE\)         → var(--color-border)
   var\(--color-bg,\s*#FAF8F5\)             → var(--color-bg)
   var\(--color-surface-2,\s*#F3EFE9\)      → var(--color-surface-2)
   var\(--color-text-primary,\s*#3D2C1E\)   → var(--color-text-primary)
   var\(--color-text-secondary,\s*#7A5C44\) → var(--color-text-secondary)
   var\(--color-text-tertiary,\s*#B89880\)  → var(--color-text-tertiary)
   ```

2. **JS 인라인 정리** — 정규식 sweep 가능하지만 동적 HTML 생성 코드라 문자열 안에서 변경. 의미는 CSS와 동일하지만 안전성 확인 필요.

3. **회귀 리스크** — PR 0 검수에서 글로벌 토큰 시안 값 적용은 PASS 입증됨. fallback 제거 후에도 글로벌 토큰이 정의된 환경에서는 실효 렌더 동일.

4. **검증 체크포인트** — 글로벌 토큰을 일시적으로 미정의 처리해 fallback이 동작하는 상황을 막아야 — 그러나 토큰은 항상 정의되므로 실제 환경에서는 영향 없음.

### 단일 PR vs 페이지별 PR

- **단일 sweep PR (권장)**: 정규식 일괄 처리 → 한 번의 검수로 9개 페이지 정리. 검수는 페이지별 시각 회귀 점검.
- **페이지별 PR**: 페이지마다 검수 단계 필요해 시간 ↑. 단 회귀 발생 시 격리 ↑.

---

## 작업 원칙 시사점

이번 발견은 다음 두 가지를 시사한다:

1. **사전 점검 단계 가치 입증** — "작업 전 grep으로 정확 확인" 절차가 갭 분석 보고서의 부분 누락을 잡아냄. 갭 분석은 디자인 비교, 사전 점검은 코드 정합 — 두 단계 모두 필요.

2. **갭 분석 보고서의 활용 범위** — 디자인 의도 도출과 우선순위 분류에는 충실. 라이브 코드 부채 전수 점검에는 부분적. 두 목적을 분리해야 함.

---

*다음 세션에서 통합 sweep PR 작업지시서 의뢰 예정. 본 메모는 그 PR의 기준 문서로 활용.*
