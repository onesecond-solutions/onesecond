-- ============================================================
-- [게이트 검증] sync_user_team_text 트리거 — 권한·동작·회귀 (BEGIN..ROLLBACK)
-- 신버전 pdnwgzneooyygfejrvbg. 한 RUN으로 통째 실행. 마지막 ROLLBACK이라 트리거·데이터 모두 미잔존.
-- 결과는 마지막 SELECT 그리드로 출력(NOTICE 아님). 운영 데이터 변경 0(전부 ROLLBACK).
-- 실행 주체 = SECURITY DEFINER 가입/초대 경로와 동일한 postgres 컨텍스트(편집기 기본).
-- 기대 PASS: 2a team=4팀 / 2b team=다른팀 / 2c team=<NULL> / 2d blocked OK / 2e team=4팀 kept
-- ============================================================
begin;

create or replace function public.sync_user_team_text()
returns trigger language plpgsql set search_path = public, pg_temp as $fn$
declare v_name text;
begin
  if new.team_id is null then new.team := null; return new; end if;
  select t.name into v_name from public.teams t where t.id = new.team_id;
  if v_name is null then
    raise exception 'no teams row for team_id=%', new.team_id using errcode='foreign_key_violation';
  end if;
  new.team := v_name; return new;
end; $fn$;

drop trigger if exists trg_sync_user_team_text on public.users;
create trigger trg_sync_user_team_text
  before insert or update of team_id, team on public.users
  for each row execute function public.sync_user_team_text();

create temp table _gate_res(seq int, step text, result text) on commit drop;

do $$
declare
  tid  uuid := '5fccd362-9ee3-4165-8960-7cb0b7ec72fa';   -- 4팀
  tid2 uuid; tnm2 text; uid uuid := gen_random_uuid(); v_team text;
begin
  select id, name into tid2, tnm2 from public.teams where id <> tid and is_active = true limit 1;

  insert into public.users(id, email, name, role, status, team_id)
    values (uid, 'gate_'||uid||'@example.invalid', 'GATE_TEST', 'ga_member', 'active', tid);
  select team into v_team from public.users where id=uid;
  insert into _gate_res values (1, '2a valid INSERT', 'team='||coalesce(v_team,'<NULL>')||' (expect 4팀)');

  update public.users set team_id=tid2 where id=uid;
  select team into v_team from public.users where id=uid;
  insert into _gate_res values (2, '2b change team_id', 'team='||coalesce(v_team,'<NULL>')||' (expect '||tnm2||')');

  update public.users set team_id=null where id=uid;
  select team into v_team from public.users where id=uid;
  insert into _gate_res values (3, '2c team_id NULL', 'team='||coalesce(v_team,'<NULL>')||' (expect <NULL>)');

  begin
    update public.users set team_id='00000000-0000-0000-0000-000000000000' where id=uid;
    insert into _gate_res values (4, '2d invalid team_id', 'NOT blocked (PROBLEM)');
  exception when others then
    insert into _gate_res values (4, '2d invalid team_id', 'blocked OK: '||sqlerrm);
  end;

  update public.users set team_id=tid where id=uid;
  update public.users set name='GATE_TEST2' where id=uid;
  select team into v_team from public.users where id=uid;
  insert into _gate_res values (5, '2e name-only UPDATE', 'team='||coalesce(v_team,'<NULL>')||' (expect 4팀 kept)');
end $$;

select * from _gate_res order by seq;

rollback;
