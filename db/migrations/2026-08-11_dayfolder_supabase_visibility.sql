BEGIN;

CREATE TABLE IF NOT EXISTS public.dayfolder_items (
  id uuid PRIMARY KEY,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT '멤버',
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'members')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dayfolder_items_author_idx ON public.dayfolder_items(author_id);
CREATE INDEX IF NOT EXISTS dayfolder_items_members_idx ON public.dayfolder_items(updated_at DESC) WHERE visibility = 'members';

ALTER TABLE public.dayfolder_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY dayfolder_items_select_own_or_members
  ON public.dayfolder_items FOR SELECT TO authenticated
  USING (author_id = auth.uid() OR visibility = 'members');
CREATE POLICY dayfolder_items_insert_own
  ON public.dayfolder_items FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());
CREATE POLICY dayfolder_items_update_own
  ON public.dayfolder_items FOR UPDATE TO authenticated
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY dayfolder_items_delete_own
  ON public.dayfolder_items FOR DELETE TO authenticated
  USING (author_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.dayfolder_files (
  file_id uuid PRIMARY KEY,
  item_id uuid REFERENCES public.dayfolder_items(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  content_type text NOT NULL DEFAULT 'application/octet-stream',
  file_size bigint NOT NULL DEFAULT 0 CHECK (file_size >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dayfolder_files_item_idx ON public.dayfolder_files(item_id);
ALTER TABLE public.dayfolder_files ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_read_dayfolder_file(p_file_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.dayfolder_files f
    LEFT JOIN public.dayfolder_items i ON i.id = f.item_id
    WHERE f.file_id = p_file_id
      AND (f.author_id = auth.uid() OR i.visibility = 'members')
  );
$$;
REVOKE ALL ON FUNCTION public.can_read_dayfolder_file(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_dayfolder_file(uuid) TO authenticated;

CREATE POLICY dayfolder_files_select_visible
  ON public.dayfolder_files FOR SELECT TO authenticated
  USING (public.can_read_dayfolder_file(file_id));
CREATE POLICY dayfolder_files_insert_own
  ON public.dayfolder_files FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND storage_path LIKE auth.uid()::text || '/%');
CREATE POLICY dayfolder_files_update_own
  ON public.dayfolder_files FOR UPDATE TO authenticated
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY dayfolder_files_delete_own
  ON public.dayfolder_files FOR DELETE TO authenticated
  USING (author_id = auth.uid());

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('dayfolder-files', 'dayfolder-files', false, 52428800)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit;

CREATE POLICY dayfolder_storage_insert_own
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dayfolder-files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY dayfolder_storage_update_own
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'dayfolder-files' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'dayfolder-files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY dayfolder_storage_delete_own
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'dayfolder-files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY dayfolder_storage_select_visible
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'dayfolder-files'
    AND public.can_read_dayfolder_file((storage.filename(name))::uuid)
  );

CREATE OR REPLACE FUNCTION public.sync_dayfolder_items(p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF jsonb_typeof(p_items) <> 'array' THEN RAISE EXCEPTION 'p_items must be an array'; END IF;

  INSERT INTO public.dayfolder_items (id, author_id, author_name, visibility, payload, created_at, updated_at)
  SELECT x.id, auth.uid(), COALESCE(NULLIF(x.author_name, ''), '멤버'),
         CASE WHEN x.visibility = 'members' THEN 'members' ELSE 'private' END,
         x.payload, COALESCE(x.created_at, now()), now()
  FROM jsonb_to_recordset(p_items) AS x(
    id uuid, author_id uuid, author_name text, visibility text,
    payload jsonb, created_at timestamptz, updated_at timestamptz
  )
  ON CONFLICT (id) DO UPDATE SET
    author_name = EXCLUDED.author_name,
    visibility = EXCLUDED.visibility,
    payload = EXCLUDED.payload,
    updated_at = now()
  WHERE public.dayfolder_items.author_id = auth.uid();

  DELETE FROM public.dayfolder_items i
  WHERE i.author_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_to_recordset(p_items) AS x(id uuid) WHERE x.id = i.id
    );
END;
$$;
REVOKE ALL ON FUNCTION public.sync_dayfolder_items(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_dayfolder_items(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.link_dayfolder_files(p_links jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF jsonb_typeof(p_links) <> 'array' THEN RAISE EXCEPTION 'p_links must be an array'; END IF;
  UPDATE public.dayfolder_files f
  SET item_id = x.item_id
  FROM jsonb_to_recordset(p_links) AS x(file_id uuid, item_id uuid)
  WHERE f.file_id = x.file_id
    AND f.author_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.dayfolder_items i WHERE i.id = x.item_id AND i.author_id = auth.uid());
END;
$$;
REVOKE ALL ON FUNCTION public.link_dayfolder_files(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_dayfolder_files(jsonb) TO authenticated;

COMMIT;

-- DOWN / ROLLBACK (manual, reviewed):
-- DROP POLICY dayfolder_storage_select_visible ON storage.objects;
-- DROP POLICY dayfolder_storage_delete_own ON storage.objects;
-- DROP POLICY dayfolder_storage_update_own ON storage.objects;
-- DROP POLICY dayfolder_storage_insert_own ON storage.objects;
-- DROP FUNCTION public.link_dayfolder_files(jsonb);
-- DROP FUNCTION public.sync_dayfolder_items(jsonb);
-- DROP FUNCTION public.can_read_dayfolder_file(uuid);
-- DROP TABLE public.dayfolder_files;
-- DROP TABLE public.dayfolder_items;
-- DELETE FROM storage.buckets WHERE id = 'dayfolder-files';
