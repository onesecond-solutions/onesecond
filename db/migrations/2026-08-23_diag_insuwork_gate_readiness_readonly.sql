-- 🟢 읽기전용 진단 — 보험워크(insuwork) 게이트 전체 개방 준비도 실사 (변경 0)
-- ═══════════════════════════════════════════════════════════════════════════
-- 대표 지시(2026-08-23): 보험브리핑/워크스테이션(현 "보험워크"/insuwork)을 현재 단일
--   파일럿 계정(98c5f4f9-10c1-4ee1-a656-5c2ca63239fd / bylts@naver.com / 임태성)에서
--   전체 등록 사용자로 확대 개방하기 전, 각 사용자의 레거시 화면(자료실·업무노트·
--   MY SPACE·고객관리·상담·캘린더) 데이터가 신규 통합 테이블(insuwork_items /
--   insuwork_customers / insuwork_consultations / insuwork_tasks)로 얼마나
--   이관됐는지, 그리고 파일럿 외 owner 데이터의 공개/비공개(visibility) 격리 상태를
--   읽기 전용으로 확인한다.
--
-- ⚠️ no-op 마이그레이션(select 1). 실제 진단은 동반 postverify가 RAISE NOTICE 로 출력:
--   [0] public.users 컬럼 구조 확인(introspection).
--   [1] public.users 전체 role별 분포 + 총 사용자 수(auth.users 대조 포함).
--   [2] 레거시 7개 테이블(library/scripts/myspace_folders/myspace_files/
--       sales_customers/sales_consultations/calendar_events) 각각 distinct
--       owner(또는 author) 수 + 총 행 수.
--   [3] 레거시 테이블별 owner단위 legacy_count vs insuwork_* 쪽 migrated_count
--       비교(gap = legacy_count - migrated_count, gap≠0 = 이관 누락 의심).
--   [4] insuwork_* 4개 테이블 각각 총 distinct owner 수 + owner별
--       직접작성(legacy_source IS NULL) vs 이관(legacy_source IS NOT NULL) 분해.
--   [5] insuwork_items 중 파일럿 외 owner 행의 visibility(public/private) 분해.
--   모두 SELECT/COUNT/introspection 뿐 — 데이터·스키마 변경 0. 각 구간 측정은
--   예외 가드로 서로 독립.
--
-- ⚠️ 대상: onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
-- ═══════════════════════════════════════════════════════════════════════════

begin;
select 1;  -- no-op
commit;

-- DOWN / ROLLBACK: 되돌릴 변경 없음(no-op).
