# 상담관리 인수정보 5필드 — A1 지시서 sales_customers 정합화 (검수안)

> 상태: **검수안(DRAFT) · 대표 승인 후 실행** · 작성 2026-07-10
> 산출물 성격 = 기획팀장 **A1 지시서(인수정보 5필드)** 를 확정 방향(`sales_customers` 실컬럼 재사용)으로 정합화한 설계 + 스키마 검수안.
> 선행 확정 설계: [`consult_customer_form_v1.md`](./consult_customer_form_v1.md)(폼·OCR·단계·인라인 흐름 = 영업노트 정본) · [`consult_customer_list_v1.md`](./consult_customer_list_v1.md)(리스트 뷰).
> **오늘 범위 = 이 문서 + SQL 검수안 2파일. DB write 0 · DDL 실행 0 · 화면 코드 수정 0 · main 직접 push 0.**
> 실측 근거는 라이브 코드(app.html)에서 직접 추출(추정 아님, 파일:라인 명시).

---

## 0. 대표 결재 근거

- **대표 결재 2(2026-07-10):** 상담관리 인수정보 5필드 저장방식 = **A안 실컬럼**으로 확정. 단 바로 DB write 금지 → **실제 ALTER는 별도 검수안 보고·승인 후.** 본 문서 = 그 검수안까지.
- **DB/EF 실행 원칙(2026-07-10):** 실제 반영은 AI팀이 기존 CI 채널(`db-migrate.yml`)로 실행. 대표는 방향·위험 승인·1클릭 배포 승인만. 대표에게 SQL·콘솔 요구 0.

---

## 1. A1 원안 → 확정 방향 정합화 (전제 교체)

A1 지시서 원안은 신규 `customers` 테이블 / 신규 `extract-customer-info` Edge Function / `/supabase/migrations/` 경로를 전제로 작성됐다. 그러나 확정 방향(form_v1 §1 = `sales_customers` 재사용)에 맞춰 아래로 교체한다.

| 요소 | A1 원안 | 확정 방향(정합화) |
|---|---|---|
| 고객 원장 테이블 | 신규 `customers` | **기존 `sales_customers` 재사용**(신규 테이블 금지 — 고객 원장 이원화 방지, form_v1 §1) |
| 캡처 OCR EF | 신규 `extract-customer-info` | **기존 `gemini-customer-ocr` 재사용**(배포됨, 신규 생성 금지, form_v1 §4) |
| 마이그레이션 경로 | `/supabase/migrations/` | **`db/migrations/`**(CI 채널 `db-migrate.yml` 표준 경로) |
| 5필드 저장 | 신규 테이블 컬럼 | **`sales_customers` 실컬럼 5개 ALTER ADD**(대표 결재 2 = A안) |

- 인수정보 5필드는 form_v1 §2 갭분석에서 "profile jsonb 흡수 가능" 후보였으나, **대표 결재 2로 실컬럼(A안) 확정** → 본 검수안은 profile 흡수가 아닌 실컬럼 ALTER 로 설계한다(정렬·필터·통합검색 승격 여지 확보).

---

## 2. ⚠️ 컬럼명 충돌 회피 (필수 — 실측 결과)

**실측 기존 컬럼(app.html:3908 select · 4106~4120 write):**
`sales_customers` = `id · name · phone · phone_raw · birth_date · gender · channel · status · owner_id · source_ref · deleted_at · created_at · updated_at · profile(jsonb)`

| A1 §1 필드 | 채택 컬럼명 | 기존 컬럼 충돌 | 처리 |
|---|---|---|---|
| 직업 | `job` | 없음(app.html `job` 동명 식별자는 admin job 레코드·JS 지역변수로 무관) | 그대로 |
| 약 복용 여부 | `medication` | 없음 | 그대로 + CHECK |
| 병력 | `history` | 없음(app.html `history`는 브라우저 History API·admin 이력 UI로 무관) | 그대로 |
| 진단일 | `dx_date` | 없음 | 그대로 |
| 현재 상태·자유서술 | **`uw_status`** | **⚠️ 있음 — 기존 `status`(영업 8단계)와 충돌** | **대체명 `uw_status` 채택** |

**충돌 상세:** 기존 `status` = 영업 8단계(`_SN_STAGES = ['신규DB','부재','예약','진행중','제안서발송','보류','클로징','청약완료']`, app.html:4002). 필터칩 카운트(3920)·상세 상태배지(3944)·폼 select(4007)·저장 기본값 '신규DB'(4108)의 단일 출처이며, 실데이터 2,583행이 이 값으로 저장돼 있다. A1 §1 `status`(현재 상태·자유서술)를 그대로 추가하면 (a) `add column if not exists`가 기존 status를 만나 신규 컬럼이 생성되지 않고, (b) 인수(가입심사) 서술과 영업단계 값이 의미 혼선 → 회귀.

**대체명 채택 = `uw_status`.** 근거: 이 필드는 인수(underwriting) 맥락의 '현재 상태 서술'이므로 `uw_` 접두가 의미 정합. 후보 `health_status`도 검토했으나, A1 §1의 필드 성격이 건강상태 한정이 아니라 인수 상태 자유서술이라 `uw_status`가 더 포괄적·정합적. 최종 컬럼명 확정은 대표 결정 자리(권장 = `uw_status`).

---

## 3. 5컬럼 ALTER 검수안 요지

검수안 SQL: [`db/migrations/2026-07-10_sales_customers_underwriting_columns.sql`](../../db/migrations/2026-07-10_sales_customers_underwriting_columns.sql)

| # | 컬럼명 | 타입 | nullable | 제약 |
|---|---|---|---|---|
| 1 | `job` | text | YES(선택) | — |
| 2 | `medication` | text | YES(선택) | CHECK (복용 중 / 복용 안 함 / 과거 복용) — 조건부 멱등 |
| 3 | `history` | text | YES(선택) | — |
| 4 | `dx_date` | text | YES(선택) | — (형식 자유, date 강제 안 함 = A1대로) |
| 5 | `uw_status` | text | YES(선택) | — (기존 status 충돌 회피 대체명) |

- **멱등:** 전부 `add column if not exists`. medication CHECK는 `add constraint if not exists` 문법 부재로 `pg_constraint` 조건부 DO 블록(중복 생성 방지).
- **단일 트랜잭션:** `begin; … commit;` 하나.
- **전부 nullable:** 인수정보는 필수 아님(고객마다 없을 수 있음). NOT NULL/DEFAULT 강제 없음.

---

## 4. 기존 데이터 2,583행 영향 판정 (무영향)

- `sales_customers` 실데이터 **2,583행**(임태성 카톡 이관분 포함, form_v1 §5)에 **nullable 컬럼 5개 추가** → 기존 행은 전부 신규 컬럼 값 **NULL**로 채워지고 **기존 값·동작 무영향**(무손실·무회귀).
- NOT NULL·DEFAULT 강제가 없어 대용량 테이블 재작성(rewrite)·장기 잠금 부담 최소.
- medication CHECK는 NULL을 통과(Postgres CHECK 특성)하므로 기존 NULL 행 적재 안전 — 오값 유입만 차단.
- 기존 컬럼(status 포함)은 1글자도 변경하지 않음 → 영업노트 라이브 화면(`sn-*`) 무영향.

---

## 5. Rollback · Postverify 요지

- **Rollback(DOWN):** SQL 하단 주석 블록. 역순 drop — `medication` CHECK 제약 → `uw_status` → `dx_date` → `history` → `medication` → `job` 컬럼 순. (컬럼 삭제 시 적재 데이터 소실 주의.)
- **Postverify:** [`scripts/ci/postverify_2026-07-10_sales_customers_underwriting_columns.sql`](../../scripts/ci/postverify_2026-07-10_sales_customers_underwriting_columns.sql) — 읽기전용. 5컬럼 존재 + 전부 text + medication CHECK 존재 확인, 불충족 시 `raise exception`(CI FAIL). DML/DDL 없음.

---

## 6. 폼 UI 배치안 (인수 정보 섹션 — 레퍼런스 v3)

> 오늘 미구현(설계만). 실제 배선은 대표 승인 후 form_v1 §6·§7 흐름으로.

- 인수정보 5필드는 영업노트 인라인 고객 폼(`_snFormHtml`, app.html:4003~)에 **'인수 정보' 섹션**으로 추가 배치(레퍼런스 v3 기준). 기존 폼 그리드(`sn-form-grid`) 아래 별도 섹션 헤더로 구분.
- 입력 위젯:
  - `job` · `history` · `dx_date` · `uw_status` = text input(선택 입력, `required` 없음).
  - `medication` = select(복용 중 / 복용 안 함 / 과거 복용 + 빈 값) — CHECK 3값과 정합.
- 저장 배선: `_snSaveForm`(4101~) body에 5키 추가(값 없으면 `null`). **기존 profile merge 로직·기존 컬럼 write 무변경**, 실컬럼 5개만 body에 더한다.
- ⚠️ 기존 `sn-*` 함수·DOM id·CSS 클래스는 무변경 재사용(list_v1 §7 회귀 주의). 섹션·필드만 추가.

---

## 7. 프라이버시·격리 (A1 §3·§4 반영)

- **리스트 카드 미노출(A1 §3):** 인수정보 5필드(직업·약·병력·진단일·상태서술)는 민감정보이므로 **좌측 리스트 카드에 표시하지 않는다.** 카드는 기존대로 이름·전화·상태배지만(list_v1 §2). 인수정보는 우측 상세/폼에서만 열람.
- **민감정보 로그 미출력(A1 §4):** 5필드 값을 `console.log`·에러 메시지·분석 로그에 출력하지 않는다. 저장 실패 시에도 필드 값 노출 금지(일반 메시지만).
- **동의 문구 자리(A1 §4):** 인수정보(건강·병력 등 민감정보) 입력 폼에 **1회 수집·이용 동의 문구 자리만 확보**(문안 확정·법무 검토는 별도 트랙). 본 검수안은 자리만 명시, 문구 미확정.
- **owner_id 격리(불변):** 5컬럼은 `sales_customers` 행에 추가되므로 기존 `owner_id` RLS 격리를 그대로 상속 — 본인 고객만 조회·저장(form_v1 §5). UI 게이트(`_canSeeSalesNote`)도 그대로.

---

## 8. 향후 미구현 명시 (오늘 범위 아님)

- **"인수 질문 만들기" 통로 = 이번 미구현.** 5필드로 인수 심사 질문을 생성·연결하는 기능은 본 검수안 범위 밖(향후 별도 트랙, 대표 승인 자리).
- 폼 UI 실제 배선(§6)·동의 문구 확정(§7)·개방 롤아웃(form_v1 §6-1)은 전부 대표 승인 후.

---

## 9. 다음 단계 (대표 승인 후 — 오늘 범위 아님)

1. **컬럼명 최종 확정:** `uw_status`(권장) vs `health_status` 대표 결정.
2. **ALTER 적용:** main 머지 → `db-migrate.yml` 실행 → 대표 1클릭 배포 승인 → AI팀 apply + postverify 확인.
3. **폼 UI 배선(§6):** 인수 정보 섹션 추가 → 임태성 게이트 안 Deploy Preview 검수 → 배포 7단계.
4. **프라이버시(§7):** 리스트 미노출·로그 미출력 구현 + 동의 문구 확정.

> 오늘은 이 문서 + SQL 검수안 2파일까지. 이후 각 단계는 대표 승인·위험 판단 후 AI팀 내부에서 실행·검수·완료 보고.
