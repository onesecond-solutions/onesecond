-- ▶ 실행 요청 — ★단, 별도 "테스트" Supabase 프로젝트에서만. 운영(pdnwgzneooyygfejrvbg) 절대 금지.
-- 결제·본인인증 통합 테스트용 최소 기반 스키마 + seed (완전한 한 세트). 운영 47명·콘텐츠 복사 0.
-- 실행: 이 파일(BEGIN…COMMIT) 1회 → 이어서 RPC 2파일(아래 [실행 순서]) → 검증.
--
-- [실행 순서]
--   1) (이 파일) 기반 스키마 + 테이블 완전체 + seed
--   2) docs/migrations/2026-06-21_signup_token_rpc.sql   (signup_tokens ALTER는 no-op + RPC 3개)
--   3) docs/migrations/2026-06-21_apply_payment_event_rpc.sql
-- [트랜잭션] 이 파일 전체 BEGIN…COMMIT 1 트랜잭션(실패 시 전체 롤백, 부분 적용 0).
-- [멱등] create … if not exists / on conflict do nothing / drop constraint if exists → 재실행 안전.
-- [롤백] 실패 시 COMMIT 안 됨 → 변경 0. 수동 롤백 불요.
-- [초기화] 테스트 종료 후 ✅ 아래 '초기화' 블록(주석)으로 데이터만 truncate.

begin;

-- ── is_admin() (RLS 의존) ──
create or replace function public.is_admin() returns boolean
  language sql security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'admin');
$$;

-- ── 조직 (최소) ──
create table if not exists public.companies (id uuid primary key default gen_random_uuid(), name text not null, created_at timestamptz not null default now());
create table if not exists public.branches  (id uuid primary key default gen_random_uuid(), company_id uuid references public.companies(id), name text not null, created_at timestamptz not null default now());
create table if not exists public.teams     (id uuid primary key default gen_random_uuid(), branch_id uuid references public.branches(id), name text not null, created_at timestamptz not null default now());

-- ── users (최소 + 본인인증 컬럼) ──
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text, name text, phone text,
  role text not null default 'ga_member', status text not null default 'active', plan text not null default 'free',
  company_id uuid, branch_id uuid, team_id uuid, deleted_at timestamptz,
  phone_normalized text, phone_verified_at timestamptz, phone_verification_provider text,
  verification_id text, verification_status text,
  created_at timestamptz not null default now()
);
create unique index if not exists uq_users_phone_norm on public.users (phone_normalized) where phone_normalized is not null and deleted_at is null;

-- ── plans / subscriptions(완전체) / payments / payment_events / refunds / signup_tokens ──
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
  billing_cycle text not null, amount integer not null, currency text not null default 'KRW',
  is_active boolean not null default true, features jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.plans drop constraint if exists chk_plans_cycle;
alter table public.plans add constraint chk_plans_cycle check (billing_cycle in ('month','year'));

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id),
  plan_id text, billing_key text, status text not null default 'pending',
  started_at timestamptz, next_billing_at timestamptz, last_payment_at timestamptz, last_payment_id text,
  cancel_at_period_end boolean not null default false, canceled_at timestamptz, cancellation_reason text,
  current_period_start timestamptz, current_period_end timestamptz, retry_count integer not null default 0, last_failure_code text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create unique index if not exists uq_sub_active_user on public.subscriptions (user_id) where status in ('pending','active','past_due');

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(), payment_id text not null unique,
  user_id uuid not null references public.users(id), subscription_id uuid references public.subscriptions(id),
  plan_id text, amount integer not null, currency text not null default 'KRW', status text not null,
  provider text not null default 'portone', provider_transaction_id text, failure_code text, paid_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(), event_id text not null unique, payment_id text, subscription_id uuid,
  event_type text not null, payload_hash text, processing_status text not null default 'pending', error_code text,
  processed_at timestamptz, created_at timestamptz not null default now());

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(), refund_id text not null unique, payment_id text not null,
  amount integer not null, reason text, status text not null, refunded_at timestamptz, created_at timestamptz not null default now());

create table if not exists public.signup_tokens (
  id uuid primary key default gen_random_uuid(), token_hash text not null unique, verification_id text not null,
  phone_normalized text not null, state text, expires_at timestamptz not null, consumed_at timestamptz,
  status text not null default 'issued', created_user_id uuid, created_at timestamptz not null default now());
alter table public.signup_tokens drop constraint if exists chk_signup_tokens_status;
alter table public.signup_tokens add constraint chk_signup_tokens_status check (status in ('issued','processing','consumed'));

-- ── RLS (운영과 동일 골격) ──
alter table public.plans enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.refunds enable row level security;
alter table public.signup_tokens enable row level security;
drop policy if exists plans_admin on public.plans;
create policy plans_admin on public.plans for select to authenticated using (is_admin());
create or replace view public.plans_public as select code,name,billing_cycle,amount,currency,is_active,features from public.plans where is_active;
grant select on public.plans_public to authenticated, anon;
drop policy if exists pay_select_own on public.payments;
create policy pay_select_own on public.payments for select to authenticated using (auth.uid()=user_id or is_admin());
drop policy if exists pe_admin_read on public.payment_events;
create policy pe_admin_read on public.payment_events for select to authenticated using (is_admin());
drop policy if exists rf_admin_read on public.refunds;
create policy rf_admin_read on public.refunds for select to authenticated using (is_admin());

-- ── seed (가짜 조직·plans·테스트 사용자) — 고정 UUID로 멱등 ──
insert into public.companies (id,name) values ('11111111-1111-1111-1111-111111111111','테스트금융') on conflict (id) do nothing;
insert into public.branches  (id,company_id,name) values ('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','테스트지점') on conflict (id) do nothing;
insert into public.teams     (id,branch_id,name) values ('33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222','테스트1팀') on conflict (id) do nothing;
insert into public.plans (code,name,billing_cycle,amount) values
  ('free','무료','month',0),('plus','플러스','month',9900),('pro','프로','month',19900) on conflict (code) do nothing;
insert into public.users (id,email,name,role,status,plan,company_id,branch_id,team_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001','test-admin@example.com','테스트관리자','admin','active','free','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333'),
  ('aaaaaaaa-0000-0000-0000-000000000002','test-user@example.com','테스트사용자','ga_member','active','free','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333')
  on conflict (id) do nothing;

commit;

-- ════════════════════════════════════════════════════════════════
-- ✅ 검증용 (별도 RUN, 조회만)
-- select table_name from information_schema.tables where table_schema='public'
--   and table_name in ('companies','branches','teams','users','plans','subscriptions','payments','payment_events','refunds','signup_tokens');  -- 10건
-- select code,amount from public.plans order by amount;  -- free0/plus9900/pro19900
-- select count(*) from public.users;  -- 2(테스트)
--
-- ✅ 테스트 종료 후 초기화(데이터만, 스키마 유지) — 별도 RUN
-- truncate public.payment_events, public.payments, public.refunds, public.subscriptions, public.signup_tokens restart identity;
-- update public.users set plan='free', phone_verified_at=null, phone_normalized=null, verification_id=null;
-- ════════════════════════════════════════════════════════════════
