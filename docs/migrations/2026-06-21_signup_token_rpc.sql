-- signup_tokens 발급/소비 RPC (트랙 B) — 본인인증 후 가입용 서버 토큰
-- 신버전 pdnwgzneooyygfejrvbg. ★DB 미실행. 선행: 2026-06-21_auth_track_b.sql(signup_tokens).
-- verify-identity Edge Function이 issue_signup_token 호출 / 가입 함수가 consume_signup_token 호출.
-- service_role 전용. 토큰 원문은 Edge가 생성·해시만 DB 저장.

-- ── 발급: verificationId 재사용 차단 + 토큰 해시 INSERT ──
create or replace function public.issue_signup_token(
  p_token_hash       text,
  p_verification_id  text,
  p_phone_normalized text,
  p_state            text,
  p_ttl_seconds      int default 600          -- 짧은 만료(기본 10분)
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  -- verificationId 1회만(재사용 차단)
  if exists (select 1 from public.signup_tokens where verification_id = p_verification_id) then
    raise exception 'verification_already_used';
  end if;
  insert into public.signup_tokens (token_hash, verification_id, phone_normalized, state, expires_at)
  values (p_token_hash, p_verification_id, p_phone_normalized, p_state,
          now() + make_interval(secs => p_ttl_seconds));
end;
$$;

-- ── 소비: 가입 함수가 호출. 검증(미사용·미만료·바인딩 일치) 후 consumed. 실패=예외. ──
create or replace function public.consume_signup_token(
  p_token_hash       text,
  p_verification_id  text,
  p_phone_normalized text
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v public.signup_tokens%rowtype;
begin
  select * into v from public.signup_tokens where token_hash = p_token_hash for update;
  if not found                         then raise exception 'token_invalid'; end if;
  if v.consumed_at is not null         then raise exception 'token_already_used'; end if;   -- 1회 사용
  if v.expires_at < now()              then raise exception 'token_expired'; end if;
  -- 바인딩 검증: verification_id·전화번호 일치(타계정·다른 인증건 재사용 차단)
  if v.verification_id  <> p_verification_id  then raise exception 'token_binding_mismatch_vid'; end if;
  if v.phone_normalized <> p_phone_normalized then raise exception 'token_binding_mismatch_phone'; end if;
  update public.signup_tokens set consumed_at = now() where id = v.id;
  return jsonb_build_object('verification_id', v.verification_id, 'phone_normalized', v.phone_normalized);
end;
$$;

-- 권한: service_role 전용. anon/authenticated/public 회수.
revoke all     on function public.issue_signup_token(text,text,text,text,int) from public;
revoke execute on function public.issue_signup_token(text,text,text,text,int) from anon;
revoke execute on function public.issue_signup_token(text,text,text,text,int) from authenticated;
revoke all     on function public.consume_signup_token(text,text,text) from public;
revoke execute on function public.consume_signup_token(text,text,text) from anon;
revoke execute on function public.consume_signup_token(text,text,text) from authenticated;

-- 검증(✅): select proname,prosecdef from pg_proc where proname in ('issue_signup_token','consume_signup_token');
