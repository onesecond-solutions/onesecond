DO $$ DECLARE cnt int; BEGIN
  SELECT count(*) INTO cnt FROM pg_indexes
   WHERE schemaname='public' AND tablename='workspace_items'
     AND indexname='workspace_items_owner_created_idx';
  IF cnt <> 1 THEN
    RAISE EXCEPTION 'FAIL: workspace_items_owner_created_idx missing (found=%)', cnt;
  END IF;
  RAISE NOTICE 'PASS workspace_items_owner_created_idx present';
END $$;
