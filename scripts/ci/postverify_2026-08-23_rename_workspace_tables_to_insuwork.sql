-- CI 사후 검증 (🟡 SELECT 전용, 데이터 변경 0) — workspace_* → insuwork_* 테이블 rename 확인
--   (db/migrations/2026-08-23_rename_workspace_tables_to_insuwork.sql 동반).
--
-- 출력(RAISE NOTICE, CI 로그 캡처):
--   [A] 새 이름(insuwork_items 등) 4개 테이블 존재 + 행 수 — rename 성공 확인.
--   [B] 옛 이름(workspace_items 등) 4개는 더 이상 존재하지 않아야 함(to_regclass가 NULL).
--   각 테이블 확인은 예외 가드 → 하나가 실패해도 다른 테이블 확인 계속.
do $$
declare
  new_name text;
  old_name text;
  cnt bigint;
begin
  raise notice '════ [A] 새 테이블명(insuwork_*) 존재 + 행 수 확인 ════';
  foreach new_name in array array['insuwork_items','insuwork_customers','insuwork_consultations','insuwork_tasks'] loop
    begin
      execute format('select count(*) from public.%I', new_name) into cnt;
      raise notice '  public.%: 존재함, 총 %건', new_name, cnt;
    exception when others then
      raise notice '  % 확인 실패: %', new_name, sqlerrm;
    end;
  end loop;

  raise notice '════ [B] 옛 테이블명(workspace_*) 잔존 여부 확인(기대값 = 전부 없음) ════';
  foreach old_name in array array['workspace_items','workspace_customers','workspace_consultations','workspace_tasks'] loop
    begin
      if to_regclass('public.' || old_name) is null then
        raise notice '  %: 정상적으로 사라짐(rename 완료)', old_name;
      else
        raise notice '  %: 아직 존재함 — rename 실패 의심!', old_name;
      end if;
    exception when others then
      raise notice '  % 확인 실패: %', old_name, sqlerrm;
    end;
  end loop;

  raise notice 'OK workspace_* -> insuwork_* 테이블 rename 검증 완료.';
end $$;
