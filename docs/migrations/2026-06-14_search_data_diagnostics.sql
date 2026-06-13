-- ════════════════════════════════════════════════════════════════
-- 검색 데이터 현황 진단 (2026-06-14 아침 검수용) — 읽기 전용 SELECT
-- 신버전(pdnwgzneooyygfejrvbg)에서 실행. 쓰기 없음(안전). RUN별 분리.
-- 목적: "지금 검색에 잡히는 데이터가 얼마인가" baseline + OCR 미적재 규모 파악.
-- ════════════════════════════════════════════════════════════════

-- RUN 1) 소식지 본문(full_text) 적재율 — 본문 검색 가용 규모
select count(*) as total,
       count(full_text) filter (where length(trim(coalesce(full_text,'')))>0) as has_fulltext,
       count(*) - count(full_text) filter (where length(trim(coalesce(full_text,'')))>0) as no_fulltext
from public.newsletters;

-- RUN 2) 지식엔진 status 분포 — approved만 통합검색 노출
select status, count(*) from public.knowledge_entries group by status order by 2 desc;

-- RUN 3) 통합검색 대상 테이블 건수 (v0.5-a 소스 기준)
select 'posts_qna'         as src, count(*) from public.posts where board_type='qna'
union all select 'team_notices',     count(*) from public.team_notices where deleted_at is null
union all select 'scripts_global',   count(*) from public.scripts where is_active is true and scope='global' and coalesce(is_sample,false)=false
union all select 'newsletters',      count(*) from public.newsletters
union all select 'calendar_events',  count(*) from public.calendar_events
union all select 'knowledge_approved', count(*) from public.knowledge_entries where status='approved'
union all select 'quick_contents',   count(*) from public.quick_contents where is_active is true;

-- RUN 4) OCR 미적재 소식지 목록 (재처리 대상 — 5순위 실패 분석 입력)
select id, title, company, publish_year, publish_month,
       case when source_pdf_url is null then 'PDF원본 없음' else 'PDF있음·본문미추출' end as status_hint
from public.newsletters
where length(trim(coalesce(full_text,'')))=0
order by publish_year desc nulls last, publish_month desc nulls last
limit 200;

-- RUN 5) (참고) knowledge_entries 검색 컬럼 점검 — title/body 비어있는 approved 건
select count(*) as approved_total,
       count(*) filter (where length(trim(coalesce(title,'')))=0) as no_title,
       count(*) filter (where length(trim(coalesce(body,'')))=0)  as no_body
from public.knowledge_entries where status='approved';
