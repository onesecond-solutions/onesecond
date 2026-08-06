-- 🟠 데이터변경(RLS 정책 추가) — sales_strategy anon(비로그인) 공개 읽기: published 행만
-- 목적: 소식지(newsletters)와 동일하게, 영업방향·전략 목록이 토큰 만료/비인증 상태에서도 뜨도록
--       anon SELECT(published 한정) 정책 추가. (기존 authenticated 정책은 무변경)
--   · 화면 진입은 여전히 _canSeeSalesStrategy(임태성 게이트)로 제한 — 카드 자체는 임태성만 봄.
--   · 파일 원본/미리보기는 private 버킷 서명 URL로만 열림 — anon은 제목·회사 메타만 읽고 파일 다운로드 불가.
--   · 소식지 anon 정책(2026-07-09_anon_public_read_newsletters_scripts.sql) 패턴 그대로.
-- ⚠️ 실행 전 확인: Supabase 프로젝트 = onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
-- ⚠️ 화이트리스트 원칙: anon 읽기는 published 행만. INSERT/UPDATE/DELETE anon 정책 없음 = 쓰기 자동 차단.

BEGIN;

DROP POLICY IF EXISTS sales_strategy_select_anon_published ON public.sales_strategy;
CREATE POLICY sales_strategy_select_anon_published
  ON public.sales_strategy
  FOR SELECT
  TO anon
  USING (status = 'published');

COMMIT;

-- DOWN / ROLLBACK:
--   BEGIN;
--   DROP POLICY IF EXISTS sales_strategy_select_anon_published ON public.sales_strategy;
--   COMMIT;

-- 검증(🟢 읽기전용):
--   SELECT policyname, roles, cmd, qual FROM pg_policies
--     WHERE tablename='sales_strategy' AND 'anon' = ANY(roles);
--   -- SET LOCAL ROLE anon; SELECT count(*) FROM public.sales_strategy; RESET ROLE;   -- = published 건수
--   -- SET LOCAL ROLE anon; SELECT count(*) FROM public.sales_strategy WHERE status<>'published'; RESET ROLE;  -- 0 이어야
