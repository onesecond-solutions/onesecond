-- ============================================================
-- [게이트 검증] sync_user_team_text 트리거 — 권한·동작·회귀 (BEGIN..ROLLBACK)
-- 신버전 pdnwgzneooyygfejrvbg. 한 RUN으로 통째 실행. 마지막 ROLLBACK이라 트리거·데이터 모두 미잔존.
-- 목적: 운영 적용 전, 트리거 동작 5종 + 무관컬럼 미발동 + 무효 team_id 차단을 운영과 같은 DB에서 확인.
-- 실행 주체 = SECURITY DEFINER 가입/초대 경로와 동일한 postgres 컨텍스트(편집기 기본). 일반사용자 권한은 Part A(A2·A3)로 별도 판정.
-- 결과는 RAISE NOTICE(메시지 탭)로 출력. 운영 데이터 변경 0(전부 ROLLBACK).
-- ============================================================
begin;

-- 1) 트리거 임시 생성 (이 트랜잭션 안에서만)
create or replace function public.sync_user_team_text()
returns trigger language plpgsql set search_path = public, pg_temp as $fn$
declare v_name text;
begin
  if new.team_id is null then new.team := null; return new; end if;
  select t.name into v_name from public.teams t where t.id = new.team_id;
  if v_name is null then
    raise exception 'sync_user_team_text: team_id=% 에 해당하는 teams 행 없음', new.team_id using errcode='foreign_key_violation';
  end if;
  new.team := v_name; return new;
end; $fn$;
drop trigger if exists trg_sync_user_team_text on public.users;
create trigger trg_sync_user_team_text
  before insert or update of team_id, team on public.users
  for each row execute function public.sync_user_team_text();

-- 2) 시나리오 검증
do $$
declare
  tid  uuid := '5fccd362-9ee3-4165-8960-7cb0b7ec72fa';  -- 4팀
  tid2 uuid;
  tnm2 text;
  uid  uuid := gen_random_uuid();
  v_team text;
begin
  select id, name into tid2, tnm2 from public.teams where id <> tid and is_active = true limit 1;

  -- 2a) 유효 team_id INSERT → team 자동 생성
  insert into public.users(id, email, name, role, status, team_id)
    values (uid, 'gate_'||uid||'@example.invalid', 'GATE_TEST', 'ga_member', 'active', tid);
  select team into v_team from public.users where id = uid;
  raise notice '[2a] INSERT team_id=4팀 → team=%  (기대: 4팀)', v_team;

  -- 2b) team_id 변경 UPDATE → team 자동 변경
  update public.users set team_id = tid2 where id = uid;
  select team into v_team from public.users where id = uid;
  raise notice '[2b] UPDATE team_id 변경 → team=%  (기대: %)', v_team, tnm2;

  -- 2c) team_id NULL → team NULL
  update public.users set team_id = null where id = uid;
  select team into v_team from public.users where id = uid;
  raise notice '[2c] team_id=NULL → team=%  (기대: <NULL>)', coalesce(v_team,'<NULL>');

  -- 2d) 무효 team_id → 실패(차단)
  begin
    update public.users set team_id = '00000000-0000-0000-0000-000000000000' where id = uid;
    raise notice '[2d] 무효 team_id → 실패 안 함 (★문제)';
  exception when others then
    raise notice '[2d] 무효 team_id → 차단됨 OK (%)', sqlerrm;
  end;

  -- 2e) 무관 컬럼(name)만 UPDATE → 트리거 미발동, team 유지
  update public.users set team_id = tid where id = uid;   -- team=4팀로 복구(트리거 발동)
  update public.users set name = 'GATE_TEST2' where id = uid;  -- team_id/team 미포함 → 트리거 미발동
  select team into v_team from public.users where id = uid;
  raise notice '[2e] name만 UPDATE → team=%  (기대: 4팀 유지)', v_team;
end $$;

rollback;

-- ============================================================
-- 기대 PASS:
--   [2a] team=4팀  [2b] team=tid2이름  [2c] team=<NULL>  [2d] 차단됨 OK  [2e] team=4팀 유지
-- 하나라도 다르면 FAIL → 보고 후 운영 적용 보류.
-- ⚠️ 2a INSERT가 무관한 NOT NULL 제약으로 실패하면, 해당 컬럼을 INSERT 목록에 추가 후 재시도(트리거와 무관한 스키마 사유).
-- ============================================================
