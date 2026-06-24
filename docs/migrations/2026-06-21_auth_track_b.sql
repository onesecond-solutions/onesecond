-- 트랙 B — 휴대폰 SMS 본인인증 DDL (설계 제안 / ★DB 미실행)
-- 신버전 pdnwgzneooyygfejrvbg. 실행은 대표님 결재 후.
-- 본인인증 PG = NHN KCP SMS (PortOne 경유). 결제 PG(KG이니시스)와 분리.
--
-- 라이브 현황: users.phone 존재(검증 없는 자유입력). 본인인증 컬럼(phone_verified_at/verification_*) 0건.
-- 원칙: 인증 완료 전 최종 계정 생성 금지(고아 방지) / 서버 재조회 후 확정 / 최소 저장(주민번호·CI 미저장).

-- ════════════════════════════════════════════════════════════════
-- STEP 0 : 선행 검증 (읽기 — phone_normalized UNIQUE 충돌 사전 확인)
-- ════════════════════════════════════════════════════════════════
-- select count(*) total, count(phone) has_phone from public.users;
-- ★기존 phone을 정규화했을 때 중복이 있으면 partial UNIQUE 생성 실패 → 정리/검토 선행:
-- select regexp_replace(phone,'[^0-9]','','g') norm, count(*) c from public.users
--   where phone is not null group by 1 having count(*)>1;

-- ════════════════════════════════════════════════════════════════
-- STEP 1 : users 본인인증 컬럼 추가 (최소 저장)
-- ════════════════════════════════════════════════════════════════
alter table public.users
  add column if not exists phone_normalized            text,        -- 숫자만(+82/하이픈 제거) 정규화 번호
  add column if not exists phone_verified_at           timestamptz, -- 본인인증 완료 시각
  add column if not exists phone_verification_provider text,        -- 'nhn_kcp'
  add column if not exists verification_id             text,        -- PortOne identityVerificationId
  add column if not exists verification_status         text;        -- 'verified' 등
-- §2 DI 저장 최소화: 초기엔 phone UNIQUE + verification_id 1회로 충분 → DI 컬럼 미생성(미저장).
--   향후 (번호변경 후 동일인 식별·탈퇴후 재가입 방지 등) 필요성·법적근거 확인되면 di_hash 별도 추가:
--   add column di_hash text;  -- service_role 전용·프론트 미반환·SELECT 금지·보유기간/처리방침 명시 후

-- ════════════════════════════════════════════════════════════════
-- STEP 2 : 중복 가입 방지 (B-5·보강 §1) — ★STEP 0에서 정규화 중복 0 확인 후 적용
--   ★일반 UNIQUE 금지 → 활성 계정(deleted_at IS NULL)만 1인 1번호. 탈퇴 계정 번호 재사용 허용.
--   기존 중복(STEP 0 (b)) 있으면 정리·검토 정책 선행. 테스트/관리자 계정 예외는 운영 정책으로.
-- ════════════════════════════════════════════════════════════════
create unique index if not exists uq_users_phone_norm
  on public.users (phone_normalized)
  where phone_normalized is not null and deleted_at is null;

-- ════════════════════════════════════════════════════════════════
-- STEP 3 : signup_tokens — 본인인증 후 가입용 서버 토큰 (보강 §5)
--   verify-identity(서버 재조회 통과)가 발급 → 가입 함수가 검증·consume. service_role 전용.
--   브라우저 인증 결과만으로 계정 생성 금지. 짧은 유효·1회·verification_id+phone 바인딩.
-- ════════════════════════════════════════════════════════════════
create table if not exists public.signup_tokens (
  id               uuid primary key default gen_random_uuid(),
  token_hash       text not null unique,         -- 토큰 원문 미저장(해시만)
  verification_id  text not null,                -- PortOne identityVerificationId 바인딩
  phone_normalized text not null,                -- 인증된 전화번호 바인딩
  state            text,                         -- state/nonce 검증값
  expires_at       timestamptz not null,         -- 짧은 유효(예: 발급 +10분)
  consumed_at      timestamptz,                  -- 1회 사용 표시(가입 완료 시 set)
  created_at       timestamptz not null default now()
);
create index if not exists idx_signup_tokens_exp on public.signup_tokens (expires_at);
-- RLS: 정책 없음 = service_role(서버)만. authenticated/anon 접근 0(클라가 토큰 못 읽음).
alter table public.signup_tokens enable row level security;

-- ════════════════════════════════════════════════════════════════
-- STEP 4 : 검증 (별도 RUN)
-- ════════════════════════════════════════════════════════════════
-- select column_name from information_schema.columns where table_schema='public' and table_name='users'
--   and column_name in ('phone_normalized','phone_verified_at','phone_verification_provider','verification_id','verification_status');  -- 5건
-- select indexname from pg_indexes where indexname='uq_users_phone_norm';  -- 1건(partial: deleted_at is null)
-- select table_name from information_schema.tables where table_schema='public' and table_name='signup_tokens';  -- 1건
