-- ═══════════════════════════════════════════════════════════════════════════
-- 🟠 스키마 생성 — 설계사 전용 자료(advisor_doc_contents) [WO-6 1차 파일럿]
--    공개 지식 문서에 1:1/1:N로 붙는 "설계사 전용 콘텐츠"를 담는 보호 저장 테이블.
--    전용 내용은 공개 HTML·공개 JS에 넣지 않고 이 테이블에서 인증 후 로드한다.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⏳ DRAFT — 미적용. 실제 반영 = production-db Environment 대표 1클릭 승인
--    (workflow_dispatch db-migrate.yml) 자리에서 실행한다. main 머지만으로는 validate까지.
--
-- ⚠️ 대상 프로젝트(유일 진실 원천): onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
--    구버전(qursjteiovcylqiepmlo)은 2026-06-19 삭제됨 — 절대 참조 금지.
--
-- 목적(WO-6, 대표 확정 2026-07-26):
--   로그인한 설계사에게만 노출되는 문서별 전용 콘텐츠의 보호 저장.
--   비로그인 = REST 0행 차단(anon 정책 미생성) + 버튼 DOM 미생성(프런트).
--   일반인용 회원계정이 향후 생겨도 단순 authenticated 만으로는 열리지 않게
--   "열람 자격"을 서버(RLS)에서 확인한다.
--
-- 열람 정책(대표 확정):
--   · 1차 파일럿  : 임태성 실장(user_id 98c5f4f9…) + 관리자(admin) 만 열람.
--   · 2차 정식공개: 정상 로그인 설계사(조직 소속 role) 전체 열람.
--   · 일반 설계사 = status 'published' 만 / 관리자 = 전체 상태 열람·작성·수정.
--   · 비로그인    = 접근 차단.
--   ⭐ 콘텐츠 재이관 없이 "권한 설정만" 바꿔 확장한다 →
--      열람 범위를 헬퍼 함수 os_can_read_advisor_docs() 하나에 격리했다.
--      2차 전환은 이 함수 본문만 CREATE OR REPLACE 하면 되고(정책·테이블·데이터 무변경),
--      전환 SQL 은 이 파일 하단 "정식 공개 전환" 주석 블록에 준비돼 있다(별도 승인 시 별도 파일로 실행).
--
-- 문서 연결키:
--   doc_id text = js/knowledge-registry.js KNOWLEDGE_DOCS.id ('silson' | 'cancer-treatment'
--   | 'caregiver-history'). 원장이 JS 하드코딩이라 물리 FK 불가 — 이 저장소 관행(text 논리키)대로.
--   section_key 로 한 문서당 전용 블록 다수(1:N).
--
-- ⚠️ RLS 헬퍼 전제: 아래 정책·함수는 프로젝트 표준 헬퍼 is_admin() 을 참조한다.
--    is_admin() 이 라이브 DB에 실재함을 전제(다수 마이그레이션이 사용·라이브 배포 확인됨).
--    부재 시 create policy/function 단계에서 "function is_admin() does not exist" 로 실행 실패한다.
--    ⭐ 파일럿은 의존 헬퍼를 is_admin() 하나로 최소화했다(get_my_role() 등 미검증 헬퍼 의존은
--       2차 정식 전환 블록으로 분리 → 파일럿 apply 실패 위험 제거).
--
-- 멱등성: create table/index/function = if not exists / or replace,
--         policy = drop ... if exists 후 create → 재실행 안전.
--
-- 진실 원천:
--   docs/work_orders/insurance_public_path_v1.md (WO-6)
--   RLS 패턴 참조: db/migrations/2026-07-10_silson_generations_schema_with_search.sql
--                 docs/migrations/2026-06-27_posts_insurer_ga_manager_rls.sql (role 제한 사례)
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create extension if not exists pgcrypto;

-- ── advisor_doc_contents : 문서별 설계사 전용 콘텐츠 ─────────────────────────
create table if not exists advisor_doc_contents (
  id           uuid primary key default gen_random_uuid(),

  doc_id       text not null,                       -- KNOWLEDGE_DOCS.id (논리키)
  section_key  text,                                -- 문서 내 전용 블록 키(1:N)
  title        text,
  body         text,                                -- 전용 본문(공개 HTML/JS 미포함)

  status       text not null default 'draft'
               check (status in ('draft','reviewing','approved','published')),
  sort_order   int  not null default 0,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists advisor_doc_contents_doc_status_idx
  on advisor_doc_contents (doc_id, status, sort_order);

-- ── 열람 자격 격리 함수 (전환 스위치) ───────────────────────────────────────
-- 1차 파일럿: 임태성 실장 + 관리자만 true.
-- ⭐ 2차 정식 전환 시 이 함수 본문만 os_is_advisor() 로 교체(하단 주석 블록).
-- ⚠️ 보안 하드닝(독립검수 2026-07-26): security 모드 명시 + search_path 고정 + is_admin() 스키마 한정.
--    search_path 미고정 시 unqualified is_admin() 이름 해석이 런타임 search_path에 의존(함수 하이재킹 표면).
create or replace function os_can_read_advisor_docs() returns boolean
  language sql stable
  security invoker
  set search_path = public
as $$
  select public.is_admin()
      or (auth.uid())::text = '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd';  -- 임태성 실장
$$;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table advisor_doc_contents enable row level security;

-- 읽기: to authenticated + anon 정책 미생성 = 비로그인 자동 0행 차단.
--   관리자 = 전체 상태 / 열람 자격자 = published 만.
drop policy if exists advisor_doc_contents_select on advisor_doc_contents;
create policy advisor_doc_contents_select on advisor_doc_contents
  for select to authenticated
  using ( is_admin() or (os_can_read_advisor_docs() and status = 'published') );

-- 쓰기: 관리자만(작성·수정·삭제).
drop policy if exists advisor_doc_contents_write on advisor_doc_contents;
create policy advisor_doc_contents_write on advisor_doc_contents
  for all to authenticated
  using ( is_admin() ) with check ( is_admin() );

-- 심층방어(독립검수 권고): anon 테이블 ACL 자체 제거 → RLS 토글 회귀 시에도 권한오류로 차단(벨트+멜빵).
revoke all on advisor_doc_contents from anon;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- DOWN / ROLLBACK (수동 실행용 — 필요 시 아래 블록을 apply)
-- ═══════════════════════════════════════════════════════════════════════════
-- begin;
--   drop policy if exists advisor_doc_contents_select on advisor_doc_contents;
--   drop policy if exists advisor_doc_contents_write  on advisor_doc_contents;
--   drop table    if exists advisor_doc_contents;
--   drop function if exists os_can_read_advisor_docs();
--   -- (2차 전환을 이미 실행했다면) drop function if exists os_is_advisor();
-- commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- 정식 공개 전환 (2차 — 대표 파일럿 검수 후 별도 파일/별도 승인으로 실행)
--   콘텐츠·테이블·정책 무변경. 아래 2개만 실행하면 전체 로그인 설계사에 개방된다.
-- ═══════════════════════════════════════════════════════════════════════════
-- begin;
--   -- (1) 설계사 자격 판정: 조직 소속 role(ga_/insurer_)만. 일반인 회원 배제.
--   --     ⚠️ get_my_role() 헬퍼 라이브 실재 확인 후 실행(posts_insurer 마이그레이션이 사용·배포 확인됨).
--   create or replace function os_is_advisor() returns boolean
--     language sql stable
--     security invoker
--     set search_path = public
--   as $$
--     select public.is_admin()
--         or coalesce(public.get_my_role(),'') like 'ga_%'
--         or coalesce(public.get_my_role(),'') like 'insurer_%';
--   $$;
--   -- (2) 열람 범위 스위치를 설계사 전체로 교체(정책·데이터 무변경).
--   create or replace function os_can_read_advisor_docs() returns boolean
--     language sql stable
--     security invoker
--     set search_path = public
--   as $$
--     select public.os_is_advisor();
--   $$;
-- commit;
