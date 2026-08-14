BEGIN;

CREATE OR REPLACE FUNCTION public.workspace_legacy_uuid(p_source text, p_id text)
RETURNS uuid LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT (substr(md5(p_source || ':' || p_id),1,8)||'-'||substr(md5(p_source || ':' || p_id),9,4)||'-'||substr(md5(p_source || ':' || p_id),13,4)||'-'||substr(md5(p_source || ':' || p_id),17,4)||'-'||substr(md5(p_source || ':' || p_id),21,12))::uuid
$$;

CREATE TABLE IF NOT EXISTS public.workspace_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.workspace_items(id) ON DELETE SET NULL,
  item_type text NOT NULL CHECK (item_type IN ('folder','note','memo','link','document','file')),
  title text NOT NULL DEFAULT '',
  body text,
  url text,
  storage_path text,
  mime_type text,
  extension text,
  file_size bigint CHECK (file_size IS NULL OR file_size >= 0),
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public')),
  legacy_source text,
  legacy_id text,
  legacy_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (legacy_source, legacy_id)
);
CREATE INDEX IF NOT EXISTS workspace_items_owner_idx ON public.workspace_items(owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS workspace_items_parent_idx ON public.workspace_items(parent_id);
CREATE INDEX IF NOT EXISTS workspace_items_public_idx ON public.workspace_items(updated_at DESC) WHERE visibility='public' AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.workspace_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  status text,
  profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  legacy_source text,
  legacy_id text,
  legacy_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (legacy_source, legacy_id)
);
CREATE INDEX IF NOT EXISTS workspace_customers_owner_idx ON public.workspace_customers(owner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.workspace_consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.workspace_customers(id) ON DELETE CASCADE,
  channel text,
  content text NOT NULL DEFAULT '',
  consulted_at timestamptz NOT NULL DEFAULT now(),
  legacy_source text,
  legacy_id text,
  legacy_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (legacy_source, legacy_id)
);
CREATE INDEX IF NOT EXISTS workspace_consultations_owner_idx ON public.workspace_consultations(owner_id, consulted_at DESC);
CREATE INDEX IF NOT EXISTS workspace_consultations_customer_idx ON public.workspace_consultations(customer_id, consulted_at DESC);

CREATE TABLE IF NOT EXISTS public.workspace_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.workspace_customers(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  task_date date NOT NULL,
  task_time time,
  completed_at timestamptz,
  legacy_source text,
  legacy_id text,
  legacy_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (legacy_source, legacy_id)
);
CREATE INDEX IF NOT EXISTS workspace_tasks_owner_date_idx ON public.workspace_tasks(owner_id, task_date, task_time);

ALTER TABLE public.workspace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_items_select ON public.workspace_items;
DROP POLICY IF EXISTS workspace_items_insert ON public.workspace_items;
DROP POLICY IF EXISTS workspace_items_update ON public.workspace_items;
DROP POLICY IF EXISTS workspace_items_delete ON public.workspace_items;
DROP POLICY IF EXISTS workspace_customers_owner ON public.workspace_customers;
DROP POLICY IF EXISTS workspace_consultations_owner ON public.workspace_consultations;
DROP POLICY IF EXISTS workspace_tasks_owner ON public.workspace_tasks;
CREATE POLICY workspace_items_select ON public.workspace_items FOR SELECT TO authenticated USING (owner_id=auth.uid() OR visibility='public');
CREATE POLICY workspace_items_insert ON public.workspace_items FOR INSERT TO authenticated WITH CHECK (owner_id=auth.uid());
CREATE POLICY workspace_items_update ON public.workspace_items FOR UPDATE TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
CREATE POLICY workspace_items_delete ON public.workspace_items FOR DELETE TO authenticated USING (owner_id=auth.uid());
CREATE POLICY workspace_customers_owner ON public.workspace_customers FOR ALL TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
CREATE POLICY workspace_consultations_owner ON public.workspace_consultations FOR ALL TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
CREATE POLICY workspace_tasks_owner ON public.workspace_tasks FOR ALL TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());

INSERT INTO public.workspace_items(id,owner_id,item_type,title,body,url,visibility,legacy_source,legacy_id,legacy_payload,created_at,updated_at)
SELECT public.workspace_legacy_uuid('library',l.id::text),l.owner_id::uuid,
  CASE WHEN nullif(l.memo_text,'') IS NOT NULL THEN 'memo' WHEN nullif(l.link_url,'') IS NOT NULL THEN 'link' ELSE 'document' END,
  coalesce(l.title,''),coalesce(l.memo_text,l.description),coalesce(l.link_url,l.file_url,l.image_url),
  CASE WHEN coalesce(l.scope,'personal')='global' THEN 'public' ELSE 'private' END,
  'library',l.id::text,to_jsonb(l),coalesce(l.created_at,now()),coalesce(l.created_at,now())
FROM public.library l WHERE l.owner_id::text ~* '^[0-9a-f-]{36}$' ON CONFLICT (legacy_source,legacy_id) DO NOTHING;

INSERT INTO public.workspace_items(id,owner_id,item_type,title,body,visibility,legacy_source,legacy_id,legacy_payload,created_at,updated_at)
SELECT public.workspace_legacy_uuid('scripts',s.id::text),s.owner_id::uuid,'note',coalesce(s.title,''),s.script_text,
  CASE WHEN coalesce(s.scope,'personal')='global' THEN 'public' ELSE 'private' END,
  'scripts',s.id::text,to_jsonb(s),coalesce(s.created_at,now()),coalesce(s.updated_at,s.created_at,now())
FROM public.scripts s WHERE s.owner_id::text ~* '^[0-9a-f-]{36}$' ON CONFLICT (legacy_source,legacy_id) DO NOTHING;

INSERT INTO public.workspace_items(id,owner_id,item_type,title,visibility,legacy_source,legacy_id,legacy_payload,created_at,updated_at,deleted_at)
SELECT public.workspace_legacy_uuid('myspace_folders',f.id::text),f.owner_id::uuid,'folder',coalesce(f.name,''),
  CASE WHEN coalesce(f.scope,'personal')='global' THEN 'public' ELSE 'private' END,
  'myspace_folders',f.id::text,to_jsonb(f),coalesce(f.created_at,now()),coalesce(f.updated_at,f.created_at,now()),f.deleted_at
FROM public.myspace_folders f WHERE f.owner_id::text ~* '^[0-9a-f-]{36}$' ON CONFLICT (legacy_source,legacy_id) DO NOTHING;

UPDATE public.workspace_items wi SET parent_id=public.workspace_legacy_uuid('myspace_folders',f.parent_id::text)
FROM public.myspace_folders f WHERE wi.legacy_source='myspace_folders' AND wi.legacy_id=f.id::text AND f.parent_id IS NOT NULL;

INSERT INTO public.workspace_items(id,owner_id,parent_id,item_type,title,storage_path,mime_type,extension,file_size,visibility,legacy_source,legacy_id,legacy_payload,created_at,updated_at,deleted_at)
SELECT public.workspace_legacy_uuid('myspace_files',f.id::text),f.owner_id::uuid,
  CASE WHEN f.folder_id IS NULL THEN NULL ELSE public.workspace_legacy_uuid('myspace_folders',f.folder_id::text) END,
  'file',coalesce(f.original_name,''),f.storage_path,f.mime_type,f.ext,f.file_size,
  CASE WHEN coalesce(f.scope,'personal')='global' THEN 'public' ELSE 'private' END,
  'myspace_files',f.id::text,to_jsonb(f),coalesce(f.created_at,now()),coalesce(f.updated_at,f.created_at,now()),f.deleted_at
FROM public.myspace_files f WHERE f.owner_id::text ~* '^[0-9a-f-]{36}$' ON CONFLICT (legacy_source,legacy_id) DO NOTHING;

INSERT INTO public.workspace_customers(id,owner_id,name,phone,status,profile,legacy_source,legacy_id,legacy_payload,created_at,updated_at,deleted_at)
SELECT public.workspace_legacy_uuid('sales_customers',c.id::text),c.owner_id::uuid,coalesce(c.name,''),coalesce(c.phone,c.phone_raw),c.status,coalesce(c.profile,'{}'::jsonb),
  'sales_customers',c.id::text,to_jsonb(c),coalesce(c.created_at,now()),coalesce(c.updated_at,c.created_at,now()),c.deleted_at
FROM public.sales_customers c WHERE c.owner_id::text ~* '^[0-9a-f-]{36}$' ON CONFLICT (legacy_source,legacy_id) DO NOTHING;

INSERT INTO public.workspace_consultations(id,owner_id,customer_id,channel,content,consulted_at,legacy_source,legacy_id,legacy_payload,created_at,updated_at)
SELECT public.workspace_legacy_uuid('sales_consultations',c.id::text),c.owner_id::uuid,public.workspace_legacy_uuid('sales_customers',c.customer_id::text),c.channel,coalesce(c.memo,''),coalesce(c.consulted_at,c.created_at,now()),
  'sales_consultations',c.id::text,to_jsonb(c),coalesce(c.created_at,now()),coalesce(c.created_at,now())
FROM public.sales_consultations c JOIN public.workspace_customers wc ON wc.id=public.workspace_legacy_uuid('sales_customers',c.customer_id::text)
WHERE c.owner_id::text ~* '^[0-9a-f-]{36}$' ON CONFLICT (legacy_source,legacy_id) DO NOTHING;

INSERT INTO public.workspace_tasks(id,owner_id,title,description,task_date,task_time,legacy_source,legacy_id,legacy_payload,created_at,updated_at)
SELECT public.workspace_legacy_uuid('calendar_events',e.id::text),e.author_id::uuid,e.title,e.description,e.event_date,nullif(e.event_time::text,'')::time,
  'calendar_events',e.id::text,to_jsonb(e),coalesce(e.created_at,now()),coalesce(e.created_at,now())
FROM public.calendar_events e WHERE e.author_id::text ~* '^[0-9a-f-]{36}$' ON CONFLICT (legacy_source,legacy_id) DO NOTHING;

COMMIT;

-- DOWN / ROLLBACK (manual, reviewed): switch /insu/ back to legacy reads first, then
-- DROP TABLE workspace_tasks, workspace_consultations, workspace_customers, workspace_items;
-- DROP FUNCTION workspace_legacy_uuid(text,text);
