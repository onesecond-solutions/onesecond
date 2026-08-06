-- 🟠 데이터변경(DDL) — 영업방향·전략 원장 테이블 신설 (소식지 스키마 클론)
-- 목적: 홈 "영업방향·전략" 카드(임태성 게이트 전용)의 원장. 회사별 영업방향/영업전략 파일
--       (PPT·PDF)을 소식지와 동일 포맷으로 저장·미리보기·다운로드.
-- 저장소: Storage 는 기존 private 버킷 `newsletters` 를 `sales-strategy/` 경로 프리픽스로 재사용
--         (신규 버킷·스토리지 정책 SQL 없음 — 검증된 서명 인프라 그대로 사용).
--   · source_path      = 원본 파일(PPT/PDF)  → 다운로드용
--   · preview_pdf_path = PPT→PDF 변환본(PDF) → 미리보기용(PDF.js)
-- ⚠️ 실행 전 확인: Supabase 프로젝트 = onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
-- 화면 노출은 총괄팀장 후속 PR(insu/index.html)에서 임태성 게이트로 격리. status=published 만 노출.

BEGIN;

CREATE TABLE IF NOT EXISTS public.sales_strategy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file_url text, source_filename text NOT NULL, source_path text,
  preview_pdf_path text,                                  -- PPT→PDF 변환본(미리보기용). PDF 원본이면 source_path 와 동일 가능
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
  status text DEFAULT 'reviewing',                        -- 신규 INSERT 기본 reviewing, 검수 후 published 승격
  submitted_by text,
  file_hash text,                                         -- 원본 파일 sha256(64 hex) — 중복 판단
  is_revision boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_strategy_company ON public.sales_strategy (company);
CREATE INDEX IF NOT EXISTS idx_sales_strategy_type ON public.sales_strategy (insurance_type);
CREATE INDEX IF NOT EXISTS idx_sales_strategy_publish_date ON public.sales_strategy (publish_year DESC NULLS LAST, publish_month DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_sales_strategy_category ON public.sales_strategy (category);
CREATE INDEX IF NOT EXISTS idx_sales_strategy_search_tsv ON public.sales_strategy USING GIN (search_tsv);
CREATE INDEX IF NOT EXISTS idx_sales_strategy_status ON public.sales_strategy (status);
CREATE INDEX IF NOT EXISTS idx_sales_strategy_dupkey ON public.sales_strategy (company, publish_year, publish_month, category);
CREATE INDEX IF NOT EXISTS idx_sales_strategy_file_hash ON public.sales_strategy (file_hash);

CREATE OR REPLACE FUNCTION public.touch_sales_strategy_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_sales_strategy_updated_at ON public.sales_strategy;
CREATE TRIGGER trg_sales_strategy_updated_at BEFORE UPDATE ON public.sales_strategy FOR EACH ROW EXECUTE FUNCTION public.touch_sales_strategy_updated_at();

ALTER TABLE public.sales_strategy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sales_strategy_select_authenticated ON public.sales_strategy;
CREATE POLICY sales_strategy_select_authenticated ON public.sales_strategy FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS sales_strategy_admin_insert ON public.sales_strategy;
CREATE POLICY sales_strategy_admin_insert ON public.sales_strategy FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));
DROP POLICY IF EXISTS sales_strategy_admin_update ON public.sales_strategy;
CREATE POLICY sales_strategy_admin_update ON public.sales_strategy FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));
DROP POLICY IF EXISTS sales_strategy_admin_delete ON public.sales_strategy;
CREATE POLICY sales_strategy_admin_delete ON public.sales_strategy FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));

COMMIT;

-- DOWN (롤백 경로 — 수동 실행용, 본 마이그레이션은 신규 테이블이라 되돌림은 테이블 제거):
--   BEGIN;
--   DROP TRIGGER IF EXISTS trg_sales_strategy_updated_at ON public.sales_strategy;
--   DROP FUNCTION IF EXISTS public.touch_sales_strategy_updated_at();
--   DROP TABLE IF EXISTS public.sales_strategy;
--   COMMIT;

-- 검증(🟢 읽기전용):
--   SELECT to_regclass('public.sales_strategy');                        -- 테이블 존재
--   SELECT relrowsecurity FROM pg_class WHERE oid='public.sales_strategy'::regclass;  -- RLS on
--   SELECT COUNT(*) FROM pg_policies WHERE schemaname='public' AND tablename='sales_strategy';  -- 정책 4개
