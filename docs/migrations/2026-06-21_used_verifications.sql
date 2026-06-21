-- used_verifications — 휴대폰 본인인증 verificationId 1회용 보장(로그인·가입 공통 재사용 차단)
-- ★DB 미실행(테스트 프로젝트 검증 후 PR). service_role 전용(RLS 정책 없음).
-- complete-phone-login(로그인)이 insert로 선점 → 중복 verificationId = 차단.
-- (가입은 signup_tokens가 verification_id UNIQUE로 이미 차단 — 본 테이블은 로그인 경로용/공통 감사)

create table if not exists public.used_verifications (
  verification_id  text primary key,
  purpose          text not null check (purpose in ('login','signup')),
  phone_normalized text,
  used_at          timestamptz not null default now()
);
alter table public.used_verifications enable row level security;
-- 정책 없음 = service_role(Edge)만 접근. anon/authenticated 차단.

-- 검증(✅): select count(*) from public.used_verifications;
