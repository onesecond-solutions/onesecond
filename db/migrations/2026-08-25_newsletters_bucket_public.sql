-- 🟠 데이터변경(DDL) — 소식지(newsletters) Storage 버킷 읽기(SELECT) 공개 전환
-- 목적: /insuwork/ 보험워크 "참고자료" 섹션(소식지·영업방향)을 비로그인 방문자도 열람 가능하게
--       열었으나, 썸네일 이미지·원본 PDF는 여전히 안 뜬다. 원인: public.newsletters 테이블은
--       이미 anon 읽기가 허용돼 있지만(2026-07-09_anon_public_read_newsletters_scripts.sql),
--       그 파일들이 저장된 storage.buckets 'newsletters' 는 public=false 로 남아 있어
--       서명(signed) URL 없이는(=비로그인) 400으로 거부된다.
--   · 이 마이그레이션은 newsletters 버킷을 public=true 로 전환하고, storage.objects 에
--     bucket_id='newsletters' 대상 anon/authenticated SELECT 정책만 추가한다.
-- ⚠️ 화이트리스트 원칙: 이 버킷(newsletters)의 **읽기(SELECT)만** anon 공개로 바꾼다.
--    myspace 등 다른 버킷(개인 파일·고객 자료 등 진짜 민감한 개인정보)은 이 파일에서 절대 건드리지 않는다.
--    다른 테이블·버킷에 anon 정책을 추가할 때는 반드시 별도 파일로 분리한다.
-- ⚠️ 쓰기(INSERT/UPDATE/DELETE) 정책은 이 마이그레이션의 스코프 밖이다. 기존 업로드 권한
--    (누가 소식지를 올리는지)은 그대로 유지하며, 여기서 새로 만들거나 변경하지 않는다.
-- ⚠️ 실행 전 확인: Supabase 프로젝트 = onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)

BEGIN;

-- ── 전용 공개 Storage 버킷 전환 ──────────────────────────────────────────────
-- public = true → 공개 URL(/storage/v1/object/public/newsletters/...)로 anon GET이
-- RLS 검사 없이 바로 열림. 그래도 SDK 경유(.storage.from().download()) 대비 SELECT 정책도 명시적으로 부여한다.
-- 버킷은 이미 존재(비공개)하므로 INSERT ... ON CONFLICT 는 사실상 UPDATE로 동작한다.
INSERT INTO storage.buckets (id, name, public)
VALUES ('newsletters', 'newsletters', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS newsletters_storage_select_anon ON storage.objects;
CREATE POLICY newsletters_storage_select_anon ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'newsletters');
DROP POLICY IF EXISTS newsletters_storage_select_authenticated ON storage.objects;
CREATE POLICY newsletters_storage_select_authenticated ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'newsletters');

COMMIT;

-- DOWN (롤백 경로 — 수동 실행용, 읽기 공개만 되돌림. 버킷·기존 쓰기 정책은 손대지 않음):
--   BEGIN;
--   DROP POLICY IF EXISTS newsletters_storage_select_authenticated ON storage.objects;
--   DROP POLICY IF EXISTS newsletters_storage_select_anon ON storage.objects;
--   UPDATE storage.buckets SET public = false WHERE id = 'newsletters';
--   COMMIT;

-- 검증(🟢 읽기전용):
--   SELECT id, public FROM storage.buckets WHERE id='newsletters';                                  -- public=true
--   SELECT policyname, roles, cmd FROM pg_policies WHERE tablename='objects' AND schemaname='storage'
--     AND policyname LIKE 'newsletters_storage_%' ORDER BY policyname;                               -- 2개(anon·authenticated, SELECT)
--   SELECT count(*) FROM pg_policies WHERE tablename='objects' AND schemaname='storage'
--     AND policyname LIKE 'newsletters_storage_%' AND cmd <> 'SELECT';                                -- 0(쓰기 정책 신규 생성 없음)
--   -- SET LOCAL ROLE anon; SELECT count(*) FROM storage.objects WHERE bucket_id='newsletters'; RESET ROLE; -- 비로그인 관점 정상 조회
