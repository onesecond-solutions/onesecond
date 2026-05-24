# Phase 1 Step A — DB 마이그레이션 사전 진단 capture

> **작성일:** 2026-05-07 오전
> **단계:** v2.0 원수사 입점 모델 Phase 1 / Step 2 / Step A
> **의뢰서:** 채팅 코드블록 발행 (Chrome 위임 진단 SQL 9건)
> **회신자:** 팀장님 (Chrome 위임)
> **사고 신호:** **0건** (Q1·Q2·Q4·Q5·Q6·Q7·Q9 모두 정합 / Q3·Q5에서 정합화 필요 6건 발견)
> **다음 단계:** spec § 2-4 patch + Step B 트랜잭션 의뢰서 발행

---

# § 1. 진단 SQL 9건 raw 결과

## Q1. 신버전 DB 확인

```
current_database = postgres
```

→ ✅ 신버전 (`pdnwgzneooyygfejrvbg` 진입 정합).

## Q2. insurers 테이블 부재 확인

```
insurers_exists = false
```

→ ✅ Step B 신설 가능 (충돌 0).

## Q3. posts 컬럼 매트릭스 (행 수 25)

| column_name | data_type | is_nullable | column_default |
|---|---|---|---|
| id | bigint | NO | NULL |
| created_at | timestamptz | NO | now() |
| board_type | text | YES | '' |
| category | text | YES | '' |
| title | text | YES | '' |
| content | text | YES | NULL |
| author_id | text | YES | NULL |
| author_name | text | YES | NULL |
| organization_id | text | YES | NULL |
| is_hub_visible | boolean | YES | false |
| view_count | bigint | YES | 0 |
| like_count | bigint | YES | 0 |
| comment_count | bigint | YES | 0 |
| is_anonymous | boolean | YES | false |
| display_name | text | YES | NULL |
| is_hidden | boolean | YES | false |
| is_notice | boolean | YES | false |
| attachments | text | YES | NULL |
| **insurer_name** | text | YES | NULL |
| **product_category** | text | YES | NULL |
| **patient_age** | integer | YES | NULL |
| **patient_gender** | text | YES | NULL |
| **disease_name** | text | YES | NULL |
| **diagnosis_timing** | text | YES | NULL |
| **current_status** | text | YES | NULL |

→ ⚠️ 굵은 글씨 = 6필드 + 보험사 컬럼이 라이브 이미 존재 (이름·타입 spec과 다름).

## Q4. users 컬럼 매트릭스 (행 수 12)

| column_name | data_type | is_nullable | column_default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| created_at | timestamptz | NO | now() |
| name | text | YES | NULL |
| phone | text | YES | NULL |
| email | text | YES | NULL |
| company | text | YES | NULL |
| role | text | YES | 'ga_member' |
| team | text | YES | NULL |
| branch | text | YES | NULL |
| plan | text | YES | NULL |
| status | text | NO | 'active' |
| last_seen_at | timestamptz | YES | NULL |

→ ✅ insurer_id 미존재. Step B 추가 가능.

## Q5. posts RLS 정책 매트릭스 (행 수 7)

| policyname | cmd | roles | qual | with_check |
|---|---|---|---|---|
| author or admin delete posts | DELETE | authenticated | `auth.uid()::text = author_id OR is_admin()` | NULL |
| authenticated insert posts | INSERT | authenticated | NULL | `auth.uid()::text = author_id` |
| **insurer_board_insert** | INSERT | authenticated | NULL | `board_type='insurer_board' AND (is_admin() OR EXISTS(SELECT 1 FROM users WHERE users.id=auth.uid() AND users.role IN ('insurer_*' 4역할)))` |
| authenticated read non-together posts | SELECT | authenticated | `board_type<>'together' AND is_hidden=false` | NULL |
| authenticated read together posts | SELECT | authenticated | `board_type='together' AND is_hidden=false` | NULL |
| author or admin update posts | UPDATE | authenticated | `auth.uid()::text = author_id OR is_admin()` | NULL |
| **insurer_board_update** | UPDATE | authenticated | `is_admin() OR EXISTS(... insurer_* 4역할 ...)` | NULL |

→ ⚠️ **insurer_board_insert / insurer_board_update 인라인 EXISTS 패턴** = D-pre.8 sweep 표준 위반 잔여. SECURITY DEFINER 함수로 청산 필요.
→ ⚠️ **board_type='insurer_board'** = spec § 2-4-2 'insurer'와 이름 다름. 정합 필요.

## Q6. users RLS 정책 매트릭스 (행 수 5)

| policyname | cmd | roles | qual | with_check |
|---|---|---|---|---|
| user insert own | INSERT | authenticated | NULL | `auth.uid() = id` |
| admin_select_all_users | SELECT | public | `is_admin()` | NULL |
| user read own | SELECT | public | `auth.uid() = id` | NULL |
| admin_update_all_users | UPDATE | public | `is_admin()` | `is_admin()` |
| user update own | UPDATE | authenticated | `auth.uid() = id` | NULL |

→ ⚠️ **insurer_branch_manager 본인 회사 임직원 SELECT 정책 부재**. admin_v2 D-1에서 pending 사용자 승인용 신규 정책 필요.

## Q7. SECURITY DEFINER 함수 매트릭스 (행 수 8)

| proname | secdef | volatile | rettype |
|---|---|---|---|
| get_dau | true | s | record |
| get_feature_usage | true | s | record |
| get_mau | true | s | bigint |
| get_retention_d30 | true | s | numeric |
| get_stage_distribution | true | s | jsonb |
| get_wau | true | s | bigint |
| handle_new_user | true | v | trigger |
| **is_admin** | true | s | boolean |

→ Phase 1 신규 신설 4종 필요:
- `is_manager()` — 실장님 공지 쓰기 6역할
- `is_insurer_employee()` — insurer_* 4역할 (insurer_board 정책 청산용)
- `is_insurer_manager()` — insurer_branch_manager + insurer_manager 2역할
- `current_user_insurer_id()` — 본인 회사 게시판 RLS용

## Q8. quick_contents.system_links content_html (1행, 17,888자)

- tab_key: `system_links`
- tab_title: `원전산 설계 바로가기`
- 보험사 명단: **31사** (손해보험 10 + 생명보험 21)

### 손해보험 10사

| # | 회사명 | admin_url | slug 후보 |
|---|---|---|---|
| 1 | DB손해보험 | mdbins.com | `db` |
| 2 | KB손해보험 | nsales.kbinsure.co.kr | `kb` |
| 3 | 메리츠화재 | nsso.meritzfire.com | `meritz` |
| 4 | 흥국화재 | sales.heungkukfire.co.kr | `heungkuk-fire` |
| 5 | 삼성화재 | login.samsungfire.com | `samsung-fire` |
| 6 | 한화손해보험 | portal.hwgeneralins.com | `hanwha` |
| 7 | 롯데손해보험 | lottero.lotteins.co.kr | `lotte` |
| 8 | NH농협손해보험 | (Q8 raw 추출 필요) | `nh-fire` |
| 9 | 라이나손해보험 | (Q8 raw) | `lina-fire` |
| 10 | AIG손해보험 | (Q8 raw) | `aig-fire` |

### 생명보험 21사 (URL 보유 19 + 부재 2)

| # | 회사명 | admin_url | slug 후보 |
|---|---|---|---|
| 1 | ABL생명 | (Q8 raw) | `abl` |
| 2 | DB생명 | (Q8 raw) | `db-life` |
| 3 | IBK연금보험 | (Q8 raw) | `ibk` |
| 4 | iM라이프 | (Q8 raw) | `im-life` |
| 5 | KB라이프 | (Q8 raw) | `kb-life` |
| 6 | NH농협생명 | (Q8 raw) | `nh-life` |
| 7 | KDB생명 | (Q8 raw) | `kdb` |
| 8 | 교보생명 | (Q8 raw) | `kyobo` |
| 9 | 동양생명 | (Q8 raw) | `dongyang` |
| 10 | 라이나생명 | (Q8 raw) | `lina` |
| 11 | 미래에셋생명 | (Q8 raw) | `miraeasset` |
| 12 | 메트라이프 | (Q8 raw) | `metlife` |
| 13 | 삼성생명 | (Q8 raw) | `samsung-life` |
| 14 | 신한라이프 | (Q8 raw) | `shinhan` |
| 15 | 한화생명 | (Q8 raw) | `hanwha-life` |
| 16 | 흥국생명 (T-Life) | (Q8 raw) | `heungkuk-tlife` |
| 17 | 흥국생명 (e-life) | (Q8 raw) | `heungkuk-elife` |
| 18 | 처브라이프 | (Q8 raw) | `chubb` |
| 19 | AIA생명 | (Q8 raw) | `aia` |
| 20 | **BNP파리바카디프** | **부재** | `bnp-cardif` |
| 21 | **푸본현대생명** | **부재** | `fubon-hyundai` |

→ ⚠️ Step B INSERT 시 `admin_url` 정확한 raw 추출 필요 (Q8 본문 17,888자에서 회사별 URL 매핑).

## Q9. posts board_type 분포 (행 수 4 row, 2 board_type)

| board_type | cnt |
|---|---|
| together | 3 |
| team | 1 |

→ 라이브 운영 row = 4건. spec 신구조 (`qna` / `manager_notice` / `insurer`)와 충돌. Phase 1에서 archive 처리 또는 삭제 결정 필요.

---

# § 2. 결정 6건 (Code 권장 채택, 팀장님 승인)

## 결정 1 — posts 5컬럼 라이브 정합화 (Code 권장 A 채택)

**라이브 컬럼 그대로 사용 + spec 컬럼명 정합화:**

| spec § 2-4-2 (변경 전) | 라이브 (변경 후 정합) | 처리 |
|---|---|---|
| `age_band` (text) | `patient_age` (**text 변환 필요**) | ALTER COLUMN TYPE text (integer → text) |
| `gender` (text) | `patient_gender` (text) | 그대로 사용 |
| `medical_history` (text) | `disease_name` (text) | 그대로 사용 (의미 정합 — "병력" = "질병명") |
| `diagnosis_period` (text) | `diagnosis_timing` (text) | 그대로 사용 |
| **신규 `drug_usage`** (text) | **부재** | **신규 ADD COLUMN** |
| `current_state` (text) | `current_status` (text) | 그대로 사용 |
| `product_category` (text) | `product_category` (text) | 그대로 (정합) |
| `insurer_id` (UUID FK) | `insurer_name` (text) | **신규 ADD insurer_id + insurer_name 보존 (캐시)** |

**ALTER 명세:**
```sql
ALTER TABLE posts ALTER COLUMN patient_age TYPE text;  -- integer → text (자유 입력 정합)
ALTER TABLE posts ADD COLUMN drug_usage text;          -- 신규 6번째 필드
ALTER TABLE posts ADD COLUMN insurer_id UUID REFERENCES insurers(id);
ALTER TABLE posts ADD COLUMN question_type text;       -- 인수/상품/모름
ALTER TABLE posts ADD COLUMN insurer_target text;      -- 회사지정/손보전체/생보전체
ALTER TABLE posts ADD COLUMN keywords text[];          -- GIN 인덱스
ALTER TABLE posts ADD COLUMN status text DEFAULT '답변대기';
```

→ spec 12 컬럼 ADD → **실 ADD 6 + ALTER TYPE 1** (라이브 5 컬럼 보존).

## 결정 2 — `insurer_board` 정책 정합화

- **이름 변경:** `insurer_board_insert` → `posts_insert_insurer` / `insurer_board_update` → `posts_update_insurer` (D-pre.8 정합화 패턴)
- **board_type:** `'insurer_board'` → `'insurer'` (spec § 2-3 정합)
- **인라인 EXISTS 청산:** `is_insurer_employee()` SECURITY DEFINER 함수로 교체

```sql
DROP POLICY insurer_board_insert ON posts;
DROP POLICY insurer_board_update ON posts;

CREATE POLICY posts_insert_insurer ON posts FOR INSERT TO authenticated
WITH CHECK (
  board_type = 'insurer'
  AND insurer_id IS NOT NULL
  AND insurer_id = current_user_insurer_id()
  AND is_insurer_employee()
);

CREATE POLICY posts_update_insurer ON posts FOR UPDATE TO authenticated
USING (
  insurer_id IS NOT NULL
  AND (insurer_id = current_user_insurer_id() OR is_admin())
);
```

## 결정 3 — 기존 board_type 4 row 처리 (archive 권장)

- `together` 3 row + `team` 1 row = `archive_legacy`로 변환 (보존)
- 사유: 데이터 4건 = 가치 평가 어려움 + 즉시 삭제 위험

```sql
UPDATE posts SET board_type = 'archive_legacy' WHERE board_type IN ('together', 'team');
```

→ admin_v2 D-1에서 archive_legacy 필터 별도 표시. 사용자 화면에서는 격리.

## 결정 4 — URL 부재 보험사 처리 (Code 권장 A 채택)

- BNP파리바카디프 / 푸본현대생명 = `is_active=true` + `admin_url=NULL`
- 회원가입 진입 보장 (드롭다운 노출) + admin_url 부재 표시 별도 처리

## 결정 5 — SECURITY DEFINER 함수 4종 신설

```sql
CREATE OR REPLACE FUNCTION is_manager() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid()
    AND role IN ('admin','ga_branch_manager','ga_manager','insurer_branch_manager','insurer_manager')
  );
$$;

CREATE OR REPLACE FUNCTION is_insurer_employee() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid()
    AND role IN ('insurer_branch_manager','insurer_manager','insurer_member','insurer_staff')
  );
$$;

CREATE OR REPLACE FUNCTION is_insurer_manager() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid()
    AND role IN ('insurer_branch_manager','insurer_manager')
  );
$$;

CREATE OR REPLACE FUNCTION current_user_insurer_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT insurer_id FROM users WHERE id = auth.uid();
$$;
```

## 결정 6 — spec § 2-4 patch (정합화)

- domain NOT NULL → **nullable** (raw에서 정확 추출 어려움 — 사후 admin 입력)
- ALTER TABLE posts 명세 결정 1 기반 재작성
- RLS 정책 결정 2 기반 재작성
- SECURITY DEFINER 함수 결정 5 기반 추가

---

# § 3. Step B 진입 준비 완료 매트릭스

| 영역 | 라이브 현재 | Step B 변경 | 정합 |
|---|---|---|---|
| insurers 테이블 | 부재 | CREATE + RLS 3정책 + INSERT 31 row | ✅ |
| posts 컬럼 | 25개 | 6 ADD + 1 ALTER TYPE | ✅ |
| users 컬럼 | 12개 | insurer_id 추가 | ✅ |
| posts RLS | 7정책 | DROP 2 + CREATE 신규 정책 (insurer_board → insurer 정합) | ✅ |
| users RLS | 5정책 | CREATE 1정책 (insurer_branch_manager 본인 회사 임직원) | ✅ |
| SECURITY DEFINER 함수 | 8개 (is_admin 포함) | 4종 신규 신설 | ✅ |
| board_type 데이터 | together 3 + team 1 | archive_legacy 변환 (4 row) | ✅ |

---

# § 4. 사고 회피 패턴 (D-pre.5/6/7/8 정합)

## 4-1. 자기 참조 EXISTS 절대 금지 (D-pre.7 1차 사고 패턴)

본 Step A에서 발견된 `insurer_board_insert/update`의 EXISTS는 posts → users 크로스 테이블 (자기 참조 X). 그러나 D-pre.8 sweep 표준대로 SECURITY DEFINER 함수(`is_insurer_employee()`)로 청산.

## 4-2. DB 메타 통과 ≠ 라이브 안전 (D-pre.7 학습)

Step C 사후 검증에서 메타 + 라이브 라운드트립 둘 다 검증.

## 4-3. 같은 테이블 다른 cmd 정책 전수 sweep (D-pre.7 점검 3 사후 학습)

posts SELECT/INSERT/UPDATE/DELETE 4 cmd 모두 본 Step B에서 sweep. users도 동일.

## 4-4. Step A·B·C·D 분할 패턴 (D-pre.5/6 정합)

Step A 사전 분석 (본 capture) → Step B 트랜잭션 → Step C 사후 검증 → Step D 라이브 회귀.

---

**END OF CAPTURE**

> 본 capture는 Phase 1 Step A 결과 + 결정 6건 + Step B 진입 준비를 명문화한 진실 원천입니다.
> Step B 트랜잭션 SQL은 본 capture § 2 결정 6건을 근거로 작성됩니다.
