-- 🟢 읽기전용 진단 — 업무노트 목록 쿼리 2.2초 잔여 원인(RLS 비용) 정밀 진단 (변경 0)
-- ═══════════════════════════════════════════════════════════════════════════
-- 대표 지시(2026-07-27): 인덱스(#1470) 후에도 scripts/library 경량 목록 쿼리가 ~2.2초.
--   owner_id 인덱스는 이미 존재 → 순수 인덱스 부재 아님. RLS 정책 비용 의심 → EXPLAIN ANALYZE로 규명.
--
-- ⚠️ no-op 마이그레이션(select 1). 실제 진단은 동반 postverify가 RAISE NOTICE 로 출력:
--   1) scripts/library RLS 정책(roles·qual·with_check) 덤프 — 비싼 함수/서브쿼리 여부 육안 확인.
--   2) authenticated 롤 + 임태성 JWT(request.jwt.claims sub) 세팅 후 EXPLAIN(ANALYZE,BUFFERS)
--      = RLS 적용된 실제 플랜/시간. (postgres 접속롤은 RLS 우회라 롤 전환 필수)
--   3) 대조: 새 인덱스(idx_scripts_owner_active_created 등) 사용 여부.
--   모두 SELECT/EXPLAIN 뿐 — 데이터·스키마 변경 0. 예외는 postverify DO 블록이 내부 처리.
--
-- ⚠️ 대상: onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
-- ═══════════════════════════════════════════════════════════════════════════

begin;
select 1;  -- no-op
commit;

-- DOWN / ROLLBACK: 되돌릴 변경 없음(no-op 진단).
-- begin; select 1; commit;
