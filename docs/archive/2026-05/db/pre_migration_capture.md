# 마이그레이션 직전 상태 캡처 — 2026-05-01 저녁

> **목적:** 9역할 마이그레이션 (Phase D-pre Step C-1.5 ~ C-6) 진입 직전 DB 상태를 raw 텍스트로 보존. PITR 미활성 환경에서 (가) D-pre § 6 명시 롤백 SQL + Daily 백업과 함께 (나) 텍스트 백업 안전망 역할.
>
> **신버전 검증:** `current_database = postgres` / `current_user = postgres` / 프로젝트 ID `pdnwgzneooyygfejrvbg` (onesecond-v1-restore-0420) ✅
>
> **PITR 결정:** 활성화 취소 (월 $111 비현실 — PITR $100 + Small Compute 업그레이드 $15). v1.1 출시 직전 재검토.
>
> **캡처 출처:** Claude in Chrome agent SELECT 3건 실행 결과 (Supabase Dashboard SQL Editor).

---

## 1. handle_new_user 함수 본문 raw

> **D-pre § 1.1.a 인용본과 100% 일치 ✅** (5/1 오후 캡처와 차이 없음 — 함수 변경 없이 마이그레이션 직전 도달).

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_role text := meta->>'role';
BEGIN
  IF v_role IS NULL OR v_role NOT IN ('member', 'manager', 'branch_manager', 'staff') THEN
    v_role := 'member';
  END IF;

  INSERT INTO public.users (
    id, email, name, phone, company, branch, role, team, plan, created_at
  ) VALUES (
    NEW.id,
    NEW.email,
    NULLIF(meta->>'name', ''),
    NULLIF(meta->>'phone', ''),
    NULLIF(meta->>'company', ''),
    NULLIF(meta->>'branch', ''),
    v_role,
    NULLIF(meta->>'team', ''),
    'free',
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$
```

**현재 허용 역할:** `member`, `manager`, `branch_manager`, `staff` (4종 — admin 제외, 옵션 B 정합).
**Step C-1.5 변경 후:** `ga_branch_manager`, `ga_manager`, `ga_member`, `ga_staff`, `insurer_branch_manager`, `insurer_manager`, `insurer_member`, `insurer_staff` (8종 — admin 제외 옵션 B 보존). 폴백 `'member'` → `'ga_member'`.

---

## 2. public.users 전수 (1행)

| id | email | name | role | plan | phone | company | branch | team | created_at |
|---|---|---|---|---|---|---|---|---|---|
| `de7ba389-901a-426a-9828-6afb33a16ecc` | `bylts0428@gmail.com` | 어드민 | **admin** | free | 010-9294-9104 | 원세컨드 | 더원지점 | admin | 2026-04-07 05:40:36.95325+00 |

**관찰:**
- ✅ admin 1명만 존재 (D-pre § 2.3 손실 데이터 검증 통과 — 5역할 사용자 0건)
- ✅ 본 계정 (`bylts0428@gmail.com`) 정상 보존 — Step C-3 UPDATE에서 admin은 변경 안 함
- ✅ Step C-3 실 변경 0건 확정 (5역할 → 9역할 매핑 대상 0명)

---

## 3. 변경 대상 RLS 정책 6건 raw

### 3.1 `activity_logs_select_branch_manager` (activity_logs / SELECT)

```
permissive: PERMISSIVE
roles:      {authenticated}
qual:
  EXISTS (
    SELECT 1
    FROM (users me JOIN users target ON ((target.id = activity_logs.user_id)))
    WHERE ((me.id = auth.uid())
       AND (me.role = 'branch_manager'::text)
       AND (target.branch = me.branch))
  )
with_check: NULL
```

**Step C-4-a 변경 후:** `me.role = 'branch_manager'` → `me.role IN ('ga_branch_manager', 'insurer_branch_manager')` (양쪽 소속 지점장 모두 권한)

### 3.2 `activity_logs_select_manager` (activity_logs / SELECT)

```
permissive: PERMISSIVE
roles:      {authenticated}
qual:
  EXISTS (
    SELECT 1
    FROM (users me JOIN users target ON ((target.id = activity_logs.user_id)))
    WHERE ((me.id = auth.uid())
       AND (me.role = 'manager'::text)
       AND (target.team = me.team)
       AND (target.role = 'member'::text))
  )
with_check: NULL
```

**Step C-4-b 변경 후:** `me.role = 'manager'` → `me.role IN ('ga_manager', 'insurer_manager')`. `target.role = 'member'` → `target.role IN ('ga_member', 'insurer_member')`.

### 3.3 `admin read logs` (script_usage_logs / SELECT)

```
permissive: PERMISSIVE
roles:      {authenticated}
qual:
  EXISTS (
    SELECT 1
    FROM users
    WHERE ((users.id = auth.uid())
       AND (users.role = ANY (ARRAY['admin'::text, 'branch_manager'::text])))
  )
with_check: NULL
```

**관찰:** 정책명 "admin read logs"이지만 실제 `branch_manager`도 포함. 즉 admin + branch_manager(GA·원수사 무관 단일 키) 둘 다 허용.
**Step C-4-c 변경 후:** 정책명 `admin_branch_manager_read_logs`. role 배열을 `['admin', 'ga_branch_manager', 'insurer_branch_manager']`로 확장.

### 3.4 `insurer board insert` (posts / INSERT)

```
permissive: PERMISSIVE
roles:      {authenticated}
qual:       NULL
with_check:
  ((board_type = 'insurer_board'::text)
   AND (EXISTS (
     SELECT 1 FROM users
     WHERE ((users.id = auth.uid())
        AND (users.role = ANY (ARRAY['admin'::text, 'insurer'::text]))))))
```

**관찰:** ⚠️ 9역할에 존재하지 않는 `'insurer'` 단일 키로 하드코딩. 5역할 체계에서도 정의되지 않은 키 — 옛 v1.0 잔재 또는 가설 키.
**Step C-4-d 변경 후:** `'insurer'` 단일 키 → `insurer_*` 4종 통일. `users.role IN ('admin', 'insurer_branch_manager', 'insurer_manager', 'insurer_member', 'insurer_staff')` (결정 4 정합).

### 3.5 `insurer board update` (posts / UPDATE)

```
permissive: PERMISSIVE
roles:      {authenticated}
qual:
  ((board_type = 'insurer_board'::text)
   AND ((author_id = (auth.uid())::text)
     OR (EXISTS (
       SELECT 1 FROM users
       WHERE ((users.id = auth.uid())
          AND (users.role = 'admin'::text))))))
with_check: NULL
```

**관찰:** ⚠️ **D-pre § 1.1 발견 2 (insurer 비대칭) 재확인 ✅** — INSERT는 admin + 'insurer' 허용이지만 UPDATE는 admin만 허용 (작성자 본인 제외).
**Step C-4-d 변경 후:** UPDATE도 INSERT와 동일하게 admin + insurer_* 4종으로 통일 (결정 4 정합 — INSERT/UPDATE 비대칭 해소).

### 3.6 `admin update all` (users / UPDATE)

```
permissive: PERMISSIVE
roles:      {public}        ← ⚠️ anonymous 포함
cmd:        UPDATE
qual:       (auth.uid() = id)   ← ⚠️ 정책명과 동작 불일치 (본인만 수정 가능)
with_check: NULL
```

**관찰:** ⚠️ **D-pre § 1.1 발견 3 (users 정책 이상) 재확인 ✅**
- 정책명 "admin update all"이지만 실제 qual은 `auth.uid() = id` = **본인 행만** UPDATE 가능
- roles `{public}` 포함 = anonymous 포함 (보안 흠)
- → admin이 다른 사용자 row UPDATE 불가 (정책 이름과 동작 일치 안 함)

**Step C-5 변경 후:** 정책명 `admin_update_all_users`. qual = `EXISTS (SELECT 1 FROM users me WHERE me.id = auth.uid() AND me.role = 'admin')` (진짜 admin만 모든 row UPDATE 가능). roles `{authenticated}`로 한정.

---

## 4. 발견 사항 (D-pre 산출물 외 신규 — 2026-05-01 캡처 시점)

### 4.1 insurer board 정책 `'insurer'` 단일 키 하드코딩 — 죽은 정책

§ 3.4 `insurer board insert` + § 3.5 `insurer board update` 양쪽 모두 `users.role = ANY (ARRAY['admin'::text, 'insurer'::text])` 패턴으로 `'insurer'` 단일 키 하드코딩.

**죽은 정책 분석:**
- `'insurer'` 단일 키는 **5역할(member/manager/branch_manager/staff/admin) 어디에도 없는 키**
- 9역할(admin / ga_*·insurer_* 4종 = 9종)에도 **없음**
- 따라서 `users.role = 'insurer'`인 row는 **0건** — 정책의 `'insurer'` 매치 분기가 **항상 false**
- 사실상 INSERT 권한 = admin만, UPDATE 권한 = admin만 — 양쪽 동일하게 admin만 작동했던 셈
- 즉 D-pre § 1.1 발견 2 "insurer 비대칭(INSERT vs UPDATE)"은 **이름상 비대칭이었으나 실 동작은 admin 전용 대칭**

**D-pre 산출물 명시 누락:**
- D-pre § 1.1 발견 2 — INSERT/UPDATE 비대칭 표기는 있으나 `'insurer'` 키 자체가 **죽은 키**라는 분석은 직접 명시 안 됨
- D-pre § 6.4 (Step C-4 롤백 SQL) — raw 본문 4건 첨부 명시했으나 죽은 정책 분석은 부재
- D-pre § 6.5 (팀장님 표기) — 본 캡처 시점 기준 § 6.4가 정확 (Step C-4 = RLS 정책 4개 복원)

**Step C-4-d 변경 후 의미:**
- INSERT: `users.role IN ('admin', 'insurer_branch_manager', 'insurer_manager', 'insurer_member', 'insurer_staff')` (5종)
- UPDATE: 동일 (이름상·실 동작 모두 비대칭 해소, 결정 4 정합)
- → **9역할 마이그레이션 후 insurer 사용자 가입 시 처음으로 의미 있는 INSERT/UPDATE 권한 확장** (현재 admin만 작동하던 죽은 분기가 살아남)

### 4.2 admin update all 정책 이상 (D-pre 발견 3 재확인)

§ 3.6 raw 보존. 정책명 `"admin update all"`이지만 qual `auth.uid() = id`는 **본인 행만** UPDATE 가능. roles `{public}`로 **anonymous도 포함**. 이름·동작 불일치 + 보안 흠.

**Step C-5 변경 후:**
- 정책명: `admin_update_all_users` (snake_case 정합)
- qual: `EXISTS (SELECT 1 FROM users me WHERE me.id = auth.uid() AND me.role = 'admin')`
- roles: `{authenticated}` (anonymous 차단)
- → 진짜 admin만 모든 row UPDATE 가능

### 4.3 함수 정정 영향도 — 9역할 가입자 0건 회복

§ 1 함수 본문이 5역할 IN절 그대로 → 현재까지 9역할 메타로 가입한 사용자 0건이라 회귀 위험 없음. Step C-1.5 적용 직후부터 9역할 가입자 처음으로 정상 처리.

---

## 5. Step C 변경 매핑 요약 (이 raw → 변경 후)

| 정책 | 현재 | Step C 후 |
|---|---|---|
| handle_new_user 함수 IN 절 | `'member','manager','branch_manager','staff'` (4종) | `ga_*` 4종 + `insurer_*` 4종 = 8종 (admin 제외, 옵션 B) |
| handle_new_user 폴백 | `'member'` | `'ga_member'` |
| `activity_logs_select_branch_manager` | `me.role = 'branch_manager'` | `me.role IN ('ga_branch_manager','insurer_branch_manager')` |
| `activity_logs_select_manager` | `me.role = 'manager'` + `target.role = 'member'` | `me.role IN ('ga_manager','insurer_manager')` + `target.role IN ('ga_member','insurer_member')` |
| `admin read logs` → `admin_branch_manager_read_logs` | `role = ANY (ARRAY['admin','branch_manager'])` | `role IN ('admin','ga_branch_manager','insurer_branch_manager')` |
| `insurer board insert` → `insurer_board_insert` | `role = ANY (ARRAY['admin','insurer'])` | `role IN ('admin','insurer_branch_manager','insurer_manager','insurer_member','insurer_staff')` |
| `insurer board update` → `insurer_board_update` | UPDATE는 admin만 (비대칭) | INSERT와 동일 (admin + insurer_* 4종, 비대칭 해소) |
| `admin update all` → `admin_update_all_users` | `auth.uid() = id` (본인만) + roles `{public}` | `EXISTS (...me.role='admin'...)` (진짜 admin) + roles `{authenticated}` |
| (Step C-2) users.role default | `'member'` | `'ga_member'` |
| (Step C-3) UPDATE 4건 | (5역할 사용자 0건 — 실 변경 0) | admin은 보존, 9역할 외 잔존 0행 기대 |
| (Step C-6) library RLS | `rowsecurity = false` | 활성화 + 정책 5개 신설 (select_own_or_shared / insert_own / update_own / delete_own / admin_all) |
| (Step C-6) news RLS | `rowsecurity = false` | 활성화 + 정책 2개 신설 (select_active / admin_all) |

---

## 6. 복구 시 활용 가이드

### 6.1 마이그레이션 부분 실패 시 1차 복구 = D-pre § 6 롤백 SQL

D-pre `role_migration_plan.md` § 6.1.5 ~ § 6.6에 각 단계 raw 롤백 SQL 보존. 본 캡처본은 raw 비교 자료로 활용.

### 6.2 본 캡처본 = "최후 raw 텍스트 안전망"

D-pre 롤백 SQL이 어떤 이유로 적용 실패 시 (예: 다른 단계 SQL과 충돌), 본 § 1·§ 3 raw 본문을 그대로 복원 SQL로 재구성 가능.

**복원 절차:**
1. § 1 함수 본문 raw → `CREATE OR REPLACE FUNCTION ...$function$` 그대로 실행 (5역할 IN절 원복)
2. § 3.1 ~ § 3.6 정책 raw → `DROP POLICY ... ; CREATE POLICY ... USING (qual) WITH CHECK (with_check) ;` 형태로 재작성
3. § 2 admin row 손상 시 → admin row INSERT (id 보존, email/name/company/branch 그대로)

### 6.3 Daily 백업 (1차 안전망)

- 최근 백업: 2026-05-01 02:14:29 +00 (PHYSICAL 타입)
- Supabase Dashboard → Database → Backups → Restore 버튼
- 복원 시 약 17시간 손실 (5/1 02:14 시점으로 복귀)

---

## 7. 최종 안전망 조합 (3중 방어)

| 단계 | 안전망 | 회복 시간 |
|:---:|---|---|
| 🛡️ 1차 | D-pre § 6 롤백 SQL (단계별 명시) | 즉시 |
| 🛡️ 2차 | 본 캡처본 (raw 텍스트 — 본 파일) | ~5분 (수동 SQL 재작성) |
| 🛡️ 3차 | Daily 백업 (5/1 02:14 시점) | ~30분 (Dashboard 복원) |

**비용:** $0 (PITR $111/월 회피).

---

*본 캡처본은 Phase D-pre Step C-1.5 진입 직전 시점의 진실 원천 raw 텍스트 보존. Step C 완료 후에도 본 파일 유지 (마이그레이션 이전 상태 비교 자료).*
