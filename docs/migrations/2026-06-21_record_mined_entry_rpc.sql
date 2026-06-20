-- record_mined_entry : 채굴 후보 + mined/held 이벤트 원자 기록 RPC (4b)
-- 신버전 pdnwgzneooyygfejrvbg. ★실행은 대표님 결재 후 (이 PR은 설계 제안 — DB 미실행).
--
-- 배경(대표님 §4b): #869 writer 는 knowledge_entries INSERT 와 events INSERT 가 분리돼,
--   후보만 적재되고 이벤트가 누락된 채 mining_state='done'으로 확정될 수 있음 → 부분 실패 취약.
--   이 RPC 가 후보 INSERT + 이벤트 INSERT 를 한 트랜잭션으로 묶어 원자성을 보장한다.
--   둘 중 하나라도 실패 = 전체 롤백. mining_state 확정은 mine-batch 가 RPC 성공 확인 후에만.
--
-- 대상: ai_draft / hold 만(후보 생성). approved 절대 불가(자동 승인 금지).
-- 후보 없는 판정(hard_failed/skipped/duplicate/source_rejected/internal_only)은 이 RPC 안 씀 →
--   mine-batch 가 writeEvent 로 이벤트만 기록(knowledge_entry_id=null), 성공 후 mining_state 확정.
--
-- 개인정보(§6): RPC 입력 p_entry 는 knowledge_entries 허용 컬럼만(추출 지식 본문).
--   raw 원문/clean_text 전체/Gemini 전체 출력/개인정보는 전달하지 않음. 이벤트 원장엔 코드·식별자·상태만.

-- ════════════════════════════════════════════════════════════════
-- STEP 0 : 선행 검증 (★별도 RUN — partial unique index 충돌 없는지 확인)
-- ════════════════════════════════════════════════════════════════
-- select current_database();
-- mine-batch 적재분(source_type=mine_*) 의 (source_id,pipeline_version) 중복이 있으면 아래 인덱스가 실패.
-- 기대: 0행(아직 실적재 0). 0행이어야 STEP 2 진행.
-- select source_id, pipeline_version, count(*) c from public.knowledge_entries
--   where source_type in ('mine_newsletter','mine_post')
--   group by source_id, pipeline_version having count(*) > 1;
-- select count(*) as mine_rows from public.knowledge_entries where source_type in ('mine_newsletter','mine_post');  -- 0 기대

-- ════════════════════════════════════════════════════════════════
-- STEP 1 : 구조적 중복 방지 — partial UNIQUE index (§5)
--   mine-batch 적재분만 (source_id,pipeline_version) 유일. 기존 914(non-mine)는 제외 → 영향 0.
--   앱 사전조회가 아니라 DB 제약으로 동시 실행 중복 후보를 원천 차단.
-- ════════════════════════════════════════════════════════════════
create unique index if not exists uq_ke_mine_source
  on public.knowledge_entries (source_id, pipeline_version)
  where source_type in ('mine_newsletter', 'mine_post');

-- ════════════════════════════════════════════════════════════════
-- STEP 2 : 원자 기록 RPC
--   동시 실행 방어 = advisory xact lock(같은 원천 직렬화) + 위 partial UNIQUE(최종 보장).
-- ════════════════════════════════════════════════════════════════
create or replace function public.record_mined_entry(
  p_entry        jsonb,        -- knowledge_entries 후보(허용 컬럼만)
  p_event_type   text,         -- 'mined' | 'held'
  p_reason_codes text[]
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id   bigint;
  v_dup  bigint;
  v_st   text := p_entry->>'source_type';
  v_sid  text := p_entry->>'source_id';
  v_pv   text := p_entry->>'pipeline_version';
  v_hash text := p_entry->>'source_hash';
  v_to   text := p_entry->>'status';
  v_key  text;
begin
  -- 안전경계: 이벤트/상태 화이트리스트. approved 절대 불가(자동 승인 금지).
  if p_event_type not in ('mined','held') then raise exception 'invalid_event_type: %', p_event_type; end if;
  if v_to not in ('ai_draft','hold')       then raise exception 'invalid_status: %', v_to; end if;
  if v_st not in ('mine_newsletter','mine_post') then raise exception 'invalid_source_type: %', v_st; end if;

  -- §5 동시 실행 직렬화: 같은 원천(pv:type:sid) advisory xact lock (트랜잭션 종료 시 자동 해제)
  perform pg_advisory_xact_lock(hashtextextended(v_pv || ':' || v_st || ':' || v_sid, 0));

  -- §4 중복: 같은 source_id+pipeline_version 후보 존재 → 신규 후보 0, duplicate 이벤트만(멱등)
  select entry_id into v_dup from public.knowledge_entries
    where source_id = v_sid and pipeline_version = v_pv limit 1;
  if v_dup is not null then
    v_key := 'mine:' || v_pv || ':' || v_st || ':' || v_sid || ':' || v_hash || ':skipped';
    insert into public.knowledge_pipeline_events
      (event_type, source_type, source_id, knowledge_entry_id, pipeline_version, reason_codes, actor_type, idempotency_key)
    values ('skipped', v_st, v_sid, v_dup, v_pv, array['duplicate'], 'ai', v_key)
    on conflict (idempotency_key) do nothing;
    return v_dup;   -- 기존 후보 덮어쓰기 없음
  end if;

  -- 신규 후보 INSERT (허용 컬럼만 명시 매핑 — raw/clean_text/PII 컬럼 없음)
  insert into public.knowledge_entries
    (type, title, body, category, tags, source_type, source_id, source_title, source_company,
     canonical_company_name, source_date, confidence, status, lifecycle_status, diff_flag,
     pipeline_version, source_hash, review_note, created_by)
  values (
     p_entry->>'type', p_entry->>'title', p_entry->>'body', p_entry->>'category',
     case when jsonb_typeof(p_entry->'tags') = 'array'
          then array(select jsonb_array_elements_text(p_entry->'tags')) else null end,
     v_st, v_sid, p_entry->>'source_title', p_entry->>'source_company',
     p_entry->>'canonical_company_name', p_entry->>'source_date', p_entry->>'confidence',
     v_to, p_entry->>'lifecycle_status', p_entry->>'diff_flag',
     v_pv, v_hash, p_entry->>'review_note', coalesce(p_entry->>'created_by', 'ai'))
  returning entry_id into v_id;

  -- 같은 트랜잭션에서 mined/held 이벤트 (실패 시 위 후보 INSERT 까지 전체 롤백)
  v_key := 'mine:' || v_pv || ':' || v_st || ':' || v_sid || ':' || v_hash || ':' || p_event_type;
  insert into public.knowledge_pipeline_events
    (event_type, source_type, source_id, knowledge_entry_id, from_status, to_status, pipeline_version, reason_codes, actor_type, idempotency_key)
  values (p_event_type, v_st, v_sid, v_id, null, v_to, v_pv, p_reason_codes, 'ai', v_key)
  on conflict (idempotency_key) do nothing;

  return v_id;
end;
$$;

-- §6 권한: PUBLIC EXECUTE 회수. service_role 은 정의자(슈퍼유저격)로 호출 가능 → 별도 grant 불요.
--   authenticated/anon 에는 부여하지 않음(클라이언트 호출 불가, mine-batch service_role 전용 경로).
revoke all on function public.record_mined_entry(jsonb, text, text[]) from public;

-- ════════════════════════════════════════════════════════════════
-- STEP 3 : 검증 (별도 RUN)
-- ════════════════════════════════════════════════════════════════
-- select indexname from pg_indexes where tablename='knowledge_entries' and indexname='uq_ke_mine_source';  -- 1건
-- select proname, prosecdef, proconfig from pg_proc where proname='record_mined_entry';                    -- secdef=t, search_path=public
-- select grantee, privilege_type from information_schema.routine_privileges
--   where routine_schema='public' and routine_name='record_mined_entry';   -- public/authenticated/anon 없어야(service_role만)
