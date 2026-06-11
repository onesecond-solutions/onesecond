-- ════════════════════════════════════════════════════════════════════
-- rls_overview() — 어드민 콘솔 "데이터 권한(RLS)" 점검용 읽기 전용 RPC
--   · 각 public 테이블의 RLS 활성화 여부 + 정책 개수 + 정책별 동작(cmd) 반환
--   · 어드민만 호출 가능(is_admin 게이트). 읽기 전용(pg_catalog 메타만 조회, 데이터·DDL 변경 0)
--   · 신버전 DB(pdnwgzneooyygfejrvbg)에서 실행
-- 작성: 총괄팀장(Code) 2026-06-12 / 실행: 대표님 / 용도: 권한 검증 탭 v2
-- ════════════════════════════════════════════════════════════════════

create or replace function public.rls_overview()
returns json
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  -- 어드민만 — RLS 정책 메타는 민감 정보라 게이트
  if not coalesce(public.is_admin(), false) then
    raise exception 'admin only';
  end if;

  return (
    select coalesce(json_agg(row_to_json(t) order by t.table_name), '[]'::json)
    from (
      select
        c.relname                                              as table_name,
        c.relrowsecurity                                       as rls_enabled,
        (select count(*)::int from pg_policy p where p.polrelid = c.oid) as policy_count,
        coalesce((
          select json_agg(json_build_object(
            'name', p.polname,
            'cmd',  case p.polcmd
                      when 'r' then 'SELECT'
                      when 'a' then 'INSERT'
                      when 'w' then 'UPDATE'
                      when 'd' then 'DELETE'
                      when '*' then 'ALL'
                      else p.polcmd::text
                    end
          ) order by p.polname)
          from pg_policy p where p.polrelid = c.oid
        ), '[]'::json)                                         as policies
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and c.relname not like 'pg\_%'
    ) t
  );
end;
$$;

-- 호출 권한: 로그인 사용자에게 부여하되, 함수 내부 is_admin 게이트가 실제 통제
revoke all on function public.rls_overview() from public, anon;
grant execute on function public.rls_overview() to authenticated;

-- 검증(실행 후 별도 RUN):  select public.rls_overview();
