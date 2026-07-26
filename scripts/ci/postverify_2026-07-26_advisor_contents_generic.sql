-- CI 사후 검증 (🟢 읽기전용) — 범용 설계사 전용 테이블 advisor_contents [안 B]
--   (db/migrations/2026-07-26_advisor_contents_generic.sql) 적용 직후 실행.
--
-- 검증 목표:
--   1) advisor_contents 테이블 존재 + 필수 컬럼(source_type/source_id/section_key/content_blocks/status/sort_order).
--   2) content_blocks 타입 = jsonb.
--   3) (source_type, source_id, section_key) UNIQUE 제약 존재.
--   4) RLS enabled + 정책 2개(select/write).
--   5) ⭐ 직접 REST 차단: 정책 roles 에 anon/public 없음(비로그인 0행 보증).
--   6) ⭐ 이관 정합: knowledge_doc/silson/pilot-1 published 1건 +
--      content_blocks 가 배열이고 첫 블록 type='paragraph' + text 비어있지 않음.
do $$
declare
  tbl        boolean;
  col_ok     boolean;
  cb_type    text;
  uniq_ok    boolean;
  rls_on     boolean;
  has_sel    boolean;
  has_wr     boolean;
  bad_roles  int;
  mig_cnt    int;
  first_type text;
  first_txt  text;
begin
  -- 1) 테이블 + 필수 컬럼
  select exists(select 1 from information_schema.tables
                 where table_schema='public' and table_name='advisor_contents') into tbl;
  if not tbl then raise exception 'FAIL advisor_contents 테이블 미생성.'; end if;

  select bool_and(c) from (
    select (count(*) filter (where column_name in
      ('source_type','source_id','section_key','content_blocks','status','sort_order')) = 6) as c
      from information_schema.columns
     where table_schema='public' and table_name='advisor_contents'
  ) s into col_ok;
  if not col_ok then raise exception 'FAIL 필수 컬럼 누락.'; end if;

  -- 2) content_blocks = jsonb
  select data_type into cb_type from information_schema.columns
   where table_schema='public' and table_name='advisor_contents' and column_name='content_blocks';
  if cb_type is distinct from 'jsonb' then
    raise exception 'FAIL content_blocks 타입 jsonb 아님(%).', cb_type;
  end if;

  -- 3) UNIQUE(source_type, source_id, section_key)
  select exists(
    select 1 from pg_constraint
     where conrelid='public.advisor_contents'::regclass and contype='u'
       and conname='advisor_contents_source_section_uniq'
  ) into uniq_ok;
  if not uniq_ok then raise exception 'FAIL (source_type,source_id,section_key) UNIQUE 제약 부재.'; end if;

  -- 4) RLS + 정책 2개
  select c.relrowsecurity into rls_on from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname='advisor_contents';
  if not coalesce(rls_on,false) then raise exception 'FAIL RLS 미활성.'; end if;

  select bool_or(policyname='advisor_contents_select'),
         bool_or(policyname='advisor_contents_write')
    into has_sel, has_wr
    from pg_policies where schemaname='public' and tablename='advisor_contents';
  if not (coalesce(has_sel,false) and coalesce(has_wr,false)) then
    raise exception 'FAIL 정책 누락(select=% write=%).', has_sel, has_wr;
  end if;

  -- 5) anon/public 차단
  select count(*) into bad_roles from pg_policies
   where schemaname='public' and tablename='advisor_contents'
     and ('anon' = any(roles) or 'public' = any(roles));
  if bad_roles > 0 then
    raise exception 'FAIL 정책에 anon/public 역할 존재(비로그인 노출 위험). 건수=%', bad_roles;
  end if;

  -- 6) 이관 정합
  select count(*) into mig_cnt from advisor_contents
   where source_type='knowledge_doc' and source_id='silson' and section_key='pilot-1' and status='published';
  if mig_cnt < 1 then raise exception 'FAIL 파일럿 이관분 미존재(knowledge_doc/silson/pilot-1 published).'; end if;

  select content_blocks->0->>'type', content_blocks->0->>'text'
    into first_type, first_txt
    from advisor_contents
   where source_type='knowledge_doc' and source_id='silson' and section_key='pilot-1';
  if first_type is distinct from 'paragraph' then
    raise exception 'FAIL 이관 content_blocks 첫 블록 type paragraph 아님(%).', first_type;
  end if;
  if first_txt is null or length(btrim(first_txt)) = 0 then
    raise exception 'FAIL 이관 content_blocks 첫 블록 text 비어있음.';
  end if;

  -- 7) select 정책 published 게이트 실재(과다노출 회귀 방지 — 선례 postverify 정합)
  perform 1 from pg_policies
   where schemaname='public' and tablename='advisor_contents'
     and policyname='advisor_contents_select' and qual ilike '%published%';
  if not found then
    raise exception 'FAIL select 정책에 status=published 게이트 부재(과다노출 위험).';
  end if;

  raise notice 'OK advisor_contents 검증 통과 (테이블·컬럼·jsonb·unique·RLS·정책2·anon차단·published게이트·이관정합 paragraph).';
end $$;
