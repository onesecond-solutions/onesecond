# v2.0 원수사 입점 모델 — Phase 1 통합 spec

> **spec명:** `docs/specs/v2_insurer_admission_phase1_v1.md`
> **작성일:** 2026-05-07
> **진실 원천 (현행):** `docs/strategy/onesecond_os_definition_v2_2026-05-07.md` (540줄, v2 OS 정의)
> **진실 원천 (폐기 v1):** `docs/strategy/onesecond_phase1_definition_20260507.md` (521줄, 헤더 표시) — 이력 보존용
> **상태:** Phase 1 spec 명문화 완료. 본 spec ↔ 진실 원천 v2 충돌 시 **진실 원천 v2 우선**.
> **메인 트랙 전환:** admin_v2 Phase D → **v2.0 원수사 입점 모델 Phase 1**
> **버전 진화:** v1.0 (본 spec) → v1.5 (Phase 2 진입 시) → v2.0 (admin_v2 D-10 가동 시)
> **OS 정의 정합:** 본 spec은 v2 PART C (Phase 1 정합 매트릭스) 검증 통과 — 작업 명세 변경 0

---

## 📑 본문 구성

| § | 섹션 | 내용 |
|---|---|---|
| 0 | 정합성 검증 결과 | 진실 원천 통독 + 폐기 대상 raw 검증 + 메인 트랙 전환 |
| 1 | 결정 통보 정리 | 4번 의뢰 결정 4건 + 5번 의뢰 결정 3건 + 추가 검토 6건 |
| 2 | v1.0 (Phase 1) 작업 명세 | 16단계 작업 + DB 골격 + 라우팅 + 4중 방어 |
| 3 | v1.5 (Phase 2) 향후 메타 | Quick 메뉴 §결제·연락처·BMI 마이그레이션 |
| 4 | v2.0 향후 메타 | metadata JSONB → 별도 3 테이블 분리 |
| 5 | 9역할 RBAC 정합 매트릭스 | 9역할 × Phase 1 영역 권한표 |
| 6 | RLS 정책 매트릭스 | posts / users / insurers 테이블 RLS 골격 |
| 7 | 위험·작업 순서·세션 분배 | 12건 위험 + 16단계 + 10.4세션 분배 |

---

# § 0. 정합성 검증 결과

## 0-1. 진실 원천 문서 통독

**경로:** `docs/strategy/onesecond_phase1_definition_20260507.md` (521줄, commit `c6359b4` 2026-05-07)

본 spec의 모든 결정은 진실 원천 문서 PART 1~12 기반. 본 spec과 진실 원천 사이 충돌 시 **진실 원천 우선**.

## 0-2. 메인 트랙 전환 신호

| 시점 | 메인 트랙 |
|---|---|
| 5/1~5/6 | admin_v2 Phase D (D-1~D-6 종료, D-9 Step 1·1.6·2~4 종료) |
| **5/7 이후 (본 spec)** | **v2.0 원수사 입점 모델 Phase 1** |
| admin_v2 Phase D 잔여 | 본 트랙 작업과 **융합 진행** (별 후순위 분리 X) |

## 0-3. 폐기 대상 문서 raw 검증

| 폐기 대상 | 실제 위치 | 처리 |
|---|---|---|
| `20260418_board_tab_visibility.md` | `claude_code/_instructions/20260418_board_tab_visibility.md` | 헤더 표시 |
| `20260419_index_together_section.md` | `claude_code/_instructions/20260419_index_together_section.md` | 헤더 표시 |
| `01_RULES_AND_STANDARDS.md` | ❌ **본 PC + GitHub 부재** | 진실 원천 명시 항목이나 실재 없음 — 보고만 |
| `supabase_schema.md` | `claude_code/_docs/supabase_schema.md` | 헤더 표시 (Phase 1 신규 컬럼 미반영) |

## 0-4. 추가 발견 — 재정의 후보 (의뢰서 명시 외)

| 추가 후보 | 위치 | 사유 |
|---|---|---|
| `00_MASTER.md` | `claude_code/_context/00_MASTER.md` | 메인 컨텍스트 — 4탭/9역할 차등 명시 가능성 |
| `onesecond_context_update_20260419_evening.md` | `claude_code/_instructions/` | 구 컨텍스트 업데이트 |

→ 추가 후보 2건은 **팀장님 결정 후 처리**. 본 spec 작성 단계에서는 4건(의뢰서 명시) + 발견 사항 보고로 한정.

## 0-5. 4탭·5등급·교차보조 키워드 세션 요약 (보존 대상)

`docs/sessions/` 인계 노트 5건 (2026-04-25 / 2026-04-28 / 2026-05-04 / 2026-05-05 / COWORK_ONBOARDING)에 키워드 매칭. 인계 노트는 **이력 보존 대상**이므로 폐기 X. 본 spec이 진실 원천임을 _INDEX.md 헤더에 명시.

## 0-6. 9역할 RBAC 정합

CLAUDE.md § role 체계 + `docs/role_system.md` 그대로 활용:

| 구분 | role | 비고 |
|---|---|---|
| 플랫폼 | `admin` | 전역 권한 (화면설정 무시 대상) |
| GA | `ga_branch_manager` / `ga_manager` / `ga_member` / `ga_staff` | 설계사 영역 |
| 원수사 | `insurer_branch_manager` / `insurer_manager` / `insurer_member` / `insurer_staff` | 보험사 영역 (본 spec) |

→ Phase 1은 9역할 RBAC 변경 없음. 게시판 권한 매트릭스(2-3절)와 RLS 정책(§6)에서 9역할 활용.

## 0-7. 메모리 정합성

| 메모리 | 정합 |
|---|---|
| `feedback_no_external_deadline.md` | ✅ 외부 마감 압박 X (4팀 5/15 = 내부 일정) |
| `project_role_bypass_policy.md` | ✅ 화면설정 무시 = admin만 (변경 없음) |
| `project_quick_vs_quick_menu_separation.md` | ✅ Quick 메뉴 vs 빠른실행 분리 (Phase 1 영향 0) |
| `project_quick_overlay_v2_spec.md` | ✅ 5/7 빠른실행 트랙 종료 (본 spec과 별개) |

→ 메모리 충돌 0. Phase 1 진입 가능.

---

# § 1. 결정 통보 정리

## 1-1. 4번 의뢰 결정 4건 (게시판·6필드 결정)

| # | 결정 | 채택 | 폐기 |
|---|---|---|---|
| 1 | C 항목(인수질문 7필드) — 6필드 직접 입력 | ✅ 연령/성별/병력/진단시기/약복용/현재상태 자유 텍스트 | Code 권고 (a) "7필드 폼 폐기, 자유 케이스 패턴" |
| 2 | 보험사 게시판 — 물리적으로 독립된 페이지 | ✅ `/insurer/{slug}` 동적 라우팅 | 단일 테이블 RLS 필터링 |
| 3 | 회원가입 진입 동선 — (b) 일반 폼 첫 단계 분기 | ✅ 설계사 / 보험사 임직원 분기 | (a) 별도 버튼, (c) 별도 URL, (d) 초대 링크 (v1.0 미채택) |
| 4 | 진입 시기 — 본 의뢰 최우선 트랙 | ✅ admin_v2 Phase D 잔여 융합 | 5/15 이후 진입 권고 |

## 1-2. 5번 의뢰 결정 3건 (방어·융합·Phase 분리)

| # | 결정 | 효과 |
|---|---|---|
| A | Supabase Auth 이메일 인증 추가 (4중 방어 격상) | 도메인 우회 차단 + 무료 보강 |
| B | admin Phase D 잔여 융합 (D-1/D-7/D-8/D-9/D-10/D-final) | 단순 합산 11.3 → 융합 8~10.4세션 |
| C | Quick 메뉴 통합 B안 (Phase 분리) | Phase 1 §원전산 1개 / Phase 2 §결제·연락처·BMI 안정화 후 |

## 1-3. 추가 검토 6건 답변 요약 (5번 의뢰 응답)

| # | 검토 항목 | 결정 |
|---|---|---|
| A | insurers 마스터 확장 구조 | v1.0 단일 컬럼 + admin_url / v1.5 metadata JSONB / v2.0 별도 3 테이블 |
| B | Phase 1 §원전산 전환 절차 | Step A·B·C·D 분할 (사전 분석 → DB INSERT → 코드 정합 → 라이브 회귀) |
| C | Phase 2 잔여 3탭 마이그레이션 일정 | 2.7세션 (결제 0.5 + 연락처 0.7 + BMI 0.5 + D-10 1.0) |
| D | Supabase Auth 이메일 인증 구현 절차 | Dashboard 설정 + 한국어 메일 템플릿 + status 흐름 |
| E | 융합 진행 작업 순서 재정렬 | 16단계 / 10.4세션 (§ 7-2) |
| F | 위험 요소 재평가 | 🔴 0 / 🟡 3 / 🟢 9 (§ 7-1) |

## 1-4. 4중 방어 (가짜 보험사 임직원 가입 방지)

```
1. 도메인 화이트리스트 (insurers.domain)
2. Supabase Auth 이메일 인증 ⭐ 신규
3. status='pending' (D-pre.5 활용)
4. 매니저 승인 (insurer_branch_manager 또는 admin)
```

## 1-5. 자동 차단 정규식 (질문 원문 + 답변 원문)

```
- 010-xxxx-xxxx (전화번호)
- YYMMDD-XXXXXXX (주민번호)
- 'XX시 XX동' (주소)
- 한국식 성+이름 (XX님 / XX씨 / XX 환자 호칭 제외)
- 이메일 주소 (선택, 케이스별 분기)
```

질문 원문 입력 시 인라인 토스트 차단 + 입력 안내 박스 + 작성 가이드 모달 (게시판 첫 진입 1회).

---

# § 2. v1.0 (Phase 1) 작업 명세

## 2-1. 사이드바 메뉴 구조 (확정)

```
[사이드바]
├─ 홈
├─ 스크립트
├─ 현장 Q&A          ← 게시판 + 네비게이션방 2탭
├─ 보험사 게시판      ← 보험사 임직원만 보임 (설계사 X)
├─ MY SPACE
├─ 보험뉴스
├─ Quick 메뉴
├─ 함께해요
└─ 관리자
```

**보험사 게시판 메뉴 분기 로직:**
- `users.role IN ('insurer_*' 4역할) OR role = 'admin'` → 표시
- 그 외 (`ga_*` 4역할) → 숨김
- 기존 `applyMenuSettings()` 패턴 정합

## 2-2. 현장 Q&A 내부 탭 (4탭 → 2탭)

```
[게시판] [네비게이션방]

[게시판] 탭 내부:
  - 매니저 공지사항 (단방향)
  - 현장 Q&A (양방향, 6필드 단계형 입력)
```

## 2-3. 권한 구조 (사이트 단위 단순화)

| 영역 | 쓰기 | 읽기 |
|---|---|---|
| 매니저 공지사항 | **매니저+** (admin / `*_branch_manager` / `*_manager` 6역할) | 전원 |
| 현장 Q&A | 전원 | 전원 (설계사는 보험사 글이 출처 뱃지로 섞여 보임) |
| 보험사 게시판 | **해당 보험사 임직원만** (`users.insurer_id = posts.insurer_id`) | **해당 보험사 임직원만 + admin** |

## 2-4. DB 스키마 변경 (마이그레이션 1건)

### 2-4-1. `insurers` 테이블 신설 (v1.0)

> **patched 2026-05-07** — Step A capture (`db_phase1_step_a_capture.md` § 2 결정 6) 반영. domain NOT NULL → nullable.

```sql
-- v1.0 (Phase 1) — 단순 컬럼만
CREATE TABLE insurers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,           -- 'meritz' / 'lotte' / 'db' / 'kb'
  name TEXT NOT NULL,                   -- '메리츠화재'
  type TEXT NOT NULL,                   -- '손해보험' / '생명보험'
  domain TEXT,                          -- '@meritzfire.com' (사후 admin 입력 — INSERT 시 NULL 허용)
  admin_url TEXT,                       -- §원전산 URL (Phase 1 진입)
  logo_url TEXT,
  brand_color TEXT,
  welcome_message TEXT,
  admin_email TEXT,                     -- 첫 매니저 식별 (파일럿)
  contract_start DATE,
  contract_end DATE,
  monthly_fee NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_insurers_slug ON insurers(slug);
CREATE INDEX idx_insurers_domain ON insurers(domain) WHERE domain IS NOT NULL;
```

### 2-4-2. `posts` 테이블 ALTER (Phase 1 정합화)

> **patched 2026-05-07** — Step A capture § 2 결정 1 반영. 라이브 5컬럼 보존 (patient_age/patient_gender/disease_name/diagnosis_timing/current_status) + spec 컬럼 정합화. 12 ADD → 6 ADD + 1 ALTER TYPE.

```sql
-- 라이브 5컬럼 보존 + spec 정합화
ALTER TABLE posts ALTER COLUMN patient_age TYPE TEXT;  -- integer → text (자유 입력 정합)

-- 신규 6 ADD (drug_usage / question_type / insurer_target / keywords / status / insurer_id)
ALTER TABLE posts ADD COLUMN drug_usage TEXT;          -- 자유 입력 (6필드 중 신규)
ALTER TABLE posts ADD COLUMN question_type TEXT;       -- '인수' / '상품' / '모름'
ALTER TABLE posts ADD COLUMN insurer_target TEXT;      -- '회사지정' / '손보전체' / '생보전체'
ALTER TABLE posts ADD COLUMN keywords TEXT[];          -- GIN 인덱스
ALTER TABLE posts ADD COLUMN status TEXT DEFAULT '답변대기';
ALTER TABLE posts ADD COLUMN insurer_id UUID REFERENCES insurers(id);
-- insurer_name (라이브 보존) = 캐시용 / insurer_id = FK (정규화)

CREATE INDEX idx_posts_keywords_gin ON posts USING GIN (keywords);
CREATE INDEX idx_posts_insurer_id ON posts(insurer_id);
CREATE INDEX idx_posts_question_type ON posts(question_type);

-- 6필드 라이브 정합 매트릭스:
-- 연령      → patient_age (text 변환)
-- 성별      → patient_gender (그대로)
-- 병력      → disease_name (그대로 — 의미 정합)
-- 진단시기   → diagnosis_timing (그대로)
-- 약복용    → drug_usage (신규)
-- 현재상태   → current_status (그대로)

-- board_type 의미 재정의:
-- - 'qna' (현장 Q&A) — 신규
-- - 'manager_notice' (매니저 공지사항) — 신규
-- - 'insurer' (보험사 게시판, insurer_id NOT NULL) — 'insurer_board' 정합화
-- - 'archive_legacy' (라이브 4 row 보존) — together 3 + team 1 마이그레이션
-- - 폐기: 'hub' / 'team' / 'branch' / 'insurer4' (기존 4탭, 데이터 부재)

-- 기존 board_type 4 row archive 처리
UPDATE posts SET board_type = 'archive_legacy' WHERE board_type IN ('together', 'team');
```

### 2-4-3. `users` 테이블 ALTER

```sql
ALTER TABLE users ADD COLUMN insurer_id UUID REFERENCES insurers(id);
-- NULL = 일반 사용자 / NOT NULL = 보험사 임직원

CREATE INDEX idx_users_insurer_id ON users(insurer_id);
```

### 2-4-4. RLS sweep (D-pre.7~.8 패턴 정합)

> ⚠️ **자기 참조 EXISTS 절대 금지** (D-pre.7 1차 사고 재발 방지). admin/role 검증은 `is_admin()` SECURITY DEFINER 함수 표준.

§ 6 RLS 정책 매트릭스 참조.

## 2-5. 보험사 페이지 라우팅 ((3) 하이브리드)

```
pages/insurer.html (단일 파일, 동적 라우팅)
  - URL: /insurer/{slug}
  - JS 라우터에서 slug 파라미터 추출 → insurers WHERE slug = ? → name/logo/brand_color/welcome_message 동적 적용
  - posts WHERE insurer_id = (SELECT id FROM insurers WHERE slug=?)

URL 매칭:
  /insurer/meritz       → 메리츠화재 페이지
  /insurer/db           → DB손해보험 페이지
  /insurer/kb           → KB손해보험 페이지
  /insurer/lotte        → 롯데손해보험 페이지
  /insurer/samsung-fire → 삼성화재 페이지
  ... (insurers 테이블 활성 row 모두)
```

## 2-6. 보험사 회원가입 폼 ((b) 첫 단계 분기)

### 2-6-1. 진입 동선

```
[index.html 회원가입 클릭]
  ↓
첫 단계: [설계사로 가입]  [보험사 임직원으로 가입]
  ↓
[설계사] → 기존 가입 폼 (role='ga_member' 기본)
[보험사 임직원] → 보험사 가입 폼 (role='insurer_*' 기본)
```

### 2-6-2. 보험사 가입 폼 필드

| 필드 | UI | 검증 |
|---|---|---|
| 회사 | 드롭다운 (`insurers WHERE is_active`) | 도메인 자동 매칭 |
| 사번 | 자유 입력 | 매니저 승인 시 확인 |
| 직급 | 드롭다운 (사원/대리/과장/차장/부장/팀장/지점장/스텝/총무) | 9역할 자동 매핑 |
| 부서 | 자유 입력 | 검증 X |
| 회사 이메일 | 입력 | 도메인 화이트리스트 |
| 비번 | 입력 | 최소 8자 + 대문자/숫자 |

### 2-6-3. 직급 → 9역할 자동 매핑

| 직급 입력 | 자동 부여 role | 격상 조건 |
|---|---|---|
| 사원 / 대리 | `insurer_member` | — |
| 과장 / 차장 | `insurer_member` | 매니저 승인 시 격상 가능 |
| 부장 / 팀장 | `insurer_manager` | admin 승인 후 active |
| 지점장 / 본부장 | `insurer_branch_manager` | admin 직접 승인 (파일럿 첫 1명 = admin 직접 생성) |
| 스텝 / 총무 | `insurer_staff` | — |

→ 가입 시 보수적 부여 + `status='pending'` + 매니저 승인 시 직급 격상.

### 2-6-4. 4중 방어 가입 흐름

```
1. 사용자 가입 폼 제출
   - 클라이언트 검증: SELECT FROM insurers WHERE domain = email_domain (1차)
   - 매칭 X → 차단 + "이 회사는 입점되지 않았습니다" 토스트

2. supabase.auth.signUp({email, password})
   - Supabase Auth 자동 인증 메일 발송 (2차)
   - auth.users.email_confirmed_at IS NULL 상태

3. users 테이블 row 생성 (트리거 또는 직접 INSERT)
   - role = 'insurer_staff' 또는 'insurer_member' (보수적)
   - insurer_id = 매칭된 insurers.id
   - status = 'pending' (3차)

4. 메일 박스 → 인증 링크 클릭
   - auth.users.email_confirmed_at = now()
   - users.status = 'pending' 그대로 (매니저 승인 단계 진입)

5. 매니저 (insurer_branch_manager 또는 admin) admin_v2 D-1에서 pending 사용자 승인
   - 승인 → users.status = 'active' (4차 완료)
   - 거절 → users.status = 'suspended' 또는 row DELETE

6. 사용자 게시판 접근 가능 (RLS: status='active' 가드)
```

### 2-6-5. status 흐름표

| 단계 | `auth.users.email_confirmed_at` | `users.status` | 게시판 접근 |
|---|---|---|---|
| 가입 직후 | NULL | pending | ❌ |
| Auth 이메일 인증 후 | now() | pending | ❌ |
| 매니저 승인 후 | now() | active | ✅ |
| 정지 | now() | suspended | ❌ |

## 2-7. v1.0 파일럿 진입 (닭-달걀 문제 해결)

```
1. 팀장님이 보험사 1곳과 입점 계약 체결
2. admin이 직접 insurer_branch_manager 1명 수동 생성:

   INSERT INTO insurers (slug, name, type, domain, admin_url, ...)
   VALUES ('meritz', '메리츠화재', '손해보험', '@meritzfire.com', 
           'https://nsso.meritzfire.com/...', ...);

   INSERT INTO users (id, email, role, insurer_id, status)
   VALUES (gen_random_uuid(), 'admin@meritzfire.com',
           'insurer_branch_manager',
           (SELECT id FROM insurers WHERE slug='meritz'),
           'active');

3. 비번 1회용 발급 후 보험사 측에 직접 전달 (전화/이메일)
4. 그 매니저가 본인 회사 직원 가입 직접 승인 (1주일 안에 정착)
```

## 2-8. 6필드 단계형 입력 UI

### 2-8-1. 단계 흐름

```
Step 1. 질문 유형 (chip 큰 버튼)
  [📋 인수질문]  [📦 상품질문]  [❓ 잘 모르겠음]

Step 2-A (인수): 6필드 직접 입력 (자유 텍스트, 한 화면 스크롤)
  - 연령 / 성별 / 병력 / 진단시기 / 약복용 유무 / 현재상태

Step 2-B (상품): 카테고리 chip + 세부 자유 입력
  - 암 / 2대질병 / 수술비 / 종신 / 정기 / 실손 / 운전자 → 세부

Step 2-C (모름): 자유 입력만

Step 3. 질문 원문 (textarea)
  - 안내 박스: "환자 식별 정보(이름/생년월일/주소/전화번호) 입력 금지"
  - 정규식 자동 차단 (4종 패턴)
  - 차단 시 인라인 토스트

Step 4. 키워드 자동 추출 + 사용자 보충 (선택)
  - keywords TEXT[] 컬럼 저장
```

### 2-8-2. 게시판 첫 진입 1회 가이드 모달

원세컨드 무료 정체성 보호용 1회 가이드:
- 환자 식별 정보 입력 금지 안내
- 케이스 분류 정보 입력 가이드
- 상담 흐름 유지 원칙
- "다시 보지 않기" 체크박스 → localStorage 저장

## 2-9. 보험사 게시판 ↔ 현장 Q&A 미러링

```
posts.insurer_id 분기:
  - NULL = 현장 Q&A (board_type='qna') 또는 매니저 공지(board_type='manager_notice')
  - NOT NULL = 보험사 게시판 (board_type='insurer')

[보험사 임직원 화면]
  - 사이드바 보험사 게시판 표시
  - 본인 회사(users.insurer_id = posts.insurer_id) 페이지만 접근

[설계사 화면]
  - 사이드바 보험사 게시판 숨김
  - 현장 Q&A 목록에 보험사 글 섞여 노출 + [메리츠] [DB손보] 출처 뱃지
  - 출처 뱃지 = posts.insurer_id 가 NOT NULL 일 때 insurers.name 으로 렌더
```

---

# § 3. v1.5 (Phase 2) 향후 메타 보존

## 3-1. 진입 시점

4팀 오픈 (5/15) + 1주 안정화 후 (5/22 이후 권장).

## 3-2. 작업 범위

Quick 메뉴 §결제·연락처·BMI 3탭 마이그레이션:
- §보험회사 결제정보 (`scripts-data.js` 라인 21 + `quick_contents.payment_info`)
- §보험회사 (모니터링) 연락처 (`scripts-data.js` 라인 30 + `quick_contents.contact_info`)
- §회사별 BMI 심사기준 (`scripts-data.js` 라인 15 + `quick_contents.bmi_standard`)

## 3-3. DB 변경 — `insurers.metadata` JSONB 컬럼 추가

```sql
ALTER TABLE insurers ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
```

### 3-3-1. metadata JSONB 구조 예시

```json
{
  "bmi_standard": {
    "type": "range",
    "min": 17,
    "max": 27.99,
    "rejection": 28,
    "notes": "..."
  },
  "bmi_standard_alt_format": {
    "type": "by_gender",
    "male": "18~30",
    "female": "16~29"
  },
  "bmi_standard_disease_format": {
    "type": "by_disease",
    "암": "17~36 미만",
    "뇌/심장": "17~30 미만"
  },
  "payment_info": {
    "초회": "은행 모두 / 카드 계약자 명의",
    "이체일": [5, 10, 15, 20, 25],
    "납입관계": "본인+직계+제3자",
    "카드등록": "모든 카드 등록 가능",
    "승인일": [5, 11, 15, 21, 25]
  },
  "contacts": [
    { "type": "customer_center", "phone": "1577-XXXX", "hours": "평일 9~18시" },
    { "type": "incall", "phone": "...", "hours": "..." },
    { "type": "system", "phone": "...", "hours": "..." },
    { "type": "fax", "phone": "...", "hours": "..." }
  ]
}
```

## 3-4. 코드 정리

- `js/scripts-data.js` overlayContent 3 키 (§결제정보 / §연락처 / §BMI 심사기준) 폐기 또는 fetch 변환
- `quick_contents.payment_info` / `contact_info` / `bmi_standard` content_html 동적 생성 함수 또는 row 폐기

## 3-5. 추정 시간

| 항목 | 세션 |
|---|---|
| §결제정보 → metadata.payment_info | 0.5 |
| §연락처 → metadata.contacts | 0.7 |
| §BMI 심사기준 → metadata.bmi_standard | 0.5 |
| admin_v2 D-10 폼 편집 UI 보강 (JSONB 편집 가능) | 1.0 |
| **소계** | **2.7세션** |

---

# § 4. v2.0 향후 메타 보존

## 4-1. 진입 시점

admin_v2 D-10 보험사 입점 관리 본격 가동 + 보험사 입점 N개 도달 + 데이터 정규화 필요 시점.

## 4-2. metadata JSONB → 별도 3 테이블 분리

```sql
CREATE TABLE insurer_bmi_standards (
  insurer_id UUID PRIMARY KEY REFERENCES insurers(id),
  type TEXT NOT NULL,                   -- 'range' / 'by_gender' / 'by_disease'
  basic_range_min NUMERIC,
  basic_range_max NUMERIC,
  extra_charge_threshold NUMERIC,
  rejection_threshold NUMERIC,
  by_gender_male TEXT,
  by_gender_female TEXT,
  by_disease_data JSONB,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE insurer_payment_info (
  insurer_id UUID PRIMARY KEY REFERENCES insurers(id),
  initial_payment TEXT,                 -- '초회'
  transfer_days INTEGER[],              -- 이체일
  payment_relations TEXT,               -- 납입 가능 관계
  card_registration TEXT,               -- 카드 등록
  approval_days INTEGER[],              -- 승인일
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE insurer_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insurer_id UUID REFERENCES insurers(id),
  contact_type TEXT NOT NULL,           -- 'customer_center' / 'incall' / 'system' / 'fax' / 'etc'
  phone TEXT,
  hours TEXT,
  notes TEXT,
  sort_order INTEGER,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## 4-3. admin_v2 D-10 폼 편집 UI 정규화

- BMI 기준: type 분기 폼 (range / by_gender / by_disease)
- 결제 정보: 6 필드 정규 폼
- 연락처: 4종 정규 폼 + 1:N row 추가/삭제

## 4-4. 추정 시간

| 항목 | 세션 |
|---|---|
| metadata JSONB → 3 테이블 마이그레이션 | 0.5 |
| D-10 폼 편집 UI 정규화 | 1.0 |
| **소계** | **1.5세션** |

---

# § 5. 9역할 RBAC 정합 매트릭스

## 5-1. 9역할 × Phase 1 영역 권한표

| role | 사이드바 보험사 게시판 | 매니저 공지 쓰기 | 매니저 공지 읽기 | 현장 Q&A 쓰기 | 현장 Q&A 읽기 | 보험사 게시판 쓰기/읽기 | 회원가입 진입 | 회사 매핑 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|---|---|
| `admin` | ✅ 전사 | ✅ | ✅ | ✅ | ✅ | ✅ 전사 | (admin 직접 생성) | NULL or 전사 |
| `ga_branch_manager` | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | 설계사 폼 | NULL |
| `ga_manager` | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | 설계사 폼 | NULL |
| `ga_member` | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | 설계사 폼 (기본) | NULL |
| `ga_staff` | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | 설계사 폼 | NULL |
| `insurer_branch_manager` | ✅ 본인 회사 | ✅ | ✅ | ✅ | ✅ | ✅ 본인 회사 | 보험사 폼 (admin 승인) | `insurer_id` 필수 |
| `insurer_manager` | ✅ 본인 회사 | ✅ | ✅ | ✅ | ✅ | ✅ 본인 회사 | 보험사 폼 (매니저 승인) | `insurer_id` 필수 |
| `insurer_member` | ✅ 본인 회사 | ❌ | ✅ | ✅ | ✅ | ✅ 본인 회사 | 보험사 폼 (기본) | `insurer_id` 필수 |
| `insurer_staff` | ✅ 본인 회사 | ❌ | ✅ | ✅ | ✅ | ✅ 본인 회사 | 보험사 폼 | `insurer_id` 필수 |

## 5-2. 매니저 그룹 정의 (매니저 공지 쓰기 권한)

```
manager+ = admin 
        + ga_branch_manager + ga_manager 
        + insurer_branch_manager + insurer_manager
        (총 5역할 + admin = 6역할)
```

→ `is_manager()` SECURITY DEFINER 함수 신설 권장 (RLS 정책에서 활용).

## 5-3. 화면설정(applyMenuSettings) 무시 대상

- `admin` 만 화면설정 무시 (전체 메뉴 보임)
- 그 외 8역할 = 화면설정 적용 (admin_v2 D-9 § 1 메뉴 ON/OFF 토글 영향)
- 보험사 게시판 메뉴는 화면설정 + role 분기 둘 다 통과해야 표시

---

# § 6. RLS 정책 매트릭스

## 6-1. SECURITY DEFINER 헬퍼 함수

> **patched 2026-05-07** — Step A capture § 2 결정 5 반영. 신규 함수 4종 (insurer_board 정책 인라인 EXISTS 청산 추가).

```sql
-- 신규 함수 1. is_manager() — 매니저 공지 쓰기 권한 (admin + GA/insurer 매니저급 6역할)
CREATE OR REPLACE FUNCTION is_manager()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('admin', 'ga_branch_manager', 'ga_manager', 'insurer_branch_manager', 'insurer_manager')
  );
$$;

-- 신규 함수 2. is_insurer_employee() — insurer_* 4역할 (insurer_board 정책 청산용)
CREATE OR REPLACE FUNCTION is_insurer_employee()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('insurer_branch_manager', 'insurer_manager', 'insurer_member', 'insurer_staff')
  );
$$;

-- 신규 함수 3. is_insurer_manager() — insurer_branch_manager + insurer_manager (pending 승인용)
CREATE OR REPLACE FUNCTION is_insurer_manager()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('insurer_branch_manager', 'insurer_manager')
  );
$$;

-- 신규 함수 4. current_user_insurer_id() — 본인 회사 게시판 RLS용
CREATE OR REPLACE FUNCTION current_user_insurer_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT insurer_id FROM users WHERE id = auth.uid();
$$;

-- 기존 is_admin() 그대로 활용 (D-pre.7 신설)
```

## 6-2. `posts` 테이블 RLS 정책

```sql
-- SELECT 정책 4분기
-- 1) 현장 Q&A + 매니저 공지 = 인증 사용자 전체
CREATE POLICY posts_select_qna_notice ON posts FOR SELECT TO authenticated
USING (
  insurer_id IS NULL 
  AND board_type IN ('qna', 'manager_notice')
);

-- 2) 보험사 게시판 = 본인 회사 임직원만
CREATE POLICY posts_select_insurer ON posts FOR SELECT TO authenticated
USING (
  insurer_id IS NOT NULL 
  AND insurer_id = current_user_insurer_id()
);

-- 3) admin = 모든 글 읽기
CREATE POLICY posts_select_admin ON posts FOR SELECT TO authenticated
USING (is_admin());

-- INSERT 정책 3분기
-- 1) 매니저 공지 = manager+ 만
CREATE POLICY posts_insert_manager_notice ON posts FOR INSERT TO authenticated
WITH CHECK (
  board_type = 'manager_notice'
  AND is_manager()
);

-- 2) 현장 Q&A = 인증 사용자 전체 + status='active'
CREATE POLICY posts_insert_qna ON posts FOR INSERT TO authenticated
WITH CHECK (
  board_type = 'qna'
  AND insurer_id IS NULL
);

-- 3) 보험사 게시판 = 본인 회사 임직원 + status='active'
CREATE POLICY posts_insert_insurer ON posts FOR INSERT TO authenticated
WITH CHECK (
  board_type = 'insurer'
  AND insurer_id IS NOT NULL
  AND insurer_id = current_user_insurer_id()
);

-- 4) admin = 모든 INSERT
CREATE POLICY posts_insert_admin ON posts FOR INSERT TO authenticated
WITH CHECK (is_admin());

-- UPDATE / DELETE 정책: 본인 글 + admin (D-pre.7~.8 패턴 정합)
-- (자기 참조 EXISTS 절대 금지 — auth.uid() = author_id 또는 is_admin() 패턴)
```

## 6-3. `users` 테이블 RLS 정책

```sql
-- SELECT 정책: 본인 row + admin + insurer_branch_manager(본인 회사 임직원만)
-- (D-pre.7 SECURITY DEFINER 패턴 정합)

-- 본인 row 조회
CREATE POLICY users_select_self ON users FOR SELECT TO authenticated
USING (id = auth.uid());

-- admin = 모든 row 조회
CREATE POLICY users_select_admin ON users FOR SELECT TO authenticated
USING (is_admin());

-- insurer_branch_manager = 본인 회사 임직원 조회 (pending 승인용)
CREATE POLICY users_select_insurer_manager ON users FOR SELECT TO authenticated
USING (
  insurer_id IS NOT NULL
  AND insurer_id = current_user_insurer_id()
  AND EXISTS (
    SELECT 1 FROM users me 
    WHERE me.id = auth.uid()
    AND me.role IN ('insurer_branch_manager', 'insurer_manager')
  )
);
```

## 6-4. `insurers` 테이블 RLS 정책

```sql
-- SELECT: 인증 사용자 전체 (회원가입 드롭다운 + 라우팅용)
CREATE POLICY insurers_select_authenticated ON insurers FOR SELECT TO authenticated
USING (is_active = true);

-- admin = 모든 SELECT
CREATE POLICY insurers_select_admin ON insurers FOR SELECT TO authenticated
USING (is_admin());

-- INSERT / UPDATE / DELETE = admin만 (D-10 폼 편집은 admin_v2에서)
CREATE POLICY insurers_write_admin ON insurers FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());
```

## 6-5. RLS 사전 검증 표준 (D-pre.7~.8 정합)

> ⚠️ **자기 참조 EXISTS 절대 금지** (D-pre.7 1차 사고).
> ⚠️ **DB 메타 통과 ≠ 라이브 안전** (D-pre.7 학습).
> ⚠️ **같은 테이블 다른 cmd 정책에도 동일 패턴 잔존 가능** (D-pre.7 점검 3 사후 발견 학습).
> ⚠️ **사전 검증 단계 전수 sweep 필수** (D-pre.7~.8 정합).

신규 RLS 정책 적용 시:
1. SECURITY DEFINER 함수 (`is_admin()` / `is_manager()` / `current_user_insurer_id()`) 표준 활용
2. EXISTS 서브쿼리 사용 시 **다른 테이블만** 참조 (자기 참조 금지)
3. SELECT / INSERT / UPDATE / DELETE 4 cmd 모두 sweep 검증
4. 라이브 회귀 검증 5건 이상 (9역할 × 영역)

---

# § 7. 위험 요소 + 작업 순서 + 세션 분배

## 7-1. 위험 요소 매트릭스 (12건)

| # | 위험 | 결정 반영 | 강도 |
|---|---|---|---|
| 1 | 6필드 → 사용자 실 환자 정보 입력 | 정규식 차단 + 안내 박스 + 토스트 + 가이드 모달 | 🟢 낮음 |
| 2 | 가짜 보험사 임직원 가입 | 4중 방어 (도메인 + Auth + pending + 승인) | 🟢 낮음 |
| 3 | 첫 보험사 입점 닭-달걀 | admin 직접 매니저 생성 + 1주일 정착 | 🟡 중간 |
| 4 | admin Phase D 잔여 누락 | 융합 결정 → 자연 처리 | 🟢 낮음 |
| 5 | Quick §원전산 정리 누락 | Step A·B·C·D 분할 + raw 캡처 | 🟢 낮음 |
| 6 | Phase 2 진입 시점 | 5/22 이후 권장 | 🟢 낮음 |
| 7 | 9역할 + insurer_id + status RLS 복합 | D-pre.7~.8 패턴 정합 + 자기 참조 EXISTS 금지 | 🟡 중간 |
| 8 | Auth 메일 템플릿 누락 | 사전 커스터마이징 | 🟢 낮음 |
| 9 | board_type 의미 변경 시 데이터 손실 | Step A·B·C 분할 (D-pre.5/6 사고 재발 방지) | 🟡 중간 |
| 10 | D-9 Step 5 회신 컨텍스트 분산 | 30분 즉시 마무리 후 본 트랙 복귀 | 🟢 낮음 |
| 11 | metadata JSONB 회사별 다양성 (Phase 2) | type 키 분기 (range/by_gender/by_disease) | 🟢 낮음 |
| 12 | D-10 신설 작업 명세 부재 | 본 spec § 6-4 / § 4-3에서 v1.0 / v2.0 범위 명시 | 🟢 낮음 |

**대형 위험(🔴) 0건. 🟡 중간 3건. 🟢 낮음 9건.**

## 7-2. Phase 1 작업 순서 (16단계)

| # | 단계 | 세션 | 본 spec § 참조 |
|---|---|---|---|
| 0 | spec 명문화 + _INDEX.md 메인 트랙 재정의 | 0.5 | 본 spec |
| 1 | (병행) D-9 Step 5 라이브 회귀 회신 마무리 | 별도 30분 | — |
| 2 | DB 마이그레이션 (insurers + posts ALTER + users.insurer_id + RLS sweep) | 1.0 | § 2-4, § 6 |
| 3 | Quick 메뉴 §원전산 전환 (Step A·B·C·D 분할) | 0.7 | § 2-5 |
| 4 | Supabase Auth 이메일 인증 ON | 0.3 | § 2-6-4 |
| 5 | 보험사 회원가입 폼 (4중 방어) | 1.0 | § 2-6 |
| 6 | 보험사 독립 페이지 (insurer.html 동적 라우팅) | 0.5 | § 2-5 |
| 7 | 게시판 2탭 재구조화 (board.html) | 1.0 | § 2-2, § 2-3 |
| 8 | 6필드 직접 입력 UI + 정규식 차단 | 1.5 | § 2-8 |
| 9 | 보험사 게시판 ↔ 현장 Q&A 미러링 | 1.0 | § 2-9 |
| 10 | admin_v2 D-1 보험사 필터 + pending 승인 | 0.5 | 융합 |
| 11 | admin_v2 D-9 § 3 재작업 | 0.3 | 융합 |
| 12 | admin_v2 D-10 보험사 입점 관리 신설 | 0.5 | 융합 |
| 13 | admin_v2 D-7 billing + 보험사 결제(월 100만원) | 0.3 | 융합 |
| 14 | admin_v2 D-8 dashboard + 보험사 입점 KPI | 0.5 | 융합 |
| 15 | admin_v2 D-final + RLS 통합 sweep | 0.3 | § 6-5 |
| 16 | 라이브 회귀 + 9역할 종합 검수 | 0.5 | § 5 |
| | **소계** | **10.4세션** | |

## 7-3. Step A·B·C·D 분할 패턴 (DB 작업 전건 적용)

D-pre.5 / D-pre.6 / D-pre.7 / D-pre.8 사고 재발 방지 패턴 정합:

```
Step A — 사전 분석 + raw 캡처 (코드 / DB 변경 0건)
  - 진단 SQL 발행 (크롬 의뢰서)
  - raw 캡처 + 매트릭스 작성
  - 결정 항목 명문화

Step B — DB 변경 (트랜잭션 1건)
  - DDL / ALTER / RLS 분할 실행
  - 사후 즉시 검증 SQL

Step C — 사후 검증 (코드 0건)
  - 메타 조회 (information_schema / pg_policies)
  - 의도 vs 실 결과 매트릭스 비교

Step D — 라이브 검증 (라이브 사이트)
  - 9역할별 진입 회귀 (5건 이상)
  - 사고 신호 즉시 정지 표준
```

## 7-4. 진실 원천 우선 원칙

본 spec ↔ 진실 원천 (`docs/strategy/onesecond_phase1_definition_20260507.md`) 충돌 시 **진실 원천 우선**.

본 spec 작성 후 진실 원천 변경 시 spec 갱신 의뢰 필요.

## 7-5. 외부 마감 압박 단어 사용 금지

메모리 `feedback_no_external_deadline.md` 정합:
- 4팀 5/15 오픈 = 내부 일정. 외부 마감 압박 X
- 사용자 0명 = 호환성 걱정 0 환경 = 라이브 전면 개편 가능
- "5/15 까지 ~" "5/14 데드라인" 같은 표현 금지

---

# § 8. 다음 단계 진입 준비

## 8-1. 본 spec 승인 후 진입

본 spec 작성 완료 후 팀장님 검토 + 승인 → Step 2 (DB 마이그레이션) 별도 의뢰서 발송.

## 8-2. Phase 1 진입 체크리스트

- [ ] 본 spec (`v2_insurer_admission_phase1_v1.md`) 작성 완료
- [ ] `docs/sessions/_INDEX.md` 메인 트랙 재정의 완료
- [ ] 폐기 대상 문서 헤더 표시 완료
- [ ] 팀장님 spec 검토 + 승인
- [ ] 추가 폐기 후보 (`00_MASTER.md` / `onesecond_context_update_20260419_evening.md`) 처리 결정
- [ ] D-9 Step 5 라이브 회귀 회신 (별도 트랙)
- [ ] Step 2 (DB 마이그레이션) 의뢰서 발송 → Phase 1 본격 진입

---

**END OF SPEC**

> 본 spec은 v2.0 원수사 입점 모델 Phase 1의 통합 명세서입니다.
> 본 spec과 충돌하는 기존 문서·코드는 모두 본 spec 우선 (진실 원천 `onesecond_phase1_definition_20260507.md` 다음 단계).
> Phase 1 본격 진입은 spec 승인 + DB 마이그레이션 의뢰서 발송 후.
