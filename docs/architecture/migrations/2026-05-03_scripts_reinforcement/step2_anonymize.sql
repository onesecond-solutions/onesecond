-- ════════════════════════════════════════════════════════════════════════
-- step2_anonymize.sql
-- scripts 보강 트랙 Step 2 — 실명 익명화 5건 (id 5 / 13 / 21)
-- ════════════════════════════════════════════════════════════════════════
-- 원 사양:    docs/specs/scripts_reinforcement_2026-04-25_spec.md § 1 Step 2
-- 사전 검증:  Step 3-1 결과 (DB raw 14개 id 정합 + 실명 잔존 위치 확정)
-- 작성일:     2026-05-04 (Claude Code, 실행 개발자)
-- 적용:       팀장님 직접 Dashboard SQL Editor → Run
-- ⚠️ 사전 백업 필수: scripts → Export to CSV → baseline_scripts_20260504.csv
-- ════════════════════════════════════════════════════════════════════════
--
-- 본문 raw 분석 결과 (Step 3-1 (4) script_text 정밀 검토):
--   id 5  "3대질환 설명형": '김철민 씨' 1회 + '강원래 씨' 1회 + '이윤석 씨' 1회 = 3건
--   id 13 "암보험 설명형":   '김철민 씨' 1회 = 1건
--   id 21 "2대질환 설명형": '이병헌 씨' 1회 = 1건 (이병헌 씨 *부친분* 사례)
--   합계: 5건 — V-3 검증 기준 (실명 잔존 0건)
--
-- 치환 패턴: "X 씨" → "○○○ 씨" (호칭 보존 통일)
--   spec § 1 Step 2의 "한 연예인이" 패턴 미사용 — 본문 raw 모두 "씨" 호칭 결합이라
--   "○○○ 씨" 단일 패턴이 의미·문맥 자연스러움 + 단순 REPLACE 회귀 0
--
-- 의미 보존 검증 (익명화 후 문맥 raw):
--   id 5  "암: ○○○ 씨 폐암 → ... / 뇌: ○○○ 씨 뇌출혈 → ... / 심장: ○○○ 씨 심근경색 → ..."
--         "이분들이 공개하셨기 때문에" — 앞 3건 받음, 의미 보존 ✅
--   id 13 "○○○ 씨 같은 경우 폐암 진단 받으시고 ... 그분은 다행히 방송인이라"
--         — "그분"이 ○○○ 씨 받음, 의미 보존 ✅
--   id 21 "○○○ 씨 부친분이나, 운동선수 분들이 갑자기 쓰러지셨다는 뉴스"
--         — 의미 보존 ✅
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── id 5: "3대질환 설명형" — 3건 일괄 치환 ─────────────────────────────
UPDATE public.scripts
SET script_text = REPLACE(REPLACE(REPLACE(script_text,
    '김철민 씨', '○○○ 씨'),
    '강원래 씨', '○○○ 씨'),
    '이윤석 씨', '○○○ 씨')
WHERE id = 5;

-- ── id 13: "암보험 설명형" — 1건 치환 ──────────────────────────────────
UPDATE public.scripts
SET script_text = REPLACE(script_text, '김철민 씨', '○○○ 씨')
WHERE id = 13;

-- ── id 21: "2대질환 설명형" — 1건 치환 ─────────────────────────────────
UPDATE public.scripts
SET script_text = REPLACE(script_text, '이병헌 씨', '○○○ 씨')
WHERE id = 21;


-- ════════════════════════════════════════════════════════════════════════
-- V-3 자동 검증 (실패 시 RAISE EXCEPTION → 자동 ROLLBACK)
-- ════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  remain_count int;
BEGIN
  SELECT COUNT(*) INTO remain_count
  FROM public.scripts
  WHERE script_text LIKE '%김철민%'
     OR script_text LIKE '%강원래%'
     OR script_text LIKE '%이윤석%'
     OR script_text LIKE '%이병헌%';

  IF remain_count > 0 THEN
    RAISE EXCEPTION 'V-3 검증 실패: 실명 잔존 % 행 — 트랜잭션 자동 ROLLBACK', remain_count;
  END IF;

  RAISE NOTICE 'V-3 통과: 실명 잔존 0건 — COMMIT 진입';
END $$;


-- ════════════════════════════════════════════════════════════════════════
-- 사후 정보 표시 (정합 확인용 — 트랜잭션 결과 영향 X)
-- ════════════════════════════════════════════════════════════════════════
SELECT
  id,
  title,
  (SELECT COUNT(*) FROM regexp_matches(script_text, '○○○ 씨', 'g')) AS anon_count
FROM public.scripts
WHERE id IN (5, 13, 21)
ORDER BY id;
-- 기대: id 5 anon_count=3 / id 13 anon_count=1 / id 21 anon_count=1


COMMIT;


-- ════════════════════════════════════════════════════════════════════════
-- ROLLBACK 절차 (사후 회귀 발견 시 — 백업 CSV 기반)
-- ════════════════════════════════════════════════════════════════════════
-- 1. baseline_scripts_20260504.csv 에서 id=5/13/21 행의 script_text raw 추출
-- 2. 별도 SQL 파일로 UPDATE ... SET script_text = $$<백업 raw>$$ WHERE id = N; 작성
--    (작은따옴표 이스케이프 회피를 위해 dollar-quoted $$...$$ 권장)
-- 3. Dashboard SQL Editor → Run
-- 4. V-3 검증 SELECT 재실행 → 실명 4명 모두 5건 잔존 확인 후 진행
