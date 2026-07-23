# 지식 문서 공용 레지스트리 설계안 v1

**작성: 총괄팀장(Claude Code) · 조사: os-planner · 실측 재대조: 총괄**
**작성일: 2026-07-23 · 상태: 설계안 (승인 전 구현 금지)**
**상위 문서: `docs/specs/knowledge_category_layout_v2.md` (기획팀장 원문 + 총괄 대조 부록)**

> 대표 작업지시서에 따른 **설계안까지만**. 코드 수정·DB 변경·배포 무접촉.

## 총괄 검수 확인 (설계자 보고를 총괄이 직접 재대조)

- 3개 페이지 `<h1>` 실텍스트 — 실측 일치
- 의료실비 문서 라벨 **5종 산재** — 실측 확인 (`실비 변천사` 6곳 / `실비 세대별 변천사` 4곳 / `실손의료비 세대별 비교` 2곳 + h1 + 주석)
- 간병 검색 키워드 **25개 상당 실재** — 유실 시 검색 회귀
- 3개 지식 페이지 **외부 JS 참조 0건** (전부 자체완결 정적 파일) — 실측 확인

---

## 0. 데이터 유기체 4대 질문

| # | 질문 | 답 |
|---|---|---|
| ① | 어떤 원장을 조회하나 | 신규 `KNOWLEDGE_DOCS` (js 파일). 현재는 원장 자체가 없어 4곳 이상에 복제돼 있음 |
| ② | 어디서 관리되나 | `js/knowledge-registry.js` 단일 파일. **DB 변경 없음**(대표 확정). DB row와 1:1 대응 구조로 후일 이관 대비 |
| ③ | 재사용 가능한가 | 홈타일·홈데스크·검색바로가기·라우팅·사이드바·카테고리목록·건수 = **7개 소비처가 원장 1개** |
| ④ | 권한 격리 | `factGrades` → `knowledgeVisibility()` **단일 함수**에서만 계산. 소비처는 판단 로직을 갖지 않음. ⚠️ 클라이언트 필터는 은닉이지 접근통제가 아님(R2) |

하드코딩 페이지 추가가 아니라 **기존 하드코딩 4곳을 원장 1곳으로 회수**하는 방향 → 대원칙 정합.

---

## 1. 3개 자료 실측 결과

| 항목 | 자료 A | 자료 B | 자료 C |
|---|---|---|---|
| **id** | `silson` | `cancer-treatment` | `caregiver-history` |
| **실제 URL** | `/pages/silson-generations.html` | `/pages/cancer-treatment-history.html` | `/pages/caregiver-history.html` |
| **현재 뷰 키** | `silson` | `cancer-treatment` | `caregiver-history` |
| **페이지 h1 (실텍스트)** | 실손의료비보험 세대별 변천사 | 암주요치료비 세대별 변천사 | 대한민국 간병보험의 변천사 |
| **정본 라벨 (대표 확정)** | **의료실비 변천사** | 암주요치료비 변천사 | 간병보험 변천사 |

⚠️ **의료실비 경로는 `silson-generations.html`.** `silson-history.html` 등으로 바꾸지 않는다(대표 지시).

### 현재 산재 라벨 — 의료실비 문서 하나에 5종

| 위치 | 표기 |
|---|---|
| `js/home.js` `_HS2_TILES` | 실비 변천사 |
| `app.html:5806` 홈데스크 중복 사본 | 실비 세대별 변천사 |
| `app.html:12224` `_SHORTCUTS.label` | 실비 세대별 변천사 |
| 타 페이지 사이드바 관련자료 | 실손의료비 세대별 비교 |
| 페이지 자체 h1 | 실손의료비보험 세대별 변천사 |

`description`도 위치별로 3벌씩 다름 → **홈타일 값을 정본으로 채택**.

### 라우팅 실측

- `app.html:6225` `showView` 최상단 3줄 리라우트
- `app.html:6229` `VALID_VIEWS`에 3개 id
- `_relurl` URL 매핑이 **4벌** (app.html 1 + 페이지 3)

### `updatedAt` — 판정 불가분 존재

3개 파일 최종 커밋이 전부 동일한 CSS 커밋(`9b8bdf4`, 2026-07-23). 본문 내용 변경일은 cancer만 식별 가능(2026-07-21 급여·비급여 표기 정정). **silson·caregiver는 확인 못 함.**

---

## 2. 레지스트리 필드 구조

대표 지정 필드만. 추가·삭제 없음. **음성지원(`audioStatus`/`audioUrl`/`audioDuration`)·읽는 시간은 의도적 제외**(별도 후속).

| 필드 | 타입 | 필수 | 허용값 | 비고 |
|---|---|---|---|---|
| `id` | string | O | 소문자·하이픈 | **기존 뷰 키와 동일값 강제.** `?view=` 딥링크·북마크가 이미 이 값에 묶임 |
| `category` | string | O | `의료실비` / `암` / `뇌 · 심장` / `수술비` / `간병` / `기타` | **공백 포함 `뇌 · 심장`** (기존 코드 표기와 일치) |
| `group` | string 또는 null | O | 성격 묶음명 | 현 3건 전부 `null`. 건수 임계값 금지 |
| `label` | string | O | — | 홈·검색·사이드바·목록 공통 **정본 라벨** |
| `documentTitle` | string | O | — | 페이지 h1 실텍스트. **표시용 아님, 대조·검증용** |
| `description` | string | O | 1줄 | 목록/타일/검색 공통. 폰트 16px |
| `url` | string | O | `/pages/*.html` | 실측값 고정. **파일명 추정 금지** |
| `updatedAt` | string | O | `YYYY-MM-DD` | **원장 기준일**(아래 §2-1). 수기 관리 |
| `lifecycleStatus` | string | O | `draft` / `reviewing` / `approved` / `published` | `silson_generations` 기존 4값과 동일 축 |
| `factGrades` | string[] | O | `customer_ok` / `internal_only` / `customer_blocked` | 빈 배열 금지(미판정 = 비노출) |

DB 이관 대비: JS camelCase ↔ DB snake_case 1:1. `group`은 SQL 예약어라 이관 시 `group_name` 매핑. **지금 이름 바꾸지 않는다.**

### 2-1. `updatedAt` = 원장 기준일 (대표 확정 2026-07-23)

> ⚠️ **`updatedAt`은 문서 본문이 실제로 마지막에 수정된 날이 아니다. 원장을 세운 기준일이다.**

- 3개 자료 전부 **`2026-07-23`으로 통일**한다(대표 확정).
- 사유: 3개 파일의 git 최종 커밋이 전부 동일한 CSS 작업(`9b8bdf4`)이라 **본문이 실제로 바뀐 날을 기록으로 판정할 수 없다**(암 문서만 2026-07-21 표기 정정 식별 가능). 없는 날짜를 지어내지 않고, 원장을 세우는 오늘을 공통 기준일로 삼는다.
- **앞으로의 운영:** 문서 본문을 고칠 때마다 그 날짜로 손으로 갱신한다. 이후의 값은 실제 수정일 의미를 갖는다.
- ⚠️ **이 필드를 "마지막 수정일"로 화면에 표기할 때 주의.** 최초 3건은 실제 수정일이 아니다. 오해 소지가 있으면 표기를 생략하거나 "등록일" 성격으로 쓴다.

### 2-2. NEW 배지 = 이번 범위 제외 (대표 확정 2026-07-23)

3개 자료의 `updatedAt`이 전부 같은 날짜라 **NEW 배지가 전부 붙거나 전부 안 붙어 변별력이 0**이다. 상위 스펙 §9-1에 있던 `NEW` 표기는 **이번 구현 범위에서 제외**한다. 자료가 늘고 날짜가 실제로 갈라진 뒤 별도로 논의한다.

---

## 3. 3개 자료 샘플 레코드

```js
/* js/knowledge-registry.js — 지식 문서 원장(단일 원천)
   ★ 새 자료 추가 = 이 배열에 객체 1개 추가
   ★ id = 기존 showView 뷰 키와 동일해야 함(딥링크·북마크 호환)
   ★ url = 실측값. 파일명 패턴 추정 금지
   ★ 음성지원·읽는 시간 필드 없음(별도 후속). 임의 추가 금지 */
var KNOWLEDGE_DOCS = [
  { id:'silson', category:'의료실비', group:null,
    label:'의료실비 변천사', documentTitle:'실손의료비보험 세대별 변천사',
    description:'실손 1~5세대 보장·전환', url:'/pages/silson-generations.html',
    updatedAt:'2026-07-23',   /* 원장 기준일(2-1). 실제 본문 수정일 아님 */
    lifecycleStatus:'published', factGrades:['customer_ok'] },

  { id:'cancer-treatment', category:'암', group:null,
    label:'암주요치료비 변천사', documentTitle:'암주요치료비 세대별 변천사',
    description:'세대별 암 치료비 보장 변화', url:'/pages/cancer-treatment-history.html',
    updatedAt:'2026-07-23',   /* 원장 기준일(2-1). 실제 본문 수정일 아님 */
    lifecycleStatus:'published', factGrades:['customer_ok'] },

  { id:'caregiver-history', category:'간병', group:null,
    label:'간병보험 변천사', documentTitle:'대한민국 간병보험의 변천사',
    description:'장기간병~사용일당 · 지급기준이 다름', url:'/pages/caregiver-history.html',
    updatedAt:'2026-07-23',   /* 원장 기준일(2-1). 실제 본문 수정일 아님 */
    lifecycleStatus:'published', factGrades:['customer_ok'] }
];
```

---

## 4. 공개 범위 계산 함수

**위치: `js/knowledge-registry.js`** (원장과 같은 파일, 한 곳에만). 이 함수 밖에서 `factGrades`를 직접 해석하는 코드를 만들지 않는다 — 두 벌 관리 = 추적 불가.

```js
function knowledgeVisibility(doc){
  var g = (doc && doc.factGrades) || [];
  if(!g.length) return 'blocked';                          /* 미판정 = 안전측 비노출 */
  if(g.indexOf('customer_blocked') >= 0) return 'blocked'; /* 어떤 공개 화면에도 노출 금지 */
  if(g.indexOf('internal_only')    >= 0) return 'advisor'; /* 로그인 설계사만 */
  return 'public';                                          /* customer_ok만 → 전체 공개 */
}
function knowledgeVisibleDocs(opts){ /* lifecycleStatus + visibility + category/group/excludeId 필터 */ }
function knowledgeCount(opts){ return knowledgeVisibleDocs(opts).length; }
function knowledgeById(id){ /* 단순 조회 */ }
function knowledgeIsAdvisorOnly(doc){ return knowledgeVisibility(doc) === 'advisor'; }  /* 설계사 전용 배지 */
```

### 호출부 (7곳 — 전부 함수 경유, `factGrades` 직접 참조 0)

| 소비처 | 호출 |
|---|---|
| 홈 타일 (`js/home.js` `_hs2RenderHub`) | `knowledgeVisibleDocs()` |
| 홈데스크 자료·도구 (`app.html:5806`) | `knowledgeVisibleDocs()` |
| 검색 바로가기 (`app.html:12223`) | `knowledgeById` + gate |
| `showView` 리라우트 (`app.html:6225`) | `knowledgeById(key).url` |
| `VALID_VIEWS` (`app.html:6229`) | `KNOWLEDGE_DOCS.map(d => d.id)` |
| 카테고리 목록·탭/칩 건수 (신규) | `knowledgeVisibleDocs({category})` / `knowledgeCount` |
| 사이드바 관련자료 (정적 3페이지) | `knowledgeVisibleDocs({excludeId})` |

⚠️ 라우팅(4·5)은 `knowledgeById`를 쓴다 — "존재하는가"의 문제. 비노출 문서의 URL 직접 진입 차단은 **페이지 레벨 가드**가 담당(R2).

---

## 5. 카운트 계산 방식

기준 = `knowledgeCount({category})` = **현재 사용자에게 실제 보이는 수**. `customer_blocked`는 어느 카운트에도 미포함. 탭·칩 건수와 헤더 "자료 N건" 전부 같은 함수.

### 현재 3개 자료 기준 실제 예상 숫자

| 카테고리 | 비로그인 | 로그인 설계사 |
|---|---|---|
| 의료실비 | 1 | 1 |
| 암 | 1 | 1 |
| 뇌 · 심장 | 0 | 0 |
| 수술비 | 0 | 0 |
| 간병 | 1 | 1 |
| 기타 | 0 | 0 |
| **합계** | **3** | **3** |

**중요 — 상위 스펙 §5의 "로그인 전후가 달라야 정상"은 현 데이터로 만족되지 않는다.** 3건 전부 `customer_ok`이므로 3 = 3. **버그가 아니라 데이터 상태.**
→ 검증 시 "숫자가 같다"를 실패로 판정하지 말 것. `factGrades:['internal_only']` 목업으로 분기만 1회 실측 후 원복.

---

## 6. 화면 연결 구조

```
            js/knowledge-registry.js
            KNOWLEDGE_DOCS (원장 · 유일)
            knowledgeVisibility() / knowledgeVisibleDocs() / knowledgeCount()
                          |
   +--------+--------+----+----+--------+--------+--------+
 홈카테고리  홈타일   검색     라우팅   카테고리  탭·칩건수  사이드바
  카드 6개          바로가기          내부목록            관련자료
```

| 소비처 | 읽는 것 | 렌더 규칙 |
|---|---|---|
| 홈 카테고리 카드 | 카테고리 6개 고정 + `knowledgeCount({category})` | 카드는 6개 고정, 건수만 원장에서 |
| 홈 타일 | `knowledgeVisibleDocs()` | 하드코딩 3줄 삭제 → 루프 생성. **비지식 타일(보장분석 축 등) 무접촉** |
| 검색 바로가기 | `knowledgeById` | ⚠️ `keywords`는 원장 필드에 없어 `_SHORTCUTS` 잔류 |
| 사이드바 관련자료 | `knowledgeVisibleDocs({excludeId})` | N×(N-1) 하드코딩 소멸 |
| 카테고리 내부 목록 | `knowledgeVisibleDocs({category})` | 행 + 구분선, 설계사 전용 배지 |
| 탭·칩 건수 | `knowledgeCount({category[, group]})` | 칩은 `group !== null`이 1개 이상일 때만 렌더 |
| 라우팅 | `knowledgeById(key).url` | 3줄 → 1줄 |

### 새 자료 추가 시 자동 반영 범위

홈 카드 건수 · 홈 타일 · 홈데스크 · `showView` · 딥링크 허용 · **기존 3개 페이지 사이드바** · 카테고리 목록/건수 = **전부 자동**.

수동 필요분: ① 실제 HTML 페이지 생성 ② 그 페이지에 registry `<script>` 1줄 ③ 검색 keywords(§8-2 미해결 시).

→ 현재 "원장 없음 + 6~7곳 수정" → **"원장 1곳 + 신규 페이지"** 로 축소.

---

## 7. 구현 시 수정될 파일

| 파일 | 변경 | 위험 |
|---|---|---|
| `js/knowledge-registry.js` | **신규** — 원장 + 함수 6종. ES5 유지 | 미로드 시 전 소비처 동시 실패 → 호출부 `typeof` 가드 필수 |
| `app.html` head | `<script src="/js/knowledge-registry.js?v=...">` | **로드 순서 최대 위험.** `_SHORTCUTS`(인라인 12223)·`home.js`(18281)보다 **앞**이어야 함 |
| `js/home.js` `_HS2_TILES` | 지식 3줄 삭제 → 루프 합성 | **타일 순서 변경 위험**(보장분석 축 맨 앞 = 대표 지시). 아이콘·색은 원장 필드에 없어 상수 고정 |
| `app.html:5806` `tools[]` | 지식 3줄 → 루프 | 색상 3개가 서로 달라 육안 차이 가능 |
| `app.html:12223` `_SHORTCUTS` | label/sub/view → 원장 참조, `keywords` 잔류 | 간병 keywords 25개 **소실 시 검색 회귀** |
| `app.html:6225` `showView` | 3줄 리라우트 → `knowledgeById` 1줄 | **최고 위험.** 한 줄에 게이트 20여 개 — 잘못 자르면 bojang/xfile/salesnote/goji 동시 붕괴 |
| `app.html:6229` `VALID_VIEWS` | 파생 | id = 뷰키 유지 시 무회귀 |
| `pages/*.html` 3종 | registry `<script>` + 사이드바 루프 + `_relurl` 삭제 | 자체완결 정적 파일. **caregiver는 V3 정본**이라 훼손 시 타이포 표준 영향 |

---

## 8. 판단 갈림 + 권고

**8-1. `updatedAt` 정의** → **본문 내용 변경일 수기 관리 권고.** git 자동은 CSS 한 번 손댈 때마다 세 문서에 동시 `NEW` 배지가 붙는다("근거 없는 숫자 노출 금지" 위반). silson·caregiver 확정값은 **확인 못 함 — 대표/총괄 판정 필요.**

**8-2. 검색 `keywords`** → 대표 지정 필드에 없음. 간병 25개는 버릴 수 없음. **`_SHORTCUTS`에 `{id, keywords}`만 잔류** 권고. ⚠️ **이 경우 "원장 1곳" 원칙이 검색에 한해 미완결.** 후속 트랙(검색 키워드 원장 + 유실된 `caregiver_search_index_v1.json` 복원)으로 분리 권고.

**8-3. `id` = 뷰 키 동일화** → 채택. `?view=silson` 딥링크·북마크·외부 유입이 이미 묶여 있음. `id`가 라벨(`의료실비 변천사`)과 어긋나 보이는 건 **의도된 것**으로 못박아, 나중에 "이름 통일" 명목의 변경 사고를 막는다.

**8-4. 카테고리 문자열** → **`뇌 · 심장`(공백 포함)**. 기존 코드 표기와 일치. 어긋나면 카테고리 매칭이 조용히 실패.

**8-5. `knowledgeIsAdvisor()` 판정 근거** → 스케치는 로그인 여부만 봄. "로그인 = 설계사"가 참인지 **확인 못 함.** 구현 착수 전 기존 역할 판정 함수 실측 필요.

---

## 9. `factGrades`의 실익과 위험 (현 3건 전부 전체공개)

**현실: 3건 전부 `['customer_ok']` → 계산 함수는 항상 `public`. 오늘 기준 이 필드는 실질 무동작.**

| 실익 | 위험 |
|---|---|
| "visibility 수동 입력 금지" 구조를 지금 박아둠 | **검증 불가 코드가 라이브 진입** — `advisor`/`blocked` 분기가 한 번도 안 돌고 배포됨 |
| 계산 지점 1곳 고정 → 두 벌 관리 원천 차단 | **"등급 시스템이 있다"는 착각.** JS에는 있으나 DB·서버엔 여전히 없음 |
| 나중 등급 도입 시 화면 수정 0 | **보안 오인.** 클라이언트 배열 필터는 은닉이지 접근통제 아님 |

**권고: 필드는 두되 3개를 함께 박는다.**

1. 파일 상단 명시 주석 — *"factGrades는 클라이언트 표시 필터일 뿐 접근 통제가 아니다. `internal_only`/`customer_blocked` 문서를 실제로 올릴 때는 페이지 레벨 가드 또는 서버 게이트가 선행되어야 한다."*
2. `internal_only` 문서를 실제 등록하기 전까지 해당 분기는 **미검증**임을 문서에 기록
3. 목업으로 분기 1회 실측 후 원복, 검증 흔적을 PR 본문에 남김

---

## 10. 사이드바 관련자료의 구체적 난점

**실측: 3개 페이지는 외부 JS 참조 0건.** CSS·JS 전부 파일 내부. 자체완결 정적 파일.

| # | 난점 | 대응 |
|---|---|---|
| 1 | 공유 JS 없음 | 각 파일에 `<script>` 1줄 신규 삽입(3파일 편집 불가피, 1회성) |
| 2 | 사이드바가 문자열 concat 생성 | 하드코딩 링크 → 원장 루프. **HTML 이스케이프 필요.** 3페이지에 이스케이프 유틸이 있는지 **확인 못 함** |
| 3 | URL 매핑 4벌 | 원장 `url` 단일화. `data-v` 방식 폐기하고 `href` 직접 링크로 바꾸면 클릭 핸들러도 제거 → 코드 감소 |
| 4 | 자기 자신 제외 | 각 페이지 상단 `var KDOC_ID='silson';` 명시 상수 권고(경로 변경에 안 깨짐) |
| 5 | 로드 실패 시 사이드바 공백 | `typeof` 가드 → **기존 하드코딩 문자열로 폴백.** 최소 1회 배포는 폴백 유지 |
| 6 | 캐시 | `?v=YYYYMMDD` 쿼리 |
| 7 | **V3 훼손 위험** | caregiver는 V3 정본. `.rel` 내부 구조 그대로 재현, 클래스 변경 금지. 편집 전후 1280·375 육안 대조 |

---

## 11. 리스크

| 등급 | 리스크 |
|---|---|
| R1 (높음) | `showView` 초장문 1줄 편집 사고 → 무관한 게이트 동시 붕괴(게이트 밖 노출 0 원칙 위반) |
| R2 (높음) | `factGrades` 클라이언트 필터를 접근통제로 오인 → URL 직접 진입 노출 |
| R3 (높음) | registry 로드 순서 오류 → 홈 타일·검색 바로가기 소실(대표 화면 깨짐) |
| R4 (중간) | 검색 keywords 유실 → 간병 검색 회귀 |
| R5 (중간) | 타일 순서·색·아이콘 변동 → 대표 확정값 되돌림 |
| R6 (중간) | 정적 페이지 편집 중 V3 타이포 훼손 |
| R7 (낮음) | 폐기값(14.5px) 시안 경유 재유입 |

**즉시 중단·보고 트리거:** ① 지식 문서가 아닌 화면의 게이트가 함께 바뀜 ② 비로그인에서 게이트 화면 노출 ③ 홈 타일 개수/순서가 의도와 다름 ④ 3개 페이지 어느 하나라도 V3 폭 710px·본문 16px 이탈.

---

## 12. 대표 승인 필요 자리

| # | 사안 | 등급 |
|---|---|---|
| 1 | ~~`updatedAt` 정의~~ → **확정: 3건 전부 `2026-07-23` 원장 기준일. NEW 배지 이번 범위 제외**(2026-07-23 대표) | 해결 |
| 2 | 검색 `keywords` 원장 밖 잔류 → "원장 1곳"이 검색에 한해 미완결 | B |
| 3 | `factGrades` 분기 목업 검증 후 원복 절차 | B |
| 4 | 카테고리 문자열 `뇌 · 심장`(공백 포함) 확정 | A |
| 5 | 홈 타일 아이콘·색·순서 상수 고정값 | A |
| 6 | **`showView` 리라우트 편집(R1) — 별도 PR·별도 검증** | **C** |

**DB 변경 0건**(대표 확정) — 이번 트랙은 Supabase 무접촉.

---

## 13. 구현 단계 분해 (PR 4개)

| 단계 | 내용 | 검증 | 중단 조건 |
|---|---|---|---|
| **1 (PR-A)** | registry 생성 + head 로드만. **소비처 무접촉** | `knowledgeVisibleDocs()` 3건 / **기존 화면 전부 무변화** | 기존 화면 변화 시 즉시 중단 |
| **1-b** | `factGrades` 분기 목업 검증 후 원복 | `internal_only` 주입 시 비로그인 카운트 감소 | — |
| **2 (PR-B)** | 홈타일 + 홈데스크 + 검색 바로가기 + 정본 라벨 통일 | 타일 개수·순서·아이콘·색 동일 / 3곳 라벨 통일 / 검색 keywords 히트 유지 | 타일 순서 변동, 검색 히트 감소 |
| **3 (PR-C)** | 라우팅 파생 — **`showView` 단독 PR** | 딥링크 3종 / 비게이트 계정에서 bojang·xfile·salesnote·goji·newsletters **여전히 홈 강제** | 게이트 하나라도 뚫리면 즉시 revert·보고 |
| **4 (PR-D)** | 사이드바 3파일 데이터구동(+폴백 유지) | 나머지 2개 노출·자기 제외 / **V3 710px·16px·모바일375 무변화** / 미로드 시 폴백 | V3 이탈 |
| **5** | 카테고리 화면 구현 | 별도 트랙 | 본 트랙 완료 후 |

---

## 14. 확인 못 한 것 (추측으로 메우지 않음)

1. ~~silson·caregiver의 본문 기준 최종 수정일~~ → **해결: 판정 불가를 인정하고 원장 기준일 `2026-07-23`로 통일**(§2-1, 대표 확정)
2. **"로그인 = 설계사"가 성립하는지** — 일반 고객 계정 개념 유무 미확인
3. 3개 정적 페이지 내부의 **HTML 이스케이프 유틸 유무**
4. **`caregiver_search_index_v1.json`** — 리포지토리에 없음. 유실인지 미커밋인지 판정 못 함
5. 카테고리 화면의 탭·칩 재사용 세부 — 이번 범위 밖(운영센터 패턴 재사용은 상위 문서 부록에 확정)
6. 홈 카테고리 카드 6개와 기존 `axis-*` 빈 뷰 6개의 **역할 관계** — 겸하는지 별개인지 미확정

---

*설계안 작성: 총괄팀장(Claude Code) · 조사: os-planner · 실측 재대조: 총괄 · 2026-07-23*
*미확정 6건(§14) + 대표 승인 6건(§12)이 남아 완결이 아님. 코드·DB·배포 무접촉.*
