-- CI 사후 검증 (🟡 SELECT 전용, 데이터 변경 0) — calendar_events 이관 격차 보정 결과 확인
--   (db/migrations/2026-08-23_calendar_events_catchup_2users.sql 동반).
--
-- 출력(RAISE NOTICE, CI 로그 캡처):
--   [A] 변영삼·이은정 각각 calendar_events(legacy) vs insuwork_tasks(legacy_source=
--       'calendar_events') 건수 비교 — 기대값: 두 사람 다 legacy=migrated(gap 0).
--   [B] 두 사람의 insuwork_tasks 총 건수(참고, 보정 전 대비 각각 +4/+2 예상).
--   [C] 다른 owner의 calendar_events 이관 건수는 이번 실행으로 변하지 않았는지 확인
--       (해당 2명 제외 전체 legacy_source='calendar_events' 건수가 기존 값과 같아야 함
--       — 기존 값은 2026-08-23 진단에서 계산된 합계를 여기서 재확인).
do $$
declare
  target_a constant uuid := 'd19dcb63-3e28-4559-b498-56b19f9c94f2'; -- 변영삼
  target_b constant uuid := 'fee71d85-adc4-4db6-81b0-152f07add62a'; -- 이은정
  legacy_cnt integer;
  migrated_cnt integer;
  total_cnt integer;
  other_migrated integer;
begin
  raise notice '════ [A] 변영삼·이은정 calendar_events 이관 격차 재확인(기대값: gap 0) ════';
  begin
    select count(*) into legacy_cnt from public.calendar_events where author_id::uuid = target_a;
    select count(*) into migrated_cnt from public.insuwork_tasks where owner_id = target_a and legacy_source = 'calendar_events';
    raise notice '  변영삼 | legacy=% | migrated=% | gap=%', legacy_cnt, migrated_cnt, legacy_cnt - migrated_cnt;
  exception when others then
    raise notice '  [A] 변영삼 측정 실패: %', sqlerrm;
  end;
  begin
    select count(*) into legacy_cnt from public.calendar_events where author_id::uuid = target_b;
    select count(*) into migrated_cnt from public.insuwork_tasks where owner_id = target_b and legacy_source = 'calendar_events';
    raise notice '  이은정 | legacy=% | migrated=% | gap=%', legacy_cnt, migrated_cnt, legacy_cnt - migrated_cnt;
  exception when others then
    raise notice '  [A] 이은정 측정 실패: %', sqlerrm;
  end;

  raise notice '════ [B] 두 사람 insuwork_tasks 총 건수(참고) ════';
  begin
    select count(*) into total_cnt from public.insuwork_tasks where owner_id = target_a;
    raise notice '  변영삼 insuwork_tasks 총 = % (보정 전 37건 참고)', total_cnt;
    select count(*) into total_cnt from public.insuwork_tasks where owner_id = target_b;
    raise notice '  이은정 insuwork_tasks 총 = % (보정 전 9건 참고)', total_cnt;
  exception when others then
    raise notice '  [B] 측정 실패: %', sqlerrm;
  end;

  raise notice '════ [C] 다른 owner의 calendar_events 이관 건수 무변경 확인 ════';
  begin
    select count(*) into other_migrated
      from public.insuwork_tasks
     where legacy_source = 'calendar_events' and owner_id not in (target_a, target_b);
    raise notice '  대상 2명 제외 calendar_events 이관 건수 = % (기대값 138: 141 총 legacy 중 두 사람 제외분과 동일해야 함)', other_migrated;
  exception when others then
    raise notice '  [C] 측정 실패: %', sqlerrm;
  end;

  raise notice 'OK calendar_events 이관 격차 보정 검증 완료.';
end $$;
