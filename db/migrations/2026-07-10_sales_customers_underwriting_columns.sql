-- ═══════════════════════════════════════════════════════════════════════════
-- 🟠 스키마 갭보강(ALTER ADD COLUMN) — 상담관리 인수정보 5필드 실컬럼 추가
--    sales_customers.job         (직업)
--    sales_customers.medication  (약 복용 여부: 복용 중/복용 안 함/과거 복용)
--    sales_customers.history     (병력)
--    sales_customers.dx_date     (진단일)
--    sales_customers.uw_status   (현재 상태·자유서술 — ⚠️ 기존 status 컬럼과 충돌 회피 대체명)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠️⚠️⚠️ 초안(DRAFT) — 대표 승인 전 실행 금지. 이 파일은 검토용이며 아직 적용되지 않았다. ⚠️⚠️⚠️
--   실제 반영 = production-db Environment 대표 1클릭 승인(db-migrate.yml workflow_dispatch) 자리.
--   본 PR 머지만으로 DB 변경 없음.
--
-- ⚠️ 대상 프로젝트(유일 진실 원천): onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
--    구버전(qursjteiovcylqiepmlo)은 2026-06-19 삭제됨 — 절대 참조 금지.
--
-- 목적:
--   상담관리(업무노트 '상담관리' 유형 = 영업노트 #v-salesnote 재사용)의 인수정보 입력을 위해,
--   기획팀장 A1 지시서 §1의 5필드를 sales_customers 실컬럼(A안)으로 추가한다.
--   대표 결재 2(2026-07-10): 저장방식 = A안 실컬럼 확정. 단 바로 write 금지 → 본 검수안까지.
--
-- 진실 원천:
--   docs/specs/consult_customer_form_a1_underwriting.md (A1 → sales_customers 정합화)
--   docs/specs/consult_customer_form_v1.md §2 (기존 컬럼 실측 · profile jsonb 흡수 원칙)
--   실측 근거: app.html:3908(select) / 4106~4120(write) — 기존 실컬럼 = id·name·phone·
--     phone_raw·birth_date·gender·channel·status·owner_id·source_ref·deleted_at·
--     created_at·updated_at·profile(jsonb)
--
-- ⚠️⚠️ 컬럼명 충돌 회피(필수):
--   A1 §1의 5번째 필드 status(현재 상태·자유서술)는 sales_customers 에 이미 존재하는
--   status(영업 8단계 = _SN_STAGES ['신규DB','부재','예약','진행중','제안서발송','보류',
--   '클로징','청약완료'], app.html:4002·필터칩·배지·저장기본값 '신규DB')와 이름 충돌한다.
--   그대로 추가 시 (a) add column if not exists 가 기존 status 를 만나 신규 컬럼이 안 생기고
--   (b) 인수정보 서술이 영업단계 값과 의미 혼선 → 회귀. 반드시 대체명으로 회피.
--   → 채택 대체명 = uw_status (uw = underwriting/인수). 후보 health_status 대비, 이 필드가
--     인수(가입심사) 맥락의 '현재 상태 서술'이므로 uw_ 접두가 의미 정합. 나머지 4필드
--     (job/medication/history/dx_date)는 기존 컬럼과 충돌 없음(app.html 전수 확인 — 동명
--     식별자는 전부 무관한 JS 지역변수/admin job 레코드로 sales_customers 컬럼 아님).
--
-- 타입·nullable 근거:
--   · 5컬럼 전부 text · nullable(선택 입력). 인수정보는 필수 아님(고객마다 없을 수 있음).
--   · medication 만 CHECK(복용 중/복용 안 함/과거 복용) — A1 §1 지정 3값. Postgres CHECK 는
--     NULL 통과 → 미입력 안전, 오값만 차단. dx_date 는 A1대로 text(형식 자유, date 강제 안 함).
--   · 기존 컬럼은 1글자도 변경하지 않는다(무변경). 신규 컬럼 5개만 추가.
--
-- 기존 데이터 영향:
--   sales_customers 실데이터 2,583행(임태성 카톡 이관분 포함)에 nullable 컬럼 5개 추가 →
--   기존 행은 전부 신규 컬럼 값 NULL 로 채워지며 기존 값·동작 무영향(무손실·무회귀).
--   NOT NULL/DEFAULT 강제 없음 → 대용량 재작성(rewrite) 부담·잠금 최소.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── sales_customers.job (직업) ───────────────────────────────────────────────
-- 멱등: 이미 존재하면 무시(재실행 안전)
alter table public.sales_customers
  add column if not exists job text;

comment on column public.sales_customers.job is
  '인수정보: 직업(자유서술, 선택). 상담관리 A1 §1.';

-- ── sales_customers.medication (약 복용 여부) ────────────────────────────────
alter table public.sales_customers
  add column if not exists medication text;

-- CHECK 제약: A1 §1 지정 3값(복용 중/복용 안 함/과거 복용). NULL 통과(미입력 안전).
-- add constraint if not exists 문법이 없어, 중복 생성 방지를 위해 조건부로 추가(멱등).
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'sales_customers_medication_chk'
       and conrelid = 'public.sales_customers'::regclass
  ) then
    alter table public.sales_customers
      add constraint sales_customers_medication_chk
      check (medication in ('복용 중','복용 안 함','과거 복용'));
  end if;
end $$;

comment on column public.sales_customers.medication is
  '인수정보: 약 복용 여부(복용 중/복용 안 함/과거 복용, 선택). 상담관리 A1 §1.';

-- ── sales_customers.history (병력) ───────────────────────────────────────────
alter table public.sales_customers
  add column if not exists history text;

comment on column public.sales_customers.history is
  '인수정보: 병력/기왕력(자유서술, 선택). 상담관리 A1 §1.';

-- ── sales_customers.dx_date (진단일) ─────────────────────────────────────────
alter table public.sales_customers
  add column if not exists dx_date text;

comment on column public.sales_customers.dx_date is
  '인수정보: 진단일(형식 자유 text, 선택). 상담관리 A1 §1.';

-- ── sales_customers.uw_status (현재 상태·자유서술) ───────────────────────────
-- ⚠️ 기존 status(영업 8단계)와 충돌 회피 대체명. A1 §1 status → uw_status.
alter table public.sales_customers
  add column if not exists uw_status text;

comment on column public.sales_customers.uw_status is
  '인수정보: 현재 상태 서술(자유서술, 선택). A1 §1 status를 기존 영업단계 status와 충돌 회피해 uw_status로 채택.';

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- DOWN / ROLLBACK (되돌리기) — 아래 블록의 주석을 해제해 실행하면 추가분이 제거된다.
--   역순 drop(제약 → 컬럼). ⚠️ 컬럼 삭제 시 적재된 데이터도 함께 소실되므로 신중히.
-- ═══════════════════════════════════════════════════════════════════════════
-- begin;
--   alter table public.sales_customers
--     drop constraint if exists sales_customers_medication_chk;
--   alter table public.sales_customers drop column if exists uw_status;
--   alter table public.sales_customers drop column if exists dx_date;
--   alter table public.sales_customers drop column if exists history;
--   alter table public.sales_customers drop column if exists medication;
--   alter table public.sales_customers drop column if exists job;
-- commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- 검증(🟢 읽기전용) — 적용 후 실행. 5컬럼 존재·타입 + medication CHECK 확인.
--   (동반 사후검증: scripts/ci/postverify_2026-07-10_sales_customers_underwriting_columns.sql)
-- ═══════════════════════════════════════════════════════════════════════════
-- select column_name, data_type, is_nullable
--   from information_schema.columns
--  where table_schema='public' and table_name='sales_customers'
--    and column_name in ('job','medication','history','dx_date','uw_status')
--  order by column_name;
--   PASS 기대(5행, 전부 text · is_nullable=YES):
--     dx_date    | text | YES
--     history    | text | YES
--     job        | text | YES
--     medication | text | YES
--     uw_status  | text | YES
