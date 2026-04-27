# fallback sweep 진입 전 시스템 안정성 진단 — 2026-04-27

> 생성: 2026-04-27T21:30 (KST)
> 목적: sweep 작업 안전성을 가정 아닌 실증으로 확보
> 출처 도구: `git show` / `git log` / `git status` / `git branch -r --merged` / `grep -o` / `awk` 슬라이싱

---

## 진단 1 — tokens.css 본체 실제 상태

### 현재 main의 정의 (`git show main:css/tokens.css` 기준)

| 토큰 | 현재 정의값 | 옛 브라운 fallback | 동일 여부 |
|---|---|---|:---:|
| `--color-bg` | `#FFFFFF` (시안 v1 순백) | `#FAF8F5` (옛 크림) | ❌ 다름 |
| `--color-surface-2` | `#F6F7F9` (시안 v1 라이트 그레이) | `#F3EFE9` (옛 베이지) | ❌ 다름 |
| `--color-border` | `#E5E7EB` (시안 v1 뉴트럴 그레이) | `#E4DBCE` (옛 웜 베이지) | ❌ 다름 |
| `--color-text-primary` | `#1F2937` (시안 v1 다크 그레이) | `#3D2C1E` (옛 다크 브라운) | ❌ 다름 |
| `--color-text-secondary` | `#6B7280` (시안 v1 미디엄 그레이) | `#7A5C44` (옛 미디엄 브라운) | ❌ 다름 |
| `--color-text-tertiary` | `#9CA3AF` (시안 v1 라이트 그레이) | `#B89880` (옛 라이트 브라운) | ❌ 다름 |

**결론**: **6값 모두 본체에서 새 값(Tailwind 뉴트럴 그레이/차콜)으로 갱신 완료.** 옛 브라운 값과 동일한 토큰은 0개.

### 안전성 의미

- 토큰이 **정의된 환경**에서: `var(--color-bg, #FAF8F5)` → 렌더값 `#FFFFFF` (fallback 미사용). 실효 렌더는 sweep 후에도 동일.
- 토큰이 **미정의된 환경**에서: 현재 `#FAF8F5`(옛 브라운)이 비상 표시되지만 sweep 후 `unset`/상속값 표시. 그러나 모든 페이지가 `<link rel="stylesheet" href="css/tokens.css">`를 로드하므로 실제 운영 환경에서는 항상 정의된 상태.
- → **fallback 제거는 토큰 정의된 환경에서 색 변화 0**. sweep의 안전성 전제는 "토큰이 항상 로드된다"이며, 이는 진단 7에서도 일부 검증 (단 index.html 예외, 진단 7-4 참조).

---

## 진단 2 — PR 0(`fc5137b`) 머지의 실제 diff

### `git show fc5137b --stat`
```
css/tokens.css                           | 154 ++++++-
docs/sessions/2026-04-27_gap_analysis.md | 705 +++++++++++++++++++++++++++++++
2 files changed, 851 insertions(+), 8 deletions(-)
```

### `git show fc5137b -m --first-parent -- css/tokens.css` 핵심 변경

PR 0은 `feat/tokens-consolidation` 브랜치 머지. 실제 갱신된 변수 (옛 브라운 6값 **아님**):

**상태 색상 4건 갱신**
| 토큰 | 이전 | 신규 |
|---|---|---|
| `--color-success` | `#1A7A3F` (어두운 녹색) | `#10B981` (Tailwind 녹) |
| `--color-danger` | `#C0392B` (어두운 빨강) | `#EF4444` (Tailwind 빨) |
| `--color-warning` | `#854F0B` (어두운 황) | `#F59E0B` (Tailwind 황) |
| `--color-info` | `#1A3F7A` (어두운 파랑) | `#3B82F6` (Tailwind 파) |

**그림자 3건 갱신**
| 토큰 | 이전 | 신규 |
|---|---|---|
| `--shadow-sm` | `rgba(61, 44, 30, 0.08)` (브라운 톤) | `rgba(17, 24, 39, 0.06)` (차콜 톤) |
| `--shadow-md` | `rgba(61, 44, 30, 0.12)` | `rgba(17, 24, 39, 0.08)` |
| `--shadow-lg` | `rgba(61, 44, 30, 0.16)` | `rgba(17, 24, 39, 0.12)` |

**신규 토큰 ~94개 추가** (Neutral 10단계 / Brand 10 / Accent 7 / surface-3 등 보조 4 / status-bg 4 / gradient 4 / elevation 5+3+1 / ring 2 / shadow 특수 2 / leading 6 / tracking 6 / ease 4 / duration 4 / space 확장 13 / radius 확장 3 / z-index 4 / layout 2)

### 옛 브라운 6값은 누가 갱신했나?

`git log --oneline -- css/tokens.css` 기준:
```
71f08b0 feat(tokens): 9 시안 :root 통합 — 신규 ~94개 추가 + status·shadow 7건 갱신
5592749 feat(shell): v1 디자인 적용 — A2 제거 / 검색 A1 이동 ...
3e787a8 Add files via upload
a8bb188 Create tokens.css
```

`git show 5592749 -- css/tokens.css` 확인 결과:
- 옛 브라운 6값(`#FAF8F5/#F3EFE9/#E4DBCE/#3D2C1E/#7A5C44/#B89880`) → 시안 7값(`#FFFFFF/#F6F7F9/#E5E7EB/#1F2937/#6B7280/#9CA3AF`)으로 일괄 변경
- 커밋 메시지 명시: "tokens.css ▸ 색상 7값 시안 뉴트럴 그레이 팔레트로 갱신"

**결론**: 옛 브라운 6값을 갱신한 것은 PR 0(`fc5137b`)이 **아니라** 그 직전의 shell-v1 머지(`8e677bf` ← `5592749`). PR 0은 **상태 4 + 그림자 3 = 7건** 본체 갱신과 ~94개 신규 토큰을 추가했을 뿐 6값에는 손대지 않음. 세션 요약에 기록된 "본체 갱신 7건"은 옛 브라운과 무관한 status·shadow 7건을 의미.

→ sweep 작업의 안전성 근거는 PR 0이 아니라 **shell-v1 시각 검수 6건 PASS**(시크릿 창 검수: 사이드바 폭 / A1 높이 / 검색창 톤 / 검색창 위치 고정 / D 흰색 / 하단 배너).

---

## 진단 3 — finding 문서 원문 확인

### `cat docs/sessions/2026-04-27_fallback_debt_finding.md`

문서 제목 ②절 "옛 브라운 7값 fallback 패턴" — 표기는 7값이지만 실제 명시는 6값. 출처 라인:

```
- var(--color-border, #E4DBCE) — 옛 웜 베이지
- var(--color-bg, #FAF8F5) — 옛 크림
- var(--color-surface-2, #F3EFE9) — 옛 베이지
- var(--color-text-primary, #3D2C1E) — 옛 다크 브라운
- var(--color-text-secondary, #7A5C44) — 옛 미디엄 브라운
- var(--color-text-tertiary, #B89880) — 옛 라이트 브라운
```

문서 ⑤절에 sweep 시 사용할 정규식 6쌍이 이미 명시되어 있다:
```
var\(--color-border,\s*#E4DBCE\)         → var(--color-border)
var\(--color-bg,\s*#FAF8F5\)             → var(--color-bg)
var\(--color-surface-2,\s*#F3EFE9\)      → var(--color-surface-2)
var\(--color-text-primary,\s*#3D2C1E\)   → var(--color-text-primary)
var\(--color-text-secondary,\s*#7A5C44\) → var(--color-text-secondary)
var\(--color-text-tertiary,\s*#B89880\)  → var(--color-text-tertiary)
```

**결론**: 6값 출처와 sweep 정규식 모두 finding 문서에 명확히 명시되어 있음. 스캔 리포트와 본 진단도 동일 6값 기준 사용. 작업지시서가 추가 후보로 적시한 `#F5EFE4`는 finding 문서·실제 코드 모두에서 미발견 — 제외 정당.

> 표기 모순 1건: 문서 ②절 첫 줄은 "7값"이라 적었지만 실제 리스트는 6값. 작업 시 6값으로 통일 권장 (이미 본 진단 / 스캔 리포트는 6값 기준).

---

## 진단 4 — 6값의 fallback 외 사용 케이스

### 전 코드베이스 grep 결과

`*.css` / `*.html` / `*.js` 파일 전수 검색:

| 값 | 매칭 파일 |
|---|---|
| 6값 모두 | `pages/_template.html`, `pages/admin.html`, `pages/board.html`, `pages/myspace.html`, `pages/quick.html`, `pages/together.html` (6개) |
| `*.css` 파일 (`tokens.css` 등) | **0건** |

→ 옛 브라운 6값은 별도 CSS 파일에 잔존하지 않음. 페이지 HTML 내부에만 존재.

### `var()` fallback 패턴 vs 본 값 직접 사용 (sweep 5개 대상 페이지)

| 페이지 | 총 6값 매칭 | `var(--xxx, #VAL)` (A) | 본 값 직접 (B) |
|---|---:|---:|---:|
| pages/board.html | 87 | 87 | **0** |
| pages/admin.html | 104 | 97 | **7** |
| pages/myspace.html | 89 | 89 | **0** |
| pages/quick.html | 24 | 24 | **0** |
| pages/together.html | 41 | 41 | **0** |

### admin.html의 케이스 B 7건 (실제 라인)

```
330: .adm-mini-side { background: #F3EFE9; ... }
332:   width: 62px; ... color: #3D2C1E;
348: .adm-a2-btn.gated::after { ... background: #3D2C1E; ... }
350: .adm-pv-search { ... background: #F5F0E8; color: #7A5C44; ... }   ← #F5F0E8은 6값 외
353: .adm-pv-search.gated::after { ... background: #3D2C1E; ... }
378: .adm-bd-t2-tab.on { background: #3D2C1E; ... border-color: #3D2C1E; }
```

### 결론

- **finding 문서 ⑤절의 sweep 정규식 `var\(--token, #VAL\)`는 케이스 A만 매칭**. 케이스 B(본 값 직접)는 패턴이 다르므로 자동 치환에서 자연스럽게 제외됨.
- **sweep 작업이 admin.html의 7건 standalone hex를 의도치 않게 제거할 위험은 0**. 정규식 매칭이 wrapper(`var(--xxx,`) 부분을 강제하기 때문.
- 단, **이 7건은 별도 부채로 인지 필요**. admin.html 일부 요소(.adm-mini-side / .adm-a2-btn.gated / .adm-pv-search / .adm-bd-t2-tab.on)는 글로벌 토큰이 차콜로 갱신된 현재도 여전히 옛 브라운으로 직접 렌더 중 — 시각적 부조화. sweep 트랙과 별개의 **하드코딩 정리 트랙** 후보.

---

## 진단 5 — JS 동적 HTML 트리거 매핑

JS 인라인 fallback이 들어있는 함수와 회귀 검수 시 수행해야 할 사용자 액션 매핑.

### board.html (JS 인라인 9건 = 9 라인 = 9 매칭)

| 라인 | 함수 | 트리거 액션 |
|---|---|---|
| 1219, 1220, 1226, 1227 | `_onboardingTip(icon, label, desc)` (1216) | 게시판 첫 진입 시 온보딩 팁 박스 렌더 |
| 1578, 1579 | `_renderPostList()` (1546) | 게시판 진입 → 게시글 목록 렌더 |
| 1759 | `_loadComments(postId)` (1755) — 로딩 상태 | 게시글 상세 모달 열기 (`openDetail`) |
| 1775 | `_loadComments` 콜백 — 빈 상태 | 댓글 0건 게시글 상세 모달 |
| 1777 | `_loadComments` 콜백 — 에러 상태 | 댓글 로딩 실패 (Supabase 응답 오류) |

**검수 액션**: 게시판 진입 → 게시글 목록 보임 → 댓글 0건 게시글 상세 열기 → 정상 게시글 상세 열기.

### admin.html (JS 인라인 32건, 함수별 그룹)

| 함수 (라인 범위 추정) | 매칭 라인 | 트리거 액션 |
|---|---|---|
| `admToggleWriteForm` / `admSaveNewScript` 영역 (911~977) | 762, 767, 771, 778, 782, 786, 789 | 어드민 → 스크립트 탭 → "글쓰기 폼 펼치기" |
| `admBuildScriptTable` (830) | 844 | 어드민 → 스크립트 탭 → 목록 렌더 (stage 뱃지) |
| `admSaveNewScript` (931) — 저장중 메시지 | 944 | 글쓰기 폼 → "저장" 클릭 |
| `admLoadBoard` (978) | 1026 | 어드민 → 게시글 탭 (cat 뱃지) |
| `admLoadLogs` (1068) | 1108, 1111, 1130, 1142, 1144, 1145 | 어드민 → 활동 로그 탭 (테이블 미생성 안내 포함) |
| `admLoadNotice` (1160) / `admPostNotice` (1239) | 1167, 1171, 1173, 1210 | 어드민 → 공지 탭 (빈 상태 / 등록된 공지 표시) |
| `admLoadSettings` (1293) — 가이드 텍스트 | 1358, 1392, 1453, 1455 | 어드민 → 설정 탭 (메뉴/PRO 게이트/게시판 안내) |
| `admBnSelect` / `admSaveBanner` 영역 (1271~1281, 1706~) | 1533, 1536, 1541, 1564 | 어드민 → 배너 탭 → 배너 미리보기 행 렌더 |
| `admBannerFileSelected` (1736) | 1746 | 배너 탭 → 파일 선택 |
| 부트 영역 (`_boot` 1945) — 비로그인 안내 | 1953 | admin 페이지 비로그인 직접 진입 |

**검수 액션**: 어드민 진입 → 모든 탭(스크립트/게시글/활동 로그/공지/설정/배너) 순회 → 각 탭의 빈 상태/로딩/저장 액션 시도.

### myspace.html (JS 인라인 20건, 함수별 그룹)

| 함수 (라인) | 매칭 라인 | 트리거 액션 |
|---|---|---|
| 페이지 초기 markup 안 `id="*-list"` 로딩 placeholder (HTML body 안 `<script>` 블록 내부 템플릿/IIFE 영역) | 456, 476, 496 | 마이스페이스 첫 진입 시 "불러오는 중..." 표시 |
| `_buildPaging` (808) | 814, 819, 821 | 페이지네이션 렌더 (목록 ≥페이지당 표시 수) |
| `renderScriptsList` (825) — 빈 상태 + 항목 | 831, 832, 857 | 마이스페이스 → 스크립트 탭 (빈 / 항목 있음) |
| `renderLibraryList` (911) — 빈 상태 + 항목 | 917, 918, 935, 937 | 마이스페이스 → 라이브러리 탭 |
| `renderLeaderList` (1063) — 빈 상태 + 항목 | 1069, 1070, 1087, 1093 | 마이스페이스 → 리더 추천 탭 |

**검수 액션**: 마이스페이스 진입 → 3개 탭(스크립트/라이브러리/리더 추천) 순회 → 빈 상태와 데이터 있는 상태 모두 확인 → 페이지네이션 ≥2페이지 분량 데이터로 검증.

### quick.html (JS 인라인 8건)

| 라인 | 함수 (추정) | 트리거 액션 |
|---|---|---|
| 271 | `_loadQuickContents` (239) — 로딩 | 퀵 페이지 첫 진입 |
| 281 | `_loadQuickContents` — 에러 | 콘텐츠 로드 실패 (네트워크 차단/응답 오류) |
| 283, 297 | `_loadQuickContents` / `_initQuickSlot` — "준비 중" | 콘텐츠 미정의 슬롯 |
| 335 | `_initQuickPanel` (319) — 추천 스크립트 빈 상태 | 추천 스크립트 미존재 사용자 |
| 341 | 추천 스크립트 에러 | RPC 실패 |
| 367 | `_initQuickPanel` — 최근 기록 빈 상태 | 신규 사용자 (활동 0건) |
| 373 | 최근 기록 에러 | activity_logs 응답 실패 |

**검수 액션**: 퀵 페이지 진입 → 추천 스크립트 영역 + 최근 기록 영역 모두 표시 확인 → 가능하면 신규/숙련 사용자 두 케이스 비교.

### together.html (JS 인라인 0건)

함수에 fallback 없음. CSS 영역만 정리하면 됨. 검수: together 페이지 모든 탭 진입 → 시각 회귀만 확인.

### 결론

- 회귀 검수 시 **반드시 수행해야 할 사용자 액션 17~22개** (위 표 합계).
- 빈 상태 / 로딩 상태 / 에러 상태 트리거가 많아 **개발자 도구로 네트워크 차단을 의도적으로 발생시키는 검수**가 필요한 경우가 있음 (admin 활동로그 / quick 에러 분기).
- **검수 PASS 의미**: "위 17~22개 액션 수행 결과 시각적 회귀 0건". 누락 시 "검수 PASS"의 효력 없음.

---

## 진단 6 — 환경 상태

### `git status`
```
On branch main
Your branch is up to date with 'origin/main'.

Untracked files:
  docs/sessions/2026-04-27_fallback_sweep_scan.md

nothing added to commit but untracked files present
```

→ 작업 직전 세션의 산출 파일(`fallback_sweep_scan.md`)만 추적되지 않은 상태. 코드 미커밋 변경 0건.

### 분기 상태

```
* main
  remotes/origin/HEAD -> origin/main
  remotes/origin/feat/board-residual-cleanup
  remotes/origin/feat/board-v1-overhaul
  remotes/origin/feat/shell-v1
  remotes/origin/feat/tokens-consolidation
  remotes/origin/fix/board-admin-tab-bypass
  remotes/origin/main
```

`git branch -r --merged main` 결과 5개 feature 브랜치 모두 main에 머지 완료. **미머지 분기 0**.

### main과 origin/main 동기

```
352a0fb0e4c2f7e05359216b5d21a13d6cc8fb64 (main)
352a0fb0e4c2f7e05359216b5d21a13d6cc8fb64 (origin/main)
```

→ main = origin/main 완전 동기.

### 결론

- 워킹트리: 깨끗 (untracked 1건만, 직전 세션 산출물).
- 미머지 feature 분기: 0개 — sweep 작업이 다른 진행 중인 변경과 충돌할 위험 0.
- main vs origin/main: 동기 — sweep PR 분기 만들 때 base에 차이 없음.

→ **sweep 작업 환경은 깨끗**. 충돌·잔여 변경 위험 없음.

---

## 진단 7 — 빈 4페이지(home / scripts / news / index) 재검증

### home.html (983라인, var 35건, hex 직접: `#fff` 2건 / `#b86a44` 1건)

- 옛 브라운 6값: 0건 ✓
- `var(--color-*)` 사용: 35건 (정상적으로 토큰 시스템 사용)
- 다른 fallback 1건: `var(--color-accent-dark, #b86a44)` line 283 — 옛 브라운 6값 외이므로 sweep 대상 아님. 별도 부채 (단, `--color-accent-dark` 토큰이 정의되어 있는지 확인 필요).
- → **자연스럽게 깨끗**.

### scripts.html (1157라인, var 72건, hex 직접: ~22개)

- 옛 브라운 6값: 0건 ✓
- hex 색상 직접 정의가 많지만, 모두 **`--stg-1-fg/bg` ~ `--stg-10-fg/bg` 도메인 특화 stage 색상 팔레트**. CLAUDE.md "도메인 특화 stage 색상 팔레트 제외 하드코딩 금지" 원칙에 의해 의도된 디자인 결정.
- → **자연스럽게 깨끗 (stage 팔레트는 별도 트랙)**.

### news.html (296라인, var 23건, hex 직접: `#fff` 2건만)

- 옛 브라운 6값: 0건 ✓
- 가장 작은 페이지. 토큰 시스템 정상 사용.
- → **자연스럽게 깨끗**.

### index.html (2354라인, var 1건, hex 직접: ~100건) — ⚠ **예외 케이스**

- 옛 브라운 6값: 0건 ✓ (그러나 매우 의심스러운 0)
- `var(--color-*)` 사용: **단 1건** — 이 페이지는 tokens.css 시스템을 거의 사용하지 않음.
- 페이지 로컬 변수 정의:
  ```
  11: --brown-dark: #3d2b1f;
  12: --brown-mid: #6b4226;
  13: --brown-light: #a0724a;
  16: --accent: #c8753a;
  17: --accent-dark: #b5642e;
  19: --text-mid: #5a3e2b;
  20: --text-light: #9a7a62;
  ```
- hex 색상 직접 정의 ~100건 (`#c8753a` 16회, `#7A5238` 11회, `#2B211B` 10회, `#5C3D2E` 8회 등 — 전부 갈색/브라운 톤).
- → **부채 0건이지만 "tokens.css 미사용 + 자체 브라운 팔레트"라는 더 큰 차원의 부채가 별도로 존재**.

### 추가 발견 — `_template.html` (스캔 범위 외)

- 옛 브라운 6값: **8건 잔존**.
- 작업지시서·스캔 리포트 모두 9페이지 + index.html만 대상으로 했으나, `_template.html`은 페이지 신규 생성 시 복사되는 템플릿 → **이대로 두면 미래 신규 페이지에 옛 브라운 fallback이 자동 전파**.

### 결론

| 페이지 | 0건 사유 | 비고 |
|---|---|---|
| home.html | 자연스럽게 깨끗 | `--color-accent-dark` 토큰 정의 확인만 필요 |
| scripts.html | 자연스럽게 깨끗 | stage 도메인 팔레트는 의도된 결정 |
| news.html | 자연스럽게 깨끗 | — |
| **index.html** | **tokens.css 미사용** | sweep과 무관하지만 별도 부채로 인지 필요 |

추가:
- **`_template.html` 6값 8건 잔존** — sweep 시 함께 정리할지 결정 필요.

빈 4페이지 baseline 신뢰도: home / scripts / news 3개는 **신뢰 가능**. index.html은 baseline 자체가 **다른 시스템**이라 sweep 영향 0이지만 향후 별도 트랙 필요.

---

## 종합 결론

### 안전성 전제 (확정 사항)

1. **본체 토큰**: 옛 브라운 6값 모두 새 값(차콜/그레이)으로 갱신 완료. fallback 제거 시 토큰 정의된 환경에서 색 변화 0. (진단 1)
2. **갱신 시점**: shell-v1 머지(`5592749`/`8e677bf`)에서 6값 갱신. PR 0(`fc5137b`)은 별개 (status·shadow 7건 + 신규 ~94개). (진단 2)
3. **sweep 정규식**: `var\(--token, #VAL\)`로 한정 → standalone hex 안 건드림. admin.html 7건 standalone은 자동 제거 안 됨. (진단 4)
4. **환경**: 워킹트리 깨끗. 미머지 분기 0. main = origin/main 동기. 충돌 위험 0. (진단 6)
5. **0건 페이지 신뢰도**: home / scripts / news 3개 자연 깨끗. (진단 7)

### 잠재 위험 (확정 사항)

1. **admin.html standalone 7건** — 자동 제거 대상은 아니지만 글로벌 토큰 갱신 후에도 옛 브라운으로 직접 렌더 중. **별도 부채**로 인지 필요. sweep 트랙 안에 포함할지 별도 트랙으로 미룰지 결정 필요.
2. **index.html tokens.css 거의 미사용** — `--brown-*` 페이지 로컬 변수와 ~100건 hex 직접 정의로 운영. sweep과 무관하지만 디자인 시스템 통합에서 동떨어진 페이지. **별도 부채**.
3. **`_template.html` 8건 잔존** — 스캔 대상에서 빠졌지만 미래 신규 페이지에 옛 브라운 fallback 자동 전파 위험. sweep에 포함 권장.
4. **JS 인라인 회귀 검수 액션 17~22개** — 누락 시 "검수 PASS" 효력 없음. 빈/로딩/에러 상태 트리거 일부는 네트워크 차단 등 의도적 조건이 필요.
5. **finding 문서 ②절 "7값" 표기 모순** — 실제 리스트는 6값. 미세하지만 작업 중 혼동 방지를 위해 6값 통일 권장.

### 권장 다음 단계

#### (a) **조건부 sweep 진입 가능**.

아래 (c) 조건을 모두 충족하면 안전.

#### (b) 가능 시 권장 작업 순서

1. (c) 조건 충족
2. 슬롯 묶음 안 (스캔 리포트 §5의 안 A/B/C) 중 팀장님 결정
3. 결정된 슬롯의 첫 페이지부터 sweep PR 진입
4. 슬롯 종료마다 진단 5의 트리거 액션 매트릭스로 회귀 검수
5. 모든 슬롯 종료 후 admin standalone 7건 / index.html / `_template.html` 별도 트랙 의제화

#### (c) 충족해야 할 조건 (5건)

1. **sweep 정규식 한정 명시**: `var\(--(color-border|color-bg|color-surface-2|color-text-primary|color-text-secondary|color-text-tertiary),\s*#[A-F0-9]{6}\)` 형태로 wrapper 강제. standalone hex와 다른 토큰명 fallback은 자동 제거 대상 외.
2. **`_template.html` 처리 결정**: sweep PR 안에 포함할지(권장) / 별도 PR로 분리할지. 제외하면 미래 페이지 생성 시 옛 브라운 자동 전파.
3. **admin.html standalone 7건 처리 결정**: sweep PR 끝에 별도 커밋으로 추가 정리 or 별도 트랙 미룸. **자동 sweep과는 분리** (정규식 다름).
4. **회귀 검수 액션 매트릭스 합의**: 진단 5의 트리거 매핑 17~22개 액션 중 어느 것이 mandatory / optional인지 팀장님 사전 합의. 검수 시간 견적 가능.
5. **index.html 별도 트랙 인지**: sweep 대상 아님을 명시. 향후 디자인 시스템 통합 트랙으로 옮길지 결정.

---

## 진단 중 발견한 예상 외 사항

1. **PR 0(`fc5137b`)이 옛 브라운 6값을 갱신한 줄 알았으나 사실 shell-v1(`5592749`)이 갱신**. 세션 요약의 "본체 갱신 7건"은 status·shadow 7건이지 옛 브라운 6값과 무관. 작업지시서·finding 문서가 PR 0을 안전성 근거로 들고 있지만 정확히는 **shell-v1 시각 검수 PASS**가 안전성 근거.

2. **admin.html에 fallback 외 standalone hex 7건** — 진단 4에서 발견. sweep 정규식이 우연히도 이를 안 건드리지만, 시각적으로는 글로벌 토큰 갱신 후에도 옛 브라운으로 남아있는 부조화 영역.

3. **index.html이 tokens.css 시스템을 거의 사용 안 함** — `var(--color-*)` 단 1건. 페이지 로컬 `--brown-*` 변수 + ~100건 hex 직접 정의. sweep 대상 외이지만 갭 분석 보고서가 못 잡았을 별도 차원의 디자인 시스템 통합 부채.

4. **`_template.html`이 스캔 범위에서 빠짐** — 작업지시서 9페이지에 미포함. 그러나 6값 8건 잔존 → 미래 신규 페이지에 옛 브라운 자동 전파. sweep 시 함께 정리하는 것이 합리적.

5. **finding 문서 표기 모순** — "옛 브라운 7값"이라 적었지만 실제 6값. 작업 중 혼동 방지 위해 통일 필요.
