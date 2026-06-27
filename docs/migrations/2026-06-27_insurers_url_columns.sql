-- ============================================================
-- insurers 마스터 — 회사별 URL 컬럼 (홈페이지·청구) + 삼성화재 데이터
-- ============================================================
-- 작성: 2026-06-27 / 총괄팀장(Code). 대표님 Supabase Dashboard DDL 결재 필요.
-- 거버넌스(§5): insurers = 회사×URL 단일 source. 신규 테이블 신설 금지. 컬럼 신설 = 대표님 결재.
-- 회사 허브 코드는 이미 배선됨(insurers.home_url/claim_url fetch, 컬럼 없으면 안전 무시 → "준비 중").
-- 이 SQL 실행 후 = 회사 허브에서 삼성화재 콜센터에 '홈페이지 바로가기', 청구는 새창 링크 자동 동작.
--
-- ⚠️ 실행 전 확인: insurers 테이블에 name='삼성화재' 행이 있어야 UPDATE가 먹음.
--    (없으면 0행 — 회사 허브는 그대로 "준비 중" 유지, 사고 아님)
-- ============================================================

-- 1) URL 컬럼 추가 (가산적·비파괴, 멱등)
ALTER TABLE public.insurers ADD COLUMN IF NOT EXISTS home_url  text;   -- 회사 공식 홈페이지
ALTER TABLE public.insurers ADD COLUMN IF NOT EXISTS claim_url text;   -- 보험금 청구 페이지(새창)

-- 2) 삼성화재 (기준 샘플) — 웹 확보(공식 samsungfire.com)
UPDATE public.insurers
SET home_url  = 'https://www.samsungfire.com',
    claim_url = 'https://www.samsungfire.com/claim/P_P03_01_01_001.html'
WHERE name = '삼성화재';

-- 3) 검증 (별도 RUN)
-- SELECT name, home_url, claim_url FROM public.insurers WHERE name='삼성화재';
--    기대: 두 URL 채워짐. 회사 허브에서 삼성화재 검색 시 홈페이지·청구 링크 활성.

-- ============================================================
-- [나머지 회사 확대 — 대표님 결재 후 같은 틀로 채움]
-- 회사명(insurers.name) 기준 UPDATE만 추가하면 됨. 예시 골격:
-- UPDATE public.insurers SET home_url='...', claim_url='...' WHERE name='현대해상';
-- UPDATE public.insurers SET home_url='...', claim_url='...' WHERE name='DB손해보험';
-- ... (생보 20 + 손보 13, 정규화 회사명 기준 / URL은 Code가 웹에서 추가 확보 예정)
-- ============================================================
