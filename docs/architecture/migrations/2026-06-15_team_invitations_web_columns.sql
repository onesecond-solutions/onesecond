-- ============================================================================
-- 거미줄 조직 — team_invitations 보강 (회사 경계 + 링크 초대 + 새 지점/실)
-- 작성: 2026-06-15
-- ============================================================================
--
-- 🚨 실행 전 신버전 확인:
--   - Dashboard 좌상단 = `onesecond-v1-restore-0420`
--   - URL ID = `pdnwgzneooyygfejrvbg`
--
-- 📌 본 SQL 본질 (거미줄 조직 설계 1단계 = 초대장 그릇 보강):
--   - company_id   : 회사 경계선. 같은 회사 초대면 박힘 / 다른 회사(새 회사) 초대면 NULL
--                    → 다른 회사면 받는 사람이 가입 시 회사 자동완성으로 자기 회사 선택
--   - new_branch_name / new_team_name : 새 지점·새 실을 만들면서 보내는 초대 (없으면 NULL)
--   - invited_name / invited_phone    : 매니저방 초대 모달 입력(이름·전화)
--   - email DROP NOT NULL : 매니저방 초대는 이메일 없이 링크만 → 이메일 필수 해제
--
--   ※ 기존 컬럼(inviter_id, email, invited_role, team_id, branch_id, invite_token,
--     status, expires_at, accepted_at, accepted_user_id)은 그대로 유지.
--   ※ 전부 멱등(IF NOT EXISTS / DROP NOT NULL) — 여러 번 실행해도 안전.
--
-- ============================================================================

BEGIN;

-- [1] 회사 경계 + 거미줄 보강 컬럼 (멱등)
ALTER TABLE public.team_invitations
  ADD COLUMN IF NOT EXISTS company_id      uuid REFERENCES public.companies(id),
  ADD COLUMN IF NOT EXISTS new_branch_name text,
  ADD COLUMN IF NOT EXISTS new_team_name   text,
  ADD COLUMN IF NOT EXISTS invited_name    text,
  ADD COLUMN IF NOT EXISTS invited_phone   text;

-- [2] 링크 초대(이메일 없이) 허용 — email 필수 해제
ALTER TABLE public.team_invitations
  ALTER COLUMN email DROP NOT NULL;

-- [3] 회사별 초대 조회 인덱스 (대기 중 초대)
CREATE INDEX IF NOT EXISTS idx_team_invitations_company_pending
  ON public.team_invitations (company_id, status)
  WHERE status = 'pending';

COMMIT;

-- ┌───────────────────────────────────────────────────────────────────────┐
-- │ 검증 (위 COMMIT 후 별도 RUN 권장)                                        │
-- └───────────────────────────────────────────────────────────────────────┘
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='team_invitations'
-- ORDER BY ordinal_position;
