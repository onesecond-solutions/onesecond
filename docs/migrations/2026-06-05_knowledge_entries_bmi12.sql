-- 🟠 데이터 변경 (ALTER + INSERT) — ⚠️ 실행 금지. 별도 승인 후 신버전(pdnwgzneooyygfejrvbg)에서만.
-- 지식엔진 검색 v1 · 작업 5·6 — 컬럼 추가 + BMI 12건(원세컨드 내부 정리자료)
--
-- ⚠️ 본문(BMI 기준 수치)은 '회사별 BMI 심사기준' 원본 비교표에서 채워 넣을 것.
--    아래 body의 '<...>'는 구조 템플릿(플레이스홀더). 추측 입력 금지.
-- ⚠️ link_url '/pages/bmi-compare.html'은 임시 — 실제 비교 페이지 경로로 교체.
--
-- 적재 원칙(8조건): category='보험사별 기준' / entry_type='knowledge' /
--   source_type='onesecond_internal' / status='admin_draft' / 일반 랭킹 분리 /
--   [원세컨드 정리자료] 라벨 / 면책 하단 고정 / admin 테스트 화면 한정.

-- ── 작업 5·6 공통 컬럼 추가 ──
alter table public.knowledge_entries add column if not exists entry_type text not null default 'knowledge';  -- 'knowledge' | 'shortcut'
alter table public.knowledge_entries add column if not exists link_url   text;
alter table public.knowledge_entries add column if not exists disclaimer text;
-- ── 작업 10: BMI 구조화 필드 ──
-- verdict = 판정 카테고리(복수 가능): '거절' | '할증' | '방진' | '조건부' | '범위내확인'
--   예) MG손보 = array['거절']  (16이하·30이상 거절)  ← 복수면 array['거절','방진'] 등
-- verdict_detail = 수치 조건 텍스트  예) '30~32 검토, 33이상 방진'
-- 목적: ① 집계 박스 '방진 N개사' 자동 산출  ② 비교표 렌더 데이터 소스
alter table public.knowledge_entries add column if not exists verdict        text[];
alter table public.knowledge_entries add column if not exists verdict_detail text;
create index if not exists idx_kentries_entry_type on public.knowledge_entries (entry_type);
create index if not exists idx_kentries_category   on public.knowledge_entries (category);
create index if not exists idx_kentries_verdict    on public.knowledge_entries using gin (verdict);

-- ── BMI 12건 (12개사) ──
insert into public.knowledge_entries
  (type, title, body, category, tags, source_type, source_id, source_title, source_company,
   canonical_company_name, entry_type, link_url, disclaimer, verdict, verdict_detail, status, created_by)
select
  'insurer',
  co || ' BMI 심사 기준',
  '<' || co || ' BMI 심사 기준 본문 — 원본 비교표에서 채울 것>',
  '보험사별 기준',
  array['BMI','심사','인수','보험연령'],
  'onesecond_internal',
  'bmi_compare_v1',
  '회사별 BMI 심사 기준 비교(원세컨드 정리)',
  co,
  co,
  'knowledge',
  '/pages/bmi-compare.html',   -- TODO: 실제 비교 페이지 URL로 교체
  '가장 보수적인 기준 기반 예시이며 실제 심사는 상품·고지·심사부 판단에 따라 달라질 수 있음. 최종 사용 및 안내 책임은 사용자에게 있음.',
  null,                        -- TODO verdict: array['거절'|'할증'|'방진'|'조건부'|'범위내확인'] (원본에서 기입)
  '<수치 조건 — 원본 비교표에서 기입>',  -- TODO verdict_detail
  'admin_draft',
  'admin'
from (values
  ('메리츠화재'),('DB손보'),('KB손보'),('흥국화재'),('한화손보'),('삼성화재'),
  ('롯데손보'),('현대해상'),('농협손보'),('MG손보'),('흥국생명'),('동양생명')
) as t(co);
