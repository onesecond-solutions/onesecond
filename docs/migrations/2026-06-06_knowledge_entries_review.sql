-- knowledge_entries : 검수 상태 확장 (Phase 1 지식창고 인프라)
-- 신버전 pdnwgzneooyygfejrvbg SQL 에디터에서 실행. 실행은 팀장님 결재 후.
-- 목적: ai_draft 를 admin 이 승인/보류/폐기하는 검수 흐름의 그릇.
-- 기존 72건은 ai_draft 유지(값 변경 없음). 제약과 컬럼만 추가.

-- ====================================================================
-- STEP 0 : 선행 검증 (별도 RUN 으로 먼저 실행)
-- status 분포가 ai_draft 만인지 확인. ai_draft 외 값(review/published/archived 등)이
-- 있으면 아래 CHECK 추가가 실패한다. 그 경우 매핑(예 review->hold) 결재 후 진행.
-- ====================================================================
-- select status, count(*) from public.knowledge_entries group by status order by 2 desc;

-- ====================================================================
-- STEP 1 : status 허용값 4단계로 정리 (CHECK 제약 추가)
-- 'ai_draft' = AI 초안(기본) / 'approved' = 승인 / 'hold' = 보류 / 'discarded' = 폐기(soft)
-- ====================================================================
alter table public.knowledge_entries
  add constraint chk_ke_status check (status in ('ai_draft','approved','hold','discarded'));

-- ====================================================================
-- STEP 2 : 검수 메타 컬럼 추가 (승인/보류/폐기 시각과 주체, 사유)
-- reviewed_by 는 auth user id(uuid). FK 는 걸지 않는다(권한/RLS 단순화).
-- ====================================================================
alter table public.knowledge_entries
  add column if not exists reviewed_at  timestamptz;
alter table public.knowledge_entries
  add column if not exists reviewed_by  uuid;
alter table public.knowledge_entries
  add column if not exists review_note  text;

-- ====================================================================
-- 폐기 정책 (명문화)
-- discarded = soft delete. 행을 DELETE 하지 않는다.
-- 검색/공개 화면 로드 쿼리에서 status='discarded' 는 제외한다.
-- admin 검수 화면에서는 status 배지와 함께 계속 표시(필터로 열람 가능).
-- ====================================================================

-- ====================================================================
-- 노출 규칙 (명문화)
-- admin 검수 화면 = 전 status 표시.
-- 사용자 공개 화면 = approved 만 (현재 사용자 공개 화면 없음. Phase 후속).
-- ====================================================================

create index if not exists idx_ke_status on public.knowledge_entries (status);

-- 검증 (별도 RUN 권장)
-- select conname from pg_constraint where conrelid = 'public.knowledge_entries'::regclass and conname = 'chk_ke_status';
-- select column_name from information_schema.columns where table_name='knowledge_entries' and column_name in ('reviewed_at','reviewed_by','review_note');
