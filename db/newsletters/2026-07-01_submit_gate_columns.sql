-- 🟠 데이터변경(DDL+백필) — newsletters 검수 게이트 컬럼 추가
-- 목적: 김실장·기획팀장 등록 소식지를 reviewing으로 받고, 총괄팀장 검수 후 published만 검색 노출.
-- ⚠️ 실행 전 확인: Supabase 프로젝트 = onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
-- ⚠️ 기존 4월/6월 소식지(67+건)의 검색 노출을 끊지 않도록 백필(published) 포함.

BEGIN;

-- 1) 컬럼 추가 (없을 때만)
ALTER TABLE public.newsletters ADD COLUMN IF NOT EXISTS submitted_by text;
ALTER TABLE public.newsletters ADD COLUMN IF NOT EXISTS status text;

-- 2) 기존 전량 = published 백필 (신규 등록 전이라 전부 기존분 → 검색 노출 유지)
UPDATE public.newsletters SET status = 'published' WHERE status IS NULL;

-- 3) 이후 신규 INSERT 기본값 = reviewing (등록 API는 명시적으로 'reviewing' 전달, DEFAULT는 방어)
ALTER TABLE public.newsletters ALTER COLUMN status SET DEFAULT 'reviewing';

-- 4) 상태 인덱스
CREATE INDEX IF NOT EXISTS idx_newsletters_status ON public.newsletters (status);

COMMIT;

-- 검증(🟢 읽기전용):
-- SELECT status, COUNT(*) FROM public.newsletters GROUP BY status;         -- 기존분 전부 published 확인
-- SELECT publish_year, publish_month, COUNT(*) FROM public.newsletters GROUP BY 1,2 ORDER BY 1 DESC,2 DESC;

-- 검색 노출 필터(총괄팀장 후속 PR, app.html):
--   newsletters 검색/미리보기 fetch에 status=eq.published 조건 추가.
--   (백필로 기존분 전부 published라 회귀 0. reviewing 초안만 검색에서 숨김.)
