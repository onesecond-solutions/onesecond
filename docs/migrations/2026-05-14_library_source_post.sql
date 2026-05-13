-- ============================================================================
-- 작업지시서 본진 4 — library 테이블에 source_post_id 컬럼 추가 (2026-05-14)
-- 본진: 게시판 첨부 → MY SPACE 저장 본진 가동 (작성자/포스트 추적)
-- 실행 위치: Supabase Dashboard SQL Editor (신버전 onesecond-v1-restore-0420)
-- 실행 주체: 팀장님
-- 5/18 4팀 오픈 D-4일
-- ============================================================================
--
-- 정합:
--   - 작업지시서 본진 4 § "myspace_items 테이블에 source_post_id (nullable FK) 컬럼 추가"
--   - Code 정정: 라이브 본진 = `myspace_items` X → `library` 테이블 박혀 있음
--   - myspace.html line 818~835 정합 (POST /rest/v1/library)
--
-- 본 박음 영향 범위:
--   - public.library 테이블에 컬럼 1건 추가 (uuid nullable FK)
--   - 기존 row 영향 0 (NULL 기본값)
--   - 기존 INSERT 영향 0 (컬럼 nullable, default NULL)
--   - 기존 SELECT 영향 0 (RLS 정책 변경 X)
--
-- ============================================================================

BEGIN;

-- ┌─────────────────────────────────────────────────────────┐
-- │ [1] source_post_id 컬럼 신설 (게시판 → MY SPACE 추적용)    │
-- └─────────────────────────────────────────────────────────┘
ALTER TABLE public.library
  ADD COLUMN IF NOT EXISTS source_post_id uuid;

COMMENT ON COLUMN public.library.source_post_id IS
  '게시판 자산 → MY SPACE 저장 시 원본 post의 id (nullable). 본진 4, 2026-05-14.';

-- ┌─────────────────────────────────────────────────────────┐
-- │ [2] FK 제약 (posts.id 참조, ON DELETE SET NULL)            │
-- └─────────────────────────────────────────────────────────┘
ALTER TABLE public.library
  DROP CONSTRAINT IF EXISTS library_source_post_fk;
ALTER TABLE public.library
  ADD CONSTRAINT library_source_post_fk
  FOREIGN KEY (source_post_id) REFERENCES public.posts(id) ON DELETE SET NULL;

-- ┌─────────────────────────────────────────────────────────┐
-- │ [3] 중복 저장 차단 (한 사용자가 같은 post 2번 저장 X)        │
-- │     PARTIAL UNIQUE — source_post_id가 NULL이 아닐 때만     │
-- └─────────────────────────────────────────────────────────┘
CREATE UNIQUE INDEX IF NOT EXISTS uq_library_owner_post
  ON public.library (owner_id, source_post_id)
  WHERE source_post_id IS NOT NULL;

COMMIT;

-- ============================================================================
-- 검증 쿼리 (별도 RUN 권장)
-- ============================================================================
--
-- [검증 1] 컬럼 박힘
-- SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='library' AND column_name='source_post_id';
-- expected: 1 row / uuid / YES
--
-- [검증 2] FK 박힘
-- SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conrelid = 'public.library'::regclass AND conname = 'library_source_post_fk';
-- expected: 1 row / FOREIGN KEY ... REFERENCES posts(id) ON DELETE SET NULL
--
-- [검증 3] UNIQUE 인덱스 박힘
-- SELECT indexname, indexdef FROM pg_indexes
--   WHERE schemaname='public' AND tablename='library' AND indexname='uq_library_owner_post';
-- expected: 1 row / UNIQUE / WHERE source_post_id IS NOT NULL
--
-- [검증 4] 기존 row 영향 0
-- SELECT COUNT(*) FROM public.library WHERE source_post_id IS NOT NULL;
-- expected: 0
--
-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
