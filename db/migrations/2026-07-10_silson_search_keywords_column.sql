-- ═══════════════════════════════════════════════════════════════════════════
-- 🟠 스키마 갭보강(ALTER ADD COLUMN) — 실비변천사(silson_generations)에
--    검색키워드 컬럼 1개(search_keywords text[]) 추가
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠️⚠️⚠️ 초안(DRAFT) — 대표 승인 전 실행 금지. 이 파일은 검토용이며 아직 적용되지 않았다. ⚠️⚠️⚠️
--   실제 반영 = production-db Environment 대표 1클릭 승인(workflow_dispatch) 자리. 본 PR 머지만으로 DB 변경 없음.
--
-- ⚠️ 대상 프로젝트(유일 진실 원천): onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
--    구버전(qursjteiovcylqiepmlo)은 2026-06-19 삭제됨 — 절대 참조 금지.
--
-- 목적:
--   실비변천사(코드 #v-silson / pages/silson-generations.html)를 원세컨드 유기체 기준 데이터로
--   승격하기 위해, 표시용(one_liner/notes)과 분리된 "검색용 키워드 배열"을 보관할 컬럼을 추가한다.
--   화면 표시 텍스트를 검색 매칭에 그대로 쓰지 않기 위한 표시용≠검색용 분리(검수 기준 4).
--
-- 진실 원천:
--   docs/work_orders/2026-07-09_reference_data_reconciliation.md §1-1(12번)·§2(갭보강 요약)
--   docs/work_orders/2026-07-09_silson_generations_ledger_v2.json (검색키워드 = 각 세대 text[] 배열)
--   base 스키마: db/migrations/2026-07-07_silson_generations_schema.sql (search_keywords 컬럼 부재 확인)
--
-- 타입 근거:
--   원장 v2 "검색키워드" = 문자열 배열(예: ["1세대","1세대 실손","구실손",...]) → text[] 로 매핑.
--   기존 컬럼은 1글자도 변경하지 않는다(무변경). 신규 컬럼 1개만 추가.
--
-- ⚠️ 선행 조건(검수 리스크): 이 ALTER 는 silson_generations 테이블이 운영 DB에 실재해야 성공한다.
--    base 스키마(2026-07-07_silson_generations_schema.sql)는 DRAFT 로 아직 미실행일 수 있으며,
--    테이블 부재 시 "relation \"silson_generations\" does not exist" 로 실패한다.
--    → 총괄 판단: (경로①) base 스키마 먼저 실행 후 이 ALTER / (경로②) base CREATE 에 컬럼 통합 반영.
--    적용 전 반드시 테이블 실재 여부를 확인한다.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- 멱등: 이미 존재하면 무시(재실행 안전)
alter table public.silson_generations
  add column if not exists search_keywords text[];

comment on column public.silson_generations.search_keywords is
  '검색용 키워드 배열(별칭·연도·제도용어). 표시용(one_liner/notes)과 분리. 원장 v2 검색키워드 매핑.';

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- DOWN / ROLLBACK (되돌리기) — 아래 블록의 주석을 해제해 실행하면 추가 컬럼이 제거된다.
--   ⚠️ 컬럼 삭제 시 적재된 검색키워드 데이터도 함께 소실되므로, 시드 적재 이후에는 신중히.
-- ═══════════════════════════════════════════════════════════════════════════
-- begin;
--   alter table public.silson_generations
--     drop column if exists search_keywords;
-- commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- 검증(🟢 읽기전용) — 적용 후 실행. 컬럼 존재·타입(ARRAY / udt _text) 확인.
--   (동반 사후검증: scripts/ci/postverify_2026-07-10_silson_search_keywords_column.sql)
-- ═══════════════════════════════════════════════════════════════════════════
-- select column_name, data_type, udt_name
--   from information_schema.columns
--  where table_schema='public' and table_name='silson_generations'
--    and column_name='search_keywords';
--   PASS 기대: search_keywords | ARRAY | _text
