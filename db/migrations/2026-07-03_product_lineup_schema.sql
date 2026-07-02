-- ============================================================================
-- 원수사 상품 라인업 스키마 — DDL 초안 (2026-07-03)
-- ⚠️ 실행 금지 (DRAFT). 대표 승인 + 프로젝트 pdnwgzneooyygfejrvbg(onesecond-v1-restore-0420)
--    확인 후에만, PR 파일로 검수 거쳐 실행. 본 파일은 설계 초안이며 자동 실행 대상 아님.
-- 진실 원천: docs/work_orders/2026-07-03_product_lineup_schema_search_design.md
-- 소식지 파이프라인과 동일한 월 단위 published 검수 게이트.
-- ============================================================================

create extension if not exists pgcrypto;

-- ── 7. 기준월 발행 게이트 (먼저 생성 — 스냅샷이 FK 참조) ──────────────────────
create table if not exists insurer_lineup_months (
  base_month   date primary key,                    -- 기준월(예: 2026-07-01)
  status       text not null default 'draft'
               check (status in ('draft','reviewing','published','archived')),
  published_at timestamptz,
  note         text
);

-- ── 1. 회사 고유(불변) ───────────────────────────────────────────────────────
create table if not exists insurer_companies (
  id         uuid primary key default gen_random_uuid(),
  name       text unique not null,
  section    text not null check (section in ('life','nonlife')),
  color      text,
  color2     text,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── 2. 회사×월(월별 변경: 캐치프레이즈·컴플라이언스·소식지 출처) ──────────────
create table if not exists insurer_company_snapshots (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references insurer_companies(id) on delete cascade,
  base_month  date not null references insurer_lineup_months(base_month),
  catchphrase text,
  compliance  text,
  source_doc  text,
  created_at  timestamptz default now(),
  unique (company_id, base_month)
);

-- ── 3. 상품 고유(불변 정체성) ────────────────────────────────────────────────
create table if not exists insurer_products (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references insurer_companies(id) on delete cascade,
  name          text not null,
  product_group text,                                -- 상품군(화면 그룹 키). 월별 변동 확인 시 스냅샷 이관.
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique (company_id, name)
);

-- ── 4. 상품×월(월별 변경값) ──────────────────────────────────────────────────
create table if not exists insurer_product_snapshots (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references insurer_products(id) on delete cascade,
  base_month  date not null references insurer_lineup_months(base_month),
  age         text,
  features    text,
  goji_type   text,
  badge       text check (badge in ('NEW','HOT')),   -- null 허용
  status      text,                                  -- 판매중·판매중지·개정예정 등
  source_page text,
  created_at  timestamptz default now(),
  unique (product_id, base_month)
);

-- ── 5. 테마 통제 어휘 마스터 ─────────────────────────────────────────────────
create table if not exists insurer_themes (
  key        text primary key,                       -- 유병자·간편 / 암 / 종신 ...
  label      text not null,
  sort_order int default 0
);

-- ── 6. 스냅샷×테마 연결 (★상품 아닌 스냅샷 기준 — 테마 월별 변동 수용) ────────
create table if not exists insurer_product_snapshot_themes (
  snapshot_id uuid not null references insurer_product_snapshots(id) on delete cascade,
  theme_key   text not null references insurer_themes(key),
  primary key (snapshot_id, theme_key)
);

-- ── 인덱스 ───────────────────────────────────────────────────────────────────
create index if not exists idx_prodsnap_month   on insurer_product_snapshots(base_month);
create index if not exists idx_prodsnap_product on insurer_product_snapshots(product_id);
create index if not exists idx_products_company  on insurer_products(company_id);
create index if not exists idx_cosnap_month      on insurer_company_snapshots(base_month);
create index if not exists idx_snapthemes_theme  on insurer_product_snapshot_themes(theme_key);

-- ── 8. VIEW: 최신 published 월 전용 (파라미터 없음 — 단일 원천 가상 조인) ─────
create or replace view insurer_products_current as
with cur as (
  select max(base_month) as m from insurer_lineup_months where status='published'
)
select
  p.id                as product_id,
  p.name              as product_name,
  p.product_group,
  c.id                as company_id,
  c.name              as company_name,
  c.section,
  c.color, c.color2,
  s.base_month,
  s.age, s.features, s.goji_type, s.badge, s.status, s.source_page,
  cs.catchphrase, cs.compliance, cs.source_doc,
  coalesce(
    (select array_agg(t.theme_key order by th.sort_order)
       from insurer_product_snapshot_themes t
       join insurer_themes th on th.key=t.theme_key
      where t.snapshot_id = s.id), '{}') as themes
from insurer_products p
join cur on true
join insurer_product_snapshots s on s.product_id=p.id and s.base_month=cur.m
join insurer_companies c on c.id=p.company_id
left join insurer_company_snapshots cs on cs.company_id=c.id and cs.base_month=cur.m;

-- ── 9. RPC: 특정 월 조회 (published 월만 허용 — current 뷰와 책임 분리) ───────
create or replace function insurer_products_for_month(p_month date)
returns table (
  product_id uuid, product_name text, product_group text,
  company_id uuid, company_name text, section text, color text, color2 text,
  base_month date, age text, features text, goji_type text, badge text, status text, source_page text,
  catchphrase text, compliance text, source_doc text, themes text[]
)
language sql stable
as $$
  select
    p.id, p.name, p.product_group,
    c.id, c.name, c.section, c.color, c.color2,
    s.base_month, s.age, s.features, s.goji_type, s.badge, s.status, s.source_page,
    cs.catchphrase, cs.compliance, cs.source_doc,
    coalesce(
      (select array_agg(t.theme_key order by th.sort_order)
         from insurer_product_snapshot_themes t
         join insurer_themes th on th.key=t.theme_key
        where t.snapshot_id = s.id), '{}')
  from insurer_products p
  join insurer_product_snapshots s on s.product_id=p.id and s.base_month=p_month
  join insurer_lineup_months m on m.base_month=p_month and m.status='published'   -- 비published 월 → 빈 결과
  join insurer_companies c on c.id=p.company_id
  left join insurer_company_snapshots cs on cs.company_id=c.id and cs.base_month=p_month;
$$;

-- ── 10. RLS (초안) ───────────────────────────────────────────────────────────
-- 읽기 = 로그인 사용자(설계사 전용). 쓰기 = service_role/admin만(소식지 등록 통로 사상).
alter table insurer_companies              enable row level security;
alter table insurer_company_snapshots      enable row level security;
alter table insurer_products               enable row level security;
alter table insurer_product_snapshots      enable row level security;
alter table insurer_themes                 enable row level security;
alter table insurer_product_snapshot_themes enable row level security;
alter table insurer_lineup_months          enable row level security;

-- 읽기 정책(공통) — authenticated 전원 SELECT (published 필터는 뷰/RPC/앱이 담당)
do $$
declare t text;
begin
  foreach t in array array[
    'insurer_companies','insurer_company_snapshots','insurer_products',
    'insurer_product_snapshots','insurer_themes','insurer_product_snapshot_themes','insurer_lineup_months'
  ] loop
    execute format(
      'create policy %I on %I for select to authenticated using (true);',
      t||'_sel_auth', t);
  end loop;
end $$;
-- 쓰기 정책은 service_role(RLS 우회) 또는 admin 전용 RPC로. 일반 사용자 insert/update/delete 정책 미부여 = 차단.

-- ⚠️ 검증(별도 RUN): select current_database();  -- pdnwgzneooyygfejrvbg 확인
-- ⚠️ 뷰 RLS 주의: Supabase에서 뷰는 소유자 권한 실행 → 필요 시 security_invoker=on(PG15+) 검토.
