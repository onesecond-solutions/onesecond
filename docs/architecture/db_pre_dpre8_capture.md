# D-pre.8 — DB 정합 일괄 청산 캡처 (5항목)

> **작성:** Code (Claude Code) · **작성일:** 2026-05-03 · **트랙 상태:** ✅ 종료
> **방식:** Step A 사전 캡처 (SELECT 진단) → Step B+C 트랜잭션 (DROP/CREATE + 사후 검증) → COMMIT
> **변경:** DROP 9건 + CREATE 10건 = 합 19개 SQL 작업 / 트랜잭션 1건 / 5항목 청산

---

## 1. 배경 + 목표

### 발생 경위
- D-pre.7 종료 후 R6 sweep에서 다음 정합 부채 발견:
  - posts/scripts 정책에 `EXISTS (SELECT 1 FROM users WHERE role = 'admin')` 인라인 패턴 잔존 (D-pre.7 표준 `is_admin()` 미정합)
  - comments + posts(together) SELECT 정책에 `{anon}` 역할 포함 (브라우저 안에서는 fetchPublic 호출 0건이지만 API 직접 호출 잠재 노출)
  - script_usage_logs 정책명 구버전 네이밍(`admin_branch_manager_read_logs`) + 사용자 자기 row SELECT 정책 부재 (quick.html 라인 336 패널 일반 사용자 6역할 작동 X)
  - news_admin_all 인라인 EXISTS 패턴 (B와 동일)

### 목표
재오픈(v1.1, 5/10ish) 전 D-1 admin_v2 users 본 진입 100% 정합 보장 — DB 정합 부채 일괄 청산.

---

## 2. 변경 대상 5항목 정의

| # | 항목 | 영향 정책 | 작업 |
|---|---|---|---|
| **B** | posts/scripts admin 인라인 EXISTS → `public.is_admin()` 통일 | posts UPDATE/DELETE/INSERT/UPDATE 4건 + scripts ALL 1건 = 5건 | DROP + CREATE 5쌍 |
| **②** | comments + posts(together) anon 정책 제거 → `{authenticated}` 전용 | comments SELECT 1건 + posts SELECT 1건 = 2건 | DROP + CREATE 2쌍 (정책명 변경: `anyone can read ...` → `authenticated read ...`) |
| **⑤** | script_usage_logs 정책명 구버전 네이밍 정합화 | SELECT 1건 (이름만 변경, 의미 유지) | DROP + CREATE 1쌍 (이름: `admin_branch_manager_read_logs` → `admin_or_branch_manager_read_logs`) |
| **⑤-2** | script_usage_logs 사용자 자기 row SELECT 신설 | 신설 1건 | CREATE 1건 (`script_usage_logs_select_own` USING `(auth.uid())::text = user_id`) |
| **⑦** | news_admin_all 인라인 EXISTS → `public.is_admin()` 통일 | ALL 1건 (이름 유지) | DROP + CREATE 1쌍 |

**합:** DROP 9건 + CREATE 10건 = 19개 SQL 작업

---

## 3. Step A 사전 캡처 결과 (요약)

### A-1 변경 대상 정책 raw
- comments `anyone can read comments` SELECT `{anon, authenticated}` USING `true` ✅
- posts `anyone can read together posts` SELECT `{anon, authenticated}` USING `(board_type='together' AND is_hidden=false)` ✅
- script_usage_logs `admin_branch_manager_read_logs` SELECT 1건 + INSERT 1건 ✅
- news `news_admin_all` ALL 인라인 EXISTS admin 패턴 ✅

### A-2 `is_admin()` 함수 정합
- `is_security_definer = true` ✅
- `volatility = 's'` (STABLE) ✅
- D-pre.7 청산 결과 그대로 보존 확인

### A-3 `script_usage_logs.user_id` 타입
- `data_type = 'text'` 확정 → 캐스팅 우측 불필요 (`(auth.uid())::text = user_id`)

### 자기참조 패턴 0건 + 5역할 잔존 0건 + 정책 raw truncation 0건 → Step B+C 안전 진입 확정

---

## 4. Step B+C 트랜잭션 결과 (사후 18행 raw)

### COMMIT 확정
`txid_current_if_assigned() = NULL` → 열린 트랜잭션 없음 → COMMIT 완료 확정 ✅
크롬 SQL Editor에서 Destructive 경고 팝업 → "Run this query" 확인 → 19개 SQL 모두 성공 + 사후 검증 SELECT 18행 반환

### 사후 검증 18행 (5테이블)

| 테이블 | 정책수 | 정책명 / cmd / using·with_check 핵심 |
|---|---:|---|
| **comments** | 4 | own delete (auth.uid=author) / users insert (with_check auth.uid=author) / **authenticated read** (USING true) / own update (auth.uid=author) |
| **posts** | 7 | author or admin delete (`is_admin()`) / authenticated insert / **insurer_board_insert** (`is_admin() OR ARRAY[insurer_*4종]`) / read non-together (board_type<>'together') / **authenticated read together posts** (board_type='together') / author or admin update (`is_admin()`) / **insurer_board_update** (`is_admin() OR ARRAY[insurer_*4종]`) |
| **scripts** | 2 | **admin manage scripts** ALL (USING `is_admin()` + WITH CHECK `is_admin()`) / authenticated read (USING true) |
| **script_usage_logs** | 3 | users insert (WITH CHECK true) / **admin_or_branch_manager_read_logs** (USING `is_admin() OR ARRAY[ga_bm,insurer_bm]`) / **script_usage_logs_select_own** (USING `(auth.uid())::text = user_id`) |
| **news** | 2 | **news_admin_all** ALL (USING `is_admin()` + WITH CHECK `is_admin()`) / news_select_active (is_active=true) |

**굵게 = 본 트랙에서 신규 또는 재작성**

---

## 5. 정합 검증 — 기대 신호 vs 실제

| 항목 | 기대 | 실제 | 결과 |
|---|---|---|---|
| 자기참조(`EXISTS ... FROM 같은_테이블`) 잔존 | 0건 | 0건 | ✅ |
| 인라인 admin EXISTS 단독 패턴 잔존 (`role = 'admin'` 단독) | 0건 | 0건 (모두 `is_admin()`로 교체) | ✅ |
| comments SELECT roles | `{authenticated}`만 | `{authenticated}` | ✅ |
| posts(together) SELECT roles | `{authenticated}`만 | `{authenticated}` | ✅ |
| script_usage_logs SELECT 정책 | 2건 (rename + 자기 row) | 2건 | ✅ |
| news_admin_all USING + WITH CHECK | `is_admin()` | `is_admin()` 양쪽 | ✅ |
| 테이블별 정책 수 합 | 18 | 18 | ✅ |
| 5역할 잔존(`branch_manager`/`manager`/`member`/`staff` 단독) | 0건 | 0건 | ✅ |

→ **5항목 모두 통과. D-pre.8 정합 확정.**

---

## 6. 영향 범위

| 영역 | 영향 |
|---|---|
| admin 본 계정 | 모든 변경 정책에서 `is_admin()` 통과 → 영향 0 |
| 게시판 작성자 (일반 사용자) | posts UPDATE/DELETE는 `auth.uid() = author_id` 통과 → 영향 0 |
| 보험사 직원 4종 (insurer_*) | `insurer_board_insert/update`에서 ARRAY 4종 통과 → 의도 정합 |
| GA 직원 4종 (ga_*) | comments/posts 일반 작성·읽기 정책 통과 → 영향 0 |
| script_usage_logs 사용자 6역할 일반 | **🆕 자기 row SELECT 가능** → quick.html 라인 336 "🕐 최근 많이 본" 패널 작동 |
| comments anon 읽기 | **🚫 차단** (브라우저 영향 0 — fetchPublic 사용처 0건. API 직접 호출만 차단) |
| posts(together) anon 읽기 | **🚫 차단** (동일) |

---

## 7. 롤백 절차

각 항목별 Step A 사전 캡처 결과(`docs/architecture/db_pre_dpre8_capture.md` § 3 또는 크롬 결과 raw) 기반 원본 정책 재생성. 단순 흐름:

```sql
BEGIN;
-- 신규 정책 9건 DROP
DROP POLICY IF EXISTS "authenticated read comments" ON public.comments;
DROP POLICY IF EXISTS "authenticated read together posts" ON public.posts;
DROP POLICY IF EXISTS "admin_or_branch_manager_read_logs" ON public.script_usage_logs;
DROP POLICY IF EXISTS "script_usage_logs_select_own" ON public.script_usage_logs;
-- (B/⑦은 같은 정책명 재작성이라 별도 ROLLBACK SQL 필요)

-- 원본 정책 재생성 (Step A raw 기반 9건)
CREATE POLICY "anyone can read comments" ON public.comments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anyone can read together posts" ON public.posts FOR SELECT TO anon, authenticated USING (board_type='together' AND is_hidden=false);
-- ...
COMMIT;
```

---

## 8. 학습 / 잔존 사항

### 영구 학습 (D-pre.8 추가)
1. **다른 cmd 정책 잔존 sweep 표준 작동 검증** — D-pre.7 학습 #6 ("같은 테이블 다른 cmd 사각지대 — 사전 sweep 필수")이 본 트랙에서 정상 작동. R6에서 5테이블 sweep으로 누락 발견 → D-pre.8 청산 가능
2. **인라인 EXISTS admin → `is_admin()` 통일은 트랜잭션 한 묶음 안전** — 9 DROP + 10 CREATE 한 트랜잭션 + 사후 검증 SELECT까지 모두 정합. D-pre.7 학습 "한 묶음에 너무 많이 넣지 말 것"은 사각지대 위험 차원이지 트랜잭션 크기 차원 X
3. **partial 변경 (insurer_board의 admin 제거)이 정합 유지** — admin이 `is_admin()` 분기로 빠지고 ARRAY에는 insurer_* 4종만 남아도, OR 결합으로 의도 동일. 정책명 유지 가능

### 잔존 부채
| # | 항목 | 처리 시점 |
|---|---|---|
| 1 | post_reports 테이블 미존재 (사용자 신고 기능) | D-3 board 진입 시 (v1.1 스코프 외 확정) |
| 2 | exception_diseases 검색 차단 — UI 안내 페이지 | 별 트랙 (사용자 문의 발생 시) |
| 3 | admin.html / admin_v2.html admin role 클라이언트 게이트 | D-final 보안 검증 |
| 4 | noindex 메타 추가 | 별 트랙 (검색엔진 인덱싱 완전 차단) |

---

## 9. D-pre.8 종료 → 다음 트랙

```
🏁 D-pre 시리즈 모두 종료
   pre / .5 / .6 / .7 / .8 — 5단계 청산 완료

🏁 별 트랙 α (exception_diseases) 종료
🏁 별 트랙 β (pages 인증 게이트) 종료

────────────────────────────────────────
🟢 D-1 admin_v2 users 본 진입 100% 정합 보장
────────────────────────────────────────
   - users SELECT/UPDATE 정책 (D-pre.7) ✅
   - posts/scripts/comments/news/script_usage_logs 정합 (D-pre.8) ✅
   - 사용자 자기 사용 이력 작동 (script_usage_logs_select_own) ✅
   - is_admin() 표준 통일 (D-pre.7 + D-pre.8) ✅
   - 직접 URL 접근 차단 (별 트랙 β) ✅
   - 예외질환 검색 차단 (별 트랙 α) ✅

D-1 작업지시서 + 결정 8건은 이미 확정 — 다음 세션 Step 1 (`js/admin_v2.js` 신설) 즉시 진입 가능
```

---

*본 문서는 D-pre.8 단건 종료 캡처. 다음 트랙(D-1) 진입 시 본 문서 GitHub URL을 참조 인계 가능.*
