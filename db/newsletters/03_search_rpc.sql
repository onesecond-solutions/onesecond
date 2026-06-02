CREATE OR REPLACE FUNCTION public.search_newsletters(p_query text, p_limit int DEFAULT 50)
RETURNS TABLE (id uuid, company text, insurance_type text, publish_year int, publish_month int, category text, title text, snippet text, page_count int, text_quality text, source_pdf_url text, rank real)
LANGUAGE sql STABLE AS $$
  SELECT n.id, n.company, n.insurance_type, n.publish_year, n.publish_month, n.category,
    coalesce(n.title, n.source_filename) AS title,
    ts_headline('simple', coalesce(n.full_text,''), plainto_tsquery('simple', p_query), 'MaxWords=30, MinWords=15, ShortWord=2, StartSel=「, StopSel=」, MaxFragments=1') AS snippet,
    n.page_count, n.text_quality, n.source_pdf_url,
    ts_rank(n.search_tsv, plainto_tsquery('simple', p_query)) AS rank
  FROM public.newsletters n
  WHERE n.search_tsv @@ plainto_tsquery('simple', p_query) AND n.ocr_status = 'done'
  ORDER BY rank DESC, n.publish_year DESC NULLS LAST, n.publish_month DESC NULLS LAST
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION public.search_newsletters(text, int) TO authenticated;
