-- CI 사후 검증 (🟢 읽기전용) — 캘린더 예약 알림 마스터 스위치 기본 행 적재
--   (db/migrations/2026-07-14_app_settings_calendar_reminder_seed.sql) 적용 직후 실행.
--
-- 검증 목표:
--   1) key='calendar_reminder_enabled' 행이 정확히 1행(멱등 — 중복 없음).
--   2) value 가 유효값('on' 또는 'off').
--   3) group_name='operations' (어드민 설정 렌더 그룹 정합).
--
-- 방식: app_settings 조회(읽기전용). 조건 불충족 시 RAISE EXCEPTION
--   → psql(ON_ERROR_STOP=1) 종료코드!=0 → apply_and_verify.sh 가 FAIL 처리. DML/DDL 없음.
do $$
declare
  v_cnt int;
  v_val text;
  v_grp text;
begin
  select count(*) into v_cnt from public.app_settings where key='calendar_reminder_enabled';
  if v_cnt <> 1 then
    raise exception 'FAIL calendar_reminder_enabled 행수 1 아님. count=%', v_cnt;
  end if;

  select value, group_name into v_val, v_grp from public.app_settings where key='calendar_reminder_enabled';

  if v_val is null or lower(v_val) not in ('on','off') then
    raise exception 'FAIL calendar_reminder_enabled value 유효하지 않음. value=%', v_val;
  end if;

  if v_grp <> 'operations' then
    raise exception 'FAIL calendar_reminder_enabled group_name operations 아님. group_name=%', v_grp;
  end if;

  raise notice 'POSTVERIFY OK: calendar_reminder_enabled 1행·value=%·group=operations', v_val;
end $$;
