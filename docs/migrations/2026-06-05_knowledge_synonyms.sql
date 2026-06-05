-- 🟠 데이터 변경 (CREATE + SEED) — ⚠️ 실행 금지. 별도 승인 후 신버전(pdnwgzneooyygfejrvbg) SQL 에디터에서만.
-- 지식엔진 검색 v1 · 작업 2 — 동의어 사전
-- RLS: SELECT = 인증 사용자 전체(검색 확장에 필요) / INSERT·UPDATE·DELETE = is_admin()
--      is_admin() = 기존 SECURITY DEFINER 함수 사용. RLS 절 내 자기참조 서브쿼리 없음.

create table if not exists public.knowledge_synonyms (
  id         bigserial primary key,
  term       text not null,
  synonyms   text[] not null default '{}',   -- 양방향 확장: [term] ∪ synonyms 가 한 그룹
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_ksyn_term on public.knowledge_synonyms (lower(term));

alter table public.knowledge_synonyms enable row level security;
drop policy if exists ksyn_read  on public.knowledge_synonyms;
drop policy if exists ksyn_write on public.knowledge_synonyms;
create policy ksyn_read  on public.knowledge_synonyms for select to authenticated using (true);
create policy ksyn_write on public.knowledge_synonyms for all    to authenticated using (is_admin()) with check (is_admin());

-- ── 초기 시드 (이후 admin이 추가) ──
insert into public.knowledge_synonyms (term, synonyms, note) values
  ('유사암',       array['갑상선암','경계성종양','기타피부암','제자리암'], '정확히 4종 (보강 확정 — 추가·삭제 금지)'),
  ('뇌심',         array['뇌혈관','심혈관','뇌심혈관'], null),
  ('납면',         array['납입면제'], null),
  ('방진',         array['방문진단'], null),
  ('갱',           array['갱신형'], null),
  ('비갱',         array['비갱신형'], null),
  ('대장점막내암', array['점막내암'], null);
