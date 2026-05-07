# Phase 1 Step B — DB 마이그레이션 트랜잭션 capture

> **작성일:** 2026-05-07 오후 (§ 7 신설 2026-05-08 새벽)
> **단계:** v2.0 원수사 입점 모델 Phase 1 / Step 2 (Step B + B-extra + B' + C-meta 통합)
> **선행:** `db_phase1_step_a_capture.md` (Step A 진단 + 결정 6건)
> **트랜잭션 결과:** Step B 1차 ROLLBACK (사고 신호 #1) → 2차 COMMIT ✅ → Step B-extra / B' / C-meta 3건 모두 COMMIT ✅ (4 트랜잭션 누적)
> **사고 신호:** Step B 1차 1건 / Step B 2차 + B-extra + B' + C-meta 0건 추가
> **다음 단계:** Step D 라이브 회귀 = Step 16 통합 (board.html 작성 후 자연 검증, § 7-4 결정)

---

# § 1. 1차 트랜잭션 ROLLBACK 사유 + 영구 학습

## 1-1. ERROR 발생

```
ERROR: 42703: column "insurer_id" does not exist
```

## 1-2. 원인 분석

`current_user_insurer_id()` 함수 (Phase 1)가 `users.insurer_id` 컬럼을 참조:

```sql
CREATE OR REPLACE FUNCTION current_user_insurer_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT insurer_id FROM users WHERE id = auth.uid();
$$;
```

그러나 `users.insurer_id` 컬럼은 Phase 7에서 ADD 예정 → 함수 생성 시점에 컬럼 부재 → ERROR 42703.

PostgreSQL이 함수 본문 내 `SELECT insurer_id FROM users` SQL을 함수 생성 시점에 메타 검증함 (PostgreSQL 14+ 표준 동작).

## 1-3. 2차 수정

`current_user_insurer_id()` 함수 정의를 Phase 7 (`ALTER TABLE users ADD COLUMN insurer_id`) 직후로 이동 (Phase 1b 신설).

```
Phase 1   — is_manager / is_insurer_employee / is_insurer_manager 신설 (3종)
Phase 2~6 — insurers / posts / RLS sweep (current_user_insurer_id 미사용 부분만)
Phase 7   — users.insurer_id ADD COLUMN
Phase 7b  — current_user_insurer_id() 함수 신설 (4번째)  ⭐ 이동
Phase 8   — users RLS (current_user_insurer_id 사용 가능)
```

## 1-4. 영구 학습 명문화

### 학습:
> **SECURITY DEFINER 함수가 다른 테이블의 컬럼을 참조하는 경우, 함수 정의 시점에 해당 컬럼이 존재해야 함.**
> 같은 트랜잭션 안에서도 함수 본문 내 SELECT 컬럼은 함수 생성 시점에 즉시 메타 검증됨 (PostgreSQL 14+).
> 컬럼 신설 → 함수 정의 순서 강제 필수.

### 적용 패턴 (의뢰서 작성 단계 점검):
```
1. SECURITY DEFINER 함수 본문 내 모든 SELECT 컬럼 추출
2. 해당 컬럼이 동일 트랜잭션에서 ADD COLUMN으로 신설되는지 확인
3. 신설 컬럼이 있으면 함수 정의를 ADD COLUMN 직후로 배치
```

→ D-pre.7 (자기 참조 EXISTS 금지) + D-pre.8 (인라인 EXISTS sweep) 패턴과 정합.
→ 본 학습은 **Phase 1 후속 트랜잭션 + 미래 모든 마이그레이션**에 적용.

---

# § 2. 2차 트랜잭션 COMMIT 결과 (검증 8건 통과)

## V1. insurers 테이블 생성

| 검증 | 결과 |
|---|---|
| insurers_created | ✅ true |

## V2. posts 신규 컬럼 (7개)

| column_name | data_type | 비고 |
|---|---|---|
| drug_usage | text | 신규 (6필드) |
| insurer_id | uuid | 신규 (FK) |
| insurer_target | text | 신규 |
| keywords | ARRAY | 신규 (GIN 인덱스) |
| patient_age | text | **integer → text 변환 완료** (자유 입력 정합) |
| question_type | text | 신규 |
| status | text | 신규 (default '답변대기') |

→ ✅ 6 ADD + 1 ALTER TYPE 모두 정합.

## V3. SECURITY DEFINER 함수 4종

| proname | secdef |
|---|---|
| current_user_insurer_id | true |
| is_insurer_employee | true |
| is_insurer_manager | true |
| is_manager | true |

→ ✅ 4종 모두 신설.

## V4. posts RLS 10정책 (예상 9 → 실제 10)

| policyname | cmd | 출처 |
|---|---|---|
| author or admin delete posts | DELETE | 보존 |
| posts_insert_admin | INSERT | 신규 |
| posts_insert_insurer | INSERT | 신규 |
| posts_insert_manager_notice | INSERT | 신규 |
| posts_insert_qna | INSERT | 신규 |
| posts_select_admin | SELECT | 신규 |
| posts_select_insurer | SELECT | 신규 |
| posts_select_qna_notice | SELECT | 신규 |
| author or admin update posts | UPDATE | 보존 |
| posts_update_insurer | UPDATE | 신규 |

→ DELETE 1 + INSERT 4 + SELECT 3 + UPDATE 2 = **10정책**. 인라인 EXISTS 잔존 0건 (모두 SECURITY DEFINER 함수).

## V5. archive_legacy 변환 (4 row)

| board_type | cnt |
|---|---|
| archive_legacy | 4 |

→ ✅ together 3 + team 1 = 4 row 완전 전환.

## V6. users.insurer_id 신설

| 검증 | 결과 |
|---|---|
| users_insurer_id_created | ✅ true |

## V7. insurers RLS 3정책

| policyname | cmd |
|---|---|
| insurers_select_authenticated | SELECT |
| insurers_select_admin | SELECT |
| insurers_write_admin | ALL |

→ ✅ 3개 정합.

## V8. users RLS 6정책 (기존 5 + 신규 1)

| policyname | cmd | 출처 |
|---|---|---|
| user insert own | INSERT | 보존 |
| admin_select_all_users | SELECT | 보존 |
| user read own | SELECT | 보존 |
| **users_select_insurer_manager** | **SELECT** | **신규 ⭐** |
| admin_update_all_users | UPDATE | 보존 |
| user update own | UPDATE | 보존 |

→ ✅ 6정책 정합 (insurer_branch_manager 본인 회사 임직원 SELECT 신설).

---

# § 3. ⚠️ 검토 사항 1건 — `posts_update_insurer` 권한 범위

## 3-1. 현재 정책 (V4 검증 통과 but 권한 범위 검토 필요)

```sql
CREATE POLICY posts_update_insurer ON posts FOR UPDATE TO authenticated
USING (
  board_type = 'insurer' 
  AND insurer_id IS NOT NULL 
  AND (insurer_id = current_user_insurer_id() OR is_admin())
);
```

## 3-2. 의도 vs 실 결과 매트릭스

| 시나리오 | 의도 | 실 결과 | 평가 |
|---|---|---|---|
| 본인 글 수정 (모든 사용자) | ✅ 허용 | ✅ 가능 (`author or admin update posts` 보존) | OK |
| admin 모든 글 수정 | ✅ 허용 | ✅ 가능 | OK |
| **매니저(insurer_branch/insurer_manager)가 본인 회사 직원 글 모더레이션** | ✅ 허용 | ✅ 가능 | OK |
| **일반 직원(insurer_member/insurer_staff)이 같은 회사 다른 직원 글 수정** | ❌ 불허 (본인 글만) | ⚠️ **가능** | **보안 위험** |
| 다른 회사 임직원이 글 수정 | ❌ 불허 | ✅ 차단 | OK |

→ **일반 직원이 다른 사람 글도 수정 가능 = 보안 위험.** 정책 좁힘 필요.

## 3-3. 정정 패턴 (Step B-extra 트랜잭션)

```sql
-- 기존 posts_update_insurer 폐기
DROP POLICY posts_update_insurer ON posts;

-- 신규 posts_update_insurer_manager — 매니저 이상만 모더레이션
CREATE POLICY posts_update_insurer_manager ON posts FOR UPDATE TO authenticated
USING (
  board_type = 'insurer' 
  AND insurer_id IS NOT NULL 
  AND insurer_id = current_user_insurer_id()
  AND is_insurer_manager()  -- insurer_branch_manager + insurer_manager 만
);
```

**효과:**
- 일반 직원 (insurer_member/insurer_staff) → `author or admin update posts` (보존)으로 본인 글만 수정 가능
- 매니저 (insurer_branch_manager/insurer_manager) → `posts_update_insurer_manager`로 본인 회사 모더레이션
- admin → `author or admin update posts` 또는 신규 정책 양쪽 모두

## 3-4. 정정 안전성

- 데이터 영향 0 (insurer 게시판 row 0건)
- DROP + CREATE 트랜잭션 1건 = 매우 짧은 시간 (수 밀리초)
- 라이브 영향 0

---

# § 4. spec § 6 patch 권장 (T2 task)

```sql
-- 기존 spec § 6 posts_update_insurer 명세 정정:
-- USING 절 추가 가드 → is_insurer_manager()

-- 변경 전:
CREATE POLICY posts_update_insurer ON posts FOR UPDATE TO authenticated
USING (
  board_type = 'insurer' 
  AND insurer_id IS NOT NULL 
  AND (insurer_id = current_user_insurer_id() OR is_admin())
);

-- 변경 후 (정정):
CREATE POLICY posts_update_insurer_manager ON posts FOR UPDATE TO authenticated
USING (
  board_type = 'insurer' 
  AND insurer_id IS NOT NULL 
  AND insurer_id = current_user_insurer_id()
  AND is_insurer_manager()
);
-- (admin은 'author or admin update posts' 보존 정책으로 처리)
```

---

# § 5. Step B 변경 요약 (Step B-extra 진입 전 현재 상태)

| 영역 | 변경 |
|---|---|
| **insurers 테이블** | 신설 (17 컬럼) + RLS 3정책 + 인덱스 2 |
| **SECURITY DEFINER 함수** | 4종 신설 (is_manager / is_insurer_employee / is_insurer_manager / current_user_insurer_id) |
| **posts** | 6 ADD + 1 ALTER TYPE + 인덱스 3 + RLS 10정책 (sweep) |
| **users** | insurer_id UUID FK + 인덱스 + RLS 1 신설 (users_select_insurer_manager) |
| **archive_legacy** | together 3 + team 1 변환 |

**INSERT 31 row:** Step B' 종료 ✅ (§ 7-2 명문화).

---

# § 6. 사고 회피 패턴 (D-pre.5/6/7/8 + Step B 학습)

## 6-1. SECURITY DEFINER 함수 정의 시점 컬럼 의존 (Step B 신규 학습 ⭐)

본 학습 § 1-4 명문화 정합.

## 6-2. 자기 참조 EXISTS 절대 금지 (D-pre.7 1차 사고)

본 Step B에서 `is_admin/is_manager/is_insurer_employee/is_insurer_manager/current_user_insurer_id` SECURITY DEFINER 함수 5종으로 모든 인라인 EXISTS 청산. V4 검증 통과.

## 6-3. DB 메타 통과 ≠ 라이브 안전 (D-pre.7 학습)

V4 메타 검증 통과 + § 3 권한 범위 검토 발견 → Step C에서 라이브 라운드트립 검증 필수. 9역할 × board_type 조합 매트릭스로 검증.

## 6-4. 같은 테이블 다른 cmd 정책 전수 sweep (D-pre.7 점검 3 사후 학습)

posts SELECT/INSERT/UPDATE/DELETE 4 cmd 모두 본 Step B에서 sweep 완료. Step B-extra에서 UPDATE만 정정.

## 6-5. Step A·B·C·D 분할 패턴 (D-pre.5/6 정합)

Step A 사전 분석 → Step B (DDL + RLS) → Step B-extra (정정 patch) → Step B' (INSERT 31) → Step C (사후 검증) → Step D (라이브 회귀).

---

# § 7. Step B-extra + B' + C-meta 후속 트랜잭션 결과 (5/7 오후)

## § 7-1. Step B-extra — 보안 위험 청산 (`posts_update_insurer` → `posts_update_insurer_manager`)

### 7-1-1. 의도

§ 3 검토 사항 1건 (일반 직원이 같은 회사 다른 직원 글 수정 가능 = 보안 위험) 청산.

### 7-1-2. 트랜잭션 SQL

```sql
BEGIN;

DROP POLICY posts_update_insurer ON posts;

CREATE POLICY posts_update_insurer_manager ON posts FOR UPDATE TO authenticated
USING (
  board_type = 'insurer'
  AND insurer_id IS NOT NULL
  AND insurer_id = current_user_insurer_id()
  AND is_insurer_manager()
);

COMMIT;
```

### 7-1-3. 권한 매트릭스 (정정 후)

| 시나리오 | 결과 | 사용 정책 |
|---|---|---|
| 본인 글 수정 (모든 사용자) | ✅ 가능 | `author or admin update posts` (보존) |
| admin 모든 글 수정 | ✅ 가능 | `author or admin update posts` (보존) |
| 매니저 본인 회사 임직원 글 모더레이션 | ✅ 가능 | `posts_update_insurer_manager` (신규) |
| **일반 직원이 같은 회사 다른 직원 글 수정** | **❌ 차단** | (보안 위험 청산) |
| 다른 회사 임직원 글 수정 | ❌ 차단 | (정책 부재) |

### 7-1-4. 결과

- ✅ COMMIT 성공
- 사고 신호 0건
- 데이터 영향 0 (insurer 게시판 row 0건)
- 일반 직원 본인 글 수정은 보존 정책으로 유지

---

## § 7-2. Step B' — insurers 31사 INSERT (Quick 메뉴 §원전산 추출)

### 7-2-1. 의도

Quick 메뉴 §원전산 `quick_contents.system_links.content_html` (17,888자) 추출 31사를 insurers 마스터 테이블에 INSERT. v1.0 단순 진행 (자동 생성 함수는 v1.5 격상 후보).

### 7-2-2. slug 충돌 회피 정책

**손보+생보 동시 존재** → `{회사}-fire` / `{회사}-life` 분리:
- `db / kb / samsung / hanwha / nh / lina` (6개 그룹 12 row)

**손보 단독** → `-fire` 명시:
- `meritz / heungkuk-fire / lotte-fire / aig-fire` (4 row)

**생보 단독** → 단순 slug:
- `abl / ibk / im-life / kdb / kyobo / dongyang / miraeasset / metlife / shinhan / heungkuk-tlife / heungkuk-elife / chubb / aia / bnp-cardif / fubon-hyundai` (15 row)

### 7-2-3. 31사 매트릭스

| # | 종류 | slug | 비고 |
|:-:|:-:|---|---|
| 1 | 손보 | `db-fire` | DB손해보험 |
| 2 | 손보 | `kb-fire` | KB손해보험 |
| 3 | 손보 | `meritz` | 메리츠화재 |
| 4 | 손보 | `heungkuk-fire` | 흥국화재 |
| 5 | 손보 | `samsung-fire` | 삼성화재 |
| 6 | 손보 | `hanwha-fire` | 한화손해보험 |
| 7 | 손보 | `lotte-fire` | 롯데손해보험 |
| 8 | 손보 | `nh-fire` | NH농협손해보험 |
| 9 | 손보 | `lina-fire` | 라이나손해보험 |
| 10 | 손보 | `aig-fire` | AIG손해보험 |
| 11 | 생보 | `abl` | ABL생명 |
| 12 | 생보 | `db-life` | DB생명 |
| 13 | 생보 | `ibk` | IBK연금보험 |
| 14 | 생보 | `im-life` | iM라이프 |
| 15 | 생보 | `kb-life` | KB라이프 |
| 16 | 생보 | `nh-life` | NH농협생명 |
| 17 | 생보 | `kdb` | KDB생명 |
| 18 | 생보 | `kyobo` | 교보생명 |
| 19 | 생보 | `dongyang` | 동양생명 |
| 20 | 생보 | `lina-life` | 라이나생명 |
| 21 | 생보 | `miraeasset` | 미래에셋생명 |
| 22 | 생보 | `metlife` | 메트라이프 |
| 23 | 생보 | `samsung-life` | 삼성생명 |
| 24 | 생보 | `shinhan` | 신한라이프 |
| 25 | 생보 | `hanwha-life` | 한화생명 |
| 26 | 생보 | `heungkuk-tlife` | 흥국생명 (텔레마케팅) |
| 27 | 생보 | `heungkuk-elife` | 흥국생명 (대면) |
| 28 | 생보 | `chubb` | 처브라이프 |
| 29 | 생보 | `aia` | AIA생명 |
| 30 | 생보 | `bnp-cardif` | BNP파리바카디프 (admin_url 부재) |
| 31 | 생보 | `fubon-hyundai` | 푸본현대생명 (admin_url 부재) |

### 7-2-4. 결과

- ✅ COMMIT 성공
- INSERT 31 row 정합 (손보 10 + 생보 21)
- `admin_url` 부재 2건 (`bnp-cardif`, `fubon-hyundai`) → NULL 유지. 회원가입 도메인 화이트리스트(`insurers.domain`) 검증은 별 트랙 (Phase 1 Step 5 진입 시 결재)
- 사고 신호 0건

---

## § 7-3. Step C-meta — 사후 메타 검증 9건

### 7-3-1. 의도

Step B + B-extra + B' 누적 결과의 메타 정합성 검증. 자기 참조 EXISTS 잔존 0건 (D-pre.7 영구 학습 정합).

### 7-3-2. 결과 요약

- ✅ 10/10 PASS (검증 9건 + 종합 1건)
- 자기 참조 EXISTS 잔존 0건
- RLS 정책 cmd 매트릭스 (posts/users/insurers) 정합
- SECURITY DEFINER 함수 4종 (`is_manager` / `is_insurer_employee` / `is_insurer_manager` / `current_user_insurer_id`) 모두 STABLE + secdef=true 정합

### 7-3-3. ⚠️ raw 보강 필요 (별 트랙)

본 PC에 라이브 SELECT 9건 raw 결과 행 부재 (5/7 19:40 인계 노트 line 53 한 줄 요약만). 다음 정합 검증 시점에 라이브 재실행 raw 보강 권장:

```
점검 1: posts RLS 10정책 cmd 분포 (DELETE 1 + INSERT 4 + SELECT 3 + UPDATE 2 = 10)
점검 2: users RLS 6정책 cmd 분포 (INSERT 1 + SELECT 3 + UPDATE 2 = 6)
점검 3: insurers RLS 3정책 cmd 분포 (SELECT 2 + ALL 1 = 3)
점검 4: SECURITY DEFINER 함수 4종 secdef=true 확인
점검 5: 자기 참조 EXISTS 잔존 0건 (information_schema 패턴 검색)
점검 6: posts_update_insurer 폐기 + posts_update_insurer_manager 신설 정합
점검 7: insurers row count = 31
점검 8: archive_legacy row count = 4 (together 3 + team 1)
점검 9: posts 신규 컬럼 7개 (drug_usage / patient_age / question_type / insurer_target / keywords / status / insurer_id) data_type 정합
종합: 위 9건 ALL PASS
```

→ Step 3 (Quick 메뉴 §원전산 전환) 진입 전 라이브 재실행으로 보강 가능 / Step D 라이브 회귀 시 통합 검증 가능.

---

## § 7-4. Step D 라이브 회귀 분기 결정

### 7-4-1. 결정

**Step 16 통합 (board.html 작성 후 자연 검증)** — 단독 라이브 회귀 의뢰서 발행 X.

### 7-4-2. 사유

- Step 5~9 (회원가입 폼 + 보험사 페이지 + 게시판 2탭 + 6필드 입력 + 미러링)에서 라이브 코드 정합화 시점에 9역할 × board_type 라운드트립 자연 검증 가능
- 단독 회귀 의뢰서는 Chrome 회신 부담 ↑ + 코드 부재 상태 검증은 의미 한정 (RLS 단독 검증은 § 7-3 메타 검증으로 대체)
- D-pre.5/6/7/8 패턴은 코드 정합화 단계와 분리됐으나, Phase 1 Step 2는 Step 5~9가 코드 정합화 단계 = 자연 통합 가능

### 7-4-3. 적용

- Step 16 (라이브 회귀 + 9역할 종합 검수) 시 본 capture § 7-3 점검 9건 + 9역할 × board_type 라운드트립 통합 의뢰서 발행
- 그 사이 별 부채 누적 시 § 7-3 raw 보강을 우선 처리

---

**END OF CAPTURE**

> 본 capture는 Phase 1 Step B + B-extra + B' + C-meta 4 트랜잭션 누적 결과 + 영구 학습 1건 (SECURITY DEFINER 함수 컬럼 의존) + 보안 위험 청산 1건 (posts_update_insurer_manager) + 31사 INSERT 매트릭스를 명문화한 진실 원천입니다.
> Step D 라이브 회귀는 Phase 1 Step 16 통합 검수에 합쳐서 진행 (§ 7-4 결정).
> § 7-3 라이브 raw 보강은 별 트랙 — Step 3 진입 또는 Step 16 라이브 회귀 시 통합 가능.
