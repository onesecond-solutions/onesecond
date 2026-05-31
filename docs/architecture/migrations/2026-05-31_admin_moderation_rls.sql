-- ════════════════════════════════════════════════════════════════════════
-- 2026-05-31 어드민 긴급 모더레이션 RLS (P1) — admin 게시글 숨김/삭제 + 댓글 삭제
-- ──────────────────────────────────────────────────────────────────────────
-- 목적: admin이 전 영역 게시글을 숨김(is_hidden)·삭제, 댓글을 삭제할 수 있게 RLS 보강.
--       (사용자 사고 시 모바일에서도 긴급 수습 — 운영센터 모더레이션 버튼이 호출)
-- 전제: public.is_admin() SECURITY DEFINER 함수 존재 (team_notices RLS에서 사용 중).
--       posts.is_hidden 컬럼 존재 (db_schema.md / admin_v2.js handleHidePost).
-- 안전: 기존 정책에 OR로 더해지는 permissive 정책 — 다른 role 권한에 영향 0.
--       SELECT 정책은 건드리지 않음(읽기 영향 0).
--
-- ⚠️ 실행 전 확인:
--   1) Supabase Dashboard = onesecond-v1-restore-0420 (URL = pdnwgzneooyygfejrvbg) 인가?
--   2) 아래 SQL을 한 RUN(BEGIN~COMMIT)으로 실행, 검증 쿼리는 별도 RUN.
--   3) 이 정책은 운영센터 숨기기/삭제 버튼이 403 날 때만 필요 — 이미 admin 허용이면 불필요.
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 게시글: admin 숨김(UPDATE is_hidden) ──
DROP POLICY IF EXISTS posts_admin_update ON public.posts;
CREATE POLICY posts_admin_update ON public.posts
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 게시글: admin 삭제(DELETE) ──
DROP POLICY IF EXISTS posts_admin_delete ON public.posts;
CREATE POLICY posts_admin_delete ON public.posts
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- ── 댓글: admin 삭제(DELETE) ──
DROP POLICY IF EXISTS comments_admin_delete ON public.comments;
CREATE POLICY comments_admin_delete ON public.comments
  FOR DELETE TO authenticated
  USING (public.is_admin());

COMMIT;

-- ── 검증 (별도 RUN) ──
-- SELECT policyname, cmd FROM pg_policies
--  WHERE schemaname='public' AND tablename IN ('posts','comments')
--  ORDER BY tablename, cmd;
-- 기대: posts_admin_update(UPDATE), posts_admin_delete(DELETE), comments_admin_delete(DELETE) 존재.
