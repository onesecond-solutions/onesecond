-- ============================================================
-- 원수사 자료실 — GA 실장·지점장 작성/열람 RLS 확대
-- ============================================================
-- 작성: 2026-06-27 / 총괄팀장(Code), 대표님 결재
-- DB: 신버전 onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
-- 실행: Supabase SQL Editor (한 RUN으로 BEGIN~COMMIT). 검증 SELECT는 COMMIT 후 별도 RUN.
--
-- 배경: 원수사 자료실(board_type='insurer') 작성/열람이 admin + 원수사 임직원으로 한정.
--       대표님 방향 — GA 실장(ga_manager)·지점장(ga_branch_manager)도 작성, 열람은 같은 지점 GA만.
--
-- 검증된 패턴 차용: 기존 posts_insert_manager_notice가 get_my_role() = ANY(ARRAY['admin','ga_branch_manager','ga_manager'])
--                  로 GA 매니저를 판정 중. my_branch_id()는 posts_insert_manager_lounge 등에서 사용 중.
--
-- 화면 정합: ivSubmit이 GA 작성 글의 branch_id = 본인 지점(_cospLoadMe().branch_id)으로 박음.
--           admin/원수사 작성 글은 branch_id=null(전사) 유지 → 본 SELECT 정책에 안 걸림(기존 정책대로).
--
-- ⚠️ 기존 정책(posts_insert_insurer / posts_admin_insert / posts_select_* 등)은 일절 건드리지 않음.
--    아래 2개 정책만 신규 추가(멱등 — DROP IF EXISTS 후 CREATE).
-- ============================================================

BEGIN;

-- 1) INSERT: GA 실장·지점장이 '본인 지점'으로만 insurer 자료 작성 (타인 명의·타 지점 위조 차단)
DROP POLICY IF EXISTS posts_insert_insurer_ga_manager ON public.posts;
CREATE POLICY posts_insert_insurer_ga_manager ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (
    board_type = 'insurer'
    AND (auth.uid())::text = author_id
    AND get_my_role() = ANY (ARRAY['ga_manager'::text, 'ga_branch_manager'::text])
    AND branch_id = my_branch_id()
  );

-- 2) SELECT: 같은 지점 GA만 지점 insurer 자료 열람 (branch_id 일치)
DROP POLICY IF EXISTS posts_select_insurer_ga_branch ON public.posts;
CREATE POLICY posts_select_insurer_ga_branch ON public.posts
  FOR SELECT TO authenticated
  USING (
    board_type = 'insurer'
    AND branch_id IS NOT NULL
    AND branch_id = my_branch_id()
  );

COMMIT;

-- ============================================================
-- 검증 (COMMIT 후 별도 RUN)
-- ============================================================
-- 1) 신규 정책 2개 생성 확인
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname='public' AND tablename='posts'
--   AND policyname IN ('posts_insert_insurer_ga_manager','posts_select_insurer_ga_branch');
--    기대: 2행 (INSERT / SELECT)
--
-- 2) 기존 insurer 정책이 그대로인지(개수 무변경)
-- SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='posts';
--    기대: 직전 대비 +2
--
-- 실사용 검증(라이브): GA 실장 계정으로 원수사 자료실 → 보험사 선택 → 작성 → 같은 지점 GA에게만 노출 / 타 지점 GA·일반 사용자 비노출.
-- ============================================================
