DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.workspace_items LIMIT 1) THEN
    RAISE EXCEPTION 'FAIL: workspace_items unexpectedly empty after diagnostic-only run';
  END IF;
  RAISE NOTICE 'PASS: workspace_items readable, no changes expected (diagnostic-only migration)';
END $$;
