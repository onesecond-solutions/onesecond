-- ═══════════════════════════════════════════════════════════════════════════
-- 🟠 스키마 생성 — 보장분석 4축 공통 구조(coverage_*) 통합 DDL
--    표준 계약서 v1 §2 ERD 그대로: 마스터 1 + 공통코어 6 + 확장 6 + 개인 3 (계 16 테이블)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠️⚠️⚠️ 초안(DRAFT) — 대표 승인 전 실행 금지. 이 파일은 검토용이며 아직 적용되지 않았다. ⚠️⚠️⚠️
--   실제 반영 = production-db Environment 대표 1클릭 승인(db-migrate.yml workflow_dispatch) 자리.
--   본 PR 머지만으로 DB 변경 없음. db-migrate.yml 트리거 금지. 파일 준비만.
--
-- ⚠️ 대상 프로젝트(유일 진실 원천): onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
--    구버전(qursjteiovcylqiepmlo)은 2026-06-19 삭제됨 — 절대 참조 금지.
--
-- 진실 원천(따를 것):
--   docs/product/coverage_analysis_common_schema_v1.md
--     §2 ERD(테이블·필드) · §3 2축 게이트(status+exposure) · §6 판정 라벨 4값 · §10 롤백.
--
-- 설계 요지:
--   · category = 마스터 coverage_categories.slug 참조(FK). 코어 구조는 전 축 공통, 확장은 특정 축만 채움.
--   · 공용 지식 테이블 = 2축 게이트: status(draft→reviewing→approved→published) + exposure(customer_ok/internal_only/customer_blocked).
--     고객 노출 = status ∈(approved,published) AND exposure='customer_ok' (RLS 서버 강제). 그 외 클라 차단.
--   · 판정 라벨(result_level) = 부족 / 확인필요 / 점검필요 / 충분 (4값 CHECK, 대표 원지시 확정).
--   · 개인 원장(holdings/results/lead) = owner_id 격리(공용 지식과 물리 분리). sales_customers 는 FK 참조만(직접 insert 금지).
--   · 의료실비(medical) = 별도 확장 테이블 신설 없이 기존 라이브 silson_generations 재사용(스키마 미접촉). 여기서는 category 1행만 확보.
--
-- 관례 정합(기존 코드 기준 실측):
--   · owner_id = text (프로젝트 표준: RLS `(auth.uid())::text = owner_id`. scripts/sales_customers 동일).
--   · sales_customers.id = uuid (Supabase 기본 · sales import 로더에서 c.id → sales_consultations.customer_id 로 흐름).
--     → customer_id uuid references public.sales_customers(id). (⚠️ live PK 타입 uuid 전제 — 상이 시 총괄 검토.)
--   · is_admin() = 프로젝트 표준 RLS 헬퍼(라이브 배포 확인됨 전제 · silson/scripts 동일 참조).
--
-- 멱등성: create extension/table/index/function = if not exists / create or replace,
--         trigger·policy = drop ... if exists 후 create → 재실행 안전.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create extension if not exists pgcrypto;

-- ── 공용 updated_at 자동 갱신 함수(전 테이블 공유) ─────────────────────────────
create or replace function set_coverage_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 2-1. 마스터 : coverage_categories
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists coverage_categories (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique
               check (slug in ('cancer','brain_heart','surgery','medical')),
  name         text not null,
  description  text,
  sort_order   int not null default 0,
  status       text not null default 'draft'
               check (status in ('draft','reviewing','approved','published')),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_coverage_categories_gate on coverage_categories (status, sort_order);

drop trigger if exists trg_coverage_categories_updated_at on coverage_categories;
create trigger trg_coverage_categories_updated_at
  before update on coverage_categories
  for each row execute function set_coverage_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
-- 2-2. 공통 코어 (전 축 공유)
-- ════════════════════════════════════════════════════════════════════════════

-- ── coverage_facts : 통계·제도 수치 원장 ─────────────────────────────────────
create table if not exists coverage_facts (
  id            uuid primary key default gen_random_uuid(),
  category      text not null references coverage_categories(slug),
  fact_group    text,
  fact_key      text not null,
  label         text,
  value_num     numeric,
  value_text    text,
  unit          text,
  display_text  text,
  usage         jsonb not null default '[]'::jsonb,
  source_name   text,
  publisher     text,
  source_url    text,
  as_of         text,
  review_status text,            -- 원장 원값(reviewed_official/needs_source_url_verification/customer_ok/internal_only/blocked/reviewing)
  status        text not null default 'draft'
                check (status in ('draft','reviewing','approved','published')),
  exposure      text not null default 'internal_only'
                check (exposure in ('customer_ok','internal_only','customer_blocked')),
  published_at  timestamptz,
  display_order int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (category, fact_key)
);
create index if not exists idx_coverage_facts_gate  on coverage_facts (category, status, exposure);
create index if not exists idx_coverage_facts_group on coverage_facts (category, fact_group, display_order);

drop trigger if exists trg_coverage_facts_updated_at on coverage_facts;
create trigger trg_coverage_facts_updated_at
  before update on coverage_facts
  for each row execute function set_coverage_updated_at();

-- ── coverage_treatments : 치료·시술 비용/공백 ────────────────────────────────
create table if not exists coverage_treatments (
  id                 uuid primary key default gen_random_uuid(),
  category           text not null references coverage_categories(slug),
  organ_group        text,               -- nullable (뇌/심장 등만 사용)
  method             text not null,
  subtype            text,
  coverage_type      text,               -- 급여 / 비급여 / 급여+비급여 혼재
  cost_min           numeric,
  cost_max           numeric,
  cost_unit          text,
  display_cost       text,
  insurance_gap_note text,
  source_name        text,
  source_url         text,
  review_status      text,
  status             text not null default 'draft'
                     check (status in ('draft','reviewing','approved','published')),
  exposure           text not null default 'internal_only'
                     check (exposure in ('customer_ok','internal_only','customer_blocked')),
  published_at       timestamptz,
  display_order      int not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (category, method, subtype)
);
create index if not exists idx_coverage_treatments_gate  on coverage_treatments (category, status, exposure);
create index if not exists idx_coverage_treatments_organ on coverage_treatments (category, organ_group, display_order);

drop trigger if exists trg_coverage_treatments_updated_at on coverage_treatments;
create trigger trg_coverage_treatments_updated_at
  before update on coverage_treatments
  for each row execute function set_coverage_updated_at();

-- ── coverage_quiz_questions : 자가진단 문항 ──────────────────────────────────
create table if not exists coverage_quiz_questions (
  id            uuid primary key default gen_random_uuid(),
  category      text not null references coverage_categories(slug),
  question_key  text not null,
  step          int not null default 0,
  question_text text not null,
  sub_text      text,
  options       jsonb not null default '[]'::jsonb,
  status        text not null default 'draft'
                check (status in ('draft','reviewing','approved','published')),
  exposure      text not null default 'internal_only'
                check (exposure in ('customer_ok','internal_only','customer_blocked')),
  published_at  timestamptz,
  display_order int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (category, question_key)
);
create index if not exists idx_coverage_quiz_gate on coverage_quiz_questions (category, status, exposure);
create index if not exists idx_coverage_quiz_step on coverage_quiz_questions (category, step);

drop trigger if exists trg_coverage_quiz_updated_at on coverage_quiz_questions;
create trigger trg_coverage_quiz_updated_at
  before update on coverage_quiz_questions
  for each row execute function set_coverage_updated_at();

-- ── coverage_result_rules : 판정 규칙 (result_level 4값 CHECK) ────────────────
create table if not exists coverage_result_rules (
  id            uuid primary key default gen_random_uuid(),
  category      text not null references coverage_categories(slug),
  rule_key      text not null,
  condition     jsonb not null default '{}'::jsonb,
  result_level  text not null
                check (result_level in ('부족','확인필요','점검필요','충분')),
  title         text,
  message       text,
  cta_label     text,
  priority      int not null default 0,
  status        text not null default 'draft'
                check (status in ('draft','reviewing','approved','published')),
  exposure      text not null default 'internal_only'
                check (exposure in ('customer_ok','internal_only','customer_blocked')),
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (category, rule_key)
);
create index if not exists idx_coverage_result_rules_gate on coverage_result_rules (category, status, exposure);
create index if not exists idx_coverage_result_rules_prio on coverage_result_rules (category, priority);

drop trigger if exists trg_coverage_result_rules_updated_at on coverage_result_rules;
create trigger trg_coverage_result_rules_updated_at
  before update on coverage_result_rules
  for each row execute function set_coverage_updated_at();

-- ── coverage_page_blocks : 페이지 섹션 렌더 원장 ─────────────────────────────
create table if not exists coverage_page_blocks (
  id                uuid primary key default gen_random_uuid(),
  category          text not null references coverage_categories(slug),
  block_key         text not null,
  ui_type           text,
  title             text,
  data_dependencies jsonb not null default '[]'::jsonb,
  display_order     int not null default 0,
  status            text not null default 'draft'
                    check (status in ('draft','reviewing','approved','published')),
  exposure          text not null default 'internal_only'
                    check (exposure in ('customer_ok','internal_only','customer_blocked')),
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (category, block_key)
);
create index if not exists idx_coverage_page_blocks_gate on coverage_page_blocks (category, status, exposure);
create index if not exists idx_coverage_page_blocks_ord  on coverage_page_blocks (category, display_order);

drop trigger if exists trg_coverage_page_blocks_updated_at on coverage_page_blocks;
create trigger trg_coverage_page_blocks_updated_at
  before update on coverage_page_blocks
  for each row execute function set_coverage_updated_at();

-- ── coverage_report_blocks : 개인 현황표·종합 리포트 문구 원장 ───────────────
create table if not exists coverage_report_blocks (
  id           uuid primary key default gen_random_uuid(),
  category     text not null references coverage_categories(slug),
  block_key    text not null,
  title        text,
  template     text,
  usage        jsonb not null default '[]'::jsonb,
  status       text not null default 'draft'
               check (status in ('draft','reviewing','approved','published')),
  exposure     text not null default 'internal_only'
               check (exposure in ('customer_ok','internal_only','customer_blocked')),
  published_at timestamptz,
  display_order int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (category, block_key)
);
create index if not exists idx_coverage_report_blocks_gate on coverage_report_blocks (category, status, exposure);

drop trigger if exists trg_coverage_report_blocks_updated_at on coverage_report_blocks;
create trigger trg_coverage_report_blocks_updated_at
  before update on coverage_report_blocks
  for each row execute function set_coverage_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
-- 2-3. 축별 확장 모듈
-- ════════════════════════════════════════════════════════════════════════════

-- ── coverage_disease_tiers (뇌/심장) : 담보 범위 3단 ─────────────────────────
create table if not exists coverage_disease_tiers (
  id               uuid primary key default gen_random_uuid(),
  category         text not null references coverage_categories(slug),
  organ_group      text not null,
  tier_level       int not null,
  tier_label       text,
  coverage_name    text,
  code_range       text,
  includes         text[] not null default '{}',
  excludes         text[] not null default '{}',
  share_note       text,
  customer_warning text,
  review_status    text,
  status           text not null default 'draft'
                   check (status in ('draft','reviewing','approved','published')),
  exposure         text not null default 'internal_only'
                   check (exposure in ('customer_ok','internal_only','customer_blocked')),
  published_at     timestamptz,
  display_order    int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (category, organ_group, tier_level)
);
create index if not exists idx_coverage_disease_tiers_gate on coverage_disease_tiers (category, status, exposure);

drop trigger if exists trg_coverage_disease_tiers_updated_at on coverage_disease_tiers;
create trigger trg_coverage_disease_tiers_updated_at
  before update on coverage_disease_tiers
  for each row execute function set_coverage_updated_at();

-- ── coverage_special_care_rules (뇌/심장) : 산정특례 규칙 ────────────────────
create table if not exists coverage_special_care_rules (
  id              uuid primary key default gen_random_uuid(),
  category        text not null references coverage_categories(slug),
  rule_key        text not null,
  label           text,
  compare_with    text,
  duration_text   text,
  applies_when    text,
  exclusions      text[] not null default '{}',
  warning_message text,
  review_status   text,
  status          text not null default 'draft'
                  check (status in ('draft','reviewing','approved','published')),
  exposure        text not null default 'internal_only'
                  check (exposure in ('customer_ok','internal_only','customer_blocked')),
  published_at    timestamptz,
  display_order   int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (category, rule_key)
);
create index if not exists idx_coverage_special_care_gate on coverage_special_care_rules (category, status, exposure);

drop trigger if exists trg_coverage_special_care_updated_at on coverage_special_care_rules;
create trigger trg_coverage_special_care_updated_at
  before update on coverage_special_care_rules
  for each row execute function set_coverage_updated_at();

-- ── coverage_life_map (수술비) : 생애 수술 지도 ─────────────────────────────
create table if not exists coverage_life_map (
  id            uuid primary key default gen_random_uuid(),
  category      text not null references coverage_categories(slug),
  age_band      text not null,
  label         text,
  top_surgeries text[] not null default '{}',
  message       text,
  review_status text,
  status        text not null default 'draft'
                check (status in ('draft','reviewing','approved','published')),
  exposure      text not null default 'internal_only'
                check (exposure in ('customer_ok','internal_only','customer_blocked')),
  published_at  timestamptz,
  display_order int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (category, age_band)
);
create index if not exists idx_coverage_life_map_gate on coverage_life_map (category, status, exposure);

drop trigger if exists trg_coverage_life_map_updated_at on coverage_life_map;
create trigger trg_coverage_life_map_updated_at
  before update on coverage_life_map
  for each row execute function set_coverage_updated_at();

-- ── coverage_surgery_types (수술비) : 담보 유형 ─────────────────────────────
create table if not exists coverage_surgery_types (
  id             uuid primary key default gen_random_uuid(),
  category       text not null references coverage_categories(slug),
  type_key       text not null,
  type_name      text,
  payment_rule   text,
  coverage_style text,
  strength       text,
  example        text,
  caution        text,
  review_status  text,
  status         text not null default 'draft'
                 check (status in ('draft','reviewing','approved','published')),
  exposure       text not null default 'internal_only'
                 check (exposure in ('customer_ok','internal_only','customer_blocked')),
  published_at   timestamptz,
  display_order  int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (category, type_key)
);
create index if not exists idx_coverage_surgery_types_gate on coverage_surgery_types (category, status, exposure);

drop trigger if exists trg_coverage_surgery_types_updated_at on coverage_surgery_types;
create trigger trg_coverage_surgery_types_updated_at
  before update on coverage_surgery_types
  for each row execute function set_coverage_updated_at();

-- ── coverage_surgery_costs (수술비) : 수술별 비용/공백 (정규화 별도 유지) ────
create table if not exists coverage_surgery_costs (
  id            uuid primary key default gen_random_uuid(),
  category      text not null references coverage_categories(slug),
  surgery_key   text not null,
  surgery_name  text,
  coverage_type text,
  cost_min      numeric,
  cost_max      numeric,
  cost_unit     text,
  display_cost  text,
  gap_note      text,
  review_status text,
  status        text not null default 'draft'
                check (status in ('draft','reviewing','approved','published')),
  exposure      text not null default 'internal_only'
                check (exposure in ('customer_ok','internal_only','customer_blocked')),
  published_at  timestamptz,
  display_order int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (category, surgery_key)
);
create index if not exists idx_coverage_surgery_costs_gate on coverage_surgery_costs (category, status, exposure);

drop trigger if exists trg_coverage_surgery_costs_updated_at on coverage_surgery_costs;
create trigger trg_coverage_surgery_costs_updated_at
  before update on coverage_surgery_costs
  for each row execute function set_coverage_updated_at();

-- ── coverage_insurance_gap_rules (수술비) : 실손 공백 규칙 ──────────────────
create table if not exists coverage_insurance_gap_rules (
  id              uuid primary key default gen_random_uuid(),
  category        text not null references coverage_categories(slug),
  rule_key        text not null,
  label           text,
  condition_text  text,
  warning_message text,
  report_message  text,
  source          text,
  review_status   text,
  status          text not null default 'draft'
                  check (status in ('draft','reviewing','approved','published')),
  exposure        text not null default 'internal_only'
                  check (exposure in ('customer_ok','internal_only','customer_blocked')),
  published_at    timestamptz,
  display_order   int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (category, rule_key)
);
create index if not exists idx_coverage_insurance_gap_gate on coverage_insurance_gap_rules (category, status, exposure);

drop trigger if exists trg_coverage_insurance_gap_updated_at on coverage_insurance_gap_rules;
create trigger trg_coverage_insurance_gap_updated_at
  before update on coverage_insurance_gap_rules
  for each row execute function set_coverage_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
-- 2-4. 개인 원장 (owner_id 격리 · 공용 지식과 물리 분리)
--   sales_customers 는 FK 참조만(직접 insert 금지 → 상담관리 원장 무오염).
-- ════════════════════════════════════════════════════════════════════════════

-- ── customer_coverage_holdings : 고객 보장현황(추출/문진 기반) ──────────────
create table if not exists customer_coverage_holdings (
  id            uuid primary key default gen_random_uuid(),
  owner_id      text not null,
  customer_id   uuid references public.sales_customers(id) on delete cascade,
  category      text not null references coverage_categories(slug),
  fact_key      text,
  holding_value text,
  source_ref    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_cust_cov_holdings_owner    on customer_coverage_holdings (owner_id);
create index if not exists idx_cust_cov_holdings_customer on customer_coverage_holdings (customer_id);
create index if not exists idx_cust_cov_holdings_cat      on customer_coverage_holdings (owner_id, category);

drop trigger if exists trg_cust_cov_holdings_updated_at on customer_coverage_holdings;
create trigger trg_cust_cov_holdings_updated_at
  before update on customer_coverage_holdings
  for each row execute function set_coverage_updated_at();

-- ── coverage_customer_results : 종합 리포트 원장 자리(축별 판정 결과 스냅샷) ──
create table if not exists coverage_customer_results (
  id               uuid primary key default gen_random_uuid(),
  owner_id         text not null,
  customer_id      uuid references public.sales_customers(id) on delete cascade,
  category         text not null references coverage_categories(slug),
  result_level     text
                   check (result_level in ('부족','확인필요','점검필요','충분')),
  payload_snapshot jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_cov_cust_results_owner    on coverage_customer_results (owner_id);
create index if not exists idx_cov_cust_results_customer on coverage_customer_results (customer_id, category);

drop trigger if exists trg_cov_cust_results_updated_at on coverage_customer_results;
create trigger trg_cov_cust_results_updated_at
  before update on coverage_customer_results
  for each row execute function set_coverage_updated_at();

-- ── coverage_lead : 상담신청 리드(격리 → 상담관리 승격) ─────────────────────
create table if not exists coverage_lead (
  id           uuid primary key default gen_random_uuid(),
  owner_id     text not null,
  customer_id  uuid references public.sales_customers(id) on delete set null,
  category     text not null references coverage_categories(slug),
  result_level text
               check (result_level in ('부족','확인필요','점검필요','충분')),
  payload      jsonb not null default '{}'::jsonb,
  consent_at   timestamptz,
  status       text not null default 'new'
               check (status in ('new','reviewed','promoted','discarded')),
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_coverage_lead_owner  on coverage_lead (owner_id, status);
create index if not exists idx_coverage_lead_cust   on coverage_lead (customer_id);

drop trigger if exists trg_coverage_lead_updated_at on coverage_lead;
create trigger trg_coverage_lead_updated_at
  before update on coverage_lead
  for each row execute function set_coverage_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
-- RLS — 공용 지식 = 게이트 읽기 / admin 쓰기 · 개인 원장 = owner 격리
--   공용 read : status ∈(approved,published) AND exposure='customer_ok' (or is_admin())
--   공용 write: is_admin()
--   개인      : (auth.uid())::text = owner_id (or is_admin())
-- ════════════════════════════════════════════════════════════════════════════

-- ── 공용 지식 13 테이블 : 게이트 read + admin write ─────────────────────────
alter table coverage_categories          enable row level security;
alter table coverage_facts               enable row level security;
alter table coverage_treatments          enable row level security;
alter table coverage_quiz_questions      enable row level security;
alter table coverage_result_rules        enable row level security;
alter table coverage_page_blocks         enable row level security;
alter table coverage_report_blocks       enable row level security;
alter table coverage_disease_tiers       enable row level security;
alter table coverage_special_care_rules  enable row level security;
alter table coverage_life_map            enable row level security;
alter table coverage_surgery_types       enable row level security;
alter table coverage_surgery_costs       enable row level security;
alter table coverage_insurance_gap_rules enable row level security;

-- coverage_categories (게이트에 exposure 없음 → status 만)
drop policy if exists coverage_categories_select_gated on coverage_categories;
create policy coverage_categories_select_gated on coverage_categories for select
  using ( status in ('approved','published') or is_admin() );
drop policy if exists coverage_categories_write_admin on coverage_categories;
create policy coverage_categories_write_admin on coverage_categories for all
  using ( is_admin() ) with check ( is_admin() );

drop policy if exists coverage_facts_select_gated on coverage_facts;
create policy coverage_facts_select_gated on coverage_facts for select
  using ( (status in ('approved','published') and exposure = 'customer_ok') or is_admin() );
drop policy if exists coverage_facts_write_admin on coverage_facts;
create policy coverage_facts_write_admin on coverage_facts for all
  using ( is_admin() ) with check ( is_admin() );

drop policy if exists coverage_treatments_select_gated on coverage_treatments;
create policy coverage_treatments_select_gated on coverage_treatments for select
  using ( (status in ('approved','published') and exposure = 'customer_ok') or is_admin() );
drop policy if exists coverage_treatments_write_admin on coverage_treatments;
create policy coverage_treatments_write_admin on coverage_treatments for all
  using ( is_admin() ) with check ( is_admin() );

drop policy if exists coverage_quiz_select_gated on coverage_quiz_questions;
create policy coverage_quiz_select_gated on coverage_quiz_questions for select
  using ( (status in ('approved','published') and exposure = 'customer_ok') or is_admin() );
drop policy if exists coverage_quiz_write_admin on coverage_quiz_questions;
create policy coverage_quiz_write_admin on coverage_quiz_questions for all
  using ( is_admin() ) with check ( is_admin() );

drop policy if exists coverage_result_rules_select_gated on coverage_result_rules;
create policy coverage_result_rules_select_gated on coverage_result_rules for select
  using ( (status in ('approved','published') and exposure = 'customer_ok') or is_admin() );
drop policy if exists coverage_result_rules_write_admin on coverage_result_rules;
create policy coverage_result_rules_write_admin on coverage_result_rules for all
  using ( is_admin() ) with check ( is_admin() );

drop policy if exists coverage_page_blocks_select_gated on coverage_page_blocks;
create policy coverage_page_blocks_select_gated on coverage_page_blocks for select
  using ( (status in ('approved','published') and exposure = 'customer_ok') or is_admin() );
drop policy if exists coverage_page_blocks_write_admin on coverage_page_blocks;
create policy coverage_page_blocks_write_admin on coverage_page_blocks for all
  using ( is_admin() ) with check ( is_admin() );

drop policy if exists coverage_report_blocks_select_gated on coverage_report_blocks;
create policy coverage_report_blocks_select_gated on coverage_report_blocks for select
  using ( (status in ('approved','published') and exposure = 'customer_ok') or is_admin() );
drop policy if exists coverage_report_blocks_write_admin on coverage_report_blocks;
create policy coverage_report_blocks_write_admin on coverage_report_blocks for all
  using ( is_admin() ) with check ( is_admin() );

drop policy if exists coverage_disease_tiers_select_gated on coverage_disease_tiers;
create policy coverage_disease_tiers_select_gated on coverage_disease_tiers for select
  using ( (status in ('approved','published') and exposure = 'customer_ok') or is_admin() );
drop policy if exists coverage_disease_tiers_write_admin on coverage_disease_tiers;
create policy coverage_disease_tiers_write_admin on coverage_disease_tiers for all
  using ( is_admin() ) with check ( is_admin() );

drop policy if exists coverage_special_care_select_gated on coverage_special_care_rules;
create policy coverage_special_care_select_gated on coverage_special_care_rules for select
  using ( (status in ('approved','published') and exposure = 'customer_ok') or is_admin() );
drop policy if exists coverage_special_care_write_admin on coverage_special_care_rules;
create policy coverage_special_care_write_admin on coverage_special_care_rules for all
  using ( is_admin() ) with check ( is_admin() );

drop policy if exists coverage_life_map_select_gated on coverage_life_map;
create policy coverage_life_map_select_gated on coverage_life_map for select
  using ( (status in ('approved','published') and exposure = 'customer_ok') or is_admin() );
drop policy if exists coverage_life_map_write_admin on coverage_life_map;
create policy coverage_life_map_write_admin on coverage_life_map for all
  using ( is_admin() ) with check ( is_admin() );

drop policy if exists coverage_surgery_types_select_gated on coverage_surgery_types;
create policy coverage_surgery_types_select_gated on coverage_surgery_types for select
  using ( (status in ('approved','published') and exposure = 'customer_ok') or is_admin() );
drop policy if exists coverage_surgery_types_write_admin on coverage_surgery_types;
create policy coverage_surgery_types_write_admin on coverage_surgery_types for all
  using ( is_admin() ) with check ( is_admin() );

drop policy if exists coverage_surgery_costs_select_gated on coverage_surgery_costs;
create policy coverage_surgery_costs_select_gated on coverage_surgery_costs for select
  using ( (status in ('approved','published') and exposure = 'customer_ok') or is_admin() );
drop policy if exists coverage_surgery_costs_write_admin on coverage_surgery_costs;
create policy coverage_surgery_costs_write_admin on coverage_surgery_costs for all
  using ( is_admin() ) with check ( is_admin() );

drop policy if exists coverage_insurance_gap_select_gated on coverage_insurance_gap_rules;
create policy coverage_insurance_gap_select_gated on coverage_insurance_gap_rules for select
  using ( (status in ('approved','published') and exposure = 'customer_ok') or is_admin() );
drop policy if exists coverage_insurance_gap_write_admin on coverage_insurance_gap_rules;
create policy coverage_insurance_gap_write_admin on coverage_insurance_gap_rules for all
  using ( is_admin() ) with check ( is_admin() );

-- ── 개인 원장 3 테이블 : owner_id 격리 ──────────────────────────────────────
alter table customer_coverage_holdings enable row level security;
alter table coverage_customer_results  enable row level security;
alter table coverage_lead              enable row level security;

drop policy if exists customer_coverage_holdings_owner on customer_coverage_holdings;
create policy customer_coverage_holdings_owner on customer_coverage_holdings for all
  using ( (auth.uid())::text = owner_id or is_admin() )
  with check ( (auth.uid())::text = owner_id or is_admin() );

drop policy if exists coverage_customer_results_owner on coverage_customer_results;
create policy coverage_customer_results_owner on coverage_customer_results for all
  using ( (auth.uid())::text = owner_id or is_admin() )
  with check ( (auth.uid())::text = owner_id or is_admin() );

drop policy if exists coverage_lead_owner on coverage_lead;
create policy coverage_lead_owner on coverage_lead for all
  using ( (auth.uid())::text = owner_id or is_admin() )
  with check ( (auth.uid())::text = owner_id or is_admin() );

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- DOWN / ROLLBACK — 아래 블록의 주석을 해제해 실행하면 coverage_* 신규 16 테이블이 제거된다.
--   신규 경로라 기존(silson_generations·sales_customers 등) 무영향(계약서 §10).
--   ⚠️ 시드/개인 데이터 적재 이후에는 소실 주의. silson_generations 는 미접촉(여기서 안 지움).
-- ═══════════════════════════════════════════════════════════════════════════
-- begin;
--   drop table if exists coverage_lead cascade;
--   drop table if exists coverage_customer_results cascade;
--   drop table if exists customer_coverage_holdings cascade;
--   drop table if exists coverage_insurance_gap_rules cascade;
--   drop table if exists coverage_surgery_costs cascade;
--   drop table if exists coverage_surgery_types cascade;
--   drop table if exists coverage_life_map cascade;
--   drop table if exists coverage_special_care_rules cascade;
--   drop table if exists coverage_disease_tiers cascade;
--   drop table if exists coverage_report_blocks cascade;
--   drop table if exists coverage_page_blocks cascade;
--   drop table if exists coverage_result_rules cascade;
--   drop table if exists coverage_quiz_questions cascade;
--   drop table if exists coverage_treatments cascade;
--   drop table if exists coverage_facts cascade;
--   drop table if exists coverage_categories cascade;
--   drop function if exists set_coverage_updated_at();
-- commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- 검증(🟢 읽기전용) 동반: scripts/ci/postverify_2026-07-15_coverage_schema_all4.sql
-- ═══════════════════════════════════════════════════════════════════════════
