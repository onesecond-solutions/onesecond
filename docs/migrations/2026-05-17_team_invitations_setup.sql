-- ============================================================================
-- 팀원 초대 본진 — team_invitations 테이블 + RLS
-- 작성: 2026-05-17 (5/18 D-Day 시연 본진)
-- ============================================================================
--
-- 🚨 실행 전 신버전 확인:
--   - Dashboard 좌상단 = `onesecond-v1-restore-0420`
--   - URL ID = `pdnwgzneooyygfejrvbg`
--
-- 📌 본 SQL 본진:
--   - team_invitations 테이블 신설
--   - 이메일·role·team/branch·token·만료·status 박힘
--   - RLS: 본인 팀·지점 박힌 자리만 박힘
--   - 가입 흐름 (signup?invite={token}) = 5/19 D+1 본진
--
-- ============================================================================

BEGIN;

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [1] team_invitations 테이블                                            │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS public.team_invitations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id      uuid NOT NULL REFERENCES public.users(id),
  email           text NOT NULL,
  invited_role    text NOT NULL CHECK (invited_role IN (
    'ga_branch_manager', 'ga_manager', 'ga_member', 'ga_staff',
    'insurer_manager', 'insurer_member', 'insurer_staff'
  )),
  team_id         uuid REFERENCES public.teams(id),
  branch_id       uuid REFERENCES public.branches(id),
  invite_token    text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at     timestamptz,
  accepted_user_id uuid REFERENCES public.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.team_invitations IS
  '팀원 초대 본진 — 이메일·role·team/branch·token·만료 7일 박힘. 시연 본진 = 링크 생성+클립보드만 박음.';

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [2] 인덱스                                                             │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE INDEX IF NOT EXISTS idx_team_invitations_token
  ON public.team_invitations (invite_token)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_team_invitations_email_pending
  ON public.team_invitations (email, status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_team_invitations_inviter
  ON public.team_invitations (inviter_id, created_at DESC);

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [3] RLS                                                                │
-- └─────────────────────────────────────────────────────────────────────┘

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- SELECT: admin + 본인 박은 초대 + 본인 팀·지점 박힌 초대 (지점장/실장)
CREATE POLICY team_invitations_select ON public.team_invitations
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR inviter_id = auth.uid()
    OR (team_id IS NOT NULL AND team_id = my_team_id())
    OR (branch_id IS NOT NULL AND branch_id = my_branch_id())
  );

-- INSERT: admin + ga_branch_manager + ga_manager
CREATE POLICY team_invitations_insert ON public.team_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    inviter_id = auth.uid()
    AND (
      is_admin()
      OR EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
          AND u.role IN ('ga_branch_manager', 'ga_manager')
      )
    )
  );

-- UPDATE: 본인 초대 박은 자리만 (취소/재발송)
CREATE POLICY team_invitations_update ON public.team_invitations
  FOR UPDATE TO authenticated
  USING (is_admin() OR inviter_id = auth.uid())
  WITH CHECK (is_admin() OR inviter_id = auth.uid());

-- DELETE: 본인 초대만
CREATE POLICY team_invitations_delete ON public.team_invitations
  FOR DELETE TO authenticated
  USING (is_admin() OR inviter_id = auth.uid());

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [4] 검증                                                               │
-- └─────────────────────────────────────────────────────────────────────┘

SELECT COUNT(*) AS total FROM public.team_invitations;
SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'team_invitations'
ORDER BY cmd;

COMMIT;
