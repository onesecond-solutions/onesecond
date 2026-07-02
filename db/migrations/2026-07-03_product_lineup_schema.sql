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
-- [추가7] security_invoker=on → 뷰가 호출자 RLS를 우회하지 않음(스냅샷 published 정책 그대로 적용).
create or replace view insurer_products_current with (security_invoker = on) as
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
security invoker              -- [추가6] 호출자 RLS 적용 → draft 월은 스냅샷 정책이 0건 반환
set search_path = public     -- [추가6] search_path 고정
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

-- ── 10. RLS (보완 2026-07-03: published 게이트 DB 강제 · 발행변경 admin/service_role) ──
-- 정책 분리: 고유정보(회사·상품·테마)는 공개 SELECT / 월별 스냅샷·테마·발행월은 published만 SELECT.
--   → draft 월 정보는 스냅샷·테마·lineup_months 레벨에서 차단되므로, 고유정보와 조인돼도 draft는 노출 0.

-- published 월/스냅샷 판별 헬퍼 (SECURITY DEFINER: lineup_months RLS 재귀 회피 + search_path 고정)
create or replace function insurer_is_published_month(m date)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from insurer_lineup_months where base_month = m and status = 'published');
$$;
create or replace function insurer_is_published_snapshot(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from insurer_product_snapshots s
    where s.id = sid and insurer_is_published_month(s.base_month)
  );
$$;
-- 관리자 판별은 기존 프로젝트 헬퍼 is_admin()(SECURITY DEFINER) 재사용 (없으면 선행 정의 필요).

alter table insurer_companies               enable row level security;
alter table insurer_company_snapshots       enable row level security;
alter table insurer_products                enable row level security;
alter table insurer_product_snapshots       enable row level security;
alter table insurer_themes                  enable row level security;
alter table insurer_product_snapshot_themes enable row level security;
alter table insurer_lineup_months           enable row level security;

-- 고유정보(공개 SELECT) — 회사·상품·테마 마스터 (draft 결합은 아래 스냅샷 정책이 차단)
create policy insurer_companies_sel on insurer_companies for select to authenticated using (true);
create policy insurer_products_sel  on insurer_products  for select to authenticated using (true);
create policy insurer_themes_sel    on insurer_themes    for select to authenticated using (true);

-- [보완1] 상품 월별 스냅샷 — published 월만 SELECT
create policy insurer_product_snapshots_sel_pub on insurer_product_snapshots
  for select to authenticated using (insurer_is_published_month(base_month));

-- [보완2] 회사 월별 스냅샷 — published 월만 SELECT
create policy insurer_company_snapshots_sel_pub on insurer_company_snapshots
  for select to authenticated using (insurer_is_published_month(base_month));

-- [추가4] 스냅샷×테마 — published 스냅샷에 연결된 테마만 SELECT (draft snapshot 테마 미노출)
create policy insurer_snapshot_themes_sel_pub on insurer_product_snapshot_themes
  for select to authenticated using (insurer_is_published_snapshot(snapshot_id));

-- [보완3] 발행 게이트 — 일반 authenticated는 published 월만 조회. 상태변경/등록/삭제는 admin만.
--   service_role은 RLS 우회 → 소식지식 Edge Function 경유가 기본 발행 경로. 일반 authenticated 직접 UPDATE 권한 없음.
create policy insurer_lineup_months_sel on insurer_lineup_months
  for select to authenticated using (status = 'published' or is_admin());
create policy insurer_lineup_months_upd_admin on insurer_lineup_months
  for update to authenticated using (is_admin()) with check (is_admin());
create policy insurer_lineup_months_ins_admin on insurer_lineup_months
  for insert to authenticated with check (is_admin());
create policy insurer_lineup_months_del_admin on insurer_lineup_months
  for delete to authenticated using (is_admin());

-- 회사·상품·스냅샷·테마 쓰기(insert/update/delete) 정책은 미부여 = 일반 authenticated 차단.
--   기본 등록/수정 경로 = service_role Edge Function(RLS 우회). admin 직접 편집 허용 시 각 테이블에 is_admin() 정책 추가.
-- 과거 월 이력 보존: 스냅샷은 append-only 운영(발행 후 archived 전이). UPDATE/DELETE 정책 미부여로 일반 경로 수정·삭제 0.

-- ⚠️ 검증(별도 RUN): select current_database();  -- pdnwgzneooyygfejrvbg 확인
-- ⚠️ 뷰 RLS 주의: Supabase에서 뷰는 소유자 권한 실행 → 필요 시 security_invoker=on(PG15+) 검토.
