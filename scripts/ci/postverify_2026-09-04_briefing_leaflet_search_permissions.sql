DO $$
BEGIN
  IF has_function_privilege('anon','public.search_briefing_leaflets(text,integer)','EXECUTE') THEN
    RAISE EXCEPTION 'anon RPC execute must stay blocked';
  END IF;
  IF NOT has_function_privilege('authenticated','public.search_briefing_leaflets(text,integer)','EXECUTE') THEN
    RAISE EXCEPTION 'authenticated RPC execute missing';
  END IF;
  IF has_table_privilege('anon','public.briefing_leaflet_search','SELECT')
     OR has_table_privilege('authenticated','public.briefing_leaflet_search','SELECT') THEN
    RAISE EXCEPTION 'direct search index reads must stay blocked';
  END IF;
  RAISE NOTICE 'POSTVERIFY PASS: briefing search RPC authenticated only';
END $$;
