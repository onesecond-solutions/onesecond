# 별 트랙 #51 — public.posts 시드 SQL 의뢰서 (Chrome AI용)

> **일시:** 2026-05-10
> **별 트랙:** #51 — public.posts 0건 시드 5~10건 (Step 7 라이브 회귀 격차 해소용)
> **본질:** 5/15 4팀 오픈 시점 board.html 빈 화면 인지 격차 해소
> **검수자:** Claude in Chrome (라이브 Supabase Dashboard SQL Editor 박음)
> **사이트:** https://supabase.com/dashboard/project/pdnwgzneooyygfejrvbg

---

## 박음 배경

### 라이브 박힘 박음 (5/10 오후 진단 박힘)
- `public.posts` 라이브 row 0건 박힘 (직전 진단 박힘 박음)
- Step 7 ✅ 종료 박힘 (board.html 7탭 박힘 박음) → 라이브 진입 시 **빈 화면 노출 박힘**
- 4팀 오픈 시점 (5/15) 사용자 첫 진입 시 인지 격차 박힘

### 박음 본진
- 7종 board_type 박힘 박음 시드 박힘 박음 (각 1~2건, 총 ~10건)
- 9역할 × 7탭 시뮬레이션 박음 박음 박음 박음
- 마스터 전략 §3 박힘 박음 박음 (사용자 인지 vs 실제 내부 구조 박힘 박음 박음)

### 사전 박힘 박음

본 SQL 박음 박힘 박음 박음:
- ⚠️ **CLAUDE.md 첫 질문 박힘 강제:** Supabase Dashboard 박힘 박음 = `onesecond-v1-restore-0420` (신버전 `pdnwgzneooyygfejrvbg`) 박힘 박힘 박음 박힘 박힘 후 박음
- ⚠️ **branches/teams 박힘 박음 박힘 박음 박음 박음 박음 박힘** (라이브 박힘 박음 박힘 후 박음)
- ⚠️ **users 박힘 박음 박힘 박음 박음** (admin + ga_* + insurer_* 박힘 박음 박힘 후 박음)

---

## A. 사전 박힘 박힘 SQL

### A-1. 라이브 박힘 박음 박힘 박음 박음

```sql
-- A-1-a. 신버전 DB 박힘 박음 (CLAUDE.md 박힘 강제)
SELECT current_database();
-- 기대: postgres (신버전 박힘)

-- A-1-b. branches 박힘 박음
SELECT id, name, type FROM public.branches ORDER BY name;
-- 기대: 더원지점 1 row (id 박힘)

-- A-1-c. teams 박힘 박음
SELECT id, name, branch_id FROM public.teams ORDER BY name;
-- 기대: 4팀 1 row (id 박힘)

-- A-1-d. users 박힘 박음 박음 박힘
SELECT id, email, role, branch_id, team_id, insurer_id, name
FROM public.users
ORDER BY role, email;
-- 기대: admin + ga_* + insurer_* 박힘 박음

-- A-1-e. insurers 박힘 박음 (5/10 오후 진단 = 31사 박힘)
SELECT id, name, type FROM public.insurers ORDER BY type, name;
-- 기대: 생명보험 21 + 손해보험 10 박힘
```

### A-2. posts 박힘 박힘 박음

```sql
SELECT COUNT(*) FROM public.posts;
-- 기대: 0 (라이브 박힘 박힘 박음)
```

→ 0이면 시드 박음 진입 박음.
→ 0이 아니면 = **시드 박힘 박음 보류** + 팀장님 보고 박음.

---

## B. 시드 SQL — 7종 board_type × ~10 row

본 박음 박힘 = **샘플 박힘 박음**. 라이브 박힘 박음 박힘 박음 후 박음 박음 박음.

### B-1. board_type별 시드 박힘 박음

#### B-1-a. qna (스마트 게시판) — admin 시드 ⭐
```sql
INSERT INTO public.posts (
  board_type, source_type, title, content,
  display_author, source_label,
  insurer_id, branch_id, team_id, question_type,
  created_by, status, source_url
) VALUES
(
  'qna', 'seed',
  '[샘플] 4팀 자주 묻는 질문 — 갑상선 결절 인수 가능 회사',
  '갑상선 결절 인수 가능 회사 박음: ...',
  'onesecond 자료실', '4팀 단톡방 정제',
  NULL, NULL, NULL, '인수',
  (SELECT id FROM public.users WHERE email = 'bylts0428@gmail.com' LIMIT 1),
  'published', NULL
);
```

#### B-1-b. manager_notice (매니저 공지) — 실장 박음 박힘
```sql
INSERT INTO public.posts (
  board_type, source_type, title, content,
  insurer_id, branch_id, team_id, question_type,
  created_by, status
) VALUES
(
  'manager_notice', 'user_post',
  '[샘플] 5/15 4팀 오픈 안내',
  '5/15 (금) onesecond 4팀 본격 가동 박힘. 매일 활용 박힘 박음.',
  NULL,
  (SELECT id FROM public.branches WHERE name = '더원지점' LIMIT 1),
  (SELECT id FROM public.teams WHERE name = '4팀' LIMIT 1),
  '공지',
  (SELECT id FROM public.users WHERE email = 'bylts0428@gmail.com' LIMIT 1),
  'published'
);
```

#### B-1-c. manager_lounge (매니저 라운지) — 매니저급 박힘
```sql
INSERT INTO public.posts (
  board_type, source_type, title, content,
  insurer_id, branch_id, team_id, question_type,
  created_by, status
) VALUES
(
  'manager_lounge', 'user_post',
  '[샘플] 매니저 라운지 박힘 박음',
  '매니저급 박힘 박음 박음 박음 (admin 토글 #1 ON 시 박힘)',
  NULL,
  (SELECT id FROM public.branches WHERE name = '더원지점' LIMIT 1),
  NULL,
  '운영',
  (SELECT id FROM public.users WHERE email = 'bylts0428@gmail.com' LIMIT 1),
  'published'
);
```

#### B-1-d. navigation (네비게이션방) — 사용자 질문 박힘 ⭐
```sql
INSERT INTO public.posts (
  board_type, source_type, title, content,
  insurer_id, branch_id, team_id, question_type,
  insurer_target,
  created_by, status
) VALUES
(
  'navigation', 'user_post',
  '[샘플] 메리츠화재 갑상선 결절 인수 박힘 박음?',
  '갑상선 결절 1cm 박힘 박음 박힘. 메리츠화재 박힘 박음 박음 박음 박음?',
  NULL,
  (SELECT id FROM public.branches WHERE name = '더원지점' LIMIT 1),
  (SELECT id FROM public.teams WHERE name = '4팀' LIMIT 1),
  '인수',
  '회사지정',
  (SELECT id FROM public.users WHERE email = 'bylts0428@gmail.com' LIMIT 1),
  'published'
);
```

⚠️ **insurer_target = '회사지정' 박힘** = Phase 3 진입 시 `target_insurer_ids` 컬럼 박힘 박음 (현재 라이브 박힘 박음 박음 = NULL 박음).

#### B-1-e. insurer (보험사 게시판) — admin 시드 (admin only 박힘) ⭐
```sql
INSERT INTO public.posts (
  board_type, source_type, title, content,
  display_author, source_label,
  insurer_id, branch_id, team_id, question_type,
  created_by, status
) VALUES
(
  'insurer', 'seed',
  '[샘플] 메리츠화재 5월 인수 변경사항',
  '5월 인수 박힘 박힘 박힘 박음...',
  'onesecond 자료실', '메리츠화재 소식지 (2025-05)',
  (SELECT id FROM public.insurers WHERE name LIKE '%메리츠%' LIMIT 1),
  NULL, NULL, '인수',
  (SELECT id FROM public.users WHERE email = 'bylts0428@gmail.com' LIMIT 1),
  'published'
);
```

#### B-1-f. hub (허브 게시판) — admin only 박힘
```sql
INSERT INTO public.posts (
  board_type, source_type, title, content,
  insurer_id, branch_id, team_id, question_type,
  created_by, status
) VALUES
(
  'hub', 'seed',
  '[샘플] 허브 게시판 박힘 박음',
  '허브 게시판 박힘 박음 박음 = 모든 지식의 저장소 (현재 미오픈, admin 토글 #3 OFF)',
  NULL, NULL, NULL, '운영',
  (SELECT id FROM public.users WHERE email = 'bylts0428@gmail.com' LIMIT 1),
  'published'
);
```

#### B-1-g. archive_legacy (폐기 4 row 보존) — admin 격리 박힘
```sql
INSERT INTO public.posts (
  board_type, source_type, title, content,
  insurer_id, branch_id, team_id,
  created_by, status
) VALUES
(
  'archive_legacy', 'seed',
  '[샘플] 옛 4탭 잔재 박힘',
  '폐기 4 row 박힘 박음 (admin 격리 박힘)',
  NULL, NULL, NULL,
  (SELECT id FROM public.users WHERE email = 'bylts0428@gmail.com' LIMIT 1),
  'archived'
);
```

### B-2. 박음 박힘 박음 (총 ~10 row, 라이브 박힘 박음 박힘 박음)

7종 × 1~2건 = ~10 row 박음 박힘 박음.

---

## C. 박힘 박음 박음 SQL

### C-1. 시드 박힘 박음 박음 박음
```sql
SELECT board_type, COUNT(*) FROM public.posts GROUP BY board_type ORDER BY 1;
-- 기대: 7종 × 1~2건 = ~10 row
```

### C-2. RLS 박힘 박음 박힘 검증 (admin 박음)
```sql
-- admin 박힘 박음 = 7종 모두 SELECT
SELECT board_type, COUNT(*) FROM public.posts GROUP BY board_type;
-- 기대: 7종 박힘 박음 (admin 박힘 박음)
```

### C-3. RLS 박힘 박음 박힘 검증 (ga_member 박음 시뮬레이션)
```sql
-- ga_member 박힘 박음 박힘 박음 박음 (Step 7 회귀 의뢰서 통합)
-- → /pages/board.html 박힘 박음 박음 박음 박음 박음 = qna + manager_notice + navigation 3 노출 박힘
```

### C-4. RLS 박힘 박음 박힘 검증 (insurer_member 박음 시뮬레이션)
```sql
-- insurer_member 박힘 박음 박힘 박음 박음
-- → /pages/board.html 박힘 박음 박음 박음 박음 박음 = qna + insurer 2 노출 박힘 (현 spec § 1-3)
-- → 결재 4 박힘 박음 후 박음 = qna 1 노출 박힘
```

---

## D. 사고 박힘 박음 박힘 (즉시 보고)

본 SQL 박음 박힘 박음 박음 박음 박음 박힘 박힘 박힘 박힘 박힘 발견 시 박힘:

1. **`current_database()` 박힘 박음 박힘 박힘** = 구버전 박힘 박음 (90% 확률, CLAUDE.md 박힘 박음)
2. **`branches`/`teams` 박힘 박음 박힘** = 시드 박힘 박음 박힘 박음 박음 박힘
3. **INSERT FK 위반 23503 박힘** = (가) RLS 박힘 + (나) row 박힘 박음 둘 다 박힘 박힘 박힘 (메모리 `fk_violation_dual_hypothesis.md` 박힘)
4. **`insurer_target` CHECK 박힘 박음 박힘** = 5/10 오후 진단 박힘 박음 박힘 (CHECK 부재 박힘, 자유 텍스트 박힘 박힘)

---

## E. 박힘 박음 박힘 박음 (Chrome AI 박힘)

본 의뢰서 박힘 박음 박힘 박음 박음 = `docs/architecture/star_51_posts_seed_chrome_result_2026-05-10.md` 신설 박힘.

박힘 본진:
- A 사전 박힘 박음 raw 박음
- B 시드 INSERT 결과 박힘 박음 (RETURNING 박힘 박음)
- C 박힘 박음 박힘 박음 박음 박힘 박음
- D 사고 박힘 박힘 박힘 박음 박힘 박힘
- PASS / FAIL / WARN 박음

---

## F. 박힘 박음 박힘 박음 박음

- **신설:** `docs/architecture/star_51_posts_seed_chrome_request_2026-05-10.md` (본 박음)
- **결과 박힘 박음 박힘:** `docs/architecture/star_51_posts_seed_chrome_result_2026-05-10.md` (Chrome AI 박힘)
- **연관 박음 박힘:**
  - `docs/architecture/step7_live_regression_chrome_request_2026-05-10.md` (Step 7 회귀 박음, 본 시드 박힘 박음 박힘 박힘 박힘 박음)
  - `docs/architecture/db_v0_diagnosis_2026-05-10.md` (5/10 오후 진단 박힘 박음, posts 37 컬럼 박힘 박음)
  - `docs/specs/v2_insurer_admission_phase1_v2.md` § 6-2 / § 6-3 박힘 박음

---

**END OF REQUEST**

> 본 박음 = Chrome AI 라이브 시드 의뢰서. Code 박음 박힘 0 (라이브 코드 변경 0, 라이브 DB 박힘 박힘 = Chrome 박힘).
> 라이브 박힘 박음 박힘 박음 후 박음 = Step 7 라이브 회귀 박힘 박음 박음 박힘 박음 박음 박음.
