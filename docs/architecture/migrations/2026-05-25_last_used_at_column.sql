-- 2026-05-25: last_used_at 컬럼 추가 (B안 — 사용 시점 정렬)
-- 본질: 홈 화면 "최근 사용한 자료/스크립트" = 클릭/조회 시점 기준 정렬
-- 영향: public.scripts + public.library 테이블 (사용자별 자료 정합)
--
-- 가동 자리: 프로젝트 ID pdnwgzneooyygfejrvbg (Supabase Dashboard)
-- 가동 방법: SQL Editor에 한 RUN 통째 또는 Step별 분할 실행
-- 재실행 안전: ADD COLUMN IF NOT EXISTS + UPDATE WHERE IS NULL 조건

-- ===== 프로젝트 확인 =====
SELECT current_database();
SELECT current_setting('request.jwt.claims', true)::jsonb->>'role' AS jwt_role;


-- ===== Step 1: 컬럼 추가 =====
ALTER TABLE public.scripts
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz DEFAULT now();

ALTER TABLE public.library
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz DEFAULT now();


-- ===== Step 2: 기존 자료 초기값 (last_used_at = created_at) =====
-- DEFAULT now() 가동으로 컬럼 추가 시 모든 row가 가동 시점으로 박힘.
-- 기존 자료는 created_at으로 갈아끼움 (실제 생성 시점 기준).
UPDATE public.scripts
  SET last_used_at = created_at
  WHERE created_at IS NOT NULL;

UPDATE public.library
  SET last_used_at = created_at
  WHERE created_at IS NOT NULL;


-- ===== Step 3: 정렬 가속 인덱스 (owner_id + last_used_at DESC) =====
CREATE INDEX IF NOT EXISTS idx_scripts_owner_lastused
  ON public.scripts (owner_id, last_used_at DESC);

CREATE INDEX IF NOT EXISTS idx_library_owner_lastused
  ON public.library (owner_id, last_used_at DESC);


-- ===== Step 4: RLS UPDATE 정책 점검 =====
-- last_used_at 갱신 = UPDATE 가동 필요 = 자기 자료만 정합 점검
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('scripts', 'library')
  AND cmd IN ('UPDATE', 'ALL')
ORDER BY tablename, cmd;


-- ===== Step 5: 점검 (모든 row에 last_used_at 채워졌는지) =====
SELECT
  'scripts' AS table_name,
  COUNT(*) AS total,
  COUNT(last_used_at) AS with_lastused,
  COUNT(*) FILTER (WHERE last_used_at IS NULL) AS null_count,
  MIN(last_used_at) AS oldest,
  MAX(last_used_at) AS newest
FROM public.scripts
UNION ALL
SELECT
  'library' AS table_name,
  COUNT(*) AS total,
  COUNT(last_used_at) AS with_lastused,
  COUNT(*) FILTER (WHERE last_used_at IS NULL) AS null_count,
  MIN(last_used_at) AS oldest,
  MAX(last_used_at) AS newest
FROM public.library;


-- ===== Step 6: 인덱스 가동 점검 (선택) =====
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('scripts', 'library')
  AND indexname LIKE '%lastused%'
ORDER BY tablename;
