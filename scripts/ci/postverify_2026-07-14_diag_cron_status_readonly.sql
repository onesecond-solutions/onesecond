-- 🟢 읽기전용 진단 출력 — Supabase Cron/푸시 트리거 현재 상태를 RAISE NOTICE 로 CI 로그에 출력.
--   변경 없음. 실패(RAISE EXCEPTION) 없음 — 접근 불가 항목은 오류 메시지를 NOTICE 로만 남긴다.
--   대표 지시(2026-07-14): diary-push cron OFF 여부 + 대량 발송 경로(트리거) 상태 확인.
do $$
declare
  r record;
begin
  -- ── 1) cron.job — 존재/활성/스케줄/호출 대상 ──────────────────────────────
  begin
    raise notice '=== [1] cron.job (전체) ===';
    for r in
      select jobid, jobname, active, schedule, left(command, 200) as cmd
        from cron.job order by jobid
    loop
      raise notice 'JOB id=% | name=% | active=% | schedule=% | cmd=%',
        r.jobid, r.jobname, r.active, r.schedule, r.cmd;
    end loop;
  exception when others then
    raise notice '[1] cron.job 접근 불가: %', sqlerrm;
  end;

  -- ── 2) cron.job_run_details — 최근 실행 시각·결과 ────────────────────────
  begin
    raise notice '=== [2] cron.job_run_details (최근 10) ===';
    for r in
      select jobid, status, start_time, end_time, left(coalesce(return_message,''),140) as msg
        from cron.job_run_details order by start_time desc limit 10
    loop
      raise notice 'RUN job=% | status=% | start=% | msg=%',
        r.jobid, r.status, r.start_time, r.msg;
    end loop;
  exception when others then
    raise notice '[2] cron.job_run_details 접근 불가: %', sqlerrm;
  end;

  -- ── 3) 대량 푸시 경로 = posts/team_notices → send-push 트리거 상태 ────────
  --   tgenabled: 'O'=활성(origin) · 'D'=비활성(disabled) · 'R'/'A'=replica/always
  begin
    raise notice '=== [3] 푸시 트리거 상태 (trg_notify_post / trg_notify_team_notice) ===';
    for r in
      select tgname, tgenabled, tgrelid::regclass as rel
        from pg_trigger
       where tgname in ('trg_notify_post','trg_notify_team_notice')
    loop
      raise notice 'TRIG name=% | enabled=% | table=%', r.tgname, r.tgenabled, r.rel;
    end loop;
  exception when others then
    raise notice '[3] pg_trigger 접근 불가: %', sqlerrm;
  end;

  -- ── 4) 웹푸시 구독자 수(대량 발송 규모 가늠) ─────────────────────────────
  begin
    raise notice '=== [4] push_subscriptions 구독자 수 ===';
    raise notice 'push_subscriptions rows=%', (select count(*) from public.push_subscriptions);
  exception when others then
    raise notice '[4] push_subscriptions 접근 불가: %', sqlerrm;
  end;

  raise notice 'DIAG DONE (읽기전용 · 변경 0 · 발송 0)';
end $$;
