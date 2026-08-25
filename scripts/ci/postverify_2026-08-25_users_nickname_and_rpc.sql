-- CI 사후 검증 (🟡 SELECT 전용, 데이터 변경 0) — 닉네임 컬럼 + get_nicknames RPC 배포 확인
--   (db/migrations/2026-08-25_users_nickname_and_rpc.sql 동반).
--
-- 출력(RAISE NOTICE, CI 로그 캡처):
--   [A] public.users.nickname 컬럼 존재 여부 + 타입.
--   [B] get_nicknames(uuid[]) 함수 존재 여부.
--   [C] get_nicknames(ARRAY[]::uuid[]) 빈 배열 호출이 에러 없이 0행 반환하는지(실제 실행 검증).
do $$
declare
  col_type text;
  fn_cnt bigint;
  row_cnt bigint;
begin
  raise notice '════ [A] public.users.nickname 컬럼 확인 ════';
  begin
    select data_type into col_type from information_schema.columns where table_schema='public' and table_name='users' and column_name='nickname';
    if col_type is null then
      raise notice '  nickname 컬럼: 존재하지 않음 — 배포 실패 의심!';
    else
      raise notice '  nickname 컬럼: 존재함, 타입 = %', col_type;
    end if;
  exception when others then
    raise notice '  컬럼 확인 실패: %', sqlerrm;
  end;

  raise notice '════ [B] get_nicknames(uuid[]) 함수 존재 확인 ════';
  begin
    select count(*) into fn_cnt from pg_proc where proname='get_nicknames' and pronamespace='public'::regnamespace;
    raise notice '  일치 함수 수 = % (기대값 = 1)', fn_cnt;
    if fn_cnt = 1 then
      raise notice '  OK: 함수 존재';
    else
      raise notice '  경고: 기대치(1) 불일치 — 함수 배포 실패 의심!';
    end if;
  exception when others then
    raise notice '  함수 확인 실패: %', sqlerrm;
  end;

  raise notice '════ [C] get_nicknames 빈 배열 실행 검증 ════';
  begin
    select count(*) into row_cnt from public.get_nicknames(ARRAY[]::uuid[]);
    raise notice '  빈 배열 호출 결과 행 수 = % (기대값 = 0, 에러 없이 실행되면 OK)', row_cnt;
  exception when others then
    raise notice '  RPC 실행 실패: %', sqlerrm;
  end;

  raise notice 'OK 닉네임 컬럼 + get_nicknames RPC 배포 검증 완료.';
end $$;
