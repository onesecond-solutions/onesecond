-- 어드민 관제탑 시스템 현황 패널용 RPC (2026-06-17)
-- Storage 사용량(버킷별+총)·전체 파일수·DB 용량·OCR 색인 대기수를 한 번에 반환.
-- SECURITY DEFINER + 어드민 체크 → 어드민만 데이터 수신(일반 사용자는 예외). 읽기 전용.
-- 신버전 DB(pdnwgzneooyygfejrvbg)에서 실행.

CREATE OR REPLACE FUNCTION public.admin_system_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, pg_catalog
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT jsonb_build_object(
    'db_bytes',      pg_database_size(current_database()),
    'storage_bytes', COALESCE((SELECT sum((metadata->>'size')::bigint) FROM storage.objects), 0),
    'total_files',   (SELECT count(*) FROM storage.objects),
    'ocr_pending',   (SELECT count(*) FROM public.myspace_files WHERE ocr_status IS NULL AND deleted_at IS NULL),
    'buckets', COALESCE((
      SELECT jsonb_agg(b ORDER BY (b->>'bytes')::bigint DESC) FROM (
        SELECT jsonb_build_object('bucket', bucket_id, 'files', count(*),
               'bytes', COALESCE(sum((metadata->>'size')::bigint),0)) AS b
        FROM storage.objects GROUP BY bucket_id
      ) t
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_system_status() TO authenticated;
