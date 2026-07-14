-- 🟢 읽기전용 진단 — 공유글 수정·삭제 막힘 원인: scripts/team_notices RLS 라이브 상태 확인 (변경 0)
-- ═══════════════════════════════════════════════════════════════════════════
-- 대표 재신고(2026-07-15): 지점 공유글 수정·삭제 안 됨(2026-07-10 완결분 재발).
--   프론트 게이트는 regressed 안 됨(admin 이미 통과) → 서버 RLS 의심.
--   이 CI 채널로 pg_policies 를 읽어 로그로만 출력한다(변경·발송 0).
--
-- ⚠️ no-op 마이그레이션. 동반 postverify 가 scripts/team_notices 정책을 RAISE NOTICE 로 출력.
-- ⚠️ 대상: onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
begin;
select 1;  -- no-op
commit;

-- DOWN / ROLLBACK: 되돌릴 변경 없음(no-op).
