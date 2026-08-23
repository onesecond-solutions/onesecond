-- 🟠 실제 INSERT — calendar_events → insuwork_tasks 이관 격차 보정 (2명 한정)
-- ═══════════════════════════════════════════════════════════════════════════
-- 대표 승인(2026-08-23): 게이트 개방 준비도 진단(diag_insuwork_gate_readiness)에서
--   2026-08-14 일괄 이관 이후 새로 등록된 일정이 아직 insuwork_tasks에 반영 안 된
--   2명을 발견했다 — 변영삼(d19dcb63-3e28-4559-b498-56b19f9c94f2, legacy=41/migrated=37,
--   gap=4), 이은정(fee71d85-adc4-4db6-81b0-152f07add62a, legacy=11/migrated=9, gap=2).
--
-- 2026-08-14_workspace_unified_schema.sql의 원본 INSERT...SELECT 로직을 그대로
--   재사용하되(workspace_legacy_uuid 함수·컬럼 매핑 동일), 대상을 이 2명 owner_id로만
--   한정한다. ON CONFLICT (legacy_source,legacy_id) DO NOTHING이 이미 이관된 37/9건은
--   자동으로 건너뛰고, 누락된 4/2건만 삽입한다 — 별도 gap 계산 없이 안전.
--
-- ⚠️ 대상: onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
-- ═══════════════════════════════════════════════════════════════════════════

begin;

INSERT INTO public.insuwork_tasks(id,owner_id,title,description,task_date,task_time,legacy_source,legacy_id,legacy_payload,created_at,updated_at)
SELECT public.workspace_legacy_uuid('calendar_events',e.id::text),e.author_id::uuid,e.title,e.description,e.event_date,nullif(e.event_time::text,'')::time,
  'calendar_events',e.id::text,to_jsonb(e),coalesce(e.created_at,now()),coalesce(e.created_at,now())
FROM public.calendar_events e
WHERE e.author_id::text ~* '^[0-9a-f-]{36}$'
  AND e.author_id::uuid IN ('d19dcb63-3e28-4559-b498-56b19f9c94f2'::uuid, 'fee71d85-adc4-4db6-81b0-152f07add62a'::uuid)
ON CONFLICT (legacy_source,legacy_id) DO NOTHING;

commit;

-- DOWN / ROLLBACK: 이번에 새로 들어간 행만 되돌리려면 legacy_source='calendar_events'
--   AND owner_id IN (위 2개 uuid) AND created_at >= 이 마이그레이션 실행 시각으로 좁혀
--   DELETE 하면 된다. 다만 이 INSERT는 ON CONFLICT DO NOTHING이라 원본 calendar_events는
--   전혀 건드리지 않았으므로, 필요 시 이 INSERT...SELECT를 그대로 재실행해도 안전(멱등).
