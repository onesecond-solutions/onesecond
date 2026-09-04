-- 🟡 권한 — 보험이슈 검색 RPC는 로그인 사용자에게만 허용한다.
BEGIN;

REVOKE ALL ON FUNCTION public.search_briefing_leaflets(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_briefing_leaflets(text, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.search_briefing_leaflets(text, integer) TO authenticated;

COMMIT;

-- DOWN: REVOKE ALL ON FUNCTION public.search_briefing_leaflets(text, integer) FROM authenticated;
