-- ═══════════════════════════════════════════════════════════════════════════
-- 🟠 스키마 갭보강(ALTER ADD COLUMN) — 상품 라인업에 대표 요청 3필드 추가
--    insurer_products.sort_order (노출순서)
--    insurer_product_snapshots.simple_std (간편일반여부)
--    insurer_product_snapshots.note (비고)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠️⚠️⚠️ 초안(DRAFT) — 대표 승인 전 실행 금지. 이 파일은 검토용이며 아직 적용되지 않았다. ⚠️⚠️⚠️
--   실제 반영 = production-db Environment 대표 1클릭 승인(workflow_dispatch) 자리. 본 PR 머지만으로 DB 변경 없음.
--
-- ⚠️ 대상 프로젝트(유일 진실 원천): onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
--    구버전(qursjteiovcylqiepmlo)은 2026-06-19 삭제됨 — 절대 참조 금지.
--
-- 목적:
--   상품 라인업(코드 ?view=product-lineup)을 원세컨드 유기체 기준 데이터로 승격하기 위해,
--   대표 11항목 중 기존 스키마에 없던 3필드(노출순서·간편일반여부·비고)를 컬럼으로 추가한다.
--   검색키워드(10번)는 기존 search_text 재사용(추가 0). 기존 컬럼은 무복제·무변경.
--
-- 진실 원천:
--   docs/work_orders/2026-07-09_reference_data_reconciliation.md §1-2(7·9·11번)·§2(갭보강 요약)
--   docs/work_orders/2026-07-09_product_lineup_gapfill_overlay.json (246 row · sort_order/간편일반/비고)
--   base 스키마: db/migrations/2026-07-03_product_lineup_schema.sql (3컬럼 부재 확인)
--
-- 타입 근거:
--   · insurer_products.sort_order → int default 0
--       (동일 스키마 insurer_companies.sort_order = `int default 0`, insurer_themes.sort_order 스타일 정합.
--        오버레이 sort_order = 원본 배열순 1..N 정수.)
--   · insurer_product_snapshots.simple_std → text + CHECK (아래 채택 근거 참조)
--       오버레이 "간편일반" = goji_type 파생. 전수 확인 고유값 = {'간편','일반', null} 3종뿐(그 외 값 0건).
--       → CHECK (simple_std in ('간편','일반')) 채택. Postgres CHECK 는 NULL 을 통과시키므로
--         null 값(파생 불가 상품) 적재도 안전하며, 오탈자·오값 유입만 차단한다(시드 실패 위험 없음).
--   · insurer_product_snapshots.note → text (오버레이 "비고" = 현재 빈 문자열, 사람 검수 자리).
--   기존 컬럼은 1글자도 변경하지 않는다(무변경). 신규 컬럼 3개만 추가.
--
-- ⚠️ 선행 조건(검수 리스크): 이 ALTER 는 insurer_products / insurer_product_snapshots 테이블이
--    운영 DB에 실재해야 성공한다. base 스키마(2026-07-03_product_lineup_schema.sql)는 DRAFT 로
--    아직 미실행일 수 있으며, 테이블 부재 시 "relation does not exist" 로 실패한다.
--    → 총괄 판단: (경로①) base 스키마 먼저 실행 후 이 ALTER / (경로②) base CREATE 에 컬럼 통합 반영.
--    적용 전 반드시 두 테이블 실재 여부를 확인한다.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── insurer_products.sort_order (노출순서) ───────────────────────────────────
-- 멱등: 이미 존재하면 무시(재실행 안전)
alter table public.insurer_products
  add column if not exists sort_order int default 0;

comment on column public.insurer_products.sort_order is
  '화면 노출순서(원본 배열순 1..N). 오버레이 sort_order 매핑.';

-- ── insurer_product_snapshots.simple_std (간편일반여부) ──────────────────────
alter table public.insurer_product_snapshots
  add column if not exists simple_std text;

-- CHECK 제약: 고유값 {간편,일반,null} 전수 확인 기반. NULL 은 통과(파생 불가 상품).
-- add constraint if not exists 문법이 없어, 중복 생성 방지를 위해 조건부로 추가.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'insurer_product_snapshots_simple_std_chk'
       and conrelid = 'public.insurer_product_snapshots'::regclass
  ) then
    alter table public.insurer_product_snapshots
      add constraint insurer_product_snapshots_simple_std_chk
      check (simple_std in ('간편','일반'));
  end if;
end $$;

comment on column public.insurer_product_snapshots.simple_std is
  '간편일반여부(goji_type 파생: 간편/일반/null). 오버레이 간편일반 매핑.';

-- ── insurer_product_snapshots.note (비고) ────────────────────────────────────
alter table public.insurer_product_snapshots
  add column if not exists note text;

comment on column public.insurer_product_snapshots.note is
  '비고(사람 검수 자리). 오버레이 비고 매핑.';

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- DOWN / ROLLBACK (되돌리기) — 아래 블록의 주석을 해제해 실행하면 추가분이 제거된다.
--   ⚠️ 컬럼 삭제 시 적재된 데이터도 함께 소실되므로, 시드 적재 이후에는 신중히.
-- ═══════════════════════════════════════════════════════════════════════════
-- begin;
--   alter table public.insurer_product_snapshots
--     drop constraint if exists insurer_product_snapshots_simple_std_chk;
--   alter table public.insurer_product_snapshots
--     drop column if exists note;
--   alter table public.insurer_product_snapshots
--     drop column if exists simple_std;
--   alter table public.insurer_products
--     drop column if exists sort_order;
-- commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- 검증(🟢 읽기전용) — 적용 후 실행. 3컬럼 존재·타입 확인.
--   (동반 사후검증: scripts/ci/postverify_2026-07-10_product_lineup_gapfill_columns.sql)
-- ═══════════════════════════════════════════════════════════════════════════
-- select table_name, column_name, data_type, column_default
--   from information_schema.columns
--  where table_schema='public'
--    and (
--      (table_name='insurer_products'          and column_name='sort_order')
--      or (table_name='insurer_product_snapshots' and column_name in ('simple_std','note'))
--    )
--  order by table_name, column_name;
--   PASS 기대(3행):
--     insurer_product_snapshots | note       | text    |
--     insurer_product_snapshots | simple_std | text    |
--     insurer_products          | sort_order | integer | 0
