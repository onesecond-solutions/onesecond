-- postverify — 암 설계사 전용 자료 3건 시드 검증 (2026-07-27_advisor_cancer_seed.sql)
-- db-migrate.yml 이 apply 직후 실행. 실패(assert) 시 워크플로 빨간불.

do $$
declare
  n_total int;
  n_pub   int;
begin
  select count(*) into n_total
    from advisor_contents
   where source_type='knowledge_doc' and source_id='cancer-treatment'
     and section_key in ('consult-1','guideline-1','standalone-1');

  select count(*) into n_pub
    from advisor_contents
   where source_type='knowledge_doc' and source_id='cancer-treatment'
     and section_key in ('consult-1','guideline-1','standalone-1')
     and status='published';

  if n_total <> 3 then
    raise exception 'postverify FAIL: cancer advisor rows = % (expected 3)', n_total;
  end if;
  if n_pub <> 3 then
    raise exception 'postverify FAIL: cancer advisor published = % (expected 3)', n_pub;
  end if;

  -- content_blocks 가 배열이고 비어있지 않은지(껍데기 방지)
  if exists (
    select 1 from advisor_contents
     where source_type='knowledge_doc' and source_id='cancer-treatment'
       and section_key in ('consult-1','guideline-1','standalone-1')
       and (jsonb_typeof(content_blocks) <> 'array' or jsonb_array_length(content_blocks) = 0)
  ) then
    raise exception 'postverify FAIL: cancer advisor content_blocks empty/non-array';
  end if;

  raise notice 'postverify OK: cancer advisor 3건 published, content_blocks 정상';
end $$;
