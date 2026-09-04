-- 🟠 DDL — 보험이슈 PDF·이미지 검색 색인과 인증 사용자 검색 RPC (v2)
-- v1의 생성 열은 PostgreSQL 불변성 제약으로 전체 롤백되었다. 원문은 보존하고 단순 검색으로 대체한다.
BEGIN;

CREATE TABLE IF NOT EXISTS public.briefing_leaflet_search (
  leaflet_id uuid PRIMARY KEY REFERENCES public.briefing_leaflets(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  insurer text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  extracted_text text NOT NULL DEFAULT '',
  ocr_status text NOT NULL DEFAULT 'pending'
    CHECK (ocr_status IN ('pending','processing','done','empty','skip','oversize','error')),
  indexed_at timestamptz,
  error_message text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_briefing_leaflet_search_status
  ON public.briefing_leaflet_search (ocr_status, updated_at);

ALTER TABLE public.briefing_leaflet_search ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.briefing_leaflet_search FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.search_briefing_leaflets(p_query text, p_limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid, title text, insurer text, category text, tags text[],
  received_date date, storage_path text, mime_type text, file_size bigint,
  snippet text, ocr_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH input AS (
    SELECT trim(coalesce(p_query,'')) AS q,
           greatest(1, least(coalesce(p_limit,20), 50)) AS lim
  )
  SELECT l.id,
         coalesce(nullif(s.title,''), '보험이슈 자료') AS title,
         s.insurer,
         s.category,
         s.tags,
         l.received_date,
         l.storage_path,
         l.mime_type,
         l.file_size,
         CASE
           WHEN length(s.extracted_text) = 0 THEN ''
           ELSE left(regexp_replace(s.extracted_text, E'[\\n\\r\\t ]+', ' ', 'g'), 180)
         END AS snippet,
         s.ocr_status
    FROM public.briefing_leaflet_search s
    JOIN public.briefing_leaflets l ON l.id = s.leaflet_id
    CROSS JOIN input i
   WHERE l.deleted_at IS NULL
     AND i.q <> ''
     AND (
       s.title ILIKE '%' || i.q || '%'
       OR s.insurer ILIKE '%' || i.q || '%'
       OR s.category ILIKE '%' || i.q || '%'
       OR array_to_string(s.tags,' ') ILIKE '%' || i.q || '%'
       OR s.extracted_text ILIKE '%' || i.q || '%'
     )
   ORDER BY l.received_date DESC, s.title
   LIMIT (SELECT lim FROM input);
$$;

REVOKE ALL ON FUNCTION public.search_briefing_leaflets(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_briefing_leaflets(text, integer) TO authenticated;

COMMIT;

-- DOWN: DROP FUNCTION public.search_briefing_leaflets(text, integer); DROP TABLE public.briefing_leaflet_search;
