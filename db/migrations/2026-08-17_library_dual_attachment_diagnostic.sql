-- ═══════════════════════════════════════════════════════════════════════════
-- 🟢 진단 전용(데이터 변경 없음) — 메모(library) 이중 첨부파일 누락 규모 확인
-- ═══════════════════════════════════════════════════════════════════════════
--
-- 배경: 대표 지적 — "원세컨드에서 업무노트·메모 첨부파일이 안 끌려왔다."
--   조사 결과(코드 근거):
--   - scripts(업무노트)는 원본 스키마에 첨부파일 필드 자체가 없었음(가져올 것 없음).
--   - library(메모)는 원본에 file_url·image_url을 각각 1개씩 첨부 가능했는데,
--     2026-08-14_workspace_unified_schema_v2.sql:64-69의 이관 로직이
--     url = coalesce(link_url, file_url, image_url) 로 셋 중 하나만 옮겼음.
--     즉 파일과 이미지가 동시에 붙어 있던 메모는 하나가 누락됐을 수 있음.
--     원본 값 자체는 legacy_payload jsonb에 그대로 남아있어 복구 가능.
--
-- 목적: 실제 영향 건수를 확인해야 정확한 복구 마이그레이션을 짤 수 있음.
--   본 파일은 SELECT/RAISE NOTICE만 수행 — 스키마·데이터 변경 0.
--
-- ⚠️ 대상 프로젝트(유일 진실 원천): onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

DO $$
DECLARE
  pilot uuid := '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd';
  total_library int;
  both_present int;
  image_dropped_when_file_kept int;
  file_or_image_dropped_when_link_kept int;
BEGIN
  SELECT count(*) INTO total_library
    FROM public.workspace_items
   WHERE owner_id = pilot AND legacy_source = 'library';

  SELECT count(*) INTO both_present
    FROM public.workspace_items
   WHERE owner_id = pilot AND legacy_source = 'library'
     AND nullif(legacy_payload->>'file_url','') IS NOT NULL
     AND nullif(legacy_payload->>'image_url','') IS NOT NULL;

  SELECT count(*) INTO image_dropped_when_file_kept
    FROM public.workspace_items
   WHERE owner_id = pilot AND legacy_source = 'library'
     AND nullif(legacy_payload->>'file_url','') IS NOT NULL
     AND nullif(legacy_payload->>'image_url','') IS NOT NULL
     AND url = legacy_payload->>'file_url';

  SELECT count(*) INTO file_or_image_dropped_when_link_kept
    FROM public.workspace_items
   WHERE owner_id = pilot AND legacy_source = 'library'
     AND nullif(legacy_payload->>'link_url','') IS NOT NULL
     AND (nullif(legacy_payload->>'file_url','') IS NOT NULL OR nullif(legacy_payload->>'image_url','') IS NOT NULL);

  RAISE NOTICE 'DIAGNOSTIC total_library_items=% both_file_and_image_present=% image_dropped_when_file_kept=% file_or_image_dropped_when_link_kept=%',
    total_library, both_present, image_dropped_when_file_kept, file_or_image_dropped_when_link_kept;
END $$;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- DOWN / ROLLBACK — 조회 전용이라 되돌릴 데이터 변경이 없음.
-- ═══════════════════════════════════════════════════════════════════════════
-- (해당 없음 — SELECT/RAISE NOTICE만 수행)
