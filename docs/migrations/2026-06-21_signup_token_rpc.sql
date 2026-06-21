-- signup_tokens 발급/예약/확정 RPC (트랙 B) — 본인인증 후 가입용 서버 토큰 (2단계 소비)
-- 신버전 pdnwgzneooyygfejrvbg. ★DB 미실행. 선행: 2026-06-21_auth_track_b.sql(signup_tokens).
-- verify-identity가 issue / 가입 함수(complete-signup)가 reserve→(계정생성)→finalize.
-- ★대표 보강 §1: consume을 먼저 끝내지 않고, processing 선점 → 계정 생성 → 마지막 consumed.
--   중간 실패 시 재시도 안전·중복 auth.users 0·토큰 유실 0·이미 생성됐으면 기존 결과 수렴.
-- service_role 전용. 토큰 원문은 Edge 생성·해시만 DB.

-- ── signup_tokens 상태·생성결과 컬럼 보강 ──
alter table public.signup_tokens add column if not exists status          text not null default 'issued';  -- issued|processing|consumed
alter table public.signup_tokens add column if not exists created_user_id uuid;                            -- 생성된 user (수렴용)
alter table public.signup_tokens drop constraint if exists chk_signup_tokens_status;
alter table public.signup_tokens add constraint chk_signup_tokens_status check (status in ('issued','processing','consumed'));

-- ── 1) 발급 (verify-identity): verificationId 재사용 차단 + 해시 INSERT(status=issued) ──
create or replace function public.issue_signup_token(
  p_token_hash text, p_verification_id text, p_phone_normalized text, p_state text, p_ttl_seconds int default 600
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if exists (select 1 from public.signup_tokens where verification_id = p_verification_id) then
    raise exception 'verification_already_used';
  end if;
  insert into public.signup_tokens (token_hash, verification_id, phone_normalized, state, expires_at, status)
  values (p_token_hash, p_verification_id, p_phone_normalized, p_state, now() + make_interval(secs => p_ttl_seconds), 'issued');
end;
$$;

-- ── 2) 예약 (가입 함수 1단계): 검증 + processing 선점. 이미 진행/완료면 기존 결과로 수렴 ──
--   반환 proceed=true → 계정 생성 진행 / false → created_user_id로 수렴(중복 생성 금지)
create or replace function public.reserve_signup_token(
  p_token_hash text, p_verification_id text, p_phone_normalized text
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v public.signup_tokens%rowtype;
begin
  select * into v from public.signup_tokens where token_hash = p_token_hash for update;
  if not found                                 then raise exception 'token_invalid'; end if;
  if v.expires_at < now()                      then raise exception 'token_expired'; end if;
  if v.verification_id  <> p_verification_id   then raise exception 'token_binding_mismatch_vid'; end if;
  if v.phone_normalized <> p_phone_normalized  then raise exception 'token_binding_mismatch_phone'; end if;
  -- 이미 완료 → 기존 계정으로 수렴(새 계정 X)
  if v.status = 'consumed' then
    return jsonb_build_object('proceed', false, 'created_user_id', v.created_user_id, 'state','consumed');
  end if;
  -- 진행 중 + 계정 이미 있음 → 그 계정으로 수렴 / 계정 없음(앞 단계 크래시) → 재진행 허용(createUser 멱등)
  if v.status = 'processing' then
    if v.created_user_id is not null then
      return jsonb_build_object('proceed', false, 'created_user_id', v.created_user_id, 'state','processing');
    end if;
    return jsonb_build_object('proceed', true, 'phone_normalized', v.phone_normalized, 'state','retry');
  end if;
  -- issued → processing 선점
  update public.signup_tokens set status = 'processing' where id = v.id;
  return jsonb_build_object('proceed', true, 'phone_normalized', v.phone_normalized, 'state','reserved');
end;
$$;

-- ── 3) 확정 (가입 함수 마지막): 계정 생성 성공 후 consumed + created_user_id 기록 ──
create or replace function public.finalize_signup_token(p_token_hash text, p_user_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.signup_tokens
    set status = 'consumed', consumed_at = now(), created_user_id = p_user_id
    where token_hash = p_token_hash and status in ('processing','consumed');   -- consumed 재호출은 멱등
end;
$$;

-- 권한: service_role 전용. anon/authenticated/public 회수.
revoke all     on function public.issue_signup_token(text,text,text,text,int) from public;
revoke execute on function public.issue_signup_token(text,text,text,text,int) from anon, authenticated;
revoke all     on function public.reserve_signup_token(text,text,text)        from public;
revoke execute on function public.reserve_signup_token(text,text,text)        from anon, authenticated;
revoke all     on function public.finalize_signup_token(text,uuid)            from public;
revoke execute on function public.finalize_signup_token(text,uuid)            from anon, authenticated;

-- 검증(✅): select proname,prosecdef from pg_proc where proname in ('issue_signup_token','reserve_signup_token','finalize_signup_token');
