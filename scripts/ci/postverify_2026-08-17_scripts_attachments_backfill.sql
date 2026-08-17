DO $$
DECLARE
  created int;
  orphaned int;
  wrong_type int;
BEGIN
  SELECT count(*) INTO created FROM public.workspace_items WHERE legacy_source = 'scripts_attachment';
  IF created = 0 THEN
    RAISE EXCEPTION 'FAIL: no scripts_attachment rows were created';
  END IF;

  SELECT count(*) INTO orphaned
    FROM public.workspace_items c
   WHERE c.legacy_source = 'scripts_attachment'
     AND NOT EXISTS (SELECT 1 FROM public.workspace_items p WHERE p.id = c.parent_id);
  IF orphaned <> 0 THEN
    RAISE EXCEPTION 'FAIL: % scripts_attachment rows reference a missing parent', orphaned;
  END IF;

  SELECT count(*) INTO wrong_type
    FROM public.workspace_items
   WHERE legacy_source = 'scripts_attachment' AND item_type <> 'file';
  IF wrong_type <> 0 THEN
    RAISE EXCEPTION 'FAIL: % scripts_attachment rows have unexpected item_type', wrong_type;
  END IF;

  RAISE NOTICE 'PASS scripts_attachment created=% orphaned=0 wrong_type=0', created;
END $$;
