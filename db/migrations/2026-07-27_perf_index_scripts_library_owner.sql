-- ═══════════════════════════════════════════════════════════════════════════
-- 🟢 성능 인덱스 — scripts / library 소유자 목록 조회 가속 (2026-07-27)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⏳ DRAFT — 미적용. 실제 반영 = workflow_dispatch db-migrate.yml → production-db → AI팀 apply.
--
-- ⚠️ 대상 프로젝트(유일 진실 원천): onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
--
-- 배경(대표 지시 2026-07-27):
--   업무노트 무한로딩은 select=* 대량 로드가 원인이었고 코드(PR #1469)로 해결(수MB→~20KB).
--   그러나 목록용 경량 쿼리도 라이브 실측 ~2.2초로 느림 → 2차로 인덱스 보강.
--
-- 대상 쿼리(app.html loadMyspace):
--   scripts?owner_id=eq.<uid>&is_active=eq.true&order=created_at.desc&limit=50
--   library?owner_id=eq.<uid>&order=created_at.desc&limit=50
--   → owner_id 필터 + created_at desc 정렬을 커버하는 복합 인덱스로 seq scan 제거.
--
-- 멱등성: CREATE INDEX IF NOT EXISTS — 재실행/기존 동등 인덱스 존재 시에도 안전(무해).
--   ※ 이미 동등 인덱스가 있으면 이건 중복이 되나(무해), postverify가 테이블의 전체 인덱스를
--     로그로 남겨 중복 여부를 확인 가능 → 필요 시 DOWN 으로 정리.
-- 락: begin;commit; 트랜잭션 래퍼라 CONCURRENTLY 불가 → 일반 CREATE INDEX.
--   scripts/library 는 소유자 격리 소규모 테이블(현 사용자 ~10명)이라 빌드·락 순간(수백ms) 예상.
-- 데이터 무변경 · 스키마 정책·컬럼 무접촉(인덱스만 추가).
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- scripts: 소유자 + 활성 + 최신순 (myspace 목록·기타 owner 조회 공용)
create index if not exists idx_scripts_owner_active_created
  on public.scripts (owner_id, is_active, created_at desc);

-- library: 소유자 + 최신순
create index if not exists idx_library_owner_created
  on public.library (owner_id, created_at desc);

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- DOWN / ROLLBACK — 신규 인덱스만 제거(데이터·스키마 무접촉이라 원상 즉시)
-- ═══════════════════════════════════════════════════════════════════════════
-- begin;
--   drop index if exists public.idx_scripts_owner_active_created;
--   drop index if exists public.idx_library_owner_created;
-- commit;
