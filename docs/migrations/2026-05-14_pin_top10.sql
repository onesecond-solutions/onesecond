-- ============================================================================
-- 작업지시서 본진 1 — 공지 핀 TOP 10 수동 선택 (2026-05-14)
-- 본진: 자동 최신 공지 1건 폐기 + 실장님 수동 선택 1~10건 박음
-- 실행 위치: Supabase Dashboard SQL Editor (신버전 onesecond-v1-restore-0420)
-- 실행 주체: 팀장님 (Code는 SQL 파일 신설만, 실행 X)
-- 5/18 4팀 오픈 D-4일
-- ============================================================================
--
-- 정합:
--   - 작업지시서 본진 1 § "실장님이 작성한 글 중 최상단에 올리고 싶은 글 TOP 10"
--   - RLS 권한: is_pinned/pin_order UPDATE = admin + ga_manager만
--   - 메모리 rls_self_reference_avoidance.md = SECURITY DEFINER 함수 표준
--   - 메모리 supabase_sql_editor_session_isolation.md = BEGIN~COMMIT 한 RUN 강제
--
-- 본 박음 영향 범위:
--   - public.posts 테이블에 컬럼 2건 추가 (boolean default false / integer nullable)
--   - 기존 row 영향 0 (is_pinned=false / pin_order=NULL 기본값)
--   - 기존 INSERT 영향 0 (컬럼 nullable + default)
--   - 기존 SELECT 영향 0 (RLS 정책 변경 X)
--   - 추가 박음: 트리거 BEFORE UPDATE 1건 (핀 컬럼 변경 시 role 검증)
--   - 추가 박음: 인덱스 1건 (board_type + pin_order, partial WHERE is_pinned=true)
--
-- ============================================================================

BEGIN;

-- ┌─────────────────────────────────────────────────────────┐
-- │ [1] 컬럼 2건 신설                                          │
-- └─────────────────────────────────────────────────────────┘
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS pin_order integer;

COMMENT ON COLUMN public.posts.is_pinned IS
  '핀 등록 여부 (실장님 수동 선택, 작업지시서 본진 1, 2026-05-14). 자동 최신 공지 로직 폐기.';
COMMENT ON COLUMN public.posts.pin_order IS
  '핀 순서 1~10 (1이 최상단). is_pinned=false 시 NULL 강제. CHECK 박음.';

-- ┌─────────────────────────────────────────────────────────┐
-- │ [2] CHECK 제약 — pin_order 1~10 + is_pinned 정합          │
-- └─────────────────────────────────────────────────────────┘
ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_pin_order_range;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_pin_order_range
  CHECK (
    (is_pinned = false AND pin_order IS NULL) OR
    (is_pinned = true  AND pin_order BETWEEN 1 AND 10)
  );

-- ┌─────────────────────────────────────────────────────────┐
-- │ [3] 인덱스 — board_type별 핀 빠른 fetch (partial)         │
-- └─────────────────────────────────────────────────────────┘
CREATE INDEX IF NOT EXISTS idx_posts_pinned_board
  ON public.posts (board_type, pin_order)
  WHERE is_pinned = true;

-- ┌─────────────────────────────────────────────────────────┐
-- │ [4] RLS 가드 트리거 — 핀 컬럼 변경 시 role 검증            │
-- │     SECURITY DEFINER (메모리 rls_self_reference_avoidance) │
-- └─────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION public.guard_post_pin_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  -- 핀 컬럼 변경 없으면 통과 (일반 UPDATE 영향 0)
  IF NEW.is_pinned IS NOT DISTINCT FROM OLD.is_pinned
     AND NEW.pin_order IS NOT DISTINCT FROM OLD.pin_order THEN
    RETURN NEW;
  END IF;

  -- 핀 컬럼 변경 시 role 검증
  SELECT role INTO v_role
  FROM public.users
  WHERE id = auth.uid();

  -- 작업지시서 본진 1: admin + ga_manager만
  IF v_role NOT IN ('admin', 'ga_manager') THEN
    RAISE EXCEPTION '핀 등록/해제 권한 없음 (현재 role=%, 필요=admin 또는 ga_manager)', v_role
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_post_pin_update ON public.posts;
CREATE TRIGGER trg_guard_post_pin_update
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_post_pin_update();

COMMIT;

-- ============================================================================
-- 검증 쿼리 (실행 후 결과 확인용 — 본 검증은 별도 RUN 권장)
-- ============================================================================
--
-- [검증 1] 컬럼 2건 박힘
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='posts'
--     AND column_name IN ('is_pinned','pin_order')
--   ORDER BY column_name;
-- expected: 2 rows
--   is_pinned | boolean | NO  | false
--   pin_order | integer | YES | (null)
--
-- [검증 2] CHECK 제약 박힘
-- SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conrelid = 'public.posts'::regclass AND conname = 'posts_pin_order_range';
-- expected: 1 row
--   posts_pin_order_range | CHECK ((is_pinned = false AND pin_order IS NULL) OR ...)
--
-- [검증 3] 인덱스 박힘
-- SELECT indexname, indexdef FROM pg_indexes
--   WHERE schemaname='public' AND tablename='posts' AND indexname='idx_posts_pinned_board';
-- expected: 1 row (partial index, WHERE is_pinned = true)
--
-- [검증 4] 트리거 박힘
-- SELECT tgname, tgenabled FROM pg_trigger
--   WHERE tgrelid = 'public.posts'::regclass AND tgname = 'trg_guard_post_pin_update';
-- expected: 1 row (tgenabled='O')
--
-- [검증 5] 기존 row 영향 0
-- SELECT COUNT(*) FROM public.posts WHERE is_pinned = true;
-- expected: 0
-- SELECT COUNT(*) FROM public.posts WHERE pin_order IS NOT NULL;
-- expected: 0
--
-- [검증 6] 권한 거부 시연 (다른 role 계정 = ga_member 등으로 실행 시)
-- UPDATE public.posts SET is_pinned = true, pin_order = 1 WHERE id = (SELECT id FROM public.posts LIMIT 1);
-- expected: ERROR 42501 "핀 등록/해제 권한 없음"
--
-- ============================================================================
-- 작업지시서 본진 6 — 작성자 본인 RBAC 검증 (검증 SQL 동봉)
-- ============================================================================
-- 본진 6은 "검증"만 — 이미 박혀 있을 거 (db_phase1_step_a_capture.md line 85/90 참조).
-- 박혀 있지 않으면 별 결재 후 정책 갱신 spec 박음.
--
-- [검증 7] posts UPDATE / DELETE RLS 정책 박혀 있는지
-- SELECT polname, polcmd,
--        pg_get_expr(polqual, polrelid)      AS using_clause,
--        pg_get_expr(polwithcheck, polrelid) AS withcheck_clause
-- FROM pg_policy
-- WHERE polrelid = 'public.posts'::regclass
--   AND polcmd IN ('w','d')   -- 'w'=UPDATE, 'd'=DELETE
-- ORDER BY polcmd, polname;
--
-- expected (db_phase1_step_a_capture.md 정합):
--   UPDATE: "author or admin update posts" → using = (auth.uid()::text = author_id OR is_admin())
--   DELETE: "author or admin delete posts" → using = (auth.uid()::text = author_id OR is_admin())
--
-- [검증 8] is_admin() SECURITY DEFINER 함수 박혀 있는지
-- SELECT proname, prosecdef, pg_get_function_arguments(oid) AS args
-- FROM pg_proc
-- WHERE proname = 'is_admin';
--
-- expected: 1 row / prosecdef = true / args = '' (인자 없음)
--
-- [본진 6 격차 박힘 시 다음 세션 결재 후 정책 갱신]
-- (격차 1) UPDATE/DELETE 정책 박혀 있지 X → CREATE POLICY 신설 (SECURITY DEFINER 함수 정합)
-- (격차 2) using/withcheck에 EXISTS(SELECT FROM users) 박혀 있음 → 메모리 rls_self_reference_avoidance 위반.
--          폐기 + is_admin() 함수 본진으로 교체
--
-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
