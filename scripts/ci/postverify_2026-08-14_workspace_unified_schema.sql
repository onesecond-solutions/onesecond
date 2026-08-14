DO $$
DECLARE missing_count bigint; pilot uuid := '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd';
BEGIN
  IF to_regclass('public.workspace_items') IS NULL OR to_regclass('public.workspace_customers') IS NULL OR to_regclass('public.workspace_consultations') IS NULL OR to_regclass('public.workspace_tasks') IS NULL THEN RAISE EXCEPTION 'FAIL: unified workspace tables missing'; END IF;
  SELECT count(*) INTO missing_count FROM (
    SELECT 'library' src,id::text id FROM public.library WHERE owner_id::text ~* '^[0-9a-f-]{36}$'
    UNION ALL SELECT 'scripts',id::text FROM public.scripts WHERE owner_id::text ~* '^[0-9a-f-]{36}$'
    UNION ALL SELECT 'myspace_folders',id::text FROM public.myspace_folders WHERE owner_id::text ~* '^[0-9a-f-]{36}$'
    UNION ALL SELECT 'myspace_files',id::text FROM public.myspace_files WHERE owner_id::text ~* '^[0-9a-f-]{36}$'
  ) legacy LEFT JOIN public.workspace_items wi ON wi.legacy_source=legacy.src AND wi.legacy_id=legacy.id WHERE wi.id IS NULL;
  IF missing_count <> 0 THEN RAISE EXCEPTION 'FAIL: % workspace item rows missing',missing_count; END IF;
  SELECT count(*) INTO missing_count FROM public.sales_customers c LEFT JOIN public.workspace_customers wc ON wc.legacy_source='sales_customers' AND wc.legacy_id=c.id::text WHERE c.owner_id::text ~* '^[0-9a-f-]{36}$' AND wc.id IS NULL;
  IF missing_count <> 0 THEN RAISE EXCEPTION 'FAIL: % customer rows missing',missing_count; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE tablename='workspace_items' AND policyname='workspace_items_select') THEN RAISE EXCEPTION 'FAIL: workspace item visibility policy missing'; END IF;
  RAISE NOTICE 'POSTVERIFY PASS: unified workspace installed; pilot items=%, customers=%, consultations=%, tasks=%',
    (SELECT count(*) FROM public.workspace_items WHERE owner_id=pilot),(SELECT count(*) FROM public.workspace_customers WHERE owner_id=pilot),(SELECT count(*) FROM public.workspace_consultations WHERE owner_id=pilot),(SELECT count(*) FROM public.workspace_tasks WHERE owner_id=pilot);
END $$;
