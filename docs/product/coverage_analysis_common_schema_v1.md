# 보장분석 4축 통합 표준 계약서 v1 (설계·읽기 전용)

> **성격:** 암 · 뇌/심장 · 수술비 · 의료실비 4축을 **하나의 `coverage_*` 공통 구조**로 묶는 표준 계약. **설계 문서 — 구현 아님.**
> **작성:** 총괄팀장(Code) / 2026-07-15 새벽 (대표 취침 중, A/B등급 문서 작업)
> **입력:** 기획팀장(Claude Web) 3축 시안 v2 · 김실장 3축 전달 패키지 v0.2(`coverage_3axes_total_package`) · 총괄 의료실비 하니스 골격
> **원칙(대표 확정):** 각 페이지는 `category`만 다르고 코어 구조 공통 · 종합 보장분석은 나중에 category 결과를 모아 조합 · **화면 전에 원장** · 유기체(같은 원장, 여러 화면).
> **⚠️ 이 문서는 실행 지시가 아니다.** 운영 DB DDL·seed·RLS·고객 공개·상담관리 insert·EF 배포는 **전부 대표 승인 자리**(§9).

---

## 1. 유기체 그림 — 임태성 실장 화면 위의 닫힌 고리

```
[공용 지식 원장]  coverage_facts / tiers / treatments / surgery_types …
      │  (한 벌의 원장을 여러 화면이 재조립 — 하드코딩 페이지 나열 아님)
      ▼
[독립 페이지]  암 · 뇌/심장 · 수술비 · 의료실비   ← category만 다르고 뼈대 공통
      │  임태성이 카드(딸깍/카드 만들기)로 잘라 고객에게 공유
      ▼
[고객 자가진단 → 판정]  →  coverage_lead (owner=임태성, 개인 격리)
      │
      ▼
[임태성 화면으로 회수]  상담관리(sales_customers 승격) → 보장분석 현황표(축별 결과 재조립)
                        → 종합 리포트(category 결과 aggregate, 나중) → 상담·클로징
                        → 데이터가 원장에 다시 쌓임 → 유기체 성장
```

**핵심:** 페이지는 원장을 **읽어** 렌더되고, 페이지의 **결과는 임태성의 원장으로 되돌아와** 재사용된다. 그래서 **지금 짜는 4축 공통 구조가 곧 종합 리포트·현황표의 원장**이다(종합 리포트 자체는 안 만들되, 올라탈 자리는 비워둔다).

---

## 2. ERD 초안

### 2-1. 마스터
- **`coverage_categories`** — slug(`cancer`·`brain_heart`·`surgery`·`medical`) · name · sort_order · status

### 2-2. 공통 코어 (전 축 공유, `category` FK)
| 테이블 | 핵심 필드 |
|---|---|
| `coverage_facts` | category · fact_group · fact_key · value_num · value_text · unit · display_text · usage(jsonb) · source_name · publisher · source_url · as_of · **review_status** · **exposure** · display_order |
| `coverage_treatments` | category · organ_group(nullable) · method · subtype · coverage_type · cost_min/max · cost_unit · display_cost · insurance_gap_note · source_url · review_status |
| `coverage_quiz_questions` | category · question_key · step · question_text · sub_text · options(jsonb) |
| `coverage_result_rules` | category · rule_key · **condition(jsonb)** · result_level · title · message · cta_label · priority |
| `coverage_page_blocks` | category · block_key · ui_type · title · data_dependencies(jsonb) · display_order |
| `coverage_report_blocks` | category · block_key · title · template · usage (개인 현황표·종합 리포트용 문구) |

### 2-3. 축별 확장 모듈 (특정 축만 채움, `category`/`organ_group` 키)
| 축 | 확장 테이블 |
|---|---|
| 뇌/심장 | `coverage_disease_tiers`(organ_group · tier_level · tier_label · coverage_name · code_range · includes[] · excludes[] · share_note · customer_warning) · `coverage_special_care_rules`(rule_key · label · duration_text · applies_when · exclusions[] · warning_message) |
| 수술비 | `coverage_life_map`(age_band · top_surgeries[]) · `coverage_surgery_types`(type · rule · example · caution) · `coverage_surgery_costs`(surgery · coverage_type · cost_min/max · gap_note) · `coverage_insurance_gap_rules`(rule_key · gap_note · source) |
| 의료실비 | **`silson_generations` 재사용**(기존 라이브 — 신설 없음, judgeGen 세대 판정) |
| 암 | 확장 없음(treatments 중심) |

### 2-4. 개인 원장 (owner 격리 — 공용 지식과 물리 분리)
| 테이블 | 용도 |
|---|---|
| `customer_coverage_holdings` | 고객 PDF 추출/문진 기반 보장현황 — owner_id · customer_id(FK sales_customers) · category · fact_key · holding_value · source_ref |
| `coverage_customer_results` | **종합 리포트 원장 자리** — owner_id · customer_id · category · result_level · payload_snapshot(jsonb) · created_at → *나중에 종합 리포트가 `select … where customer_id=?` 로 축별 결과 aggregate* |
| `coverage_lead` | 상담신청 — owner_id · customer_id(nullable) · category · result_level · payload(jsonb) · consent_at · status(new→promoted) |

### 2-5. 기존 구조와의 관계 (충돌 검토)
- `coverage_*` = **전부 신규**(네임 충돌 0). 유일 재사용 = `silson_generations`(읽기만).
- `sales_customers`(상담관리 원장) = `coverage_lead`/`holdings`/`results`가 **FK 참조만**, 직접 insert 금지 → 원장 무오염.
- 실비 base·상품 라인업(라이브) = 상품 마스터로 역할 분리(coverage_facts=분석 기준). 무충돌.
- 실손 "변천사" 페이지 = **무접촉 유지**(지식 열람), 새 보장분석 페이지가 원장만 재사용.
- **경계 원칙:** *모든 축이 쓰면 코어 / 특정 축만 쓰면 확장 모듈.*

---

## 3. 데이터 상태 관리 — 2축 게이트 (안전의 핵심)

두 축으로 분리한다:
- **status**(콘텐츠 준비도): `draft → reviewing → approved → published`
- **exposure**(출처 검증도): `customer_ok / internal_only / customer_blocked`
- 매핑: reviewed_official→customer_ok · needs_source_url_verification→internal_only · blocked→customer_blocked · **reviewing→internal_only 취급**.

**★ 서버 강제(절대):** 고객용 조회 = **`status ∈(approved,published)` AND `exposure=customer_ok`** 만 서버(RLS/뷰)에서 내려보냄. **internal_only·customer_blocked 수치는 클라이언트에 전송 자체 차단.** 데모의 `CUSTOMER_MODE`(클라 플래그)는 **시안 전용 — 프로덕션 금지**(우회 가능). 검수 모드 = admin/게이트 계정만 reviewing·internal_only 열람.

---

## 4. 화면 반영 (공통 컴포넌트화)
- 3개 데모 = 독립 HTML 시안(design-preview 계열). 실앱 = `coverage_*` fetch 렌더로 전환.
- **공통 렌더러 1벌 + `category` 파라미터** — 코어 구조 동일 → 한 벌로 4축 렌더, 축별 확장 블록만 조건부.
- **fallback:** 조회 실패·0행·타임아웃 → 정적 폴백(회귀 0, 실손 파일럿 원칙 상속).
- 공개 전 검수 모드 분리(admin 프리뷰 vs 고객). ⚠️ 미리보기 pane 유출 금지 — 검증은 조용히(로컬서버·design-preview 하니스 대표 화면에 물리지 말 것).

---

## 5. 상담신청 저장 구조

| | **추천: 별도 `coverage_lead` → 승격** | 대안: `sales_customers` 직접 insert |
|---|---|---|
| 흐름 | 페이지→coverage_lead(owner 격리)→설계사 검수→상담관리 신규DB 승격 | 페이지→sales_customers 직접 |
| 장 | 원장 무오염 · 미검증 리드 격리 · owner 라우팅 · 중복매칭 여지 | 단순·빠름 |
| 단 | 승격 단계 1개 추가 | 미검증·미동의 리드가 원장 오염·중복·오매칭 위험 |

→ **추천 = 별도 테이블.** 개인정보/RLS: owner_id 격리 · consent_at 필수 · 소프트삭제(파기요청) · 현 피벗상 owner=임태성 고정.

---

## 6. 판정 라벨 enum — **대표 결정 대기**
4축 공용이라 한 세트로 통일한다.
- **A안(대표 원지시):** 부족 / 확인필요 / 점검필요 / 충분
- **B안(기획팀장 고객톤):** 확인필요 / 보완검토 / 점검필요 / 상대적양호 ("부족" 회피)
- 총괄 의견: 고객 화면엔 B안이 부드럽지만 **대표님 지시 우선** → **한 세트만 정해주시면** 계약에 확정.

---

## 7. 종합 보장분석 리포트 (나중 · 자리만 확보)
- 이번에 **안 만든다.** 단 §2-4 `coverage_customer_results`에 축별 판정 결과를 공통 형태로 남겨 두어, 나중에 종합 리포트가 **`select all categories for customer` 로 조합**만 하면 되게 한다.
- 대표가 중시하는 화면 간 연결(축별 결과 → 종합 → 상담관리)과 정합.

---

## 8. 첫 배선 축 — **대표 결정 대기**
대표 원지시 = **의료실비 하나로 닫아라.** 현재 그림상 자연스러운 순서:
1. 통합 표준 계약 확정(이 문서) → 2. **의료실비 1축 배선**(silson_generations 재사용, DB 신설 최소) → 3. 검증 → 4. 암 → 뇌/심장 → 수술비 순차.
→ 변경 지시 없으면 **의료실비부터**.

---

## 9. 운영 반영 필요 항목 + 승인 필요 작업 (전부 C등급 · 지금 실행 안 함)
| 작업 | 등급 | 채널 |
|---|---|---|
| DDL(코어 6 + 확장 6 + 개인 3) | C(DDL) | db-migrate CI |
| RLS(고객 SELECT=approved∧customer_ok / admin write / owner 격리) | C(RLS) | db-migrate CI |
| seed(축별 `reviewing`으로 적재) | C(seed) | db-migrate CI |
| 화면 배선(app.html 새 뷰 or 새 페이지) | B/C | feature PR + 검수 |
| 검색 편입(internal_only·미published 제외) | C | 별도 |
| 상담관리 연결(coverage_lead→승격) | C | 별도 |
| 고객 PDF 자동추출(EF) | 범위 밖 | — |

---

## 10. 롤백 기준
- **DB:** `drop … cascade`(신규 경로라 기존 무영향) + DOWN 블록.
- **화면:** 게이트(status/exposure) off · 뷰 격리 · 정적 폴백 · **킬스위치**(category.status 하향 → 즉시 미노출).
- **seed:** status 하향 or delete.
- **상담신청:** 별도 테이블이라 원장 무오염 · insert 실패=로컬 보관 후 재시도.

---

## 11. ☀️ 대표님 아침 결정 시트 (이것만 정해주시면 됩니다)
1. **판정 라벨** — §6 A안(부족/확인필요/점검필요/충분) vs B안(확인필요/보완검토/점검필요/상대적양호). 하나.
2. **정규화** — `coverage_surgery_costs` 별도 유지(추천) vs `coverage_treatments` 흡수.
3. **첫 배선 축** — 의료실비부터(추천·원지시) 맞는지.
4. **이 문서(PR) 승인** — 표준 계약으로 확정할지 → 승인 시 이후 실배선은 대표 승인 자리에서 db-migrate CI로.

**나머지 세부(필드·RLS 문구 등)는 총괄이 들고 있습니다. 대표님은 위 4개만.**

---

## 12. 이번에 안 한 것 (금지 준수 확인)
운영 DB DDL·seed·RLS 실행 ❌ / 고객 공개 ❌ / 상담관리 insert 연결 ❌ / EF 배포 ❌ / 검색 편입 실행 ❌ / 알림 트랙 혼합 ❌ / 대표에게 SQL·토큰·CLI·로그 요구 ❌. **전부 설계·문서까지만.**
