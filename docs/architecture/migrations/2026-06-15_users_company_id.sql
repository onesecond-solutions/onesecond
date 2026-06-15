-- ============================================================================
-- 거미줄 조직 — 회사 경계 토대: users.company_id (회원 명단 회사 번호 칸)
-- 작성: 2026-06-15
-- ============================================================================
--
-- 🚨 실행 전 신버전 확인:
--   - Dashboard 좌상단 = `onesecond-v1-restore-0420`
--   - URL ID = `pdnwgzneooyygfejrvbg`
--
-- 📌 본질:
--   - 회원 명단(public.users)에 회사 번호 칸(company_id)이 없어, 가입 시 고른
--     회사(자동완성 company_id)가 저장될 데 없이 버려지고 있었음.
--   - [1] users.company_id 칸 추가 (회사 경계선의 토대)
--   - [2] handle_new_user 트리거가 가입 메타의 company_id도 채우게 (기존 동작 보존,
--         company_id 한 줄만 추가)
--   - [3] 기존 회원 백필: 자기 지점(branch)에 달린 회사 번호로 채움 (지점 연결자 자동)
--
--   ※ 전부 멱등(IF NOT EXISTS / company_id IS NULL 조건) — 여러 번 실행해도 안전.
--
-- ============================================================================

BEGIN;

-- [1] 회원 명단에 회사 번호 칸 (회사 경계)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- [2] 가입 트리거 — company_id도 채우게 (기존 함수 + company_id 한 줄)
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_role text := meta->>'role';
  v_status text := COALESCE(NULLIF(meta->>'status', ''), 'active');
BEGIN
  -- 9역할 8종 IN 절 (admin 제외, 옵션 B 정합)
  IF v_role IS NULL OR v_role NOT IN (
    'ga_branch_manager', 'ga_manager', 'ga_member', 'ga_staff',
    'insurer_branch_manager', 'insurer_manager', 'insurer_member', 'insurer_staff'
  ) THEN
    v_role := 'ga_member';
  END IF;

  -- status valid 체크
  IF v_status NOT IN ('active', 'pending') THEN
    v_status := 'active';
  END IF;

  INSERT INTO public.users (
    id, email, name, phone, company, branch, role, team, plan,
    insurer_id, branch_id, team_id, company_id, status,
    created_at
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
    NULLIF(meta->>'insurer_id', '')::uuid,
    NULLIF(meta->>'branch_id', '')::uuid,
    NULLIF(meta->>'team_id', '')::uuid,
    NULLIF(meta->>'company_id', '')::uuid,   -- 추가: 회사 번호
    v_status,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- [3] 기존 회원 백필 — 자기 지점에 달린 회사 번호로 채움 (지점 연결자만, 멱등)
UPDATE public.users u
SET company_id = b.company_id
FROM public.branches b
WHERE u.branch_id = b.id
  AND u.company_id IS NULL
  AND b.company_id IS NOT NULL;

COMMIT;

-- ┌───────────────────────────────────────────────────────────────────────┐
-- │ 검증 (위 COMMIT 후 별도 RUN 권장)                                        │
-- └───────────────────────────────────────────────────────────────────────┘
-- SELECT role, COUNT(*) AS 총원, COUNT(company_id) AS 회사번호있음
-- FROM public.users WHERE role LIKE 'ga_%' GROUP BY role ORDER BY role;
