-- ════════════════════════════════════════════════════════════════════════
-- 2026-05-31 어드민 전 영역 쓰기 RLS (P2) — admin 보험사 자료실(posts insurer) 작성
-- ──────────────────────────────────────────────────────────────────────────
-- 목적: admin이 보험사 자료실(posts board_type='insurer')에 대리 작성 가능하게.
--       (admin이 자료 등록 폼에서 보험사를 선택 → 그 insurer_id로 INSERT)
-- 전제: public.is_admin() 함수 존재. posts INSERT 기존 정책 = 보험사 멤버십(admin 미포함).
-- 안전: 기존 INSERT 정책에 OR로 더해지는 admin 허용 정책 — 타 role 영향 0.
--
-- ⚠️ 실행 전: Dashboard = onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg) 확인.
--    자료실 자료 등록(admin)이 403일 때만 필요. 한 RUN(BEGIN~COMMIT) 실행.
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- 게시글 작성(INSERT) — admin (전 board_type 대리 작성)
DROP POLICY IF EXISTS posts_admin_insert ON public.posts;
CREATE POLICY posts_admin_insert ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

COMMIT;

-- 검증 (별도 RUN):
-- SELECT policyname, cmd FROM pg_policies
--  WHERE schemaname='public' AND tablename='posts' AND policyname='posts_admin_insert';
