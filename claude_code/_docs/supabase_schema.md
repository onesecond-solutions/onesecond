# 원세컨드 Supabase 스키마

> Claude Code가 DB 관련 작업을 할 때 반드시 참조하는 문서
> 민감 정보·실제 데이터는 포함 안 함. **구조 정보만.**

**최종 수정:** 2026-04-20 (재설계 진행 중 — 현재 문서는 구버전 기준)

---

## ⚠️ 중요 — 2026-04-20 재설계 중

**이 문서의 구조는 "현재 실제 DB 상태"를 반영한 것이 아닐 수 있음.**

현재 우회 설계·부채 의심으로 전면 재점검 중:
- `auth_user_id` 레거시 컬럼 존재
- `handle_new_user` 트리거가 뒤늦게 추가된 상태
- RLS 정책이 기능 단위가 아닌 땜빵식 추가
- `comments` 테이블 실제 컬럼이 코드와 불일치 (`display_name`·`is_anonymous` 없음)
- `posts.user_id` 아닌 `author_id` 가 실제 컬럼명

**Claude Code는 작업 시 반드시 Claude in Chrome으로 실제 스키마 확인 우선.**

재설계 완료 시 이 문서 전면 개정.

---

## 연결 정보

| 항목 | 값 |
|---|---|
| Project URL | `https://qursjteiovcylqiepmlo.supabase.co` |
| anon key | `db.js` 파일 참조 |
| service_role key | ⚠️ GitHub에 올리지 말 것 |
| 대시보드 | https://supabase.com/dashboard/project/qursjteiovcylqiepmlo |
| 이메일 | Resend SMTP (`noreply@onesecond.solutions`) |

---

## REST API 기본 패턴

### 인증 포함 fetch (권장)
```javascript
const res = await window.db.fetch('/rest/v1/scripts?is_active=eq.true&select=id,title');
```

### 직접 fetch (참고용)
```javascript
const SUPABASE_URL = 'https://qursjteiovcylqiepmlo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_JG_lIUT7MjcLwel1oa-BZg_o_IDOCIL';

const res = await fetch(`${SUPABASE_URL}/rest/v1/scripts`, {
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${token}`
  }
});
```

---

## 정석 설계 기준 (재설계 목표)

### Auth ↔ public.users 연결
- `public.users.id` = `auth.users.id` (1:1, 동일 UUID)
- 외래키: `public.users.id REFERENCES auth.users(id) ON DELETE CASCADE`
- `auth_user_id` 같은 별도 컬럼 **사용 금지**

### 회원가입 플로우 (정석)
```
1. 클라이언트: supabase.auth.signUp() → auth.users INSERT
2. DB 트리거: handle_new_user() → public.users에 {id, email} 자동 INSERT
3. 클라이언트: 추가 프로필 정보 PATCH (UPDATE, INSERT 아님)
   PATCH /rest/v1/users?id=eq.{userId}
   { name, phone, company, branch, team, role }
```

### RLS 기본 패턴
```sql
-- SELECT: 본인 데이터만 읽기
CREATE POLICY "users read own" ON public.users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- UPDATE: 본인 데이터만 수정
CREATE POLICY "users update own" ON public.users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

### SECURITY DEFINER 함수 (admin 조회 시)
```sql
-- RLS 무한 재귀 방지용
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT role = 'admin' FROM public.users WHERE id = auth.uid();
$$;

CREATE POLICY "admin read all users" ON public.users
  FOR SELECT TO authenticated
  USING (is_admin());
```

---

## 핵심 테이블 (현재 구조, 재설계 대상)

### 1. `users` (사용자)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | Supabase Auth 연동 (정석: `auth.users(id)` FK) |
| `name` | text | 이름 |
| `email` | text | 로그인 이메일 |
| `role` | text | `member`/`manager`/`branch_manager`/`staff`/`insurer`/`admin` |
| `plan` | text | `free`/`pro` |
| `phone` | text | 전화번호 |
| `company` | text | 회사명 |
| `branch` | text | 지점 |
| `team` | text | 팀 |
| `created_at` | timestamptz | 가입일 |
| ⚠️ `auth_user_id` | uuid | **레거시 컬럼, 재설계 시 제거 예정** |

### 2. `scripts` (상담 멘트)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | int | PK |
| `title` | text | 스크립트 제목 |
| `top_category` | text | 최상위 분류 |
| `stage` | text | 10개 값 중 하나 |
| `type` | text | 하위 유형 |
| `script_text` | text | 본문 HTML |
| `highlight_text` | text | 강조 멘트 |
| `scope` | text | `global` 등 |
| `is_active` | bool | 활성 여부 |
| `is_leader_pick` | bool | 리더 추천 |
| `html_block_id` | int | HTML 백업 참조 |
| `is_sample` | bool | 샘플 여부 |
| `sort_order` | int | 정렬 (기본 999) |
| `user_id` | uuid | 작성자 (sample은 null) |

**stage 값 10개:**
```
opening              # 도입 인사
opening_rejection    # 관심 형성·도입 반론
need_emphasis        # 필요성 강조 1
situation_check      # 고객 상황 확인
analysis             # 보장 분석
product              # 상품 설명
need_emphasis_2      # 필요성 강조 2
closing              # 클로징
objection            # 반론 대응
closing_second       # 2차 클로징
```

**현재 데이터:** 54개 스크립트, 샘플 5개

### 3. `posts` (게시글)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | PK |
| `title` | text | 제목 |
| `content` | text | 본문 |
| `category` | text | `공지사항`/`상품Q&A`/`인수Q&A`/`함께해요` |
| `author_name` | text | 작성자명 |
| ⚠️ `author_id` | uuid | 작성자 ID (`user_id` 아님 — 2026-04-19 확인) |
| `is_notice` | bool | 공지 여부 |
| `is_hidden` | bool | 숨김 여부 |
| `board_type` | text | `hub`/`team`/`branch`/`insurer` |
| `scope` | text | 팀·지점 구분 |
| `org_id` | text | 조직 ID |
| `created_at` | timestamptz | 작성일 |

**상품Q&A 추가 필드:** `insurer_name`, `insurance_type`, `product_category`
**인수Q&A 추가 필드:** `patient_age`, `patient_gender`, `disease_name`, `diagnosis_timing`, `current_status`, `question_type`

### 4. `comments` (댓글)

⚠️ **실제 테이블명은 `comments`** — 과거 문서의 `replies`는 폐기됨 (2026-04-19 확인)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | PK |
| `post_id` | uuid | 연결 게시글 |
| `content` | text | 댓글 내용 |
| `author_id` | uuid | 작성자 |
| `author_name` | text | 작성자명 |
| `created_at` | timestamptz | 작성일 |

**없는 컬럼 (과거 오해 컬럼):** `display_name`, `is_anonymous`, `user_id`

### 5. `app_settings` (전역 설정)

`group_name` + `key` + `value` 구조.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `group_name` | text | 그룹 이름 |
| `key` | text | 키 |
| `value` | text | 값 (문자열로만) |
| `label` | text | UI 표시용 |

**그룹별 용도:**

| group_name | key 예시 | value | 사용처 |
|---|---|---|---|
| `menu_b` | `menu_home`, `menu_scripts`, `menu_board`, `menu_myspace`, `menu_news`, `menu_quick`, `menu_together` | `'true'`/`'false'` | 사이드바 메뉴 |
| `feature_gate` | `feature_quickaction` | `'true'`/`'false'` | 빠른 실행 PRO 전용 |
| `board_visibility` | `board_notice`, `board_qa_product`, `board_qa_underwriting`, `board_hub`, `board_company` | `'true'`/`'false'` | 게시판 카테고리 |
| `board_tab` | `board_tab_hub`, `board_tab_company` | `'true'`/`'false'` | 게시판 1차 탭 |
| `gate` | `gate_quick_a2` | `'true'`/`'false'` | 기능 게이트 |
| `banner_img` | `banner_img_home`, `banner_img_scripts` 등 | URL | 페이지별 배너 |

**저장 패턴 (DELETE → INSERT):**
```javascript
// 기존 그룹 전체 삭제
await admFetch('/rest/v1/app_settings?group_name=eq.menu_b', {
  method: 'DELETE',
  headers: { 'Prefer': 'return=minimal' }
});

// 새 값 INSERT
await admFetch('/rest/v1/app_settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(upsertRows)
});
```

### 6. `activity_logs` (사용자 행동)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | bigserial | PK |
| `user_id` | uuid | 사용자 ID |
| `event_type` | text | 이벤트 종류 |
| `target_type` | text | 대상 유형 |
| `target_id` | text | 대상 ID |
| `created_at` | timestamptz | 발생 시각 |

**수집 이벤트:**
- `login` — 로그인
- `script_view` — 스크립트 열람
- `quick_click` — Quick 메뉴 클릭
- `favorite_add` — 즐겨찾기 추가

### 7. `html_block` (HTML 블록 백업)

Glide 시절 잔존. 백업 목적.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | int | PK |
| `block_name` | text | 블록 이름 |
| `html_content` | text | HTML 코드 |

---

## 기타 테이블 (비어 있거나 미사용)

21개 테이블 중 핵심 7개 외:

| 테이블 | 상태 | 용도 |
|---|---|---|
| `organizations` | ❌ 비어있음 | company/branch/team/insurer 구조 |
| `user_state` | ❌ 비어있음 | 사용자 현재 상태 |
| `insurers` | ❌ 비어있음 | 생명/손해/일반 보험사 목록 |
| `categories` | ✅ 12개 | 카테고리 |
| `menu_items` | ✅ 7개 | 메뉴 (업무지원) |
| `script_tags` | ❌ 비어있음 | 스크립트 태그 |
| `user_favorites` | ❌ 비어있음 | 즐겨찾기 |
| `home_script_map` | 미확인 | 홈 화면 매핑 |
| `content_assets` | ❌ 비어있음 | 자료 라이브러리 |
| `content_asset_tags` | ❌ 비어있음 | 자료 태그 |
| `search_logs` | 🔵 자동수집 | 검색 키워드 |
| `ai_documents` | ❌ 비어있음 | AI 검색용 |
| `script_usage_logs` | 🔵 자동수집 | 스크립트 사용 |
| `search_index` | ⚠️ 부족 | 5개 → 100개 목표 |
| `flow_rules` | ❌ 비어있음 | 상황별 추천 엔진 |

---

## 자주 쓰는 쿼리 패턴

### 스크립트 조회 (전역 샘플 포함)
```
GET /rest/v1/scripts?or=(user_id.eq.{uid},is_sample.eq.true)
   &is_active=eq.true
   &order=sort_order.asc,title.asc
   &select=id,title,stage,type,script_text,highlight_text,is_sample
```

### 게시글 조회 (최근순)
```
GET /rest/v1/posts?is_hidden=eq.false
   &order=is_notice.desc,created_at.desc
   &limit=50
   &select=id,title,category,author_name,created_at,is_notice,is_hidden
```

### 팀게시판 필터링
```
GET /rest/v1/posts?board_type=eq.team
   &org_id=eq.{company}_{branch}_{team}
   &select=*
```

### 사용자 정보 조회 (본인)
```
GET /rest/v1/users?id=eq.{userId}
   &select=id,name,email,role,plan,company,branch,team
```

### app_settings 로드
```
GET /rest/v1/app_settings?select=group_name,key,value
```

### 활동 로그 기록
```javascript
await window.db.fetch('/rest/v1/activity_logs', {
  method: 'POST',
  body: JSON.stringify({
    user_id: userId,
    event_type: 'script_view',
    target_type: 'script',
    target_id: scriptId
  })
});
```

---

## RLS 정책 원칙

### 피해야 할 것 (무한 재귀 경고)
❌ `users` 테이블을 참조하는 RLS 정책을 `EXISTS(SELECT FROM public.users)` 형태로 작성 → **42P17 무한 재귀** 발생.

### 권장 방식
✅ `SECURITY DEFINER` 함수 방식 사용.

```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT role = 'admin' FROM public.users WHERE id = auth.uid();
$$;
```

### RLS 활성화 상태 확인
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

---

## 재설계 체크리스트 (작업 중)

- [ ] Chrome으로 실제 스키마 8개 쿼리 덤프
- [ ] Claude Code가 코드 vs 덤프 대조
- [ ] 우회 설계 흔적 전체 목록 작성
- [ ] 재설계 방향 선택 (전체 초기화 / 마이그레이션 / 부분 수정)
- [ ] 정석 설계 SQL 작성
- [ ] 이관 or 초기화 실행
- [ ] E2E 검증 (회원가입 → 인증 → 로그인 → 전체 기능)
- [ ] 이 문서 전면 개정

---

## 참고 문서

- `00_MASTER.md` — 불변 원칙
- `99_ARCHIVE.md` — 과거 세션 기록
- `design_guide.md` — UI 규칙
