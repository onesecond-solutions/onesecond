# Phase 1 Step 5-A — 사전 캡처 raw

> **작성일:** 2026-05-09 오후
> **단계:** v2.0 원수사 입점 모델 Phase 1 / Step 5-A (사전 분석)
> **선행:** Step 2-bis 본질 종료 (8/18 = 44.4%, commit `0549a33`)
> **실행자:** Claude in Chrome (Supabase Dashboard SQL Editor)
> **신버전 검증:** URL `pdnwgzneooyygfejrvbg` + 프로젝트명 `onesecond-v1-restore-0420` + `current_database = postgres` 3건 모두 PASS ✅
> **결과:** 10블록 SELECT only, DB 변경 0건. 사고 신호 4건 사전 점검 모두 PASS.

---

# § 1. 신버전 진입 검증 (블록 1)

```
db        | pg_user  | pg_version
postgres  | postgres | PostgreSQL 17.6 on aarch64-unknown-linux-gnu, compiled by gcc (GCC)
```

✅ 신버전 진입 정합. 구버전 진입 의심 신호 0건.

---

# § 2. insurers 31사 도메인 분포 (블록 2 + 3) ⚠️ 신규 발견

## 2-1. 31사 raw (도메인 컬럼 전부 NULL)

| slug | name | type | domain | domain_status |
|---|---|---|---|---|
| abl | ABL생명 | 생명보험 | NULL | NULL |
| aia | AIA생명 | 생명보험 | NULL | NULL |
| aig-fire | AIG손해보험 | 손해보험 | NULL | NULL |
| bnp-cardif | BNP파리바 카디프생명 | 생명보험 | NULL | NULL |
| db-life | DB생명 | 생명보험 | NULL | NULL |
| db-fire | DB손해보험 | 손해보험 | NULL | NULL |
| ibk | IBK연금보험 | 생명보험 | NULL | NULL |
| im-life | iM라이프 | 생명보험 | NULL | NULL |
| kb-life | KB라이프 | 생명보험 | NULL | NULL |
| kb-fire | KB손해보험 | 손해보험 | NULL | NULL |
| kdb | KDB생명 | 생명보험 | NULL | NULL |
| nh-life | NH농협생명 | 생명보험 | NULL | NULL |
| nh-fire | NH농협손해보험 | 손해보험 | NULL | NULL |
| kyobo | 교보생명 | 생명보험 | NULL | NULL |
| dongyang | 동양생명 | 생명보험 | NULL | NULL |
| lina-life | 라이나생명 | 생명보험 | NULL | NULL |
| lina-fire | 라이나손해보험 | 손해보험 | NULL | NULL |
| lotte-fire | 롯데손해보험 | 손해보험 | NULL | NULL |
| meritz | 메리츠화재 | 손해보험 | NULL | NULL |
| metlife | 메트라이프 | 생명보험 | NULL | NULL |
| miraeasset | 미래에셋생명 | 생명보험 | NULL | NULL |
| samsung-life | 삼성생명 | 생명보험 | NULL | NULL |
| samsung-fire | 삼성화재 | 손해보험 | NULL | NULL |
| shinhan | 신한라이프 | 생명보험 | NULL | NULL |
| chubb | 처브라이프 | 생명보험 | NULL | NULL |
| fubon-hyundai | 푸본현대생명 | 생명보험 | NULL | NULL |
| hanwha-life | 한화생명 | 생명보험 | NULL | NULL |
| hanwha-fire | 한화손해보험 | 손해보험 | NULL | NULL |
| heungkuk-elife | 흥국생명 (e-life) | 생명보험 | NULL | NULL |
| heungkuk-tlife | 흥국생명 (T-Life) | 생명보험 | NULL | NULL |
| heungkuk-fire | 흥국화재 | 손해보험 | NULL | NULL |

## 2-2. 분포 요약

| total | domain_set | domain_null |
|---|---|---|
| 31 | 0 | 31 |

**🚨 발견 = Step 5-B 작업 흐름 영향:**
- 도메인 컬럼 31사 전부 NULL → **D2 결재 (a) "클라 1차 + 서버 2차 도메인 화이트리스트 검증" 전제가 비어있음**
- Step 5-B 진입 전 31사 도메인 INSERT 또는 도메인 검증 후순위 결정 필요
- § 6 후속 결재 대기 박스 (D2-bis) 신설

---

# § 3. users 6컬럼 정합 (블록 4) ✅

| column_name | data_type | column_default | is_nullable |
|---|---|---|---|
| role | text | 'ga_member'::text | YES |
| status | text | 'active'::text | NO |
| last_seen_at | timestamp with time zone | NULL | YES |
| insurer_id | uuid | NULL | YES |
| branch_id | uuid | NULL | YES |
| team_id | uuid | NULL | YES |

**정합 회귀 PASS:**
- D-pre.5 (5/2): status DEFAULT 'active' NOT NULL ✅
- D-pre.6 (5/2): role DEFAULT 'ga_member' (5역할 → 9역할 정합) ✅
- Step 2-bis (5/9): branch_id / team_id NULL 허용 ✅
- Phase 1 Step 2 (5/7): insurer_id NULL 허용 ✅

---

# § 4. handle_new_user trigger 본문 (블록 5) ✅ 5/1 PASS 정합

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
  IF v_role IS NULL OR v_role NOT IN (
    'ga_branch_manager', 'ga_manager', 'ga_member', 'ga_staff',
    'insurer_branch_manager', 'insurer_manager', 'insurer_member', 'insurer_staff'
  ) THEN
    v_role := 'ga_member';
  END IF;

  INSERT INTO public.users (
    id, email, name, phone, company, branch, role, team, plan, created_at
  )
  VALUES (
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

**정합 회귀 PASS:**
- 5/1 22:57 마이그레이션 본문과 한 글자도 다르지 않음 (`role_migration_plan.md` § 3.1.5 + `db_pre_migration_capture_20260501.md` § 1)
- 9역할 8종 IN 절 (admin 메타 가입 차단 옵션 B 정합) ✅
- 폴백 `'ga_member'` ✅
- D5 결재 (b) "trigger 그대로 + 별 RPC `complete_signup` 신설" 정합 = 본문 변경 0건 진입 가능 ✅

**Step 5-B 영향:**
- trigger는 본문 그대로 보존
- INSERT 시점에 `insurer_id` / `branch_id` / `team_id` / `status` 미언급 → 모두 default (NULL/active) INSERT
- 회원가입 직후 RPC `complete_signup`이 사용자 본인 row UPDATE로 보강

---

# § 5. 4 테이블 row 분포 (블록 6 + 7) ✅

## 5-1. row 카운트

| tbl | rows |
|---|---|
| branches | 1 |
| teams | 4 |
| insurer_employee_branches | 0 |
| public.users | 3 |

✅ Step 2-bis 5/9 종료 시점 정합.

## 5-2. branches 시드 (1 row)

| id | name | ga_org_name | is_active |
|---|---|---|---|
| `396edf6a-15db-4b69-a6b9-dae74b08cd33` | 더원지점 | AZ금융 | true |

## 5-3. teams 시드 (4 row, 모두 더원지점 소속)

| id | name | branch_name | is_active |
|---|---|---|---|
| `95088922-c76e-45b5-bb68-8ce1e914a6c4` | 1팀 | 더원지점 | true |
| `741bce8a-e264-4f69-bc23-a7fff3478bec` | 2팀 | 더원지점 | true |
| `482c8c2d-b6f6-4188-9657-80f30d22431f` | 3팀 | 더원지점 | true |
| `5fccd362-9ee3-4165-8960-7cb0b7ec72fa` | 4팀 | 더원지점 | true |

**Step 5-C 영향:**
- D7 결재 (c) "하이브리드" = 회사명 select (AZ금융 / 기타) → 지점 select (더원지점 / 기타) → 팀 select (1팀~4팀 / 기타)
- 시드 일치 시 위 UUID 자동 매핑, 일치 안할 시 free text → branch_id / team_id NULL INSERT
- index.html JS에서 시드 명단을 하드코딩 또는 anon SELECT (RLS 정책 별도 확인 — branches/teams 정책은 Step 2-bis 5/9 sweep)

---

# § 6. 라이브 사용자 분포 (블록 8) ✅

| role | status | cnt |
|---|---|---|
| admin | active | 1 |
| ga_member | active | 2 |

**관찰:**
- 9역할 중 6역할 가입자 0건 (`ga_branch_manager` / `ga_manager` / `ga_staff` / `insurer_*` 4종)
- 5/15 4팀 약 40~50명 가입 = ga_member / ga_manager 분포 예정 (별 트랙 #38 운영 데이터)
- admin 1명 = 본 계정 (`bylts0428@gmail.com`)

---

# § 7. 함수 부재 + RLS 정책 부재 (블록 9 + 10) ✅ Step 5-B 신설 대상 확정

## 7-1. complete_signup / admin_approve_user 함수 부재 (블록 9)

```
(0행 — proname 결과 없음)
```

→ Step 5-B에서 신설 (D5 결재 (b) + D4 결재 (a) 정합).

## 7-2. insurers RLS 정책 (블록 10)

| policyname | cmd | roles | qual |
|---|---|---|---|
| insurers_write_admin | ALL | {authenticated} | `is_admin()` |
| insurers_select_admin | SELECT | {authenticated} | `is_admin()` |
| insurers_select_authenticated | SELECT | {authenticated} | `(is_active = true)` |

**관찰:**
- 라이브 정책 3건 모두 `{authenticated}` 전용 (anon 정책 0건)
- 회원가입 폼에서 도메인 화이트리스트 검증 시 anon 권한 SELECT 필요 → Step 5-B 신설 대상 확정 (D2 결재 (a) 정합)
- 신설 정책 후보: `insurers_select_anon_domain_check` (anon, `domain IS NOT NULL`)

---

# § 8. 사고 신호 사전 점검 (4건 모두 PASS)

| 신호 | 결과 | 비고 |
|---|---|---|
| 블록 1: `current_database = postgres` | ✅ | 신버전 정합 |
| 블록 5: handle_new_user IN 절 = 8역할 (5역할 잔존 ❌) | ✅ | 5/1 마이그레이션 적용 정합 |
| 블록 6: row 분포 (1/4/0/3) | ✅ | Step 2-bis 종료 정합 |
| 블록 8: role 키 = `admin` + `ga_member` (5역할 잔존 ❌) | ✅ | 신버전 정합 |

→ 구버전 진입 의심 신호 **0건**. 본 캡처는 진실 원천으로 채택 가능.

---

# § 9. Step 5-B 진입 영향 정리 + 후속 결재 대기

## 9-1. Step 5-B 트랜잭션 1건 신설 항목 (확정)

| 항목 | 출처 | Step 5-B 처리 |
|---|---|---|
| RPC `complete_signup(insurer_id, branch_id, team_id, status)` | D5 (b) + 블록 9 부재 | 신설 |
| RPC `admin_approve_user(user_id)` | D4 (a) + 블록 9 부재 | 신설 |
| RLS 정책 `insurers_select_anon_domain_check` (anon SELECT) | D2 (a) + 블록 10 부재 | 신설 |

## 9-2. ⚠️ 신규 결재 대기 (D2-bis: 31사 도메인 INSERT 시점)

**상황:** D2 결재 (a) "클라 1차 + 서버 2차 도메인 화이트리스트 검증" 채택 = 31사 도메인이 채워져 있어야 작동.
**현재:** 31사 전부 domain NULL (블록 2/3).
**옵션:**
- (가) **Step 5-B에 31사 도메인 INSERT 트랜잭션 포함** (admin이 공식 도메인 사전 입력) ⭐ Code 추천
- (나) Step 5-B는 RLS 정책만 신설, 도메인 검증은 5/15 4팀 오픈 후 별 트랙으로 분리 (Phase 1 동안 보험사 임직원 가입 불가)
- (다) 도메인 화이트리스트 자체를 Phase 2 (5/22~) 이후로 미룸 (Step 5-C 흐름에서 보험사 분기 임시 비활성)

**(가) 채택 시 데이터 출처:**
- 공개 정보 (각 보험사 공식 사이트 + 직원 이메일 도메인 공식 발표)
- 정합 검증 어려운 일부 도메인은 NULL 유지 (사후 admin이 보험사별 입력)
- 닭-달걀 #39 별 트랙 정합 — 첫 입점 보험사가 도메인 확인되면 활성화

**(나) 채택 시 영향:**
- 5/15 오픈 시점 = GA 4팀 약 40~50명만 가입 가능, 보험사 임직원 가입 페이지는 "준비 중" 표기
- 도메인 INSERT 시점 = Phase 1 종료 후 별 트랙 #41 (신설)

**(다) 채택 시 영향:**
- D2 결재 (a) → (b 클라만) 또는 (서버에서 admin 승인만으로 게이트) 재결재
- spec v2 § 1 "4중 방어" 본질 변경

⚠️ **본 결정은 Step 5-B 진입 직전 결재 필수.** 본 사전 캡처 commit 후 팀장님 결재 대기.

## 9-3. Step 5-C 라이브 코드 영향

- D7 (c) 하이브리드 시드 매핑 → branches/teams UUID 하드코딩 가능 (raw 캡처 § 5-2/5-3)
- 31사 select 옵션 = block 2의 `slug + name` raw 활용 (도메인 NULL 무관, 회사 선택만 가능)

---

# § 10. 본 캡처 사용 권한

본 파일은 **2026-05-09 오후 시점 라이브 진실 원천 raw**. 이후 Step 5-B 트랜잭션 진입 시 § 4/§ 5/§ 7과의 정합 회귀 검증 비교 자료로 활용. 본 캡처와 라이브 결과 불일치 발견 시 즉시 정지하고 팀장님 보고 (구버전 진입 의심 90% 확률).

진실 원천:
- `docs/specs/v2_step5_signup_form_workorder.md` (작업지시서, 결재 9건 ✅)
- `docs/specs/v2_insurer_admission_phase1_v2.md` (메인 spec § 1 + § 6 + § 7)
- `docs/architecture/role_migration_plan.md` § 3.1.5 (handle_new_user 5/1 PASS 본문)
- `docs/architecture/db_pre_migration_capture_20260501.md` § 1 (5/1 마이그레이션 직전 raw)
- 메모리 `supabase_sql_editor_session_isolation.md` (RUN 단위 세션 분리 학습)
