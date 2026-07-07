-- ============================================================================
-- 실손 세대 정적 지식 스키마 — DDL 초안 (2026-07-07)
-- ⚠️ 실행 금지 (DRAFT). 대표 승인 + 프로젝트 pdnwgzneooyygfejrvbg(onesecond-v1-restore-0420)
--    확인 후에만, PR 파일로 검수 거쳐 실행. 본 파일은 설계 초안이며 자동 실행 대상 아님.
-- 진실 원천: docs/strategy/organism_architecture_v1.md
--            docs/work_orders/2026-07-07_silson_generation_db_pilot.md
--            docs/work_orders/2026-07-07_silson_pilot_design.md (전환 방식·검수 항목)
-- 원장 소스: docs/work_orders/2026-07-07_silson_generations_ledger.json (5 row)
--
-- 성격: 제도 지식 · 회사/상품 마스터에 안 붙는 독립 축(유기체 아키텍처 §2 뼈대).
--       approved/published 게이트를 통과한 row만 화면·검색·스마트 설계서 재사용.
-- ============================================================================

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

-- ── RLS 초안 (실행 시 프로젝트 표준 헬퍼 is_admin() 재사용) ──────────────────
-- 정적 제도 지식 = 전 사용자 읽기 가능하되, 게이트 통과분만 노출.
-- 쓰기는 admin(대표)만. (goji/lineup 검수 게이트와 동일 원칙)
alter table silson_generations enable row level security;

-- 읽기: approved/published만 전체 노출 · admin은 전체(초안 포함) 열람
create policy silson_generations_select_gated
  on silson_generations for select
  using ( status in ('approved','published') or is_admin() );

-- 쓰기(INSERT/UPDATE/DELETE): admin만
create policy silson_generations_write_admin
  on silson_generations for all
  using ( is_admin() )
  with check ( is_admin() );

-- ============================================================================
-- 시드는 별도 PR로 분리(검수 후):
--   docs/work_orders/2026-07-07_silson_generations_ledger.json 5 row →
--   status='reviewing' INSERT → 검수 → 'approved'/'published' 승격.
-- ⚠️ 본 파일에 INSERT 미포함 (스키마 초안만). 시드 INSERT도 실행 금지 게이트 적용.
-- ============================================================================
