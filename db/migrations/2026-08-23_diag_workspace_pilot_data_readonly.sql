-- 🟢 읽기전용 진단 — 워크스테이션 파일럿(임태성 계정) 데이터 실사 (변경 0)
-- ═══════════════════════════════════════════════════════════════════════════
-- 대표 지시(2026-08-23): 워크스테이션 파일럿 계정(bylts@naver.com / 임태성)의
--   workspace_items / workspace_customers / workspace_consultations / workspace_tasks
--   데이터가 ① 워크스테이션에서 직접작성한 것인지 ② 원세컨드 구버전 화면에서 끌려온
--   이관분(legacy_source)인지, ③ 혹시 다른 owner 데이터가 섞여 들어왔는지 확인한다.
--
-- ⚠️ no-op 마이그레이션(select 1). 실제 진단은 동반 postverify가 RAISE NOTICE 로 출력:
--   1) 4개 테이블 각각 (legacy_source[, item_type]) 별 active/trashed(또는 총) 건수 분해.
--   2) 4개 테이블 각각 파일럿(uid) 외 다른 owner_id 로 남은 행이 있는지(격리 확인) 카운트.
--   모두 SELECT 뿐 — 데이터·스키마 변경 0. 각 테이블 측정은 예외 가드로 서로 독립.
--
-- ⚠️ 대상: onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
-- ═══════════════════════════════════════════════════════════════════════════

begin;
select 1;  -- no-op
commit;

-- DOWN / ROLLBACK: 되돌릴 변경 없음(no-op).
