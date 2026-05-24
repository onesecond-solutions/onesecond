-- ============================================================================
-- 지점 게시판 신설 — team_notices + branch_id + scope='branch_internal' + 시드
-- 작성: 2026-05-17 D-1 (5/18 D-Day 시연 본진)
-- 본진: 더원지점 본진 박힘 (네이트/카톡 등 다양 채널 일원화)
-- 추천 본진(지점장 추천) = 5/19 D+1 본진 박음 (시드 = 직접 작성)
-- ============================================================================
--
-- 🚨 실행 전 신버전 확인:
--   - Dashboard 좌상단 = `onesecond-v1-restore-0420`
--   - URL ID = `pdnwgzneooyygfejrvbg`
--
-- 📌 본 SQL 본진:
--   - team_notices에 branch_id 컬럼 추가 (NULL 허용, 옛 team_notices 박힌 자리 정합)
--   - scope = 'team_internal' (4팀 단체방2 옛) / 'branch_internal' (지점 게시판 신)
--   - RLS 정정 — scope 분기 박음
--   - 작성 권한: admin + ga_branch_manager + ga_manager + ga_staff
--   - 시드 5건 (더원지점)
--
-- ============================================================================

BEGIN;

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [0] team_id NOT NULL 제약 해제 — 지점 게시판 = team 박지 X 박는 자리   │
-- │     2026-05-17 Chrome AI 실행 격차 정정 (23502 NOT NULL 위반)          │
-- └─────────────────────────────────────────────────────────────────────┘

ALTER TABLE public.team_notices
  ALTER COLUMN team_id DROP NOT NULL;

COMMENT ON COLUMN public.team_notices.team_id IS
  'team 게시판(scope=team_internal) 박힌 자리에만 박힘. 지점 게시판(scope=branch_internal) = NULL (branch_id 박힘).';

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [1] team_notices에 branch_id 컬럼 + source 컬럼 추가 (추천 본진 대비)   │
-- └─────────────────────────────────────────────────────────────────────┘

ALTER TABLE public.team_notices
  ADD COLUMN IF NOT EXISTS branch_id    uuid REFERENCES public.branches(id),
  ADD COLUMN IF NOT EXISTS source_type  text,
  ADD COLUMN IF NOT EXISTS source_id    uuid,
  ADD COLUMN IF NOT EXISTS recommended_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS recommended_at timestamptz;

COMMENT ON COLUMN public.team_notices.branch_id IS
  '지점 게시판 박힘 자리 = branch_id 박힘 (scope=branch_internal). team 게시판 = NULL.';
COMMENT ON COLUMN public.team_notices.source_type IS
  '추천 본진 — 옛 게시판 박힌 자료 박힐 자리 원본 type (nav_answer / team_notice / qna / 등). 직접 작성 = NULL.';
COMMENT ON COLUMN public.team_notices.source_id IS
  '추천 본진 — 옛 게시판 박힌 자료 박힐 자리 원본 UUID. 직접 작성 = NULL.';

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [2] 인덱스 추가 (branch_id 박힌 자리)                                  │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE INDEX IF NOT EXISTS idx_team_notices_branch_scope
  ON public.team_notices (branch_id, scope, created_at DESC)
  WHERE deleted_at IS NULL AND scope = 'branch_internal';

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [3] RLS 정정 — scope 분기 (team_internal vs branch_internal)          │
-- └─────────────────────────────────────────────────────────────────────┘

-- 옛 정책 박지 X 박음
DROP POLICY IF EXISTS team_notices_select ON public.team_notices;
DROP POLICY IF EXISTS team_notices_insert ON public.team_notices;

-- 신 SELECT: scope 분기
CREATE POLICY team_notices_select ON public.team_notices
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      is_admin()
      -- team_internal = 같은 team_id
      OR (scope = 'team_internal' AND team_id = my_team_id())
      -- branch_internal = 같은 branch_id (회사 일치 = branches.company 박힘 정합)
      OR (scope = 'branch_internal' AND branch_id = my_branch_id())
    )
  );

-- 신 INSERT: scope 분기 + 작성 권한 분기
CREATE POLICY team_notices_insert ON public.team_notices
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin()
    OR (
      -- team_internal = admin + ga_branch_manager + ga_manager (옛)
      scope = 'team_internal' AND EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
          AND u.role IN ('ga_branch_manager', 'ga_manager')
          AND u.team_id = team_notices.team_id
      )
    )
    OR (
      -- branch_internal = admin + ga_branch_manager + ga_manager + ga_staff (신)
      scope = 'branch_internal' AND EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
          AND u.role IN ('ga_branch_manager', 'ga_manager', 'ga_staff')
          AND u.branch_id = team_notices.branch_id
      )
    )
  );

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [4] 시드 5건 — 더원지점 박힌 자리 (시연용)                              │
-- └─────────────────────────────────────────────────────────────────────┘

DO $$
DECLARE
  v_author_id  uuid;
  v_branch_id  uuid;
BEGIN
  -- 한재성 실장
  SELECT id INTO v_author_id FROM public.users
  WHERE email = 'jaisung78@gmail.com' LIMIT 1;
  IF v_author_id IS NULL THEN RAISE EXCEPTION '한재성 lookup 실패'; END IF;

  -- 더원지점 branch_id
  SELECT id INTO v_branch_id FROM public.branches
  WHERE name LIKE '%더원%' ORDER BY created_at LIMIT 1;
  IF v_branch_id IS NULL THEN RAISE EXCEPTION '더원지점 lookup 실패'; END IF;

  -- 1. 운영 공지
  INSERT INTO public.team_notices (branch_id, author_id, notice_type, scope, title, content, created_at)
  VALUES (v_branch_id, v_author_id, 'operation', 'branch_internal',
    '에즈더원 더원지점 — 5월 셋째 주 운영 본진 정리',
    E'안녕하세요 더원지점 팀원 여러분.\n\n5월 셋째 주 운영 본진 공유드립니다.\n\n■ 5/18 (월): 4팀 회식 (시청팀 전체, 서울고깃집 18:00)\n■ 5/19 (화): 한화생명 추가 교육 (시청팀 회의실 10:00)\n■ 5/20 (수): 지점장 미팅\n■ 5/25 (일): DB손보 간병인일당 20만 한도 축소\n\n주간 일정 미리 확인 부탁드립니다.',
    NOW() - INTERVAL '10 hours');

  -- 2. 긴급 공지
  INSERT INTO public.team_notices (branch_id, author_id, notice_type, scope, title, content, created_at)
  VALUES (v_branch_id, v_author_id, 'urgent', 'branch_internal',
    '🚨 더원지점 — 카톡·네이트 채널 일원화 안내',
    E'더원지점 가족 여러분께 중요 공지드립니다.\n\n그동안 공지 채널이 카톡 / 네이트 / SMS 등 너무 다양해 누락이 잦았습니다.\n\n오늘부터 모든 지점 공지는 본 "에즈더원 더원지점 게시판" 으로 일원화합니다.\n\n■ 카톡 단체방 = 일상 대화 / 가벼운 안내\n■ 본 게시판 = 공식 운영 공지 (확인 필수)\n\n매일 1회 본 게시판 확인 부탁드립니다.',
    NOW() - INTERVAL '8 hours');

  -- 3. 교육 안내
  INSERT INTO public.team_notices (branch_id, author_id, notice_type, scope, title, content, created_at)
  VALUES (v_branch_id, v_author_id, 'education', 'branch_internal',
    '5/19 화 한화생명 추가 교육 (시청팀 회의실)',
    E'5월 19일 (화) 오전 10시\n시청팀 회의실에서 한화생명 추가 교육이 진행됩니다.\n\n■ 일시: 5/19 (화) 10:00 ~ 11:30\n■ 장소: 시청팀 회의실\n■ 자료: 한화생명 5월 교안 (한재성 실장 사전 배포)\n\n4팀 + 1팀 + 3팀 + 5팀 모두 참석 부탁드립니다.\n재택 근무 분들도 가능하시면 꼭 참석해주세요.',
    NOW() - INTERVAL '6 hours');

  -- 4. 이벤트/일정
  INSERT INTO public.team_notices (branch_id, author_id, notice_type, scope, title, content, created_at)
  VALUES (v_branch_id, v_author_id, 'event', 'branch_internal',
    '5/18 월 시청팀 전체 회식 (서울고깃집 18:00)',
    E'5월 18일 (월) 저녁 시청팀 전체 회식 진행됩니다.\n\n■ 일시: 5/18 (월) 18:00 ~ 21:00\n■ 장소: 회사 뒷편 서울고깃집 (김치찌개집)\n■ 참석: 더원지점 전 팀원 (4팀 + 1팀 + 3팀 + 5팀)\n\n재택 근무 분들도 가능하시면 꼭 참석 부탁드려요.\n오랜만에 다같이 얼굴 뵙고 좋은 시간 보내요. ^^',
    NOW() - INTERVAL '4 hours');

  -- 5. 기타
  INSERT INTO public.team_notices (branch_id, author_id, notice_type, scope, title, content, created_at)
  VALUES (v_branch_id, v_author_id, 'etc', 'branch_internal',
    '더원지점 사무실 정수기 교체 안내',
    E'사무실 정수기 노후로 교체 진행됩니다.\n\n■ 일시: 5/22 (목) 오전\n■ 작업 시간: 약 1시간 (10:00 ~ 11:00)\n■ 불편 사항: 작업 중 정수기 사용 불가\n\n생수 박은 자리 박혀 있으니 작업 중 활용해주세요.',
    NOW() - INTERVAL '2 hours');

  RAISE NOTICE '지점 게시판 시드 = 5건 INSERT 완료 (더원지점, scope=branch_internal)';
END $$;

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [5] 검증                                                              │
-- └─────────────────────────────────────────────────────────────────────┘

SELECT scope, COUNT(*) AS n FROM public.team_notices
WHERE deleted_at IS NULL
GROUP BY scope;

SELECT notice_type, COUNT(*) AS n FROM public.team_notices
WHERE scope = 'branch_internal' AND deleted_at IS NULL
GROUP BY notice_type
ORDER BY n DESC;

SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'team_notices'
ORDER BY cmd;

COMMIT;

-- ============================================================================
-- 예상 결과:
-- - scope='team_internal' = 7건 (4팀 단체방2 옛 시드)
-- - scope='branch_internal' = 5건 (더원지점 신 시드)
-- - 정책 4건: SELECT/INSERT/UPDATE/DELETE (SELECT + INSERT 정정 박힘)
-- ============================================================================
