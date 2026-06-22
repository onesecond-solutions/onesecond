-- ============================================================================
-- 별 트랙 #51 후속 — navigation 5건 추가 시드 (4팀 5/18 오픈 D-5)
-- 일시: 2026-05-13
-- 본진: 5/18 board 진입 시 navigation 탭 빈 화면 회피 (사전 1건 → 사후 6건)
-- 직전 박힘: 2026-05-11_seed_posts.sql (7종 × 1 row, commit 9751fb0)
-- 컬럼 정합: 2026-05-13 schema 검증 박힌 39 컬럼 (board.html form + 5/12 215건 패턴)
-- 신버전: pdnwgzneooyygfejrvbg (onesecond-v1-restore-0420) — 팀장님 확인 ✅
-- ============================================================================
--
-- 결재 (2026-05-13):
--   Q6 = a-nav: navigation 5건 시드 (qna 박지 X)
--   Q7' = A: 한재성 ga_manager 5건 모두 (4팀 ga_member 1명뿐 격차 → 단일 author)
--
-- 작성자:
--   author_id   = '6f5aaa10-be20-4274-a190-53ce38ed3850' (text 컬럼, 한재성 UUID)
--   author_name = display_name = display_author = '한재성'
--   team_id     = '5fccd362-9ee3-4165-8960-7cb0b7ec72fa' (4팀, uuid)
--
-- 카테고리 분포: 공지 1 + 인수 2 + 상품 1 + 기타 1
-- audience_target: team_internal (4팀 한정 노출, 215건 정합)
-- is_notice: false (네비방 본질, 공지 카테고리도 false)
-- status: DEFAULT '답변대기' (네비방 질문 본질 정합)
-- attachments: NULL (시드라 첨부 X)
-- source_type: 'seed' / source_label: text JSON
--
-- 실행 규칙 (CLAUDE.md § 단일 쿼리 원칙 정합):
--   § A 사전 검증 (3 SELECT) → 정합 박은 후
--   § B INSERT 5건 (BEGIN ... COMMIT, 단일 블록)
--   § C 박힘 검증 (3 SELECT)
-- ============================================================================


-- ============================================================================
-- § A. 사전 검증 SQL (강제)
-- ============================================================================

-- A-1. 신버전 박힘 확인
SELECT current_database();
-- 기대: postgres


-- A-2. 한재성 author row + 4팀 정합
SELECT id, email, name, role, team_id
FROM public.users
WHERE id = '6f5aaa10-be20-4274-a190-53ce38ed3850';
-- 기대: 한재성 / jaisung78@gmail.com / ga_manager / team_id = 5fccd362-9ee3-4165-8960-7cb0b7ec72fa


-- A-3. navigation 사전 카운트
SELECT board_type, COUNT(*) AS row_count
FROM public.posts
WHERE board_type = 'navigation'
GROUP BY board_type;
-- 기대: navigation 1 (5/11 시드 1건)


-- ============================================================================
-- § B. 시드 INSERT 5건 — navigation × 카테고리 4종
-- ============================================================================

BEGIN;

-- B-1. 공지 카테고리 — 4팀 자율 일정
INSERT INTO public.posts (
  board_type, category, title, content,
  author_id, author_name, display_name, display_author,
  team_id,
  audience_target, is_notice, is_hub_visible, is_anonymous, is_hidden,
  source_type, source_label,
  created_at
) VALUES (
  'navigation', '공지',
  '내일(5/19) 오전 9시 4팀 정기 미팅 — 안건 미리 확인 부탁드립니다',
  '내일 오전 9시 4팀 정기 미팅 진행합니다.

[안건]
1. 5/18 onesecond 가동 첫 주 회고 (사용자 흐름 / 자료 정합 / 첨부 처리)
2. 주말 진행 건 공유 — 사고 처리 / 인수 문의 결과
3. 6월 캠페인 사전 논의 — 자동차 보험 갱신 + 종신 신상품 안내

본문 댓글로 안건 추가 박아주시면 미팅 시작 전 정리해서 공유드립니다. 늦지 않게 입장 부탁드립니다.',
  '6f5aaa10-be20-4274-a190-53ce38ed3850', '한재성', '한재성', '한재성',
  '5fccd362-9ee3-4165-8960-7cb0b7ec72fa',
  'team_internal', false, false, false, false,
  'seed', '{"source":"seed_5_18_open","cluster":"navigation","category":"공지"}',
  NOW()
);


-- B-2. 인수 카테고리 — 갑상선 결절 정리 (4팀 자주 묻는 정제본)
INSERT INTO public.posts (
  board_type, category, title, content,
  author_id, author_name, display_name, display_author,
  team_id,
  audience_target, is_notice, is_hub_visible, is_anonymous, is_hidden,
  source_type, source_label,
  created_at
) VALUES (
  'navigation', '인수',
  '갑상선 결절 1cm 미만 → 손해보험 3사 인수 가능 여부 정리 (5월 기준)',
  '갑상선 결절 1cm 미만 가입 문의가 4팀에서 자주 들어와서 정리해드립니다. 5월 기준입니다 — 6월 변경분 확인되면 본 글 갱신하겠습니다.

[손해보험 3사 정리]
■ 메리츠화재
- 1cm 이하 + 양성 진단서 → 표준체 가능
- 1cm 초과 → 부담보 또는 할증
- 추적 관찰 중 = 가입 보류 권장

■ DB손해보험
- 1cm 이하 + 6개월 추적 정상 → 가입 가능
- 결절 3개 이상이면 사이즈 무관 추가 검토 요청
- 갑상선 기능항진증 동반 시 부담보 가능성

■ 삼성화재
- 0.5cm 이하만 표준체
- 0.5~1cm = 할증 또는 부담보
- 1cm 초과 = 가입 거절

[유의]
회사별 청약 시점 기준이 자주 바뀝니다. 본 정리는 5월 청약 기준이라 정확한 인수 여부는 청약 직전 한 번 더 확인 박아주세요.',
  '6f5aaa10-be20-4274-a190-53ce38ed3850', '한재성', '한재성', '한재성',
  '5fccd362-9ee3-4165-8960-7cb0b7ec72fa',
  'team_internal', false, false, false, false,
  'seed', '{"source":"seed_5_18_open","cluster":"navigation","category":"인수"}',
  NOW()
);


-- B-3. 인수 카테고리 — 비흡연자 할인 (질문 형식)
INSERT INTO public.posts (
  board_type, category, title, content,
  author_id, author_name, display_name, display_author,
  team_id,
  audience_target, is_notice, is_hub_visible, is_anonymous, is_hidden,
  source_type, source_label,
  created_at
) VALUES (
  'navigation', '인수',
  '비흡연자 할인 — 코티닌 음성인데 흡연 이력 5년 전 있으면 회사별 적용 기준?',
  '고객분 상담 중인데 흡연 이력 5년 전까지 있으셨고 현재 금연 5년차이십니다. 어제 코티닌 검사 음성 받으셨는데 비흡연자 할인 적용 가능 회사별 기준 정리해주실 분 계신가요?

[현재 알고 있는 것]
- 일부 회사는 코티닌 음성만 보고 적용
- 일부 회사는 금연 기간 1년/3년/5년 등 별도 조건
- 종신 vs 정기 vs 건강 상품군별 기준 다를 가능성

특히 종신보험 가입 의향이라 종신 기준이 우선입니다. 회사별 정리된 자료 또는 최근 답변 받으신 사례 있으시면 본 글에 댓글 박아주세요.',
  '6f5aaa10-be20-4274-a190-53ce38ed3850', '한재성', '한재성', '한재성',
  '5fccd362-9ee3-4165-8960-7cb0b7ec72fa',
  'team_internal', false, false, false, false,
  'seed', '{"source":"seed_5_18_open","cluster":"navigation","category":"인수"}',
  NOW()
);


-- B-4. 상품 카테고리 — 자동차 보험 11회 분할 (질문 형식)
INSERT INTO public.posts (
  board_type, category, title, content,
  author_id, author_name, display_name, display_author,
  team_id,
  audience_target, is_notice, is_hub_visible, is_anonymous, is_hidden,
  source_type, source_label,
  created_at
) VALUES (
  'navigation', '상품',
  '자동차 보험 11회 분할 — 신용카드사별 무이자 적용 회사 정리 부탁드립니다',
  '자동차 보험 1년 갱신 시 11회 분할 무이자 적용되는 카드사 ↔ 보험사 매핑 정리 부탁드립니다.

[현재 알고 있는 것]
- 삼성화재 + 삼성카드 = 무이자 적용 (확인 필요)
- KB손해보험 + KB국민카드 = 무이자 적용
- 메리츠화재 = 카드사 무관 일부 무이자 가능

[정리 부탁]
- 나머지 손해보험사(현대해상 / DB / 한화 / 흥국 / 농협)별 무이자 적용 카드사
- 분할 회차 차이 (11회 / 10회 / 6회 등)
- 카드사 캠페인 시기 (분기별 변동 있는지)

자료 있으시면 본 글 댓글로 공유 부탁드립니다. 6월 갱신 안내 시 활용하겠습니다.',
  '6f5aaa10-be20-4274-a190-53ce38ed3850', '한재성', '한재성', '한재성',
  '5fccd362-9ee3-4165-8960-7cb0b7ec72fa',
  'team_internal', false, false, false, false,
  'seed', '{"source":"seed_5_18_open","cluster":"navigation","category":"상품"}',
  NOW()
);


-- B-5. 기타 카테고리 — 주말 사고 신고 위임장 (운영 질문)
INSERT INTO public.posts (
  board_type, category, title, content,
  author_id, author_name, display_name, display_author,
  team_id,
  audience_target, is_notice, is_hub_visible, is_anonymous, is_hidden,
  source_type, source_label,
  created_at
) VALUES (
  'navigation', '기타',
  '주말 사고 신고 — 가입자 외 가족이 신고 시 위임장 받는 형식·시점 정리 부탁드립니다',
  '어제 주말 사고 신고 들어왔는데 가입자 본인 통화 어려운 상황이라 배우자분이 신고 전화 주셨습니다. 회사별 위임장 처리 기준 정리 부탁드립니다.

[질문 3건]
1. 위임장 형식 = 자필 vs 카톡·문자 가능 회사별 기준
2. 받는 시점 = 사고 접수 즉시 vs 보험금 청구 단계
3. 24시간 내 처리 기준 = 회사별 차이 (사고 접수 후 가입자 본인 확인 시한)

[현재 알고 있는 것]
- 일부 회사 = 사고 접수 단계는 가족 신고 OK + 보험금 청구 단계에서 위임장 받음
- 일부 회사 = 사고 접수 즉시 위임장 필요

본 글에 회사별 기준 정리해주시면 다음 사고 받을 때 바로 안내 가능합니다. 부탁드립니다.',
  '6f5aaa10-be20-4274-a190-53ce38ed3850', '한재성', '한재성', '한재성',
  '5fccd362-9ee3-4165-8960-7cb0b7ec72fa',
  'team_internal', false, false, false, false,
  'seed', '{"source":"seed_5_18_open","cluster":"navigation","category":"기타"}',
  NOW()
);


COMMIT;


-- ============================================================================
-- § C. 박힘 검증 SQL (INSERT 후 강제)
-- ============================================================================

-- C-1. navigation 사후 카운트 (= 사전 + 5)
SELECT board_type, COUNT(*) AS row_count
FROM public.posts
WHERE board_type = 'navigation'
GROUP BY board_type;
-- 기대: navigation 6 (사전 1 + 시드 5)


-- C-2. 박힌 시드 5건 카테고리 분포 + author 정합
SELECT
  category,
  COUNT(*) AS row_count,
  author_name,
  source_type
FROM public.posts
WHERE board_type = 'navigation'
  AND source_label LIKE '%seed_5_18_open%'
GROUP BY category, author_name, source_type
ORDER BY category;
-- 기대:
--   공지 1 / 한재성 / seed
--   기타 1 / 한재성 / seed
--   상품 1 / 한재성 / seed
--   인수 2 / 한재성 / seed


-- C-3. 박힌 시드 5건 raw
SELECT
  id, category, title, author_name, status, audience_target, is_notice, created_at
FROM public.posts
WHERE board_type = 'navigation'
  AND source_label LIKE '%seed_5_18_open%'
ORDER BY category, created_at;
-- 기대:
--   5 row + 한재성 + status='답변대기' (DEFAULT) + audience_target='team_internal' + is_notice=false + created_at=5/13 박힘 시각


-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
