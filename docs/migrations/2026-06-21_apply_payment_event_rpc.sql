-- apply_payment_event : 결제 웹훅 결과를 payments+subscriptions+users.plan 원자 반영 (트랙 A)
-- 신버전 pdnwgzneooyygfejrvbg. ★DB 미실행. portone-webhook Edge Function이 서버 재조회 후 호출.
-- 선행: 2026-06-21_payment_track_a.sql(plans/payments/payment_events/refunds/subscriptions) 적용.
--
-- 원자성: payment_events 멱등(event_id) → payments upsert → subscriptions 갱신 → users.plan 변경 = 한 트랜잭션.
-- 권한 규칙(대표): active=plan부여 / 전액환불·만료=free / past_due·부분환불=유지(즉시 강등 X).
-- users.plan 변경은 이 RPC(service_role 경유)만. p_verified=서버 재조회로 검증된 값만 신뢰.

create or replace function public.apply_payment_event(
  p_event_id   text,                 -- 웹훅 이벤트 ID (멱등 키)
  p_event_type text,                 -- 'paid'|'failed'|'billing_paid'|'billing_failed'|'cancelled'|'refunded'|'partial_refunded'|'subscription_canceled'|'expired'
  p_verified   jsonb                  -- 서버 재조회 검증값 {payment_id,user_id,subscription_id,plan_code,amount,currency,status,paid_at,failure_code}
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n        int;
  v_uid      uuid := (p_verified->>'user_id')::uuid;
  v_sub      uuid := nullif(p_verified->>'subscription_id','')::uuid;
  v_plan     text := p_verified->>'plan_code';        -- plans.code
  v_cur      text;                                    -- 현재 구독 상태(순서 역전 판정용)
begin
  -- 1) 멱등: 같은 event_id 이미 처리됐으면 무동작. processing_status=received로 선기록.
  insert into public.payment_events (event_id, payment_id, subscription_id, event_type, processing_status)
  values (p_event_id, p_verified->>'payment_id', v_sub, p_event_type, 'received')
  on conflict (event_id) do nothing;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    return jsonb_build_object('outcome','duplicate_ignored');   -- 중복 웹훅 0
  end if;

  -- 1.5) ★순서 역전 방어 — 현재 구독 상태 조회 후 terminal 역행 차단(이벤트 이력만 ignored 기록)
  --   재조회(p_verified.status)가 진실. terminal(canceled/expired) 이후 늦게 온 paid/failed는 무시.
  if v_sub is not null then select status into v_cur from public.subscriptions where id = v_sub; end if;
  if v_cur in ('canceled','expired')
     and p_event_type in ('paid','billing_paid','failed','billing_failed') then
    update public.payment_events set processing_status='ignored' where event_id = p_event_id;
    return jsonb_build_object('outcome','ignored_stale','current',v_cur,'event_type',p_event_type);
  end if;

  -- 2) payments 원장 upsert (payment_id 멱등)
  if p_verified ? 'payment_id' then
    insert into public.payments
      (payment_id, user_id, subscription_id, plan_id, amount, currency, status, provider, provider_transaction_id, failure_code, paid_at)
    values (
      p_verified->>'payment_id', v_uid, v_sub, v_plan,
      coalesce((p_verified->>'amount')::int, 0), coalesce(p_verified->>'currency','KRW'),
      coalesce(p_verified->>'status', p_event_type), 'portone',
      p_verified->>'provider_transaction_id', p_verified->>'failure_code',
      nullif(p_verified->>'paid_at','')::timestamptz)
    on conflict (payment_id) do update
      set status = excluded.status, failure_code = excluded.failure_code,
          paid_at = coalesce(excluded.paid_at, payments.paid_at), updated_at = now();
  end if;

  -- 3) subscriptions + 4) users.plan (권한 규칙)
  if p_event_type in ('paid','billing_paid') then
    -- 결제/정기청구 성공 → active + plan 부여
    if v_sub is not null then
      update public.subscriptions
        set status='active', last_payment_at=now(), last_payment_id=p_verified->>'payment_id',
            retry_count=0, last_failure_code=null, updated_at=now()
        where id=v_sub;
    end if;
    if v_plan is not null then update public.users set plan=v_plan where id=v_uid; end if;

  elsif p_event_type in ('failed','billing_failed') then
    -- 청구 실패 → past_due (즉시 free 강등 금지). 재시도 카운트.
    if v_sub is not null then
      update public.subscriptions
        set status='past_due', retry_count=coalesce(retry_count,0)+1,
            last_failure_code=p_verified->>'failure_code', updated_at=now()
        where id=v_sub;
    end if;
    -- users.plan 변경 없음(유지)

  elsif p_event_type = 'refunded' then
    -- 전액 환불 → 즉시 free 회수
    if v_sub is not null then update public.subscriptions set status='canceled', canceled_at=now(), updated_at=now() where id=v_sub; end if;
    update public.users set plan='free' where id=v_uid;

  elsif p_event_type = 'partial_refunded' then
    -- 부분 환불 → 자동 강등 금지(관리자 정책). 상태/plan 변경 없음. 이벤트만 기록.
    null;

  elsif p_event_type = 'cancelled' then
    -- 결제 취소 → 해당 payment만 canceled. plan 변경 없음.
    null;

  elsif p_event_type = 'subscription_canceled' then
    -- 일반 해지 → 다음 청구만 중단, 기간 만료일까지 권한 유지(즉시 free 아님)
    if v_sub is not null then
      update public.subscriptions
        set cancel_at_period_end=true, canceled_at=now(),
            cancellation_reason=p_verified->>'reason', updated_at=now()
        where id=v_sub;
    end if;
    -- users.plan 유지 (만료 시점에 'expired' 이벤트로 free)

  elsif p_event_type = 'expired' then
    -- 기간 만료 → free 강등 + 구독 expired
    if v_sub is not null then update public.subscriptions set status='expired', updated_at=now() where id=v_sub; end if;
    update public.users set plan='free' where id=v_uid;
  end if;

  -- 처리 완료 표시(received → applied). 실패 시 자연 raise → 전체 롤백(received 포함) → 웹훅 5xx → 재발송.
  --   failed 기록은 호출자(Edge)가 RPC 실패 시 별도 멱등 기록(payment_events on conflict).
  update public.payment_events set processing_status='applied', processed_at=now() where event_id = p_event_id;
  return jsonb_build_object('outcome','applied','event_type',p_event_type);
end;
$$;

-- 권한: service_role 전용(웹훅 Edge Function). PUBLIC·anon·authenticated 회수.
revoke all on function public.apply_payment_event(text, text, jsonb) from public;
revoke execute on function public.apply_payment_event(text, text, jsonb) from anon;
revoke execute on function public.apply_payment_event(text, text, jsonb) from authenticated;

-- 검증(✅): select prosecdef, proconfig from pg_proc where proname='apply_payment_event';  -- t, search_path=public
