-- ════════════════════════════════════════════════════════════════════════
-- 🚨 실행 금지 — 제안 파일 (팀장님 단독 결재·실행)
-- 신버전 pdnwgzneooyygfejrvbg (onesecond-v1-restore-0420) SQL 에디터에서만 실행.
-- 목적: 사용자 통합검색에 "보험 용어" 합류 — approved 용어를 RLS 잠금 유지한 채 노출.
-- ════════════════════════════════════════════════════════════════════════
--
-- 설계 결재 (2026-06-06):
--   - knowledge_entries 테이블 RLS = admin 잠금 그대로 유지 (테이블 직접 개방 X)
--   - 노출은 SECURITY DEFINER RPC 한 함수로만 캡슐화
--   - 본문 하드필터: status='approved' AND type='term'  (미승인·비용어 누수 차단)
--   - search_path 고정(='')  ← 미고정 = 보안 취약점
--   - knowledge_entries 자기참조 서브쿼리 없음 (42P17 무한재귀 회귀 방지)
--   - 동의어 확장은 별도 테이블 public.knowledge_synonyms 로만 (대표 term 노출)
--   - 검색창 자체는 admin 게이트 유지(§5 인큐베이션). 단 함수엔 plan/role 분기 0
--     (정보 레이어 = 전 등급 무료. 향후 FREE 개방 시 자동 노출).
--
-- ── 선행 확인 (별도 RUN, 읽기 전용) ──────────────────────────────────────
-- select count(*) from public.knowledge_entries where status='approved' and type='term';
-- select term, synonyms from public.knowledge_synonyms order by term;
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.search_knowledge(p_q text)
returns table(
  entry_id  bigint,
  title     text,
  body      text,
  category  text,
  tags      text[],
  is_exact  boolean,
  score     int
)
language sql
stable
security definer
set search_path = ''
as $$
  with q as (
    select btrim(coalesce(p_q, '')) as raw
  ),
  -- 동의어 확장: q가 어떤 그룹(term 또는 synonyms 원소)과 (대소문자 무시) 일치하면
  -- 그 그룹의 대표 term 을 검색 키에 추가. (knowledge_entries 자기참조 아님 → 42P17 무관)
  syn as (
    select s.term as rep
    from public.knowledge_synonyms s, q
    where q.raw <> ''
      and (
        lower(s.term) = lower(q.raw)
        or exists (select 1 from unnest(s.synonyms) e where lower(e) = lower(q.raw))
      )
  ),
  keys as (
    select lower(raw) as k from q where raw <> ''
    union
    select lower(rep) from syn
  )
  select
    e.entry_id,
    e.title,
    e.body,
    e.category,
    e.tags,
    (lower(e.title) = lower((select raw from q))) as is_exact,
    ( case when lower(e.title) = lower((select raw from q)) then 1000 else 0 end
      + case when exists (select 1 from keys k where e.title ilike '%' || k.k || '%') then 100 else 0 end
      + case when exists (select 1 from keys k where e.body  ilike '%' || k.k || '%') then  10 else 0 end
    ) as score
  from public.knowledge_entries e
  where e.status = 'approved'
    and e.type   = 'term'
    and exists (
      select 1 from keys k
      where e.title ilike '%' || k.k || '%'
         or e.body  ilike '%' || k.k || '%'
    )
  order by is_exact desc, score desc, e.title asc
  limit 50;
$$;

-- 실행 권한: 로그인 사용자만 (anon 제외). 검색창은 로그인 전제.
revoke all on function public.search_knowledge(text) from public;
grant execute on function public.search_knowledge(text) to authenticated;

-- ── 검증 (별도 RUN, 읽기) ────────────────────────────────────────────────
-- select * from public.search_knowledge('갑상선');        -- 동의어(유사암) 경유 노출 확인
-- select * from public.search_knowledge('해지환급금');    -- 별칭→대표(해약환급금) 확인
-- select * from public.search_knowledge('고지의무');      -- 정확 일치 is_exact=true 최상단 확인
-- select title, is_exact, score from public.search_knowledge('보험');  -- 부분 일치 랭킹 확인
-- 미승인 누수 점검: 결과에 status<>'approved' 행이 단 1건도 없어야 함(함수가 하드필터).

-- 주: ilike 키에 % _ 가 포함되면 와일드카드로 동작(읽기 전용 용어검색이라 위험도 낮음).
--     향후 필요 시 키 escape(replace(k,'%','\%') 등) 추가 검토.
