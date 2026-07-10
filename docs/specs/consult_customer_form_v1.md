# 상담관리 고객 입력폼 — 통합 설계 v1 (영업노트 자산 재사용)

> 상태: 설계(대표 승인 대기) · 작성 2026-07-09 · 산출물 성격 = **기획팀장(Claude Web) 지시서를 "기존 영업노트 자산 재사용" 방향으로 전환한 통합 설계**
> 오늘 범위 = 이 문서 1개. DB write 0 · 화면 코드 수정 0 · DDL 실행 0. 아래 실측 근거는 라이브 코드/스크립트에서 직접 추출(추정 아님).

---

## 1. 전환 요지

- **파일럿 → 정식화 프레이밍(핵심):** 영업노트(`sales_customers`/`sales_consultations`/`gemini-customer-ocr`)는 상담관리와 별개인 기능이 아니라, **상담관리를 만들기 위해 임태성이 직접 써보며 검증한 파일럿**이었다. 오늘 작업 = 그 파일럿을 전 사용자용 **'상담관리'로 정식화**하는 것(신규 구축 아님). 두 함의:
  1. **기능·스키마·OCR·단계·인라인 폼 흐름은 영업노트가 정본** → 그대로 재사용(§2~§4·§6).
  2. **임태성이 파일럿하며 쌓은 실데이터 2,583명/상담 2,621건은 임태성 개인 소유** → 정식화·개방 시 `owner_id` 격리로 타 사용자와 절대 혼용 금지(§5 격리 검증이 개방 전 필수 게이트).
- 이 작업은 **신규 구축이 아니다.** 이미 라이브 운영 중인 **영업노트**(뷰 `#v-salesnote`) 파일럿 자산을 **업무노트 '상담관리' 유형**으로 정식화·연결하는 통합 작업이다. 대표 확정.
- 기획팀장 지시서 원안은 상담관리 고객 입력폼을 **신규 `customers` 테이블 + 신규 `extract-customer-info` Edge Function**으로 구현하도록 설계돼 있었다. 그러나 실측 결과 **동일 기능이 영업노트에 이미 존재**한다(고객 CRUD · 상담 회차 누적 · 캡처 OCR 자동입력 · 소프트삭제 · 영업상태 단계).
- 이원화 시 위험: `sales_customers`에는 임태성 개인 실데이터 **2,583명** / `sales_consultations` **2,621건**이 이미 적재돼 있어, 신규 `customers`로 가면 **고객 원장이 두 곳으로 갈라진다.** 따라서 신규 테이블 금지.

| 구분 | 원안(지시서) | 전환 후(확정) |
|---|---|---|
| 고객 원장 | 신규 `customers` 테이블 | **기존 `sales_customers` 재사용** |
| 상담 기록 | (신규 스키마) | **기존 `sales_consultations` 재사용** |
| 캡처 OCR | 신규 `extract-customer-info` | **기존 `gemini-customer-ocr` 재사용(배포됨)** |
| 상담관리 유형 성격 | 별도 CRM 폼 신설 | **기존 영업노트 고객/상담 흐름으로 진입하는 연결 라벨** |

- **폐기:** 신규 `customers` 테이블 · 신규 `extract-customer-info` Edge Function.
- **재사용:** `sales_customers` · `sales_consultations` · `gemini-customer-ocr` · 기존 우측 인라인 고객 입력폼(`_snFormHtml`/`_snOpenForm`) · 기존 캡처 OCR 자동입력(`_snOcrRun`) · 기존 상담 회차 타임라인(`_snLoadTimeline`/`_snConsultSave`).

> 업무노트 '상담관리' 유형 = 별도 CRM이 아니라, 업무노트 글쓰기에서 상담관리 선택 시 **기존 영업노트 고객 입력/상담 기록 흐름을 호출·연결하는 라벨**이다. 새 폼을 만들지 않는다.

---

## 2. 지시서 필드 ↔ 기존 스키마 갭 분석

지시서 12필드를 `sales_customers` / `sales_consultations` 기존 컬럼 또는 `profile` jsonb에 매핑했다. 판정 3분류: **기존 존재** / **profile jsonb 수용(컬럼 신설 없이 흡수 가능)** / **진짜 부족(ALTER 필요)**.

기존 실사용 컬럼(app.html·import SQL에서 실측):
- `sales_customers`: `id · name · phone · phone_raw · birth_date(date) · gender('남'/'여') · channel · status · owner_id · source_ref · deleted_at · created_at · updated_at · profile(jsonb)`
- `profile` jsonb 실사용 키: `note_html`(리치 상담 메모) · `customer_type`(유입 플랫폼) · `age`
- `sales_consultations`: `id · customer_id · owner_id · consulted_at(date) · channel · memo · created_at`

| # | 지시서 필드 | 기존 매핑 | 판정 |
|---|---|---|---|
| 1 | name (이름) | `sales_customers.name` | 기존 존재 |
| 2 | attr (속성) | (미정 — `profile.attr` 흡수 가능) | profile jsonb 수용 / **의미 확인 필요** |
| 3 | birth (생년월일) | `sales_customers.birth_date` | 기존 존재 |
| 4 | lunar (음력) | (전용 컬럼 없음 → `profile.lunar` bool) | profile jsonb 수용 |
| 5 | gender (성별) | `sales_customers.gender` | 기존 존재 |
| 6 | mobile (연락처) | `sales_customers.phone` / `phone_raw` | 기존 존재 |
| 7 | email (이메일) | (전용 컬럼 없음 → `profile.email`) | profile jsonb 수용 |
| 8 | zip (우편번호) | (전용 컬럼 없음 → `profile.zip`) | profile jsonb 수용 |
| 9 | addr1 (기본주소) | (전용 컬럼 없음 → `profile.addr1`) | profile jsonb 수용 |
| 10 | addr2 (상세주소) | (전용 컬럼 없음 → `profile.addr2`) | profile jsonb 수용 |
| 11 | stage (영업단계) | `sales_customers.status` | 기존 존재(라벨 매핑 필요 → §3) |
| 12 | memo (메모) | `sales_consultations.memo`(회차) + `profile.note_html`(리치) | 기존 존재 |

**진짜 부족(ALTER 필요) 필드 = 0.**
- 근거: 기존 코드가 이미 `profile` jsonb에 `note_html·customer_type·age`를 넣고, 저장 시 기존 profile을 **merge 보존**한다(app.html 4109~4114, "새 컬럼 0" 주석 확인). 따라서 email·zip·addr1·addr2·lunar·attr 6개도 **컬럼 신설 없이 `profile` 키로 수용 가능**.
- 즉 **당장 ALTER는 불필요**하며, 이 방향이 실데이터 2,583행에 대한 스키마 변경 위험 0.

**대표 확인 자리(임의 결정 금지):**
1. **`attr`(속성)의 정확한 의미** — 지시서 레퍼런스에서 무엇을 담는 필드인지 불명확. 고객 분류 태그인지, 다른 것인지 확인 후 `profile` 키명/용도 확정.
2. **주소·이메일을 검색·필터 대상으로 쓸지** — jsonb 값은 검색이 되지만 인덱싱·정렬이 컬럼보다 약하다. 상담관리에서 주소/이메일로 **정렬·필터·통합검색**을 강하게 걸 계획이면 그때만 `email·zip·addr` 컬럼 승격(ALTER)을 별도 승인 트랙으로. 단순 저장·표시면 profile jsonb로 충분(ALTER 0 유지 권장).

---

## 3. 단계 매핑표

기존 영업노트 영업상태 단계는 app.html 4002에서 실측:
`_SN_STAGES = ['신규DB','부재','예약','진행중','제안서발송','보류','클로징','청약완료']` (8단계, 주석 = "노션 상담 단계 2026-06-29 대표 확정"). 레거시 값('신규' 등)은 코드가 자동 보존(4006).

지시서 단계 = 6 + 관리종결(END) = `부재·첫콜·상담중·제안서·클로징·청약완료·관리종결`.

| 기존 8단계(실데이터 저장값) | 지시서 6+END | 매핑 |
|---|---|---|
| 신규DB | (대응 없음, 근사=첫콜 이전) | 불일치 — 기존만 존재 |
| 부재 | 부재 | 일치 |
| 예약 | (대응 없음) | 불일치 — 기존만 존재 |
| 진행중 | 상담중 | 근사 일치(라벨 상이) |
| 제안서발송 | 제안서 | 근사 일치(라벨 상이) |
| 보류 | (대응 없음) | 불일치 — 기존만 존재 |
| 클로징 | 클로징 | 일치 |
| 청약완료 | 청약완료 | 일치 |
| (대응 없음) | 첫콜 | 불일치 — 지시서만 존재 |
| (대응 없음) | 관리종결(END) | 불일치 — 지시서만 존재 |

- 완전 일치: 부재·클로징·청약완료(3). 근사(라벨만 상이): 진행중↔상담중, 제안서발송↔제안서(2).
- 기존에만 있음: 신규DB·예약·보류(3). 지시서에만 있음: 첫콜·관리종결(2).

**단계 상수화 방향:** 현재 단계 배열은 app.html 인라인 상수(`_SN_STAGES`)로 박혀 있다. 향후 `js/constants/stages.js`로 분리해 영업노트·업무노트 상담관리·(미래)통계가 **한 정본 배열**을 공유하도록 한다. 리네임이 아니라 값의 단일 출처화이므로 회귀 위험 낮음. (오늘 실행 아님.)

**대표 확인 자리(정본 선택 — 임의 결정 금지):** 라벨이 불일치한다. 어느 쪽을 정본으로 할지 대표 결정 필요.
- 총괄팀장 의견(참고): **기존 8단계를 정본으로 유지 권장.** 이유 = 실데이터 2,583명의 `status`가 이 값으로 이미 저장돼 있어, 지시서 라벨로 바꾸면 저장값 마이그레이션이 필요하고 회귀 반경이 크다. 지시서의 첫콜·관리종결이 실제 필요하면 **기존 배열에 값 추가**로 흡수하고(예: 관리종결 = 종결 상태 추가), 진행중/제안서발송 라벨은 그대로 두는 안. 최종 결정은 대표.

---

## 4. 캡처 OCR 재사용안

- **기존 `gemini-customer-ocr` 재사용.** 신규 `extract-customer-info` **폐기.**
- 실측(supabase/functions/gemini-customer-ocr/index.ts):
  - 입력: `POST { imageBase64, mimeType }`
  - 출력: `{ name, gender, birth_date, age, phone, customer_type }` (없는 값은 빈 문자열)
  - 모델: **Gemini flash 계열**(ListModels로 동적 선택, fallback `gemini-1.5-flash`). 키는 Supabase secret(`GEMINI_API_KEY`)에서만 로드, 레포 평문 0.
  - 범위 제한(2026-06-29 대표 확정): **정형 6항목만 추출**, 상담내용 요약 안 함, **이미지 미저장**(버킷 미사용·휘발), 사용자가 [캡처에서 정보 읽기] 직접 실행할 때만 호출(백그라운드 자동 분석 없음).
- 상담관리 진입 시 기존 영업노트 OCR 흐름(`_snOcrBind` 붙여넣기 → `_snOcrRun` 호출 → 폼 자동 채움, app.html 4043~4075)을 그대로 호출한다.

**지시서 레퍼런스 HTML 폐기 근거(명시):**
- 레퍼런스가 브라우저에서 `api.anthropic.com`을 **직접 호출**하는 형태 → API 키가 클라이언트에 노출되는 데모 방식이라 운영 부적합. 기존 방식(Edge Function 경유, 키는 서버 secret)이 안전.
- 레퍼런스가 지정한 모델명 `claude-sonnet-4-6` = **존재하지 않는 모델명.** 폐기.
- 따라서 신규 Edge Function을 만들 이유 없음 → 이미 배포·운영 중인 `gemini-customer-ocr`로 단일화.

**PII 외부 AI 전송 고지:** 캡처 이미지에 고객 개인정보가 포함되므로 외부 AI(Gemini) 전송에 대한 **1회 고지·동의**가 필요하다. 이는 기존 영업노트 원칙(캡처 힌트 문구 "원본 이미지는 저장하지 않습니다")을 재사용·강화하는 선에서 처리(신규 정책 신설 아님).

---

## 5. ★임태성 데이터 혼용 방지 — 격리 검증 (개방 전 필수 게이트)

> 최우선 제약(대표 지시): **임태성 데이터를 다른 사용자와 혼용 사용하면 안 된다.** `sales_customers`에는 임태성 카톡 이관분 2,583명이 있고(마킹 `source_ref LIKE 'imp:%'`, `owner_id=임태성`), 현재 영업노트는 임태성 게이트(`_canSeeSalesNote`, user_id `98c5f4f9-10c1-4ee1-a656-5c2ca63239fd`) 전용이다. 상담관리를 다른 사용자에게 열면 이 격리가 절대선행 게이트다.

**실측 확인된 격리 구조(코드 레벨):**
- `sales_customers`에 **`owner_id` 컬럼 존재**. app.html 조회/쓰기가 모두 owner 기준:
  - 조회: `loadSalesNote`가 `deleted_at=is.null` 목록을 fetch — RLS가 `owner_id=auth.uid()`로 자동 필터(app.html 3908, 주석 "본인(owner) 데이터만 RLS 자동 필터").
  - INSERT: 신규 고객 `body.owner_id=_snOwnerId()`(로그인 사용자 id)로 마킹(4120).
  - 상담 INSERT: `owner_id=본인`(3986), 주석에 "RLS: FOR ALL · auth.uid()::text=owner_id".
- 임태성 2,583행은 import SQL에서 `owner_id = auth.users('bylts@naver.com')`로 채워짐, `source_ref='imp:'||grp_key`로 마킹(import SQL 6·20~24행). 즉 **owner 기반 격리 전제는 코드/적재 양쪽에서 확인됨.**

**개방 전 실행할 격리 검증 계획(전부 승인 후 실행 — 오늘 실행 아님):**
1. **프로젝트 확인**: Supabase Dashboard가 신버전 `pdnwgzneooyygfejrvbg`(onesecond-v1-restore-0420)인지 먼저 확인.
2. **RLS 4종 실측**: `pg_policies`에서 `sales_customers`·`sales_consultations`의 SELECT/INSERT/UPDATE/DELETE 정책이 전부 `owner_id = auth.uid()::text` 격리인지 실측(기억·덤프 아닌 라이브 SELECT).
3. **임태성 2,583행 owner 무결성**: `SELECT count(*) FROM sales_customers WHERE source_ref LIKE 'imp:%' AND owner_id <> '<임태성 id>'` = 0인지 확인(전 행 owner가 임태성인지). 상담 2,621건도 동일.
4. **owner NULL 누수 없음**: `owner_id IS NULL` 행 0 확인(RLS 격리를 빠져나가는 무주인 행 방지).
5. **교차검증(실계정 3개 + 시크릿창)**: 타 사용자 계정으로 상담관리 진입 시 (a) 임태성 2,583명 노출 0건, (b) 본인이 새로 등록한 고객만 보임, (c) 임태성 데이터와 섞이지 않고 분리 저장됨 — 3자 모두 통과 확인.
6. **RLS 작성 규칙 준수**: USING/WITH CHECK에 **같은 테이블 SELECT 서브쿼리 금지**(무한재귀 회피, 기존 학습). 관리자 확인이 필요하면 `SECURITY DEFINER` 함수로. RLS 통과 = 라이브 안전 아님 → 반드시 실계정 교차검증까지.

> **이 격리 검증(1~6)을 전부 통과하기 전에는 상담관리를 임태성 게이트 밖(전 사용자)으로 개방하지 않는다.**

---

## 6. 화면 배선안 (기존 흐름 호출)

- 업무노트 글쓰기에서 **상담관리 유형 선택** 시: 새 폼을 신설하지 않고, 기존 영업노트의 **고객 입력/상담 기록 인라인 폼을 호출·연결**한다.
  - 재사용 진입점: `_snOpenForm(i)`(신규/수정 폼) · `_snOcrRun()`(캡처 자동입력) · `_snConsultSave()`(상담 회차 추가) · `_snLoadTimeline()`(회차 이력).
- **개방 범위와 임태성 게이트의 관계:** 현재 영업노트는 `_canSeeSalesNote`(임태성 user_id 전용) + `body.is-uat-salesnote` CSS 게이트로 잠겨 있다(app.html 4200). 상담관리를 다른 사용자에게 여는 시점·범위는 아래 **개방 롤아웃** 순서를 따르되, 각 단계 확대는 **§5 격리 검증 통과 후에만** 진행한다.

### 6-1. 개방 롤아웃 — 3단계 게이트 확대 (대표 확정)

> **핵심 원칙(반드시 명확히):** 3단계는 전부 **"UI 노출 게이트 확대"일 뿐**이며, **`owner_id` 개인 격리는 전 단계에서 항상 유지된다.** UI 게이트(누구 화면에 상담관리가 보이나)와 `owner_id` RLS(누구 데이터인가)는 **별개 레이어**다. 게이트를 넓혀도 데이터 소유·격리는 1인치도 안 넓어진다.

| 단계 | 개방 범위 | UI 게이트 키(노출 레이어) | 데이터 소유(격리 레이어) |
|---|---|---|---|
| 1단계(현재) | 임태성 실장만 | `_canSeeSalesNote` = user_id `98c5f4f9-10c1-4ee1-a656-5c2ca63239fd` | `owner_id` RLS — 본인 데이터만 |
| 2단계 | 더원지점 4팀만 | 4팀 `team_id`(+ 더원지점 `branch_id`)로 게이트 — 아래 실측 참조 | `owner_id` RLS — **각자 본인 데이터만(그대로)** |
| 3단계 | 전체 사용자 | 게이트 해제(전원 노출) | `owner_id` RLS — **각자 본인 데이터만(그대로)** |

- **2단계 4팀 개방 = 데이터 공유 아님.** "4팀 설계사가 각자 **자기** 상담관리를 쓰게 **기능만 먼저 노출**"하는 것이다. 같은 4팀이라도 **설계사끼리 서로 고객을 못 본다**(개인 CRM). 4팀은 UI 노출 대상 집합일 뿐, 데이터 경계가 아니다.
- **임태성 2,583명은 어느 단계에서도 타 사용자에게 노출 0** — owner_id RLS가 UI 게이트와 무관하게 모든 단계에서 격리를 강제하기 때문.

**2단계 4팀 게이트 키 — 기존 패턴 실측(app.html):**
- 사용자 객체는 `team_id · branch_id · role`을 보유한다. `me = {id, role, team_id, branch_id}`로 구성되고, 값이 없으면 `/rest/v1/users?id=eq.<id>&select=team_id,branch_id,role`로 보강한다(app.html ~8024~8026).
- 팀/지점 스코프 게이트 기존 사례: 매니저방·공동 스페이스가 `branch_id`/`team_id`를 스코프 키로 사용(예: `_cospScope`가 `branch_internal`→`branch_id` / `team_internal`→`team_id`, app.html ~8077; 팀 멤버 존재 판정 `me.team_id`/`me.branch_id`, ~8193·8241).
- 따라서 **4팀 게이트 = 로그인 사용자의 `team_id`가 더원지점 4팀 team_id와 일치**(필요 시 `branch_id`=더원지점으로 이중 확인)하는지로 UI 노출을 결정하는 함수로 구현한다(예: `_canSeeConsult()` — roadmap/salesnote 게이트 함수와 동형, 판별 값만 user_id→team_id). **4팀 team_id 실제 값은 승인 후 `/rest/v1/teams`·`users` 실측으로 확정**(지어내지 않음).
- **레이어 구분 재확인:** 이 team_id 게이트는 **화면에 상담관리를 보여줄지**만 정한다. 4팀 설계사가 상담관리에 들어가도 조회·저장은 여전히 `owner_id=auth.uid()` RLS를 타므로 **본인 고객만** 보고 저장한다. UI 게이트가 데이터 격리를 대체하지 않는다.

**승인·검증 자리:** 2단계·3단계 개방은 **각각** (a) 배포 게이트 정책상 **대표 승인 자리**, (b) **§5 owner_id 격리 실측 통과**를 모두 만족한 후에만 진행한다. 한 단계 넓힐 때마다 실계정 교차검증(§5-5)을 다시 돌려 타 사용자에게 임태성/타인 데이터 노출 0을 재확인한다.
- **회귀 위험:** 영업노트는 실데이터 **2,583명 / 2,621건**을 운영 중이라 기존 흐름을 변경하면 회귀 반경이 크다.
  - 오늘 산출물은 **문서 1개뿐(DB write 0 · 코드 수정 0)** → 라이브 회귀 물리적 0.
  - 실제 위험은 **화면 배선 착수 시점**에 발생 → 그때 Deploy Preview 검수 + 배포 7단계(대표 승인 후 AI팀 머지) 통과. 임태성 게이트 안에서 먼저 배선·검증 후, §5 통과 시 개방.

---

## 7. 다음 단계 (대표 승인 후 — 오늘 범위 아님)

1. **§2 갭 확정**: `attr`(속성) 의미 확인 + 주소/이메일 컬럼 승격 여부 결정 → 필요 시에만 ALTER 보강안 별도 승인(현재 권장 = ALTER 0, profile jsonb 수용).
2. **§3 단계 정본 확정**: 기존 8단계 vs 지시서 6+END 정본 대표 결정 → 확정 후 `js/constants/stages.js` 상수화.
3. **프로젝트 확인**: Supabase `pdnwgzneooyygfejrvbg` 확인.
4. **§5 격리 검증 실측**: owner_id RLS 4종 + 임태성 2,583행 무결성 + owner NULL 0 + 실계정 3개 교차검증. **통과 전 개방 금지.**
5. **§6 화면 배선**: 업무노트 상담관리 → 기존 영업노트 폼/OCR/상담 흐름 호출. 1단계(임태성 게이트) 안에서 Deploy Preview 검수.
6. **개방 롤아웃(§6-1)**: 1단계 실사용 검증 → (대표 승인 + §5 격리 실측 통과 시) 2단계 4팀 team_id 게이트 개방 → 실계정 교차검증 → (재승인 + 재검증 시) 3단계 전체 개방. 각 단계 확대 시 owner_id 격리 재확인 → 완료 보고. 2단계 전에 4팀 team_id 실제 값 `/rest/v1/teams`·`users` 실측 확정.

> 오늘은 이 문서까지. 이후 각 단계는 대표 승인·위험 판단 후 AI팀 내부에서 실행·검수·완료 보고.
