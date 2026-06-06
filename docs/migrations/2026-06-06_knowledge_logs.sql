-- knowledge_logs : AI 학습일지 테이블 (신규)
-- Phase 1 지식창고 인프라. 야간 자동 학습(Phase 3)의 선행 그릇.
-- 신버전 pdnwgzneooyygfejrvbg SQL 에디터에서 실행. 실행은 팀장님 결재 후.
-- 원칙: admin 전용(is_admin RLS) / 원본 파일은 서버 저장 금지(source_files 는 메타만).
-- 어제 채굴 테이블(knowledge_extract_runs 등)과 별개. 목적이 다른 신규 테이블.

create table if not exists public.knowledge_logs (
  id                 bigserial primary key,
  run_at             timestamptz not null default now(),       -- 실행 일시
  run_type           text not null default 'manual',           -- 'manual' | 'batch' | 'cron'
  engine_version     text,                                     -- 엔진 버전 스탬프 (예 'knowledge-v1.2')
  source_files       jsonb,                                    -- [{name, hash, source_type}] 메타만. 원본 파일 자체 저장 금지
  extracted_count    int,                                      -- 이번 런 추출 건수
  category_breakdown jsonb,                                    -- 카테고리별 분포
  new_terms          jsonb,                                    -- 신규 용어/동의어 후보
  dedup_notes        jsonb,                                    -- 중복 처리 메모
  quality_issues     jsonb,                                    -- 품질 이슈 메모
  review_needed      jsonb,                                    -- 사람 검토 필요 목록
  handover_note      text,                                     -- 다음 세션 인계 요약
  status             text not null default 'ai_draft',         -- 'ai_draft' | 'reviewed'
  author             text not null default 'ai',               -- 'ai' | 'admin' | 'system'
  created_at         timestamptz not null default now()
);

-- 허용값 무결성 (신규 테이블이라 위험 0)
alter table public.knowledge_logs
  add constraint chk_klogs_run_type check (run_type in ('manual','batch','cron'));
alter table public.knowledge_logs
  add constraint chk_klogs_status   check (status   in ('ai_draft','reviewed'));
alter table public.knowledge_logs
  add constraint chk_klogs_author   check (author   in ('ai','admin','system'));

-- RLS : admin 전용 (SELECT/INSERT/UPDATE/DELETE 모두 is_admin()). is_admin() = 기존 SECURITY DEFINER 재사용.
alter table public.knowledge_logs enable row level security;
drop policy if exists klogs_admin on public.knowledge_logs;
create policy klogs_admin on public.knowledge_logs
  for all to authenticated using (is_admin()) with check (is_admin());

create index if not exists idx_klogs_run_at on public.knowledge_logs (run_at desc);

-- 검증 (별도 RUN 권장)
-- select count(*) from public.knowledge_logs;
-- select polname from pg_policies where tablename = 'knowledge_logs';
