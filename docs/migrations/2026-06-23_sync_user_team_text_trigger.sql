-- ============================================================
-- 사용자 팀 소속 단일 진실원화 — team_id → team 자동 동기화 트리거
-- 작성: 2026-06-23 (총괄팀장 Code) / 신버전 pdnwgzneooyygfejrvbg (onesecond-v1-restore-0420)
-- 결재: 대표님 — team_id를 조직 소속 단일 진실원으로 확정. users.team(텍스트)은 team_id에서 파생되는 표시값.
--
-- 배경: 조직트리(team 텍스트)와 공유·매니저방(team_id)이 다른 컬럼을 봐 인원 불일치 발생(8명 드리프트).
--   PR #928로 조직트리를 team_id 기준으로 통일. 본 트리거는 team 텍스트가 team_id와 어긋나지 않도록
--   쓰기 시점에 강제(재발 방지).
--
-- 규칙(대표 확정):
--   · team_id IS NOT NULL → team := teams.name(team_id)
--   · team_id IS NULL     → team := NULL (레거시 텍스트 폐기)
--   · team_id에 대응하는 teams 행 없음 → 예외 발생(잘못된 매핑 차단).
--       FK(users_team_id_fkey → teams) 존재로 사실상 도달 불가한 안전망.
--   · SECURITY DEFINER 미사용(INVOKER): team_id 쓰기 경로가 전부 SECURITY DEFINER RPC(handle_new_user/
--       accept_invite → postgres 컨텍스트) 또는 어드민(is_admin → teams 전체 읽기)이라 teams 읽기 보장 → DEFINER 불필요.
--   · 적용 범위: BEFORE INSERT OR UPDATE OF team_id, team — 무관 컬럼(last_seen_at 등) UPDATE엔 미발동.
--
-- ⚠️ 의도된 동작 변경: 팀 미선택 가입(team_id NULL)은 team 텍스트가 NULL로 저장됨.
-- ⚠️ 기존 드리프트 7명/team_id NULL 3명은 본 트리거만으로 즉시 안 바뀜(행 touch 시점에 정규화).
--    즉시 정합화는 별도 데이터 정리 SQL(③ 트랙).
-- ⚠️ 실행 = 대표님/검수팀(SQL 게이트). 한 RUN = BEGIN~COMMIT, 검증/롤백은 별도 RUN.
-- 관련: PR #928(조직트리 team_id 통일), app.html _osShareDo, js/admin-console.js _ctTeamKey/_ctTeamLabel
-- ============================================================

begin;

create or replace function public.sync_user_team_text()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare v_name text;
begin
  if new.team_id is null then
    new.team := null;                          -- team_id 없으면 레거시 텍스트 폐기(진실원 단일화)
    return new;
  end if;
  select t.name into v_name from public.teams t where t.id = new.team_id;
  if v_name is null then                       -- 대응 teams 행 없음 → 잘못된 조직 매핑 차단(FK로 사실상 도달 불가)
    raise exception 'sync_user_team_text: team_id=% 에 해당하는 teams 행 없음 — 잘못된 조직 매핑 차단', new.team_id
      using errcode = 'foreign_key_violation';
  end if;
  new.team := v_name;                          -- team_id 진실원 → team = teams.name 파생
  return new;
end;
$$;

drop trigger if exists trg_sync_user_team_text on public.users;
create trigger trg_sync_user_team_text
  before insert or update of team_id, team on public.users
  for each row execute function public.sync_user_team_text();

commit;

-- ============================================================
-- 검증 (커밋 후 별도 RUN — BEGIN..ROLLBACK = 운영 데이터 미변경)
-- ============================================================
-- select tgname, tgenabled from pg_trigger where tgname='trg_sync_user_team_text';
--
-- begin;
--   update public.users set team_id = team_id
--    where id = (select id from public.users
--                 where team_id='5fccd362-9ee3-4165-8960-7cb0b7ec72fa' limit 1)
--   returning left(id::text,8) as uid8, team, team_id;   -- team이 '4팀'으로 동기화되는지
-- rollback;

-- ============================================================
-- 롤백
-- ============================================================
-- drop trigger if exists trg_sync_user_team_text on public.users;
-- drop function if exists public.sync_user_team_text();
