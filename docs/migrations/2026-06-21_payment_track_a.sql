-- 트랙 A — PortOne 정기구독 결제 DDL (설계 제안 / ★DB 미실행)
-- 신버전 pdnwgzneooyygfejrvbg. 실행은 대표님 결재 후. 라이브 subscriptions 실측 반영.
--
-- 라이브 현황(실측): subscriptions만 존재(plans/payments/payment_events/refunds 없음).
--   subscriptions 컬럼 = id,user_id,plan_id,billing_key,status,started_at,next_billing_at,
--     last_payment_at,last_payment_id,created_at,updated_at. RLS=본인 INSERT/SELECT+admin SELECT/UPDATE.
--   제약 = PK/plan_id check/status check/user_id FK (UNIQUE 없음).
-- 원칙: 금액=서버 plans 기준 / 권한=서버 검증 후에만 / 멱등(payment_id·event_id·refund_id UNIQUE).

-- ════════════════════════════════════════════════════════════════
-- STEP 0 : 선행 검증 (읽기 — 적용 전 충돌 확인)
-- ════════════════════════════════════════════════════════════════
-- select column_name,data_type from information_schema.columns where table_schema='public' and table_name='subscriptions' order by ordinal_position;
-- select user_id,count(*) from public.subscriptions where status in ('active','past_due') group by user_id having count(*)>1;  -- partial UNIQUE 충돌(있으면 정리 선행)
-- select to_regclass('public.users') as users_ok;  -- FK 대상

-- ════════════════════════════════════════════════════════════════
-- STEP 1 : plans — 요금·기능 단일 진실원천
-- ════════════════════════════════════════════════════════════════
create table if not exists public.plans (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,          -- 'free' | 'plus' | 'pro'
  name          text not null,
  billing_cycle text not null,                 -- 'month' | 'year'
  amount        integer not null,              -- KRW (원), free=0
  currency      text not null default 'KRW',
  is_active     boolean not null default true,
  features      jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.plans add constraint chk_plans_cycle check (billing_cycle in ('month','year'));

-- ════════════════════════════════════════════════════════════════
-- STEP 2 : payments — 결제 시도·결과 원장 (멱등)
-- ════════════════════════════════════════════════════════════════
create table if not exists public.payments (
  id                      uuid primary key default gen_random_uuid(),
  payment_id              text not null unique,            -- PortOne paymentId (멱등 키)
  user_id                 uuid not null references public.users(id),
  subscription_id         uuid references public.subscriptions(id),
  plan_id                 text,
  amount                  integer not null,
  currency                text not null default 'KRW',
  status                  text not null,                   -- paid|failed|canceled|refunded|partial_refunded
  provider                text not null default 'portone',
  provider_transaction_id text,
  failure_code            text,
  paid_at                 timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
alter table public.payments add constraint chk_payments_status
  check (status in ('paid','failed','canceled','refunded','partial_refunded'));
create index if not exists idx_payments_user on public.payments (user_id, created_at desc);
create index if not exists idx_payments_sub  on public.payments (subscription_id);

-- ════════════════════════════════════════════════════════════════
-- STEP 3 : payment_events — 웹훅·상태변경 이벤트 원장 (멱등, 원문 미저장)
-- ════════════════════════════════════════════════════════════════
create table if not exists public.payment_events (
  id                uuid primary key default gen_random_uuid(),
  event_id          text not null unique,                  -- 웹훅 이벤트 ID (멱등 키)
  payment_id        text,
  subscription_id   uuid,
  event_type        text not null,
  payload_hash      text,                                  -- 원문 전체 저장 금지 → 해시만
  processing_status text not null default 'pending',       -- pending|processed|failed
  error_code        text,
  processed_at      timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists idx_pe_payment on public.payment_events (payment_id);

-- ════════════════════════════════════════════════════════════════
-- STEP 4 : refunds — 환불 이력 (멱등)
-- ════════════════════════════════════════════════════════════════
create table if not exists public.refunds (
  id          uuid primary key default gen_random_uuid(),
  refund_id   text not null unique,
  payment_id  text not null,
  amount      integer not null,
  reason      text,
  status      text not null,                               -- requested|done|failed
  refunded_at timestamptz,
  created_at  timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════
-- STEP 5 : subscriptions 보강
--   ★사용자별 active/past_due 1개만 — 기존 중복 있으면 STEP 0에서 먼저 정리.
-- ════════════════════════════════════════════════════════════════
alter table public.subscriptions
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists canceled_at          timestamptz,
  add column if not exists cancellation_reason  text,
  add column if not exists current_period_start timestamptz,
  add column if not exists current_period_end   timestamptz,
  add column if not exists retry_count          integer not null default 0,
  add column if not exists last_failure_code    text;
-- partial UNIQUE 대상 = 진행형 상태만(pending/active/past_due). canceled·expired는 새 구독 허용.
create unique index if not exists uq_sub_active_user
  on public.subscriptions (user_id) where status in ('pending','active','past_due');

-- ════════════════════════════════════════════════════════════════
-- STEP 6 : RLS (대표 보강 §3·§4)
--   plans 원본 = admin만(내부 PG설정·테스트값 비공개) / 공개는 plans_public view(공개 항목만)
--   payment_events = admin/service만(일반 SELECT 금지) / payments·refunds = 본인+admin 정제 조회
--   쓰기(INSERT/UPDATE)는 정책 없음 = service_role(서버 Edge Function)만.
-- ════════════════════════════════════════════════════════════════
alter table public.plans          enable row level security;
alter table public.payments       enable row level security;
alter table public.payment_events enable row level security;
alter table public.refunds        enable row level security;

-- §3 plans 원본은 admin만. 일반/공개에 전체 노출 금지.
drop policy if exists plans_read  on public.plans;
drop policy if exists plans_admin on public.plans;
create policy plans_admin on public.plans for select to authenticated using (is_admin());
-- 공개용 view — 공개 가능 항목만(상품명·표시가격·주기·판매여부·공개기능). 내부 PG설정·메모 제외.
create or replace view public.plans_public as
  select code, name, billing_cycle, amount, currency, is_active, features
  from public.plans where is_active = true;
grant select on public.plans_public to authenticated, anon;

-- §4 payments = 본인+admin 읽기(민감·비밀값 컬럼 없음). 쓰기는 service_role만.
drop policy if exists pay_select_own on public.payments;
create policy pay_select_own on public.payments for select to authenticated using (auth.uid() = user_id or is_admin());

-- §4 payment_events = admin/service 전용(일반 사용자 SELECT 금지). 원문 payload 미저장(해시만).
drop policy if exists pe_admin_read on public.payment_events;
create policy pe_admin_read on public.payment_events for select to authenticated using (is_admin());

-- refunds = 본인+admin 읽기.
drop policy if exists rf_admin_read on public.refunds;
drop policy if exists rf_select_own on public.refunds;
create policy rf_select_own on public.refunds for select to authenticated
  using (is_admin() or exists (select 1 from public.payments p where p.payment_id = refunds.payment_id and p.user_id = auth.uid()));

-- ════════════════════════════════════════════════════════════════
-- STEP 7 : 검증 (별도 RUN)
-- ════════════════════════════════════════════════════════════════
-- select table_name from information_schema.tables where table_schema='public' and table_name in ('plans','payments','payment_events','refunds');  -- 4건
-- select indexname from pg_indexes where indexname='uq_sub_active_user';  -- 1건
-- select conname from pg_constraint where conname in ('payments_payment_id_key','payment_events_event_id_key','refunds_refund_id_key');  -- UNIQUE 3건
