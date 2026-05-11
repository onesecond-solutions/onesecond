-- ============================================================================
-- 별 트랙 #46 — home_v2 signup 모달 select 동적 lookup 전환
-- 정책 신설: insurers_select_anon_signup
-- 신설 일자: 2026-05-11
-- 실행 위치: Supabase Dashboard SQL Editor (신버전 onesecond-v1-restore-0420)
-- 실행 결과: Success. No rows returned (팀장님 직접 실행 확인)
-- ============================================================================
--
-- 배경:
--   기존 정책 insurers_select_anon_domain_check 는 domain IS NOT NULL 인 row만
--   anon role 에 노출. 그 결과 DB생명 / iM라이프 / KB라이프 (domain=NULL 3건)는
--   signup 모달(비인증 anon)에서 select 옵션 자체가 노출되지 않음.
--
--   본 슬롯의 본진은 4팀 오픈(5/15) 직전 home_v2 signup 모달이 insurers 마스터
--   31건을 모두 안정적으로 노출하는 것. domain NULL 보험사도 일단 옵션은 노출되되
--   선택 시 INSURER_DOMAINS 화이트리스트(home_v2.html L1804~1834) 차단 로직이
--   "도메인 확인 진행 중" 안내로 가입을 막음 — 이건 별 트랙 #43 (추정 도메인
--   사후 검증) 정합 동작이라 본 슬롯에서는 그대로 유지.
--
-- 정책 결합:
--   PostgreSQL RLS 는 동일 테이블·동일 명령·동일 role 의 복수 정책을 OR 로 결합.
--   따라서 기존 insurers_select_anon_domain_check 와 OR 공존 →
--   anon role 은 (domain IS NOT NULL) OR (is_active = true) 인 row 조회 가능 →
--   결과적으로 is_active=true 31건 전체 노출.
--
-- 기존 정책 유지 이유:
--   anon_domain_check 정책이 signup 외 다른 흐름(예: 외부 진입로)에서 의존 가능성
--   불확실. 신설 추가만으로 본 슬롯 목표 달성 가능하므로 기존 정책은 그대로 둠.
--
-- ----------------------------------------------------------------------------

CREATE POLICY insurers_select_anon_signup
ON public.insurers
FOR SELECT
TO anon
USING (is_active = true);

-- ----------------------------------------------------------------------------
-- 검증 쿼리 (참고용 — 실제 실행은 위 정책만):
--
--   -- anon role 시뮬레이션 (Supabase Dashboard 에서는 직접 anon 컨텍스트 불가
--   -- → fetch /rest/v1/insurers 라이브 호출로 검증)
--   --
--   -- 31건 노출 확인:
--   SELECT COUNT(*) FROM public.insurers WHERE is_active = true;  -- expected: 31
--   --
--   -- domain NULL 3건 (DB생명 / iM라이프 / KB라이프) 노출 확인:
--   SELECT slug, name FROM public.insurers
--   WHERE is_active = true AND domain IS NULL ORDER BY name;
-- ============================================================================
