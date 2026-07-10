# 공통 기준 데이터 정합·갭보강 — 실비변천사 · 상품 라인업 (진실 원천)

> **작성:** 2026-07-09 · 작업팀(총괄팀장 위임) · 대표 방향 확정 후 문서화
> **성격:** 정형 DB 구조화·정합·갭보강 **문서만**. 화면 재설계 아님 · 운영 DB write 0 · 화면 파일 수정 0 · 채굴 실가동 0.
> **목표:** 실비변천사(코드 `#v-silson` / `pages/silson-generations.html`)와 상품 라인업(코드 `?view=product-lineup`)을 원세컨드 통합검색·소식지·업무노트·상담(고객관리)·추천엔진이 함께 조회하는 **공통 기준 데이터**로 승격하기 위한 필드 정합·매핑·연결 초안.
> **정합 진실 원천:** `docs/strategy/organism_architecture_v1.md` · `docs/strategy/master_strategy_v1.md` §11
> **핵심 원칙:** 재작업 금지(기존 자산 재사용) · 지어내기 0(원장에 있는 값만) · "같은 row, 여러 화면"(유기체 §7).

---

## 대상 자산 (오늘 기준 실재 확인 완료)

### 실비변천사
| 자산 | 경로 | 상태 |
|---|---|---|
| 원장 v1 (5 row) | `docs/work_orders/2026-07-07_silson_generations_ledger.json` | 기존 |
| **원장 v2 (검색키워드 보강 · 오늘 기준)** | `docs/work_orders/2026-07-09_silson_generations_ledger_v2.json` | **오늘 산출물 기준** |
| DDL 초안 | `db/migrations/2026-07-07_silson_generations_schema.sql` (테이블 `silson_generations`) | 기존 · 실행 금지(DRAFT) |
| 화면 | `pages/silson-generations.html` (표 8행×5세대 + 카드 5 + 패널, 전량 하드코딩·fetch 0) · app.html `#v-silson`이 iframe 로드 | 기존 |
| 설계 문서 | `docs/work_orders/2026-07-07_silson_pilot_design.md` | 기존 |

### 상품 라인업
| 자산 | 경로 | 상태 |
|---|---|---|
| 데이터 246건 (21사 · 생명132/손해114) | `data/insurer_products_2607.json` | 기존 |
| **갭보강 오버레이 (신규 3필드 · 246 row)** | `docs/work_orders/2026-07-09_product_lineup_gapfill_overlay.json` | **오늘 산출물 · 생성 확인됨** |
| 스키마 설계 (7테이블 + 뷰 + RPC + RLS) | `docs/work_orders/2026-07-03_product_lineup_schema_search_design.md` | 기존 |
| DDL 초안 | `db/migrations/2026-07-03_product_lineup_schema.sql` · 적재 draft `..._load_2026-07_draft.sql` | 기존 · 실행 금지 |

---

## 1. 대표 요청 항목 ↔ 기존 필드 매핑표 ("빠짐없이" 증명)

### 1-1. 실비변천사 13항목 매핑표

| # | 대표 요청 항목 | 원장 v2 필드 | DDL 컬럼 (`silson_generations`) | 신규/기존 |
|---|---|---|---|---|
| 1 | 세대 | `gen` | `gen` (smallint, 자연키) | 기존 |
| 2 | 적용기간 | `range` (+ 판정용 `from`/`to`) | `range_label` (+ `valid_from`/`valid_to`) | 기존 |
| 3 | 재가입주기 | `재가입주기` | `rejoin_cycle` | 기존 |
| 4 | 갱신주기 | `갱신주기` | `renewal_cycle` | 기존 |
| 5 | 입원자기부담 | `입원자기부담` | `copay_inpatient` | 기존 |
| 6 | 통원공제금액 | `통원공제` | `copay_outpatient` | 기존 |
| 7 | 통원한도 | `통원한도1일` | `outpatient_limit` | 기존 |
| 8 | 입원한도 | `입원한도연간` | `inpatient_limit` | 기존 |
| 9 | 비급여구조 | `비급여구조` | `nonpayment_struct` | 기존 |
| 10 | 보험료할증 | `보험료할증` | `premium_surcharge` | 기존 |
| 11 | 핵심특징 | `한줄정리` (+ 심층 `notes`) | `one_liner` (+ `notes`) | 기존 |
| 12 | **검색키워드** | **`검색키워드`** (v2 신규 · text[]) | **없음 → `search_keywords text[]` ALTER 추가 필요** | **신규 (v2)** |
| 13 | 출처 | `source` | `source` | 기존 |

**결과:** 13항목 중 12항목은 기존 원장·DDL에 이미 존재. **검색키워드(12번) 1개만 v2 신규**이며 DDL에 컬럼 1개(`search_keywords text[]`) 추가가 필요하다(문서 명시만, 실행 금지). 미매핑 항목 0.

> 보조 필드(원장에 있으나 대표 13항목 밖): `name`(표시명) · `boundary_note`(경계 판정 유의, 예 2세대 2013-04-01 내부 분기) · `sort_order`(정렬) · `review_status`(게이트). 화면·판정 재사용에 필요해 유지.

### 1-2. 상품 라인업 11항목 매핑표

| # | 대표 요청 항목 | 기존 JSON 필드 / 오버레이 | 스키마 테이블.컬럼 | 신규/기존 |
|---|---|---|---|---|
| 1 | 보험사명 | `company` (기존) | `insurer_companies.name` | 기존 |
| 2 | 손보생보구분 | `section` (기존, life/nonlife) | `insurer_companies.section` | 기존 |
| 3 | 상품명 | `product` (기존) | `insurer_products.name` | 기존 |
| 4 | 상품군 | `group` (기존) | `insurer_products.product_group` | 기존 |
| 5 | 테마 | `themes` (기존, 배열) | `insurer_product_snapshot_themes` (← `insurer_themes` 통제어휘) | 기존 |
| 6 | 고지유형 | `goji_type` (기존) | `insurer_product_snapshots.goji_type` | 기존 |
| 7 | **간편일반여부** | **오버레이 `간편일반`** (goji_type 파생: 간편/일반/null) | `insurer_product_snapshots` 신규 컬럼(예 `simple_std`) | **신규 (오버레이)** |
| 8 | HOT/NEW | `badge` (기존) | `insurer_product_snapshots.badge` (CHECK NEW/HOT/null) | 기존 |
| 9 | **노출순서** | **오버레이 `sort_order`** (원본 배열순 1..N) | `insurer_products.sort_order` 신규 컬럼 | **신규 (오버레이)** |
| 10 | 검색키워드 | `search_text` (기존, 상품·회사·테마·특징 결합문자열) | 저장 컬럼 아님 — 검색 인덱스 파생(설계 §2-4, `name`+`features`+`company`+`group`+테마 결합) | 기존 |
| 11 | **비고** | **오버레이 `비고`** (빈 문자열·사람 검수 자리) | `insurer_product_snapshots` 신규 컬럼(예 `note`) | **신규 (오버레이)** |

**결과:** 11항목 중 8항목은 기존 JSON·스키마에 존재. **간편일반여부·노출순서·비고 3개만 오버레이 신규**. 검색키워드(10번)는 기존 `search_text` 재사용(별도 복사본 없음). 미매핑 항목 0.

> 보조 필드(JSON에 있으나 대표 11항목 밖): `id` · `company_color`(→ `insurer_companies.color`) · `source`(→ `insurer_company_snapshots.source_doc`) · `age`(→ `snapshot.age`) · `feature`(→ `snapshot.features`) · `status`(적재 게이트). 화면·검색·발행 게이트에 필요해 유지.

---

## 2. 갭보강 요약

| 데이터 | 추가 필드 | 산출 위치 | DB 반영(문서만) |
|---|---|---|---|
| 실비변천사 | `검색키워드` 1개 | 원장 v2 완료 (`..._silson_generations_ledger_v2.json`) | DDL에 `ALTER TABLE silson_generations ADD COLUMN search_keywords text[];` 1줄 (실행 금지) |
| 상품 라인업 | `sort_order` · `간편일반` · `비고` 3개 | 오버레이 완료 (`..._product_lineup_gapfill_overlay.json`, 246 row) | 스키마에 컬럼 3개 추가 필요 — `insurer_products.sort_order` / `insurer_product_snapshots.simple_std` / `insurer_product_snapshots.note` (실행 금지) · `search_text`는 기존 재사용(추가 0) |

**공통:** 갭보강은 신규 필드만 오버레이/보강본으로 얹었고, 기존 필드는 1글자도 복제·변경하지 않았다(무복제·무변경). 지어내기 0 — 검색키워드는 원장 기존 표현(별칭·연도·제도용어)에서만 추출, 간편일반은 goji_type 파생, 비고는 빈 문자열.

---

## 3. 화면 표시용 ↔ 검색용 데이터 분리

원세컨드 검수 기준: **화면에 보이는 텍스트와 검색에 쓰는 텍스트를 분리**한다(표시용 문구를 검색 매칭에 그대로 쓰지 않음).

| 데이터 | 표시용(화면 렌더) | 검색용(매칭) | 분리 상태 |
|---|---|---|---|
| 실비변천사 | `one_liner`(한줄정리) · `notes`(심층 패널) · 표 8축 값 | `search_keywords`(v2 신규 배열) | v2에서 신규 분리 |
| 상품 라인업 | `feature`(핵심특징) · `age` · 회사 캐치프레이즈 | `search_text`(기존 결합문자열) | 이미 분리됨 |

- 실비: 사용자가 세대를 찾을 때 입력할 표시용 용어("구실손", "착한실손", "2017년 4월", "3대비급여" 등)를 `search_keywords`에 별도 보관. 화면 표는 `one_liner`/`notes`로 렌더 → 표시와 검색이 섞이지 않음.
- 라인업: `feature`는 화면 카드에 보이는 문장, `search_text`는 회사·상품·테마·특징을 합친 검색 전용 문자열 → 설계 단계부터 분리 완료.

---

## 4. 공통 기준 데이터 연결 초안 (5개 소비처)

핵심 메시지: **같은 row를 여러 화면이 조회해 재조립한다(유기체 §7).** 하드코딩 이중관리를 제거하고, 세대 정의·상품 카탈로그를 단일 원장에서만 관리한다.

| 소비처(라이브 용어) | 실비변천사 원장 재사용 | 상품 라인업 원장 재사용 |
|---|---|---|
| 통합검색 | 세대 검색키워드 any-match → 해당 세대 정의 카드 렌더 | 상품 검색어 감지 → 개별 상품 결과 + 해당 월 라인업 연관카드 (설계 §2 재사용) · 통합검색 **8번째 그룹** |
| 소식지 | 소식지가 세대 개편(5세대 등) 변경 감지 원천 → 세대 원장 근거 문서 | 소식지가 상품 변경 감지 원천 → 라인업 `base_month` 발행 게이트와 소식지 published 게이트 **동일 사상** |
| 업무노트 | 세대 기준 데이터를 category·tags로 연결(동일 용어) | 상품/상품군/테마를 category·tags로 연결(동일 통제어휘) |
| 상담(고객관리) | 고객 실손 가입일 → 세대 판정(코드 `judgeGen(date)`) → 세대 정의 조회(`valid_from`/`valid_to` 재사용) | 상품 추천 시 라인업 조회(테마·상품군 필터) |
| 추천엔진(향후) | 기가입 세대 비교(내 세대 vs 전환 세대 손익) | 고객 상황(나이·니즈 테마) → 라인업 테마/상품군 필터 |

- **통합검색·소식지·업무노트·상담·추천엔진이 모두 같은 `silson_generations` / `insurer_products` 원장을 조회.** 세대 표와 세대 판정이 동일 `valid_from`/`valid_to`를 참조하므로 영원히 일치(하드코딩 이중관리 소멸).
- 소식지는 단순 열람 PDF가 아니라 상품·세대 변경 감지 원천(유기체 §4). 감지된 변경점은 ai_draft로 분리, approved만 원장·화면 반영.

---

## 5. 검색 연결 방식 초안

### 5-1. 실비변천사
- `search_keywords` 배열 any-match(사용자 입력이 배열 원소 중 하나라도 매칭) → 해당 세대의 approved/published row 반환 → 세대 정의 카드 렌더.
- **게이트:** RLS로 `status in ('approved','published')`인 row만 노출(초안·검수중은 admin만). 검색은 게이트 통과분만 조회.
- 표시용(`one_liner`/`notes`) ≠ 검색용(`search_keywords`) 분리 유지.

### 5-2. 상품 라인업 (설계 §2 요약)
- 매칭 규칙: 검색어 ↔ `insurer_themes`(label/key) = 강한 신호 / 검색어 ↔ `products.name` · `snapshot.features` · `companies.name` · `product_group` · (기존)`search_text` ilike ≥ 1건.
- 감지 시 결과 2종: 개별 상품 결과(상위 N) + "〈검색어〉·〈기준월〉 원수사 라인업 (N사 M종) 전체 보기" 연관카드 1장.
- **기준월 배지 필수** — 모든 결과 카드에 기준월 표시. 기준월 = URL/검색어 `month` 우선, 없으면 최신 published.
- **딥링크:** `?view=product-lineup&month=<M>&q=<검색어>` / `?view=product-lineup&month=<M>&product=<product_id>`(상세 서랍 자동 열림).
- 표시용(`feature`) ≠ 검색용(`search_text`) 분리 재확인.

---

## 6. 화면 회귀 위험 목록

### 실비변천사
- 화면이 iframe 격리(`pages/silson-generations.html`)라 **회귀 반경이 이 한 파일에 고립**. app.html `#v-silson`은 iframe src만 로드 → src 불변이면 무영향.
- DB 조회 전환 시에도 조회 실패·0 row·타임아웃이면 **기존 정적 HTML 폴백**(성공 시에만 교체) → 화면이 비는 회귀 물리적 불가능(설계 §4-2).
- app.html 내 5세대 실손 mock 브로슈어 카드는 변천사 화면과 별개(홈 회전 mock). 중복 정리는 별 트랙.

### 상품 라인업
- 현재 화면(예 `samsung-lineup`)과 신규 `product-lineup` 뷰는 격리. 신규 뷰 배선 전까지 기존 화면 무변경.
- 발행 게이트: `insurer_lineup_months.status='published'`인 월만 노출. 게이트 off(비published)면 미노출(빈 상태 안내) → 오노출 회귀 차단.

### 공통
- **오늘 산출물은 전부 working tree 문서/JSON → 라이브 화면 회귀 물리적 0** (DB write 0 · 화면 파일 수정 0).
- 실제 회귀 위험은 다음 단계(DB 적재·화면 배선) 시점에 발생 → 그때 Deploy Preview 검수 + 폴백/게이트로 통제.

---

## 다음 단계 (대표 승인 후 — 오늘 범위 아님)

**공통 순서:**
1. DDL ALTER/컬럼 추가 검수 — 실비 `search_keywords text[]` 1줄 · 라인업 `sort_order`/`simple_std`/`note` 3컬럼 (PR 파일로만).
2. 프로젝트 `pdnwgzneooyygfejrvbg`(onesecond-v1-restore-0420) 확인.
3. DDL 실행 (검수팀/승인 후).
4. 시드 `reviewing` 적재 — 실비 5 row(v2) · 라인업 246건 + 오버레이 3필드 병합.
5. 검수 → `approved`/`published` 승격.
6. 화면 배선 — 실비 iframe 조회 렌더+폴백 · 라인업 `#v-product-lineup` 뷰.
7. 통합검색 배선 — 실비 세대 키워드 매칭 · 라인업 8번째 그룹·딥링크.

> **오늘 범위:** 1~7 착수 전 **정합·매핑·갭보강 문서**까지. DB 실행·화면 수정·채굴 실가동은 하지 않음.
