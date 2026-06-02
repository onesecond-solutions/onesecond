BEGIN;
CREATE TABLE IF NOT EXISTS public.newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_pdf_url text, source_filename text NOT NULL, source_path text,
  company text NOT NULL, insurance_type text, publish_year int, publish_month int,
  category text, title text,
  full_text text, page_count int, char_length int, chars_per_page int,
  text_quality text, ocr_needed boolean DEFAULT false,
  search_tsv tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(company,'')),'A') ||
    setweight(to_tsvector('simple', coalesce(title,'')),'A') ||
    setweight(to_tsvector('simple', coalesce(category,'')),'B') ||
    setweight(to_tsvector('simple', coalesce(full_text,'')),'C')
  ) STORED,
  ocr_status text DEFAULT 'done', ocr_error text, extracted_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_newsletters_company ON public.newsletters (company);
CREATE INDEX IF NOT EXISTS idx_newsletters_type ON public.newsletters (insurance_type);
CREATE INDEX IF NOT EXISTS idx_newsletters_publish_date ON public.newsletters (publish_year DESC NULLS LAST, publish_month DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_newsletters_category ON public.newsletters (category);
CREATE INDEX IF NOT EXISTS idx_newsletters_search_tsv ON public.newsletters USING GIN (search_tsv);
CREATE INDEX IF NOT EXISTS idx_newsletters_ocr_status ON public.newsletters (ocr_status);
CREATE OR REPLACE FUNCTION public.touch_newsletters_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_newsletters_updated_at ON public.newsletters;
CREATE TRIGGER trg_newsletters_updated_at BEFORE UPDATE ON public.newsletters FOR EACH ROW EXECUTE FUNCTION public.touch_newsletters_updated_at();
ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS newsletters_select_authenticated ON public.newsletters;
CREATE POLICY newsletters_select_authenticated ON public.newsletters FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS newsletters_admin_insert ON public.newsletters;
CREATE POLICY newsletters_admin_insert ON public.newsletters FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));
DROP POLICY IF EXISTS newsletters_admin_update ON public.newsletters;
CREATE POLICY newsletters_admin_update ON public.newsletters FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));
DROP POLICY IF EXISTS newsletters_admin_delete ON public.newsletters;
CREATE POLICY newsletters_admin_delete ON public.newsletters FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));
COMMIT;
