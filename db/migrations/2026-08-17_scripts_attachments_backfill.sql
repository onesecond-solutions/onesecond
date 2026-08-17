-- ═══════════════════════════════════════════════════════════════════════════
-- 🟡 데이터 백필(신규 행 추가만, 기존 행 UPDATE/DELETE 없음) — 업무노트 첨부파일 복구
-- ═══════════════════════════════════════════════════════════════════════════
--
-- 배경: 대표 실측 — 원세컨드(insu/index.html) "CI보험 상담 스크립트" 등에는
--   scripts.attachments(jsonb 배열, {url,name,type}, 공개 버킷 onesecond_banner)
--   에 이미지가 첨부돼 있는데, 8/14 workspace_unified_schema_v2.sql 이관 시
--   이 필드를 새 컬럼으로는 안 옮기고 원본 행 전체만 legacy_payload에 저장함
--   (테이블 정의에 attachments 컬럼 자체가 없었음).
--
-- 진단 확인(2026-08-17_scripts_attachments_diagnostic.sql, 조회전용):
--   pilot(98c5f4f9) 기준 scripts 69건 중 46건에 첨부 존재, 총 75개 파일.
--
-- 처리: legacy_payload->'attachments' 배열의 각 원소를 워크스테이션이 이미
--   쓰는 "자식 file 항목"(parent_id=원본 업무노트 id) 패턴으로 풀어 넣는다.
--   personal-workspace.js의 itemAttachments()가 이 parent_id 관계를 그대로
--   읽어 상세 화면에 "첨부파일 N개"로 표시한다(코드 변경 불필요).
--   버킷이 공개(onesecond_banner)라 파일 자체를 복사할 필요 없이 기존
--   공개 URL을 그대로 참조한다.
--
-- 범위: legacy_source='scripts'인 모든 owner(8/14 원본 이관도 owner 제한이
--   없었으므로 동일하게 전체 적용 — pilot 외 계정도 나중에 개방될 때 데이터
--   일관성 유지).
--
-- ⚠️ 대상 프로젝트(유일 진실 원천): onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

INSERT INTO public.workspace_items(
  id, owner_id, parent_id, item_type, title, url, mime_type, visibility,
  legacy_source, legacy_id, legacy_payload, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  wi.owner_id,
  wi.id,
  'file',
  coalesce(nullif(att->>'name', ''), '첨부파일'),
  att->>'url',
  nullif(att->>'type', ''),
  wi.visibility,
  'scripts_attachment',
  wi.legacy_id || ':' || (att_idx - 1)::text,
  jsonb_build_object('source_script_item_id', wi.id, 'attachment', att),
  wi.created_at,
  wi.updated_at
FROM public.workspace_items wi,
     LATERAL jsonb_array_elements(coalesce(wi.legacy_payload->'attachments', '[]'::jsonb)) WITH ORDINALITY AS t(att, att_idx)
WHERE wi.legacy_source = 'scripts'
  AND nullif(att->>'url', '') IS NOT NULL
ON CONFLICT (legacy_source, legacy_id) DO NOTHING;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- DOWN / ROLLBACK — 이 마이그레이션이 추가한 행만 제거(원본 업무노트·
--   legacy_payload는 전혀 건드리지 않았으므로 되돌려도 부작용 없음).
-- ═══════════════════════════════════════════════════════════════════════════
-- BEGIN;
--   DELETE FROM public.workspace_items WHERE legacy_source = 'scripts_attachment';
-- COMMIT;
