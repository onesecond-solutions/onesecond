BEGIN;

CREATE OR REPLACE FUNCTION public.workspace_legacy_uuid(p_source text, p_id text)
RETURNS uuid LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT (substr(md5(p_source||':'||p_id),1,8)||'-'||substr(md5(p_source||':'||p_id),9,4)||'-'||substr(md5(p_source||':'||p_id),13,4)||'-'||substr(md5(p_source||':'||p_id),17,4)||'-'||substr(md5(p_source||':'||p_id),21,12))::uuid
$$;

CREATE TABLE public.workspace_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL,
 parent_id uuid REFERENCES public.workspace_items(id) ON DELETE SET NULL,
 item_type text NOT NULL CHECK(item_type IN('folder','note','memo','link','document','file')),
 title text NOT NULL DEFAULT '', body text, url text, storage_path text, mime_type text,
 extension text, file_size bigint CHECK(file_size IS NULL OR file_size>=0),
 visibility text NOT NULL DEFAULT 'private' CHECK(visibility IN('private','public')),
 legacy_source text, legacy_id text, legacy_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
 UNIQUE(legacy_source,legacy_id)
);
CREATE TABLE public.workspace_customers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL, name text NOT NULL,
 phone text, status text, profile jsonb NOT NULL DEFAULT '{}'::jsonb,
 legacy_source text, legacy_id text, legacy_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
 UNIQUE(legacy_source,legacy_id)
);
CREATE TABLE public.workspace_consultations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL,
 customer_id uuid NOT NULL REFERENCES public.workspace_customers(id) ON DELETE CASCADE,
 channel text, content text NOT NULL DEFAULT '', consulted_at timestamptz NOT NULL DEFAULT now(),
 legacy_source text, legacy_id text, legacy_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(legacy_source,legacy_id)
);
CREATE TABLE public.workspace_tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL,
 customer_id uuid REFERENCES public.workspace_customers(id) ON DELETE SET NULL,
 title text NOT NULL, description text, task_date date NOT NULL, task_time time, completed_at timestamptz,
 legacy_source text, legacy_id text, legacy_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
 UNIQUE(legacy_source,legacy_id)
);

CREATE INDEX workspace_items_owner_idx ON public.workspace_items(owner_id,updated_at DESC);
CREATE INDEX workspace_items_parent_idx ON public.workspace_items(parent_id);
CREATE INDEX workspace_items_public_idx ON public.workspace_items(updated_at DESC) WHERE visibility='public' AND deleted_at IS NULL;
CREATE INDEX workspace_customers_owner_idx ON public.workspace_customers(owner_id,updated_at DESC);
CREATE INDEX workspace_consultations_owner_idx ON public.workspace_consultations(owner_id,consulted_at DESC);
CREATE INDEX workspace_consultations_customer_idx ON public.workspace_consultations(customer_id,consulted_at DESC);
CREATE INDEX workspace_tasks_owner_date_idx ON public.workspace_tasks(owner_id,task_date,task_time);

ALTER TABLE public.workspace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY workspace_items_select ON public.workspace_items FOR SELECT TO authenticated USING(owner_id=auth.uid() OR visibility='public');
CREATE POLICY workspace_items_insert ON public.workspace_items FOR INSERT TO authenticated WITH CHECK(owner_id=auth.uid());
CREATE POLICY workspace_items_update ON public.workspace_items FOR UPDATE TO authenticated USING(owner_id=auth.uid()) WITH CHECK(owner_id=auth.uid());
CREATE POLICY workspace_items_delete ON public.workspace_items FOR DELETE TO authenticated USING(owner_id=auth.uid());
CREATE POLICY workspace_customers_owner ON public.workspace_customers FOR ALL TO authenticated USING(owner_id=auth.uid()) WITH CHECK(owner_id=auth.uid());
CREATE POLICY workspace_consultations_owner ON public.workspace_consultations FOR ALL TO authenticated USING(owner_id=auth.uid()) WITH CHECK(owner_id=auth.uid());
CREATE POLICY workspace_tasks_owner ON public.workspace_tasks FOR ALL TO authenticated USING(owner_id=auth.uid()) WITH CHECK(owner_id=auth.uid());

INSERT INTO public.workspace_items(id,owner_id,item_type,title,body,url,visibility,legacy_source,legacy_id,legacy_payload,created_at,updated_at)
SELECT public.workspace_legacy_uuid('library',j->>'id'),(j->>'owner_id')::uuid,
 CASE WHEN nullif(j->>'memo_text','') IS NOT NULL THEN 'memo' WHEN nullif(j->>'link_url','') IS NOT NULL THEN 'link' ELSE 'document' END,
 coalesce(j->>'title',''),coalesce(j->>'memo_text',j->>'description'),coalesce(j->>'link_url',j->>'file_url',j->>'image_url'),
 CASE WHEN coalesce(j->>'scope','personal')='global' THEN 'public' ELSE 'private' END,'library',j->>'id',j,
 coalesce((j->>'created_at')::timestamptz,now()),coalesce((j->>'updated_at')::timestamptz,(j->>'created_at')::timestamptz,now())
FROM (SELECT to_jsonb(x) j FROM public.library x) q WHERE j->>'owner_id' ~* '^[0-9a-f-]{36}$';

INSERT INTO public.workspace_items(id,owner_id,item_type,title,body,visibility,legacy_source,legacy_id,legacy_payload,created_at,updated_at)
SELECT public.workspace_legacy_uuid('scripts',j->>'id'),(j->>'owner_id')::uuid,'note',coalesce(j->>'title',''),j->>'script_text',
 CASE WHEN coalesce(j->>'scope','personal')='global' THEN 'public' ELSE 'private' END,'scripts',j->>'id',j,
 coalesce((j->>'created_at')::timestamptz,now()),coalesce((j->>'updated_at')::timestamptz,(j->>'created_at')::timestamptz,now())
FROM (SELECT to_jsonb(x) j FROM public.scripts x) q WHERE j->>'owner_id' ~* '^[0-9a-f-]{36}$';

INSERT INTO public.workspace_items(id,owner_id,item_type,title,visibility,legacy_source,legacy_id,legacy_payload,created_at,updated_at,deleted_at)
SELECT public.workspace_legacy_uuid('myspace_folders',j->>'id'),(j->>'owner_id')::uuid,'folder',coalesce(j->>'name',''),
 CASE WHEN coalesce(j->>'scope','personal')='global' THEN 'public' ELSE 'private' END,'myspace_folders',j->>'id',j,
 coalesce((j->>'created_at')::timestamptz,now()),coalesce((j->>'updated_at')::timestamptz,(j->>'created_at')::timestamptz,now()),nullif(j->>'deleted_at','')::timestamptz
FROM (SELECT to_jsonb(x) j FROM public.myspace_folders x) q WHERE j->>'owner_id' ~* '^[0-9a-f-]{36}$';
UPDATE public.workspace_items wi SET parent_id=public.workspace_legacy_uuid('myspace_folders',wi.legacy_payload->>'parent_id')
WHERE wi.legacy_source='myspace_folders' AND nullif(wi.legacy_payload->>'parent_id','') IS NOT NULL;

INSERT INTO public.workspace_items(id,owner_id,parent_id,item_type,title,storage_path,mime_type,extension,file_size,visibility,legacy_source,legacy_id,legacy_payload,created_at,updated_at,deleted_at)
SELECT public.workspace_legacy_uuid('myspace_files',j->>'id'),(j->>'owner_id')::uuid,
 CASE WHEN nullif(j->>'folder_id','') IS NULL THEN NULL ELSE public.workspace_legacy_uuid('myspace_folders',j->>'folder_id') END,
 'file',coalesce(j->>'original_name',''),j->>'storage_path',j->>'mime_type',j->>'ext',nullif(j->>'file_size','')::bigint,
 CASE WHEN coalesce(j->>'scope','personal')='global' THEN 'public' ELSE 'private' END,'myspace_files',j->>'id',j,
 coalesce((j->>'created_at')::timestamptz,now()),coalesce((j->>'updated_at')::timestamptz,(j->>'created_at')::timestamptz,now()),nullif(j->>'deleted_at','')::timestamptz
FROM (SELECT to_jsonb(x) j FROM public.myspace_files x) q WHERE j->>'owner_id' ~* '^[0-9a-f-]{36}$';

INSERT INTO public.workspace_customers(id,owner_id,name,phone,status,profile,legacy_source,legacy_id,legacy_payload,created_at,updated_at,deleted_at)
SELECT public.workspace_legacy_uuid('sales_customers',j->>'id'),(j->>'owner_id')::uuid,coalesce(j->>'name',''),coalesce(j->>'phone',j->>'phone_raw'),j->>'status',coalesce(j->'profile','{}'::jsonb),
 'sales_customers',j->>'id',j,coalesce((j->>'created_at')::timestamptz,now()),coalesce((j->>'updated_at')::timestamptz,(j->>'created_at')::timestamptz,now()),nullif(j->>'deleted_at','')::timestamptz
FROM (SELECT to_jsonb(x) j FROM public.sales_customers x) q WHERE j->>'owner_id' ~* '^[0-9a-f-]{36}$';

INSERT INTO public.workspace_consultations(id,owner_id,customer_id,channel,content,consulted_at,legacy_source,legacy_id,legacy_payload,created_at,updated_at)
SELECT public.workspace_legacy_uuid('sales_consultations',j->>'id'),(j->>'owner_id')::uuid,public.workspace_legacy_uuid('sales_customers',j->>'customer_id'),j->>'channel',coalesce(j->>'memo',''),
 coalesce((j->>'consulted_at')::timestamptz,(j->>'created_at')::timestamptz,now()),'sales_consultations',j->>'id',j,
 coalesce((j->>'created_at')::timestamptz,now()),coalesce((j->>'updated_at')::timestamptz,(j->>'created_at')::timestamptz,now())
FROM (SELECT to_jsonb(x) j FROM public.sales_consultations x) q
WHERE j->>'owner_id' ~* '^[0-9a-f-]{36}$' AND EXISTS(SELECT 1 FROM public.workspace_customers c WHERE c.id=public.workspace_legacy_uuid('sales_customers',j->>'customer_id'));

INSERT INTO public.workspace_tasks(id,owner_id,title,description,task_date,task_time,legacy_source,legacy_id,legacy_payload,created_at,updated_at)
SELECT public.workspace_legacy_uuid('calendar_events',j->>'id'),(j->>'author_id')::uuid,coalesce(j->>'title',''),j->>'description',(j->>'event_date')::date,nullif(j->>'event_time','')::time,
 'calendar_events',j->>'id',j,coalesce((j->>'created_at')::timestamptz,now()),coalesce((j->>'updated_at')::timestamptz,(j->>'created_at')::timestamptz,now())
FROM (SELECT to_jsonb(x) j FROM public.calendar_events x) q WHERE j->>'author_id' ~* '^[0-9a-f-]{36}$' AND nullif(j->>'event_date','') IS NOT NULL;

COMMIT;
-- DOWN / ROLLBACK (manual, reviewed): drop workspace_tasks, workspace_consultations, workspace_customers, workspace_items and workspace_legacy_uuid after reverting /insu/ reads.
