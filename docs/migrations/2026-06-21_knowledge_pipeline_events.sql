-- knowledge_pipeline_events : 지식 생산라인 감사 원장 (append-only) + 검수 원자 RPC
-- 신버전 pdnwgzneooyygfejrvbg SQL 에디터에서 실행. ★실행은 대표님 결재 후 (이 PR은 설계 제안).
--
-- 목적: mine-batch 채굴 → 건별 판정 → 사람 검수(승인/보류/폐기) → 재채굴까지
--       하나의 생산라인 이력을 시간순 이벤트로 남기는 감사 원장.
-- 분리 원칙(대표님 지시):
--   · knowledge_logs   = 과거 배치 요약 기록 (보존, 손대지 않음)
--   · knowledge_pipeline_events = 신규 생산라인 append-only 이벤트 원장 (이 파일)
--   · knowledge_mining_state    = 원천 단위 멱등 마커(현재상태 upsert, 재채굴 방지) — 역할 다름, 그대로 유지
--
-- 개인정보 차단(대표님 지시 §4): 이 원장에는 아래를 저장하지 않는다.
--   raw 본문 / clean_text 전체 / 고객정보 / 개인정보 / 자유서술형 오류 메시지 / Gemini 전체 출력.
--   사유는 reason_code(허용 코드값)만. 사람 검수의 자유서술 사유는 knowledge_entries.review_note(원장 아님)에만.
--
-- 자료형(실제 스키마 확인 완료):
--   knowledge_entries.entry_id = bigint(bigserial)  → FK 적용
--   source_id = text (newsletters.id=uuid + posts.id=bigint 폴리모픽, knowledge_entries.source_id도 text)
--   actor_id  = uuid (= auth.uid() = public.users.id, profiles 없음 / shares.from_user 전례) — FK 미적용

-- ════════════════════════════════════════════════════════════════
-- STEP 0 : 선행 검증 (★별도 RUN 으로 먼저 실행해 자료형 재확인 — 대표님 §1)
-- 아래 결과가 위 주석의 자료형과 일치하는지 Dashboard에서 눈으로 확인 후 STEP 1 진행.
-- ════════════════════════════════════════════════════════════════
-- select current_database();  -- 신버전 확인
-- select column_name, data_type from information_schema.columns
--   where table_schema='public' and table_name='knowledge_entries' and column_name in ('entry_id','source_id','status','reviewed_by','review_note');
-- select column_name, data_type from information_schema.columns
--   where table_schema='public' and table_name='newsletters' and column_name='id';   -- uuid 기대
-- select column_name, data_type from information_schema.columns
--   where table_schema='public' and table_name='posts' and column_name='id';         -- bigint 기대
-- select conname, pg_get_constraintdef(oid) from pg_constraint
--   where conrelid='public.knowledge_entries'::regclass and conname='chk_ke_status';  -- ai_draft/approved/hold/discarded

-- ════════════════════════════════════════════════════════════════
-- STEP 1 : 이벤트 원장 테이블 (append-only)
-- ════════════════════════════════════════════════════════════════
create table if not exists public.knowledge_pipeline_events (
  event_id           bigserial primary key,
  event_type         text not null,
  source_type        text,            -- 'newsletter' | 'post' (원천 종류)
  source_id          text,            -- 원천 id (폴리모픽: newsletter uuid / post bigint → text)
  knowledge_entry_id bigint references public.knowledge_entries(entry_id) on delete set null,  -- 건별 이벤트 링크(배치레벨이면 null)
  batch_id           text,            -- mine-batch 1회 실행 식별
  pipeline_version   text,            -- 예 'v1d'
  from_status        text,            -- 직전 status (생성 이벤트면 null)
  to_status          text,            -- 결과 status
  reason_code        text,            -- 허용 코드값만 (자유서술·PII 금지)
  actor_type         text not null,   -- 'ai' | 'system' | 'cron' | 'admin'
  actor_id           uuid,            -- admin 검수 시 auth.uid(), 그 외 null
  created_at         timestamptz not null default now()
);

-- ── 무결성 제약 ──
-- event_type 허용값 (대표님 §3). DB 상태명은 현재 코드와 통일(ai_draft/hold/approved/discarded).
alter table public.knowledge_pipeline_events
  add constraint chk_kpe_event_type check (event_type in (
    'mined',        -- ai_draft 적재 (actor=ai)
    'held',         -- 채굴 단계 hold 판정 (actor=ai)
    'hard_failed',  -- 적재 차단 (knowledge_entry_id=null, source_id+batch_id로 추적)
    'skipped',      -- 이미 채굴됨/부적격으로 건너뜀 (actor=ai/system)
    'approved',     -- 사람 승인 (actor=admin)
    'review_held',  -- 사람 보류 (actor=admin)
    'discarded',    -- 사람 폐기 (actor=admin)
    'reprocessed'   -- 재채굴 (actor=cron/admin)
  ));

-- from_status / to_status 는 knowledge_entries.status 와 동일 어휘(없을 수 있어 null 허용).
alter table public.knowledge_pipeline_events
  add constraint chk_kpe_from_status check (from_status is null or from_status in ('ai_draft','approved','hold','discarded'));
alter table public.knowledge_pipeline_events
  add constraint chk_kpe_to_status   check (to_status   is null or to_status   in ('ai_draft','approved','hold','discarded'));

alter table public.knowledge_pipeline_events
  add constraint chk_kpe_source_type check (source_type is null or source_type in ('newsletter','post'));

alter table public.knowledge_pipeline_events
  add constraint chk_kpe_actor_type  check (actor_type in ('ai','system','cron','admin'));

-- reason_code 허용 코드값 화이트리스트 (대표님 §4: 허용된 코드값만). 자유서술 금지.
-- 신규 코드는 별도 마이그레이션으로 확장. writer는 복합 사유를 단일 대표코드로 매핑해 기록.
alter table public.knowledge_pipeline_events
  add constraint chk_kpe_reason_code check (reason_code is null or reason_code in (
    'pass',                 -- 정상 적재
    'source_missing',       -- 시의성/출처 불명 (uncertainty)
    'numeric_ambiguity',    -- 숫자 모호 (uncertainty)
    'condition_ambiguity',  -- 조건 모호 (uncertainty)
    'extraction_quality',   -- 추출 품질 (uncertainty)
    'diff_warning',         -- 회사명/수치 diff 경고 → hold
    'diff_hard_fail',       -- diff 하드페일 → 적재 차단
    'source_rejected',      -- 소스 부적격
    'internal_only',        -- 격리(공용화 금지)
    'no_knowledge',         -- 보험 지식 없음
    'pii_unseparable',      -- 개인정보 분리 불가
    'duplicate',            -- 중복
    'already_mined',        -- 이미 채굴됨(멱등 skip)
    'admin_review'          -- 사람 검수 액션(일반)
  ));

-- ── 인덱스 ──
create index if not exists idx_kpe_created on public.knowledge_pipeline_events (created_at desc);
create index if not exists idx_kpe_batch   on public.knowledge_pipeline_events (batch_id);
create index if not exists idx_kpe_entry   on public.knowledge_pipeline_events (knowledge_entry_id);
create index if not exists idx_kpe_source  on public.knowledge_pipeline_events (source_type, source_id);
create index if not exists idx_kpe_type    on public.knowledge_pipeline_events (event_type, created_at desc);

-- ── RLS : admin 읽기 / admin INSERT. service_role(mine-batch)은 RLS 우회로 INSERT.
--    UPDATE·DELETE 정책 없음 = append-only (아무도 수정/삭제 불가). ──
alter table public.knowledge_pipeline_events enable row level security;
drop policy if exists kpe_admin_read   on public.knowledge_pipeline_events;
create policy kpe_admin_read   on public.knowledge_pipeline_events
  for select to authenticated using (is_admin());
drop policy if exists kpe_admin_insert on public.knowledge_pipeline_events;
create policy kpe_admin_insert on public.knowledge_pipeline_events
  for insert to authenticated with check (is_admin());

-- ════════════════════════════════════════════════════════════════
-- STEP 2 : 검수 원자 RPC (대표님 §2)
-- 승인/보류/폐기 = 프론트에서 UPDATE+INSERT 별도 호출 금지.
-- 이 RPC가 (1) knowledge_entries 상태 변경 + (2) 이벤트 기록을 같은 트랜잭션에서 처리.
-- actor_type='admin', actor_id=auth.uid() 는 RPC 내부에서 강제(클라이언트 임의 입력 불가).
-- 자유서술 사유(p_note)는 knowledge_entries.review_note 에만. 이벤트 원장엔 reason_code(코드)만.
-- ════════════════════════════════════════════════════════════════
create or replace function public.review_knowledge_entry(
  p_entry_id    bigint,
  p_action      text,                       -- 'approve' | 'hold' | 'discard'
  p_note        text default null,          -- 사람 자유서술 사유 → review_note (원장 아님)
  p_reason_code text default 'admin_review' -- 이벤트 원장 코드값 (허용 화이트리스트)
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from  text;
  v_to    text;
  v_event text;
  v_uid   uuid := auth.uid();
begin
  -- 권한: admin 만 (SECURITY DEFINER 이므로 명시 가드 필수)
  if not is_admin() then
    raise exception 'not_authorized';
  end if;

  -- 액션 → 목표 상태 / 이벤트 타입 매핑
  if p_action = 'approve' then
    v_to := 'approved';  v_event := 'approved';
  elsif p_action = 'hold' then
    v_to := 'hold';      v_event := 'review_held';
  elsif p_action = 'discard' then
    v_to := 'discarded'; v_event := 'discarded';
  else
    raise exception 'invalid_action: %', p_action;
  end if;

  -- 대상 행 잠금 + 직전 상태 확보 (동시성 안전)
  select status into v_from
    from public.knowledge_entries
   where entry_id = p_entry_id
   for update;
  if not found then
    raise exception 'entry_not_found: %', p_entry_id;
  end if;

  -- (1) 상태 변경 (자유서술 사유는 review_note 에만, 없으면 기존값 유지)
  update public.knowledge_entries
     set status      = v_to,
         reviewed_at = now(),
         reviewed_by = v_uid,
         review_note = coalesce(p_note, review_note),
         updated_at  = now()
   where entry_id = p_entry_id;

  -- (2) 같은 트랜잭션에서 이벤트 기록 (actor 강제)
  insert into public.knowledge_pipeline_events
    (event_type, knowledge_entry_id, from_status, to_status, reason_code, actor_type, actor_id)
  values
    (v_event, p_entry_id, v_from, v_to, p_reason_code, 'admin', v_uid);
end;
$$;

revoke all on function public.review_knowledge_entry(bigint, text, text, text) from public;
grant execute on function public.review_knowledge_entry(bigint, text, text, text) to authenticated;

-- ════════════════════════════════════════════════════════════════
-- STEP 3 : 검증 (별도 RUN 권장)
-- ════════════════════════════════════════════════════════════════
-- select count(*) from public.knowledge_pipeline_events;                          -- 0 기대
-- select polname from pg_policies where tablename='knowledge_pipeline_events';    -- read/insert 2건
-- select conname from pg_constraint where conrelid='public.knowledge_pipeline_events'::regclass;  -- chk_kpe_* 6건
-- select proname, prosecdef from pg_proc where proname='review_knowledge_entry';  -- prosecdef=true(SECURITY DEFINER)
