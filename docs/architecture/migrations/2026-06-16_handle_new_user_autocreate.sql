-- ============================================================================
-- 거미줄 조직 PR-2 — 직접 가입 시 신규 지점/팀 자동 생성·연결
-- 작성: 2026-06-16
-- ============================================================================
--
-- 🚨 실행 전 신버전 확인:
--   - Dashboard 좌상단 = `onesecond-v1-restore-0420`
--   - URL ID = `pdnwgzneooyygfejrvbg`
--
-- 📌 본질 (왜 필요한가):
--   - 초대 링크 경유 가입(accept_invite RPC)은 신규 팀을 생성·연결한다(6/15 구축).
--   - 그러나 "초대 없이 직접 가입"은 handle_new_user 트리거를 타는데, 이 트리거는
--     기존에 고른(자동완성 픽) branch_id/team_id만 복사할 뿐, 자유 입력한
--     new_branch_name / new_team_name 은 아예 읽지 않았다.
--   - 결과: 새 지점/팀을 타이핑해 직접 가입하면 branch_id/team_id 가 NULL → 미배정,
--     팀도 조직트리에 생성되지 않음. (민인환 사례, 2026-06-16 진단)
--
-- 📌 본 PR-2가 하는 일 (가입을 막지 않음 — 오히려 자동으로 되게 함):
--   - 가입 메타에 new_branch_name 이 오고 기존 branch_id 가 없으면
--       → 같은 회사(company_id)에 동명 지점 있으면 재사용, 없으면 branches 생성
--   - 가입 메타에 new_team_name 이 오고 기존 team_id 가 없으면(+ 지점 확보 시)
--       → 같은 지점에 동명 팀 있으면 재사용, 없으면 teams 생성
--   - 확보한 branch_id / team_id / company_id 로 users 행을 연결
--   - 회사 미지정인데 지점이 확보되면 지점의 회사로 company_id 보정
--   - 기존 동작(픽한 id 복사 + company_id)·역할 가드·status 가드 전부 보존
--
--   ※ CREATE OR REPLACE — 멱등. 가입은 즉시 active(기존 정책 유지, 사칭 검증은 백로그).
--
-- ⚠️ 정책 메모 (사칭 — 결재상 "막지 않음" 채택, 2026-06-16):
--   - "이미 존재하는 지점"에 동명으로 합류(= 그 지점 소속이라 주장)도 자동 연결됨.
--     동명 재사용은 중복 지점 난립을 막는 위생 이점이 있으나, 소속 사칭 가능성은 남는다.
--   - 사칭 방지(기존 지점 합류 시 어드민 승인 게이트)는 별도 백로그 트랙으로 분리.
--     (6/12 결정 "사람은 즉시 active, 사칭 방지는 백로그" 정합)
--
-- ============================================================================

-- ┌───────────────────────────────────────────────────────────────────────┐
-- │ [0] 실행 전 백업 — 현재 함수 정의를 저장해 두세요 (별도 RUN, 결과 보관)  │
-- └───────────────────────────────────────────────────────────────────────┘
-- SELECT pg_get_functiondef('public.handle_new_user'::regproc);

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_role   text := meta->>'role';
  v_status text := COALESCE(NULLIF(meta->>'status', ''), 'active');
  v_company_id uuid := NULLIF(meta->>'company_id', '')::uuid;
  v_branch_id  uuid := NULLIF(meta->>'branch_id', '')::uuid;
  v_team_id    uuid := NULLIF(meta->>'team_id', '')::uuid;
  v_new_branch text := NULLIF(meta->>'new_branch_name', '');
  v_new_team   text := NULLIF(meta->>'new_team_name', '');
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

  -- [지점] 기존 픽 없고 신규명 있으면 — 같은 회사 동명 재사용, 없으면 생성
  IF v_branch_id IS NULL AND v_new_branch IS NOT NULL THEN
    SELECT id INTO v_branch_id
      FROM public.branches
     WHERE name = v_new_branch
       AND company_id IS NOT DISTINCT FROM v_company_id
     LIMIT 1;
    IF v_branch_id IS NULL THEN
      INSERT INTO public.branches (name, company_id, is_active)
      VALUES (v_new_branch, v_company_id, true)
      RETURNING id INTO v_branch_id;
    END IF;
  END IF;

  -- [회사] 미지정인데 지점이 확보됐으면 지점의 회사로 보정
  IF v_company_id IS NULL AND v_branch_id IS NOT NULL THEN
    SELECT company_id INTO v_company_id FROM public.branches WHERE id = v_branch_id;
  END IF;

  -- [팀] 기존 픽 없고 신규명 있고 지점 확보됐으면 — 같은 지점 동명 재사용, 없으면 생성
  IF v_team_id IS NULL AND v_new_team IS NOT NULL AND v_branch_id IS NOT NULL THEN
    SELECT id INTO v_team_id
      FROM public.teams
     WHERE name = v_new_team AND branch_id = v_branch_id
     LIMIT 1;
    IF v_team_id IS NULL THEN
      INSERT INTO public.teams (name, branch_id, is_active)
      VALUES (v_new_team, v_branch_id, true)
      RETURNING id INTO v_team_id;
    END IF;
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
    v_branch_id,   -- 신규 생성/재사용분 반영
    v_team_id,     -- 신규 생성/재사용분 반영
    v_company_id,  -- 지점 통한 보정 반영
    v_status,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

COMMIT;

-- ┌───────────────────────────────────────────────────────────────────────┐
-- │ 검증 (COMMIT 후 별도 RUN)                                                │
-- └───────────────────────────────────────────────────────────────────────┘
-- 1) 함수 교체 확인
-- SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';
--
-- 2) 라이브 검증 — 테스트 계정으로 "초대 없이 직접 가입 + 새 지점/팀명" 1건 만든 뒤:
--    (가입 폼에서 자동완성 픽하지 말고 새 이름을 직접 타이핑)
-- SELECT u.name, u.role, u.branch_id, u.team_id, u.company_id,
--        b.name AS branch_name, t.name AS team_name
--   FROM public.users u
--   LEFT JOIN public.branches b ON b.id = u.branch_id
--   LEFT JOIN public.teams    t ON t.id = u.team_id
--  WHERE u.created_at > now() - interval '10 minutes'
--  ORDER BY u.created_at DESC;
--   → branch_id·team_id 가 채워지고, 새 지점/팀이 branches/teams 에 생겼는지 확인.
