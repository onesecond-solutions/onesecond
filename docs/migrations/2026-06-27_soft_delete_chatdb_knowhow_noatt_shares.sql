-- ============================================================
-- 채팅DB 활용 노하우 — 첨부 없는 팀/지점 공유 중복분 소프트삭제
-- ============================================================
-- 작성: 2026-06-27 / 총괄팀장(Code), 대표님 요청
-- DB: 신버전 onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
-- 실행: Supabase SQL Editor (service context = RLS 우회)
--
-- 배경: 임태성 실장이 "채팅DB 활용 노하우"를 첨부 없이 먼저 공유(06-26 09:35,
--       id 167 team / 168 branch) → 첨부 달아 다시 공유(06-26 12:50, id 169/170).
--       첨부 없는 옛 중복분(167·168)을 목록에서 제거(소프트삭제).
--
-- 대상(삭제): id 167(team), 168(branch) — 제목 "채팅DB 활용 노하우" + 첨부 빈값
-- 보존(미변경): 169(team)·170(branch) = 첨부 있음 / 166(personal) = 첨부 있음·개인
--
-- 소프트삭제 = is_active=false. 목록 조회가 is_active=eq.true 필터라 화면에서 사라짐.
--              하드삭제 아님 → 잘못되면 is_active=true 로 즉시 복구 가능.
-- 가드: id + scope + title + owner + 첨부 빈값 4중 조건 → 169/170(첨부 있음) 절대 안 걸림.
-- ============================================================

BEGIN;

UPDATE public.scripts
SET is_active = false
WHERE id IN (167, 168)
  AND scope IN ('team', 'branch')
  AND title = '채팅DB 활용 노하우'
  AND owner_id = '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd'
  AND (attachments IS NULL OR attachments::text IN ('[]', 'null', ''))
RETURNING id, scope, title, is_active;
-- 기대: 정확히 2행 반환 (167 team / 168 branch, is_active=false)
-- 만약 0행 또는 2행 아님 → ROLLBACK; 후 대표님께 보고 (가드 불일치 = 데이터 상태 재확인 필요)

COMMIT;

-- ============================================================
-- 검증 (위 COMMIT 후 별도 RUN으로 실행)
-- ============================================================
-- 1) 대상 2건이 비활성화됐는지
-- SELECT id, scope, title, is_active FROM public.scripts WHERE id IN (167, 168);
--    기대: 167 false / 168 false
--
-- 2) 보존 대상이 그대로인지 (첨부 있는 버전)
-- SELECT id, scope, title, is_active FROM public.scripts WHERE id IN (166, 169, 170);
--    기대: 셋 다 is_active=true (미변경)
--
-- 3) 팀/지점 공유 목록에서 "채팅DB 활용 노하우"가 첨부본만 남는지
-- SELECT id, scope, is_active FROM public.scripts
-- WHERE title = '채팅DB 활용 노하우' AND scope IN ('team','branch') ORDER BY scope, id;
--    기대: 167·168 = false / 169·170 = true
-- ============================================================
