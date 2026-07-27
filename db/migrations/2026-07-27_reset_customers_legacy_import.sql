-- ═══════════════════════════════════════════════════════════════════════════
-- 🔴 데이터 리셋 — 2026-06-26 대량이관 레거시 고객 완전 삭제 (sales_customers)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⏳ DRAFT — 미적용. 실제 반영 = workflow_dispatch db-migrate.yml → production-db → AI팀 apply.
-- ⚠️ 대상 프로젝트(유일 진실 원천): onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
--
-- 목적(대표 지시 2026-07-27): 고객관리(salesnote)에 쌓인 2026-06-26 대량이관 레거시(안 쓰는 데이터)를 리셋.
--   대표 확정 = "백업 불요 · 완전 삭제 · 이관분만". 대표가 직접 추가한 고객·상담관리는 보존.
--
-- 삭제 조건(정밀):
--   source_ref LIKE 'imp:%'   — 2026-06-26 이관 배치 마커(이관 SQL docs/ops/2026-06-26_sales_import_step2_load.sql 이 부여, 검증 기대 2583)
--   AND status = '신규'        — 레거시 단일 status. 대표 추가분은 '신규DB'~'청약완료'(8단계)라 '신규'와 절대 안 겹침(app.html:15966)
--   → 이관분 중 "아직 손대지 않은" 레거시만. 이관됐어도 대표가 접촉해 status가 바뀐 건은 자동 보존.
--
-- 보호(삭제 안 됨): 대표 직접 추가(source_ref 없음·status≠'신규') · 상담관리 68(status≠'신규') · 청약완료(status='청약완료').
-- 동반 삭제: 위 대상 고객의 sales_consultations(이관 시 함께 생성된 상담기록) — FK 정합. 대상 외 상담기록 무접촉.
--
-- 안전장치: 삭제 대상 > 2700건이면 예외로 중단(조건 오류로 인한 대량 오삭제 원천 차단). 트랜잭션(오류 시 전체 롤백).
-- 멱등성: 재실행 시 대상 0건이라 무해.
-- ⚠️ 완전 삭제 = 복구 불가(백업 없음, 대표 지시).
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- 0) 삭제 대상 집계 + 상한 가드(2700 초과 시 중단)
do $$
declare n_cust int;
begin
  select count(*) into n_cust
    from sales_customers
   where source_ref like 'imp:%' and status = '신규';
  raise notice '[reset] 삭제 대상 고객 = % 건', n_cust;
  if n_cust > 2700 then
    raise exception '[reset] ABORT: 삭제 대상 %건이 상한(2700) 초과 — 조건 재검토 필요', n_cust;
  end if;
end $$;

-- 1) 대상 고객의 상담기록 먼저 삭제(FK 정합)
delete from sales_consultations
 where customer_id in (
   select id from sales_customers where source_ref like 'imp:%' and status = '신규'
 );

-- 2) 대상 고객 삭제
delete from sales_customers
 where source_ref like 'imp:%' and status = '신규';

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- DOWN / ROLLBACK — 없음(완전 삭제·백업 없음, 대표 지시 2026-07-27). 삭제된 행은 복구 불가.
--   트랜잭션은 apply 중 오류가 나면 자동 롤백(부분 삭제 없음). commit 이후엔 복구 수단이 없다.
-- ═══════════════════════════════════════════════════════════════════════════
