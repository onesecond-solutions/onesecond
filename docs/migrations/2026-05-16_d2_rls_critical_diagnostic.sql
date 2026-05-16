-- ============================================================================
-- 🚨 D-2 시급 — posts RLS 정책 진단 (qna/navigation/manager_notice 일반 사용자 차단 격차)
-- 작성: 2026-05-16 D-2
-- 본진: 팀장님 인지 — "4팀 ga_member 로그인 박은 자리 네비게이션방·스마트게시판 빈 화면"
-- 가설: 기존 RLS 정책 = admin only 또는 team_id 강제 박혀 ga_member SELECT 차단
-- ============================================================================
--
-- 🚨 실행 전 신버전 확인:
--   - Dashboard 좌상단 = `onesecond-v1-restore-0420`
--   - URL ID = `pdnwgzneooyygfejrvbg`
--
-- 📌 본 SQL 본진:
--   - READ-ONLY (DB 변경 0)
--   - SELECT만 박음 (pg_policies, pg_tables, public.users, public.posts)
--   - 트랜잭션 무관 (변경 박지 X)
--   - 결과 raw 보고 박은 후 정정 SQL 별도 박음
--
-- ============================================================================

-- ┌─────────────────────────────────────────────────────────┐
-- │ [0] 신버전 정합 확인                                          │
-- └─────────────────────────────────────────────────────────┘
SELECT current_database();

-- ┌─────────────────────────────────────────────────────────┐
-- │ [1] posts RLS 정책 raw 전수 — 가장 본진 (격차 정확 위치)         │
-- └─────────────────────────────────────────────────────────┘
SELECT
  policyname,
  cmd,
  permissive,
  roles::text AS apply_to_roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'posts'
ORDER BY cmd, policyname;

-- ┌─────────────────────────────────────────────────────────┐
-- │ [2] posts RLS 활성화 여부                                      │
-- └─────────────────────────────────────────────────────────┘
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled,
  forcerowsecurity AS rls_forced
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'posts';

-- ┌─────────────────────────────────────────────────────────┐
-- │ [3] 4팀 ga_member 본인 박은 자리 team_id 점검                  │
-- └─────────────────────────────────────────────────────────┘
SELECT
  u.id,
  u.email,
  u.role,
  u.team_id,
  t.name AS team_name,
  u.created_at
FROM public.users u
LEFT JOIN public.teams t ON t.id = u.team_id
WHERE u.role = 'ga_member'
ORDER BY u.email;

-- ┌─────────────────────────────────────────────────────────┐
-- │ [4] auth.users JWT team_id vs public.users team_id 정합        │
-- │     (5/14 카카오임 사고 패턴 동일 격차 점검)                       │
-- └─────────────────────────────────────────────────────────┘
SELECT
  au.email,
  au.raw_user_meta_data->>'team_id' AS jwt_team_id,
  pu.team_id::text                   AS db_team_id,
  pu.role,
  CASE
    WHEN au.raw_user_meta_data->>'team_id' IS NULL THEN '⚠️ JWT team_id 박지 X'
    WHEN au.raw_user_meta_data->>'team_id' = pu.team_id::text THEN '✅ 정합'
    ELSE '❌ JWT-DB 격차'
  END AS match_status
FROM auth.users au
JOIN public.users pu ON pu.email = au.email
WHERE pu.role = 'ga_member'
ORDER BY pu.email;

-- ┌─────────────────────────────────────────────────────────┐
-- │ [5] 시드 박힌 자리 board_type 분포 + team_id 분포               │
-- └─────────────────────────────────────────────────────────┘
SELECT
  board_type,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE source_type = 'seed') AS seed_count,
  COUNT(DISTINCT team_id) AS distinct_teams,
  COUNT(DISTINCT audience_target) AS distinct_audiences
FROM public.posts
WHERE board_type IN ('qna', 'navigation', 'manager_notice')
GROUP BY board_type
ORDER BY board_type;

-- ┌─────────────────────────────────────────────────────────┐
-- │ [6] qna 시드 462건 박힌 자리 team_id raw (스마트게시판 본진)     │
-- └─────────────────────────────────────────────────────────┘
SELECT
  team_id,
  COUNT(*) AS n
FROM public.posts
WHERE board_type = 'qna' AND source_type = 'seed'
GROUP BY team_id
ORDER BY 2 DESC;

-- ┌─────────────────────────────────────────────────────────┐
-- │ [7] ga_member 시뮬레이션 SELECT (RLS 적용 후 박은 결과)         │
-- │     실제 사용자 박은 자리에서 어떤 row가 박힘 보이는지 시뮬레이션  │
-- └─────────────────────────────────────────────────────────┘
DO $$
DECLARE
  v_ga_member_id uuid;
  v_email        text;
  v_team_id      uuid;
  v_count_qna    int;
  v_count_nav    int;
  v_count_mgr    int;
BEGIN
  -- 4팀 ga_member 1명 박힌 자리 가져옴
  SELECT id, email, team_id INTO v_ga_member_id, v_email, v_team_id
  FROM public.users
  WHERE role = 'ga_member'
  LIMIT 1;

  IF v_ga_member_id IS NULL THEN
    RAISE NOTICE '⚠️ ga_member 사용자 박지 X 박혀 있어 시뮬레이션 박지 X';
    RETURN;
  END IF;

  RAISE NOTICE '═══════════════════════════════════════════';
  RAISE NOTICE '시뮬레이션 대상 사용자:';
  RAISE NOTICE '  email   = %', v_email;
  RAISE NOTICE '  user_id = %', v_ga_member_id;
  RAISE NOTICE '  team_id = %', v_team_id;
  RAISE NOTICE '═══════════════════════════════════════════';

  -- JWT claim 시뮬레이션 (authenticated role + sub + team_id)
  PERFORM set_config('request.jwt.claims',
    json_build_object(
      'sub', v_ga_member_id::text,
      'role', 'authenticated',
      'email', v_email,
      'team_id', v_team_id::text,
      'user_metadata', json_build_object(
        'role', 'ga_member',
        'team_id', v_team_id::text
      )
    )::text, true);

  PERFORM set_config('role', 'authenticated', true);

  -- RLS 적용 SELECT 시도
  SELECT COUNT(*) INTO v_count_qna  FROM public.posts WHERE board_type = 'qna';
  SELECT COUNT(*) INTO v_count_nav  FROM public.posts WHERE board_type = 'navigation';
  SELECT COUNT(*) INTO v_count_mgr  FROM public.posts WHERE board_type = 'manager_notice';

  RAISE NOTICE 'ga_member 시뮬레이션 SELECT 결과 (RLS 적용 후):';
  RAISE NOTICE '  qna            : % rows (전체 462+ 박혀야 정합)', v_count_qna;
  RAISE NOTICE '  navigation     : % rows (전체 237+ 박혀야 정합)', v_count_nav;
  RAISE NOTICE '  manager_notice : % rows (전체 263+ 박혀야 정합)', v_count_mgr;

  -- 격차 진단
  IF v_count_qna = 0 AND v_count_nav = 0 AND v_count_mgr = 0 THEN
    RAISE NOTICE '🚨 격차 확정: ga_member 모든 board SELECT 차단 박힘 (RLS 정책 본질 격차)';
  ELSIF v_count_qna < 462 OR v_count_nav < 237 OR v_count_mgr < 263 THEN
    RAISE NOTICE '⚠️ 부분 격차: 일부 row만 SELECT 박힘 (team_id 또는 audience_target 필터 박힘)';
  ELSE
    RAISE NOTICE '✅ RLS 정합: 모든 시드 SELECT 가능 (다른 격차 점검 필요)';
  END IF;

  -- role 복원
  RESET role;
  PERFORM set_config('request.jwt.claims', NULL, true);
END $$;

-- ============================================================================
-- 📋 결과 해석 본진
-- ============================================================================
-- [1] RLS 정책 raw — 가장 본진 (어떤 정책이 어떤 board를 막는지 정확 위치)
-- [2] rls_enabled = true 정합
-- [3] ga_member 5명 모두 team_id = 4팀(5fccd362) 박혀야 정합
-- [4] match_status = '✅ 정합' 박혀야 정합 (격차 시 5/14 카카오임 사고 패턴 재발)
-- [5] qna 462 + navigation 237 + manager_notice 263 박혀 있는지
-- [6] qna 시드 team_id 분포 — 모두 4팀 박혀 있는지 또는 NULL 박혀 있는지
-- [7] 시뮬레이션 결과 = 실제 사용자 박은 자리 보이는 row 수
--
-- 격차 발견 시 후속 정정 SQL 별도 마이그레이션:
--   - 5/18 D-Day 빠른 박음 = 가입자 모두 navigation/qna/manager_notice SELECT 가능
--   - 정밀 RLS = Phase 2 (5/19+) 본진
-- ============================================================================
