-- 🟠 데이터변경(DDL) — 보험브리핑 홈 "리플렛 캘린더" 원장 테이블 + 전용 공개 Storage 버킷 신설
-- 목적: /insubriefing/ 홈 화면에 놓일 캘린더에 원수사 리플렛(이미지/PDF)을 날짜별로 드래그 업로드
--       하고, 비로그인 방문자도 파일 원본까지 그대로 볼 수 있게 한다.
--   · 1장 드롭 = 이미지 그대로 저장. 2장 이상 한번에 드롭 = 프론트(pdf-lib)에서 1개 PDF로 합쳐 저장.
--   · 업로드(쓰기)는 대표(관리자) 전용. 열람(읽기)은 로그인 여부와 무관하게 전부 공개.
-- ⚠️ 화이트리스트 원칙: 이 테이블(briefing_leaflets)과 이 버킷(briefing-leaflets)만 anon 공개.
--    기존 workspace_items/workspace_customers 등 민감 테이블은 이 파일에서 절대 건드리지 않는다.
--    다른 테이블·버킷에 anon 정책을 추가할 때는 반드시 별도 파일로 분리한다.
-- ⚠️ 실행 전 확인: Supabase 프로젝트 = onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)

BEGIN;

-- ── 1) 원장 테이블 ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.briefing_leaflets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  file_type text NOT NULL CHECK (file_type IN ('image', 'pdf')),
  storage_path text NOT NULL,                             -- briefing-leaflets 버킷 내 경로
  mime_type text,
  file_size bigint,
  page_count int,                                          -- pdf(2장 이상 병합)만 사용, 이미지는 null
  received_date date NOT NULL DEFAULT current_date,        -- 캘린더에 표시될 날짜
  sort_order int NOT NULL DEFAULT 0,                        -- 같은 날짜 내 정렬
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz                                    -- soft delete(관리자 삭제 시에만 채움)
);

CREATE INDEX IF NOT EXISTS idx_briefing_leaflets_received_date ON public.briefing_leaflets (received_date DESC);
CREATE INDEX IF NOT EXISTS idx_briefing_leaflets_owner ON public.briefing_leaflets (owner_id);
CREATE INDEX IF NOT EXISTS idx_briefing_leaflets_active ON public.briefing_leaflets (received_date) WHERE deleted_at IS NULL;

ALTER TABLE public.briefing_leaflets ENABLE ROW LEVEL SECURITY;

-- 읽기: 로그인 여부 무관 전체 공개(삭제된 행 제외)
DROP POLICY IF EXISTS briefing_leaflets_select_authenticated ON public.briefing_leaflets;
CREATE POLICY briefing_leaflets_select_authenticated ON public.briefing_leaflets FOR SELECT TO authenticated USING (deleted_at IS NULL);
DROP POLICY IF EXISTS briefing_leaflets_select_anon ON public.briefing_leaflets;
CREATE POLICY briefing_leaflets_select_anon ON public.briefing_leaflets FOR SELECT TO anon USING (deleted_at IS NULL);

-- 쓰기: 관리자(public.users.role='admin')만
DROP POLICY IF EXISTS briefing_leaflets_admin_insert ON public.briefing_leaflets;
CREATE POLICY briefing_leaflets_admin_insert ON public.briefing_leaflets FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));
DROP POLICY IF EXISTS briefing_leaflets_admin_update ON public.briefing_leaflets;
CREATE POLICY briefing_leaflets_admin_update ON public.briefing_leaflets FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));
DROP POLICY IF EXISTS briefing_leaflets_admin_delete ON public.briefing_leaflets;
CREATE POLICY briefing_leaflets_admin_delete ON public.briefing_leaflets FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));

-- ── 2) 전용 공개 Storage 버킷 ────────────────────────────────────────────────
-- public = true → 공개 URL(/storage/v1/object/public/briefing-leaflets/...)로 anon GET이
-- RLS 검사 없이 바로 열림. 그래도 SDK 경유(.storage.from().download()) 대비 SELECT 정책도 명시적으로 부여한다.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('briefing-leaflets', 'briefing-leaflets', true, 20971520)  -- 20MB/파일
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS briefing_leaflets_storage_select_anon ON storage.objects;
CREATE POLICY briefing_leaflets_storage_select_anon ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'briefing-leaflets');
DROP POLICY IF EXISTS briefing_leaflets_storage_select_authenticated ON storage.objects;
CREATE POLICY briefing_leaflets_storage_select_authenticated ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'briefing-leaflets');

DROP POLICY IF EXISTS briefing_leaflets_storage_admin_insert ON storage.objects;
CREATE POLICY briefing_leaflets_storage_admin_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'briefing-leaflets' AND EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));
DROP POLICY IF EXISTS briefing_leaflets_storage_admin_update ON storage.objects;
CREATE POLICY briefing_leaflets_storage_admin_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'briefing-leaflets' AND EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));
DROP POLICY IF EXISTS briefing_leaflets_storage_admin_delete ON storage.objects;
CREATE POLICY briefing_leaflets_storage_admin_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'briefing-leaflets' AND EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));

COMMIT;

-- DOWN (롤백 경로 — 수동 실행용, 신규 테이블·버킷이라 되돌림은 전부 제거):
--   BEGIN;
--   DROP POLICY IF EXISTS briefing_leaflets_storage_admin_delete ON storage.objects;
--   DROP POLICY IF EXISTS briefing_leaflets_storage_admin_update ON storage.objects;
--   DROP POLICY IF EXISTS briefing_leaflets_storage_admin_insert ON storage.objects;
--   DROP POLICY IF EXISTS briefing_leaflets_storage_select_authenticated ON storage.objects;
--   DROP POLICY IF EXISTS briefing_leaflets_storage_select_anon ON storage.objects;
--   DELETE FROM storage.objects WHERE bucket_id = 'briefing-leaflets';
--   DELETE FROM storage.buckets WHERE id = 'briefing-leaflets';
--   DROP TABLE IF EXISTS public.briefing_leaflets;
--   COMMIT;

-- 검증(🟢 읽기전용):
--   SELECT to_regclass('public.briefing_leaflets');                                   -- 테이블 존재
--   SELECT relrowsecurity FROM pg_class WHERE oid='public.briefing_leaflets'::regclass; -- RLS on
--   SELECT COUNT(*) FROM pg_policies WHERE schemaname='public' AND tablename='briefing_leaflets'; -- 5개
--   SELECT id, public, file_size_limit FROM storage.buckets WHERE id='briefing-leaflets';          -- public=true
--   SELECT policyname, roles, cmd FROM pg_policies WHERE tablename='objects' AND schemaname='storage'
--     AND policyname LIKE 'briefing_leaflets_storage_%' ORDER BY policyname;                        -- 5개
--   -- SET LOCAL ROLE anon; SELECT count(*) FROM public.briefing_leaflets; RESET ROLE;   -- 비로그인 관점 정상 조회
