-- ═══════════════════════════════════════════════════════════════════════════
-- 🟠 스키마 — 설계사 전용 자료 범용 테이블 advisor_contents [안 B, 대표 확정 2026-07-26]
--    모든 지식페이지·카테고리(향후 확장)에서 공용으로 쓰는 설계사 전용 콘텐츠.
--    특정 문서 하드코딩(doc_id) 대신 (source_type, source_id)로 다양한 원본에 연결.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⏳ DRAFT — 미적용. 실제 반영 = workflow_dispatch db-migrate.yml → production-db → AI팀 apply.
--
-- ⚠️ 대상 프로젝트(유일 진실 원천): onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
--
-- 목적(대표 확정 2026-07-26):
--   기존 advisor_doc_contents(doc 한정)를 범용 구조로 승격. 블록형 content_blocks(jsonb)로
--   일반 설명·강조·체크리스트·고객 설명 문장을 표현. 검색결과는 별도 소스로 저장하지 않고
--   원본 자료의 (source_type, source_id)를 전달해 같은 전용 콘텐츠를 조회한다.
--
-- 설계 확정:
--   · 블록 4종(앱 렌더 계약, DB는 jsonb 자유): paragraph / callout(label로 강조·상담질문 구분) /
--     checklist(items[]) / script(고객 설명 문장). 필요 시 타입만 확장.
--   · source_type = 'knowledge_doc' 부터 사용. ⚠️ DB에 종류 CHECK 를 걸지 않는다(향후 확장 자유).
--   · (source_type, source_id, section_key) UNIQUE 로 중복 방지.
--   · 기존 advisor_doc_contents 는 롤백 자산으로 유지(전체 전환 확인 후 별도 폐기).
--
-- 열람 정책: 기존 헬퍼 os_can_read_advisor_docs()(파일럿=임태성 실장+admin, 정식 전환은
--   함수 본문 교체) 그대로 재사용. anon 정책 미생성 + revoke 로 비로그인 REST 0행 차단.
--   ⚠️ is_admin() / os_can_read_advisor_docs() 라이브 실재 전제(2026-07-26_advisor_doc_contents.sql 로 배포됨).
--
-- 파일럿 이관: 기존 advisor_doc_contents(silson/pilot-1, body 단문) 1건을
--   advisor_contents(knowledge_doc/silson/pilot-1, content_blocks=[paragraph]) 로 명시 변환 이관.
--
-- 멱등성: create table if not exists / policy drop-create / insert on conflict do nothing → 재실행 안전.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create extension if not exists pgcrypto;

-- ── advisor_contents : 범용 설계사 전용 콘텐츠 ──────────────────────────────
create table if not exists advisor_contents (
  id             uuid primary key default gen_random_uuid(),

  source_type    text not null,                 -- 'knowledge_doc' … (CHECK 없음: 확장 자유)
  source_id      text not null,                 -- 원본 식별자(문서 id 등)
  section_key    text not null,                 -- 전략 섹션 키(원본 내 다중 블록그룹)

  title          text,
  content_blocks jsonb not null default '[]'::jsonb   -- 블록 배열(paragraph/callout/checklist/script)
                 constraint advisor_contents_blocks_is_array
                 check (jsonb_typeof(content_blocks) = 'array'),  -- 배열 보장(블록 type은 앱 계약, 확장 자유)

  status         text not null default 'draft'
                 check (status in ('draft','reviewing','approved','published')),
  sort_order     int  not null default 0,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint advisor_contents_source_section_uniq unique (source_type, source_id, section_key)
);

create index if not exists advisor_contents_lookup_idx
  on advisor_contents (source_type, source_id, status, sort_order);

-- ── RLS (기존 헬퍼 재사용, anon 정책 미생성 = 비로그인 0행) ──────────────────
alter table advisor_contents enable row level security;

drop policy if exists advisor_contents_select on advisor_contents;
create policy advisor_contents_select on advisor_contents
  for select to authenticated
  using ( public.is_admin() or (public.os_can_read_advisor_docs() and status = 'published') );

drop policy if exists advisor_contents_write on advisor_contents;
create policy advisor_contents_write on advisor_contents
  for all to authenticated
  using ( public.is_admin() ) with check ( public.is_admin() );

-- 심층방어: anon 테이블 ACL 제거(RLS 토글 회귀 대비).
revoke all on advisor_contents from anon;

-- ── 파일럿 1건 명시 변환 이관 (advisor_doc_contents → advisor_contents) ──────
--   body(단문) → content_blocks=[{type:paragraph,text:body}]. source_type=knowledge_doc.
insert into advisor_contents (source_type, source_id, section_key, title, content_blocks, status, sort_order)
select 'knowledge_doc', d.doc_id, d.section_key, d.title,
       jsonb_build_array(jsonb_build_object('type','paragraph','text', d.body)),
       d.status, d.sort_order
  from advisor_doc_contents d
 where d.doc_id = 'silson' and d.section_key = 'pilot-1'
on conflict (source_type, source_id, section_key) do nothing;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- DOWN / ROLLBACK — 신규 테이블만 제거(기존 advisor_doc_contents 무접촉이라 원상 즉시)
-- ═══════════════════════════════════════════════════════════════════════════
-- begin;
--   drop table if exists advisor_contents;
-- commit;
