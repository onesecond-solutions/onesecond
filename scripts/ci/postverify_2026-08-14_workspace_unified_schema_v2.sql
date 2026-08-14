DO $$ DECLARE miss bigint; pilot uuid:='98c5f4f9-10c1-4ee1-a656-5c2ca63239fd'; BEGIN
 SELECT count(*) INTO miss FROM (
  SELECT 'library' s,id::text i FROM public.library WHERE owner_id::text~*'^[0-9a-f-]{36}$' UNION ALL
  SELECT 'scripts',id::text FROM public.scripts WHERE owner_id::text~*'^[0-9a-f-]{36}$' UNION ALL
  SELECT 'myspace_folders',id::text FROM public.myspace_folders WHERE owner_id::text~*'^[0-9a-f-]{36}$' UNION ALL
  SELECT 'myspace_files',id::text FROM public.myspace_files WHERE owner_id::text~*'^[0-9a-f-]{36}$'
 ) x LEFT JOIN public.workspace_items w ON w.legacy_source=x.s AND w.legacy_id=x.i WHERE w.id IS NULL;
 IF miss<>0 THEN RAISE EXCEPTION 'FAIL: workspace item missing=%',miss; END IF;
 SELECT count(*) INTO miss FROM public.sales_customers c LEFT JOIN public.workspace_customers w ON w.legacy_source='sales_customers' AND w.legacy_id=c.id::text WHERE c.owner_id::text~*'^[0-9a-f-]{36}$' AND w.id IS NULL;
 IF miss<>0 THEN RAISE EXCEPTION 'FAIL: customer missing=%',miss; END IF;
 RAISE NOTICE 'PASS pilot items=% customers=% consultations=% tasks=%',(SELECT count(*) FROM public.workspace_items WHERE owner_id=pilot),(SELECT count(*) FROM public.workspace_customers WHERE owner_id=pilot),(SELECT count(*) FROM public.workspace_consultations WHERE owner_id=pilot),(SELECT count(*) FROM public.workspace_tasks WHERE owner_id=pilot);
END $$;
