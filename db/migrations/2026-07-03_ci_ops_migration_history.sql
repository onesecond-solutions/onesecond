-- ============================================================================
-- CI 마이그레이션 러너 — 정식 실행 이력 구조 (item 3: 모든 운영 DDL은 리뷰 마이그레이션 안에)
-- 별도 스키마 ops. 일반 사용자 접근 완전 차단. 이 파일이 CI 러너의 "첫 부트스트랩 마이그레이션".
-- ⚠️ 실행 금지(설계 검수용). CI 러너의 최초 apply 대상(감사센터 마이그레이션보다 먼저).
-- ============================================================================
begin;

create schema if not exists ops;

create table if not exists ops.migration_history (
  id            bigint generated always as identity primary key,
  filename      text not null,
  sha256        text not null,
  workflow_run_id text,
  deployment_id text,
  commit_sha    text,
  project_ref   text,
  approver      text,                 -- 확인 가능한 경우만. 불명확 시 null(run/deployment id로 대체)
  applied_at    timestamptz not null default now(),
  result        text not null check (result in ('success','verify_failed','failed')),
  verify_result jsonb,
  rolled_back   boolean not null default false,
  unique (filename, sha256)
);

-- 일반 사용자 완전 차단: RLS on + 정책 0(=authenticated 접근 0). ops 스키마 usage도 미부여.
alter table ops.migration_history enable row level security;
revoke all on schema ops from public;
revoke all on all tables in schema ops from public;
-- (authenticated/anon 접근 0. 배포 역할·소유자만 스키마 usage 보유 — 아래 setup 참고)

comment on table ops.migration_history is 'CI 마이그레이션 러너 실행 이력. RPC·앱·일반 사용자 미노출.';

commit;

-- ROLLBACK (down): begin; drop table if exists ops.migration_history; drop schema if exists ops; commit;
