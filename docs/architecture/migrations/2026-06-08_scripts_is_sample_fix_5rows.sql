-- 운영 스크립트 5건 is_sample 오적재 정정 (2026-06-08)
-- 근거: Chrome 검수 / 팀장님 승인 / 실행 주체: 팀장님 (Supabase SQL Editor)
-- 🚨 실행 전 신버전 확인: onesecond-v1-restore-0420 / pdnwgzneooyygfejrvbg

-- [1] 실행 전 실측 (현 상태 확인)
SELECT id, title, scope, is_sample, is_active
FROM public.scripts
WHERE id IN (57,58,59,60,61) ORDER BY id;

-- [2] 정정 (id 한정 — 다른 행 영향 없음)
UPDATE public.scripts
SET is_sample = false
WHERE id IN (57,58,59,60,61)
  AND scope = 'global'
  AND is_sample = true;
-- 예상: 5 rows

-- [3] 실행 후 검증
SELECT id, title, is_sample FROM public.scripts
WHERE id IN (57,58,59,60,61) ORDER BY id;
