-- scripts SELECT RLS 강화 — 타인 personal 직접 조회 차단 (보안)
-- 신버전 pdnwgzneooyygfejrvbg. ★실행은 대표님 결재 + STEP 0 회귀 점검 후.
--
-- 🚨 현재 문제: SELECT 정책 "authenticated read scripts" = USING (true)
--    → 로그인한 모든 사용자가 scripts 전체(global+personal)를 직접 조회 가능.
--    검색 UI는 scope=eq.global 로 가렸으나 API 직접 호출로 타인 personal(개인 스크립트) 노출.
--
-- 목표: is_admin OR global OR (personal AND 본인) 만 SELECT 허용. (owner_id=text, auth.uid()::text 비교)
-- 회귀 우려: 매니저룸 공유 스크립트가 scope='personal' + room_type 으로 저장돼 있으면
--    'personal=owner만' 정책이 룸 멤버에게서 가림 → STEP 0 에서 정량 점검 후 분기.

-- ════════════════════════════════════════════════════════════════
-- STEP 0 : 회귀 점검 (★별도 RUN — 결과 보고 후 STEP 1 분기 결정)
-- ════════════════════════════════════════════════════════════════
-- (a) scope NULL 행 = 정책 3조건 모두 실패로 가려짐 → 0 이어야 안전
-- select count(*) scope_null from public.scripts where scope is null;
-- (b) ★매니저룸 공유 personal = (scope='personal' AND room_type 존재) → >0 이면 단순정책이 룸멤버에게 가림(회귀)
--     room_type 컬럼이 없으면 이 쿼리는 'column does not exist' → 그 경우 room 공유 없음으로 간주
-- select count(*) personal_with_room from public.scripts where scope='personal' and room_type is not null;
-- (c) scope 분포 재확인 (global/personal 외 값 없는지)
-- select scope, count(*) from public.scripts group by scope order by 2 desc;
-- (d) global 인데 owner_id 무관(공용) 확인 — global 은 전원 노출 유지
-- select count(*) global_rows from public.scripts where scope='global';

-- ════════════════════════════════════════════════════════════════
-- STEP 1 : SELECT 정책 교체 (USING true → 조건부)
--   ★ STEP 0 (b) personal_with_room = 0 일 때 이 단순 정책 사용.
--     (b) > 0 이면 룸 멤버 가시성 보존 절을 추가해야 하므로 적용 보류 + 재설계.
-- ════════════════════════════════════════════════════════════════
drop policy if exists "authenticated read scripts" on public.scripts;
create policy "authenticated read scripts" on public.scripts
  for select to authenticated
  using (
    is_admin()
    or scope = 'global'
    or (scope = 'personal' and owner_id = auth.uid()::text)
  );

-- (admin manage scripts: is_admin() ALL 정책은 그대로 유지 — 변경 없음)

-- ════════════════════════════════════════════════════════════════
-- STEP 2 : 검증 (별도 RUN)
-- ════════════════════════════════════════════════════════════════
-- select policyname, cmd, qual from pg_policies where schemaname='public' and tablename='scripts' order by 1;
--   → "authenticated read scripts" qual 이 is_admin()/global/personal-owner 조건으로 바뀌었는지
-- (본인 계정 세션에서) select count(*) from public.scripts where scope='personal';  -- 본인 personal 수만
-- (타 계정 세션에서) select count(*) from public.scripts where scope='personal' and owner_id<>auth.uid()::text;  -- 0 기대
