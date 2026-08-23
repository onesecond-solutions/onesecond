-- CI 사후 검증 (🟡 SELECT 전용, 데이터 변경 0) — insuwork 자가서비스 이관 RPC 배포 확인
--   (db/migrations/2026-08-23_insuwork_self_service_migration.sql 동반).
--
-- 출력(RAISE NOTICE, CI 로그 캡처):
--   [A] public.insuwork_migration_choices 테이블 존재 + RLS 활성화 여부.
--   [B] backfill된 17명 accepted 행 수(기대값 >= 17).
--   [C] migrate_my_legacy_data / decline_legacy_migration 두 함수 존재(기대값 = 2).
--   RPC 함수는 여기서 호출하지 않는다 — CI는 특정 사용자로 인증된 세션이 없고,
--   목적도 아니다(대상 객체가 올바르게 존재/구성됐는지만 확인).
do $$
declare
  cnt bigint;
  rls_on boolean;
  fn_cnt bigint;
begin
  raise notice '════ [A] insuwork_migration_choices 테이블 + RLS 확인 ════';
  begin
    if to_regclass('public.insuwork_migration_choices') is null then
      raise notice '  public.insuwork_migration_choices: 존재하지 않음 — 배포 실패 의심!';
    else
      select relrowsecurity into rls_on from pg_class where relname = 'insuwork_migration_choices';
      raise notice '  public.insuwork_migration_choices: 존재함, RLS 활성화 = %', rls_on;
    end if;
  exception when others then
    raise notice '  insuwork_migration_choices 확인 실패: %', sqlerrm;
  end;

  raise notice '════ [B] 기존 17명 backfill(accepted) 확인 ════';
  begin
    select count(*) into cnt from public.insuwork_migration_choices where choice = 'accepted';
    raise notice '  choice=accepted 행 수 = % (기대값 >= 17)', cnt;
    if cnt >= 17 then
      raise notice '  OK: backfill 정상 반영';
    else
      raise notice '  경고: 기대치 미달 — backfill 누락 의심!';
    end if;
  exception when others then
    raise notice '  backfill 확인 실패: %', sqlerrm;
  end;

  raise notice '════ [C] RPC 함수 존재 확인 (migrate_my_legacy_data / decline_legacy_migration) ════';
  begin
    select count(*) into fn_cnt
    from pg_proc
    where proname in ('migrate_my_legacy_data','decline_legacy_migration')
      and pronamespace = 'public'::regnamespace;
    raise notice '  일치 함수 수 = % (기대값 = 2)', fn_cnt;
    if fn_cnt = 2 then
      raise notice '  OK: 두 RPC 함수 모두 존재';
    else
      raise notice '  경고: 기대치(2) 불일치 — 함수 배포 실패 의심!';
    end if;
  exception when others then
    raise notice '  함수 존재 확인 실패: %', sqlerrm;
  end;

  raise notice 'OK insuwork 자가서비스 이관 RPC 배포 검증 완료.';
end $$;
