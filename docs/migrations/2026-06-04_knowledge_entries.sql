-- 보험 지식 엔진 v0 — 데이터 모델 (관리자 전용, AI초안)
-- 🟠 데이터 변경 (CREATE) — 승인 후 신버전(pdnwgzneooyygfejrvbg) SQL 에디터에서 실행.
-- 설계서: docs/product/knowledge_engine_v0.md / 추출: supabase/functions/extract-knowledge
-- 원칙: 관리자 전용(is_admin RLS) / status='ai_draft' 기본 / 사용자 화면·검색 미연결.
-- 추적 체계: run → run_item(newsletter별) → errors / entries  (전부 run_id·run_item_id로 추적)

-- ════ 1. 채굴 런 (전체 실행 1건) ════
create table if not exists public.knowledge_extract_runs (
  run_id          uuid primary key default gen_random_uuid(),
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  model           text,
  source          text,            -- 'sample' | 'ids'
  requested       int,
  processed       int, success int, fail int,
  entries_created int, terms int, products int, insurers int, scenarios int,
  input_chars     bigint, est_input_tokens bigint,
  status          text default 'running'   -- 'running' | 'done' | 'error'
);

-- ════ 2. 런 항목 (newsletter별 처리 상태) ════
create table if not exists public.knowledge_extract_run_items (
  run_item_id       bigserial primary key,
  run_id            uuid not null references public.knowledge_extract_runs(run_id),
  source_type       text not null default 'newsletter',  -- newsletter|chat_log|navigation|post|admin_note
  source_id         text not null,                       -- 원본 id (newsletter_id 등)
  file_name         text,
  company           text,           -- canonical
  status            text,           -- 'processing' | 'success' | 'fail'
  fail_stage        text,           -- 실패 단계 (성공이면 null)
  entries_count     int default 0,
  input_text_length int,
  elapsed_ms        int,
  processed_at      timestamptz not null default now()
);

-- ════ 3. 실패 로그 (건별, 10필드) ════
create table if not exists public.knowledge_extract_errors (
  error_id          bigserial primary key,
  run_id            uuid,                 -- 런 식별
  run_item_id       bigint references public.knowledge_extract_run_items(run_item_id),  -- 항목 식별
  source_type       text,                 -- (1a) newsletter|chat_log|navigation|post|admin_note
  source_id         text,                 -- (1b) 원본 id (구 newsletter_id)
  file_name         text,                 -- (2)
  insurance_company text,                 -- (3) canonical
  stage             text,                 -- (4) fetch|prompt_build|gemini_call|json_parse|validation|insert
  error_message     text,                 -- (5)
  retryable         boolean,              -- (6)
  occurred_at       timestamptz not null default now(),  -- (7)
  input_text_length int,                  -- (8)
  model_name        text                  -- (9)  / run_id = (10)
);

-- ════ 4. 지식 항목 (추출 결과) ════
create table if not exists public.knowledge_entries (
  entry_id               bigserial primary key,
  type                   text not null,   -- 'term' | 'product' | 'insurer' | 'scenario'
  title                  text not null,
  body                   text,
  category               text,
  tags                   text[],
  source_type            text,            -- 'newsletter' | 'chat_log' | 'navigation' | 'post' | 'admin_note' (확장)
  source_id              text,            -- 출처 원본 id (newsletter_id / kakao msg / post id 등) — 환각 검증 근거
  source_title           text,
  source_company         text,            -- 원문 표기 회사명
  canonical_company_name text,            -- 정규화 회사명
  source_page            int,             -- 페이지(있으면)
  run_id                 uuid,            -- 어느 런에서 생성
  model_name             text,
  confidence             text,            -- 'high' | 'med' | 'low'
  status                 text not null default 'ai_draft',  -- 'ai_draft' | 'review' | 'published' | 'archived'
  created_by             text default 'ai',  -- 'ai' | 'system' | 'admin'
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- ════ RLS (네 테이블 모두 관리자 전용) ════
alter table public.knowledge_extract_runs      enable row level security;
alter table public.knowledge_extract_run_items enable row level security;
alter table public.knowledge_extract_errors    enable row level security;
alter table public.knowledge_entries           enable row level security;

drop policy if exists kruns_admin   on public.knowledge_extract_runs;
drop policy if exists kitems_admin  on public.knowledge_extract_run_items;
drop policy if exists kerrors_admin on public.knowledge_extract_errors;
drop policy if exists kentries_admin on public.knowledge_entries;
create policy kruns_admin    on public.knowledge_extract_runs      for all to authenticated using (is_admin()) with check (is_admin());
create policy kitems_admin   on public.knowledge_extract_run_items for all to authenticated using (is_admin()) with check (is_admin());
create policy kerrors_admin  on public.knowledge_extract_errors    for all to authenticated using (is_admin()) with check (is_admin());
create policy kentries_admin on public.knowledge_entries           for all to authenticated using (is_admin()) with check (is_admin());

-- ════ 인덱스 (추적·중복방지) ════
create index if not exists idx_kitems_run    on public.knowledge_extract_run_items (run_id);
create index if not exists idx_kerrors_run   on public.knowledge_extract_errors (run_id);
create index if not exists idx_kerrors_item  on public.knowledge_extract_errors (run_item_id);
create index if not exists idx_kentries_type_title on public.knowledge_entries (type, lower(title));  -- 중복방지
create index if not exists idx_kentries_run   on public.knowledge_entries (run_id);
create index if not exists idx_kentries_source on public.knowledge_entries (source_type, source_id);
