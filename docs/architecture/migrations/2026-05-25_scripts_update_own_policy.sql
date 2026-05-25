-- 2026-05-25: scripts UPDATE 정책 추가 (last_used_at 갱신 가능 자리)
--
-- 본질: scripts 테이블에 일반 사용자 UPDATE 정책 0건 = 자기 자료 갱신 차단
-- 사유: 직전 마이그레이션 (2026-05-25_last_used_at_column.sql) 가동 후
--       Chrome AI 점검 결과 = scripts.UPDATE 정책 누락 발견
-- 영향: scripts 테이블 RLS 정책 1건 추가 (library_update_own 자리 정합)
-- 위험: 자기 참조 SELECT 0건 (auth.uid는 함수, owner_id는 컬럼)
--
-- 가동 자리: 프로젝트 ID pdnwgzneooyygfejrvbg (Supabase Dashboard SQL Editor)

-- ===== 프로젝트 확인 =====
SELECT current_database();


-- ===== Step 1: 정책 추가 (library_update_own 자리 정합) =====
CREATE POLICY scripts_update_own ON public.scripts
  FOR UPDATE TO authenticated
  USING ((auth.uid())::text = owner_id)
  WITH CHECK ((auth.uid())::text = owner_id);


-- ===== Step 2: 점검 = scripts 모든 정책 확인 =====
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'scripts'
ORDER BY cmd, policyname;


-- ===== Step 3: 점검 (가동 검증 자리) =====
-- 자기 자료 last_used_at UPDATE 가능한지 자체 점검 SQL
-- (실제 가동 = 로그인 상태 클라이언트 자체. 본 점검 = 정책 자체 자체만)
SELECT
  COUNT(*) AS scripts_update_policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'scripts'
  AND cmd = 'UPDATE';
-- 기대 결과 = 1건 (scripts_update_own)
