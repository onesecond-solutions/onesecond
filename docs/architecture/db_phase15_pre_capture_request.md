# Phase 1.5 — Step P1.5-A 사전 회귀 의뢰서 (Chrome 복붙용)

> **작성일:** 2026-05-09 저녁 (Phase 1.5 본진 진입 직전)
> **단계:** Phase 1.5 / Step P1.5-A 사전 분석 + 라이브 raw 캡처 (~30분)
> **선행:** 5/9 오후·저녁 종료 (Step 5-A/5-B/5-C + branches/teams RLS 비활성화) — `docs/sessions/2026-05-09_1757.md` 참조
> **실행자:** Claude in Chrome (Supabase Dashboard SQL Editor)
> **소요:** SELECT 4건, ~3분 이내
> **신버전 진입:** URL `https://supabase.com/dashboard/project/pdnwgzneooyygfejrvbg/sql/new` (프로젝트명 `onesecond-v1-restore-0420` ✅ 팀장님 확인 완료)
> **트랜잭션:** SELECT만이라 BEGIN/COMMIT **불필요** (학습 1 정합 — RLS 변경/INSERT 시뮬레이션 분리 원칙은 본 RUN에 무관)

---

# § 1. 의뢰 본문 (Chrome 절차)

1. **신버전 진입 확인** — URL 좌측 상단 프로젝트 표시가 `onesecond-v1-restore-0420` 또는 URL 경로에 `pdnwgzneooyygfejrvbg`가 박혀 있는지 시각 확인.
2. SQL Editor 신규 쿼리 → 아래 § 2 RUN 1 SQL **전체 복붙** → RUN.
3. 결과 4블록(① RLS 표 / ② 도메인 카운트+리스트 / ③ fingerprint 6컬럼 / ④ users 분포)을 § 3 형식으로 raw 회신.

---

# § 2. RUN 1 — 사전 회귀 4항 (SELECT 묶음)

```sql
-- ============================================================
-- P1.5-A 사전 회귀 — 4항 동시 검증
-- 신버전 onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
-- 2026-05-09 종료 후 Phase 1.5 본진 진입 직전 회귀
-- BEGIN/COMMIT 불필요 (SELECT only)
-- ============================================================

-- ---------- ① branches/teams RLS 비활성화 회귀 ----------
SELECT
  c.relname              AS table_name,
  c.relrowsecurity       AS rls_enabled,
  c.relforcerowsecurity  AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('branches','teams','insurers','users')
ORDER BY c.relname;

-- ---------- ② 28사 도메인 활성 회귀 ----------
SELECT COUNT(*) AS domain_filled
FROM public.insurers
WHERE domain IS NOT NULL;

SELECT slug, name, domain
FROM public.insurers
ORDER BY (domain IS NULL), name;

-- ---------- ③ handle_new_user fingerprint 6건 회귀 ----------
WITH src AS (
  SELECT pg_get_functiondef(p.oid) AS body
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.proname = 'handle_new_user'
    AND n.nspname = 'public'
)
SELECT
  body LIKE '%ga_member%'              AS has_ga_member,
  body LIKE '%insurer_branch_manager%' AS has_insurer_bm,
  body LIKE '%insurer_id%'             AS has_insurer_id_col,
  body LIKE '%branch_id%'              AS has_branch_id_col,
  body LIKE '%team_id%'                AS has_team_id_col,
  body LIKE '%status%'                 AS has_status_col
FROM src;

-- ---------- ④ 사용자 분포 무영향 회귀 ----------
SELECT role, status, COUNT(*) AS cnt
FROM public.users
GROUP BY role, status
ORDER BY cnt DESC, role;
```

---

# § 3. 회신 형식 (Chrome → Code)

## 3-1. ① branches/teams RLS 결과 raw

```
| table_name | rls_enabled | rls_forced |
|------------|-------------|------------|
| branches   |             |            |
| insurers   |             |            |
| teams      |             |            |
| users      |             |            |
```

**기대값:** branches = false / teams = false / insurers = true / users = true

## 3-2. ② 28사 도메인 결과 raw

- `domain_filled` 카운트: ____
- 31사 리스트(slug, name, domain) raw 31행 — domain NULL 3행이 마지막에 위치 (db-life / im-life / kb-life)

**기대값:** domain_filled ≥ 28

## 3-3. ③ handle_new_user fingerprint raw

```
| has_ga_member | has_insurer_bm | has_insurer_id_col | has_branch_id_col | has_team_id_col | has_status_col |
|---------------|----------------|--------------------|-------------------|-----------------|-----------------|
|               |                |                    |                   |                 |                 |
```

**기대값:** 6컬럼 모두 true (5/9 오후 Step 5-C trigger 정정 본문 회귀)

## 3-4. ④ 사용자 분포 raw

```
| role          | status  | cnt |
|---------------|---------|-----|
|               |         |     |
```

**기대값:** admin/active = 1, ga_member/active = 2 (5/9 저녁 마감 분포)

## 3-5. 종합 판정

- [ ] 4항 모두 기대값 정합 → **P1.5-B 본진 진입 OK**
- [ ] 1항 이상 불일치 → **즉시 정지 + Code 분석 회귀**

---

# § 4. 사고 신호 발생 시 즉시 정지

다음 신호가 보이면 RUN 중단하고 Code에 raw 회신:
- 신버전 표시가 `onesecond-v1-restore-0420`이 아니다 (구버전 진입 의심)
- branches.rls_enabled = true (5/9 저녁 처방 ROLLBACK 의심)
- domain_filled < 28 (28사 UPDATE 누락 의심)
- fingerprint 6컬럼 중 하나라도 false (5/1 PASS 본문으로 회귀했을 가능성)
- users 분포가 admin=1, ga_member=2가 아니다 (라이브 사용자 영향 의심)

→ Code가 진단 후 후속 RUN 발행. 본 RUN 결과 raw가 진실 원천.

---

# § 5. 결재 박스

| 항목 | 결과 (Chrome 회신 후 Code 갱신) |
|---|---|
| § 2 RUN 1 실행 | ⏸ |
| § 3-1 RLS 회귀 | ⏸ |
| § 3-2 도메인 회귀 | ⏸ |
| § 3-3 fingerprint 회귀 | ⏸ |
| § 3-4 사용자 분포 회귀 | ⏸ |
| § 3-5 종합 판정 | ⏸ |

---

**진실 원천:**
- `docs/sessions/2026-05-09_1757.md` (5/9 저녁 마감 인계 노트)
- `docs/specs/v2_phase15_home_signup_workorder.md` § 4-A + § 5-1 (P1.5-A 사양)
- `docs/architecture/db_step5_handle_new_user_capture.md` § 3-4 (fingerprint 6건 정의 원천)
- `docs/architecture/db_phase15_branches_rls_fix.md` (RLS 처방 캡처 + 학습 1)
- `docs/architecture/db_step5_b_capture.md` (28사 도메인 UPDATE 원천)
