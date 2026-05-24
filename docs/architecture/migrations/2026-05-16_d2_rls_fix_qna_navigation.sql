-- ============================================================================
-- 🚨 D-2 시급 RLS 정정 — qna/navigation 시드 SELECT 격차 해소
-- 작성: 2026-05-16 D-2
-- 진단 근거: docs/migrations/2026-05-16_d2_rls_critical_diagnostic.sql (commit 84a62ab)
-- Chrome AI 진단 결과: qna 462→0 / navigation 239→1 차단 박혀 있음
-- ============================================================================
--
-- 🚨 실행 전 신버전 확인:
--   - Dashboard 좌상단 = `onesecond-v1-restore-0420`
--   - URL ID = `pdnwgzneooyygfejrvbg`
--
-- 📌 본 SQL 본진:
--   - posts_select_qna_seed_or_branch 정책 = source_type='seed' 박힌 자리 SELECT 허용 추가
--   - posts_select_navigation 정책 = source_type='seed' + audience_target='team_internal' 박힌 자리 SELECT 허용 추가
--   - manager_notice 정책 = 박지 X (이미 정합)
--   - 트랜잭션 BEGIN ~ COMMIT (실패 시 자동 ROLLBACK)
--
-- 📊 격차 본질 (Chrome AI 진단 raw):
--   [1] posts_select_qna_seed_or_branch qual = `(board_type='qna' AND branch_id = my_branch_id())` 박혀
--       시드 자료 branch_id (admin/한재성 박은 자리) ↔ ga_member branch_id 불일치 → 전량 차단
--   [2] posts_select_navigation qual = `(board_type='navigation' AND branch_id = my_branch_id() AND NOT is_insurer_employee())` 박혀
--       동일 격차 → 238건 차단 (branch_id NULL 박힌 1건만 통과)
--
-- ============================================================================

BEGIN;

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [1] qna SELECT 정책 정정 — 시드 자료 (소식지 462건) 모두 SELECT 허용  │
-- └─────────────────────────────────────────────────────────────────────┘

DROP POLICY IF EXISTS posts_select_qna_seed_or_branch ON public.posts;

CREATE POLICY posts_select_qna_seed_or_branch
ON public.posts
FOR SELECT
TO authenticated
USING (
  -- (옛) 본인 지점 qna
  ((board_type = 'qna') AND (branch_id = my_branch_id()))
  -- (2026-05-16 신) qna 시드 (source_type='seed') 박힌 자리 모두 SELECT 허용 — 462건 보험소식지 본진
  OR ((board_type = 'qna') AND (source_type = 'seed'))
  -- (옛) insurer 시드 (보존)
  OR ((board_type = 'insurer') AND (source_type = 'seed') AND (branch_id IS NULL))
);

COMMENT ON POLICY posts_select_qna_seed_or_branch ON public.posts IS
  '2026-05-16 D-2 갱신: qna 시드 자료(소식지 462건) 모든 authenticated SELECT 허용. 본인 지점 qna는 기존 박음. D-2 시급 격차 해소 (Chrome AI 진단 정합).';

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [2] navigation SELECT 정책 정정 — 시드 + team_internal 박힌 자리 허용 │
-- └─────────────────────────────────────────────────────────────────────┘

DROP POLICY IF EXISTS posts_select_navigation ON public.posts;

CREATE POLICY posts_select_navigation
ON public.posts
FOR SELECT
TO authenticated
USING (
  (board_type = 'navigation')
  AND (NOT is_insurer_employee())
  AND (
    -- (옛) 본인 지점 navigation
    branch_id = my_branch_id()
    -- (2026-05-16 신) navigation 시드 (source_type='seed') 박힌 자리 모두 SELECT 허용 — 237건 시드 본진
    OR source_type = 'seed'
    -- (2026-05-16 신) audience_target='team_internal' + team_id 일치 (멀티 테넌트 본진)
    OR (audience_target = 'team_internal' AND team_id = my_team_id())
  )
);

COMMENT ON POLICY posts_select_navigation ON public.posts IS
  '2026-05-16 D-2 갱신: navigation 시드(237건) + audience_target=team_internal 박힌 자리 동일 팀 SELECT 허용. 본인 지점 본진 정합 박음. D-2 시급 격차 해소.';

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [3] 검증 SELECT — 신 정책 본진 정합 확인                              │
-- └─────────────────────────────────────────────────────────────────────┘

SELECT policyname, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'posts'
  AND policyname IN ('posts_select_qna_seed_or_branch', 'posts_select_navigation')
ORDER BY policyname;

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [4] ga_member 시뮬레이션 — 정정 후 SELECT 정합 검증                   │
-- └─────────────────────────────────────────────────────────────────────┘

DO $$
DECLARE
  v_ga_member_id uuid;
  v_email        text;
  v_team_id      uuid;
  v_branch_id    uuid;
  v_count_qna    int;
  v_count_nav    int;
  v_count_mgr    int;
BEGIN
  SELECT id, email, team_id, branch_id
    INTO v_ga_member_id, v_email, v_team_id, v_branch_id
  FROM public.users
  WHERE role = 'ga_member'
  LIMIT 1;

  IF v_ga_member_id IS NULL THEN
    RAISE NOTICE '⚠️ ga_member 박지 X 박혀 있어 시뮬레이션 박지 X';
    RETURN;
  END IF;

  RAISE NOTICE '═══════════════════════════════════════════';
  RAISE NOTICE '정정 후 검증 대상:';
  RAISE NOTICE '  email     = %', v_email;
  RAISE NOTICE '  team_id   = %', v_team_id;
  RAISE NOTICE '  branch_id = %', v_branch_id;
  RAISE NOTICE '═══════════════════════════════════════════';

  PERFORM set_config('request.jwt.claims',
    json_build_object(
      'sub', v_ga_member_id::text,
      'role', 'authenticated',
      'email', v_email,
      'team_id', v_team_id::text,
      'branch_id', COALESCE(v_branch_id::text, ''),
      'user_metadata', json_build_object(
        'role', 'ga_member',
        'team_id', v_team_id::text,
        'branch_id', COALESCE(v_branch_id::text, '')
      )
    )::text, true);
  PERFORM set_config('role', 'authenticated', true);

  SELECT COUNT(*) INTO v_count_qna FROM public.posts WHERE board_type = 'qna';
  SELECT COUNT(*) INTO v_count_nav FROM public.posts WHERE board_type = 'navigation';
  SELECT COUNT(*) INTO v_count_mgr FROM public.posts WHERE board_type = 'manager_notice';

  RAISE NOTICE 'ga_member 정정 후 SELECT 결과:';
  RAISE NOTICE '  qna            : % rows (목표 462+, 옛 0)', v_count_qna;
  RAISE NOTICE '  navigation     : % rows (목표 237+, 옛 1)', v_count_nav;
  RAISE NOTICE '  manager_notice : % rows (목표 262, 기존 정합)', v_count_mgr;

  IF v_count_qna >= 462 AND v_count_nav >= 237 AND v_count_mgr >= 262 THEN
    RAISE NOTICE '✅ ✅ ✅  RLS 정정 PASS — D-2 격차 통째 해소 박힘';
  ELSE
    RAISE NOTICE '⚠️ 부분 해소 — 추가 점검 필요 (ROLLBACK 권장)';
  END IF;

  RESET role;
  PERFORM set_config('request.jwt.claims', NULL, true);
END $$;

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [5] 검증 PASS 확인 후 COMMIT (격차 시 ROLLBACK)                       │
-- └─────────────────────────────────────────────────────────────────────┘

-- 위 [4] DO 블록 NOTICE 메시지에 "✅ RLS 정정 PASS" 박혀 있으면 COMMIT
-- 부분 해소 박혀 있으면 ROLLBACK 박은 후 격차 raw 보고

COMMIT;

-- 격차 발견 시:
-- ROLLBACK;

-- ============================================================================
-- 📋 정정 후 효과
-- ============================================================================
-- ✅ qna 시드 462건 = 모든 가입 사용자 SELECT 가능 (스마트게시판 본진)
-- ✅ navigation 시드 237건 = 모든 가입 사용자 SELECT 가능 (네비게이션방 본진)
-- ✅ navigation team_internal = 동일 팀 사용자 SELECT 가능 (멀티 테넌트 본진)
-- ✅ manager_notice = 기존 team_id 정합 정책 그대로 (회귀 0)
-- ✅ 본인 지점 qna/navigation = 기존 branch_id 정합 정책 그대로 (회귀 0)
-- ✅ insurer / hub / manager_lounge / archive_legacy = 박지 X (회귀 0)
--
-- 5/18 D-Day 본진 정합 박음. Phase 2 (5/19+) 박을 자리 = 정밀 RLS (audience_target ENUM 기반).
-- ============================================================================
