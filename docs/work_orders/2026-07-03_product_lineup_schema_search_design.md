# 원수사 상품 라인업 — DB 스키마·통합검색·딥링크 설계안 (진실 원천)

> **작성:** 2026-07-03 · 총괄팀장(Code) · 대표 방향 확정 후 문서화
> **상태:** 설계 확정 / **구현·DDL 실행·데이터 적재·검색 수정 0** (본 문서는 설계 진실 원천, 실행은 대표 승인 + 프로젝트 `pdnwgzneooyygfejrvbg` 확인 후 PR 파일로만)
> **시안:** `design-preview/insurer-product-lineup-2026-07.html` (대표 제공, 2026-07 GA소식지 20사 데이터 · UI/구조 기준)
> **정합:** master_strategy §11(검색 가능한 구조화=진입장벽) · §2 중립(어느 원수사도 우선순위 X) · 소식지 파이프라인(reviewing→published 게이트) 동일 패턴

---

## 0. 확정 방향 (대표 결재)

1. 홈 데스크 "상품 라인업" 카드 → **독립 페이지**(`?view=product-lineup`)로 연다. (핵심 중의 핵심)
2. 시안 구조 유지: 좌측 회사목록 · 상단 테마 · 전체조망↔회사별 · **우측 상세 서랍(drawer)**.
3. 상품 데이터 = **Supabase 단일 원천**. 검색용 별도 복사본 만들지 않음.
4. **통합검색도 동일 데이터 재사용** — 상품 라인업은 독립 페이지로 끝나지 않음.
5. 상품 검색어 감지 시: **개별 상품 결과 + 해당 월 전체 라인업 연관 결과**를 함께 제공.
6. 기본 월 = **현재 published 최신 기준월**. URL/검색어에 월 지정 시 그 월.
7. 검색결과 클릭 시: 검색어 유지 · 테마·상품군 자동 필터 · 관련 회사·상품 강조 · 특정 상품이면 **상세 서랍 자동 열림**.
8. **월 단위 발행 게이트** — 소식지와 동일하게 라인업도 월 전체 검수 후 published에서만 화면·검색 노출.
9. 시안의 `ps` + `groups.items._p` 이중 저장 **폐기** — DB는 상품 한 벌 반환, 화면 JS가 `product_group`으로 그룹화.

---

## 1. DB 스키마 (7 오브젝트 + 뷰 1 + RPC 1)

### 1-1. `insurer_companies` — 회사 고유(불변)
| 컬럼 | 타입 | 설명 | 시안 |
|---|---|---|---|
| id | uuid PK default gen_random_uuid() | | |
| name | text UNIQUE NOT NULL | 회사명 | c.n |
| section | text NOT NULL CHECK (life\|nonlife) | 생명/손해 | c._sec |
| color | text | 브랜드색 | c.cl |
| color2 | text | 그라데이션색 | c.cl2 |
| sort_order | int default 0 | 목록 정렬 | |
| created_at / updated_at | timestamptz default now() | | |

### 1-2. `insurer_company_snapshots` — 회사×월(월별 변경)
| 컬럼 | 타입 | 설명 | 시안 |
|---|---|---|---|
| id | uuid PK | | |
| company_id | uuid FK→insurer_companies NOT NULL | | |
| base_month | date NOT NULL | 기준월(2026-07-01) | |
| catchphrase | text | 캐치프레이즈 | c.cat |
| compliance | text | 고객 게시 금지 문구 | c.comp |
| source_doc | text | 소식지명 | c.mo |
| created_at | timestamptz default now() | | |
| — | UNIQUE (company_id, base_month) | | |

### 1-3. `insurer_products` — 상품 고유(불변 정체성)
| 컬럼 | 타입 | 설명 | 시안 |
|---|---|---|---|
| id | uuid PK | | |
| company_id | uuid FK→insurer_companies NOT NULL | | |
| name | text NOT NULL | 상품명 | p.t |
| product_group | text | 상품군(화면 그룹 키) | p.grp / g.g |
| created_at / updated_at | timestamptz default now() | | |
| — | UNIQUE (company_id, name) | | |

> product_group(상품군)은 상품 고유로 둔다. 월별로 분류가 바뀌는 사례가 확인되면 스냅샷으로 이관(테마와 동일 논리). 현재는 고유.

### 1-4. `insurer_product_snapshots` — 상품×월(월별 변경값)
| 컬럼 | 타입 | 설명 | 시안 |
|---|---|---|---|
| id | uuid PK | | |
| product_id | uuid FK→insurer_products NOT NULL | | |
| base_month | date NOT NULL | 기준월 | |
| age | text | 가입연령 | p.age |
| features | text | 핵심특징 | p.f |
| goji_type | text | 고지유형 | p.gojiType |
| badge | text CHECK (NEW\|HOT\|null) | 상태 강조 | p.b |
| status | text | 판매중·판매중지·개정예정 등 | (features 내 문구→정규화) |
| source_page | text | 출처 페이지 | (mo 내 p.18 등) |
| created_at | timestamptz default now() | | |
| — | UNIQUE (product_id, base_month) | | |

### 1-5. `insurer_themes` — 테마 통제 어휘 마스터
| 컬럼 | 타입 | 설명 |
|---|---|---|
| key | text PK | 테마 키(유병자·간편/암/종신/…) |
| label | text NOT NULL | 표시명 |
| sort_order | int default 0 | 칩 정렬 |

> 시안 THEMES 20종을 시드. 통제 어휘 = 오타·난립 방지, 필터·검색 일관.

### 1-6. `insurer_product_snapshot_themes` — 스냅샷×테마 연결 (★수정: 상품 아닌 스냅샷 기준)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| snapshot_id | uuid FK→insurer_product_snapshots NOT NULL | 월별 스냅샷 |
| theme_key | text FK→insurer_themes NOT NULL | |
| — | PK (snapshot_id, theme_key) | |

> **테마가 월별로 달라질 수 있으므로** 상품 고유가 아니라 **스냅샷(상품×월) 기준**으로 연결. 각 월 라인업이 자기 테마 세트를 가진다. 시안 `p.th` 배열 → 이 연결로 정규화.

### 1-7. `insurer_lineup_months` — 기준월 발행 게이트 (★published 진실 원천)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| base_month | date PK | 기준월(2026-07-01) |
| status | text NOT NULL default 'draft' CHECK (draft\|reviewing\|published\|archived) | 발행 상태 |
| published_at | timestamptz | 발행 시각 |
| note | text | 검수 메모 |

> 소식지 파이프라인과 동일 게이트. **월 전체를 검수 후 published**. 화면·검색은 published 월만 노출. "현재 published 최신 기준월" = `max(base_month) WHERE status='published'`.

### 1-8. VIEW `insurer_products_current` — 최신 published 월 전용 (★수정: 월 파라미터 없음)
- 조인: `insurer_products` × `insurer_product_snapshots`(최신 published month) × `insurer_companies` × `insurer_company_snapshots`(동월) × 테마 집계.
- WHERE `base_month = (SELECT max(base_month) FROM insurer_lineup_months WHERE status='published')`.
- 라인업 페이지 기본 진입·통합검색이 이 뷰를 조회. **데이터 복사본 아님(가상 조인)** → 단일 원천 유지.

### 1-9. RPC `insurer_products_for_month(p_month date)` — 특정 월 조회 (★수정: 뷰와 분리)
- 인자 월의 스냅샷 조인 반환. **단, `insurer_lineup_months.status='published'`인 월만 허용**(비published 월 요청 시 빈 결과).
- 라인업 페이지 `?month=` 파라미터·과거 월 이력 조회에 사용. current 뷰와 책임 분리.

### 1-10. RLS (보완 반영 2026-07-03 — published 게이트 DB 강제)
- **고유정보 공개**: 회사·상품·테마 마스터는 authenticated SELECT(true).
- **월별 published 강제**: `insurer_product_snapshots`·`insurer_company_snapshots` SELECT = `insurer_is_published_month(base_month)`. `insurer_product_snapshot_themes` = `insurer_is_published_snapshot(snapshot_id)`. → 고유정보가 draft 월 스냅샷과 조인돼도 draft는 노출 0(정책 분리로 차단).
- **발행 게이트**: `insurer_lineup_months` SELECT = published 또는 admin. UPDATE/INSERT/DELETE = `is_admin()`만. **일반 authenticated 직접 UPDATE 권한 없음.** 기본 발행 경로 = service_role Edge Function(RLS 우회, 소식지와 동일 사상).
- **헬퍼**: `insurer_is_published_month`·`insurer_is_published_snapshot`(SECURITY DEFINER, search_path 고정 — lineup_months RLS 재귀 회피). 관리자 판별 = 기존 `is_admin()` 재사용.
- **뷰/RPC 우회 방지**: 뷰 `insurer_products_current`는 `security_invoker=on`, RPC `insurer_products_for_month`는 `security invoker`+`search_path=public`+published join → 호출자 RLS 그대로 적용.
- **이력 보존**: 스냅샷 쓰기 정책 미부여 = 일반 경로 UPDATE/DELETE 0. 발행 후 archived 전이(append-only 운영).
- 고객 게시 금지는 앱 레벨 컴플라이언스 문구(company_snapshots.compliance) 노출로.

---

## 2. 검색 매칭 규칙 (통합검색 ← 동일 DB, 복사본 없음)

### 2-1. 상품 검색어 감지 (아래 중 하나라도 매칭 → "상품 관련" 판정)
- 검색어 ↔ `insurer_themes`(label/key) 매칭 (예: "암보험"→암 테마) = 강한 신호
- 검색어 ↔ `products.name` · `snapshot.features` · `companies.name` · `product_group` ilike ≥ 1건

### 2-2. 감지 시 결과 2종 함께 제공
- **개별 상품 결과** — 매칭 상품 상위 N건. 각 카드: 회사·상품명·핵심특징 일부 · **기준월 배지 필수**.
- **라인업 연관 결과 카드** — "〈검색어〉 · 〈기준월〉 원수사 라인업 (N사 M종) 전체 보기" 진입 카드 1장.

### 2-3. 기준월 결정
- URL/검색어에 월 지정 → 그 월(RPC).
- 없으면 → 최신 published(current 뷰).

### 2-4. 검색 인덱스 구성
- `insurer_products` + (최신 or 지정월) `insurer_product_snapshots` 결합으로 검색 대상 구성. **월별 데이터 덮어쓰지 않고 이력 유지**.
- 물리 복사본 없음 — current 뷰/for_month RPC를 검색이 직접 조회(또는 통합검색 fetch 시 조인).

### 2-5. 통합검색 그룹
- 현재 7그룹(Q&A·소식지·공지·스크립트·지식엔진·자료실·정적메뉴)에 **"상품 라인업" 8번째 그룹** 추가.
- 각 결과 카드에 **기준월 표시 필수**.

---

## 3. 딥링크 매핑

### 3-1. URL 구조 (뷰 이름 = `product-lineup`)
| 시나리오 | URL |
|---|---|
| 전체 연관 라인업 | `?view=product-lineup&month=2026-07&q=암보험` |
| 특정 상품 상세 | `?view=product-lineup&month=2026-07&product=<product_id>` |

### 3-2. 라인업 페이지 진입 시 파라미터 동작
| 파라미터 | 동작 |
|---|---|
| `month` | 해당 기준월 로드(RPC). 없으면 최신 published(current 뷰) |
| `q` | 검색어로 **테마·상품군 자동 필터 + 관련 회사·상품 강조** + 검색 입력창에 검색어 유지 |
| `product` | **해당 상품 상세 서랍 자동 open** + 그 상품/회사 강조(첫 화면 아님) |
| `q`+`product` | product 우선(서랍 open) + q 유지 |

### 3-3. 검색결과 → 딥링크
- 개별 상품 결과 클릭 → `product=<id>` → 상세 서랍 자동 열림(+검색어 유지, 회사·테마 강조).
- 라인업 연관 카드 클릭 → `q=<검색어>` → 테마·상품군 필터 + 관련 회사·상품 강조(검색어 유지).
- 강조/흐림 = 시안 `.match` / `.dim` 클래스 재사용.

---

## 4. 화면 매핑표 (시안 UI ← DB)
| 시안 요소 | DB 소스 |
|---|---|
| 좌측 회사목록·색점·상품수 | companies + count(products, 최신 published월) |
| pool 생명/손해 | companies.section |
| 회사 헤더 캐치프레이즈·컴플라이언스·출처 | company_snapshots(해당 월) |
| 상단 테마칩 | insurer_themes |
| 전체조망 카드 상품줄(이름·NEW/HOT) | products.name + snapshot.badge |
| 회사별 그룹(상품군) | **products.product_group으로 화면 JS 그룹화** |
| 상품행 연령·특징 | snapshot(age·features) |
| 우측 상세 서랍 | product_group + snapshot(age·features·goji_type·source_page) + snapshot_themes + company_snapshot(source_doc) |

> **중복 제거:** DB는 상품 한 벌(products+snapshot+themes)만 반환. 화면 JS가 평면(전체 조망) / product_group 그룹(회사별) 두 표현으로 렌더. 시안의 `_p` 통째 복제 폐기.

---

## 5. 다음 단계 (본 문서 승인 후)
1. **DDL 초안** — 위 7 오브젝트 + 뷰 + RPC + RLS의 CREATE 문 작성(실행 X, PR 파일로만, 프로젝트 확인 후 대표/검수팀 실행).
2. **데이터 적재 설계** — 시안 2026-07 데이터(20사) → companies/products/snapshots/themes 매핑 적재 스크립트(중복 제거 반영). lineup_months(2026-07) draft→검수→published.
3. **화면 배선** — app.html `#v-product-lineup` 뷰: 시안 UI 이식 + current/for_month fetch + 딥링크 파싱 + 상세 서랍.
4. **홈 데스크 카드 연결** — 자료·도구 "상품 라인업" 카드 → `showView('product-lineup')` (현 samsung-lineup 전용 → 전체 원수사).
5. **통합검색 배선** — `_runSearch` 8번째 그룹(상품) + 감지 규칙 + 결과 2종 + 기준월 배지 + 딥링크.

## 6. 배선 상세 (구현 설계 — 아직 코드 0)

> DDL 초안 SQL = `db/migrations/2026-07-03_product_lineup_schema.sql` (작성 완료, 실행 금지 헤더 포함).

### 6-1. 화면 — app.html `#v-product-lineup`
- 시안 UI 이식(좌 회사목록 · 상단 테마칩 · 전체조망↔회사별 · 우측 상세 서랍). 시안 `:root` 색 → 원세컨드 토큰 매핑.
- 데이터 fetch: 기본 = view `insurer_products_current` / `month` 지정 = rpc `insurer_products_for_month(month)`.
- 상품 한 벌(product_id·name·product_group·company·snapshot·themes)만 받아 **JS가 그룹화**(시안 `_p` 복제 폐기).
- 홈 데스크 자료·도구 "상품 라인업" 카드 onclick = `showView('product-lineup')` (현 `samsung-lineup` 전용 대체).

### 6-2. `showView('product-lineup', {month,q,product})` 진입 흐름 (의사코드)
```
parse month, q, product            // URL 또는 options
data = month ? rpc.for_month(month) : view.current
if data.empty  -> "해당 월 미발행" 안내(빈 상태)
render 시안 UI(회사목록·테마칩·전체 조망)
if q       -> input.value=q; applyThemeGroupFilter(q); highlightMatches(q)  // .match/.dim 재사용
if product -> openDrawer(product); highlight(product.company)               // 첫 화면 아닌 상세 서랍
pushState ?view=product-lineup&month=<M>&(q=<q> | product=<id>)
```

### 6-3. 통합검색 `_runSearch` 확장 (의사코드)
```
기존 7그룹 병렬 + '상품 라인업' 8번째 그룹:
  base = month ? for_month(month) : current
  rows = base where product_name ILIKE q OR features ILIKE q
                  OR company_name ILIKE q OR product_group ILIKE q OR theme(label/key) ILIKE q
  detected = rows.length>0 || themeMatch(q)
  if detected:
    개별상품카드[] = rows.slice(0,N) each { company, name, 기준월배지, click -> ?product=<id> }
    라인업연관카드 = { label:"〈q〉 · 〈월〉 원수사 라인업 (N사 M종) 전체 보기", click -> ?q=<q> }
  그룹 라벨 = "상품 라인업" · 모든 카드에 기준월 표시 필수
```
- 기준월 = URL/검색어 `month` 우선, 없으면 최신 published(§2-3).
- 감지 규칙 §2-1 · 결과 2종 §2-2 · 딥링크 §3.

### 6-4. 데이터 적재 (후속, 실행 X)
- 시안 `T_LIFE`/`T_NON`(20사) → companies · company_snapshots · products · product_snapshots · snapshot_themes 매핑.
- `insurer_lineup_months(2026-07-01)` = draft 등록 → 검수 → published.
- 중복(`_p`) 제거: 상품 1행 / 월 1스냅샷 / 테마 연결. 적재 스크립트는 PR 파일로만.

## 7. 미착수·금지 (현재)
- DDL 실행 0 · 데이터 적재 0 · 검색 수정 0 · app.html 변경 0. 본 문서 + DDL 초안 SQL은 설계 진실 원천(실행 아님).
- Supabase 실작업 전 프로젝트 `pdnwgzneooyygfejrvbg`(onesecond-v1-restore-0420) 확인 필수.
- 다음 실행 순서: ①DDL PR 검수·실행(대표/검수팀) → ②2026-07 데이터 적재 → ③draft→published 검수 → ④화면 `#v-product-lineup` 배선 → ⑤홈 카드 연결 → ⑥통합검색 8번째 그룹·딥링크.
