-- ============================================================================
-- 매니저방 — 구성원 내보내기(조직 분리) RPC: remove_member
-- 작성: 2026-06-16
-- ============================================================================
--
-- 🚨 실행 전 신버전 확인:
--   - Dashboard 좌상단 = `onesecond-v1-restore-0420`
--   - URL ID = `pdnwgzneooyygfejrvbg`
--
-- 📌 본질 (초대의 반대 = 조직에서 분리, 계정은 유지):
--   - 대상의 회사(company_id)·지점(branch_id)·팀(team_id)을 NULL로,
--     직책(role)은 일반 구성원(ga_member)으로 강등. status는 active 유지(미배정).
--   - 계정(auth)·게시물 등은 건드리지 않음 → 본인이 추후 탈퇴/유지 선택(2단계).
--   - 안내 공지 발송은 3단계.
--
-- 📌 권한 (SECURITY DEFINER + 내장 체크 / 자기보다 윗사람·동급·본인 불가):
--   - admin            : 누구나(어드민 제외)
--   - ga_branch_manager: 같은 지점(branch_id) + 자신보다 아래 직책만
--   - ga_manager       : 같은 팀(team_id) + 자신보다 아래 직책만
--   - 그 외            : 권한 없음
--
--   ※ CREATE OR REPLACE — 멱등.
--
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.remove_member(p_target uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  me public.users%ROWTYPE;
  tg public.users%ROWTYPE;
  me_rank int;
  tg_rank int;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated'); END IF;

  SELECT * INTO me FROM public.users WHERE id = v_uid;
  SELECT * INTO tg FROM public.users WHERE id = p_target;
  IF tg.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'target_not_found'); END IF;
  IF tg.id = v_uid THEN RETURN jsonb_build_object('ok', false, 'reason', 'cannot_remove_self'); END IF;

  me_rank := CASE me.role WHEN 'admin' THEN 3 WHEN 'ga_branch_manager' THEN 2 WHEN 'ga_manager' THEN 1 ELSE 0 END;
  tg_rank := CASE tg.role WHEN 'admin' THEN 3 WHEN 'ga_branch_manager' THEN 2 WHEN 'ga_manager' THEN 1 ELSE 0 END;

  IF me.role = 'admin' THEN
    IF tg_rank >= 3 THEN RETURN jsonb_build_object('ok', false, 'reason', 'cannot_remove_admin'); END IF;
  ELSIF me.role = 'ga_branch_manager' THEN
    IF tg.branch_id IS DISTINCT FROM me.branch_id OR me.branch_id IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'out_of_scope');
    END IF;
    IF tg_rank >= me_rank THEN RETURN jsonb_build_object('ok', false, 'reason', 'rank_not_allowed'); END IF;
  ELSIF me.role = 'ga_manager' THEN
    IF tg.team_id IS DISTINCT FROM me.team_id OR me.team_id IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'out_of_scope');
    END IF;
    IF tg_rank >= me_rank THEN RETURN jsonb_build_object('ok', false, 'reason', 'rank_not_allowed'); END IF;
  ELSE
    RETURN jsonb_build_object('ok', false, 'reason', 'no_permission');
  END IF;

  UPDATE public.users
     SET company_id = NULL,
         branch_id  = NULL,
         team_id    = NULL,
         role       = 'ga_member'   -- 직책 강등(조직 직책 무효), status는 active 유지
   WHERE id = p_target;

  RETURN jsonb_build_object('ok', true, 'target', p_target, 'name', tg.name);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.remove_member(uuid) TO authenticated;

COMMIT;

-- ┌───────────────────────────────────────────────────────────────────────┐
-- │ 검증 (COMMIT 후)                                                         │
-- └───────────────────────────────────────────────────────────────────────┘
-- SELECT proname FROM pg_proc WHERE proname = 'remove_member';
