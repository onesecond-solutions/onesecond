-- ============================================================================
-- D-2 RLS 진단 — posts 테이블 navigation/qna 가시성 격차 점검
-- 작성: 2026-05-16 D-2
-- 본진: 팀장님 인지 — "네비게이션방·스마트게시판 관리자한테만 보임"
-- 가설: 시드 자료 author=admin/한재성 박혀 RLS 박은 자리 일반 사용자 SELECT 박지 X
-- ============================================================================
--
-- 🚨 실행 전 신버전 확인:
--   - Dashboard 좌상단 = `onesecond-v1-restore-0420`
--   - URL ID = `pdnwgzneooyygfejrvbg`
--
-- ============================================================================

-- ┌─────────────────────────────────────────────────────────┐
-- │ [1] posts 테이블 RLS 정책 전수 (현재 박혀 있는 자리)            │
-- └─────────────────────────────────────────────────────────┘
SELECT
  policyname,
  cmd,
  permissive,
  roles::text,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'posts'
ORDER BY cmd, policyname;

-- ┌─────────────────────────────────────────────────────────┐
-- │ [2] RLS 활성화 여부 확인                                       │
-- └─────────────────────────────────────────────────────────┘
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'posts';

-- ┌─────────────────────────────────────────────────────────┐
-- │ [3] ga_member 시뮬레이션 SELECT — navigation 박힌 자리        │
-- │    (Service Role 박힌 자리 박는 SQL이라 RLS 무시 박힘.            │
-- │     실제 ga_member 박은 자리 카운트 = 별도 anon/authenticated 박음) │
-- └─────────────────────────────────────────────────────────┘
SELECT
  board_type,
  audience_target,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE source_type = 'seed') AS seed_count,
  COUNT(DISTINCT author_id) AS author_count
FROM public.posts
WHERE board_type IN ('navigation', 'qna', 'manager_notice')
GROUP BY board_type, audience_target
ORDER BY board_type, 3 DESC;

-- ┌─────────────────────────────────────────────────────────┐
-- │ [4] ga_member 박힌 자리 사용자 1명 SELECT 시뮬레이션 (SET ROLE) │
-- └─────────────────────────────────────────────────────────┘
DO $$
DECLARE
  v_ga_member_id uuid;
  v_count_nav    int;
  v_count_qna    int;
  v_count_mgr    int;
BEGIN
  -- ga_member 1명 박힌 자리 ID 가져옴
  SELECT id INTO v_ga_member_id
  FROM public.users
  WHERE role = 'ga_member'
  LIMIT 1;

  IF v_ga_member_id IS NULL THEN
    RAISE NOTICE 'ga_member 박지 X 박혀 있어 시뮬레이션 박지 X';
    RETURN;
  END IF;

  -- JWT claim 시뮬레이션
  PERFORM set_config('request.jwt.claims',
    json_build_object(
      'sub', v_ga_member_id::text,
      'role', 'authenticated',
      'user_metadata', json_build_object('role', 'ga_member')
    )::text, true);

  -- RLS 적용 SELECT 시도
  SELECT COUNT(*) INTO v_count_nav  FROM public.posts WHERE board_type = 'navigation';
  SELECT COUNT(*) INTO v_count_qna  FROM public.posts WHERE board_type = 'qna';
  SELECT COUNT(*) INTO v_count_mgr  FROM public.posts WHERE board_type = 'manager_notice';

  RAISE NOTICE 'ga_member 시뮬레이션 SELECT 결과:';
  RAISE NOTICE '  navigation     : % rows', v_count_nav;
  RAISE NOTICE '  qna            : % rows', v_count_qna;
  RAISE NOTICE '  manager_notice : % rows', v_count_mgr;
END $$;

-- ┌─────────────────────────────────────────────────────────┐
-- │ [5] anon (비로그인) 박은 자리 SELECT 시뮬레이션                  │
-- └─────────────────────────────────────────────────────────┘
DO $$
DECLARE
  v_count_nav int;
  v_count_qna int;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);

  SELECT COUNT(*) INTO v_count_nav FROM public.posts WHERE board_type = 'navigation';
  SELECT COUNT(*) INTO v_count_qna FROM public.posts WHERE board_type = 'qna';

  RAISE NOTICE 'anon 시뮬레이션 SELECT:';
  RAISE NOTICE '  navigation : % rows', v_count_nav;
  RAISE NOTICE '  qna        : % rows', v_count_qna;
END $$;

-- ============================================================================
-- 결과 해석:
-- - [3] Service Role(SQL Editor 본인) = 263 + 462 등 본진 정합
-- - [4] ga_member 시뮬레이션 < [3] 박힌 자리 → RLS 격차 (시드 author 박은 자리 박지 X)
-- - [5] anon = 0 정합 (비로그인 박은 자리)
--
-- 격차 발견 시 정정 SQL = 별도 마이그레이션:
--   - navigation/qna board_type 박은 자리 = 가입한 사용자 모두 SELECT 박을 자리
--   - audience_target 박은 자리 = team_internal 박힌 자리도 동일 팀 박힌 사용자 SELECT
-- ============================================================================
