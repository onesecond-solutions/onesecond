-- ═══════════════════════════════════════════════════════════════
-- 원세컨드 "함께해요" 기능 Supabase 셋업 스크립트
-- 작성일: 2026-04-19
-- 실행 위치: Supabase Dashboard → SQL Editor
-- 실행 순서: 위에서 아래로 블록별 실행 권장
-- ═══════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────
-- [1] 사전 확인 쿼리 (실행 전 현재 상태 점검)
-- ───────────────────────────────────────────────────────────────

-- 1-1. comments 테이블 구조 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'comments'
ORDER BY ordinal_position;
-- 예상: id, post_id, content, author_id (text), author_name, created_at

-- 1-2. posts 테이블에 이미 together 데이터가 있는지 확인
SELECT COUNT(*) AS together_count
FROM posts
WHERE board_type = 'together';
-- 0이면 [2] 블록 실행, >0 이면 건너뛰기

-- 1-3. app_settings의 menu_b 그룹에 menu_together 존재 여부
SELECT key, value, label
FROM app_settings
WHERE group_name = 'menu_b' AND key = 'menu_together';
-- 행이 없으면 [3] 블록 실행


-- ───────────────────────────────────────────────────────────────
-- [2] 함께해요 샘플 게시글 3개 INSERT
-- ───────────────────────────────────────────────────────────────
-- 주의: user_id는 NULL로 둠 (샘플·공지용, 익명 설계사 글임을 명시)
-- is_notice=true 인 첫 번째 글은 운영자 공지로 최상단 고정

INSERT INTO posts (
  title,
  content,
  category,
  board_type,
  author_name,
  is_notice,
  is_hidden,
  created_at
) VALUES
(
  '원세컨드에 바라는 점, 자유롭게 남겨주세요',
  '원세컨드는 여러분과 함께 만들어갑니다.' || chr(10) ||
  '필요한 기능, 개선 아이디어, 사용하시면서 느낀 점 모두 환영합니다.' || chr(10) || chr(10) ||
  '- 기능 요청: "이런 기능이 있으면 좋겠어요"' || chr(10) ||
  '- 사용 후기: "이 기능 덕분에 편했어요"' || chr(10) ||
  '- 자유 공유: "다들 어떻게 쓰세요?"',
  'free',
  'together',
  '운영자',
  true,
  false,
  NOW()
),
(
  '스크립트 "반론 대응" 더 많이 있으면 좋겠어요',
  '요즘 고객들이 반론하는 패턴이 다양해졌는데,' || chr(10) ||
  '현재 스크립트보다 더 많은 예시가 있으면 좋겠습니다.' || chr(10) || chr(10) ||
  '특히 "보험 있어요" 반론에 대한 응대 멘트가' || chr(10) ||
  '좀 더 세분화되면 도움이 될 것 같아요.',
  'feature_request',
  'together',
  '김설계사',
  false,
  false,
  NOW() - INTERVAL '1 day'
),
(
  '첫날 써봤는데 진짜 편해요',
  '통화 중에 멘트 찾을 필요 없이 바로 나와서 좋네요.' || chr(10) ||
  '특히 "상황 확인" 단계 스크립트가 도움됐습니다.' || chr(10) || chr(10) ||
  '타이핑 시간이 줄어들어서' || chr(10) ||
  '고객과의 호흡이 훨씬 자연스러워졌어요.',
  'review',
  'together',
  '이팀장',
  false,
  false,
  NOW() - INTERVAL '2 days'
);


-- ───────────────────────────────────────────────────────────────
-- [3] app_settings — 사이드바 "함께해요" 메뉴 토글 추가
-- ───────────────────────────────────────────────────────────────
-- 기본값 true (표시). 관리자가 admin.html에서 ON/OFF 가능
-- 중복 INSERT 방지: 이미 있으면 에러나지 않도록 ON CONFLICT 사용 불가 시
-- 먼저 DELETE 후 INSERT (app_settings 저장 패턴 관례)

DELETE FROM app_settings
WHERE group_name = 'menu_b' AND key = 'menu_together';

INSERT INTO app_settings (group_name, key, value, label) VALUES
('menu_b', 'menu_together', 'true', '함께해요');


-- ───────────────────────────────────────────────────────────────
-- [4] 검증 쿼리 (실행 후 결과 확인)
-- ───────────────────────────────────────────────────────────────

-- 4-1. 삽입된 together 게시글 확인 (3건 예상)
SELECT id, title, category, author_name, is_notice, created_at
FROM posts
WHERE board_type = 'together'
ORDER BY is_notice DESC, created_at DESC;

-- 4-2. menu_together 설정 확인 (1행 예상)
SELECT group_name, key, value, label
FROM app_settings
WHERE group_name = 'menu_b' AND key = 'menu_together';


-- ───────────────────────────────────────────────────────────────
-- [5] 롤백 스크립트 (필요 시에만 실행)
-- ───────────────────────────────────────────────────────────────
-- 주의: 아래 블록은 주석 상태. 되돌리고 싶을 때만 주석 해제 후 실행

-- DELETE FROM posts WHERE board_type = 'together';
-- DELETE FROM app_settings WHERE group_name = 'menu_b' AND key = 'menu_together';


-- ═══════════════════════════════════════════════════════════════
-- 끝
-- ═══════════════════════════════════════════════════════════════
