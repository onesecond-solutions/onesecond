DO $$
BEGIN
  IF to_regclass('public.briefing_leaflet_search') IS NULL THEN
    RAISE EXCEPTION 'briefing_leaflet_search table missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='search_briefing_leaflets'
  ) THEN
    RAISE EXCEPTION 'search_briefing_leaflets function missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE oid='public.briefing_leaflet_search'::regclass AND relrowsecurity
  ) THEN
    RAISE EXCEPTION 'briefing_leaflet_search RLS disabled';
  END IF;
  IF has_table_privilege('anon','public.briefing_leaflet_search','SELECT') THEN
    RAISE EXCEPTION 'anon direct table select must stay blocked';
  END IF;
  IF has_table_privilege('authenticated','public.briefing_leaflet_search','SELECT') THEN
    RAISE EXCEPTION 'authenticated direct table select must stay blocked';
  END IF;
  IF has_function_privilege('anon','public.search_briefing_leaflets(text,integer)','EXECUTE') THEN
    RAISE EXCEPTION 'anon RPC execute must stay blocked';
  END IF;
  IF NOT has_function_privilege('authenticated','public.search_briefing_leaflets(text,integer)','EXECUTE') THEN
    RAISE EXCEPTION 'authenticated RPC execute missing';
  END IF;
  RAISE NOTICE 'POSTVERIFY PASS: private search index + authenticated bounded RPC v2';
END $$;
