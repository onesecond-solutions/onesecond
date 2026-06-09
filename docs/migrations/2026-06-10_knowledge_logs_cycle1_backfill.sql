-- knowledge_logs 사이클1 소급 일지 1행 (단기 봉합)
-- 신버전 pdnwgzneooyygfejrvbg SQL Editor 에서 대표님이 직접 실행. Code 직접 실행 안 함.
-- 목적: 수동 채굴(사이클1) 결과를 학습일지에 1행 남긴다. 자동 채굴 Phase 3 구축 아님.
-- 안전장치: where not exists 가드 → 여러 번 실행해도 cycle1 일지는 1행만 들어간다.
-- 배경: 학습일지 테이블은 있으나(2026-06-06 마이그레이션) 쓰는 주체가 없어 비어 있었음.
--       사이클1은 병렬 워크플로 + 수동 SQL 적재(knowledge_entries cycle1_mined 92)라 일지를 안 거침.

-- ── STEP 1. 실행 전 확인 (읽기 전용) ──
-- 학습일지가 비어 있는지 / cycle1 일지가 이미 있는지 확인.
select count(*) as logs_count_before from public.knowledge_logs;
select count(*) as cycle1_log_exists from public.knowledge_logs where engine_version = 'knowledge-cycle1';

-- ── STEP 2. 사이클1 소급 일지 INSERT (가드 포함) ──
insert into public.knowledge_logs
  (run_at, run_type, engine_version, source_files, extracted_count,
   category_breakdown, dedup_notes, quality_issues, review_needed, handover_note, status, author)
select
  '2026-06-09 14:00:00+09'::timestamptz,
  'batch',
  'knowledge-cycle1',
  '[{"name":"terms_01~06 (사이클1 채굴 배치)","source_type":"newsletter+official_glossary"},{"name":"official_glossary 기초사전","source_type":"official_glossary"}]'::jsonb,
  92,
  '{"source_type":"cycle1_mined","status":"ai_draft","confidence":{"high":35,"medium":57}}'::jsonb,
  '{"pipeline":"254 후보 → 189(정본/내부중복 제외) → 155(배치간 중복) → 95(재검증 pass) → 92(정본충돌 3 최종필터: 정기보험·납입면제·소멸시효)","method":"병렬 워크플로 15에이전트 + 코드 방어 점검"}'::jsonb,
  '{"note":"수동 채굴 — 자동 Phase 3 미가동. 본 일지는 사이클1 결과 소급 기록(단기 봉합)."}'::jsonb,
  '["cycle1_mined 92건 status=ai_draft → 사용자 노출은 approved 승격 검수 트랙 필요"]'::jsonb,
  '사이클1 소급 일지. 관련: cycle1_error_fix 21건(ai_draft, 2026-06-08 #487) / official_glossary 50건(approved). 92건 채굴 제안 SQL = docs/migrations/2026-06-09_knowledge_entries_cycle1_mined.sql (#505). 다음: 사이클2(72→300) 보류, Phase 3 자동화는 별도 결정.',
  'ai_draft',
  'ai'
where not exists (
  select 1 from public.knowledge_logs where engine_version = 'knowledge-cycle1'
);

-- ── STEP 3. 실행 후 확인 (읽기 전용) ──
-- 1행 들어갔는지 + 내용 확인. 학습일지 화면(pages/knowledge-vault.html) 새로고침 시 노출.
select id, run_at, run_type, engine_version, extracted_count, status
from public.knowledge_logs
order by run_at desc
limit 10;

-- ── (참고) 앞으로 수동 채굴 시 일지 1행 남기는 템플릿 ──
-- Phase 3(자동화) 전까지, 채굴 워크플로를 한 번 돌릴 때마다 아래 형태로 1행 남긴다.
-- run_type='batch'(병렬 워크플로) 또는 'manual', engine_version=해당 사이클, extracted_count=이번 적재 건수.
-- insert into public.knowledge_logs (run_at, run_type, engine_version, extracted_count, dedup_notes, handover_note, status, author)
-- values (now(), 'batch', 'knowledge-cycle2', <건수>, '{...}'::jsonb, '<다음 인계>', 'ai_draft', 'ai');
