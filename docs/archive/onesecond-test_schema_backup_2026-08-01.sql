-- ============================================================================
-- onesecond-test 프로젝트 스키마 백업 (삭제 전 설계도 보존)
-- ----------------------------------------------------------------------------
-- 출처 프로젝트 : onesecond-test  (Supabase ref: gelbgtfiuhqdpnlwxqrs, ap-northeast-2)
-- 성격          : 문자인증(SMS verification) + 결제/구독(portone) 프로토타입 (미출시)
-- 백업 일시      : 2026-08-01
-- 백업 사유      : 유휴 Compute 상시 가동으로 월 ~$10 낭비 → 프로젝트 삭제 결정.
--                삭제 시 스키마 설계가 사라지므로, 향후 원세컨드에 문자인증/결제를
--                붙일 때 재사용할 "참고 설계도"로 구조만 보존한다.
-- 데이터 포함    : 없음 (실데이터 = 테스트 계정 2명 + 결제이벤트 7건 + 요금제 3건뿐,
--                고객 개인정보·운영 데이터 없음. 구조[DDL]만 캡처)
-- 캡처 범위      : public 스키마 12개 오브젝트의 컬럼 + 제약조건(PK/FK/UNIQUE/CHECK).
--                RLS 정책·인덱스·트리거·함수는 미포함(프로토타입이라 생략).
-- 주의          : 라이브 프로젝트는 onesecond-v1-restore-0420(pdnwgzneooyygfejrvbg).
--                이 파일은 그 라이브와 무관한 별도 테스트 프로젝트의 것이다.
-- ============================================================================


-- ─────────────────────────────────────────────────────────────
-- 조직/소속 골격
-- ─────────────────────────────────────────────────────────────

CREATE TABLE companies (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE branches (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id  uuid,
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE teams (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  branch_id   uuid,
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);


-- ─────────────────────────────────────────────────────────────
-- 사용자 + 문자(휴대폰) 인증
-- ─────────────────────────────────────────────────────────────

CREATE TABLE users (
  id                            uuid NOT NULL DEFAULT gen_random_uuid(),
  email                         text,
  name                          text,
  phone                         text,
  role                          text NOT NULL DEFAULT 'ga_member'::text,
  status                        text NOT NULL DEFAULT 'active'::text,
  plan                          text NOT NULL DEFAULT 'free'::text,
  company_id                    uuid,
  branch_id                     uuid,
  team_id                       uuid,
  deleted_at                    timestamptz,
  phone_normalized              text,
  phone_verified_at             timestamptz,
  phone_verification_provider   text,
  verification_id               text,
  verification_status           text,
  created_at                    timestamptz NOT NULL DEFAULT now()
);

-- 회원가입용 문자인증 토큰 (발급→처리→소비 상태머신)
CREATE TABLE signup_tokens (
  id                uuid NOT NULL DEFAULT gen_random_uuid(),
  token_hash        text NOT NULL,
  verification_id   text NOT NULL,
  phone_normalized  text NOT NULL,
  state             text,
  expires_at        timestamptz NOT NULL,
  consumed_at       timestamptz,
  status            text NOT NULL DEFAULT 'issued'::text,   -- issued | processing | consumed
  created_user_id   uuid,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- 인증 재사용 방지 기록 (verification_id 1회성 소비)
CREATE TABLE used_verifications (
  verification_id   text NOT NULL,
  purpose           text NOT NULL,                          -- login | signup
  phone_normalized  text,
  used_at           timestamptz NOT NULL DEFAULT now()
);


-- ─────────────────────────────────────────────────────────────
-- 요금제 / 구독 / 결제 (portone)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE plans (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  code           text NOT NULL,
  name           text NOT NULL,
  billing_cycle  text NOT NULL,                             -- month | year
  amount         integer NOT NULL,
  currency       text NOT NULL DEFAULT 'KRW'::text,
  is_active      boolean NOT NULL DEFAULT true,
  features       jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- plans_public: plans의 공개 컬럼만 노출하는 뷰(VIEW)로 추정.
--   컬럼 = code, name, billing_cycle, amount, currency, is_active, features
--   (제약조건 없음. 원본 뷰 정의는 별도 미캡처 — plans에서 위 컬럼만 SELECT하는 형태로 재작성 가능.)

CREATE TABLE subscriptions (
  id                     uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL,
  plan_id                text,
  billing_key            text,
  status                 text NOT NULL DEFAULT 'pending'::text,
  started_at             timestamptz,
  next_billing_at        timestamptz,
  last_payment_at        timestamptz,
  last_payment_id        text,
  cancel_at_period_end   boolean NOT NULL DEFAULT false,
  canceled_at            timestamptz,
  cancellation_reason    text,
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  retry_count            integer NOT NULL DEFAULT 0,
  last_failure_code      text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id                        uuid NOT NULL DEFAULT gen_random_uuid(),
  payment_id                text NOT NULL,
  user_id                   uuid NOT NULL,
  subscription_id           uuid,
  plan_id                   text,
  amount                    integer NOT NULL,
  currency                  text NOT NULL DEFAULT 'KRW'::text,
  status                    text NOT NULL,
  provider                  text NOT NULL DEFAULT 'portone'::text,
  provider_transaction_id   text,
  failure_code              text,
  paid_at                   timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- 결제 웹훅 이벤트 멱등 처리 로그
CREATE TABLE payment_events (
  id                 uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id           text NOT NULL,
  payment_id         text,
  subscription_id    uuid,
  event_type         text NOT NULL,
  payload_hash       text,
  processing_status  text NOT NULL DEFAULT 'pending'::text,
  error_code         text,
  processed_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE refunds (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  refund_id    text NOT NULL,
  payment_id   text NOT NULL,
  amount       integer NOT NULL,
  reason       text,
  status       text NOT NULL,
  refunded_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);


-- ─────────────────────────────────────────────────────────────
-- 제약조건 (PK / FK / UNIQUE / CHECK)
-- ─────────────────────────────────────────────────────────────

-- Primary keys
ALTER TABLE companies          ADD CONSTRAINT companies_pkey          PRIMARY KEY (id);
ALTER TABLE branches           ADD CONSTRAINT branches_pkey           PRIMARY KEY (id);
ALTER TABLE teams              ADD CONSTRAINT teams_pkey              PRIMARY KEY (id);
ALTER TABLE users              ADD CONSTRAINT users_pkey              PRIMARY KEY (id);
ALTER TABLE signup_tokens      ADD CONSTRAINT signup_tokens_pkey      PRIMARY KEY (id);
ALTER TABLE used_verifications ADD CONSTRAINT used_verifications_pkey PRIMARY KEY (verification_id);
ALTER TABLE plans              ADD CONSTRAINT plans_pkey              PRIMARY KEY (id);
ALTER TABLE subscriptions      ADD CONSTRAINT subscriptions_pkey      PRIMARY KEY (id);
ALTER TABLE payments           ADD CONSTRAINT payments_pkey           PRIMARY KEY (id);
ALTER TABLE payment_events     ADD CONSTRAINT payment_events_pkey     PRIMARY KEY (id);
ALTER TABLE refunds            ADD CONSTRAINT refunds_pkey            PRIMARY KEY (id);

-- Unique
ALTER TABLE payment_events ADD CONSTRAINT payment_events_event_id_key  UNIQUE (event_id);
ALTER TABLE payments       ADD CONSTRAINT payments_payment_id_key      UNIQUE (payment_id);
ALTER TABLE plans          ADD CONSTRAINT plans_code_key               UNIQUE (code);
ALTER TABLE refunds        ADD CONSTRAINT refunds_refund_id_key        UNIQUE (refund_id);
ALTER TABLE signup_tokens  ADD CONSTRAINT signup_tokens_token_hash_key UNIQUE (token_hash);

-- Foreign keys
ALTER TABLE branches      ADD CONSTRAINT branches_company_id_fkey      FOREIGN KEY (company_id)      REFERENCES companies(id);
ALTER TABLE teams         ADD CONSTRAINT teams_branch_id_fkey          FOREIGN KEY (branch_id)       REFERENCES branches(id);
ALTER TABLE payments      ADD CONSTRAINT payments_user_id_fkey         FOREIGN KEY (user_id)         REFERENCES users(id);
ALTER TABLE payments      ADD CONSTRAINT payments_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES subscriptions(id);
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_id_fkey    FOREIGN KEY (user_id)         REFERENCES users(id);

-- Check
ALTER TABLE plans              ADD CONSTRAINT chk_plans_cycle               CHECK (billing_cycle = ANY (ARRAY['month'::text, 'year'::text]));
ALTER TABLE signup_tokens      ADD CONSTRAINT chk_signup_tokens_status      CHECK (status       = ANY (ARRAY['issued'::text, 'processing'::text, 'consumed'::text]));
ALTER TABLE used_verifications ADD CONSTRAINT used_verifications_purpose_check CHECK (purpose    = ANY (ARRAY['login'::text, 'signup'::text]));

-- ============================================================================
-- 끝. (원본 프로젝트 삭제 후에도 이 파일로 스키마 골격을 재구축할 수 있다.)
-- ============================================================================
