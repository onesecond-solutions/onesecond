-- ▶ 실행 요청 — onesecond-test 전용 / 운영 프로젝트 실행 절대 금지
-- signup_token 상태전이 검증 — issue/reserve/finalize 직접 호출(begin..rollback, DB 무변경).
-- 선행: signup_token_rpc.sql(issue/reserve/finalize) 적용. 결과는 NOTICE(Messages/Logs).

begin;
do $$
declare v_hash text := 'th-test-1'; v_vid text := 'vid-1'; v_phone text := '01000000000';
  v_r jsonb; v_uid uuid := gen_random_uuid();
begin
  -- 1) issue → issued, reserve → processing(proceed=true)
  perform public.issue_signup_token(v_hash, v_vid, v_phone, 'st', 600);
  v_r := public.reserve_signup_token(v_hash, v_vid, v_phone);
  raise notice '[1 reserve] proceed=% state=% (기대 true/reserved)', v_r->>'proceed', v_r->>'state';

  -- 2) 처리중 재시도(계정 아직 없음) → proceed=true(retry, createUser 멱등 재진행)
  v_r := public.reserve_signup_token(v_hash, v_vid, v_phone);
  raise notice '[2 재reserve processing] proceed=% state=% (기대 true/retry)', v_r->>'proceed', v_r->>'state';

  -- 3) finalize(consumed) → 이후 reserve = 기존 계정으로 수렴(중복 계정 0)
  perform public.finalize_signup_token(v_hash, v_uid);
  v_r := public.reserve_signup_token(v_hash, v_vid, v_phone);
  raise notice '[3 consumed후 reserve] proceed=% created일치=% (기대 false/true)',
    v_r->>'proceed', (v_r->>'created_user_id' = v_uid::text);

  -- 4) verificationId 재사용(같은 vid로 또 issue) → 차단
  begin
    perform public.issue_signup_token('th-2', v_vid, v_phone, 'st', 600);
    raise notice '[4 vid재사용] 차단 실패!';
  exception when others then raise notice '[4 vid재사용] 차단 OK (%)', sqlerrm; end;

  -- 5) 만료 토큰 reserve → token_expired 차단
  perform public.issue_signup_token('th-exp', 'vid-exp', v_phone, 'st', -1);  -- 즉시 만료
  begin
    v_r := public.reserve_signup_token('th-exp', 'vid-exp', v_phone);
    raise notice '[5 만료] 차단 실패!';
  exception when others then raise notice '[5 만료] 차단 OK (%)', sqlerrm; end;

  -- 6) 바인딩 불일치(다른 vid/phone) → 차단
  perform public.issue_signup_token('th-3', 'vid-3', v_phone, 'st', 600);
  begin
    v_r := public.reserve_signup_token('th-3', 'vid-WRONG', v_phone);
    raise notice '[6 바인딩] 차단 실패!';
  exception when others then raise notice '[6 바인딩] 차단 OK (%)', sqlerrm; end;

  raise notice '=== signup_token 상태전이 검증 완료(rollback으로 폐기) ===';
exception when others then raise notice '[오류] %', sqlerrm;
end $$;
rollback;
