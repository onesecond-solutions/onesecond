-- record_mined_entry : 채굴 후보 + mined/held 이벤트 원자 기록 RPC (4b)
-- 신버전 pdnwgzneooyygfejrvbg. ★실행은 대표님 결재 후 (이 PR은 설계 제안 — DB 미실행).
--
-- 배경(§4b): #869 writer 는 후보 INSERT 와 이벤트 INSERT 가 분리돼, 후보만 적재되고 이벤트 누락된 채
--   mining_state='done' 확정 가능 → 부분 실패 취약. 이 RPC 가 둘을 한 트랜잭션으로 묶어 원자성 보장.
--   둘 중 하나라도 실패 = 전체 롤백. mining_state 확정은 mine-batch 가 RPC outcome 확인 후에만.
--
-- 2차 결재 반영:
--   §1 중복 식별 기준 = (source_type, source_id, source_hash, pipeline_version) — source_id 단독 UNIQUE 금지
--       (원문 변경=source_hash 변경 / pipeline_version 변경 후의 정상 재채굴을 막지 않음). 기존 914 영향 0.
--   §2 advisory lock 키 = 같은 (source_type+source_id+source_hash+pipeline_version) 만 직렬화(64bit hashtextextended).
--   §3 RPC 반환 = outcome 구분(jsonb) : inserted / already_exists / idempotent_replay.
--
-- 개인정보(§6): RPC 입력 p_entry 는 knowledge_entries 허용 컬럼만. raw/clean_text 전체/Gemini 전체 출력/PII 미포함.
--   이벤트 원장엔 코드·식별자·상태만. 권한 = service_role 전용(PUBLIC EXECUTE 회수).

-- ════════════════════════════════════════════════════════════════
-- STEP 0 : 선행 검증 (★별도 RUN — 적용 전 충돌·기존 914 영향 0 확인, §1)
-- ════════════════════════════════════════════════════════════════
-- select current_database();
-- (a) 식별 컬럼이 mine-batch 적재분에 채워질지 — 현재 mine_* 행수(아직 실적재 0이면 0)
-- select count(*) mine_rows from public.knowledge_entries where source_type in ('mine_newsletter','mine_post');
-- (b) partial UNIQUE 생성 시 충돌(중복) 행 존재 여부 — 0행이어야 STEP 1 안전
-- select source_type, source_id, source_hash, pipeline_version, count(*) c
--   from public.knowledge_entries
--   where source_type in ('mine_newsletter','mine_post')
--   group by source_type, source_id, source_hash, pipeline_version having count(*) > 1;
-- (c) 기존 914(approved 등)가 partial 조건에 포함되지 않음 — source_type 분포 확인(mine_* 외만 있어야 914)
-- select source_type, count(*) c from public.knowledge_entries group by source_type order by 2 desc;
-- (d) 식별 컬럼 채움 정도(과거 수동 적재분에 source_hash/pipeline_version NULL 다수 = partial 밖이라 무영향)
-- select
--   count(*) total,
--   count(source_hash) has_hash,
--   count(pipeline_version) has_pv
--   from public.knowledge_entries where source_type in ('mine_newsletter','mine_post');

-- ════════════════════════════════════════════════════════════════
-- STEP 1 : 구조적 중복 방지 — partial UNIQUE index (§1·§5)
--   식별 = (source_type, source_id, source_hash, pipeline_version). mine-batch 적재분만.
--   기존 914(non-mine)는 WHERE 조건 밖 → 영향 0. 원문/pv 바뀌면 식별이 달라져 정상 재채굴 허용.
-- ════════════════════════════════════════════════════════════════
create unique index if not exists uq_ke_mine_identity
  on public.knowledge_entries (source_type, source_id, source_hash, pipeline_version)
  where source_type in ('mine_newsletter', 'mine_post');

-- ════════════════════════════════════════════════════════════════
-- STEP 2 : 원자 기록 RPC (반환 = {entry_id, outcome})
-- ════════════════════════════════════════════════════════════════
create or replace function public.record_mined_entry(
  p_entry        jsonb,        -- knowledge_entries 후보(허용 컬럼만)
  p_event_type   text,         -- 'mined' | 'held'
  p_reason_codes text[]
) returns jsonb                 -- { "entry_id": bigint|null, "outcome": "inserted"|"already_exists"|"idempotent_replay" }
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id   bigint;
  v_dup  bigint;
  v_st   text := p_entry->>'source_type';   -- knowledge_entries 식별용(mine_newsletter/mine_post)
  v_st_ev text := case (p_entry->>'source_type') when 'mine_newsletter' then 'newsletter'
                       when 'mine_post' then 'post' else (p_entry->>'source_type') end;  -- 이벤트 원장용(원천 종류)
  v_sid  text := p_entry->>'source_id';
  v_pv   text := p_entry->>'pipeline_version';
  v_hash text := p_entry->>'source_hash';
  v_to   text := p_entry->>'status';
  v_key  text;
  v_n    int;
begin
  -- 안전경계: 이벤트/상태/소스 화이트리스트. approved 절대 불가(자동 승인 금지).
  if p_event_type not in ('mined','held')          then raise exception 'invalid_event_type: %', p_event_type; end if;
  if v_to        not in ('ai_draft','hold')         then raise exception 'invalid_status: %', v_to; end if;
  if v_st        not in ('mine_newsletter','mine_post') then raise exception 'invalid_source_type: %', v_st; end if;
  if v_hash is null or v_hash = ''                  then raise exception 'missing_source_hash'; end if;

  -- §2 동시 실행 직렬화: 같은 (type:sid:hash:pv) 만 advisory xact lock (64bit, 무관 원천 미결합)
  perform pg_advisory_xact_lock(hashtextextended(v_st || ':' || v_sid || ':' || v_hash || ':' || v_pv, 0));

  -- §1 중복 식별 = 4컬럼. 존재하면 신규 후보 0 + duplicate 이벤트(멱등). 기존 후보 덮어쓰기 없음.
  select entry_id into v_dup from public.knowledge_entries
    where source_type = v_st and source_id = v_sid and source_hash = v_hash and pipeline_version = v_pv
    limit 1;
  if v_dup is not null then
    v_key := 'mine:' || v_pv || ':' || v_st_ev || ':' || v_sid || ':' || v_hash || ':skipped';
    insert into public.knowledge_pipeline_events
      (event_type, source_type, source_id, knowledge_entry_id, pipeline_version, reason_codes, actor_type, idempotency_key)
    values ('skipped', v_st_ev, v_sid, v_dup, v_pv, array['duplicate'], 'ai', v_key)
    on conflict (idempotency_key) do nothing;
    get diagnostics v_n = row_count;
    return jsonb_build_object('entry_id', v_dup,
      'outcome', case when v_n > 0 then 'already_exists' else 'idempotent_replay' end);
  end if;

  -- 신규 후보 INSERT (허용 컬럼만). 동시 실행이 먼저 만든 경우 unique_violation → already_exists 로 흡수.
  begin
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
  exception when unique_violation then
    select entry_id into v_dup from public.knowledge_entries
      where source_type = v_st and source_id = v_sid and source_hash = v_hash and pipeline_version = v_pv
      limit 1;
    v_key := 'mine:' || v_pv || ':' || v_st_ev || ':' || v_sid || ':' || v_hash || ':skipped';
    insert into public.knowledge_pipeline_events
      (event_type, source_type, source_id, knowledge_entry_id, pipeline_version, reason_codes, actor_type, idempotency_key)
    values ('skipped', v_st_ev, v_sid, v_dup, v_pv, array['duplicate'], 'ai', v_key)
    on conflict (idempotency_key) do nothing;
    return jsonb_build_object('entry_id', v_dup, 'outcome', 'already_exists');
  end;

  -- 같은 트랜잭션 mined/held 이벤트 (실패 시 후보 INSERT 까지 전체 롤백)
  v_key := 'mine:' || v_pv || ':' || v_st_ev || ':' || v_sid || ':' || v_hash || ':' || p_event_type;
  insert into public.knowledge_pipeline_events
    (event_type, source_type, source_id, knowledge_entry_id, from_status, to_status, pipeline_version, reason_codes, actor_type, idempotency_key)
  values (p_event_type, v_st_ev, v_sid, v_id, null, v_to, v_pv, p_reason_codes, 'ai', v_key)
  on conflict (idempotency_key) do nothing;
  get diagnostics v_n = row_count;

  -- 후보는 새로 만들었는데 이벤트가 이미 존재(이전 부분기록 재시도) = idempotent_replay
  return jsonb_build_object('entry_id', v_id,
    'outcome', case when v_n > 0 then 'inserted' else 'idempotent_replay' end);
end;
$$;

-- §6 권한: service_role 전용. PUBLIC 회수만으로는 Supabase 기본 상속(anon/authenticated)이
--   남을 수 있어 두 롤에 명시 revoke 추가(2026-06-21 검수팀 적발). is_admin 가드 없는 RPC라 필수.
revoke all on function public.record_mined_entry(jsonb, text, text[]) from public;
revoke execute on function public.record_mined_entry(jsonb, text, text[]) from anon;
revoke execute on function public.record_mined_entry(jsonb, text, text[]) from authenticated;

-- ════════════════════════════════════════════════════════════════
-- STEP 3 : 검증 (별도 RUN)
-- ════════════════════════════════════════════════════════════════
-- select indexname from pg_indexes where tablename='knowledge_entries' and indexname='uq_ke_mine_identity';   -- 1건
-- select proname, prosecdef, proconfig, pg_get_function_result(oid) from pg_proc where proname='record_mined_entry';
-- select grantee, privilege_type from information_schema.routine_privileges
--   where routine_schema='public' and routine_name='record_mined_entry';   -- public/authenticated/anon 없어야(service_role만)
