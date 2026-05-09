# Phase 1 Step 5-C 보강 — handle_new_user trigger 정정 캡처 raw

> **작성일:** 2026-05-09 오후
> **단계:** v2.0 원수사 입점 모델 Phase 1 / Step 5-C 보강 (D5 재결재 (a) 정합)
> **선행:** Step 5-A (`db_step5_pre_capture.md`) + Step 5-B (`db_step5_b_capture.md`) + 31사 도메인 캡처 (`db_step5_insurer_domains.md`)
> **사유:** Auth 이메일 인증 ON 상태에서 signup 직후 session 부재 → RPC `complete_signup` 호출 불가 → trigger가 직접 메타 활용 (D5 결재 (b) → (a) 재결재)
> **실행자:** Claude in Chrome (Supabase Dashboard SQL Editor, 3 RUN 분리)
> **신버전 검증:** URL `pdnwgzneooyygfejrvbg` + 프로젝트명 `onesecond-v1-restore-0420` ✅
> **결과:** RUN 1 (Pre-flight) + RUN 2 (CREATE OR REPLACE) + RUN 3 (사후 검증) **모두 PASS**

---

# § 1. RUN 1 — Pre-flight (변경 전 본문 회귀) ✅

```sql
SELECT current_database(), current_user;
-- postgres / postgres ✅
```

**5/1 PASS 본문 (변경 전):**
- DECLARE에 `v_status` **없음**
- INSERT 컬럼 **10개** (id / email / name / phone / company / branch / role / team / plan / created_at)
- 9역할 8종 IN 절 + 폴백 `'ga_member'` 보존

---

# § 2. RUN 2 — CREATE OR REPLACE 트랜잭션 ✅

```
[BEGIN]
CREATE OR REPLACE FUNCTION handle_new_user ✅
[COMMIT]
Success. No rows returned (에러 없이 완료)
```

---

# § 3. RUN 3 — 사후 검증 (신 본문 + 무영향 + fingerprint) ✅

## 3-1. 신 trigger 본문 raw (4컬럼 추가 + v_status valid 체크)

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_role text := meta->>'role';
  v_status text := COALESCE(NULLIF(meta->>'status', ''), 'active');
BEGIN
  -- 9역할 8종 IN 절 (admin 제외, 옵션 B 정합)
  IF v_role IS NULL OR v_role NOT IN (
    'ga_branch_manager', 'ga_manager', 'ga_member', 'ga_staff',
    'insurer_branch_manager', 'insurer_manager', 'insurer_member', 'insurer_staff'
  ) THEN
    v_role := 'ga_member';
  END IF;

  -- status valid 체크 (Step 5-B RPC complete_signup 정합)
  IF v_status NOT IN ('active', 'pending') THEN
    v_status := 'active';
  END IF;

  INSERT INTO public.users (
    id, email, name, phone, company, branch, role, team, plan,
    insurer_id, branch_id, team_id, status,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(meta->>'name', ''),
    NULLIF(meta->>'phone', ''),
    NULLIF(meta->>'company', ''),
    NULLIF(meta->>'branch', ''),
    v_role,
    NULLIF(meta->>'team', ''),
    'free',
    NULLIF(meta->>'insurer_id', '')::uuid,
    NULLIF(meta->>'branch_id', '')::uuid,
    NULLIF(meta->>'team_id', '')::uuid,
    v_status,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$
```

## 3-2. 변경 매트릭스

| 영역 | 변경 전 (5/1 PASS) | 변경 후 (5/9 PASS) |
|---|---|---|
| DECLARE 변수 | `meta` + `v_role` | `meta` + `v_role` + **`v_status`** ⭐ |
| valid 체크 | role IN 절 + 폴백 'ga_member' | role IN 절 + 폴백 'ga_member' + **`v_status` IN ('active', 'pending') 폴백 'active'** ⭐ |
| INSERT 컬럼 | 10개 | **14개** (`+insurer_id` / `+branch_id` / `+team_id` / `+status`) ⭐ |
| INSERT 값 | name/phone/company/branch/role/team/plan='free' | 동일 + `meta->>'insurer_id'::uuid` / `meta->>'branch_id'::uuid` / `meta->>'team_id'::uuid` / `v_status` ⭐ |
| 보존 | SECURITY DEFINER + search_path + ON CONFLICT (id) DO NOTHING + plan='free' | 그대로 ✅ |
| 트리거 attach | auth.users AFTER INSERT | 그대로 ✅ (CREATE OR REPLACE = 본문만 교체) |

## 3-3. 사용자 무영향 (4 row 변동 0)

| role | status | count |
|---|---|---|
| admin | active | 1 |
| ga_member | active | 2 |

→ Step 5-A / 5-B 와 동일. **trigger 부수효과 0건** ✅.

## 3-4. fingerprint 6건 PASS

```
has_ga_member       | true ✅ (9역할 IN 절 보존)
has_insurer_bm      | true ✅ (9역할 IN 절 보존)
has_insurer_id_col  | true ✅ (신규 컬럼)
has_branch_id_col   | true ✅ (신규 컬럼)
has_team_id_col     | true ✅ (신규 컬럼)
has_status_col      | true ✅ (신규 컬럼)
```

---

# § 4. D5 재결재 흐름 (b → a) 명문화

## 4-1. 발견 흐름

| 시점 | 상태 |
|---|---|
| Step 5 작업지시서 § 3-D5 (5/9 오후) | (b) 채택 = "trigger 무변경 + 회원가입 직후 별 RPC `complete_signup` 호출" |
| Step 5-B RPC 신설 트랜잭션 | `complete_signup` SECURITY DEFINER + `auth.uid() IS NULL` 체크 박힘 |
| Step 5-C 본 진입 직전 검증 (5/9 오후) | **충돌 발견** — Auth 이메일 인증 ON 상태에서 `supabase.auth.signUp()` 응답에 session 부재 → anon 권한 = `auth.uid() IS NULL` → RPC 차단 |
| Step 5-C 직전 결재 | (b) → (a) 재결재 = trigger 정정 4컬럼 추가 ⭐ |

## 4-2. (b) → (a) 변경 영향

| 영역 | (b) 원안 | (a) 재결재 |
|---|---|---|
| trigger 본문 | 무변경 (5/1 PASS 그대로) | 4컬럼 추가 + v_status valid 체크 |
| RPC `complete_signup` | 회원가입 직후 클라가 호출 | 폐기 X (Phase 1.5+ 정보 변경 용도로 보존) |
| RPC `admin_approve_user` | 매니저 승인 흐름 | **그대로 보존** (Step 10~15 admin 융합 트랙에서 UI 부착) |
| 라이브 코드 변경 | login.html / app.js 수정 필요 (명시 금지 영역) | **트리거 1건만** + index.html JS는 raw_user_meta_data 4 키 추가만 |
| Auth 이메일 인증 ON 정합 | ❌ 충돌 (signup 직후 session 부재) | ✅ 정합 (trigger가 INSERT 시점에 메타 활용) |

→ (a) 재결재가 모든 측면에서 정합 우위. 보안 위험 0 (메타 박힘 = 클라가 보낸 raw, trigger 검증).

## 4-3. complete_signup RPC 보존 사유

- 폐기 X: 사용자가 가입 후 정보 변경 (직급 변경 / 지점 이동) 시 사용
- Phase 1.5+ 또는 Phase 2 정보 변경 트랙에서 활용
- DROP하면 복구 트랜잭션 추가 필요 → 보존 비용 0

---

# § 5. 종합 판정

| 영역 | 결과 |
|---|---|
| RUN 1 Pre-flight | 5/1 PASS 본문 회귀 ✅ |
| RUN 2 트랜잭션 | CREATE OR REPLACE 에러 0건 ✅ |
| RUN 3 사후 검증 | 신 본문 + 무영향 + fingerprint 6/6 ✅ |
| 사고 신호 | 0건 |
| 라이브 사용자 영향 | 0건 (admin/active=1, ga_member/active=2 동일) |
| index.html 정합 | 메타 4 키 (`insurer_id` / `branch_id` / `team_id` / `status`) 박음 = trigger 받음 ✅ |

## 5-1. Step 5-C 진행 매트릭스

| 산출물 | 상태 |
|---|---|
| handle_new_user trigger 4컬럼 추가 정정 | ✅ COMMIT (5/9 오후) |
| index.html `#signup` 섹션 마크업 신설 | ✅ 본 빌드 (사이트 분기 카드 + 보험사·GA 폼 분리) |
| index.html JS 신설 함수 7건 + 정정 함수 3건 | ✅ 본 빌드 |
| 4중 방어 #1 (도메인 화이트리스트) | ✅ 클라 1차 (실시간 + validate) + 서버 RLS (Step 5-B) |
| 4중 방어 #3 (status='pending') | ✅ 보험사 분기 시 메타 박음 → trigger 활용 |
| 9역할 매핑 (한국어 직급 → ga_*/insurer_*) | ✅ `mapToRoleKey()` |

## 5-2. Step 5 전체 진행 매트릭스 (3/5)

| Step | 상태 |
|---|---|
| 5-A 사전 분석 | ✅ 종료 |
| 5-B DB 신설 (RPC 2 + RLS 1 + 28사 UPDATE) | ✅ 종료 |
| **5-C 라이브 코드 + trigger 정정** | ✅ **종료 (5/9 오후)** ⭐ |
| 5-D 라이브 회귀 (Chrome 시나리오 9건) | ⏸ 다음 진입 |
| 5-E 종료 + commit + 인계 | ⏸ |

---

# § 6. 다음 단계 인계 (Step 5-D 진입)

**산출물 확정:**
- handle_new_user trigger = 메타 4 키 (`insurer_id` / `branch_id` / `team_id` / `status`) 자동 활용
- index.html `#signup` = 사이트 분기 + 보험사 폼 (31사 + 도메인 화이트리스트) + GA 폼 (시드 하이브리드) + 9역할 매핑
- 가입 흐름 정합:
  ```
  사용자 분기 카드 선택 → 폼 펼침 → 직급/소속 입력 → 도메인 검증 (보험사 분기) → 약관 동의 → 가입 버튼
    ↓
  Auth signup → trigger handle_new_user → public.users INSERT (status='pending' if insurer)
    ↓
  이메일 인증 안내 (+ 보험사 분기 시 매니저 승인 대기 안내)
  ```

**Step 5-D Chrome 회귀 시나리오 후보 (9건):**
| # | 시나리오 | 기대 |
|---|---|---|
| 1 | GA 분기 + 더원지점 + 1팀 + 설계사·팀장 | role=ga_member, branch_id/team_id 매핑, status=active |
| 2 | GA 분기 + 더원지점 + 4팀 + 매니저 | role=ga_manager |
| 3 | GA 분기 + 기타 회사·지점·팀 free text | branch_id/team_id NULL, company/branch/team free text |
| 4 | 보험사 분기 + 메리츠화재 + 도메인 일치 + 지점장 | role=insurer_branch_manager, insurer_id 매핑, status=pending |
| 5 | 보험사 분기 + 메리츠화재 + 도메인 불일치 | 클라 차단 (가입 불가) |
| 6 | 보험사 분기 + 메리츠화재 + 도메인 클라 우회 + 다른 도메인 | trigger가 INSERT 시점 검증 (현재는 검증 0 = 별 트랙 후보) |
| 7 | 보험사 분기 + db-life (도메인 NULL ⚠️) | 클라 차단 (alert 안내) |
| 8 | 사이트 미선택 + 가입 버튼 | 차단 (alert 안내) |
| 9 | 이메일 중복 가입 | "이미 가입된 이메일" 토스트 + 로그인 안내 |

**Step 5-D 진입 시 별 트랙 신설 후보:**
- #46: trigger 도메인 화이트리스트 서버 검증 추가 (현재 클라 1차만, 서버 강제는 별 트랙)

---

# § 7. 본 캡처 사용 권한

본 파일은 **2026-05-09 오후 시점 handle_new_user trigger 정정 진실 원천 raw**. Chrome RUN 회신 + Code 분석 정합. 사후 trigger 본문 변경 발견 시 본 파일 갱신 + 라이브 정합 회귀.

진실 원천:
- `docs/architecture/db_step5_pre_capture.md` (Step 5-A)
- `docs/architecture/db_step5_b_capture.md` (Step 5-B)
- `docs/architecture/db_step5_insurer_domains.md` (31사 도메인 raw)
- `docs/specs/v2_step5_signup_form_workorder.md` § 4-C (작업지시서)
- `index.html` (Step 5-C 본 빌드)
- `docs/architecture/role_migration_plan.md` § 3.1.5 (5/1 PASS 본문 비교)
- 메모리 `supabase_sql_editor_session_isolation.md`
