-- knowledge_pipeline_events : 지식 생산라인 감사 원장 (append-only) + 검수 원자 RPC
-- 신버전 pdnwgzneooyygfejrvbg SQL 에디터에서 실행. ★실행은 대표님 결재 후 (이 PR은 설계 제안).
--
-- 2026-06-21 대표님 2차 결재 반영:
--   §1 복합 사유 보존 → reason_codes text[] (단일 축소 금지, 전체 보존, 화이트리스트 원소만)
--   §2 이벤트 멱등성 → idempotency_key UNIQUE (재시도 중복 INSERT 0)
--   §3 RPC 보안 명시 / §4 상태 전환표 RPC 내부 제한
--   §5 직접 PATCH 차단 트리거(설계·미적용, 4단계 후 활성화) / §6 FK ON DELETE SET NULL
--
-- 목적: mine-batch 채굴 → 건별 판정 → 사람 검수(승인/보류/폐기) → 재처리까지
--       하나의 생산라인 이력을 시간순 이벤트로 남기는 감사 원장.
-- 분리 원칙(대표님): knowledge_logs=과거 배치 요약(보존·미변경) /
--   knowledge_pipeline_events=신규 생산라인 append-only 원장(이 파일) /
--   knowledge_mining_state=원천 단위 멱등 마커(현재상태 upsert, 역할 다름·유지).
--
-- 개인정보 차단(§4): 원장에 raw 본문/clean_text 전체/고객정보/개인정보/자유서술 오류메시지/
--   Gemini 전체 출력 저장 금지. 사유는 reason_codes(허용 코드값 배열)만.
--   사람 검수의 자유서술 사유는 knowledge_entries.review_note(원장 아님)에만.
--
-- 자료형(실제 스키마 확인 완료):
--   knowledge_entries.entry_id = bigint(bigserial)  → FK 적용(ON DELETE SET NULL)
--   source_id = text (newsletters.id=uuid + posts.id=bigint 폴리모픽, knowledge_entries.source_id도 text)
--   actor_id  = uuid (= auth.uid() = public.users.id, profiles 없음 / shares.from_user 전례) — FK 미적용

-- ════════════════════════════════════════════════════════════════
-- STEP 0 : 선행 검증 (★별도 RUN 으로 먼저 실행해 자료형 재확인 — §1)
-- ════════════════════════════════════════════════════════════════
-- select current_database();
-- select column_name, data_type from information_schema.columns
--   where table_schema='public' and table_name='knowledge_entries' and column_name in ('entry_id','source_id','status','reviewed_by','review_note');
-- select column_name, data_type from information_schema.columns where table_schema='public' and table_name='newsletters' and column_name='id';  -- uuid 기대
-- select column_name, data_type from information_schema.columns where table_schema='public' and table_name='posts'       and column_name='id';  -- bigint 기대
-- select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid='public.knowledge_entries'::regclass and conname='chk_ke_status';

-- ════════════════════════════════════════════════════════════════
-- STEP 1 : 이벤트 원장 테이블 (append-only)
-- ════════════════════════════════════════════════════════════════
create table if not exists public.knowledge_pipeline_events (
  event_id           bigserial primary key,
  event_type         text not null,
  source_type        text,                          -- 'newsletter' | 'post'
  source_id          text,                          -- 원천 id (폴리모픽 → text)
  knowledge_entry_id bigint references public.knowledge_entries(entry_id) on delete set null,  -- §6 감사 보존
  batch_id           text,                          -- mine-batch 1회 실행 식별
  pipeline_version   text,                          -- 예 'v1d'
  from_status        text,                          -- 직전 status (생성 이벤트면 null)
  to_status          text,                          -- 결과 status
  reason_codes       text[] not null default '{}',  -- §1 복합 사유 전체 보존(화이트리스트 원소만)
  actor_type         text not null,                 -- 'ai' | 'system' | 'cron' | 'admin'
  actor_id           uuid,                          -- admin 검수 시 auth.uid(), 그 외 null
  idempotency_key    text not null,                 -- §2 재시도 중복 방지(UNIQUE)
  created_at         timestamptz not null default now()
);

-- §2 멱등성: 동일 키 재INSERT 차단. writer는 결정적 키 생성.
--   mine   : 'mine:'||batch_id||':'||source_type||':'||source_id||':'||event_type
--   review : 'review:'||entry_id||':'||from_status||':'||to_status
--   reprocess: 'reprocess:'||entry_id||':'||batch_id
alter table public.knowledge_pipeline_events
  add constraint uq_kpe_idempotency unique (idempotency_key);

-- ── 무결성 제약 ──
-- §3 event_type 허용값. 상태명은 코드와 통일(ai_draft/hold/approved/discarded).
alter table public.knowledge_pipeline_events
  add constraint chk_kpe_event_type check (event_type in (
    'mined',        -- ai_draft 적재 (actor=ai)
    'held',         -- 채굴 단계 hold 판정 (actor=ai)
    'hard_failed',  -- 적재 차단 (knowledge_entry_id=null, source_id+batch_id 추적)
    'skipped',      -- 이미 채굴됨/부적격 건너뜀 (actor=ai/system)
    'approved',     -- 사람 승인 (actor=admin)
    'review_held',  -- 사람 보류 (actor=admin)
    'discarded',    -- 사람 폐기 (actor=admin)
    'reprocessed'   -- 재처리 (actor=cron/admin)
  ));

alter table public.knowledge_pipeline_events
  add constraint chk_kpe_from_status check (from_status is null or from_status in ('ai_draft','approved','hold','discarded'));
alter table public.knowledge_pipeline_events
  add constraint chk_kpe_to_status   check (to_status   is null or to_status   in ('ai_draft','approved','hold','discarded'));
alter table public.knowledge_pipeline_events
  add constraint chk_kpe_source_type check (source_type is null or source_type in ('newsletter','post'));
alter table public.knowledge_pipeline_events
  add constraint chk_kpe_actor_type  check (actor_type in ('ai','system','cron','admin'));

-- §1·§4 reason_codes: 배열의 모든 원소가 화이트리스트에 포함(<@). 빈 배열 허용. 자유서술 차단.
--   신규 코드는 별도 마이그레이션으로 확장. mine-batch writer가 복합 사유를 이 코드들의 배열로 매핑.
alter table public.knowledge_pipeline_events
  add constraint chk_kpe_reason_codes check (reason_codes <@ array[
    -- 채굴 판정(ai)
    'pass',                    -- 정상 적재
    'no_knowledge',            -- 보험 지식 없음(discard)
    'pii_unseparable',         -- 개인정보 분리 불가(discard)
    'source_rejected',         -- 소스 부적격/외부저작물 의심(discard)
    'internal_only',           -- 내부자료(공용 적재 금지·discard)
    'diff_hard_fail',          -- 실제 왜곡/환각(적재 차단)
    'diff_warning',            -- 회사명/수치 diff 경고(hold)
    'pii_present',             -- 분리가능 PII — 제거후 확인(hold)
    'pii_warning',             -- 계좌/증권 형식 의심(hold)
    'source_missing',          -- 시의성/출처 불명(uncertainty)
    'numeric_ambiguity',       -- 숫자 모호/raw 비정상(uncertainty)
    'condition_ambiguity',     -- 조건 모호(uncertainty)
    'extraction_quality',      -- 추출 품질(uncertainty)
    'neutrality_check',        -- 중립성 확인(hold)
    'source_eligibility_check',-- 소스 적격성 확인(manual_review)
    'duplicate',               -- 중복
    'already_mined',           -- 이미 채굴됨(멱등 skip)
    -- 사람 검수(admin)
    'admin_approve',
    'admin_hold',
    'admin_discard',
    'admin_reprocess'
  ]::text[]);

-- ── 인덱스 ──
create index if not exists idx_kpe_created on public.knowledge_pipeline_events (created_at desc);
create index if not exists idx_kpe_batch   on public.knowledge_pipeline_events (batch_id);
create index if not exists idx_kpe_entry   on public.knowledge_pipeline_events (knowledge_entry_id);
create index if not exists idx_kpe_source  on public.knowledge_pipeline_events (source_type, source_id);
create index if not exists idx_kpe_type    on public.knowledge_pipeline_events (event_type, created_at desc);

-- ── RLS : admin read/insert. service_role(mine-batch)은 RLS 우회 INSERT. UPDATE·DELETE 정책 없음=append-only.
alter table public.knowledge_pipeline_events enable row level security;
drop policy if exists kpe_admin_read   on public.knowledge_pipeline_events;
create policy kpe_admin_read   on public.knowledge_pipeline_events for select to authenticated using (is_admin());
drop policy if exists kpe_admin_insert on public.knowledge_pipeline_events;
create policy kpe_admin_insert on public.knowledge_pipeline_events for insert to authenticated with check (is_admin());

-- ════════════════════════════════════════════════════════════════
-- STEP 2 : 검수 원자 RPC (§2 원자성 · §3 보안 · §4 전환표)
--   승인/보류/폐기 = 프론트 UPDATE+INSERT 별도 호출 금지. 이 RPC 1콜로 단일 트랜잭션 처리.
-- ════════════════════════════════════════════════════════════════
create or replace function public.review_knowledge_entry(
  p_entry_id     bigint,
  p_action       text,                        -- 'approve' | 'hold' | 'discard'
  p_note         text   default null,         -- 사람 자유서술 사유 → review_note (원장 아님)
  p_reason_codes text[] default '{}'          -- 추가 코드(허용 화이트리스트). 기본 admin 코드는 내부 부여
) returns void
language plpgsql
security definer                              -- §3
set search_path = public                      -- §3
as $$
declare
  v_from    text;
  v_to      text;
  v_event   text;
  v_default text;
  v_codes   text[];
  v_uid     uuid := auth.uid();               -- §3 actor 강제(클라이언트 임의입력 불가)
  v_key     text;
begin
  -- §3 권한: admin 만 (SECURITY DEFINER 이므로 명시 가드 필수)
  if not is_admin() then
    raise exception 'not_authorized';
  end if;

  -- 직접 PATCH 차단 트리거(STEP 3) 활성화 후, 이 RPC 경유임을 표시(세션-로컬)
  perform set_config('app.kpe_via_rpc', 'on', true);

  -- 액션 → 목표 상태 / 이벤트 / 기본 admin 코드
  if    p_action = 'approve' then v_to:='approved';  v_event:='approved';    v_default:='admin_approve';
  elsif p_action = 'hold'    then v_to:='hold';      v_event:='review_held'; v_default:='admin_hold';
  elsif p_action = 'discard' then v_to:='discarded'; v_event:='discarded';   v_default:='admin_discard';
  else  raise exception 'invalid_action: %', p_action;
  end if;

  -- §2 대상 행 잠금 + 직전 상태 확보 (동시성 안전)
  select status into v_from from public.knowledge_entries where entry_id = p_entry_id for update;
  if not found then raise exception 'entry_not_found: %', p_entry_id; end if;

  -- §2 멱등: 이미 목표 상태면 무동작(재시도 안전, 중복 이벤트 0)
  if v_from = v_to then return; end if;

  -- §4 허용 상태 전환표 (approved/discarded 역전은 일반 검수 RPC 금지. 재처리는 별도 액션)
  if not (
       (v_from = 'ai_draft' and v_to in ('approved','hold','discarded'))
    or (v_from = 'hold'     and v_to in ('approved','discarded'))
  ) then
    raise exception 'illegal_transition: % -> %', v_from, v_to;
  end if;

  -- 코드 병합(기본 admin 코드 + 호출자 추가코드), 중복 제거. 화이트리스트 검증은 테이블 CHECK가 강제.
  select array_agg(distinct x) into v_codes from unnest(array[v_default] || coalesce(p_reason_codes,'{}')) x;

  -- (1) 상태 변경 (자유서술 사유는 review_note 에만, 없으면 기존값 유지)
  update public.knowledge_entries
     set status      = v_to,
         reviewed_at = now(),
         reviewed_by = v_uid,
         review_note = coalesce(p_note, review_note),
         updated_at  = now()
   where entry_id = p_entry_id;

  -- (2) 같은 트랜잭션에서 이벤트 기록 (actor 강제 + 멱등키). 재시도 충돌 시 무시.
  v_key := 'review:' || p_entry_id || ':' || v_from || ':' || v_to;
  insert into public.knowledge_pipeline_events
    (event_type, knowledge_entry_id, from_status, to_status, reason_codes, actor_type, actor_id, idempotency_key)
  values
    (v_event, p_entry_id, v_from, v_to, v_codes, 'admin', v_uid, v_key)
  on conflict (idempotency_key) do nothing;
end;
$$;

-- §3 EXECUTE 권한: PUBLIC 회수 후 authenticated 에만 부여(함수 내부 is_admin 가드로 admin 만 통과)
revoke all on function public.review_knowledge_entry(bigint, text, text, text[]) from public;
grant execute on function public.review_knowledge_entry(bigint, text, text, text[]) to authenticated;

-- ════════════════════════════════════════════════════════════════
-- STEP 3 : 직접 PATCH 차단 트리거 (§5) — ★설계·미적용.
--   knowledge_entries.status 를 이벤트 없이 바꾸는 우회 경로 차단용.
--   ★검수큐 프론트가 RPC로 완전 전환(배선 4단계)되고 검증된 뒤에만 'create trigger' 주석 해제.
--   지금 활성화하면 현재 직접 PATCH 검수가 깨지므로 함수만 정의하고 트리거는 비활성.
-- ════════════════════════════════════════════════════════════════
create or replace function public.kpe_guard_status_change() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status
     and coalesce(current_setting('app.kpe_via_rpc', true), 'off') <> 'on' then
    raise exception 'status_change_must_use_review_rpc';  -- 이벤트 없는 상태변경 차단
  end if;
  return new;
end;
$$;
-- ★4단계 검증 후 주석 해제:
-- drop trigger if exists trg_kpe_guard_status on public.knowledge_entries;
-- create trigger trg_kpe_guard_status before update on public.knowledge_entries
--   for each row execute function public.kpe_guard_status_change();

-- ════════════════════════════════════════════════════════════════
-- STEP 4 : 검증 (별도 RUN 권장)
-- ════════════════════════════════════════════════════════════════
-- select count(*) from public.knowledge_pipeline_events;                          -- 0 기대
-- select polname from pg_policies where tablename='knowledge_pipeline_events';    -- read/insert 2건
-- select conname from pg_constraint where conrelid='public.knowledge_pipeline_events'::regclass order by 1;  -- chk_* 6 + uq_kpe_idempotency + pk + fk
-- select proname, prosecdef, proconfig from pg_proc where proname in ('review_knowledge_entry','kpe_guard_status_change');  -- prosecdef=t, search_path=public
