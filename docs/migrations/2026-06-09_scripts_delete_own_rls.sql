-- scripts 본인 행 DELETE 허용 RLS (2026-06-09) — 라이브러리 스크립트 삭제 버그 수정
-- 🚨 실행 전 신버전 확인: onesecond-v1-restore-0420 / pdnwgzneooyygfejrvbg
-- 🚨 실행 = 팀장님 (Supabase SQL Editor). Code는 파일·PR만. 본 PR DB 변경 0.
-- 🟠 데이터 변경(정책 생성). 실행 = 팀장님 결재 관문(Chrome).
--
-- 원인: scripts 에 owner DELETE 정책이 없음(현 정책 = insert_own·update_own·read(true)·admin-all).
--       → 사용자 본인 스크립트 DELETE 가 RLS로 차단 → PostgREST 204지만 0행 삭제 → "지웠는데 화면에 남음".
--       library 는 library_delete_own 있어 정상.
-- 패턴: scripts_update_own 과 동일 조건. owner_id = auth.uid()(id_eq_auth 확인됨). 본인 행만 삭제.
--       global/공용 스크립트는 owner_id 가 admin 이라 일반 사용자가 못 지움(안전).

create policy scripts_delete_own on public.scripts
  for delete to authenticated
  using ((auth.uid())::text = owner_id);

-- 🟢 검증(실행 후, 읽기 전용):
-- select policyname, cmd, qual from pg_policies
--  where schemaname='public' and tablename='scripts' and cmd='DELETE';   -- scripts_delete_own 1행 기대
