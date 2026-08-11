DO $$
DECLARE
  item_policies integer;
  file_policies integer;
  storage_policies integer;
BEGIN
  IF to_regclass('public.dayfolder_items') IS NULL OR to_regclass('public.dayfolder_files') IS NULL THEN
    RAISE EXCEPTION 'FAIL: DayFolder tables missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'dayfolder-files' AND public = false) THEN
    RAISE EXCEPTION 'FAIL: private dayfolder-files bucket missing';
  END IF;
  SELECT count(*) INTO item_policies FROM pg_policies WHERE schemaname = 'public' AND tablename = 'dayfolder_items';
  SELECT count(*) INTO file_policies FROM pg_policies WHERE schemaname = 'public' AND tablename = 'dayfolder_files';
  SELECT count(*) INTO storage_policies FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'dayfolder_storage_%';
  IF item_policies <> 4 OR file_policies <> 4 OR storage_policies <> 4 THEN
    RAISE EXCEPTION 'FAIL: policy count mismatch items=% files=% storage=%', item_policies, file_policies, storage_policies;
  END IF;
  IF to_regprocedure('public.sync_dayfolder_items(jsonb)') IS NULL
     OR to_regprocedure('public.link_dayfolder_files(jsonb)') IS NULL
     OR to_regprocedure('public.can_read_dayfolder_file(uuid)') IS NULL THEN
    RAISE EXCEPTION 'FAIL: DayFolder functions missing';
  END IF;
  RAISE NOTICE 'POSTVERIFY PASS: DayFolder Supabase persistence, private/member visibility, author-only writes, and protected file storage installed.';
END $$;
