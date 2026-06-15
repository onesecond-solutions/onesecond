-- ============================================================================
-- 거미줄 조직 — 초대 링크 가입 합류 RPC (get_invite / accept_invite)
-- 작성: 2026-06-15
-- ============================================================================
--
-- 🚨 실행 전 신버전 확인:
--   - Dashboard 좌상단 = `onesecond-v1-restore-0420`
--   - URL ID = `pdnwgzneooyygfejrvbg`
--
-- 📌 본질 (거미줄 3단계 = 초대 링크로 가입 → 그 자리에 자동 합류):
--   - get_invite(token)    : 초대 링크 열었을 때 회사·지점·역할 조회 (가입 폼 프리필용, anon)
--   - accept_invite(token) : 가입 완료 후 호출 — 같은 회사면 새 실 생성 + 회사·지점·실·역할
--                            연결 / 다른 회사면 역할만(회사는 본인이 가입 시 선택). 초대 accepted 처리.
--
--   ※ 둘 다 SECURITY DEFINER (토큰 아는 사람만 / accept는 본인 user만 갱신).
--   ※ CREATE OR REPLACE — 멱등.
--
-- ============================================================================

BEGIN;

-- [1] 초대 조회 (프리필용) — 토큰 아는 사람만, 회사·지점·역할 노출
CREATE OR REPLACE FUNCTION public.get_invite(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inv public.team_invitations%ROWTYPE;
  v_company text;
  v_branch  text;
BEGIN
  SELECT * INTO inv FROM public.team_invitations
   WHERE invite_token = p_token AND status = 'pending' AND expires_at > now();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false);
  END IF;
  SELECT name INTO v_company FROM public.companies WHERE id = inv.company_id;
  SELECT name INTO v_branch  FROM public.branches  WHERE id = inv.branch_id;
  RETURN jsonb_build_object(
    'ok',            true,
    'same_company',  (inv.company_id IS NOT NULL),
    'company_id',    inv.company_id,
    'company_name',  v_company,
    'branch_id',     inv.branch_id,
    'branch_name',   v_branch,
    'new_team_name', inv.new_team_name,
    'invited_role',  inv.invited_role,
    'invited_name',  inv.invited_name
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_invite(text) TO anon, authenticated;

-- [2] 가입 후 합류 처리 — 본인(auth.uid()) user를 초대대로 연결 + 새 실 생성 + accepted
CREATE OR REPLACE FUNCTION public.accept_invite(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inv public.team_invitations%ROWTYPE;
  v_uid uuid := auth.uid();
  v_team_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  SELECT * INTO inv FROM public.team_invitations
   WHERE invite_token = p_token AND status = 'pending' AND expires_at > now();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_or_expired');
  END IF;

  IF inv.company_id IS NOT NULL THEN
    -- 같은 회사: 회사·지점·실·역할 연결. 새 실(new_team_name)이면 teams 생성.
    v_team_id := inv.team_id;
    IF v_team_id IS NULL AND COALESCE(inv.new_team_name, '') <> '' AND inv.branch_id IS NOT NULL THEN
      INSERT INTO public.teams (name, branch_id, is_active)
      VALUES (inv.new_team_name, inv.branch_id, true)
      RETURNING id INTO v_team_id;
    END IF;
    UPDATE public.users
       SET company_id = inv.company_id,
           branch_id  = COALESCE(inv.branch_id, branch_id),
           team_id    = COALESCE(v_team_id, team_id),
           role       = inv.invited_role
     WHERE id = v_uid;
  ELSE
    -- 다른 회사: 회사는 본인이 가입 시 선택해 이미 저장됨. 역할만 초대대로.
    UPDATE public.users SET role = inv.invited_role WHERE id = v_uid;
  END IF;

  UPDATE public.team_invitations
     SET status = 'accepted', accepted_user_id = v_uid, accepted_at = now(), updated_at = now()
   WHERE id = inv.id;

  RETURN jsonb_build_object(
    'ok', true, 'same_company', (inv.company_id IS NOT NULL),
    'company_id', inv.company_id, 'branch_id', inv.branch_id,
    'team_id', v_team_id, 'role', inv.invited_role
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.accept_invite(text) TO authenticated;

COMMIT;

-- ┌───────────────────────────────────────────────────────────────────────┐
-- │ 검증 (COMMIT 후) — 함수 2개 생성 확인                                     │
-- └───────────────────────────────────────────────────────────────────────┘
-- SELECT proname FROM pg_proc WHERE proname IN ('get_invite','accept_invite');
