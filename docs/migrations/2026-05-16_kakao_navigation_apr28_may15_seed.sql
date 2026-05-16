-- ============================================================================
-- 네비게이션방 시드 — 4/28 ~ 5/15 (옵션 B+C 하이브리드 익명화)
-- 작성: 2026-05-16 D-2 (5/18 4팀 오픈 D-Day)
-- 출처: docs/work_orders/KakaoTalk_20260516_1745_31_733_group.txt (line 16025~16660)
-- 실행 위치: Supabase Dashboard SQL Editor (신버전 onesecond-v1-restore-0420)
-- 실행 주체: 팀장님 (또는 Chrome AI 의뢰)
-- ============================================================================
--
-- 🚨 실행 전 필수 확인:
--   1. Dashboard 좌상단 프로젝트 = `onesecond-v1-restore-0420` 맞는지
--   2. URL ID = `pdnwgzneooyygfejrvbg` 맞는지
--   둘 중 하나 다르면 즉시 중단
--
-- 📌 익명화 정책 (옵션 B+C 하이브리드):
--   - 질문자 → display_name = "팀장님" (모든 발신자 통일)
--   - 답변자 → display_name = 보험사명 (DB손보 / 메리츠 / 흥국화재 등)
--   - 보험사명 식별 불가한 답변 → "팀장님"으로 통일
--   - 짧은 인사("감사합니다" 등) / "사진" / "메시지가 삭제되었습니다" / 초대 메시지 제외
--
-- 📊 본진:
--   - board_type = 'navigation' (네비게이션방)
--   - audience_target = 'team_internal' (4팀 본진)
--   - is_notice = false (질의응답이라 공지 X)
--   - source_type = 'seed' / source_label JSON.source = 'kakao_navigation'
--   - author_id = 한재성 실장 UUID (대리 INSERT, 운영자 자격)
--   - team_id = 4팀 UUID (동적 lookup)
--
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_author_id  uuid;
  v_team_id    uuid;
  v_inserted   int := 0;
BEGIN
  SELECT id INTO v_author_id
  FROM public.users
  WHERE email = 'jaisung78@gmail.com'
  LIMIT 1;

  IF v_author_id IS NULL THEN
    RAISE EXCEPTION '한재성 실장 UUID lookup 실패';
  END IF;

  SELECT id INTO v_team_id
  FROM public.teams
  WHERE name LIKE '%4팀%' OR id::text LIKE '5fccd362%'
  ORDER BY created_at LIMIT 1;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION '4팀 UUID lookup 실패';
  END IF;

  INSERT INTO public.posts (
    author_id, author_name, display_name, display_author,
    team_id, board_type, audience_target, is_notice,
    title, content, category,
    source_type, source_label, created_at
  ) VALUES

  -- ═══════════════════════════════════════════
  -- 4/28 (화)
  -- ═══════════════════════════════════════════
  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '57년생 남자 갑상선암 완치 종합보험 추천',
   E'안녕하세요 57년생 남자 당뇨,고혈압,고지혈없고 2024년 4월10일 갑상선초기암진단 1주입원수술로 완치. 종합보험 가능한 보험 추천바랍니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-28","kind":"question"}'::jsonb, '2026-04-28 09:34:00+09'),

  (v_author_id::text, 'DB손보', 'DB손보', 'DB손보', v_team_id, 'navigation', 'team_internal', false,
   '[DB손보] 311간편 가능',
   E'질문서 미해당시 311간편가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-28","kind":"answer"}'::jsonb, '2026-04-28 09:39:00+09'),

  (v_author_id::text, '메리츠', '메리츠', '메리츠', v_team_id, 'navigation', 'team_internal', false,
   '[메리츠] 31간편 가능',
   E'31간편으로 가능합니다.',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-28","kind":"answer"}'::jsonb, '2026-04-28 09:39:30+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '실비 상해 빼고 질병만 가능한 보험사',
   E'실비에서 상해빼고 질병만 가능한 보험사 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-28","kind":"question"}'::jsonb, '2026-04-28 10:24:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '68세 어깨수술 암보장 간병비 추천',
   E'안녕하세요? 68세 당뇨약복용 / 25.9월 어깨인대파열로 수술, 1달입원 / 암보장과 간병비 가능한 보험 추천바랍니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-28","kind":"question"}'::jsonb, '2026-04-28 10:24:30+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '61세 여 당뇨 표준체 실손 가능한 보험사',
   E'61세 여자 당뇨약 복용중 / 표준체 실손 심사 가능한 보험사 있을까요',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-28","kind":"question"}'::jsonb, '2026-04-28 10:26:00+09'),

  (v_author_id::text, '흥국화재', '흥국화재', '흥국화재', v_team_id, 'navigation', 'team_internal', false,
   '[흥국화재] 유병실손 가능 + 305 간병',
   E'흥국화재 유병실손 가능합니다.\n흥국화재 암만 진행하시는거면 3.10.5도 가능하나 간병포함이면 예외질환 입원일수 초과로 현재는 305만 가능합니다.',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-28","kind":"answer"}'::jsonb, '2026-04-28 10:27:00+09'),

  (v_author_id::text, '메리츠', '메리츠', '메리츠', v_team_id, 'navigation', 'team_internal', false,
   '[메리츠] 당뇨 표준체 불가, 유병자실비 / 305간편',
   E'당뇨의 경우는 표준체 불가, 유병자실비로 가능합니다.\n305간편으로 가능합니다.',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-28","kind":"answer"}'::jsonb, '2026-04-28 10:28:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '간병인 사용일당 3 10 5 / 74세 여성 인수가능',
   E'간병인 사용일당 3 10 5 같은 상품. 74세 여성 주부.\n17년 11월 치핵 통원 수술\n25년 5월 폐렴 14일입원\n26년 3월 백내장 통원 수술\n간병인 사용일당 인수가능한 곳 추천 부탁드립니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-28","kind":"question"}'::jsonb, '2026-04-28 10:30:00+09'),

  (v_author_id::text, '삼성화재', '삼성화재', '삼성화재', v_team_id, 'navigation', 'team_internal', false,
   '[삼성화재] 백내장 양측수술 3개월내 심사 / 간병 5만+15한도',
   E'백내장 3개월내 / 양측수술시 심사 가능\n일측수술이라면 3개월내 심사 불가\n\n간병 = 최저보험료 5만원 / 일반간병10+수술간병5 =15한도\n71세부터는 갱신만 가능',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-28","kind":"answer"}'::jsonb, '2026-04-28 10:40:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '71세 여 사망보험 가입 가능한 보험사',
   E'안녕하세요. 71세 여입니다.\n질병사망 2천 / 상해사망 5천-1억 가능한 보험사 있을까요?\n병력은 고혈압약만 복용중입니다.',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-28","kind":"question"}'::jsonb, '2026-04-28 11:44:00+09'),

  (v_author_id::text, '신한라이프', '신한라이프', '신한라이프', v_team_id, 'navigation', 'team_internal', false,
   '[신한라이프] 간편 정기특약 사망보장',
   E'신한라이프 간편 _ 정기특약 질병재해 사망(원하는금액가능), 재해사망 1억까지 가능 합니다.',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-28","kind":"answer"}'::jsonb, '2026-04-28 11:49:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '상해보험 20년납100세만기 보장 추천',
   E'상해보험 20년납100세만기 보장 괜찮은곳 추천부탁드려요',
   '상품', 'seed', '{"source":"kakao_navigation","date":"2026-04-28","kind":"question"}'::jsonb, '2026-04-28 12:03:00+09'),

  (v_author_id::text, 'DB손보', 'DB손보', 'DB손보', v_team_id, 'navigation', 'team_internal', false,
   '[DB손보] 만사형통 상해보험',
   E'만사형통 상해보험 - 간편플랜도 탑재',
   '상품', 'seed', '{"source":"kakao_navigation","date":"2026-04-28","kind":"answer"}'::jsonb, '2026-04-28 12:35:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '간병인비 시간 감액 회사',
   E'간병인비 감액이 시간으로 하는 회사가 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-28","kind":"question"}'::jsonb, '2026-04-28 14:00:00+09'),

  (v_author_id::text, '메리츠', '메리츠', '메리츠', v_team_id, 'navigation', 'team_internal', false,
   '[메리츠] 1일당 7만 미만 + 8시간 이상 100% 지급',
   E'1일당 7만원미만이라도 8시간 이상인 경우 가입금액 지급, 7만원미만 사용시 가입금액 50%지급 입니다.',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-28","kind":"answer"}'::jsonb, '2026-04-28 14:03:00+09'),

  (v_author_id::text, 'DB손보', 'DB손보', 'DB손보', v_team_id, 'navigation', 'team_internal', false,
   '[DB손보] 8시간 이상 이용시 100% 지급',
   E'8시간이상 이용시 100%지급입니다. (8시간미만시 면책)',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-28","kind":"answer"}'::jsonb, '2026-04-28 14:04:00+09'),

  (v_author_id::text, '흥국생명', '흥국생명', '흥국생명', v_team_id, 'navigation', 'team_internal', false,
   '[흥국생명] 8시간 이용시 100% 지급 (공동간병/케어네이션)',
   E'8시간 이용시 100%지급 (공동간병인, 케어네이션 가능)\n단, 8시간 미만일 경우 미지급 입니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-28","kind":"answer"}'::jsonb, '2026-04-28 14:23:00+09'),

  (v_author_id::text, '흥국화재', '흥국화재', '흥국화재', v_team_id, 'navigation', 'team_internal', false,
   '[흥국화재] 간병인 감액 8시간 미만 면책',
   E'간병인 감액 8시간미만 면책 / 8시간이상시 100% 지급 (1년미만 50%)',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-28","kind":"answer"}'::jsonb, '2026-04-28 14:26:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '30세 가스중독 후 3대진단비 종합 인수',
   E'기계설비업무 하는 고객 30세인데 2년전 업무중 가스중독으로 기절. 일주일입원. 약물치료. 후유증없이 완치됐다고합니다.\n3대진단비 종합설계로 인수가능한 보험사 있나요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-28","kind":"question"}'::jsonb, '2026-04-28 14:35:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   'B형 간염보균 정기보험 가능 회사',
   E'음료판매 820708-2 B형 간염보균자입니다. 정기보험 좋은데 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-28","kind":"question"}'::jsonb, '2026-04-28 14:44:00+09'),

  (v_author_id::text, '흥국화재', '흥국화재', '흥국화재', v_team_id, 'navigation', 'team_internal', false,
   '[흥국화재] B형 간염보균 인수 (0550건강 / 3N5간편)',
   E'0550건강보험 - 비활동성에 한해 E항원 검사결과지 첨부(6개월내) 승인(전기간부담보)\n3N5간편 - 치료력 있다면 설계가능, 고지의무 미해당시 승인. 최근 3개월이내 고지有 가입불가입니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-28","kind":"answer"}'::jsonb, '2026-04-28 14:53:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '60대 3급 남성 간편 3.5.5 정기보험',
   E'60대 / 3급 남성 / 간편 3.5.5 / 정기보험 가입가능한 회사 알려주세요~',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-28","kind":"question"}'::jsonb, '2026-04-28 15:46:00+09'),

  (v_author_id::text, '신한라이프', '신한라이프', '신한라이프', v_team_id, 'navigation', 'team_internal', false,
   '[신한라이프] 위험급수 최대 1억 가능',
   E'신한라이프 위험급수도 최대 1억 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-28","kind":"answer"}'::jsonb, '2026-04-28 15:47:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '75세 여 무릎수술 설계 가능 회사',
   E'안녕하세요. 75세 여자분 작년6월 무릎수술(질병) 한달 반. 입원이력있으신데 설계 해볼수 있는곳 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-28","kind":"question"}'::jsonb, '2026-04-28 19:05:00+09'),

  -- ═══════════════════════════════════════════
  -- 4/29 (수)
  -- ═══════════════════════════════════════════
  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '손보사 알츠하이머 진단비 보험사',
   E'손보사중에 알츠하이머 진단비가 있는 보험사 좀 알려주십시오',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-29","kind":"question"}'::jsonb, '2026-04-29 09:38:00+09'),

  (v_author_id::text, '흥국화재', '흥국화재', '흥국화재', v_team_id, 'navigation', 'team_internal', false,
   '[흥국화재] 플러스간편치매 / 123치매 알츠하이머 진단비',
   E'플러스간편치매 / 123치매 보험 (경,중증 알츠하이머 진단비) 담보탑재 되어 있습니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-29","kind":"answer"}'::jsonb, '2026-04-29 09:49:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '49세 여 뇌심+암치료비 가입',
   E'49세여자분입니다. 뇌심과 암치료비를 위해 가입할수있는 보험이 있을까요?\n1) 25년 7월 29일 수술 - 왼쪽 허벅지 다리모렐라발리병변 수술. 액체 긁어내는 수술. 3일입원. 완치. 재발무.\n2) 26년 3월 26일 건강검진 - 위내시경시 장상피화생 / 피검사시 췌장 아밀라제 수치 높음. 둘 다 증상 없어 약복용 없음. 의사소견 추가검사 없습니다.',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-29","kind":"question"}'::jsonb, '2026-04-29 10:16:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '53세 남 뇌경색 입원력 암보장',
   E'53세 남 현 고혈압약복용중. 2019~2021년 뇌경색 입원력 수술무 / 23년 간질환 입원3일 / 25.5월 흉통 입원1박. 암보장 가능한 회사 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-29","kind":"question"}'::jsonb, '2026-04-29 15:44:00+09'),

  (v_author_id::text, '라이나생명', '라이나생명', '라이나생명', v_team_id, 'navigation', 'team_internal', false,
   '[라이나생명] 암으로만 들어가시는거라면 3.2.5 심사',
   E'라이나생명 암으로만 들어가시는거라면 3.2.5 심사 진행 해볼수 있습니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-29","kind":"answer"}'::jsonb, '2026-04-29 15:51:00+09'),

  (v_author_id::text, '메리츠', '메리츠', '메리츠', v_team_id, 'navigation', 'team_internal', false,
   '[메리츠] 간편또또암 305간편 심사',
   E'간편또또암 305간편으로 심사 가능해요',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-29","kind":"answer"}'::jsonb, '2026-04-29 15:52:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '43세 여 간편 실비 / 1달전 감기약 처방',
   E'43세 여자 간편 실비. 한 달 전 감기약 3일 처방입니다. 가능한 보험사 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-29","kind":"question"}'::jsonb, '2026-04-29 16:03:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '63세 남 갈비뼈 골절 40일입원 암뇌심',
   E'63세 남성 고고당 무. 갈비뼈 골절로 40일입원 / 4.27일 퇴원. 암뇌심만 인수가능할까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-29","kind":"question"}'::jsonb, '2026-04-29 16:51:00+09'),

  (v_author_id::text, '메리츠', '메리츠', '메리츠', v_team_id, 'navigation', 'team_internal', false,
   '[메리츠] 치료종결 7일이후 가능, 3.10.5 60일까지',
   E'치료종결후 7일이후 가능하고 3 10 5간편 3대진단비플랜에서 상해 60일입원까지 인수 가능합니다.',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-29","kind":"answer"}'::jsonb, '2026-04-29 16:52:00+09'),

  (v_author_id::text, 'KDB생명', 'KDB생명', 'KDB생명', v_team_id, 'navigation', 'team_internal', false,
   '[KDB생명] 간편설계 일반형 암뇌심 가능',
   E'KDB생명 간편설계 사전고지 입력 시 일반형 암뇌심 가입가능으로 확인됩니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-29","kind":"answer"}'::jsonb, '2026-04-29 16:56:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '26세 남 여드름/탈모 치료 표준체 실손',
   E'26세 남. 22년부터 6개월마다 여드름/탈모 6개월마다 약처방 치료중. 표준체실손 할증이나 부담보로 심사 가능한 보험사 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-29","kind":"question"}'::jsonb, '2026-04-29 17:20:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '갑상선암 수술 완치 표준체 인수',
   E'2017년도 갑상선암 수술로 완치되었는데요~~ 이럴경우 암뇌심 가입시 표준체(일반고지형)로 가입이 가능한가요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-29","kind":"question"}'::jsonb, '2026-04-29 17:47:00+09'),

  -- ═══════════════════════════════════════════
  -- 4/30 (목)
  -- ═══════════════════════════════════════════
  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '외국인(네팔) E-9 운전자보험',
   E'안녕하세요. 외국인(네팔) 비전문취업 E-9 인데 운전자보험 가입가능한 보험사 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-30","kind":"question"}'::jsonb, '2026-04-30 09:53:00+09'),

  (v_author_id::text, '삼성화재', '삼성화재', '삼성화재', v_team_id, 'navigation', 'team_internal', false,
   '[삼성화재] 외국인 E-9 고등후 진행 가능',
   E'고등후 진행 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-30","kind":"answer"}'::jsonb, '2026-04-30 09:56:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '71년생 남 간편 종신 사망 2억',
   E'71년생 남자입니다. 간편상품으로 종신보험 월 50만대로 사망 2억 원하시는데요. 체증형이나 종신+정기로도 알아보고 있습니다. 가능한 보험사 알려주세요',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-30","kind":"question"}'::jsonb, '2026-04-30 10:59:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '단기납종신 7년납 3년거치 최저보험료',
   E'단기납종신 7년납 3년거치 최저보험료가 얼마인가요?\n22세 여성입니다. 예상보험료 6~8만원 선 입니다',
   '상품', 'seed', '{"source":"kakao_navigation","date":"2026-04-30","kind":"question"}'::jsonb, '2026-04-30 11:25:00+09'),

  (v_author_id::text, '교보생명', '교보생명', '교보생명', v_team_id, 'navigation', 'team_internal', false,
   '[교보생명] 주계약 1천만원 최저가입조건',
   E'교보생명 주계약 1천만원 최저가입조건입니다',
   '상품', 'seed', '{"source":"kakao_navigation","date":"2026-04-30","kind":"answer"}'::jsonb, '2026-04-30 11:25:30+09'),

  (v_author_id::text, '신한라이프', '신한라이프', '신한라이프', v_team_id, 'navigation', 'team_internal', false,
   '[신한라이프] 모아더드림 가입금액 500만원 낮춤',
   E'신한라이프 모아더드림, 모아더드림플러스 가입금액 500만원으로 낮춰졌습니다. 월 보험료는 나이에 따라 달라져서, 정확한 금액은 설계요청주시면 확인해드리겠습니다',
   '상품', 'seed', '{"source":"kakao_navigation","date":"2026-04-30","kind":"answer"}'::jsonb, '2026-04-30 11:26:00+09'),

  (v_author_id::text, 'ABL', 'ABL', 'ABL', v_team_id, 'navigation', 'team_internal', false,
   '[ABL] 더드림종신 1천만원 / 세븐종신 700% 체증',
   E'ABL더드림종신 최저가입금액 1천만원입니다.\nABL세븐종신보험 최대 700% 체증 추천드립니다~',
   '상품', 'seed', '{"source":"kakao_navigation","date":"2026-04-30","kind":"answer"}'::jsonb, '2026-04-30 11:39:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '84세 남 폐암수술 간병인 가입',
   E'혹시 84세 남자 3년전 폐암입원수술 간병인 관련 보장이 조금이라도 가입이 가능한 회사가 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-30","kind":"question"}'::jsonb, '2026-04-30 11:43:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '타사 설계사 가입가능한 보험사',
   E'타사 설계사 가입가능한 보험사안내부탁드려요!!',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-30","kind":"question"}'::jsonb, '2026-04-30 11:59:00+09'),

  (v_author_id::text, '삼성생명', '삼성생명', '삼성생명', v_team_id, 'navigation', 'team_internal', false,
   '[삼성생명] 최소가입금액 200만 / 400-600 예상',
   E'최소가입금액 200만. 해당금액 원하실 경우 가입금액 400 - 600 예상하시면됩니다.',
   '상품', 'seed', '{"source":"kakao_navigation","date":"2026-04-30","kind":"answer"}'::jsonb, '2026-04-30 12:00:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '73세 여 치매 표적약물 3천 보장',
   E'73세 여자 치매보험에서 표적약물 치료비 최대 보장 3천만원 이상 가능한곳 확인부탁 드려요',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-30","kind":"question"}'::jsonb, '2026-04-30 14:45:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '80세 여 치매/간병보험',
   E'80세 여성 치매나 간병보험 가능한 곳 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-30","kind":"question"}'::jsonb, '2026-04-30 15:48:00+09'),

  (v_author_id::text, '삼성생명', '삼성생명', '삼성생명', v_team_id, 'navigation', 'team_internal', false,
   '[삼성생명] 80세까지 치매치료비(레켐비)/간병',
   E'80세까지 치매치료비(레켐비), 간병 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-30","kind":"answer"}'::jsonb, '2026-04-30 15:49:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '61세 여 건강체 일반 실비',
   E'61세 여자 건강체 일반 실비 가입할수있는 회사 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-30","kind":"question"}'::jsonb, '2026-04-30 15:49:30+09'),

  (v_author_id::text, '현대해상', '현대해상', '현대해상', v_team_id, 'navigation', 'team_internal', false,
   '[현대해상] 61세 여 일반 실비 가능',
   E'현대해상 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-30","kind":"answer"}'::jsonb, '2026-04-30 15:51:00+09'),

  (v_author_id::text, 'DB손보', 'DB손보', 'DB손보', v_team_id, 'navigation', 'team_internal', false,
   '[DB손보] 61세이상 실손 대용진단 안내',
   E'61세이상자 실손의료비 가입시 대용진단 실시 (당사 방문진단 불가)\n1. 인정 서류 - 1년내 건강검진 서류\n2. 필수 포함항목 - 키,체중,혈압,소변검사(뇨당/뇨단백/뇨잠혈),간기능검사(GOT,GPT,GGT),B형간염보균검사,적혈구,백혈구,혈색소,콜레스테롤,혈당',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-30","kind":"answer"}'::jsonb, '2026-04-30 15:51:30+09'),

  (v_author_id::text, '메리츠', '메리츠', '메리츠', v_team_id, 'navigation', 'team_internal', false,
   '[메리츠] 61~65세 방진 또는 1년이내 건강검진',
   E'61~65세 방진 또는 1년이내 건강검진. 방진은 종료되어 다음달 가능합니다.',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-04-30","kind":"answer"}'::jsonb, '2026-04-30 15:52:00+09'),

  -- ═══════════════════════════════════════════
  -- 5/7 (목)
  -- ═══════════════════════════════════════════
  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '67세 여 뇌졸중 마비 입원중 암보험',
   E'안녕하세요? 67세 여성 6년전 뇌졸증으로 마비가와서 요양병원에서 계속 재활치료중이시라고하시는데요, 현재도 입원중이시구요, 혹시 암보험 가입 가능한 회사가 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-07","kind":"question"}'::jsonb, '2026-05-07 11:46:00+09'),

  (v_author_id::text, '흥국화재', '흥국화재', '흥국화재', v_team_id, 'navigation', 'team_internal', false,
   '[흥국화재] 입원중이면 모두암포함 전상품 불가',
   E'입원중이신거면 흥국화재 모두암포함 전상품 불가합니다..!',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-07","kind":"answer"}'::jsonb, '2026-05-07 11:51:00+09'),

  (v_author_id::text, '라이나손보', '라이나손보', '라이나손보', v_team_id, 'navigation', 'team_internal', false,
   '[라이나손보] 입원중이라 불가',
   E'라이나손보도 입원중이라 불가입니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-07","kind":"answer"}'::jsonb, '2026-05-07 11:56:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '치아보험 보철만 가능한곳',
   E'안녕하세요 치아보험 보철만 가능한곳 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-07","kind":"question"}'::jsonb, '2026-05-07 13:35:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '71세 여 335 뇌/허 1천 진단자금',
   E'71세여 335 뇌/허 1천 진단자금 들어가는데 있나요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-07","kind":"question"}'::jsonb, '2026-05-07 13:37:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '산재 9개월 입원수술력 3대진단',
   E'안녕하세요 산재로 2025.7월까지 (3개월씩 9개월동안 팔골절 골반골절로 입원수술력있습니다.) 305아닌 3대진단 가능한 회사 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-07","kind":"question"}'::jsonb, '2026-05-07 13:37:30+09'),

  (v_author_id::text, '라이나손보', '라이나손보', '라이나손보', v_team_id, 'navigation', 'team_internal', false,
   '[라이나손보] 보철 50만 가능 / 355 3대진단',
   E'라이나손보 보철 50만 가입 가능합니당 ~!\n라이나손보 355로 3대진단 가능합니당~!',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-07","kind":"answer"}'::jsonb, '2026-05-07 13:38:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '65세 여 간이식 공여자 표준체 실비',
   E'65세여성입니다 2년전 남편에게 간이식(공여자)해주고 5일입원했습니다. 표준체실비 가능한곳있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-07","kind":"question"}'::jsonb, '2026-05-07 13:44:00+09'),

  (v_author_id::text, '흥국화재', '흥국화재', '흥국화재', v_team_id, 'navigation', 'team_internal', false,
   '[흥국화재] 간이식 공여자 1천 가능',
   E'흥국화재도 가능해요 1천',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-07","kind":"answer"}'::jsonb, '2026-05-07 13:46:00+09'),

  (v_author_id::text, '메리츠', '메리츠', '메리츠', v_team_id, 'navigation', 'team_internal', false,
   '[메리츠] 간이식 치료종결 6개월경과 표준 인수',
   E'간이식 치료종결 6개월경과 표준 인수 가능합니다.',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-07","kind":"answer"}'::jsonb, '2026-05-07 13:46:30+09'),

  (v_author_id::text, '라이나생명', '라이나생명', '라이나생명', v_team_id, 'navigation', 'team_internal', false,
   '[라이나생명] 보철 130만 가능',
   E'라이나생명 보철 130만 가입 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-07","kind":"answer"}'::jsonb, '2026-05-07 13:50:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '70년생 남 허혈성장염 입원 종합보험',
   E'70년생 남자. 26년 2월 허혈성장염으로 2일 입원 외 병력 무. 종합보험 부담보없이 간편으로 가입가능한 보험사 확인 부탁드립니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-07","kind":"question"}'::jsonb, '2026-05-07 14:16:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '암진단비 어린이보험 추천',
   E'안녕하세요? 암진단비가 많이 들어가는 어린이 보험 추천 부탁드립니다^^',
   '상품', 'seed', '{"source":"kakao_navigation","date":"2026-05-07","kind":"question"}'::jsonb, '2026-05-07 14:22:00+09'),

  (v_author_id::text, 'DB손보', 'DB손보', 'DB손보', v_team_id, 'navigation', 'team_internal', false,
   '[DB손보] 30세이하 암진단 1억',
   E'30세이하 암진단 1억 가능합니다',
   '상품', 'seed', '{"source":"kakao_navigation","date":"2026-05-07","kind":"answer"}'::jsonb, '2026-05-07 14:32:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '71세 남 간편 2대진단 1000원',
   E'71세 남자 간편으로 2대진단자금 1,000원 들어가는 보험사 있을까요/',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-07","kind":"question"}'::jsonb, '2026-05-07 15:06:00+09'),

  (v_author_id::text, '한화생명', '한화생명', '한화생명', v_team_id, 'navigation', 'team_internal', false,
   '[한화생명] ~80세까지 3천만원 가능',
   E'한화생명 ~80세까지 3천만원 가능해요~',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-07","kind":"answer"}'::jsonb, '2026-05-07 15:07:00+09'),

  (v_author_id::text, '흥국화재', '흥국화재', '흥국화재', v_team_id, 'navigation', 'team_internal', false,
   '[흥국화재] 3.10.5간편 뇌심진단비 각 1천',
   E'3.10.5간편기준 뇌심진단비 각각 1천만원 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-07","kind":"answer"}'::jsonb, '2026-05-07 15:12:00+09'),

  (v_author_id::text, '흥국생명', '흥국생명', '흥국생명', v_team_id, 'navigation', 'team_internal', false,
   '[흥국생명] 80세까지 각 4천 가능',
   E'80세까지 각 4천 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-07","kind":"answer"}'::jsonb, '2026-05-07 15:20:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '74세 여 간편 정기/종신',
   E'안녕하세요. 74세 여자 간편 정기보험 또는 종신보험 가입할 수 있는 회사 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-07","kind":"question"}'::jsonb, '2026-05-07 16:50:00+09'),

  (v_author_id::text, '삼성생명', '삼성생명', '삼성생명', v_team_id, 'navigation', 'team_internal', false,
   '[삼성생명] 80세까지 종신보험 가능',
   E'80세까지 종신보험 가입 가능합니다.',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-07","kind":"answer"}'::jsonb, '2026-05-07 16:54:00+09'),

  (v_author_id::text, '라이나생명', '라이나생명', '라이나생명', v_team_id, 'navigation', 'team_internal', false,
   '[라이나생명] 종신 75세까지 가능',
   E'라이나 생명 종신보험 75세까지 가입가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-07","kind":"answer"}'::jsonb, '2026-05-07 16:54:30+09'),

  -- ═══════════════════════════════════════════
  -- 5/8 (금)
  -- ═══════════════════════════════════════════
  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '4.5톤 화물자가용 운전자 유병자실손 상해',
   E'4.5톤 화물자가용운전자 유병자실손 상해 들어가는 보험사 있을까요',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-08","kind":"question"}'::jsonb, '2026-05-08 11:06:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '재가보험 비교 2-3군데',
   E'재가보험 비교할수 있는 회사 2-3군데 추천요',
   '상품', 'seed', '{"source":"kakao_navigation","date":"2026-05-08","kind":"question"}'::jsonb, '2026-05-08 11:08:00+09'),

  (v_author_id::text, '라이나생명', '라이나생명', '라이나생명', v_team_id, 'navigation', 'team_internal', false,
   '[라이나생명] 재가급여 60세까지 70만 / 61세부터 50만',
   E'라이나 생명 재가급여 60세까지 월 70 만원 61세부터 월 50만원 입니다.\n복합재가는 없으며, 일반재가만 있으며 재가급여 이용시 해당금액 월 1회 지급됩니다',
   '상품', 'seed', '{"source":"kakao_navigation","date":"2026-05-08","kind":"answer"}'::jsonb, '2026-05-08 11:13:00+09'),

  (v_author_id::text, 'KDB생명', 'KDB생명', 'KDB생명', v_team_id, 'navigation', 'team_internal', false,
   '[KDB생명] 일반재가/복합재가 65세까지',
   E'KDB생명 일반재가, 복합재가 65세까지 가입가능하세요',
   '상품', 'seed', '{"source":"kakao_navigation","date":"2026-05-08","kind":"answer"}'::jsonb, '2026-05-08 11:22:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '62세 남 협심증 스텐트 2.5년 간병인',
   E'문의드립니다. 62세 남자 기준에서 협심증으로 스텐트수술한지 2년5개월 경과하신분 간병인사용 보험 가능한 보험사 있다면 답변부탁드립니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-08","kind":"question"}'::jsonb, '2026-05-08 11:25:00+09'),

  (v_author_id::text, '메리츠', '메리츠', '메리츠', v_team_id, 'navigation', 'team_internal', false,
   '[메리츠] 31간편 간병인지원일당',
   E'31간편으로 간병인지원일당으로 가능합니다.',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-08","kind":"answer"}'::jsonb, '2026-05-08 11:25:30+09'),

  (v_author_id::text, '흥국화재', '흥국화재', '흥국화재', v_team_id, 'navigation', 'team_internal', false,
   '[흥국화재] 325암만보는 상품 심사 가능',
   E'흥국화재는 325암만보는상품에서 심사가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-08","kind":"answer"}'::jsonb, '2026-05-08 11:35:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '73세 남 심장 스텐트/혈압당뇨 간병보험',
   E'73세 남자 / 3년전 심장 스텐드시술 / 혈압.당뇨약 복용중 / 간병보험 준비가능한곳 확인 부탁 드립니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-08","kind":"question"}'::jsonb, '2026-05-08 12:03:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '65세 남 임플란트 한도 큰 보험사',
   E'65세 남자 임플란트 한도 큰 보험사 어디인가요',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-08","kind":"question"}'::jsonb, '2026-05-08 12:09:00+09'),

  (v_author_id::text, '라이나손보', '라이나손보', '라이나손보', v_team_id, 'navigation', 'team_internal', false,
   '[라이나손보] 임플란트 한도 50 / 보험료 2만원대',
   E'라이나손보 한도 50인데 보험료 2만원대로 가입 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-08","kind":"answer"}'::jsonb, '2026-05-08 12:15:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '55세 자궁내막암 2.8년경과 장기요양',
   E'급 문의드립니다!! 2년10개월전에 자궁내막암 치료력있는 55세 고객. 장기요양 보장이 가입가능한 상품있나요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-08","kind":"question"}'::jsonb, '2026-05-08 12:20:00+09'),

  (v_author_id::text, '라이나생명', '라이나생명', '라이나생명', v_team_id, 'navigation', 'team_internal', false,
   '[라이나생명] 임플란트 한도 100만',
   E'라이나생명 한도 100만원 입니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-08","kind":"answer"}'::jsonb, '2026-05-08 12:24:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '62세 남 허혈성심장 시술 1박 암담보',
   E'62세 남자 무직 2025년 4월1일 허혈성심장질환시술 1박2일 입원. 암담보만 가입할수 있는 보험사 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-08","kind":"question"}'::jsonb, '2026-05-08 14:10:00+09'),

  (v_author_id::text, '흥국화재', '흥국화재', '흥국화재', v_team_id, 'navigation', 'team_internal', false,
   '[흥국화재] 모두담은암보험 흥굿암플러스',
   E'흥국화재 모두담은암보험 흥굿암플러스플랜 고지하고 진행이요!',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-08","kind":"answer"}'::jsonb, '2026-05-08 14:11:00+09'),

  (v_author_id::text, '메리츠', '메리츠', '메리츠', v_team_id, 'navigation', 'team_internal', false,
   '[메리츠] 간편또또암 305간편/31간편 가능',
   E'간편또또암(305간편), 31간편 가능합니다.',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-08","kind":"answer"}'::jsonb, '2026-05-08 14:12:00+09'),

  (v_author_id::text, '미래에셋', '미래에셋', '미래에셋', v_team_id, 'navigation', 'team_internal', false,
   '[미래에셋] 65세남 임플란트 100만 / M케어 암담보 표준체',
   E'65세남성 임플란트 100만원 가능합니다.\nM케어건강 _ 암담보 표준체로 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-08","kind":"answer"}'::jsonb, '2026-05-08 14:12:30+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '33세 남 진성적혈구증가증 추적관찰 3대진단',
   E'33세 남자. 고지혈증약복용 / 3년전 진성적혈구증가증으로 추적관찰중(골수검사차1일입원)\n3대진단비+수술비 간편플랜인수가능한곳 부탁드립니다.',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-08","kind":"question"}'::jsonb, '2026-05-08 15:39:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '60세 남 치매 진단비+레켐비+장기요양',
   E'600710생 남자 치매보험 진단비+레켐비 치료비+장기요양시설치료비 보장해주는 보험사 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-08","kind":"question"}'::jsonb, '2026-05-08 15:40:00+09'),

  (v_author_id::text, 'DB손보', 'DB손보', 'DB손보', v_team_id, 'navigation', 'team_internal', false,
   '[DB손보] 추적관찰 질문서 해당 여부 확인 / 초경증385',
   E'추적관찰 질문서해당 여부확인 플랜 가능합니다.\n초경증385에 해당 담보탑재',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-08","kind":"answer"}'::jsonb, '2026-05-08 15:42:00+09'),

  (v_author_id::text, '메리츠', '메리츠', '메리츠', v_team_id, 'navigation', 'team_internal', false,
   '[메리츠] 안심되는 치매통합케어보험',
   E'안심되는치매통합케어보험으로 해보세요',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-08","kind":"answer"}'::jsonb, '2026-05-08 15:44:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '71세 간병인 15만원 보장',
   E'71세 간병인 15만원 보장되는곳 추천해주세요',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-08","kind":"question"}'::jsonb, '2026-05-08 15:46:00+09'),

  (v_author_id::text, '흥국생명', '흥국생명', '흥국생명', v_team_id, 'navigation', 'team_internal', false,
   '[흥국생명] 치매담은시니어 / 80세까지 요양제외 15만',
   E'치매담은시니어 상품에서 보장 가능합니다.\n80세까지 요양병원 제외 15만원 보장 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-08","kind":"answer"}'::jsonb, '2026-05-08 15:47:00+09'),

  (v_author_id::text, '롯데손보', '롯데손보', '롯데손보', v_team_id, 'navigation', 'team_internal', false,
   '[롯데손보] 15만+종합병원 5만 합산 가능',
   E'롯데손보 15만원 +종합병원 5만원 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-08","kind":"answer"}'::jsonb, '2026-05-08 15:49:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '38세 남 간폐신 말기 진단비 간편',
   E'880516-1 남자 38세 간폐신장 말기 진단비 간편으로 가입 가능한곳 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-08","kind":"question"}'::jsonb, '2026-05-08 15:48:00+09'),

  (v_author_id::text, '메리츠', '메리츠', '메리츠', v_team_id, 'navigation', 'team_internal', false,
   '[메리츠] 33세 남 검사차 입원 예외 미해당 / 355간편 / 325간편',
   E'감사차 입원 예외질환 미해당으로 수술만 355간편으로 가능. 325간편으로도 가능합니다.',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-08","kind":"answer"}'::jsonb, '2026-05-08 16:06:00+09'),

  (v_author_id::text, 'DB손보', 'DB손보', 'DB손보', v_team_id, 'navigation', 'team_internal', false,
   '[DB손보] 33세 남 325간편',
   E'325간편입니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-08","kind":"answer"}'::jsonb, '2026-05-08 16:10:00+09'),

  (v_author_id::text, '현대해상', '현대해상', '현대해상', v_team_id, 'navigation', 'team_internal', false,
   '[현대해상] 내삶엔 3255플랜',
   E'현대해상 : 내삶엔 3255플랜 입니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-08","kind":"answer"}'::jsonb, '2026-05-08 16:13:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '생보사 일시납 저축성 강한 상품',
   E'생보사중 일시납으로 저축성 보험성격이 강한 상품이 있으면 안내바랍니다',
   '상품', 'seed', '{"source":"kakao_navigation","date":"2026-05-08","kind":"question"}'::jsonb, '2026-05-08 16:17:00+09'),

  -- ═══════════════════════════════════════════
  -- 5/11 (월)
  -- ═══════════════════════════════════════════
  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '66세 남 대상포진 진단비 한도',
   E'안녕하세요. 66년12월10일생 남성. 대상포진 진단비 한도 높은곳 확인 부탁드립니다 :)',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"question"}'::jsonb, '2026-05-11 10:12:00+09'),

  (v_author_id::text, '현대해상', '현대해상', '현대해상', v_team_id, 'navigation', 'team_internal', false,
   '[현대해상] 대상포진진단비 200만원',
   E'대상포진진단비 2백까지 들어갑니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"answer"}'::jsonb, '2026-05-11 10:16:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '수술비만 단독가입 가능한 회사 (DB 제외)',
   E'수술비만 단독가입 가능한 회사 있나요? 디비손보 빼구요',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"question"}'::jsonb, '2026-05-11 10:16:30+09'),

  (v_author_id::text, '흥국화재', '흥국화재', '흥국화재', v_team_id, 'navigation', 'team_internal', false,
   '[흥국화재] 대상포진 100만원',
   E'대상포진진단비 1백만원까지 가능합니다~',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"answer"}'::jsonb, '2026-05-11 10:17:00+09'),

  (v_author_id::text, '라이나생명', '라이나생명', '라이나생명', v_team_id, 'navigation', 'team_internal', false,
   '[라이나생명] 대상포진 100만원',
   E'대상포진 진단비 1백만원까지 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"answer"}'::jsonb, '2026-05-11 10:17:30+09'),

  (v_author_id::text, '삼성생명', '삼성생명', '삼성생명', v_team_id, 'navigation', 'team_internal', false,
   '[삼성생명] 대상포진 200만',
   E'대상포진 2백까지 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"answer"}'::jsonb, '2026-05-11 10:23:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '3개월내 늑골골절 유병자 실비',
   E'3개월이내 늑골 골절(입원/수술무) 유병자 실비 인수가능한 곳 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"question"}'::jsonb, '2026-05-11 10:33:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '탈모보험 포함 상품',
   E'안녕하세요. 혹시 판매되는 상품중에 탈모보험도 포함되는 상품있을까요?',
   '상품', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"question"}'::jsonb, '2026-05-11 10:38:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '61세 남 사무직 실신 검사 간병보험',
   E'안녕하세요 문의드립니다. 61세남자 사무직. 올해 3월22일 실신으로 병원가서 검사받음. 검사결과 이상 무. 본인은 입원 안했다고함. 그외 병력 약복용 없음. 간병보험 가능한곳 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"question"}'::jsonb, '2026-05-11 10:49:00+09'),

  (v_author_id::text, '흥국화재', '흥국화재', '흥국화재', v_team_id, 'navigation', 'team_internal', false,
   '[흥국화재] 실신 입원무 3개월 / 입원시 6개월 예외질환',
   E'실신으로 입원아니신거면 3개월지나고 진행이시고\n입원해서 검사면 6개월 지나셔야 예외질환입니다.(6개월경과/3일이내 입원만)',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"answer"}'::jsonb, '2026-05-11 10:57:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '1987년 준공 아파트 누수 화재보험',
   E'혹시 1987년 준공된 아파트 누수, 화재보험 가입가능한 보험사 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"question"}'::jsonb, '2026-05-11 11:08:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '33세 여 뇌혈관 24년 7월 퇴원 315',
   E'여성 33세 뇌혈관진단 24년 7월29일 퇴원. 315로 허혈성심장진단비나 뇌혈관 진단비 들어가는 회사 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"question"}'::jsonb, '2026-05-11 11:21:00+09'),

  (v_author_id::text, '라이나손보', '라이나손보', '라이나손보', v_team_id, 'navigation', 'team_internal', false,
   '[라이나손보] 2년이내 입원수술 없으면 325 / 한도 인상',
   E'2년이내 입원수술 없으면 라이나손보 325로 가능합니다. 이번달 325 가입한도 올랐으니 참고해주세요',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"answer"}'::jsonb, '2026-05-11 11:30:00+09'),

  (v_author_id::text, '현대해상', '현대해상', '현대해상', v_team_id, 'navigation', 'team_internal', false,
   '[현대해상] 315상품 가능',
   E'현대해상 315상품 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"answer"}'::jsonb, '2026-05-11 11:34:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '70년생 무직 뇌경색 7일 암보장',
   E'안녕하세요. 암보장 가능한 보험사 있을까요?\n70427-1 무직.\n2025.6.11. 뇌경색 7일입원\n1달전부터 고지혈증약 복용중\n2024.5. 대장용종 3개 제거\n2026.5.4. 폐결핵으로 인한 x-ray 정기검사 이상무\n1년전에 수면제처방받아 복용중.\n2025년 6월부터 아스피린\n2025.6 재활치료 1주 3번 3월말까지\n8월부터 언어치료',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"question"}'::jsonb, '2026-05-11 11:41:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '이륜차보험 가입가능한 곳',
   E'이륜차보험 가입가능한곳이 어디일까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"question"}'::jsonb, '2026-05-11 11:46:00+09'),

  (v_author_id::text, '라이나손보', '라이나손보', '라이나손보', v_team_id, 'navigation', 'team_internal', false,
   '[라이나손보] 355로 암보험 가능',
   E'라이나손보 355로 암보험 가입 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"answer"}'::jsonb, '2026-05-11 12:22:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '66세 여 간편치매 / 당뇨 검사만',
   E'66세 여성 치매보험 알아보고 있습니다. 입원수술력 없고 혈압없고 당뇨도 3년전 검사만 받았고 약복용안합니다. 간편치매보험 가능한곳있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"question"}'::jsonb, '2026-05-11 13:02:00+09'),

  (v_author_id::text, '라이나생명', '라이나생명', '라이나생명', v_team_id, 'navigation', 'team_internal', false,
   '[라이나생명] 치매진단비 뇌관련만',
   E'라이나생명 치매진단비 뇌관련만 보고있습니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"answer"}'::jsonb, '2026-05-11 13:05:00+09'),

  (v_author_id::text, '흥국화재', '흥국화재', '흥국화재', v_team_id, 'navigation', 'team_internal', false,
   '[흥국화재] 123치매 간편심사형',
   E'흥국화재 123치매 간편심사형 진행가능합니다.',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"answer"}'::jsonb, '2026-05-11 13:08:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '58세 남 협심증 23.12월 진단 뇌심',
   E'23.12월 협심증진단 58세 남성. 뇌, 심장쪽 보장가능한 보험사있나요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"question"}'::jsonb, '2026-05-11 13:32:00+09'),

  (v_author_id::text, '흥국화재', '흥국화재', '흥국화재', v_team_id, 'navigation', 'team_internal', false,
   '[흥국화재] 325암만보는 종합 (뇌심 포함)',
   E'흥국화재 325암만보는상품으로 심사 진행가능해요\n상품이름이 암만보는이지 종합상품이에요',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"answer"}'::jsonb, '2026-05-11 13:33:00+09'),

  (v_author_id::text, '현대해상', '현대해상', '현대해상', v_team_id, 'navigation', 'team_internal', false,
   '[현대해상] 333 (12월부터 가능)',
   E'현대해상 333. 12월되면 가능하겠네요',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"answer"}'::jsonb, '2026-05-11 13:36:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '69년생 여 인슐린 15년 암보험',
   E'69년생 여 인슐린주사 15년 암보험 가입가능한데 있나요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"question"}'::jsonb, '2026-05-11 13:41:00+09'),

  (v_author_id::text, '라이나손보', '라이나손보', '라이나손보', v_team_id, 'navigation', 'team_internal', false,
   '[라이나손보] 325 뇌심',
   E'라이나손보 325로 뇌심가입 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"answer"}'::jsonb, '2026-05-11 13:56:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '46세 여 갑상선암/담석/대장용종 비갱신 3대진단',
   E'46세여성, 2023-04 갑상선암수술, 2024-11 담석증4일입원, 2024-12 담석증수술4일입원, 2024-06 대장용종수술. 비갱신 3대진단비 가능한곳 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"question"}'::jsonb, '2026-05-11 15:02:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '16년전 직장암 완치 건강체실비',
   E'16년전에 직장암진단 완치 건강체실비 가능 할까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"question"}'::jsonb, '2026-05-11 15:10:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '94년생 무병력 대장용종 N대수술비',
   E'94년생 병력 무. 대장용종 수술시 N대수술비에서 보상되는 보험사 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"question"}'::jsonb, '2026-05-11 15:17:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '58세 남 3급 경비 대장용종 4회/위폴립 1회',
   E'남자 58세 3급 경비원. 고고당 등 약복용 전혀 없음.\n대장용종 20,21,24,26.04월 2020년~현재까지 총 4회 제거술 시행.\n위 폴립 22년 1회 제거술 시행\n1) 대장,위 용종 안 보고 뇌,심 가입 가능한 회사\n2) 암도 3.5.5~3.10.5 조건으로 인수해주는 회사 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"question"}'::jsonb, '2026-05-11 16:09:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '79세 간병인 10만원 들어가는 보험사',
   E'안녕하세요!!! 매니저님들. 79세 간병인 10만원 들어가는 보험사가 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"question"}'::jsonb, '2026-05-11 16:19:00+09'),

  (v_author_id::text, '현대해상', '현대해상', '현대해상', v_team_id, 'navigation', 'team_internal', false,
   '[현대해상] 71~80세 요양제외 10+상급10=합산20',
   E'71세~80세 요양병원및의원제외 10만 + 상급종합 10만 = 합산20만 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"answer"}'::jsonb, '2026-05-11 16:20:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '1년전 수면무호흡 검사 1일입원 간편 암보험',
   E'1년전 수면무호흡증으로 검사차 하루입원. 암보험 가능한 부탁드립니다 간편보험으로요',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"question"}'::jsonb, '2026-05-11 17:24:00+09'),

  (v_author_id::text, '삼성생명', '삼성생명', '삼성생명', v_team_id, 'navigation', 'team_internal', false,
   '[삼성생명] 수술담보 제외시 간편 3.10.5',
   E'수술담보 제외시 간편3.10.5까지 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"answer"}'::jsonb, '2026-05-11 17:26:00+09'),

  (v_author_id::text, '라이나손보', '라이나손보', '라이나손보', v_team_id, 'navigation', 'team_internal', false,
   '[라이나손보] 355 인수 가능',
   E'라이나손보 355로 인수 가능합니다~!',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"answer"}'::jsonb, '2026-05-11 17:30:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '78세 여 난소낭종/조기난소부전 호르몬 종합',
   E'25년9월 난소낭종제거 3일입원. 조기난소부전으로 호르몬제복용 78년 여성. 종합보험 초경증가입가능한 보험사와 플랜있을까요?\n우선은 암/암치료비 / 2대 진단 순환계치료비 / 간병비까지 20만원 이하 확인중입니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-11","kind":"question"}'::jsonb, '2026-05-11 18:23:00+09'),

  -- ═══════════════════════════════════════════
  -- 5/12 (화)
  -- ═══════════════════════════════════════════
  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '31세 여 무병력 교통사고 단순염좌 입원 3대',
   E'31세 여자. 다른 병력 전혀 없고 3년전 교통사고 단순염좌로 일주일 입원력 있습니다. 3대만 5.10 가능한 보험사 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"question"}'::jsonb, '2026-05-12 10:39:00+09'),

  (v_author_id::text, 'DB손보', 'DB손보', 'DB손보', v_team_id, 'navigation', 'team_internal', false,
   '[DB손보] 건강청춘 9년고지 가능',
   E'건강청춘 9년고지 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"answer"}'::jsonb, '2026-05-12 10:42:00+09'),

  (v_author_id::text, '메리츠', '메리츠', '메리츠', v_team_id, 'navigation', 'team_internal', false,
   '[메리츠] 오텐오로 가능',
   E'오텐오로 가능합니다.',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"answer"}'::jsonb, '2026-05-12 10:42:30+09'),

  (v_author_id::text, '흥국화재', '흥국화재', '흥국화재', v_team_id, 'navigation', 'team_internal', false,
   '[흥국화재] 0545 건강 (어른이 5.10.10) 10년고지',
   E'0545 건강보험(어른이 5.10.10) 10년고지형 심사가능합니다.',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"answer"}'::jsonb, '2026-05-12 10:43:00+09'),

  (v_author_id::text, '삼성화재', '삼성화재', '삼성화재', v_team_id, 'navigation', 'team_internal', false,
   '[삼성화재] 표준체 10년고지 심사 가능',
   E'표준체 10년고지 심사 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"answer"}'::jsonb, '2026-05-12 10:45:00+09'),

  (v_author_id::text, '미래에셋', '미래에셋', '미래에셋', v_team_id, 'navigation', 'team_internal', false,
   '[미래에셋] 3대진단비 표준체 가능',
   E'3대진단비 표준체로 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"answer"}'::jsonb, '2026-05-12 10:47:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '78년 주부 자궁폴립/대장용종 2대+순환계+종수술',
   E'안녕하세요~ 좋은 아침입니다. 2대질환진단비, 순환계치료비, 종수술비 가입을 원합니다. 가능한 보험사 있을까요?\n780729-2 주부. 관절염, 빈혈약복용중.\n25.5.15. 자궁폴립 n840 1일입원. 수술\n2024.9.5. 자궁폴립 n840 1일입원. 수술\n2020.12.2. k635 대장용종 1일통원',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"question"}'::jsonb, '2026-05-12 11:07:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '헬스장 업장 화재보험',
   E'안녕하셔요~ 헬스장 업장 화재보험 가입가능 보험사 있을까요',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"question"}'::jsonb, '2026-05-12 11:08:00+09'),

  (v_author_id::text, '삼성생명', '삼성생명', '삼성생명', v_team_id, 'navigation', 'team_internal', false,
   '[삼성생명] 위 상병 간편 3.10.5 심사 가능',
   E'위 상병대로라면 간편3.10.5 심사가능합니다.',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"answer"}'::jsonb, '2026-05-12 11:26:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '61세 남 자전거 발목골절 핀삽입 2달 간병보험',
   E'61세남. 26.01.12 자전거타다가 사고로 왼쪽발목 골절. 핀삽입수술하고 2달정도 입원. 간병보험 혹시 가능한데 있나요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"question"}'::jsonb, '2026-05-12 11:41:00+09'),

  (v_author_id::text, '흥국생명', '흥국생명', '흥국생명', v_team_id, 'navigation', 'team_internal', false,
   '[흥국생명] 3.10.5(고당플러스) 2대/순환계 가능',
   E'3.10.5 (3.10.5.5 고당플러스). 2대, 순환계는 가입 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"answer"}'::jsonb, '2026-05-12 11:44:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '68세 여 무릎 주사치료 어제 마지막 미완치 간편',
   E'68세여성분 뇌심만 가입할건데요~~ 최근에 무릎염증으로 10회정도 주사치료받았다고하고 마지막치료가 어제라고 하십니다. 미완치로 고지했을때 간편보험 가입가능한곳있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"question"}'::jsonb, '2026-05-12 13:27:00+09'),

  (v_author_id::text, '한화생명', '한화생명', '한화생명', v_team_id, 'navigation', 'team_internal', false,
   '[한화생명] 최초 진단 3개월 / 기왕력 가능',
   E'최초 진단 3개월 지나셨거나 기왕력이시면 한화생명 가능하십니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"answer"}'::jsonb, '2026-05-12 13:28:00+09'),

  (v_author_id::text, '라이나생명', '라이나생명', '라이나생명', v_team_id, 'navigation', 'team_internal', false,
   '[라이나생명] 최초 진단만 3개월 지났으면 가능',
   E'최초 진단만 3개월 지났으면 라이나생명 가입 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"answer"}'::jsonb, '2026-05-12 13:28:30+09'),

  (v_author_id::text, '라이나손보', '라이나손보', '라이나손보', v_team_id, 'navigation', 'team_internal', false,
   '[라이나손보] 즉시인수 가능',
   E'라이나손보 즉시인수 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"answer"}'::jsonb, '2026-05-12 13:33:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '암치료비 선지급 보험사',
   E'안녕하세요? 암치료비 선지급되는 보험사 안내부탁드려요',
   '상품', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"question"}'::jsonb, '2026-05-12 14:31:00+09'),

  (v_author_id::text, '라이나손보', '라이나손보', '라이나손보', v_team_id, 'navigation', 'team_internal', false,
   '[라이나손보] 70% 최대 700만 선지급',
   E'라이나손보 70% 최대 700만원 선지급됩니다',
   '상품', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"answer"}'::jsonb, '2026-05-12 14:31:30+09'),

  (v_author_id::text, '삼성화재', '삼성화재', '삼성화재', v_team_id, 'navigation', 'team_internal', false,
   '[삼성화재] 행위별 50% / 500만 한도',
   E'치료 행위별 보험금의 50% / 치료 행위별 500만원 한도 입니다',
   '상품', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"answer"}'::jsonb, '2026-05-12 14:34:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '33세 남 공황장애 1달처방 암보험',
   E'33세 남. 공황장애 1달에 1번 처방 복용중 (3년전부터 복용중), 암보험 가능한 보험사 알려주세요',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"question"}'::jsonb, '2026-05-12 14:36:00+09'),

  (v_author_id::text, '삼성화재', '삼성화재', '삼성화재', v_team_id, 'navigation', 'team_internal', false,
   '[삼성화재] 입원/수술 없으면 365 고당지뇌심 심사',
   E'입원.수술 없다면 365 고당지뇌심으로 심사 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"answer"}'::jsonb, '2026-05-12 14:37:00+09'),

  (v_author_id::text, '현대해상', '현대해상', '현대해상', v_team_id, 'navigation', 'team_internal', false,
   '[현대해상] 간편상품 가능',
   E'현대 간편상품 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"answer"}'::jsonb, '2026-05-12 14:38:00+09'),

  (v_author_id::text, '메리츠', '메리츠', '메리츠', v_team_id, 'navigation', 'team_internal', false,
   '[메리츠] 3개월내 추가소견/약변동 없으면 간편 가능',
   E'3개월이내 추가소견없고 약변동 없다면 간편보험으로 가능합니다.',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"answer"}'::jsonb, '2026-05-12 14:38:30+09'),

  (v_author_id::text, '흥국생명', '흥국생명', '흥국생명', v_team_id, 'navigation', 'team_internal', false,
   '[흥국생명] 공황장애 3개월 경과+입원무 / 3.10.5 가능',
   E'공황장애 3개월 경과 및 입원 없을 경우 고지 미해당. 3.10.5로 가입 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"answer"}'::jsonb, '2026-05-12 14:39:00+09'),

  (v_author_id::text, '라이나생명', '라이나생명', '라이나생명', v_team_id, 'navigation', 'team_internal', false,
   '[라이나생명] 간편상품 가능',
   E'라이나 생명 간편상품 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"answer"}'::jsonb, '2026-05-12 14:39:30+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '암보험 매월 생활비 받는 상품',
   E'안녕하세요? 암보험 매월생활비로 받을수있는 보험상품 추천부탁드려요',
   '상품', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"question"}'::jsonb, '2026-05-12 14:47:00+09'),

  (v_author_id::text, '라이나손보', '라이나손보', '라이나손보', v_team_id, 'navigation', 'team_internal', false,
   '[라이나손보] 355 가능',
   E'라이나손보 355 가능합니다',
   '상품', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"answer"}'::jsonb, '2026-05-12 14:48:00+09'),

  (v_author_id::text, '현대해상', '현대해상', '현대해상', v_team_id, 'navigation', 'team_internal', false,
   '[현대해상] 70% 선지급 / 지급사유별 500만',
   E'현대해상 70% 선지급 됩니다. 지급사유별 5백만원 한도입니다',
   '상품', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"answer"}'::jsonb, '2026-05-12 14:54:00+09'),

  (v_author_id::text, '삼성생명', '삼성생명', '삼성생명', v_team_id, 'navigation', 'team_internal', false,
   '[삼성생명] 공황장애 간편 3.10.5 / 암통/비통 선지급',
   E'공황장애 최근 3개월 진단아니고 입원 수술없을 경우 간편3.10.5 가능합니다.\n암통합치료비 / 비급여통합치료비 선지급 가능합니다.',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"answer"}'::jsonb, '2026-05-12 14:54:30+09'),

  (v_author_id::text, '메리츠', '메리츠', '메리츠', v_team_id, 'navigation', 'team_internal', false,
   '[메리츠] 예약만 해도 암통치/비통치 50% 선지급',
   E'예약만 하셔도 암통치, 비통치 50%선지급 가능합니다.',
   '상품', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"answer"}'::jsonb, '2026-05-12 14:55:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '3년전 i66.3 대뇌동맥폐쇄협착 진단비/순환계',
   E'3년전 i66.3 대뇌동맥의폐쇄협착 진단받은분인데 새로가입시 진단비 및 순환계 치료비보장 가능한 회사 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"question"}'::jsonb, '2026-05-12 15:03:00+09'),

  (v_author_id::text, '삼성화재', '삼성화재', '삼성화재', v_team_id, 'navigation', 'team_internal', false,
   '[삼성화재] 고지없는 335 또는 325',
   E'고지없는 335 또는 325 로 진행하셔야 합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"answer"}'::jsonb, '2026-05-12 15:05:00+09'),

  (v_author_id::text, '라이나손보', '라이나손보', '라이나손보', v_team_id, 'navigation', 'team_internal', false,
   '[라이나손보] 325로 암뇌심 다 가입',
   E'라이나손보 325로 암뇌심 다 가입 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"answer"}'::jsonb, '2026-05-12 15:09:00+09'),

  (v_author_id::text, 'DB손보', 'DB손보', 'DB손보', v_team_id, 'navigation', 'team_internal', false,
   '[DB손보] 진단비 가입후 진단 보상 / 순환계 치료목적시',
   E'진단비 - 가입 후 진단 보상\n순환계치료비 - 치료목적시 보상 입니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"answer"}'::jsonb, '2026-05-12 15:09:30+09'),

  (v_author_id::text, '메리츠', '메리츠', '메리츠', v_team_id, 'navigation', 'team_internal', false,
   '[메리츠] 뇌심장플랜 인수 / 순통치-기왕력 보장',
   E'뇌심장플랜에서 인수가능하고 순통치-기왕력 보장 가능합니다.',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"answer"}'::jsonb, '2026-05-12 15:11:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '45세 남 천골골절 14일 고혈압 추가할인 질병수술',
   E'45세남 25년 10월 천골골절 14일입원 고혈압약 초경증 당뇨/지혈 추가할인형 질병수술비 간병비가입되는 보험사 및 플랜확인부탁드립니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"question"}'::jsonb, '2026-05-12 16:20:00+09'),

  (v_author_id::text, '메리츠', '메리츠', '메리츠', v_team_id, 'navigation', 'team_internal', false,
   '[메리츠] 3.10.5간편 가능',
   E'3 10 5간편으로 가능합니다.',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"answer"}'::jsonb, '2026-05-12 16:23:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '34세 남 암/순환계+상해통합+해지환급/만기환급',
   E'34세 남자. 암, 순환계치료비와 상해통합치료보장 + 해지환급금 및 만기환급가능한곳 있을까요??',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"question"}'::jsonb, '2026-05-12 16:24:00+09'),

  (v_author_id::text, '삼성생명', '삼성생명', '삼성생명', v_team_id, 'navigation', 'team_internal', false,
   '[삼성생명] 플러스원상품 설계 가능',
   E'암, 순환계치료비 → 플러스원상품으로 설계가능합니다.',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"answer"}'::jsonb, '2026-05-12 16:28:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '64세 여 10년 무사고 고지혈 1인실 40만 이상',
   E'64세 여성 10년 무사고 고지혈약복용. 상급종합 1인실입원비 40만원 이상인 보험사 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-12","kind":"question"}'::jsonb, '2026-05-12 16:58:00+09'),

  -- ═══════════════════════════════════════════
  -- 5/13 (수)
  -- ═══════════════════════════════════════════
  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '질휴3% 타사한도 안보는 생명보험사',
   E'안녕하세요. 질휴3% 타사한도 안보는 생명보험사 있나요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-13","kind":"question"}'::jsonb, '2026-05-13 10:40:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '75년 여 유방암 호르몬 복용/대장용종 암보험',
   E'750118 여성. 25-02 유방암수술-호르몬제복용중, 25-09 대장용종수술. 암보험 가능한곳 있나요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-13","kind":"question"}'::jsonb, '2026-05-13 15:02:00+09'),

  (v_author_id::text, 'KB손보', 'KB손보', 'KB손보', v_team_id, 'navigation', 'team_internal', false,
   '[KB손보] 심플311 가능, 유방암 전이재발 미보장 / 호르몬치료중 잔여암 미보장',
   E'KB손보 심플311 가입되는데 유방암 전이재발은 보장안됩니다. 단 암병변 완전제거시만 가능합니다. 호르몬 치료중이시기 때문에 추후 유방암으로 인한 전이재발잔여암 보장안됩니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-13","kind":"answer"}'::jsonb, '2026-05-13 15:08:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '53년 남 죽상경화증 수술/폐암 입원 간병인',
   E'530523일생 남자. 2023년 5월 죽상경화증으로 수술 입원 / 2021년 11월 폐암으로 입원. 간병인 가입 가능한곳 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-13","kind":"question"}'::jsonb, '2026-05-13 16:15:00+09'),

  (v_author_id::text, '현대해상', '현대해상', '현대해상', v_team_id, 'navigation', 'team_internal', false,
   '[현대해상] 죽상경화증 입원수술 3년경과시 3333플랜',
   E'죽상경화증 입원, 수술이 3년경과시면 3333플랜으로 간병인 담보 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-13","kind":"answer"}'::jsonb, '2026-05-13 16:18:00+09'),

  (v_author_id::text, '메리츠', '메리츠', '메리츠', v_team_id, 'navigation', 'team_internal', false,
   '[메리츠] 31간편 / 간병인지원 가능',
   E'31간편으로 가능하고 간병인지원으로 가능합니다.',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-13","kind":"answer"}'::jsonb, '2026-05-13 16:20:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '57년 남 1급 고혈압 교통사고/한쪽 절단 암 유병',
   E'570412 남자 직업1급 고혈압약복용. 2년전 교통사고 척추염좌 4일입원 / 26.1월 외상(낙상) 왼쪽 정강이 찢어져 꼬맴 18일입원. 암 보장만 희망합니다. 유병력자 상품중 가능한 보험사 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-13","kind":"question"}'::jsonb, '2026-05-13 17:12:00+09'),

  (v_author_id::text, '미래에셋', '미래에셋', '미래에셋', v_team_id, 'navigation', 'team_internal', false,
   '[미래에셋] 암담보만 표준체검토',
   E'암담보만 표준체검토 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-13","kind":"answer"}'::jsonb, '2026-05-13 17:15:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '67세 여 대동맥박리 수술 12일 / 허리디스크 입원 암보험',
   E'67세 여자. 대동맥박리 2024 12.26 수술 12일 입원. 허리디스크 입원 3/11~22퇴원, 4/24~5/4 퇴원. 암보험 가입할수 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-13","kind":"question"}'::jsonb, '2026-05-13 18:27:00+09'),

  (v_author_id::text, '라이나손보', '라이나손보', '라이나손보', v_team_id, 'navigation', 'team_internal', false,
   '[라이나손보] 355 암담보 가능',
   E'라이나손보 355로 암담보 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-13","kind":"answer"}'::jsonb, '2026-05-13 19:18:00+09'),

  -- ═══════════════════════════════════════════
  -- 5/14 (목)
  -- ═══════════════════════════════════════════
  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '24.5월 협심증 시술 / 암주치 생명보험사',
   E'안녕하세요. 24.5월 협심증 시술 했는데요. 암주치 생명보험사 가입할 수 있는 회사 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-14","kind":"question"}'::jsonb, '2026-05-14 11:24:00+09'),

  (v_author_id::text, '메리츠', '메리츠', '메리츠', v_team_id, 'navigation', 'team_internal', false,
   '[메리츠] 60세이하 또또암-간편고질플랜 / 61세이상 간편 또또암 305간편',
   E'60세이하라면 또또암-간편고질플랜으로(표준체)\n61세이상이라면 간편또또암 2년 지났다면 325간편으로, 안 지났으면 305간편으로 가능해요',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-14","kind":"answer"}'::jsonb, '2026-05-14 11:25:00+09'),

  (v_author_id::text, '라이나손보', '라이나손보', '라이나손보', v_team_id, 'navigation', 'team_internal', false,
   '[라이나손보] 355 가능',
   E'라이나손보 355로 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-14","kind":"answer"}'::jsonb, '2026-05-14 11:29:00+09'),

  (v_author_id::text, '미래에셋', '미래에셋', '미래에셋', v_team_id, 'navigation', 'team_internal', false,
   '[미래에셋] 암담보 표준체 가능',
   E'암담보 표준체로 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-14","kind":"answer"}'::jsonb, '2026-05-14 11:31:00+09'),

  (v_author_id::text, '라이나생명', '라이나생명', '라이나생명', v_team_id, 'navigation', 'team_internal', false,
   '[라이나생명] 355, 325 간편',
   E'라이나생명 355, 325 간편으로 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-14","kind":"answer"}'::jsonb, '2026-05-14 11:39:00+09'),

  (v_author_id::text, 'KDB생명', 'KDB생명', 'KDB생명', v_team_id, 'navigation', 'team_internal', false,
   '[KDB생명] 암담보 일반형 가능',
   E'KDB생명 암담보 일반형으로 가입가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-14","kind":"answer"}'::jsonb, '2026-05-14 11:41:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '자궁근종/난소 1쪽 제거 5일이내 간편',
   E'매니저님 안녕하세요. 자궁근종 제거하시면서 난소 1쪽 제거 수술, 입원 5일이내 이신분. 혹 간편 어떤 상품으로 들어가면 되나요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-14","kind":"question"}'::jsonb, '2026-05-14 13:51:00+09'),

  (v_author_id::text, '삼성화재', '삼성화재', '삼성화재', v_team_id, 'navigation', 'team_internal', false,
   '[삼성화재] 자궁근종 치료종결 표준체 심사',
   E'자궁근종 수술 치료종결시 표준체 심사 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-14","kind":"answer"}'::jsonb, '2026-05-14 13:53:00+09'),

  (v_author_id::text, '메리츠', '메리츠', '메리츠', v_team_id, 'navigation', 'team_internal', false,
   '[메리츠] 자궁근종/난소 양성종양 완전제거 간편 가능',
   E'자궁근종, 난소양성종양 완전제거라면 간편에서 가능해요',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-14","kind":"answer"}'::jsonb, '2026-05-14 13:57:00+09'),

  (v_author_id::text, '현대해상', '현대해상', '현대해상', v_team_id, 'navigation', 'team_internal', false,
   '[현대해상] 간편 3.10.10부터 가능',
   E'현대해상 : 간편 3.10.10 부터 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-14","kind":"answer"}'::jsonb, '2026-05-14 13:58:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '뇌병변약만 복용 암보험 가능',
   E'안녕하세요. 입원수술없습니다. 뇌병변약만 복용중인데 암보험 가입가능한가요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-14","kind":"question"}'::jsonb, '2026-05-14 15:22:00+09'),

  (v_author_id::text, '라이나생명', '라이나생명', '라이나생명', v_team_id, 'navigation', 'team_internal', false,
   '[라이나생명] 가능',
   E'라이나생명 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-14","kind":"answer"}'::jsonb, '2026-05-14 15:26:00+09'),

  (v_author_id::text, '메리츠', '메리츠', '메리츠', v_team_id, 'navigation', 'team_internal', false,
   '[메리츠] 60세이하 또또암 간편고지플랜',
   E'60세이하라면 또또암 간편고지플랜으로 해보세요',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-14","kind":"answer"}'::jsonb, '2026-05-14 15:28:00+09'),

  -- ═══════════════════════════════════════════
  -- 5/15 (금)
  -- ═══════════════════════════════════════════
  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '한화손보 제외 요양병원 365일 가능',
   E'안녕하세요^^. 한화손보 제외 요양병원 365일 가능한 보험사가 있나요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-15","kind":"question"}'::jsonb, '2026-05-15 10:11:00+09'),

  (v_author_id::text, '메리츠', '메리츠', '메리츠', v_team_id, 'navigation', 'team_internal', false,
   '[메리츠] 180일+간병인지원요양성특정질병 / 365일 보장',
   E'180일 + 간병인지원요양성특정질병(181일이상) 가입시 365일 보장 가능합니다.',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-15","kind":"answer"}'::jsonb, '2026-05-15 10:14:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '간편 대장용종 제거 예외질환 최대 회사',
   E'안녕하세요. 간편상품 대장용종제거 몇번까지 예외질환 해당되나요? 최대로 되는 회사 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-15","kind":"question"}'::jsonb, '2026-05-15 10:49:00+09'),

  (v_author_id::text, '메리츠', '메리츠', '메리츠', v_team_id, 'navigation', 'team_internal', false,
   '[메리츠] 2회까지 예외 / 3회이상 당일제거시 입원만 355',
   E'2회까지 예외질환 해당입니다. 3회이상일 경우 당일 제거수술했다면 입원만 355간편으로 가능합니다.',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-15","kind":"answer"}'::jsonb, '2026-05-15 10:50:00+09'),

  (v_author_id::text, '흥국화재', '흥국화재', '흥국화재', v_team_id, 'navigation', 'team_internal', false,
   '[흥국화재] 재발 3회부터 인수불가',
   E'흥국화재 재발 3회부터 인수불가입니다~',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-15","kind":"answer"}'::jsonb, '2026-05-15 10:50:30+09'),

  (v_author_id::text, '현대해상', '현대해상', '현대해상', v_team_id, 'navigation', 'team_internal', false,
   '[현대해상] 2회까지 예외 / 3회부터 경과 플랜',
   E'현대해상 2회까지 예외질환 가능합니다. 3회부터는 경과하는 플랜으로 진행가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-15","kind":"answer"}'::jsonb, '2026-05-15 10:52:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '68세 남 협심증 / 신장결석 / 종수술+간호간병',
   E'68세 남자. 2년전 협심증진단, 1년전 신장결석제거. 종수술이랑 간호간병통합서비스 들어갈 수 있는 회사 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-15","kind":"question"}'::jsonb, '2026-05-15 11:09:00+09'),

  (v_author_id::text, '라이나생명', '라이나생명', '라이나생명', v_team_id, 'navigation', 'team_internal', false,
   '[라이나생명] 제한 없습니다',
   E'라이나생명 제한 없습니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-15","kind":"answer"}'::jsonb, '2026-05-15 11:14:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '5세대 실손 단독 가입 가능 원수사',
   E'안녕하세요 원수사 지점장님 매니져님. 5세대 실손 현재 단독으로 가입 가능한 원수사 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-15","kind":"question"}'::jsonb, '2026-05-15 11:33:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '14세 미성년 3.10.5(10) 간편',
   E'안녕하세요. 14세 미성년 / 3.10.5(10) 간편 가입한 회사 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-15","kind":"question"}'::jsonb, '2026-05-15 16:10:00+09'),

  (v_author_id::text, '메리츠', '메리츠', '메리츠', v_team_id, 'navigation', 'team_internal', false,
   '[메리츠] 더가벼운 355간편 / 5세부터 가능',
   E'더가벼운 355간편. 5세부터 가능합니다.',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-15","kind":"answer"}'::jsonb, '2026-05-15 16:11:00+09'),

  (v_author_id::text, '팀장님', '팀장님', '팀장님', v_team_id, 'navigation', 'team_internal', false,
   '70년 남 사무직 뇌경색/부정맥/고혈압 순환계 기왕증 보장',
   E'안녕하세요. 도와주세요~ 700814-1 사무직.\n뇌경색 혈전용해치료한지 3년넘었고.\n부정맥 전극도자절제술한지 3년넘었어요.\n고혈압복용중이구요.\n순환계질환 주요치료비를 넣었을때(혈전용해치료, 혈전제거, 수술, 중환자실) 기왕증도 모두 보장 가능한 회사가 있을까요?',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-15","kind":"question"}'::jsonb, '2026-05-15 16:28:00+09'),

  (v_author_id::text, '한화손보', '한화손보', '한화손보', v_team_id, 'navigation', 'team_internal', false,
   '[한화손보] 간편 2대치료비 진단문구 없어 기왕증 가능',
   E'한화손보 간편 2대치료비. 진단문구 없어서 기왕증 가능합니다.',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-15","kind":"answer"}'::jsonb, '2026-05-15 16:30:00+09'),

  (v_author_id::text, '라이나손보', '라이나손보', '라이나손보', v_team_id, 'navigation', 'team_internal', false,
   '[라이나손보] 가능합니다',
   E'라이나손보 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-15","kind":"answer"}'::jsonb, '2026-05-15 16:37:00+09'),

  (v_author_id::text, '현대해상', '현대해상', '현대해상', v_team_id, 'navigation', 'team_internal', false,
   '[현대해상] 3333플랜 가능',
   E'현대해상 : 3333플랜 가능합니다',
   '인수', 'seed', '{"source":"kakao_navigation","date":"2026-05-15","kind":"answer"}'::jsonb, '2026-05-15 16:37:30+09');

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RAISE NOTICE 'INSERT 완료 — % row 적용됨 (네비게이션방, 4/28~5/15 익명화 시드)', v_inserted;
END $$;

-- ┌─────────────────────────────────────────────────────────┐
-- │ 검증 SELECT (commit 전에 확인)                              │
-- └─────────────────────────────────────────────────────────┘

-- 카운트
SELECT COUNT(*) AS apr28_to_may15_count
FROM public.posts
WHERE source_type = 'seed'
  AND source_label::jsonb->>'source' = 'kakao_navigation'
  AND created_at >= '2026-04-28'
  AND created_at <= '2026-05-15 23:59:59+09';

-- 일자별 분포
SELECT
  DATE(created_at AT TIME ZONE 'Asia/Seoul') AS post_date,
  COUNT(*) AS n
FROM public.posts
WHERE source_type = 'seed'
  AND source_label::jsonb->>'source' = 'kakao_navigation'
  AND created_at >= '2026-04-28'
GROUP BY post_date
ORDER BY post_date;

-- 발신자 분포 (익명화 결과 검증)
SELECT
  display_name,
  COUNT(*) AS n
FROM public.posts
WHERE source_type = 'seed'
  AND source_label::jsonb->>'source' = 'kakao_navigation'
  AND created_at >= '2026-04-28'
GROUP BY display_name
ORDER BY 2 DESC;

-- 질문/답변 분포
SELECT
  source_label::jsonb->>'kind' AS kind,
  COUNT(*) AS n
FROM public.posts
WHERE source_type = 'seed'
  AND source_label::jsonb->>'source' = 'kakao_navigation'
  AND created_at >= '2026-04-28'
GROUP BY kind;

COMMIT;

-- 격차 발견 시:
-- ROLLBACK;

-- ============================================================================
-- 검증 기준
-- ============================================================================
-- 예상 INSERT: 약 130건 (질문 약 55 + 답변 약 75)
-- 예상 발신자(display_name): 팀장님 + DB손보/메리츠/흥국화재/흥국생명/라이나손보/라이나생명/
--                            신한라이프/삼성화재/삼성생명/현대해상/한화생명/한화손보/
--                            미래에셋/KDB생명/롯데손보/KB손보/ABL/교보생명
-- 예상 일자 분포: 10일 (4/28, 4/29, 4/30, 5/7, 5/8, 5/11, 5/12, 5/13, 5/14, 5/15)
-- 예상 카테고리: 인수 압도적 다수 / 상품 일부
-- ============================================================================
