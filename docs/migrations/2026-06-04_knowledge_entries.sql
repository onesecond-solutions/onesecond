-- 보험 지식 엔진 v0 — knowledge_entries 테이블 (관리자 전용, AI초안)
-- 🟠 데이터 변경 (CREATE) — 승인 후 신버전(pdnwgzneooyygfejrvbg) SQL 에디터에서 실행.
-- 설계서: docs/product/knowledge_engine_v0.md / 추출: supabase/functions/extract-knowledge
-- 원칙: 관리자 전용(is_admin RLS) / status='ai_draft' / 사용자 화면·검색 미연결.

create table if not exists public.knowledge_entries (
  id           bigserial primary key,
  type         text not null,          -- 'term' | 'product' | 'insurer' | 'scenario'
  title        text not null,          -- 용어명 / 상품명 / 보험사명 / 시나리오 제목
  body         text,                   -- 정의 / 설명 / 내용
  category     text,                   -- 분류
  tags         text[],                 -- 키워드
  source_type  text,                   -- 'newsletter' | 'kakao' | 'navigation' | 'manual'
  source_ref   text,                   -- 출처 id (newsletters.id 등) — 환각 검증 근거
  status       text not null default 'ai_draft',  -- 'ai_draft' | 'reviewed' | 'published'
  confidence   text,                   -- 'high' | 'med' | 'low'
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   text
);

alter table public.knowledge_entries enable row level security;

-- 관리자 전용 (사용자 노출 0). is_admin() SECURITY DEFINER 재사용.
drop policy if exists knowledge_admin_all on public.knowledge_entries;
create policy knowledge_admin_all on public.knowledge_entries
  for all to authenticated using (is_admin()) with check (is_admin());

-- 중복방지(조건 9)·출처조회 인덱스
create index if not exists idx_knowledge_type_title on public.knowledge_entries (type, lower(title));
create index if not exists idx_knowledge_source     on public.knowledge_entries (source_type, source_ref);
