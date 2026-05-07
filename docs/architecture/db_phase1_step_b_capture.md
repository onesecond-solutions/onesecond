# Phase 1 Step B — DB 마이그레이션 트랜잭션 capture

> **작성일:** 2026-05-07 오후
> **단계:** v2.0 원수사 입점 모델 Phase 1 / Step 2 / Step B
> **선행:** `db_phase1_step_a_capture.md` (Step A 진단 + 결정 6건)
> **트랜잭션 결과:** 1차 ROLLBACK (사고 신호 #1 발생) → 수정 후 2차 **COMMIT 성공 ✅**
> **사고 신호:** 1차 1건 / 2차 0건
> **다음 단계:** Step B-extra 정정 patch + Step B' INSERT 31 row + Step C 사후 검증 + Step D 라이브 회귀

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

**INSERT 31 row:** Step B' 별도 의뢰서 (대기).

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

**END OF CAPTURE**

> 본 capture는 Phase 1 Step B 트랜잭션 결과 + 영구 학습 1건 + 검토 1건을 명문화한 진실 원천입니다.
> Step B-extra 정정 트랜잭션은 본 capture § 3-3을 근거로 작성됩니다.
> Step B' INSERT 의뢰서는 별도 진행.
