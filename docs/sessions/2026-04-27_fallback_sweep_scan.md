# fallback 부채 전수 스캔 결과 — 2026-04-27

> 생성: 2026-04-27T21:00 (KST)
> 기준 6값 출처: `docs/sessions/2026-04-27_fallback_debt_finding.md`
> 스캔 대상: 9 페이지 × 3 영역 (CSS / JS 인라인 / HTML 인라인)
> 카운트 방식: `grep -o` 기준 실제 매칭 발생 횟수 (라인 수가 아닌 매칭 수)

---

## 1. 사용한 옛 브라운 6값

`finding` 문서 ②절 "옛 브라운 7값 fallback 패턴" 기준 — 실제 명시는 6값:

| 값 | 매핑 토큰 | 용도 (옛 호칭) |
|---|---|---|
| `#E4DBCE` | `--color-border` | 옛 웜 베이지 (테두리) |
| `#FAF8F5` | `--color-bg` | 옛 크림 (배경) |
| `#F3EFE9` | `--color-surface-2` | 옛 베이지 (서브 표면) |
| `#3D2C1E` | `--color-text-primary` | 옛 다크 브라운 (본문 텍스트) |
| `#7A5C44` | `--color-text-secondary` | 옛 미디엄 브라운 (보조 텍스트) |
| `#B89880` | `--color-text-tertiary` | 옛 라이트 브라운 (서브 텍스트) |

> 작업지시서가 예시한 `#F5EFE4`는 finding 문서에 없으며 실제 코드에서도 미발견 — 제외.
>
> 예외 (정리 대상 아님): `var(--color-surface, #fff)` 같이 fallback이 흰색이거나 무관한 값인 경우는 본 스캔 대상이 아님.

---

## 2. 페이지별 부채 카운트 표

| 페이지 | CSS | JS 인라인 | HTML 인라인 | 합계 |
|---|---:|---:|---:|---:|
| home.html | 0 | 0 | 0 | **0** |
| board.html | 77 | 9 | 1 | **87** |
| admin.html | 71 | 32 | 1 | **104** |
| myspace.html | 59 | 20 | 10 | **89** |
| quick.html | 14 | 8 | 2 | **24** |
| scripts.html | 0 | 0 | 0 | **0** |
| together.html | 41 | 0 | 0 | **41** |
| news.html | 0 | 0 | 0 | **0** |
| index.html | 0 | 0 | 0 | **0** |
| **합계** | **262** | **69** | **14** | **345** |

> 영역 분리 기준: 각 파일의 `<style>...</style>` 라인 범위 = CSS, `<script>...</script>` 라인 범위 = JS, 그 외 = HTML 인라인.
>
> myspace.html은 `<script>` 블록이 2개(line 413–642 / 643–1195)이며 그 사이에 닫힘+열림이 같은 라인(642)에 붙어 있다. 두 블록 모두 JS로 합산. 마지막 `</script>`(line 1195) 뒤 1196–1213 영역은 HTML로 합산했다.
>
> together.html은 `<style>` 위에 head/meta 영역(line 1–15)이 있어 HTML 영역에 합산했다(매칭 0).

---

## 3. 6값별 분포 (전체 9페이지 통합)

| fallback 값 | CSS | JS 인라인 | HTML 인라인 | 합계 |
|---|---:|---:|---:|---:|
| `#E4DBCE` (border) | 76 | 7 | 3 | **86** |
| `#FAF8F5` (bg) | 2 | 0 | 0 | **2** |
| `#F3EFE9` (surface-2) | 44 | 6 | 2 | **52** |
| `#3D2C1E` (text-primary) | 54 | 10 | 1 | **65** |
| `#7A5C44` (text-secondary) | 49 | 18 | 3 | **70** |
| `#B89880` (text-tertiary) | 37 | 28 | 5 | **70** |
| **합계** | **262** | **69** | **14** | **345** |

---

## 4. 페이지별 작업 부담 분류

부채 합계 기준:
- 🟢 **가벼움 (0~30건)** — 빈 페이지 검증만 / 또는 짧은 sweep
- 🟡 **보통 (31~80건)** — 단일 페이지 한 슬롯
- 🔴 **무거움 (81건+)** — 단일 페이지로 슬롯 거의 차지

| 페이지 | 합계 | 분류 | 비고 |
|---|---:|---|---|
| home.html | 0 | 🟢 | 부채 0 — 회귀 검증만 (대상 외) |
| scripts.html | 0 | 🟢 | 부채 0 — 회귀 검증만 (대상 외) |
| news.html | 0 | 🟢 | 부채 0 — 회귀 검증만 (대상 외) |
| index.html | 0 | 🟢 | 부채 0 — 회귀 검증만 (대상 외) |
| quick.html | 24 | 🟢 | 가벼운 sweep — CSS 14 + JS 8 + HTML 2 |
| together.html | 41 | 🟡 | CSS 단일 영역만(41건) — JS·HTML 0 |
| board.html | 87 | 🔴 | finding 문서 1차 발견 페이지 |
| myspace.html | 89 | 🔴 | HTML 인라인 10건(가장 많음) — `--mys-*` 매크로 변수도 포함 |
| admin.html | 104 | 🔴 | JS 인라인 32건(가장 많음) — 동적 HTML 생성 코드 다수 |

---

## 5. 1~2시간 작업 슬롯 묶음 추천 (3안)

작업 슬롯당 약 60~120분 기준, 다음 가정 사용:
- 빈 페이지 회귀 검증: 페이지당 약 5분
- 가벼움(🟢) 1페이지 sweep: 약 20~30분
- 보통(🟡) 1페이지 sweep: 약 40~50분
- 무거움(🔴) 1페이지 sweep: 약 60~90분 (CSS 정규식 일괄 + JS 문자열 수동 검증)

총 추정 작업 시간: **약 4시간 45분 (285분)**

### 안 A — 안전 우선 (가벼운 것부터, 5슬롯)

| 슬롯 | 내용 | 예상 |
|---|---|---:|
| 1 | 빈 4페이지 검증 (home/scripts/news/index, 각 5분) + quick.html sweep | ~45분 |
| 2 | together.html sweep | ~45분 |
| 3 | board.html sweep | ~65분 |
| 4 | myspace.html sweep | ~70분 |
| 5 | admin.html sweep | ~80분 |

장점: 슬롯당 부담 일관 / 회귀 발생 시 격리. 단점: 슬롯 수가 가장 많음.

### 안 B — 영향도 우선 (자주 보는 페이지부터, 4슬롯)

| 슬롯 | 내용 | 예상 |
|---|---|---:|
| 1 | board.html sweep (게시판 — 자주 검수) | ~65분 |
| 2 | myspace.html sweep (사용자 메인 작업 공간) | ~70분 |
| 3 | admin.html sweep (관리자 — 팀장님 검수 빈도 ↑) | ~80분 |
| 4 | quick + together + 빈 4페이지 검증 | ~90분 |

장점: 영향 큰 페이지부터 정리 → 가시적 효과. 단점: 마지막 슬롯이 1.5h로 약간 길다.

### 안 C — 균등 분할 (3슬롯)

| 슬롯 | 내용 | 예상 |
|---|---|---:|
| 1 | admin.html sweep + 빈 4페이지 검증 | ~100분 |
| 2 | myspace.html sweep + quick.html sweep | ~95분 |
| 3 | board.html sweep + together.html sweep | ~110분 |

장점: 슬롯 수 최소(3회). 단점: 슬롯 3이 1시간 50분으로 가장 길다 — 작업자 피로도 ↑.

---

## 6. 패턴 관찰

### 6-1. 부채는 5개 페이지에 집중

home / scripts / news / index 4개 페이지는 옛 브라운 fallback이 **0건**. 이미 다른 작업으로 정리되었거나 처음부터 fallback을 쓰지 않은 패턴. sweep 대상에서 사실상 제외 가능 (회귀 검증만 필요).

부채는 board / admin / myspace / together / quick **5개 페이지**에 집중되어 있으며, 이 중 board/admin/myspace 3페이지가 전체 280건(81%)을 차지.

### 6-2. CSS가 압도적, HTML 인라인은 매우 적음

- CSS: 262건 (76.0%) — 정규식 일괄 sweep 가능
- JS 인라인: 69건 (20.0%) — 문자열 리터럴 안에 들어 있어 정규식 가능하지만 동적 HTML 생성 컨텍스트라 검증 필요
- HTML 인라인: 14건 (4.1%) — 미미. myspace 10건이 거의 전부 (button/span의 `style="..."` 속성)

### 6-3. 값별 분포 — `#FAF8F5`(bg)만 유난히 적음

`#FAF8F5`(bg)는 전체 2건. admin/myspace의 `.pg-content-block` 또는 유사 컨테이너 1건씩만 잔존. 나머지 5값은 모두 50건 이상.

`#E4DBCE`(border)가 86건으로 가장 많음 — 모든 페이지의 카드/입력/구분선 토큰이 동일 패턴이라 일괄 sweep으로 가장 빠르게 정리 가능.

### 6-4. JS 인라인의 빈도 1위는 `#B89880`(text-tertiary)

JS 인라인 69건 중 28건(40%)이 `#B89880`. "불러오는 중...", "등록된 공지가 없습니다", "불러오지 못했습니다" 같은 동적 빈/로딩 메시지 텍스트 색상에 반복 사용. 동일 문자열 패턴(`color:var(--color-text-tertiary,#B89880)`)이 여러 위치에서 복사·붙여넣기된 흔적.

### 6-5. admin.html의 JS 인라인 32건이 단일 페이지 최대치

admin.html은 JS 동적 HTML 생성이 많아 fallback 부채도 JS 인라인에 32건 집중. board(JS 9건) / myspace(JS 20건) 대비 약 1.6~3.5배. sweep 시 동적 HTML 로직 회귀 위험이 가장 높은 페이지.

### 6-6. myspace.html은 `--mys-*` 매크로 정의에도 fallback 잔존

myspace.html line 4–10은 `--mys-panel: var(--color-surface-2, #F3EFE9)` 같이 페이지 로컬 매크로 변수를 정의하면서 그 안에 또 옛 브라운 fallback을 박아둠. 매크로를 사용한 곳은 별도로 다시 fallback이 없는 셈이지만, 매크로 정의 7줄에 옛 브라운 fallback 7건이 압축 잔존.

---

## 7. 다음 단계

1. 팀장님 결정 사항: 1~2시간 슬롯 묶음 **안 A / B / C 중 선택**
2. 결정 후: 첫 슬롯 작업지시서 발행 → 실제 sweep PR 진입
3. sweep 실행 시 finding 문서 ⑤절의 정규식 그대로 사용 가능:
   ```
   var\(--color-border,\s*#E4DBCE\)         → var(--color-border)
   var\(--color-bg,\s*#FAF8F5\)             → var(--color-bg)
   var\(--color-surface-2,\s*#F3EFE9\)      → var(--color-surface-2)
   var\(--color-text-primary,\s*#3D2C1E\)   → var(--color-text-primary)
   var\(--color-text-secondary,\s*#7A5C44\) → var(--color-text-secondary)
   var\(--color-text-tertiary,\s*#B89880\)  → var(--color-text-tertiary)
   ```
4. JS 인라인은 같은 정규식으로 매칭되지만 따옴표 안 문자열이라 일괄 치환 후 "동적 렌더 시 토큰 미정의 환경에서도 작동하는가"를 시각 회귀로 한 번 더 확인 권장.

### Claude Code 권장안 (참고)

**안 B (영향도 우선, 4슬롯)** 권장.
- 1~2시간 슬롯 프레임에 4개 모두 들어오며,
- 영향 큰 페이지(board → myspace → admin)를 먼저 정리해 실제 검수 효과를 일찍 확인 가능,
- 마지막 슬롯에서 가벼운 페이지를 모아 처리해 자연스러운 마무리.

회귀 위험을 분산하고 싶다면 **안 A**, 슬롯 횟수를 최소화하고 싶다면 **안 C**.
