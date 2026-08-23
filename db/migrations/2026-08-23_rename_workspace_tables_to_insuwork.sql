-- 🟠 실제 DDL — workspace_* 4개 테이블을 insuwork_*로 rename (데이터·RLS·인덱스 그대로 유지)
-- ═══════════════════════════════════════════════════════════════════════════
-- 대표 승인(2026-08-23): "워크스테이션"→"보험워크" 전체 리네임의 2단계.
--   1단계(PR #1810)에서 URL·파일명·CSS·JS 식별자·한글 표시명을 이미 insuwork/보험워크로
--   교체했다. 이 마이그레이션은 마지막 남은 표면 — DB 테이블 이름 자체를 맞춘다.
--
-- ALTER TABLE ... RENAME TO는 데이터·컬럼·제약조건·인덱스·RLS 정책·FK 관계를 전부
--   그대로 보존한 채 테이블 이름만 바꾼다(Postgres 표준 동작, 데이터 이동·복사 없음).
--
-- ⚠️ 인덱스·제약조건·RLS 정책 이름 자체(예: workspace_items_owner_idx,
--   workspace_items_select 정책명)는 Postgres가 테이블 rename 시 자동으로 바꾸지
--   않는다. 이건 사용자·코드 어디서도 이름으로 직접 참조되지 않는 순수 내부 구현
--   디테일이라(REST 호출은 테이블 이름만 씀) 이번 범위에서 제외한다 — 기능·화면
--   영향 없음.
--
-- ⚠️ 배포 조율: 이 마이그레이션 적용과 js/personal-workspace.js 등의 REST 호출
--   문자열을 insuwork_*로 바꾸는 코드 PR을 반드시 짧은 시간 안에 함께 배포한다 —
--   한쪽만 반영된 상태로 오래 두면 그 사이 파일럿 화면이 일시적으로 깨진다
--   (임태성 1인 게이트, 영향 범위 최소).
--
-- ⚠️ 대상: onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
-- ═══════════════════════════════════════════════════════════════════════════

begin;

alter table public.workspace_items rename to insuwork_items;
alter table public.workspace_customers rename to insuwork_customers;
alter table public.workspace_consultations rename to insuwork_consultations;
alter table public.workspace_tasks rename to insuwork_tasks;

commit;

-- DOWN / ROLLBACK: 역방향으로 동일하게 rename하면 즉시 원복된다(데이터 손실 없음):
--   alter table public.insuwork_items rename to workspace_items;
--   alter table public.insuwork_customers rename to workspace_customers;
--   alter table public.insuwork_consultations rename to workspace_consultations;
--   alter table public.insuwork_tasks rename to workspace_tasks;
