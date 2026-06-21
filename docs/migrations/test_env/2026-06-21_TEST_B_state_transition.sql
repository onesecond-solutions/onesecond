-- ▶ 실행 요청 — onesecond-test 전용 / 운영 프로젝트 실행 절대 금지
-- B. 내부 상태 전이 검증 — apply_payment_event RPC 직접 호출(서명 우회/백도어 0, RPC 레벨만).
--   선행: TEST_setup_full.sql + apply_payment_event_rpc.sql(next_billing_at 보강본 1b4e0ad) 적용.
--   방식: 한 트랜잭션 안에서 seed→호출→검증 RAISE→ROLLBACK. ★실행 후 DB에 아무것도 안 남김(rollback).
--   검증 결과는 NOTICE 메시지로 출력(Supabase SQL Editor의 Messages/Logs 확인).

begin;   -- ★전체를 한 트랜잭션으로 감싸고 마지막에 rollback → DB에 아무것도 안 남김

do $$
declare
  v_uid uuid := '00000000-0000-0000-0000-0000000000b1';
  v_sub uuid;
  v_plan text; v_status text; v_pe int; v_pay int; v_next1 timestamptz; v_next2 timestamptz;
  v_cnt int;
begin
  -- 0) seed: 테스트 user + active subscription(가짜 빌링키)
  insert into public.users (id,email,name,role,status,plan) values (v_uid,'b-test@example.com','B검증','ga_member','active','free');
  insert into public.subscriptions (user_id,plan_id,billing_key,status,next_billing_at)
    values (v_uid,'plus','bkey-test','active', now() + interval '1 month') returning id into v_sub;

  -- 1) billing_paid → payments(paid)·subscriptions(active,next+1m)·users.plan=plus·payment_events(applied)
  perform public.apply_payment_event('evt-paid-1','billing_paid', jsonb_build_object(
    'user_id',v_uid::text,'subscription_id',v_sub::text,'plan_code','plus',
    'payment_id','pay-1','amount',9900,'currency','KRW','status','paid','paid_at',now()::text));
  select plan into v_plan from public.users where id=v_uid;
  select status,next_billing_at into v_status,v_next1 from public.subscriptions where id=v_sub;
  select count(*) into v_pay from public.payments where payment_id='pay-1' and status='paid';
  select count(*) into v_pe from public.payment_events where event_id='evt-paid-1' and processing_status='applied';
  raise notice '[1 paid] users.plan=% (기대 plus) / sub.status=% (active) / payments=% (1) / events.applied=% (1) / next=%',
    v_plan, v_status, v_pay, v_pe, v_next1;

  -- 2) 같은 event_id 재호출 → duplicate_ignored, 증가 0, next 불변
  perform public.apply_payment_event('evt-paid-1','billing_paid', jsonb_build_object(
    'user_id',v_uid::text,'subscription_id',v_sub::text,'plan_code','plus',
    'payment_id','pay-1','amount',9900,'currency','KRW','status','paid','paid_at',now()::text));
  select next_billing_at into v_next2 from public.subscriptions where id=v_sub;
  select count(*) into v_cnt from public.payment_events where event_id='evt-paid-1';
  raise notice '[2 중복] events(evt-paid-1)=% (1, 멱등) / next 변화=% (false=이중전진0)', v_cnt, (v_next1 <> v_next2);

  -- 3) 결제 실패 → past_due (즉시 free 강등 X)
  perform public.apply_payment_event('evt-fail-1','billing_failed', jsonb_build_object(
    'user_id',v_uid::text,'subscription_id',v_sub::text,'plan_code','plus',
    'payment_id','pay-2','amount',9900,'currency','KRW','status','failed','failure_code','CARD_DECLINED'));
  select status into v_status from public.subscriptions where id=v_sub;
  select plan into v_plan from public.users where id=v_uid;
  raise notice '[3 실패] sub.status=% (past_due) / users.plan=% (plus 유지, free 강등 안함)', v_status, v_plan;

  -- 4) 순서 역전: 먼저 환불(terminal)로 보낸 뒤, 늦게 온 paid → ignored_stale
  perform public.apply_payment_event('evt-refund-1','refunded', jsonb_build_object(
    'user_id',v_uid::text,'subscription_id',v_sub::text,'plan_code','plus','payment_id','pay-2','status','refunded'));
  select status into v_status from public.subscriptions where id=v_sub;
  select plan into v_plan from public.users where id=v_uid;
  raise notice '[4 환불] sub.status=% (canceled) / users.plan=% (free)', v_status, v_plan;
  -- 늦게 도착한 과거 paid (역행) → ignored
  perform public.apply_payment_event('evt-paid-late','billing_paid', jsonb_build_object(
    'user_id',v_uid::text,'subscription_id',v_sub::text,'plan_code','plus','payment_id','pay-3','status','paid','paid_at',now()::text));
  select processing_status into v_status from public.payment_events where event_id='evt-paid-late';
  select status into v_plan from public.subscriptions where id=v_sub;  -- 재사용 변수
  raise notice '[4 역전] late paid 처리결과=% (ignored) / sub.status=% (canceled 유지, 역행 0)', v_status, v_plan;

  raise notice '=== B 상태전이 검증 완료. 트랜잭션 rollback으로 테스트 데이터 폐기 ===';
exception when others then
  raise notice '[오류] %', sqlerrm;
end $$;

rollback;   -- ★위 do block의 모든 seed/호출 결과 폐기 (DB 무변경)

-- ✅ 검증 후 잔여 확인(조회만): 위 do block은 rollback이라 0이어야 정상
-- select count(*) from public.payment_events where event_id like 'evt-%';   -- 0
-- select count(*) from public.users where id='00000000-0000-0000-0000-0000000000b1';  -- 0
