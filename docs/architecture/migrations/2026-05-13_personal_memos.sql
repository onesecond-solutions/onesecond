-- ============================================================================
-- personal_memos 테이블 신설 — 4팀 단체방 + 마이스페이스 메모 본진
-- 일시: 2026-05-13
-- 본진: Q12-C① 결재 정합 — 별 테이블 + RLS author=본인만
-- 정합: D-우측 자산 패널 "내 메모" + 마이스페이스 (저장 → 양쪽 노출)
-- 신버전: pdnwgzneooyygfejrvbg (onesecond-v1-restore-0420) — 팀장님 확인 ✅
-- ============================================================================
--
-- 실행 규칙:
--   § A 사전 검증 (2 SELECT) → 정합 박은 후
--   § B 테이블 + RLS + 인덱스 (단일 트랜잭션 권장)
--   § C 박힘 검증 (3 SELECT)
--
-- ============================================================================


-- ============================================================================
-- § A. 사전 검증 SQL (강제)
-- ============================================================================

-- A-1. 신버전 박힘 확인
SELECT current_database();
-- 기대: postgres


-- A-2. public.users 테이블 박힘 + 컬럼 정합 (FK 참조)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id';
-- 기대: id uuid 박힘


-- A-3. personal_memos 사전 부재 확인 (재실행 방지)
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'personal_memos'
) AS personal_memos_exists;
-- 기대: false (사전 부재)


-- ============================================================================
-- § B. 테이블 + RLS + 인덱스 신설
-- ============================================================================

BEGIN;

-- B-1. 테이블 신설
CREATE TABLE public.personal_memos (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'notice_room',
  ref_post_id BIGINT NULL REFERENCES public.posts(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_scope CHECK (scope IN ('notice_room', 'global', 'post'))
);

COMMENT ON TABLE public.personal_memos IS
  'D-우측 자산 패널 내 메모 + 마이스페이스 본진. RLS author=본인만 (Q12-C① + D①+③ 결재 정합).';
COMMENT ON COLUMN public.personal_memos.scope IS
  'notice_room = 4팀 단체방 / global = 마이스페이스 전역 / post = 특정 post 본진';
COMMENT ON COLUMN public.personal_memos.ref_post_id IS
  'scope=post 일 때 박힐 posts.id (NULL 허용)';


-- B-2. RLS 활성 + 정책 박음 (author=본인만 ALL)
ALTER TABLE public.personal_memos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "personal_memos_author_only"
ON public.personal_memos
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- B-3. 인덱스 박음 (user 조회 + scope 분기)
CREATE INDEX idx_personal_memos_user ON public.personal_memos(user_id);
CREATE INDEX idx_personal_memos_user_scope ON public.personal_memos(user_id, scope);


-- B-4. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION public.tg_personal_memos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_personal_memos_updated_at
BEFORE UPDATE ON public.personal_memos
FOR EACH ROW EXECUTE FUNCTION public.tg_personal_memos_updated_at();

COMMIT;


-- ============================================================================
-- § C. 박힘 검증 SQL (강제)
-- ============================================================================

-- C-1. 테이블 박힘 + 컬럼 정합
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'personal_memos'
ORDER BY ordinal_position;
-- 기대: id / user_id / scope / ref_post_id / content / created_at / updated_at = 7 컬럼


-- C-2. RLS 정책 박힘
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'personal_memos';
-- 기대: personal_memos_author_only / ALL / (user_id = auth.uid()) / (user_id = auth.uid())


-- C-3. 인덱스 박힘
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'personal_memos'
ORDER BY indexname;
-- 기대: idx_personal_memos_user + idx_personal_memos_user_scope + personal_memos_pkey


-- C-4. 트리거 박힘
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE event_object_schema = 'public' AND event_object_table = 'personal_memos';
-- 기대: trg_personal_memos_updated_at / UPDATE


-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
