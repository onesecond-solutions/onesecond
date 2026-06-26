-- ============================================================
-- onesecond 영업노트 import STEP 2 : 변환 + 검증 (2026-06-26)
-- 전제: STEP 1(staging 적재, 대표님 직접 실행)으로 _sales_import_staging 2621행 적재 완료.
-- 이 파일은 staging -> sales_customers / sales_consultations 변환 + 검증만 수행(주민번호 리터럴 0).
-- 1차: 그대로 실행 -> 맨 아래 검증 그리드 확인 -> 2차: 마지막 ROLLBACK 을 COMMIT 으로 바꿔 재실행
-- owner_id = auth.users('bylts@naver.com') 자동 (RLS: auth.uid()::text = owner_id)
-- ============================================================
BEGIN;

-- owner 확인
DO $$ DECLARE oid text; BEGIN
  SELECT id::text INTO oid FROM auth.users WHERE email='bylts@naver.com' LIMIT 1;
  IF oid IS NULL THEN RAISE EXCEPTION 'owner not found'; END IF;
  RAISE NOTICE 'owner_id=%', oid;
END $$;

-- 2) 고객 원장 (전화 dedup)
INSERT INTO sales_customers
  (owner_id, name, phone, phone_raw, birth_date, gender, channel, status, source_ref, created_at, updated_at)
SELECT DISTINCT ON (s.grp_key)
  (SELECT id::text FROM auth.users WHERE email='bylts@naver.com' LIMIT 1),
  NULLIF(s.c_name,''), NULLIF(s.c_phone_fmt,''), NULLIF(s.c_phone_raw,''),
  NULLIF(s.c_birth,'')::date, NULLIF(s.c_gender,''), NULLIF(s.c_channel,''),
  '신규', 'imp:'||s.grp_key, now(), now()
FROM _sales_import_staging s
ORDER BY s.grp_key, s.rid;

-- 3) 상담 기록 (source_ref 매핑, 원문 100% 보존)
INSERT INTO sales_consultations
  (customer_id, owner_id, consulted_at, channel, memo, created_at)
SELECT c.id, c.owner_id,
  COALESCE(NULLIF(s.c_date,'')::date, DATE '2000-01-01'),
  NULLIF(s.c_channel,''),
  NULLIF(trim(
    coalesce(s.c_content,'')
    || CASE WHEN coalesce(s.c_memo,'')<>'' THEN E'\n[추가메모] '||s.c_memo ELSE '' END
    || E'\n[원본] '||coalesce(s.c_raw,'')
  ),''),
  now()
FROM _sales_import_staging s
JOIN sales_customers c
  ON c.source_ref='imp:'||s.grp_key
 AND c.owner_id=(SELECT id::text FROM auth.users WHERE email='bylts@naver.com' LIMIT 1)
ORDER BY s.rid;

-- 4) 검증 (이 그리드 확인)
WITH o AS (SELECT id::text oid FROM auth.users WHERE email='bylts@naver.com' LIMIT 1)
SELECT * FROM (
  SELECT 1 ord,'고객수(기대 2583)' k, count(*)::text v FROM sales_customers,o WHERE owner_id=oid AND source_ref LIKE 'imp:%'
  UNION ALL SELECT 2,'상담수(기대 2621)', count(*)::text FROM sales_consultations,o WHERE owner_id=oid
  UNION ALL SELECT 3,'무전화 고객(기대 230)', count(*)::text FROM sales_customers,o WHERE owner_id=oid AND source_ref LIKE 'imp:r%'
  UNION ALL SELECT 4,'다회상담 고객(기대 35)', count(*)::text FROM (SELECT customer_id FROM sales_consultations,o WHERE owner_id=oid GROUP BY customer_id HAVING count(*)>1) z
  UNION ALL SELECT 5,'원문보존 상담수(기대 2621)', count(*)::text FROM sales_consultations,o WHERE owner_id=oid AND memo LIKE '%[원본]%'
) x ORDER BY ord;

-- 검증 OK면 위 ROLLBACK -> COMMIT 으로 바꿔 재실행. COMMIT 성공 후 staging 정리:
--   DROP TABLE IF EXISTS _sales_import_staging;
ROLLBACK;
