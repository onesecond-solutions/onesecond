-- 🟠 데이터변경(DDL) — briefing_leaflets 쓰기 RLS에 파일럿(임태성) 계정 허용 추가
-- 문제: insubriefing/leaflets.js의 프론트 드롭존은 auth.uid() === PILOT_ID(98c5f4f9...)
--       계정에서만 노출되는데, 2026-08-18 원 migration의 INSERT/UPDATE/DELETE 정책은
--       public.users.role='admin' 만 허용한다. 파일럿 계정(bylts@naver.com)의 role이
--       'admin'이 아니면 프론트는 드롭을 허용하고 DB는 거부해 "저장 실패" 에러가 난다.
-- 조치: role='admin' 조건은 그대로 두고, PILOT_ID 계정을 OR 조건으로 추가한다(대표 계정이
--       실제로 role='admin'이면 이 추가는 무해한 중복일 뿐이고, 아니라면 이게 실제 수정이다).
-- ⚠️ 화이트리스트 원칙 유지: 이 파일은 briefing_leaflets/storage.objects(briefing-leaflets 버킷)
--    정책만 바꾼다. 다른 테이블은 건드리지 않는다.
-- ⚠️ 실행 전 확인: Supabase 프로젝트 = onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)

BEGIN;

DROP POLICY IF EXISTS briefing_leaflets_admin_insert ON public.briefing_leaflets;
CREATE POLICY briefing_leaflets_admin_insert ON public.briefing_leaflets FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd'::uuid
    OR EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin')
  );
DROP POLICY IF EXISTS briefing_leaflets_admin_update ON public.briefing_leaflets;
CREATE POLICY briefing_leaflets_admin_update ON public.briefing_leaflets FOR UPDATE TO authenticated
  USING (
    auth.uid() = '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd'::uuid
    OR EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin')
  );
DROP POLICY IF EXISTS briefing_leaflets_admin_delete ON public.briefing_leaflets;
CREATE POLICY briefing_leaflets_admin_delete ON public.briefing_leaflets FOR DELETE TO authenticated
  USING (
    auth.uid() = '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd'::uuid
    OR EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin')
  );

DROP POLICY IF EXISTS briefing_leaflets_storage_admin_insert ON storage.objects;
CREATE POLICY briefing_leaflets_storage_admin_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'briefing-leaflets'
    AND (
      auth.uid() = '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd'::uuid
      OR EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin')
    )
  );
DROP POLICY IF EXISTS briefing_leaflets_storage_admin_update ON storage.objects;
CREATE POLICY briefing_leaflets_storage_admin_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'briefing-leaflets'
    AND (
      auth.uid() = '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd'::uuid
      OR EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin')
    )
  );
DROP POLICY IF EXISTS briefing_leaflets_storage_admin_delete ON storage.objects;
CREATE POLICY briefing_leaflets_storage_admin_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'briefing-leaflets'
    AND (
      auth.uid() = '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd'::uuid
      OR EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin')
    )
  );

COMMIT;

-- DOWN (롤백 경로 — 수동 실행용, 2026-08-18 원 정책으로 복귀):
--   BEGIN;
--   DROP POLICY IF EXISTS briefing_leaflets_admin_insert ON public.briefing_leaflets;
--   CREATE POLICY briefing_leaflets_admin_insert ON public.briefing_leaflets FOR INSERT TO authenticated
--     WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));
--   DROP POLICY IF EXISTS briefing_leaflets_admin_update ON public.briefing_leaflets;
--   CREATE POLICY briefing_leaflets_admin_update ON public.briefing_leaflets FOR UPDATE TO authenticated
--     USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));
--   DROP POLICY IF EXISTS briefing_leaflets_admin_delete ON public.briefing_leaflets;
--   CREATE POLICY briefing_leaflets_admin_delete ON public.briefing_leaflets FOR DELETE TO authenticated
--     USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));
--   DROP POLICY IF EXISTS briefing_leaflets_storage_admin_insert ON storage.objects;
--   CREATE POLICY briefing_leaflets_storage_admin_insert ON storage.objects FOR INSERT TO authenticated
--     WITH CHECK (bucket_id = 'briefing-leaflets' AND EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));
--   DROP POLICY IF EXISTS briefing_leaflets_storage_admin_update ON storage.objects;
--   CREATE POLICY briefing_leaflets_storage_admin_update ON storage.objects FOR UPDATE TO authenticated
--     USING (bucket_id = 'briefing-leaflets' AND EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));
--   DROP POLICY IF EXISTS briefing_leaflets_storage_admin_delete ON storage.objects;
--   CREATE POLICY briefing_leaflets_storage_admin_delete ON storage.objects FOR DELETE TO authenticated
--     USING (bucket_id = 'briefing-leaflets' AND EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));
--   COMMIT;

-- 검증(🟢 읽기전용):
--   SELECT policyname, cmd, qual, with_check FROM pg_policies
--     WHERE schemaname='public' AND tablename='briefing_leaflets' AND cmd IN ('INSERT','UPDATE','DELETE')
--     ORDER BY policyname;                                        -- 3개, 각 정의에 PILOT_ID uuid 리터럴 포함
--   SELECT policyname, cmd FROM pg_policies WHERE tablename='objects' AND schemaname='storage'
--     AND policyname LIKE 'briefing_leaflets_storage_admin_%' ORDER BY policyname;  -- 3개
--   SELECT id, role FROM public.users WHERE id = '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd';  -- 참고: 실제 role 값 확인(admin이 아니어도 이제 정상 동작해야 함)
