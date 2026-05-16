-- ============================================================================
-- 네비게이션방 시드 보강 — 5/6 (수) 신규 추가 (23건)
-- 작성: 2026-05-16 D-2 (5/18 4팀 오픈 D-Day)
-- 출처: docs/work_orders/KakaoTalk_20260516_1837_11_378_group.txt (line 16741~16811)
-- 실행 위치: Supabase Dashboard SQL Editor (신버전 onesecond-v1-restore-0420)
-- 실행 주체: 팀장님 (또는 Chrome AI 의뢰)
-- ============================================================================
--
-- 🚨 실행 전 필수 확인:
--   1. Dashboard 좌상단 프로젝트 = `onesecond-v1-restore-0420`
--   2. URL ID = `pdnwgzneooyygfejrvbg`
--
-- 📌 본 SQL 본진:
--   - 직전 commit `e806a71` 박은 130건은 보존 (DELETE 박지 X)
--   - 5/6 (수) 박힌 메시지만 추가 INSERT (23건)
--   - 5/4 (월) = "정혜수님이 나갔습니다" 시스템 메시지만 박혀 있어 INSERT 박지 X
--   - 익명화 정책 동일 (B+C 하이브리드)
--
-- 📊 본진:
--   - board_type = 'navigation' (동일)
--   - source_label JSON.source = 'kakao_navigation' / date = '2026-05-06'
--
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_author_id  uuid;
  v_team_id    uuid;
  v_inserted   int := 0;
BEGIN
  SELECT id INTO v_author_id FROM public.users WHERE email = 'jaisung78@gmail.com' LIMIT 1;
  IF v_author_id IS NULL THEN RAISE EXCEPTION '한재성 실장 UUID lookup 실패'; END IF;

  SELECT id INTO v_team_id FROM public.teams
  WHERE name LIKE '%4팀%' OR id::text LIKE '5fccd362%' ORDER BY created_at LIMIT 1;
  IF v_team_id IS NULL THEN RAISE EXCEPTION '4팀 UUID lookup 실패'; END IF;

  INSERT INTO public.posts (
    author_id, author_name, display_name, display_author,
    team_id, board_type, audience_target, is_notice,
    title, content, category,
    source_type, source_label, created_at
  ) VALUES

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '78세 남 무직/무약 간병보험 최대 가능 회사',
   E'안녕하세요. 78세 남자 무직입니다. 약복용없고, 입원수술력도 없습니다. 간병보험(지원이나 사용 모두) 최대 가능한 회사 알고싶습니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-06","kind":"question"}'::jsonb, '2026-05-06 09:39:00+09'),

  (v_author_id::text, '메리츠', '메리츠', '메리츠', v_team_id, 'navigation', 'team_internal', false,
   '[메리츠] 3.10.5간편 기준 10/5/5 가능',
   E'3 10 5간편 기준으로 10/5/5 가능합니다.',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-06","kind":"answer"}'::jsonb, '2026-05-06 09:42:00+09'),

  (v_author_id::text, '한화생명', '한화생명', '한화생명', v_team_id, 'navigation', 'team_internal', false,
   '[한화생명] 직업 상관없이 가능',
   E'한화생명 직업 상관없이 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-06","kind":"answer"}'::jsonb, '2026-05-06 09:42:30+09'),

  (v_author_id::text, '흥국생명', '흥국생명', '흥국생명', v_team_id, 'navigation', 'team_internal', false,
   '[흥국생명] 간병인 사용일당 80세까지 한도',
   E'간병인 사용일당. 80세까지 동일한도로\n\n1. 요양병원 - 6만원\n2. 요양병원 제외\n  - 180일 이내 담보 15만원\n  - 180일 이후 담보 20만원\n3. 간호간병\n  - 실손 있으면 4.5만원\n  - 실손 없으면 7만원',
   '상품', 'seed', '{"source":"kakao_navigation","date":"2026-05-06","kind":"answer"}'::jsonb, '2026-05-06 09:44:00+09'),

  (v_author_id::text, '한화손보', '한화손보', '한화손보', v_team_id, 'navigation', 'team_internal', false,
   '[한화손보] 5세대 실손 5/6 오후 2시부터 판매',
   E'★한화손보 안내드립니다★\n\n★★★5세대 실손\n5월 6일 (오늘) [[오후2시]] 부터 판매\n\n종합보험 상해사망 1억으로 [[방진없이]] 실비 가입가능\n\n(4월 한달동안 표준체실비-20세이상 방진이었습니다)',
   '공지', 'seed', '{"source":"kakao_navigation","date":"2026-05-06","kind":"answer"}'::jsonb, '2026-05-06 10:29:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '치매표적치료제 한도 보험사별 비교자료',
   E'문의드립니다. 치매표적치료제 한도 보험사별 비교자료 혹시 있다면 부탁드립니다',
   '상품', 'seed', '{"source":"kakao_navigation","date":"2026-05-06","kind":"question"}'::jsonb, '2026-05-06 10:42:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '4세대실손 가입할 수 있는 보험사 / 60세 이상 방진',
   E'4세대실손 가입할수 있는 보험사 있을까요?\n60세 이상도 방진 없는거죠?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-06","kind":"question"}'::jsonb, '2026-05-06 10:48:00+09'),

  (v_author_id::text, '한화손보', '한화손보', '한화손보', v_team_id, 'navigation', 'team_internal', false,
   '[한화손보] 61세부터 종합여부 무관 방진',
   E'61세부터는 종합여부와 상관없이 방진일것 같습니다.\n2시 이후 정확한 확인 후에 다시 공지 드릴께요',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-06","kind":"answer"}'::jsonb, '2026-05-06 10:53:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '2시까지 한화손보만 4세대 실손 가입 가능 / 30세 여',
   E'2시까지는 한화손보만 4세대 실손가입가능한가요? 30세 여성입니다.',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-06","kind":"question"}'::jsonb, '2026-05-06 12:52:00+09'),

  (v_author_id::text, '한화손보', '한화손보', '한화손보', v_team_id, 'navigation', 'team_internal', false,
   '[한화손보] 5/1~오늘 2시전까지 표준체/전환실비 모두 판매 불가',
   E'아뇨 개정이슈로 5월 1일~오늘 2시전까지 표준체실비 / 전환실비 모두 판매 불가입니다.',
   '공지', 'seed', '{"source":"kakao_navigation","date":"2026-05-06","kind":"answer"}'::jsonb, '2026-05-06 13:00:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '45년된 아파트 주택화재보험',
   E'45년된 아파트라고 하는데 주택화재보험 가입 가능한 회사가 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-06","kind":"question"}'::jsonb, '2026-05-06 13:01:00+09'),

  (v_author_id::text, '한화손보', '한화손보', '한화손보', v_team_id, 'navigation', 'team_internal', false,
   '[한화손보] 주택화재 가능, 급배수 가입불가',
   E'한화손보 주택화재 가능하나 급배수는 가입불가 합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-06","kind":"answer"}'::jsonb, '2026-05-06 13:02:00+09'),

  (v_author_id::text, '메리츠', '메리츠', '메리츠', v_team_id, 'navigation', 'team_internal', false,
   '[메리츠] 가능 / 급배수누출손해 건축연한 미적용',
   E'가능합니다. 급배수누출손해 건축연한 안 봐요',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-06","kind":"answer"}'::jsonb, '2026-05-06 13:02:30+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '88년 사무직 355 정기사망 20년납 1억',
   E'안녕하세요. 880201-1 사무직 355플랜으로 정기사망 20년납 20년만기 1억 가능한 곳 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-06","kind":"question"}'::jsonb, '2026-05-06 13:19:00+09'),

  (v_author_id::text, 'KB손보', 'KB손보', 'KB손보', v_team_id, 'navigation', 'team_internal', false,
   '[KB라이프생명] 가능',
   E'KB라이프생명 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-06","kind":"answer"}'::jsonb, '2026-05-06 13:23:00+09'),

  (v_author_id::text, '신한라이프', '신한라이프', '신한라이프', v_team_id, 'navigation', 'team_internal', false,
   '[신한라이프] 있습니다',
   E'신한라이프 있습니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-06","kind":"answer"}'::jsonb, '2026-05-06 13:41:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '33세 여 1급 8년째 공황장애 간편실손',
   E'33세 여자 1급 / 8년째 공황장애 약 복용중 / 간편실손 가입가능한곳 있을까요',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-06","kind":"question"}'::jsonb, '2026-05-06 14:37:00+09'),

  (v_author_id::text, '한화손보', '한화손보', '한화손보', v_team_id, 'navigation', 'team_internal', false,
   '[한화손보] 5세대 실비 61세 이상 종합연계 무관 방진',
   E'★한화손보★\n\n5세대 실비\n61세 이상부터 종합연계 상관없이 방진입니다.',
   '공지', 'seed', '{"source":"kakao_navigation","date":"2026-05-06","kind":"answer"}'::jsonb, '2026-05-06 14:59:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '84세 여 간편고지형 암 뇌심장 보상한도 높은 회사',
   E'84세여, 간편고지형으로 암 뇌심장 보상한도가 높게 들어가는 회사가 어디있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-06","kind":"question"}'::jsonb, '2026-05-06 16:13:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '레진/인레이/온레이 충치치료 한도 큰 치아보험',
   E'문의요. 레진, 인레이, 온레이 충치치료 한도 많이 들어가는 치아보험 회사 어딘가요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-06","kind":"question"}'::jsonb, '2026-05-06 16:22:00+09'),

  (v_author_id::text, '라이나생명', '라이나생명', '라이나생명', v_team_id, 'navigation', 'team_internal', false,
   '[라이나생명] 인레이 8만 / 인레이온레이 30만 / 크라운 50만',
   E'라이나생명 인레이 8만원, 인레이온레이 30만원, 크라운 50만원으로 들어갈 수 있습니다',
   '상품', 'seed', '{"source":"kakao_navigation","date":"2026-05-06","kind":"answer"}'::jsonb, '2026-05-06 16:27:00+09'),

  (v_author_id::text, '라이나손보', '라이나손보', '라이나손보', v_team_id, 'navigation', 'team_internal', false,
   '[라이나손보] 레진 10만 / 인-온레이 20만 / 크라운 40만',
   E'라손은 레진 10만, 인/온레이 20만, 크라운 40만 입니다',
   '상품', 'seed', '{"source":"kakao_navigation","date":"2026-05-06","kind":"answer"}'::jsonb, '2026-05-06 16:28:00+09');

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RAISE NOTICE 'INSERT 완료 — % row 적용 (5/6 신규 추가, 직전 130건 보존)', v_inserted;
END $$;

-- ┌─────────────────────────────────────────────────────────┐
-- │ 검증 SELECT                                                  │
-- └─────────────────────────────────────────────────────────┘

-- 5/6 신규분 카운트
SELECT COUNT(*) AS may06_count
FROM public.posts
WHERE source_type = 'seed'
  AND source_label::jsonb->>'source' = 'kakao_navigation'
  AND source_label::jsonb->>'date' = '2026-05-06';

-- navigation 통합 카운트 (직전 130건 + 5/6 23건 = 153건 정합)
SELECT COUNT(*) AS navigation_total
FROM public.posts
WHERE source_type = 'seed'
  AND source_label::jsonb->>'source' = 'kakao_navigation'
  AND created_at >= '2026-04-28';

-- 일자별 분포 (5/6 추가 정합 검증)
SELECT
  source_label::jsonb->>'date' AS post_date,
  COUNT(*) AS n
FROM public.posts
WHERE source_type = 'seed'
  AND source_label::jsonb->>'source' = 'kakao_navigation'
  AND created_at >= '2026-04-28'
GROUP BY post_date
ORDER BY post_date;

COMMIT;

-- 격차 발견 시: ROLLBACK;

-- ============================================================================
-- 검증 기준
-- ============================================================================
-- 예상 may06_count: 23건
-- 예상 navigation_total: 153건 (130 + 23)
-- 예상 일자 분포: 11일 (4/28, 4/29, 4/30, 5/6 신규, 5/7, 5/8, 5/11, 5/12, 5/13, 5/14, 5/15)
-- ============================================================================
