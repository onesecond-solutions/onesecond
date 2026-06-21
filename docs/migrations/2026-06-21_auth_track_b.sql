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
  add column if not exists verification_status         text,        -- 'verified' 등
  add column if not exists provider_identity_key       text;        -- DI 해시(중복가입 키, 법적근거 검토 후 최소저장). CI·주민번호 미저장.

-- ════════════════════════════════════════════════════════════════
-- STEP 2 : 중복 가입 방지 (B-5) — ★STEP 0에서 기존 중복 0 확인 후 적용
--   phone_normalized 1인 1계정. 기존 데이터 중복 시 적용 보류 + 정리 정책 선행.
-- ════════════════════════════════════════════════════════════════
create unique index if not exists uq_users_phone_norm
  on public.users (phone_normalized) where phone_normalized is not null;
-- (선택) DI 해시 중복도 차단하려면:
-- create unique index if not exists uq_users_di on public.users (provider_identity_key) where provider_identity_key is not null;

-- ════════════════════════════════════════════════════════════════
-- STEP 3 : 검증 (별도 RUN)
-- ════════════════════════════════════════════════════════════════
-- select column_name from information_schema.columns where table_schema='public' and table_name='users'
--   and column_name in ('phone_normalized','phone_verified_at','phone_verification_provider','verification_id','verification_status','provider_identity_key');  -- 6건
-- select indexname from pg_indexes where indexname='uq_users_phone_norm';  -- 1건
