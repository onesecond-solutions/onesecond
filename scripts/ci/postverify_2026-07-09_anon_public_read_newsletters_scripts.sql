-- CI 사후 검증 (🟢 읽기전용) — anon 공개 읽기 마이그레이션
--   (db/migrations/2026-07-09_anon_public_read_newsletters_scripts.sql) 적용 직후 실행.
--
-- 검증 목표(4대):
--   1) 소식지(newsletters): anon 노출 = status='published' 건수와 일치, 비published 누수 0.
--   2) 스크립트(scripts):   anon 노출 = scope='global' AND is_active AND NOT is_sample 만, 그 외 누수 0.
--   3) 화이트리스트 밖(posts·myspace_files·calendar_events·team_notices): anon 노출 = 0(자동 차단 확인).
--   4) 구조: anon SELECT 정책 2개만 적재 · 그 외 테이블에 anon 정책 신규 생성 0.
--
-- 방식(2단계):
--   (A) 접속 역할(postgres = public 테이블 소유자, FORCE RLS 아니면 RLS 우회)로 기대 노출 건수를 전수 계산.
--   (B) set_config('role','anon',true)로 anon 역할 전환(RLS 강제) → anon 관점 실측이 기대와 일치하는지 검증.
--   · set_config is_local=true 이므로 DO 종료(트랜잭션 끝) 시 role 자동 원복 — 별도 RESET/트랜잭션 래퍼 불필요.
--   · 불일치·누수 발견 시 RAISE EXCEPTION → psql(ON_ERROR_STOP=1) 종료코드!=0 → apply_and_verify.sh 가 FAIL 처리.
--
-- 정합(house convention): RLS·JWT 의존 "행위" 검증은 라이브 계정 게이트로 분리하나, 본 건은 anon(비로그인)
--   공개 범위가 정책의 본질이므로 anon 역할 실측을 사후검증에 포함한다.
do $$
declare
  exp_nl    bigint;    -- 기대: published 소식지 건수(소유자 전수)
  exp_sc    bigint;    -- 기대: 공용·활성·비샘플 스크립트 건수(소유자 전수)
  got       bigint;    -- anon 실측
  leaked    bigint;    -- 누수 건수
  n         int;
  bypass    boolean;   -- 접속 역할이 RLS를 우회하는가(superuser/bypassrls)
  nl_full   boolean;   -- newsletters 전수 카운트 신뢰 가능(우회 or NOT force RLS)
  sc_full   boolean;   -- scripts 전수 카운트 신뢰 가능
  tbl       text;
begin
  -- ── 0) 구조 검증(소유자 관점, RLS 무관) ─────────────────────────────────
  -- 0-1) newsletters anon SELECT 정책 = published 조건, roles에 anon 포함, cmd=SELECT
  select count(*) into n from pg_policies
   where schemaname='public' and tablename='newsletters'
     and policyname='newsletters_select_anon_published'
     and cmd='SELECT' and 'anon'=any(roles);
  if n <> 1 then raise exception 'FAIL newsletters anon SELECT 정책 미적재(%/1).', n; end if;

  -- 0-2) scripts anon SELECT 정책 = global·active·non-sample 조건, roles에 anon 포함
  select count(*) into n from pg_policies
   where schemaname='public' and tablename='scripts'
     and policyname='scripts_select_anon_public'
     and cmd='SELECT' and 'anon'=any(roles);
  if n <> 1 then raise exception 'FAIL scripts anon SELECT 정책 미적재(%/1).', n; end if;

  -- 0-3) anon 쓰기 정책 0 (INSERT/UPDATE/DELETE anon 정책이 새로 생기지 않았어야)
  select count(*) into n from pg_policies
   where schemaname='public' and tablename in ('newsletters','scripts')
     and 'anon'=any(roles) and cmd <> 'SELECT';
  if n <> 0 then raise exception 'FAIL anon 쓰기 정책 존재(%). SELECT 외 anon 정책은 없어야 함.', n; end if;

  -- 0-4) 화이트리스트 밖 테이블에 anon 정책 신규 생성 0(방어)
  select count(*) into n from pg_policies
   where schemaname='public' and 'anon'=any(roles)
     and tablename in ('posts','myspace_files','calendar_events','team_notices');
  if n <> 0 then raise exception 'FAIL 화이트리스트 밖 anon 정책 존재(%). posts/myspace_files/calendar_events/team_notices 는 anon 정책이 없어야 함.', n; end if;

  -- ── 1) 기대 노출 건수(전수) — 접속 역할이 RLS 우회 가능할 때만 신뢰 ─────────
  select (rolsuper or rolbypassrls) into bypass from pg_roles where rolname = current_user;
  bypass := coalesce(bypass, false);
  -- FORCE ROW LEVEL SECURITY 가 아니면 소유자는 RLS 우회 → 전수 카운트 신뢰 가능
  select bypass or not c.relforcerowsecurity into nl_full
    from pg_class c join pg_namespace ns on ns.oid=c.relnamespace
   where ns.nspname='public' and c.relname='newsletters';
  select bypass or not c.relforcerowsecurity into sc_full
    from pg_class c join pg_namespace ns on ns.oid=c.relnamespace
   where ns.nspname='public' and c.relname='scripts';

  select count(*) into exp_nl from public.newsletters where status='published';
  select count(*) into exp_sc from public.scripts
   where scope='global' and is_active=true and is_sample=false;

  -- ── 2) anon 역할로 전환(RLS 강제) — 이후 모든 쿼리는 anon 관점 ─────────────
  perform set_config('role','anon', true);

  -- 2-1) 소식지: 비published 누수 0 (핵심 보안 불변 · 우회여부 무관하게 항상 강제)
  select count(*) into leaked from public.newsletters where status <> 'published';
  if leaked <> 0 then raise exception 'FAIL anon 에 비published 소식지 노출(%건).', leaked; end if;
  -- 소식지 노출 = published 건수 일치(전수 신뢰 가능한 경우만 등식 강제)
  select count(*) into got from public.newsletters;
  if nl_full then
    if got <> exp_nl then
      raise exception 'FAIL anon 소식지 노출 불일치: anon=% expected(published)=%', got, exp_nl;
    end if;
  end if;

  -- 2-2) 스크립트: 공용·활성·비샘플 외 누수 0 (핵심 보안 불변 · 항상 강제)
  select count(*) into leaked from public.scripts
   where not (scope='global' and is_active=true and is_sample=false);
  if leaked <> 0 then raise exception 'FAIL anon 에 비공개 스크립트 노출(%건). global·active·non-sample 외가 보임.', leaked; end if;
  -- 스크립트 노출 = 공용·활성·비샘플 건수 일치(전수 신뢰 가능한 경우만)
  select count(*) into got from public.scripts;
  if sc_full then
    if got <> exp_sc then
      raise exception 'FAIL anon 스크립트 노출 불일치: anon=% expected(global·active·non-sample)=%', got, exp_sc;
    end if;
  end if;

  -- ── 3) 화이트리스트 밖 테이블 = anon 0 (자동 차단 확인) ───────────────────
  --   RLS로 0행이면 통과. 테이블 SELECT 권한 자체가 없어 insufficient_privilege 나도 = 노출 0(안전)로 간주.
  --   존재하지 않는 테이블(to_regclass null)은 건너뜀.
  foreach tbl in array array['posts','myspace_files','calendar_events','team_notices']
  loop
    if to_regclass('public.'||tbl) is null then
      continue;  -- 테이블 부재 → 검증 대상 없음
    end if;
    begin
      execute format('select count(*) from public.%I', tbl) into leaked;
      if leaked <> 0 then
        raise exception 'FAIL anon 에 화이트리스트 밖 테이블 노출: %(%건).', tbl, leaked;
      end if;
    exception
      when insufficient_privilege then
        null;  -- 권한 거부 = anon 접근 불가 = 안전(노출 0)
    end;
  end loop;

  raise notice 'POSTVERIFY PASS: anon 소식지=%(전수검증=%) · 스크립트=%(전수검증=%) 노출 정확 · 비published/비공개 누수 0 · posts·myspace_files·calendar_events·team_notices 노출 0.',
    exp_nl, nl_full, exp_sc, sc_full;
end $$;
