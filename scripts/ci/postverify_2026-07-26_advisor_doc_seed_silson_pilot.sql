-- CI 사후 검증 (🟢 읽기전용) — 설계사 전용 자료 파일럿 시드
--   (db/migrations/2026-07-26_advisor_doc_seed_silson_pilot.sql) 적용 직후 실행.
--
-- 검증 목표:
--   1) doc_id='silson' + status='published' 전용 콘텐츠가 1건 이상 존재(버튼 표출 전제).
--   2) pilot-1 행의 body 가 비어 있지 않음.
do $$
declare
  pub_cnt  int;
  body_ok  boolean;
begin
  select count(*) into pub_cnt
    from advisor_doc_contents
   where doc_id='silson' and status='published';
  if pub_cnt < 1 then
    raise exception 'FAIL silson published 전용 콘텐츠 미존재(n=%). 파일럿 버튼이 뜨지 않음.', pub_cnt;
  end if;

  select (body is not null and length(btrim(body)) > 0) into body_ok
    from advisor_doc_contents
   where doc_id='silson' and section_key='pilot-1';
  if not coalesce(body_ok, false) then
    raise exception 'FAIL silson/pilot-1 body 비어있음(또는 행 부재).';
  end if;

  raise notice 'OK silson published 전용 콘텐츠 % 건, pilot-1 body 존재.', pub_cnt;
end $$;
