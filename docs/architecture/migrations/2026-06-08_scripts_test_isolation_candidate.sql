-- ============================================================================
-- scripts 노출 버그 1단계(급한 불) — 테스트 데이터 격리 "후보" + 확인 쿼리
-- 작성: 개발팀장(Claude Code) / 2026-06-08
-- 성격: 🟢 확인(SELECT) + 🟠 격리 후보(UPDATE) — 실행은 팀장님 단독
-- ============================================================================
--
-- 🚨 실행 전 신버전 확인:
--   - Dashboard 좌상단 = onesecond-v1-restore-0420
--   - URL ID = pdnwgzneooyygfejrvbg
--
-- 📌 경계(작업지시서 §7):
--   - 본 파일은 1단계 급한 불 보조. RLS·스키마(team 컬럼)는 건드리지 않음(트랙 B 본체).
--   - 본문 컬럼 = script_text (content 아님).
--   - 아래 §C UPDATE는 §B 미리보기로 대상 확인 후에만 실행.
-- ============================================================================


-- ┌──────────────────────────────────────────────────────────────────────┐
-- │ §A. 🟢 global 채팅 시드 2건 확인 (작업지시서 §2)                         │
-- └──────────────────────────────────────────────────────────────────────┘
-- keywords에 '유형:채팅' 포함 + scope='global' → 제목/본문/keywords/플래그 확인
SELECT id, title, scope, is_sample, is_active,
       left(script_text, 120) AS script_text_head,
       keywords
FROM public.scripts
WHERE scope = 'global'
  AND keywords::text ILIKE '%유형:채팅%'
ORDER BY created_at;


-- ┌──────────────────────────────────────────────────────────────────────┐
-- │ §B. 🟢 테스트성 global scripts 탐지 (작업지시서 §3 — 삭제 금지·확인만)   │
-- └──────────────────────────────────────────────────────────────────────┘
-- '카드 스크립트 테스트' / '스크립트 테스트' / '저장 테스트' 등 테스트 성격이
-- scope='global'(전사 노출)로 떠 있는지 확인. 격리 대상 후보 목록.
SELECT id, title, scope, is_sample, is_active, owner_id, owner_email,
       left(script_text, 80) AS script_text_head,
       created_at
FROM public.scripts
WHERE scope = 'global'
  AND (
        title ILIKE '%테스트%'
     OR title ILIKE '%test%'
     OR title ILIKE '%샘플%'
     OR title ILIKE '%카드 스크립트%'
     OR title ILIKE '%저장 테스트%'
  )
ORDER BY created_at DESC;

-- 참고: 현재 scope 분포 (global 61 / personal 2 — 2026-06-08 진단)
SELECT scope, is_sample, is_active, COUNT(*)
FROM public.scripts
GROUP BY scope, is_sample, is_active
ORDER BY scope, is_sample, is_active;


-- ┌──────────────────────────────────────────────────────────────────────┐
-- │ §C. 🟠 격리 후보 (UPDATE) — §B로 대상 확정 후에만 실행                    │
-- │     삭제 아님. is_active=false 로 운영 노출에서만 제외(데이터 보존).      │
-- └──────────────────────────────────────────────────────────────────────┘
-- ⚠️ 아래는 "후보". §B 미리보기 결과에서 진짜 테스트 행 id를 확인한 뒤
--    id 목록을 채워 실행하세요. (패턴 일괄보다 id 지정이 안전)
--
-- BEGIN;
--
-- -- (1) 실행 전 대상 재확인
-- SELECT id, title, scope, is_active
-- FROM public.scripts
-- WHERE id IN ( /* §B에서 확인한 테스트 행 id 나열 */ );
--
-- -- (2) 격리: 운영 노출에서 제외 (프론트가 is_active=true만 조회하므로 즉시 숨김)
-- UPDATE public.scripts
-- SET is_active = false
-- WHERE id IN ( /* 위와 동일 id 목록 */ )
--   AND scope = 'global';   -- 안전장치: global 행만
--
-- -- (3) 검증
-- SELECT id, title, scope, is_active
-- FROM public.scripts
-- WHERE id IN ( /* 동일 id 목록 */ );
--
-- COMMIT;
--
-- 대안: 격리를 더 강하게 하려면 is_active=false 대신 scope='personal'
--       (소유자에게만 보이게) 도 가능. 단 owner_id 가 본인일 때만 의미 있음.
-- ============================================================================
