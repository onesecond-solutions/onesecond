-- ============================================================================
-- 매니저방 내보내기 2·3단계 — 본인 안내(탈퇴/유지) + 발송 기록
-- 작성: 2026-06-16
-- ============================================================================
--
-- 🚨 실행 전 신버전 확인:
--   - Dashboard 좌상단 = `onesecond-v1-restore-0420`
--   - URL ID = `pdnwgzneooyygfejrvbg`
--
-- 📌 본질:
--   - [1] users에 내보냄 기록 컬럼: removed_at(시각)·removed_by(내보낸 사람)·
--         removal_ack(본인 응답 여부) 추가.
--   - [2] remove_member 보강: 내보낼 때 위 3개 기록(removal_ack=false=미응답).
--   - [3] 본인 응답 RPC 2개:
--         keep_after_removal()     = 계정 유지(removal_ack=true, 미배정 상태로 사용)
--         withdraw_after_removal() = 탈퇴(removal_ack=true + status='suspended')
--
--   ※ removed_at/removed_by는 응답 후에도 남겨 어드민이 "내보냄 기록" 확인(3단계 보내는쪽).
--   ※ 안내 모달은 removed_at IS NOT NULL AND removal_ack=false 일 때만 표시.
--   ※ 전부 멱등(IF NOT EXISTS / CREATE OR REPLACE).
--
-- ============================================================================

BEGIN;

-- [1] 기록 컬럼
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS removed_at  timestamptz;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS removed_by  uuid;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS removal_ack boolean NOT NULL DEFAULT false;

-- [2] remove_member 보강 — 내보내기 + 기록(removal_ack=false=본인 미응답)
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
     SET company_id  = NULL,
         branch_id   = NULL,
         team_id     = NULL,
         role        = 'ga_member',   -- 직책 강등, status는 active 유지(본인이 로그인해 응답할 수 있게)
         removed_at  = now(),
         removed_by  = v_uid,
         removal_ack = false          -- 본인 미응답
   WHERE id = p_target;

  RETURN jsonb_build_object('ok', true, 'target', p_target, 'name', tg.name);
END;
$function$;
GRANT EXECUTE ON FUNCTION public.remove_member(uuid) TO authenticated;

-- [3-a] 본인 = 계정 유지 (미배정 상태로 계속 사용)
CREATE OR REPLACE FUNCTION public.keep_after_removal()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.users SET removal_ack = true
   WHERE id = auth.uid() AND removed_at IS NOT NULL
  RETURNING jsonb_build_object('ok', true, 'action', 'keep');
$function$;
GRANT EXECUTE ON FUNCTION public.keep_after_removal() TO authenticated;

-- [3-b] 본인 = 탈퇴 (계정 정지)
CREATE OR REPLACE FUNCTION public.withdraw_after_removal()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.users SET removal_ack = true, status = 'suspended'
   WHERE id = auth.uid() AND removed_at IS NOT NULL
  RETURNING jsonb_build_object('ok', true, 'action', 'withdraw');
$function$;
GRANT EXECUTE ON FUNCTION public.withdraw_after_removal() TO authenticated;

COMMIT;

-- ┌───────────────────────────────────────────────────────────────────────┐
-- │ 검증 (COMMIT 후)                                                         │
-- └───────────────────────────────────────────────────────────────────────┘
-- SELECT proname FROM pg_proc WHERE proname IN ('remove_member','keep_after_removal','withdraw_after_removal');
-- SELECT column_name FROM information_schema.columns
--  WHERE table_schema='public' AND table_name='users' AND column_name IN ('removed_at','removed_by','removal_ack');
