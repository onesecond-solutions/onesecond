-- ============================================================================
-- 별 트랙 #51 — public.posts 시드 SQL (7종 board_type × 7 row)
-- 일시: 2026-05-11 (월) / 5/15 4팀 오픈 D-4
-- 본진: Step 7 라이브 회귀 격차 해소 + board.html 빈 화면 회피
-- 의뢰서 정합: docs/architecture/star_51_posts_seed_chrome_request_2026-05-10.md
-- 신버전: pdnwgzneooyygfejrvbg (onesecond-v1-restore-0420) — 팀장님 확인 ✅
-- ============================================================================
--
-- ⚠️ 실행 규칙 (CLAUDE.md § 단일 쿼리 원칙 정합):
--    Dashboard SQL Editor는 마지막 쿼리 결과만 노출.
--    본 파일 안 쿼리는 "한 번에 한 쿼리" 단위로 복사 + 실행 권장.
--    각 블록(§A 5쿼리 / §B 7 INSERT / §C 검증) 단위 실행 + 결과 확인 후 다음.
--
-- ⚠️ FK 위반 23503 발생 시 (메모리 fk_violation_dual_hypothesis.md 정합):
--    (가) RLS 정책 + (나) 참조 row 부재 둘 다 검증.
--    branches/teams/insurers/users 4테이블 row 사전 검증 (§A 필수).
--
-- ============================================================================


-- ============================================================================
-- § A. 사전 검증 SQL (시드 INSERT 전 강제)
-- ============================================================================

-- A-1. 신버전 DB 박힘 확인 (CLAUDE.md 강제)
SELECT current_database();
-- 기대: postgres


-- A-2. branches 박힘 (더원지점 1 row)
SELECT id, name, type
FROM public.branches
ORDER BY name;
-- 기대: 더원지점 1 row


-- A-3. teams 박힘 (4팀 1 row)
SELECT id, name, branch_id
FROM public.teams
ORDER BY name;
-- 기대: 4팀 1 row


-- A-4. users 박힘 (admin + ga_* + insurer_* 9역할 시드)
SELECT id, email, role, branch_id, team_id, insurer_id, name
FROM public.users
ORDER BY role, email;
-- 기대: admin (bylts0428@gmail.com) 1건 + ga_manager 1건 + ga_member 3건 + insurer_branch_manager 1건


-- A-5. insurers 박힘 (31사 = 생명 21 + 손해 10)
SELECT id, name, type
FROM public.insurers
ORDER BY type, name;
-- 기대: 메리츠화재 포함 31사


-- A-6. posts 사전 카운트 (0건 박힘 확인)
SELECT COUNT(*) FROM public.posts;
-- 기대: 0
-- 0이 아니면 = 시드 박힘 보류 + 팀장님 보고


-- ============================================================================
-- § B. 시드 INSERT — 7종 board_type × 1 row = 총 7 row
-- ============================================================================

-- B-1. qna (스마트 게시판) — admin 시드 ⭐
INSERT INTO public.posts (
  board_type, source_type, title, content,
  display_author, source_label,
  insurer_id, branch_id, team_id, question_type,
  created_by, status, source_url
) VALUES (
  'qna', 'seed',
  '[샘플] 4팀 자주 묻는 질문 — 갑상선 결절 인수 가능 회사',
  '갑상선 결절 인수 가능 회사 정리: 본 샘플은 onesecond 자료실에서 4팀 단톡방 질문을 정제한 예시입니다.',
  'onesecond 자료실', '4팀 단톡방 정제',
  NULL, NULL, NULL, '인수',
  (SELECT id FROM public.users WHERE email = 'bylts0428@gmail.com' LIMIT 1),
  'published', NULL
);


-- B-2. manager_notice (실장님 공지) — 실장 박음
INSERT INTO public.posts (
  board_type, source_type, title, content,
  insurer_id, branch_id, team_id, question_type,
  created_by, status
) VALUES (
  'manager_notice', 'user_post',
  '[샘플] 5/15 4팀 오픈 안내',
  '5/15 (금) onesecond 4팀 본격 가동. 매일 활용 부탁드립니다.',
  NULL,
  (SELECT id FROM public.branches WHERE name = '더원지점' LIMIT 1),
  (SELECT id FROM public.teams WHERE name = '4팀' LIMIT 1),
  '공지',
  (SELECT id FROM public.users WHERE email = 'bylts0428@gmail.com' LIMIT 1),
  'published'
);


-- B-3. manager_lounge (매니저 라운지) — 매니저급 (admin 토글 #1 ON 시 박힘)
INSERT INTO public.posts (
  board_type, source_type, title, content,
  insurer_id, branch_id, team_id, question_type,
  created_by, status
) VALUES (
  'manager_lounge', 'user_post',
  '[샘플] 매니저 라운지 운영 의논',
  '매니저급 운영 의논 공간 샘플 (admin 토글 #1 ON 시 노출).',
  NULL,
  (SELECT id FROM public.branches WHERE name = '더원지점' LIMIT 1),
  NULL,
  '운영',
  (SELECT id FROM public.users WHERE email = 'bylts0428@gmail.com' LIMIT 1),
  'published'
);


-- B-4. navigation (네비게이션방) — 사용자 질문 ⭐
-- ⚠️ insurer_target = '회사지정' = Phase 3 진입 시 target_insurer_ids 컬럼 박힘 (현 v0 = NULL).
INSERT INTO public.posts (
  board_type, source_type, title, content,
  insurer_id, branch_id, team_id, question_type,
  insurer_target,
  created_by, status
) VALUES (
  'navigation', 'user_post',
  '[샘플] 메리츠화재 갑상선 결절 인수 문의',
  '갑상선 결절 1cm 인수 가능 여부 문의. 메리츠화재 기준 답변 부탁드립니다.',
  NULL,
  (SELECT id FROM public.branches WHERE name = '더원지점' LIMIT 1),
  (SELECT id FROM public.teams WHERE name = '4팀' LIMIT 1),
  '인수',
  '회사지정',
  (SELECT id FROM public.users WHERE email = 'bylts0428@gmail.com' LIMIT 1),
  'published'
);


-- B-5. insurer (보험사 게시판) — admin 시드 (admin only) ⭐
INSERT INTO public.posts (
  board_type, source_type, title, content,
  display_author, source_label,
  insurer_id, branch_id, team_id, question_type,
  created_by, status
) VALUES (
  'insurer', 'seed',
  '[샘플] 메리츠화재 5월 인수 변경사항',
  '5월 인수 기준 변경사항 요약 (샘플). 본 row는 admin 시드로 등록되며 모든 지점 사용자에게 노출됩니다.',
  'onesecond 자료실', '메리츠화재 소식지 (2026-05)',
  (SELECT id FROM public.insurers WHERE name LIKE '%메리츠%' LIMIT 1),
  NULL, NULL, '인수',
  (SELECT id FROM public.users WHERE email = 'bylts0428@gmail.com' LIMIT 1),
  'published'
);


-- B-6. hub (허브 게시판) — admin only (admin 토글 #3 OFF 시 비노출)
INSERT INTO public.posts (
  board_type, source_type, title, content,
  insurer_id, branch_id, team_id, question_type,
  created_by, status
) VALUES (
  'hub', 'seed',
  '[샘플] 허브 게시판 — 모든 지식의 저장소',
  '허브 게시판 = 모든 지식의 저장소 (현재 미오픈, admin 토글 #3 OFF). 향후 admin 큐레이션 누적 시 보험판 구글 검색창 역할.',
  NULL, NULL, NULL, '운영',
  (SELECT id FROM public.users WHERE email = 'bylts0428@gmail.com' LIMIT 1),
  'published'
);


-- B-7. archive_legacy (폐기 4 row 보존) — admin 격리
INSERT INTO public.posts (
  board_type, source_type, title, content,
  insurer_id, branch_id, team_id,
  created_by, status
) VALUES (
  'archive_legacy', 'seed',
  '[샘플] 옛 4탭 잔재 보존',
  '폐기 4 row 박음 보존 영역 (admin 격리).',
  NULL, NULL, NULL,
  (SELECT id FROM public.users WHERE email = 'bylts0428@gmail.com' LIMIT 1),
  'archived'
);


-- ============================================================================
-- § C. 시드 박힘 검증 SQL (INSERT 후 강제)
-- ============================================================================

-- C-1. 시드 7종 박힘 카운트
SELECT board_type, COUNT(*) AS row_count
FROM public.posts
GROUP BY board_type
ORDER BY board_type;
-- 기대: 7종 × 1건 = 총 7 row
--   archive_legacy 1 / hub 1 / insurer 1 / manager_lounge 1 / manager_notice 1 / navigation 1 / qna 1


-- C-2. 전체 시드 row 박힘 raw
SELECT
  id, board_type, source_type, title,
  insurer_id, branch_id, team_id, question_type,
  status, created_at
FROM public.posts
ORDER BY board_type, created_at;
-- 기대: 7 row raw + FK 박힘 정합 확인


-- C-3. FK 박힘 검증 — created_by → public.users
SELECT
  p.board_type, p.title, p.created_by,
  u.email, u.role
FROM public.posts p
LEFT JOIN public.users u ON u.id = p.created_by
ORDER BY p.board_type;
-- 기대: 7 row × created_by = admin (bylts0428@gmail.com / role=admin)


-- C-4. FK 박힘 검증 — branch_id → public.branches (manager_notice + manager_lounge + navigation 3건)
SELECT
  p.board_type, p.title, p.branch_id,
  b.name AS branch_name
FROM public.posts p
LEFT JOIN public.branches b ON b.id = p.branch_id
WHERE p.branch_id IS NOT NULL
ORDER BY p.board_type;
-- 기대: 3 row × branch_name = 더원지점


-- C-5. FK 박힘 검증 — team_id → public.teams (manager_notice + navigation 2건)
SELECT
  p.board_type, p.title, p.team_id,
  t.name AS team_name
FROM public.posts p
LEFT JOIN public.teams t ON t.id = p.team_id
WHERE p.team_id IS NOT NULL
ORDER BY p.board_type;
-- 기대: 2 row × team_name = 4팀


-- C-6. FK 박힘 검증 — insurer_id → public.insurers (insurer 1건)
SELECT
  p.board_type, p.title, p.insurer_id,
  i.name AS insurer_name
FROM public.posts p
LEFT JOIN public.insurers i ON i.id = p.insurer_id
WHERE p.insurer_id IS NOT NULL
ORDER BY p.board_type;
-- 기대: 1 row × insurer_name LIKE '%메리츠%'


-- ============================================================================
-- § D. 사고 신호 박힘 (즉시 보고)
-- ============================================================================
--
-- 1. current_database() 결과 ≠ postgres → 구버전 박힘 (90% 확률, CLAUDE.md 정합)
-- 2. branches/teams/insurers/users row 부재 → 시드 INSERT 불가, FK 위반 23503 발생
-- 3. INSERT FK 위반 23503 → (가) RLS 정책 + (나) 참조 row 부재 둘 다 SQL 검증
--    (메모리 fk_violation_dual_hypothesis.md 정합)
-- 4. insurer_target CHECK 박힘 박힘 (5/10 오후 진단 = CHECK 부재 박힘) → 자유 텍스트 박음 가능
-- 5. C-3 결과 created_by IS NULL → admin row 부재 (bylts0428@gmail.com SELECT 실패)
--    → §A-4 사전 검증으로 사전 차단 가능
--
-- ============================================================================
-- § E. 박힘 후 라이브 검수
-- ============================================================================
--
-- 1. 라이브 board.html 7탭 노출 팀장님 직접 확인 (admin 로그인)
-- 2. 시드 row 박힘 → board.html 빈 화면 회피 정합
-- 3. Step 7 라이브 회귀 검수 (Chrome AI 의뢰서) 진입 가능
--
-- ============================================================================
-- END OF SEED SQL
-- ============================================================================
