# Phase 1.5 — branches + teams RLS 비활성화 캡처 raw

> **작성일:** 2026-05-09 저녁 (Phase 1.5 즉시 흡수 결정 후 즉시 처방)
> **단계:** Phase 1.5 / Step P1.5-A 보강 (FK 위반 23503 해소)
> **선행:** Step 5-C 본 빌드 + 라이브 가입 시도 → branches RLS FK 위반 발견
> **사유:** branches 테이블 RLS 활성화 + `TO authenticated` 정책만 → 신규 가입(anon) 시점 FK 검사 차단
> **실행자:** Claude in Chrome (Supabase Dashboard SQL Editor)
> **신버전 검증:** URL `pdnwgzneooyygfejrvbg` + 프로젝트명 `onesecond-v1-restore-0420` ✅
> **결과:** RUN 1 (메인 트랜잭션) + RUN 2 (사후 검증) **모두 PASS**

---

# § 1. 진단 매트릭스 (사전 조사 raw 정합)

| 영역 | 상태 |
|---|---|
| trigger 본문 | 정상 (Step 5-C 정정 본문 그대로) ✅ |
| 함수 owner | postgres + SECURITY DEFINER ✅ |
| public.users 다른 trigger | 0건 ✅ |
| auth.users trigger | handle_new_user 1건만 ✅ |
| **branches RLS (변경 전)** | **활성 (relrowsecurity=true)** ⚠️ |
| **branches 정책 TO 절** | **`TO authenticated` 만 (anon 부재)** ⚠️ |
| 시뮬레이션 (postgres role 직접 INSERT) | **FAIL with 23503** ⚠️ |

**메커니즘:**
- 신규 가입 = anon role (JWT 발급 전)
- anon role은 branches에 정책 없음 → RLS deny → FK 검사 시 row "안 보임"
- PostgreSQL FK 검사가 RLS 적용받음 (Supabase 환경)

---

# § 2. RUN 1 — 메인 트랜잭션 (BEGIN~COMMIT) ✅

```sql
BEGIN;

ALTER TABLE public.branches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;

-- 임시 검증 raw
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname IN ('branches', 'teams') AND relnamespace = 'public'::regnamespace;

COMMIT;
```

**결과:**

| 단계 | 결과 |
|---|---|
| 2-1 신버전 진입 | db=postgres, pg_user=postgres ✅ |
| 2-2 branches RLS DISABLE | ✅ |
| 2-3 teams RLS DISABLE | ✅ |
| 2-4 임시 검증 raw | branches relrowsecurity=false / teams relrowsecurity=false ✅ |

**⚠️ 의뢰서 결함 발견 (학습):**
- 의뢰서 2-5 시뮬레이션은 BEGIN~COMMIT 안에 박힘
- RAISE EXCEPTION 발생 → 트랜잭션 ROLLBACK → RLS disable도 함께 ROLLBACK
- → Chrome이 RLS 비활성화를 별도 BEGIN~COMMIT으로 분리 COMMIT 후, 동적 UUID로 재시뮬레이션 진행
- **학습:** RLS 변경 + INSERT 시뮬레이션을 같은 트랜잭션에 박지 말 것 (시뮬레이션 실패 시 RLS 변경도 롤백)

---

# § 3. 재시뮬레이션 (별도 BEGIN~COMMIT 후)

```sql
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
  branch_uuid UUID;
  team_uuid UUID;
BEGIN
  SELECT id INTO branch_uuid FROM public.branches LIMIT 1;
  SELECT id INTO team_uuid FROM public.teams LIMIT 1;

  INSERT INTO public.users (
    id, email, name, role, plan,
    branch_id, team_id, status, created_at
  ) VALUES (
    test_id,
    'sim_' || test_id || '@test.local',
    'Sim',
    'ga_member',
    'free',
    branch_uuid,
    team_uuid,
    'active',
    NOW()
  );
  DELETE FROM public.users WHERE id = test_id;
  RAISE NOTICE '[FIX VERIFICATION PASS]';
END $$;
```

**결과:** [FIX VERIFICATION PASS] INSERT + DELETE successful ✅

→ branches → teams FK 체인 정상 참조. RLS disable 후 가입 흐름 정상.

---

# § 4. RUN 2 — 사후 검증 (SELECT only) ✅

## 4-1. RLS 상태 raw

| relname | relrowsecurity | relforcerowsecurity |
|---|---|---|
| branches | **false** | false |
| insurer_employee_branches | true | false |
| teams | **false** | false |

→ branches/teams=false ✅, IEB=true 변동 없음 ✅

## 4-2. RLS 정책 보존 확인 (5건)

| schemaname | tablename | policyname |
|---|---|---|
| public | branches | branches_select_authenticated |
| public | branches | branches_write_admin |
| public | teams | teams_select_admin |
| public | teams | teams_select_my_branch |
| public | teams | teams_write_admin |

→ 정책 5건 보존 (RLS disabled 상태이므로 무효이나 정책 자체는 보존). Phase 1.5 후 RLS 재활성화 시 즉시 적용 가능.

## 4-3. 사용자 분포 무영향

| role | status | count |
|---|---|---|
| admin | active | 1 |
| ga_member | active | 2 |

→ Step 5-A/5-B/5-C와 동일. **trigger 부수효과 0건** ✅.

---

# § 5. 종합 판정

| 영역 | 결과 |
|---|---|
| RUN 1 메인 트랜잭션 | RLS DISABLE COMMIT ✅ |
| RUN 2 사후 검증 | branches/teams=false / IEB=true / 정책 5건 보존 / 사용자 무영향 ✅ |
| 사고 신호 | 0건 |
| FK 위반 23503 | **해소** ✅ |
| 라이브 가입 작동 | 회복 (다음 가입 시도 시 PASS 기대) |

## 5-1. 영구 학습 1건 (의뢰서 작성 표준)

> **RLS 변경 + INSERT 시뮬레이션을 같은 BEGIN~COMMIT에 박지 말 것.**
> 시뮬레이션 실패(RAISE) 시 트랜잭션 롤백 → RLS 변경도 함께 롤백.
> 표준: RLS 변경은 별도 BEGIN~COMMIT으로 COMMIT 후, 시뮬레이션은 그 다음 RUN.

→ 메모리 [`supabase_sql_editor_session_isolation.md`] 후속 보강 후보 (시간 효율 고려 별 트랙).

---

# § 6. 다음 단계

1. Phase 1.5 작업지시서 § 3 결재 7건 입력 (DH1~DH7)
2. 결재 후 Step P1.5-B (home_v2 가입 폼 통합) 진입
3. 5/15 4팀 오픈 = home_v2 메인 진입로 가동

진실 원천:
- Phase 1.5 작업지시서 (`docs/specs/v2_phase15_home_signup_workorder.md`)
- 메모리 [`phase_1_5_index_home_absorption.md`] (Phase 1.5 즉시 흡수 결정)
- `docs/sessions/_INDEX.md` 메인 트랙 (5/9 저녁 갱신)
