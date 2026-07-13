-- ═══════════════════════════════════════════════════════════════════════════
-- 🟠 스키마 생성(CREATE TABLE + 인덱스 + 트리거 + RLS) — 실비변천사(silson_generations)
--    base 스키마 + 검색키워드(search_keywords text[]) 통합본 [경로②]
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ✅ 적용 완료(2026-07-11 CI db-migrate.yml, 테이블·search_keywords 컬럼 라이브 확인). 본 파일은 이력·참조용.
--   실제 반영 = production-db Environment 대표 1클릭 승인(workflow_dispatch) 자리에서 이미 실행됨.
--
-- ⚠️ 대상 프로젝트(유일 진실 원천): onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
--    구버전(qursjteiovcylqiepmlo)은 2026-06-19 삭제됨 — 절대 참조 금지.
--
-- 목적:
--   실비변천사(코드 #v-silson / pages/silson-generations.html)를 원세컨드 유기체 기준 데이터로
--   승격하기 위한 정적 지식 테이블을 생성한다.
--   실측 결과 silson_generations 테이블은 운영 DB에 부재(anon REST 404 PGRST205 확인)이므로,
--   ALTER 증분(경로①)이 아니라 base CREATE 에 검색키워드 컬럼을 처음부터 통합(경로②)해 통째 실행한다.
--   → 표시용(one_liner/notes)과 분리된 "검색용 키워드 배열"(search_keywords)을 처음부터 포함.
--     화면 표시 텍스트를 검색 매칭에 그대로 쓰지 않기 위한 표시용≠검색용 분리(검수 기준 4).
--
-- 진실 원천:
--   docs/strategy/organism_architecture_v1.md
--   docs/work_orders/2026-07-07_silson_generation_db_pilot.md
--   docs/work_orders/2026-07-07_silson_pilot_design.md (전환 방식·검수 항목)
--   base DDL: db/migrations/2026-07-07_silson_generations_schema.sql (본 파일이 CI 실행 규격으로 정리)
--   검색키워드 원장: docs/work_orders/2026-07-09_silson_generations_ledger_v2.json (검색키워드 = 각 세대 text[])
--
-- 경로 판단 근거(실측):
--   · silson_generations = 테이블 부재 → 경로②(통합 CREATE) 채택.
--   · 기존 ALTER 파일 db/migrations/2026-07-10_silson_search_keywords_column.sql 과 그 postverify 는
--     경로② 채택으로 미사용(본 통합 파일로 대체). 삭제 여부는 총괄 판단. (본 파일이 그 역할을 흡수)
--
-- 성격: 제도 지식 · 회사/상품 마스터에 안 붙는 독립 축(유기체 아키텍처 §2 뼈대).
--       approved/published 게이트를 통과한 row만 화면·검색·스마트 설계서 재사용.
--
-- ⚠️ RLS 헬퍼 전제: 아래 RLS 정책은 프로젝트 표준 헬퍼 is_admin() 을 참조한다.
--    is_admin() 헬퍼가 라이브 DB에 실재하는 것을 전제로 한다(라이브 배포 확인됨 가정).
--    부재 시 create policy 단계에서 "function is_admin() does not exist" 로 실행 실패한다.
--    (참고: db/migrations/2026-07-10_scripts_manager_update_delete_scope.sql 도 동일 헬퍼 사용 · 라이브 배포 확인됨.)
--
-- 멱등성: create extension/table/index/function 은 if not exists / create or replace,
--         trigger·policy 는 drop ... if exists 후 create → 재실행 안전.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create extension if not exists pgcrypto;

-- ── silson_generations : 실손 1~5세대 제도 지식 (회사 무관 독립 축) ──────────
create table if not exists silson_generations (
  id            uuid primary key default gen_random_uuid(),

  -- 식별·정렬
  gen           smallint not null unique,          -- 세대 번호 1~5 (자연키)
  name          text not null,                     -- 표시명(예: "5세대 실손")
  sort_order    int not null default 0,            -- 화면 정렬순서

  -- 기간·판정 경계 (judgeGen(date) 재사용 핵심)
  range_label   text not null,                     -- 표시용 기간(예: "2026.5.6~")
  valid_from    date,                              -- 세대 시작 경계(포함). null = 최하한(1세대)
  valid_to      date,                              -- 세대 종료 경계(포함). null = 현행(5세대)

  -- 세대별 제도 축 (하드코딩 표 8행 + 카드 축을 그대로)
  rejoin_cycle       text,   -- 재가입 주기
  renewal_cycle      text,   -- 갱신 주기
  copay_inpatient    text,   -- 입원 자기부담
  copay_outpatient   text,   -- 통원 공제금액
  outpatient_limit   text,   -- 통원 한도(1일)
  inpatient_limit    text,   -- 입원 한도(연간)
  nonpayment_struct  text,   -- 비급여 구조
  premium_surcharge  text,   -- 보험료 할증
  one_liner          text,   -- 한 줄 정리

  -- 검색용 키워드 배열 (표시용 one_liner/notes 와 분리 · 원장 v2 검색키워드 매핑) ─ 경로② 통합 컬럼
  search_keywords    text[], -- 별칭·연도·제도용어 배열. 사용자가 세대를 찾을 때 입력할 표현.

  -- 심층 메모 · 판정 보조
  notes         text,        -- 세대별 심층 설명(카드/패널 요지)
  boundary_note text,        -- 경계 판정 유의(예: 2세대 2013-04-01 내부 분기)
  source        text,        -- 출처 근거

  -- 검수·발행 게이트 (organism §5 · 방향확정 2번: approved/published 통일)
  status        text not null default 'draft'
                check (status in ('draft','reviewing','approved','published')),
  published_at  timestamptz,

  -- 메타
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 이미 존재하는 테이블에도 검색키워드 컬럼을 보강(멱등 · 부분 적용 상태 안전).
alter table silson_generations
  add column if not exists search_keywords text[];

comment on column silson_generations.search_keywords is
  '검색용 키워드 배열(별칭·연도·제도용어). 표시용(one_liner/notes)과 분리. 원장 v2 검색키워드 매핑.';

-- 화면·검색·스마트 설계서는 게이트 통과분만 조회 (approved 또는 published)
create index if not exists idx_silson_generations_gate
  on silson_generations (status, sort_order);

-- 판정(judgeGen) 범위 조회 가속
create index if not exists idx_silson_generations_range
  on silson_generations (valid_from, valid_to);

-- updated_at 자동 갱신 트리거 (선택 — 프로젝트 표준 있으면 그걸 재사용)
create or replace function set_silson_generations_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_silson_generations_updated_at on silson_generations;
create trigger trg_silson_generations_updated_at
  before update on silson_generations
  for each row execute function set_silson_generations_updated_at();

-- ── RLS (프로젝트 표준 헬퍼 is_admin() 재사용 · 위 헬퍼 전제 주석 참조) ────────
-- 정적 제도 지식 = 전 사용자 읽기 가능하되, 게이트 통과분만 노출.
-- 쓰기는 admin(대표)만. (goji/lineup 검수 게이트와 동일 원칙)
alter table silson_generations enable row level security;

-- 읽기: approved/published만 전체 노출 · admin은 전체(초안 포함) 열람
drop policy if exists silson_generations_select_gated on silson_generations;
create policy silson_generations_select_gated
  on silson_generations for select
  using ( status in ('approved','published') or is_admin() );

-- 쓰기(INSERT/UPDATE/DELETE): admin만
drop policy if exists silson_generations_write_admin on silson_generations;
create policy silson_generations_write_admin
  on silson_generations for all
  using ( is_admin() )
  with check ( is_admin() );

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- DOWN / ROLLBACK (되돌리기) — 아래 블록의 주석을 해제해 실행하면 테이블·함수가 제거된다.
--   ⚠️ 테이블 삭제 시 적재된 세대 지식·검색키워드 데이터도 함께 소실되므로, 시드 적재 이후에는 신중히.
-- ═══════════════════════════════════════════════════════════════════════════
-- begin;
--   drop table if exists silson_generations cascade;   -- 트리거·정책·인덱스 동반 제거
--   drop function if exists set_silson_generations_updated_at();
-- commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- 시드는 별도 PR로 분리(검수 후):
--   docs/work_orders/2026-07-09_silson_generations_ledger_v2.json 5 row →
--   status='reviewing' INSERT(검색키워드 포함) → 검수 → 'approved'/'published' 승격.
-- ⚠️ 본 파일에 INSERT 미포함 (스키마 생성만). 시드 INSERT도 실행 금지 게이트 적용.
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 검증(🟢 읽기전용) — 적용 후 실행.
--   (동반 사후검증: scripts/ci/postverify_2026-07-10_silson_generations_schema_with_search.sql)
-- ═══════════════════════════════════════════════════════════════════════════
-- select column_name, data_type, udt_name
--   from information_schema.columns
--  where table_schema='public' and table_name='silson_generations'
--    and column_name='search_keywords';
--   PASS 기대: search_keywords | ARRAY | _text
-- select relrowsecurity from pg_class where oid='public.silson_generations'::regclass;   -- t 기대
-- select policyname from pg_policies where schemaname='public' and tablename='silson_generations';
--   PASS 기대: silson_generations_select_gated · silson_generations_write_admin
