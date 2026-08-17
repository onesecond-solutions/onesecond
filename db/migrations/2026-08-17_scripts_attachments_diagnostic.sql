-- ═══════════════════════════════════════════════════════════════════════════
-- 🟢 진단 전용(데이터 변경 없음) — 업무노트(scripts) 첨부파일 유실 규모 확인
-- ═══════════════════════════════════════════════════════════════════════════
--
-- 배경: 대표 실측 — 원세컨드(insu/index.html) "CI보험 상담 스크립트"에는
--   이미지 첨부가 붙어 있는데, 보험브리핑 워크스테이션에는 텍스트만 있음.
--
-- 정정: 이전 진단(2026-08-17_library_dual_attachment_diagnostic.sql)에서
--   "scripts는 원본에 첨부 필드가 없다"고 판단한 건 5월 스냅샷 기준 오판임.
--   라이브 insu/index.html 코드 확인 결과 scripts.attachments(jsonb 배열,
--   {url,name,type} 형태, 공개 버킷 onesecond_banner)가 실제로 존재·사용 중.
--
--   8/14 이관(2026-08-14_workspace_unified_schema_v2.sql:71-75)은 scripts
--   원본 행 전체를 to_jsonb()로 legacy_payload에 통째 저장했으므로,
--   당시 attachments 컬럼이 있었다면 legacy_payload->'attachments'에
--   원본 데이터가 그대로 남아있을 가능성이 높음 — 규모만 확인.
--
-- ⚠️ 대상 프로젝트(유일 진실 원천): onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

DO $$
DECLARE
  pilot uuid := '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd';
  total_scripts int;
  items_with_attachments int;
  total_attachment_rows int;
  sample_titles text;
BEGIN
  SELECT count(*) INTO total_scripts
    FROM public.workspace_items
   WHERE owner_id = pilot AND legacy_source = 'scripts';

  SELECT count(*) INTO items_with_attachments
    FROM public.workspace_items
   WHERE owner_id = pilot AND legacy_source = 'scripts'
     AND jsonb_array_length(coalesce(legacy_payload->'attachments','[]'::jsonb)) > 0;

  SELECT coalesce(sum(jsonb_array_length(coalesce(legacy_payload->'attachments','[]'::jsonb))),0) INTO total_attachment_rows
    FROM public.workspace_items
   WHERE owner_id = pilot AND legacy_source = 'scripts';

  SELECT string_agg(title, ' | ') INTO sample_titles
    FROM (
      SELECT title FROM public.workspace_items
       WHERE owner_id = pilot AND legacy_source = 'scripts'
         AND jsonb_array_length(coalesce(legacy_payload->'attachments','[]'::jsonb)) > 0
       ORDER BY created_at DESC LIMIT 5
    ) t;

  RAISE NOTICE 'DIAGNOSTIC total_scripts_items=% items_with_attachments=% total_attachment_rows=% sample_titles=%',
    total_scripts, items_with_attachments, total_attachment_rows, coalesce(sample_titles, '(none)');
END $$;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- DOWN / ROLLBACK — 조회 전용이라 되돌릴 데이터 변경이 없음.
-- ═══════════════════════════════════════════════════════════════════════════
-- (해당 없음 — SELECT/RAISE NOTICE만 수행)
