-- 🟠 데이터 변경 (INSERT) — ⚠️ 실행 금지. 별도 승인 후.
-- 지식엔진 검색 v1 · 작업 5 — BMI 비교 페이지 바로가기 카드 1건 (entry_type='shortcut')
-- 선행: 2026-06-05_knowledge_entries_bmi12.sql 의 컬럼 추가(아래에 IF NOT EXISTS로 재포함, 안전).
-- 동작: 검색 결과에서 entry_type='shortcut' 카드는 핵심요약보다 위(최상단)에 별도 스타일로 노출.

alter table public.knowledge_entries add column if not exists entry_type text not null default 'knowledge';
alter table public.knowledge_entries add column if not exists link_url   text;

insert into public.knowledge_entries
  (type, title, body, category, tags, source_type, source_id, source_title,
   canonical_company_name, entry_type, link_url, status, created_by)
values
  ('term',
   '회사별 BMI 심사 기준 전체 비교',
   'BMI 검색 시 12개사 심사 기준을 한 화면에서 비교합니다.',
   '보험사별 기준',
   array['BMI','심사','비교','인수'],
   'onesecond_internal',
   'bmi_compare_v1',
   '회사별 BMI 심사 기준 비교(원세컨드 정리)',
   null,
   'shortcut',
   '/pages/bmi-compare.html',   -- TODO: 실제 비교 페이지 URL로 교체
   'admin_draft',
   'admin');
