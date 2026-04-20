# 원세컨드 DB 전면 초기화 + 정석 재설계 지시서

> **작성:** 2026-04-20 저녁 (Claude Code 초안)
> **실행 주체:** Claude Code SQL 작성 → Claude in Chrome Supabase SQL Editor 실행
> **실행 전제:** 팀장님 최종 승인 후에만 실행. 지시서만으로는 DB 변경 금지.
> **섹션 4(트리거·함수) 미완성** — Chrome이 `handle_new_user` 현재 함수 본문 전달 후 확정.

---

## 📑 용어 한 줄 사전 (팀장님 참고용)

| 용어 | 뜻 |
|---|---|
| **RLS** (Row Level Security) | 행 단위 접근 제어. "이 row를 누가 읽고 쓸 수 있는지" 정책 |
| **FK** (Foreign Key, 외래키) | "이 컬럼은 저 테이블의 값과 일치해야 한다"는 제약 |
| **PK** (Primary Key, 기본키) | 한 row를 유일하게 식별하는 컬럼 |
| **CASCADE** | 부모 row 삭제 시 자식 row도 같이 삭제 (예: auth.users 삭제 → public.users 자동 삭제) |
| **SET NULL** | 부모 row 삭제 시 자식의 FK 컬럼을 NULL로 (예: 글쓴이 탈퇴해도 글은 남고 author_id만 NULL) |
| **SECURITY DEFINER** | 함수가 호출자 권한이 아니라 함수 작성자 권한으로 실행됨. RLS 무한 재귀 회피에 필수 |
| **uuid** | `de7ba389-901a-426a-9828-...` 형태의 고유 ID. 정석 권장 타입 |
| **bigint** | 큰 정수 (자동 증가 숫자 PK) |
| **트리거** | 특정 이벤트(INSERT/UPDATE/DELETE) 발생 시 자동 실행되는 함수 |

---

## 1. 목적·원칙

### 1-1. 목적
- **전체 초기화 후 정석 스키마로 재설계**
- `auth_user_id` 레거시 컬럼 완전 제거
- FK·RLS·트리거·타입 **정석대로**
- 부채 청산 → v1.5/v2.0 확장 시 재작업 불필요

### 1-2. 보존 대상
- `auth.users` **절대 건드리지 않음** (13명 그대로 유지)
- 다음 5개 테이블 데이터는 CSV 백업 후 복원:
  - `scripts` (54개 상담 멘트)
  - `app_settings` (UI 설정)
  - `quick_contents` (빠른 실행 콘텐츠)
  - `exception_diseases` (예외 질환)
  - `news` (보험 뉴스)

### 1-3. 버리는 데이터
- `public.users` 18개 → 트리거가 auth.users 기반으로 자동 재생성
- `posts`, `comments`, `activity_logs`, `script_usage_logs`, `library` → 테스트 데이터라 전부 버림

### 1-4. 확정 사항 (팀장님 결정)
- **F-1:** ①안 전체 초기화 ✅
- **F-2:** 오늘 밤 즉시 시작 ✅
- **F-11:** Claude Code SQL 작성 → Chrome 실행 ✅

### 1-5. Claude Code 기본값 (팀장님 순차 확인 대기)
> 작성 중 결정 필요 시 아래 기본값 사용. 팀장님이 바꾸고 싶으면 알려주세요.

| 번호 | 항목 | 기본값 |
|---|---|---|
| F-3 | users.email 컬럼 | 유지 + 트리거가 auth.users.email에서 복사 |
| F-4 | posts.id / comments.id / scripts.id | **bigint 유지** |
| F-5 | posts.author_id, comments.author_id | **uuid 변환 + FK** |
| F-6 | scripts.owner_id, library.owner_id | **uuid 변환 + FK** |
| F-7 | library RLS | **ON** (본인 자료만 조회) |
| F-8 | news RLS | **ON** (공개 읽기 + admin 쓰기) |
| F-9 | 테스트 계정 | auth.users 13명 전원 자동 재생성 |
| F-10 | 백업 | Dashboard 백업 + CSV export **둘 다** |
| F-12 | handle_new_user 본문 | Chrome 제공 본문 기반 재작성 |
| F-13 | 사이트 라이브 유지 | 옵션 B — 같은 프로젝트 + 점검 배너 |

---

## 2. 사전 작업 (백업)

> **⚠️ 이 섹션 완료 전 3절 이후 절대 실행 금지.**

### 2-1. Dashboard 전체 백업 (안전망)
- Supabase Dashboard → Database → Backups
- "Create backup" 또는 자동 백업 시점 확인
- 백업 시각 기록: `_______________` (팀장님 직접 기록)

### 2-2. CSV Export (5개 테이블)

Supabase Dashboard → Table Editor → 각 테이블 선택 → 우측 상단 `...` → "Export data to CSV"

저장 위치 권장: `claude_code/_docs/supabase_dumps/backup_20260420/`

| 순서 | 테이블 | 예상 row 수 | 저장 파일명 |
|---|---|---|---|
| 1 | scripts | 54 | `backup_scripts.csv` |
| 2 | app_settings | 수십 | `backup_app_settings.csv` |
| 3 | quick_contents | 수 개 | `backup_quick_contents.csv` |
| 4 | exception_diseases | ? | `backup_exception_diseases.csv` |
| 5 | news | ? | `backup_news.csv` |

### 2-3. 점검 페이지 배너 반영 (섹션 8 참조)
- `index.html` 상단에 점검 배너 → GitHub 커밋 + 푸시
- GitHub Pages 반영 1~2분 대기
- 실제 사이트에서 배너 확인

### 2-4. 백업 검증 SQL
```sql
-- 5개 테이블 현재 row 수 확인 (CSV export 후 row 수와 일치 확인)
SELECT 'scripts' AS tbl, count(*) FROM public.scripts
UNION ALL SELECT 'app_settings', count(*) FROM public.app_settings
UNION ALL SELECT 'quick_contents', count(*) FROM public.quick_contents
UNION ALL SELECT 'exception_diseases', count(*) FROM public.exception_diseases
UNION ALL SELECT 'news', count(*) FROM public.news;
```

**✅ 체크포인트:** 백업 파일 5개 + Dashboard 백업 1개 전부 확인 완료 후 3절 진행.

---

## 3. 정석 스키마 SQL

> **실행 순서:** 블록 3-A → 3-B → 3-C → 3-D → 3-E → 3-F → 검증
> **의존성 규칙:** DROP은 역순(자식→부모), CREATE는 정순(부모→자식).

### 3-A. 기존 테이블 DROP (11개)

```sql
-- ═══════════════════════════════════════════════
-- 블록 3-A: 기존 public 테이블 전부 제거
-- auth.users는 절대 건드리지 않음
-- CASCADE로 의존 관계 한 번에 정리
-- ═══════════════════════════════════════════════
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.library CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;
DROP TABLE IF EXISTS public.scripts CASCADE;
DROP TABLE IF EXISTS public.script_usage_logs CASCADE;
DROP TABLE IF EXISTS public.exception_diseases CASCADE;
DROP TABLE IF EXISTS public.news CASCADE;
DROP TABLE IF EXISTS public.quick_contents CASCADE;
DROP TABLE IF EXISTS public.app_settings CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 기존 RLS 헬퍼 함수가 있다면 정리
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.current_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.current_user_branch() CASCADE;
DROP FUNCTION IF EXISTS public.current_user_team() CASCADE;
```

**검증 쿼리:**
```sql
-- public 스키마에 테이블이 0개여야 함
SELECT count(*) AS public_tables_remaining
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- 기대값: 0
```

---

### 3-B. users 테이블 (루트) — 정석

```sql
-- ═══════════════════════════════════════════════
-- 블록 3-B: users 테이블
-- 정석 포인트:
--  - id는 auth.users(id) FK + ON DELETE CASCADE
--  - id default 없음 (트리거가 auth.users.id를 명시 INSERT)
--  - auth_user_id 컬럼 제거 (레거시 청산)
--  - role/plan은 NOT NULL + default 지정
-- ═══════════════════════════════════════════════
CREATE TABLE public.users (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text,                       -- auth.users.email 복사 (트리거에서)
  name       text,
  phone      text,
  company    text,
  branch     text,
  team       text,
  role       text NOT NULL DEFAULT 'member',
  plan       text NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role   ON public.users(role);
CREATE INDEX idx_users_branch ON public.users(branch);
CREATE INDEX idx_users_team   ON public.users(team);
```

**검증 쿼리:**
```sql
-- 컬럼 구성 확인: 10개, id는 NOT NULL uuid
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;
```

---

### 3-C. 콘텐츠 테이블 (posts, comments, scripts) — FK 정석

```sql
-- ═══════════════════════════════════════════════
-- 블록 3-C: posts, comments, scripts
-- 정석 포인트:
--  - author_id / owner_id 전부 uuid + users(id) FK
--  - post_id는 posts(id) FK + ON DELETE CASCADE
--  - bigint PK는 유지 (팀장님 F-4 결정)
--  - 글쓴이 탈퇴 시 글은 남기고 author_id만 NULL (SET NULL)
-- ═══════════════════════════════════════════════
CREATE TABLE public.posts (
  id               bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  created_at       timestamptz NOT NULL DEFAULT now(),
  board_type       text DEFAULT '',
  category         text DEFAULT '',
  title            text DEFAULT '',
  content          text,
  author_id        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  author_name      text,
  organization_id  text,
  is_hub_visible   boolean DEFAULT false,
  view_count       bigint DEFAULT 0,
  like_count       bigint DEFAULT 0,
  comment_count    bigint DEFAULT 0,
  is_anonymous     boolean DEFAULT false,
  display_name     text,
  is_hidden        boolean DEFAULT false,
  is_notice        boolean DEFAULT false,
  attachments      text,
  insurer_name     text,
  product_category text,
  patient_age      integer,
  patient_gender   text,
  disease_name     text,
  diagnosis_timing text,
  current_status   text
);

CREATE INDEX idx_posts_created_at   ON public.posts(created_at DESC);
CREATE INDEX idx_posts_author       ON public.posts(author_id);
CREATE INDEX idx_posts_board        ON public.posts(board_type);
CREATE INDEX idx_posts_org          ON public.posts(organization_id);
CREATE INDEX idx_posts_hub_visible  ON public.posts(is_hub_visible) WHERE is_hub_visible = true;

CREATE TABLE public.comments (
  id         bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  created_at timestamptz NOT NULL DEFAULT now(),
  post_id    bigint REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  author_name text,
  content    text
);

CREATE INDEX idx_comments_post   ON public.comments(post_id);
CREATE INDEX idx_comments_author ON public.comments(author_id);

CREATE TABLE public.scripts (
  id                  bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  created_at          timestamptz NOT NULL DEFAULT now(),
  owner_id            uuid REFERENCES public.users(id) ON DELETE SET NULL,
  owner_email         text,
  title               text,
  script_text         text,
  highlight_text      text,
  scope               text DEFAULT 'personal',
  is_recommended      boolean DEFAULT false,
  recommended_by_role text,
  use_count           integer NOT NULL DEFAULT 0,
  script_type         text,
  top_category        text,
  stage               text,
  type                text,
  is_active           boolean DEFAULT true,
  is_leader_pick      boolean DEFAULT false,
  html_block_id       text,
  search_text         text,
  is_sample           boolean DEFAULT false,
  sort_order          integer DEFAULT 999
);

CREATE INDEX idx_scripts_active_stage ON public.scripts(is_active, stage, sort_order);
CREATE INDEX idx_scripts_owner        ON public.scripts(owner_id);
CREATE INDEX idx_scripts_recommended  ON public.scripts(is_recommended) WHERE is_recommended = true;
```

**검증 쿼리:**
```sql
-- FK 3개 확인 (posts.author_id, comments.post_id, comments.author_id, scripts.owner_id)
SELECT tc.table_name, kcu.column_name, ccu.table_name AS ref_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu USING (constraint_name, table_schema)
JOIN information_schema.constraint_column_usage ccu USING (constraint_name, table_schema)
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('posts','comments','scripts')
ORDER BY tc.table_name;
```

---

### 3-D. 로그·부가 테이블 (activity_logs, script_usage_logs, library)

```sql
-- ═══════════════════════════════════════════════
-- 블록 3-D: 로그·부가 테이블
-- 정석 포인트:
--  - user_id / owner_id uuid + FK
--  - library는 CASCADE (본인 자료라 탈퇴 시 삭제)
--  - 로그는 SET NULL (탈퇴해도 로그 집계 보존)
-- ═══════════════════════════════════════════════
CREATE TABLE public.activity_logs (
  id          bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  user_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  event_type  text,
  target_type text,
  target_id   text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_activity_user_time ON public.activity_logs(user_id, created_at DESC);
CREATE INDEX idx_activity_event     ON public.activity_logs(event_type);

CREATE TABLE public.script_usage_logs (
  id            bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  created_at    timestamptz NOT NULL DEFAULT now(),
  user_id       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  script_title  text,
  script_screen text,
  script_main   text
);

CREATE INDEX idx_usage_user_time ON public.script_usage_logs(user_id, created_at DESC);

CREATE TABLE public.library (
  id          bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  owner_id    uuid REFERENCES public.users(id) ON DELETE CASCADE,
  owner_email text,
  title       text,
  description text,
  file_url    text,
  link_url    text,
  memo_text   text,
  image_url   text,
  scope       text
);

CREATE INDEX idx_library_owner ON public.library(owner_id);
```

---

### 3-E. 독립 테이블 (FK 없음: app_settings, quick_contents, exception_diseases, news)

```sql
-- ═══════════════════════════════════════════════
-- 블록 3-E: 독립 테이블
-- 사용자·게시글과 직접 연결 없음
-- ═══════════════════════════════════════════════
CREATE TABLE public.app_settings (
  id         bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  key        text NOT NULL UNIQUE,
  value      text,
  label      text,
  group_name text,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_app_settings_group ON public.app_settings(group_name);

CREATE TABLE public.quick_contents (
  id           bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  tab_key      text,
  tab_title    text,
  sort_order   smallint,
  content_html text,
  is_active    boolean DEFAULT true,
  updated_at   timestamptz,
  search_text  text
);

CREATE INDEX idx_quick_contents_active ON public.quick_contents(is_active, sort_order) WHERE is_active = true;

CREATE TABLE public.exception_diseases (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insurer_name  text NOT NULL,
  disease_code  text,
  disease_name  text NOT NULL,
  is_available  text,
  condition     text,
  coverage      text,
  standard_date date,
  raw_data      jsonb,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_disease_insurer ON public.exception_diseases(insurer_name);
CREATE INDEX idx_disease_name    ON public.exception_diseases(disease_name);

CREATE TABLE public.news (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  summary      text,
  source       text,
  url          text,
  category     text DEFAULT '전체',
  published_at date,
  is_active    boolean DEFAULT true,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX idx_news_active_date ON public.news(is_active, published_at DESC) WHERE is_active = true;
```

---

### 3-F. 전체 스키마 검증

```sql
-- [검증 1] 테이블 11개 전부 생성됐는지
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
-- 기대: activity_logs, app_settings, comments, exception_diseases, library, news, posts, quick_contents, script_usage_logs, scripts, users (11개)

-- [검증 2] users.auth_user_id 완전 제거 확인
SELECT count(*) AS legacy_col_count
FROM information_schema.columns
WHERE table_schema = 'public' AND column_name = 'auth_user_id';
-- 기대: 0

-- [검증 3] FK 전수 확인
SELECT tc.table_name AS tbl, kcu.column_name AS col,
       ccu.table_schema || '.' || ccu.table_name AS references_,
       rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu USING (constraint_name, table_schema)
JOIN information_schema.constraint_column_usage ccu USING (constraint_name, table_schema)
JOIN information_schema.referential_constraints rc USING (constraint_name, constraint_schema)
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
-- 기대: 8개 FK
--   users.id → auth.users(id) CASCADE
--   posts.author_id → users(id) SET NULL
--   comments.post_id → posts(id) CASCADE
--   comments.author_id → users(id) SET NULL
--   scripts.owner_id → users(id) SET NULL
--   script_usage_logs.user_id → users(id) SET NULL
--   activity_logs.user_id → users(id) SET NULL
--   library.owner_id → users(id) CASCADE
```

**✅ 체크포인트:** 검증 1·2·3 전부 기대값 일치 확인 후 4절 진행.

---

## 4. 트리거·함수 SQL (확정)

> **✅ Chrome 제공 현재 함수 본문 검토 완료 (2026-04-20 저녁)**
> **결정:** A안(권장) — 트리거 구조 유지 + doSubmit PATCH로 전환 (섹션 9와 일관).
> **현재 본문 특성:** `id, email, role, plan, created_at` 만 INSERT. name/phone/branch/team 등 프로필 필드는 NULL로 두고 클라이언트 PATCH로 보강.
> **재설계 후에도 동일 구조 유지** — 이 패턴이 정석에 부합.

### 4-A. 시퀀싱 주의

> 기존 트리거 `on_auth_user_created`는 섹션 3-A의 `DROP TABLE public.users CASCADE`가 실행되어도 살아남음 (트리거는 `auth.users`에 연결, CASCADE 범위 밖).  
> **작업 순서 중 public.users가 없는 동안 auth.users에 INSERT가 발생하면 트리거 실행 실패 → 가입 에러.**  
> → 섹션 8의 점검 배너로 실사용자 가입 차단. 추가 안전장치로 섹션 4-1에서 **기존 트리거·함수를 먼저 DROP** 후 4-2/4-3에서 재생성.

---

### 4-1. 기존 트리거·함수 DROP (clean slate)

```sql
-- ═══════════════════════════════════════════════
-- 블록 4-1: 기존 트리거·함수 제거
-- 정석 포인트:
--  - 트리거 먼저 DROP (함수 의존 끊기)
--  - CASCADE는 쓰지 않음 (혹시 다른 곳에서 함수 참조 중일 경우 명시 에러가 낫음)
-- ═══════════════════════════════════════════════
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
```

**검증 쿼리:**
```sql
-- 함수·트리거 전부 제거됐는지
SELECT count(*) AS remaining_func
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace AND proname = 'handle_new_user';
-- 기대: 0

SELECT count(*) AS remaining_trigger
FROM pg_trigger
WHERE tgname = 'on_auth_user_created' AND NOT tgisinternal;
-- 기대: 0
```

---

### 4-2. handle_new_user 함수 재생성 (Chrome 본문 기반 확정본)

```sql
-- ═══════════════════════════════════════════════
-- 블록 4-2: handle_new_user 함수
-- 정석 포인트:
--  - SECURITY DEFINER (public.users INSERT 권한 확보, RLS 우회)
--  - SET search_path = public (함수 내부 네임스페이스 고정 — 보안·예측 가능성)
--  - NEW.id 명시 INSERT (users.id default 없음, 트리거가 유일 주입 경로)
--  - NEW.email 복사 (auth.users.email과 sync, 프로필 수정은 클라이언트 PATCH가 담당)
--  - role='member', plan='free' 기본값 (정석 테이블 default와 중복이지만 명시로 의도 선명)
--  - ON CONFLICT (id) DO NOTHING (중복 트리거 발화·수동 호출 방어)
--  - 프로필 필드(name/phone/company/branch/team)는 의도적으로 NULL
--    → doSubmit(PATCH)가 가입 폼 입력으로 채움 (섹션 9)
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, role, plan, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    'member',
    'free',
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
```

---

### 4-3. on_auth_user_created 트리거 재등록

```sql
-- ═══════════════════════════════════════════════
-- 블록 4-3: 트리거 연결
-- 정석 포인트:
--  - AFTER INSERT (auth.users row 확정 후 실행 — 롤백 가능성 차단)
--  - FOR EACH ROW (row 단위 실행)
-- ═══════════════════════════════════════════════
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

### 4-4. 검증 쿼리 (3단계)

```sql
-- [검증 1] 함수 등록 확인
SELECT
  proname                        AS func_name,
  prosecdef                      AS is_security_definer,
  pg_get_function_identity_arguments(oid) AS args,
  pronamespace::regnamespace     AS schema_name
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname = 'handle_new_user';
-- 기대: 1 row, is_security_definer = true, args = '', schema_name = public

-- [검증 2] 트리거 등록 확인
SELECT
  tgname                         AS trigger_name,
  tgrelid::regclass              AS target_table,
  CASE tgenabled
    WHEN 'O' THEN 'ENABLED'
    WHEN 'D' THEN 'DISABLED'
    WHEN 'R' THEN 'REPLICA_ONLY'
    WHEN 'A' THEN 'ALWAYS'
    ELSE tgenabled::text
  END                            AS status,
  pg_get_triggerdef(oid)         AS definition
FROM pg_trigger
WHERE tgname = 'on_auth_user_created' AND NOT tgisinternal;
-- 기대: target_table = 'auth.users', status = 'ENABLED'

-- [검증 3] 함수 본문 내용 확인
SELECT pg_get_functiondef('public.handle_new_user'::regproc);
-- 기대: 4-2에서 붙여넣은 본문과 일치
```

---

### 4-5. 트리거 동작 시뮬레이션 (실측 테스트)

> **주의:** 아래 테스트는 **섹션 5 RLS 정책 생성 전**에도 가능 (SECURITY DEFINER 함수가 RLS 우회).
> 실제 가입 테스트는 섹션 6-D에서 브라우저로 수행.

```sql
-- ═══════════════════════════════════════════════
-- 블록 4-5: 트리거 시뮬레이션 (관리자 계정 대리 INSERT)
-- 주의: 실제 auth.users INSERT는 Service Role 권한 필요
-- Supabase SQL Editor는 Service Role로 동작하므로 직접 테스트 가능
-- ═══════════════════════════════════════════════

-- [시뮬레이션] 테스트용 auth.users row INSERT (트리거 발화)
-- 실 가입은 브라우저로, 여기서는 순수 SQL 검증만
DO $$
DECLARE
  test_uuid uuid := gen_random_uuid();
  test_email text := 'trigger_test_' || extract(epoch from now())::bigint || '@test.local';
BEGIN
  -- auth.users에 최소 필드만 INSERT
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    test_uuid,
    'authenticated',
    'authenticated',
    test_email,
    '',  -- 비밀번호 없음 (테스트 전용)
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false
  );
  RAISE NOTICE 'Inserted auth.users row with id=%', test_uuid;
END $$;

-- [검증] public.users에 자동 생성됐는지 확인
SELECT id, email, role, plan, created_at
FROM public.users
WHERE email LIKE 'trigger_test_%'
ORDER BY created_at DESC
LIMIT 1;
-- 기대: role='member', plan='free', created_at 방금

-- [정리] 테스트 row 삭제 (CASCADE로 public.users도 자동 삭제됨)
DELETE FROM auth.users
WHERE email LIKE 'trigger_test_%';

-- [검증] public.users에서도 사라졌는지 (CASCADE 확인)
SELECT count(*) AS orphan_public_rows
FROM public.users
WHERE email LIKE 'trigger_test_%';
-- 기대: 0 (FK ON DELETE CASCADE 동작 확인)
```

> **⚠️ 이 시뮬레이션이 실패하면:**  
> - `public.users INSERT 실패`: 섹션 3-B users 테이블 구조 재점검  
> - `CASCADE 동작 안 함`: 섹션 3-B `REFERENCES auth.users(id) ON DELETE CASCADE` 누락 의심  
> - 에러 메시지 그대로 공유해서 Claude Code에 디버깅 요청

---

**✅ 체크포인트:** 검증 1·2·3·5 전부 통과 후 5절(RLS) 진행.

---

## 5. RLS 정책 SQL

### 5-A. RLS 헬퍼 함수 (무한 재귀 방지)

```sql
-- ═══════════════════════════════════════════════
-- 블록 5-A: RLS 헬퍼 함수 4개
-- 정석 포인트:
--  - SECURITY DEFINER로 users 테이블 RLS 우회
--  - users 테이블 참조 정책에서 EXISTS(SELECT FROM users) 대신 이 함수 사용
--  - STABLE (한 쿼리 내 재호출 시 캐시됨)
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT role = 'admin' FROM public.users WHERE id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_branch()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT branch FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_team()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT team FROM public.users WHERE id = auth.uid();
$$;
```

---

### 5-B. users 테이블 RLS

```sql
-- ═══════════════════════════════════════════════
-- 블록 5-B: users RLS
-- 정석 포인트:
--  - SELECT·UPDATE 본인만 + admin 전체
--  - INSERT 정책 없음 (트리거 전용, 클라이언트 INSERT 차단)
--  - DELETE 정책 없음 (계정 삭제는 auth.users 경유 + CASCADE)
-- ═══════════════════════════════════════════════
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user read own"
  ON public.users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "admin read all users"
  ON public.users FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "user update own"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "admin update all users"
  ON public.users FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
```

---

### 5-C. posts·comments RLS (author_id uuid 기반)

```sql
-- ═══════════════════════════════════════════════
-- 블록 5-C: posts RLS
-- 정석 포인트:
--  - author_id가 uuid라 text 캐스팅 불필요
--  - together는 공개 읽기 (anon 포함)
--  - 나머지는 authenticated 전용
--  - insurer_board는 admin/insurer만 작성
-- ═══════════════════════════════════════════════
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read together"
  ON public.posts FOR SELECT
  TO authenticated
  USING (board_type = 'together' AND is_hidden = false);

CREATE POLICY "auth read non-together"
  ON public.posts FOR SELECT
  TO authenticated
  USING (board_type <> 'together' AND is_hidden = false);

CREATE POLICY "admin read all posts"
  ON public.posts FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "auth insert posts"
  ON public.posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "insurer board insert"
  ON public.posts FOR INSERT
  TO authenticated
  WITH CHECK (
    board_type = 'insurer_board'
    AND public.current_user_role() IN ('admin', 'insurer')
  );

CREATE POLICY "author or admin update"
  ON public.posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id OR public.is_admin())
  WITH CHECK (auth.uid() = author_id OR public.is_admin());

CREATE POLICY "author or admin delete"
  ON public.posts FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id OR public.is_admin());

-- ═══════════════════════════════════════════════
-- 블록 5-C-2: comments RLS
-- ═══════════════════════════════════════════════
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone read comments"
  ON public.comments FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "auth insert comments"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "own update comments"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "own or admin delete comments"
  ON public.comments FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id OR public.is_admin());
```

---

### 5-D. scripts·library RLS

```sql
-- ═══════════════════════════════════════════════
-- 블록 5-D: scripts RLS
-- 스크립트는 모든 인증 사용자가 읽기 가능
-- (샘플·개인 구분은 애플리케이션에서)
-- 관리자만 전체 관리
-- ═══════════════════════════════════════════════
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read scripts"
  ON public.scripts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admin manage scripts"
  ON public.scripts FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ═══════════════════════════════════════════════
-- 블록 5-D-2: library RLS (본인 자료만)
-- ═══════════════════════════════════════════════
ALTER TABLE public.library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own read library"
  ON public.library FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "own insert library"
  ON public.library FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "own update library"
  ON public.library FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "own delete library"
  ON public.library FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);
```

---

### 5-E. 로그 테이블 RLS (중복 제거 + 레거시 정리)

```sql
-- ═══════════════════════════════════════════════
-- 블록 5-E: activity_logs RLS
-- 정석 포인트:
--  - INSERT 정책 1개 (중복 제거)
--  - users.auth_user_id 참조 완전 제거 → users.id 기반
--  - SECURITY DEFINER 헬퍼 함수 사용 (무한 재귀 방지)
-- ═══════════════════════════════════════════════
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth insert own logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own read logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admin read all logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "manager read team logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'manager'
    AND EXISTS (
      SELECT 1 FROM public.users target
      WHERE target.id = activity_logs.user_id
        AND target.team = public.current_user_team()
        AND target.role = 'member'
    )
  );

CREATE POLICY "branch_manager read branch logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'branch_manager'
    AND EXISTS (
      SELECT 1 FROM public.users target
      WHERE target.id = activity_logs.user_id
        AND target.branch = public.current_user_branch()
    )
  );

-- ═══════════════════════════════════════════════
-- 블록 5-E-2: script_usage_logs RLS
-- ═══════════════════════════════════════════════
ALTER TABLE public.script_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth insert own usage"
  ON public.script_usage_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own read usage"
  ON public.script_usage_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admin or branch_manager read usage"
  ON public.script_usage_logs FOR SELECT
  TO authenticated
  USING (public.current_user_role() IN ('admin', 'branch_manager'));
```

---

### 5-F. 독립 테이블 RLS (app_settings, quick_contents, exception_diseases, news)

```sql
-- ═══════════════════════════════════════════════
-- 블록 5-F: 독립 테이블 RLS
-- news, library까지 포함 전부 RLS ON
-- ═══════════════════════════════════════════════
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admin write settings"
  ON public.app_settings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER TABLE public.quick_contents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read quick"
  ON public.quick_contents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admin write quick"
  ON public.quick_contents FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER TABLE public.exception_diseases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read diseases"
  ON public.exception_diseases FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admin write diseases"
  ON public.exception_diseases FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone read active news"
  ON public.news FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "admin write news"
  ON public.news FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
```

---

### 5-G. RLS 전수 검증

```sql
-- [검증 1] RLS 활성화 확인 (전부 true)
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- 기대: 11개 테이블 전부 rowsecurity = true

-- [검증 2] 정책 개수 + 중복 체크
SELECT tablename, cmd, count(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename, cmd
ORDER BY tablename, cmd;
-- 기대: activity_logs INSERT = 1 (중복 없음)
--       users INSERT 정책 없음 (차단)
--       users DELETE 정책 없음 (차단)

-- [검증 3] 헬퍼 함수 4개 존재
SELECT proname, prosecdef AS is_security_definer, provolatile
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('is_admin', 'current_user_role', 'current_user_branch', 'current_user_team')
ORDER BY proname;
-- 기대: 4 rows, 전부 security_definer = true, volatile = 's' (STABLE)
```

**✅ 체크포인트:** 검증 전부 통과 후 6절 진행.

---

## 6. 데이터 복원 SQL

### 6-A. auth.users 13명 → public.users 자동 재생성 확인

```sql
-- auth.users는 그대로 유지되어 있음
-- 하지만 섹션 3에서 public.users를 DROP했으므로 트리거만으로는 기존 auth.users 13명에 대한 public row가 없음
-- → 수동으로 SELECT INTO 또는 함수 재호출 필요

-- [복원 1] 기존 auth.users 13명의 public row 수동 생성
INSERT INTO public.users (id, email, role, plan, created_at)
SELECT
  au.id,
  au.email,
  'member',
  'free',
  coalesce(au.created_at, now())
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- [검증] auth.users 수 = public.users 수 확인
SELECT
  (SELECT count(*) FROM auth.users) AS auth_count,
  (SELECT count(*) FROM public.users) AS public_count,
  (SELECT count(*)
     FROM auth.users au
     LEFT JOIN public.users pu ON au.id = pu.id
     WHERE pu.id IS NULL) AS missing;
-- 기대: auth_count = public_count = 13, missing = 0
```

---

### 6-B. 팀장님 계정 role=admin 재설정

```sql
-- 팀장님 계정은 member → admin 승격
-- (테스트 초기 role은 전부 member로 들어감)
UPDATE public.users
SET role = 'admin'
WHERE email = 'bylts0428@gmail.com';

-- [검증]
SELECT id, email, name, role, plan
FROM public.users
WHERE email = 'bylts0428@gmail.com';
-- 기대: role = 'admin'
```

---

### 6-C. CSV 데이터 재투입 (5개 테이블)

> **Supabase Dashboard → Table Editor → 해당 테이블 선택 → Insert → "Import data from CSV"**
> CSV 파일 경로: `claude_code/_docs/supabase_dumps/backup_20260420/`
> **주의:** `id` 컬럼은 제외하고 import (새로 자동 생성됨). 만약 `id`를 유지해야 하면 import 후 `SELECT setval(...)` 필요.

#### 6-C-1. scripts (54개)
```sql
-- CSV import 후 row 수 확인
SELECT count(*) FROM public.scripts;
-- 기대: 54

-- owner_id가 있던 스크립트 중 우리 users에 없는 orphan 확인
SELECT s.id, s.title, s.owner_id
FROM public.scripts s
LEFT JOIN public.users u ON s.owner_id = u.id
WHERE s.owner_id IS NOT NULL AND u.id IS NULL;
-- orphan 있으면 → UPDATE public.scripts SET owner_id = NULL WHERE id IN (...)

-- 시퀀스 조정 (id 수동 INSERT 후 필요)
SELECT setval('public.scripts_id_seq', (SELECT max(id) FROM public.scripts));
```

#### 6-C-2. app_settings
```sql
-- CSV import 후
SELECT count(*), count(DISTINCT group_name) FROM public.app_settings;

SELECT setval('public.app_settings_id_seq', (SELECT max(id) FROM public.app_settings));
```

#### 6-C-3. quick_contents
```sql
SELECT count(*) FROM public.quick_contents WHERE is_active = true;

SELECT setval('public.quick_contents_id_seq', (SELECT max(id) FROM public.quick_contents));
```

#### 6-C-4. exception_diseases
```sql
-- id가 uuid라 setval 불필요. row 수만 확인
SELECT count(*) FROM public.exception_diseases;
```

#### 6-C-5. news
```sql
-- id가 uuid라 setval 불필요
SELECT count(*) FROM public.news;
```

---

### 6-D. 신규 테스트 가입 → 트리거 동작 검증

**Chrome·브라우저에서 실제로 수행:**
1. 새 이메일로 회원가입 (`test_reset_20260420@...`)
2. 인증 메일 수신 → 링크 클릭
3. 로그인 후 A1에 이메일 표시 확인

**SQL로 검증:**
```sql
-- 새 가입자가 public.users에 자동 생성됐는지
SELECT id, email, role, plan, created_at
FROM public.users
WHERE email LIKE 'test_reset%'
ORDER BY created_at DESC;
-- 기대: role='member', plan='free', created_at 방금 시각
```

---

## 7. 전체 스모크 테스트 체크리스트

### 7-1. DB 레벨
- [ ] 테이블 11개 전부 존재 (3-F 검증 1)
- [ ] auth_user_id 컬럼 0개 (3-F 검증 2)
- [ ] FK 8개 (3-F 검증 3)
- [ ] RLS 11개 테이블 전부 ON (5-G 검증 1)
- [ ] activity_logs INSERT 정책 1개 (5-G 검증 2)
- [ ] 헬퍼 함수 4개 (5-G 검증 3)
- [ ] handle_new_user 트리거 활성 (4-3)
- [ ] auth.users = public.users = 13 (6-A)
- [ ] scripts 54개 복원 (6-C-1)

### 7-2. 애플리케이션 레벨 (브라우저 실측)
- [ ] 기존 계정 로그인 → A1에 이름 대신 이메일 표시 (name 아직 없음)
- [ ] 내 정보 수정 → name, phone, company 입력 → A1에 "이름 (이메일)" 표시
- [ ] 스크립트 페이지: 10단계 탭 + 54개 멘트 정상 로드
- [ ] 게시판: 기존 글 0개 (버렸으니까) → 새 글 작성 → 정상 저장
- [ ] 댓글 작성 → 정상 저장
- [ ] Quick 메뉴: quick_contents 로드 정상
- [ ] 관리자 패널: 팀장님 계정(`admin`)으로 app_settings 수정 가능
- [ ] 신규 테스트 가입 → 인증 메일 → 로그인 → A1 표시 (6-D)

### 7-3. 회귀 확인 (기존 기능 깨지지 않았는지)
- [ ] 모바일 UI 정상
- [ ] 함께해요 섹션 공감 오버레이
- [ ] pricing 페이지 PRO 안내
- [ ] 폰트 크기 소/중/대 전환

---

## 8. 점검 페이지 (작업 중 사용자 접속 대응)

### 옵션 B 선택 (Claude Code 추천) — `index.html` 상단 점검 배너

### 8-A. 배너 HTML (작업 시작 직전 커밋)
```html
<!-- [2026-04-20] DB 재설계 점검 배너 — 완료 후 제거 -->
<div id="maintenance-banner" style="
  position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
  background: #C4733A; color: #fff; padding: 14px 20px;
  text-align: center; font-weight: 700; font-size: 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
  🛠️ 서비스 점검 중 — 원세컨드 DB 재설계 작업 진행 중입니다.
  <br><span style="font-weight: 400; font-size: 12px;">
  내일 오전 중 복구 예정입니다. 불편을 드려 죄송합니다.
  </span>
</div>
<style>
  body { padding-top: 72px; }  /* 배너 높이만큼 본문 아래로 */
</style>
```

**적용 순서:**
1. `index.html` 최상단 `<body>` 바로 다음에 삽입
2. `app.html`, `login.html`에도 동일 배너 삽입 (로그인·앱 진입도 차단 효과)
3. GitHub Desktop 커밋 & 푸시
4. 2분 후 실제 사이트에서 배너 확인
5. 섹션 3부터 작업 시작

### 8-B. 작업 완료 후 제거
```
1. 3개 파일에서 배너 코드 제거
2. GitHub Desktop 커밋: "chore: 점검 배너 제거 - DB 재설계 완료"
3. 푸시 → 2분 후 확인
```

---

## 9. 코드 수정 (최소)

### 9-A. 🔴 필수: `index.html` doSubmit POST → PATCH

**위치:** `index.html:2322~2342` (현재 INSERT 블록)
**이유:** 트리거가 이미 {id, email} row를 생성하므로 INSERT는 409 Conflict → PATCH로 나머지 필드만 UPDATE

**변경 전 (현재):**
```js
let profileSaved = true;
try {
  const uRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
    method: 'POST',
    headers: { /* ... */ },
    body: JSON.stringify(profileData)
  });
  if (!uRes.ok) { /* ... */ }
} catch (insErr) { /* ... */ }
```

**변경 후:**
```js
let profileSaved = true;
try {
  // [2026-04-20 DB 재설계] handle_new_user 트리거가 {id,email} row를 먼저 생성하므로
  // INSERT(POST) → 409 Conflict. PATCH로 나머지 필드 보강.
  // id/email은 트리거가 세팅하므로 body에서 제외 (outer `email` 충돌 회피 위해 rename).
  const { id: _id, email: _email, ...updateData } = profileData;
  const uRes = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(updateData)
  });
  if (!uRes.ok) {
    profileSaved = false;
    const errText = await uRes.text().catch(() => '');
    console.error('users PATCH 실패:', uRes.status, errText);
  }
} catch (insErr) {
  profileSaved = false;
  console.error('users PATCH 네트워크 오류:', insErr);
}
```

### 9-B. 🟢 선택: `supabase_schema.md` 전면 개정
- 작업 완료 후 실측 스키마 기반 문서 재작성
- 이 지시서 섹션 3·4·5 내용을 기반으로 정리

### 9-C. 🟢 선택: `99_ARCHIVE.md` #20 섹션 추가
- 오늘 재설계 작업 기록 (작업 시각, 소요 시간, 이슈, 교훈)

### 9-D. ✅ 건드리지 않는 파일
- `login.html`, `db.js`, `admin.html`
- `pages/home.html`, `news.html`, `myspace.html`, `scripts.html`, `quick.html`, `board.html`, `together.html`
- `js/auth.js` (이미 PATCH 패턴 사용 중, 구조 변경 불필요. `_applyAuthFallback`은 안전망으로 유지)
- `app.html` (A1/A2 3단계 fallback 유지 — 안전망)

---

## 10. 롤백 플랜

### 10-A. 각 단계별 롤백 가능 시점

| 진행 단계 | 되돌리기 방법 | 소요 |
|---|---|---|
| 섹션 2 사전 작업 중 | 배너 원복 commit revert | 2분 |
| 섹션 3 DROP 실행 직후 | **Dashboard 백업에서 복구** | 5~10분 |
| 섹션 3 CREATE 도중 | 섹션 3-A DROP 재실행 → Dashboard 백업 복구 | 10분 |
| 섹션 5 RLS 작성 후 | 전체 Dashboard 백업 복구 | 10분 |
| 섹션 6 CSV 복원 후 | 데이터만 재업로드 (SQL 스키마는 유지 가능) | 10~20분 |
| 섹션 7 검증 실패 | 구체 실패 지점 따라 판단 — 작은 정책 오류는 in-place 수정, 스키마 오류는 백업 복구 |

### 10-B. Dashboard 백업 복구 절차
1. Supabase Dashboard → Database → Backups
2. 섹션 2-1에서 기록해 둔 백업 시각 선택
3. "Restore" 클릭 → 확인
4. 5~10분 소요 (프로젝트 일시 중단)
5. 복구 완료 후 점검 배너 유지 → 팀장님 확인 → 상황 재정리

### 10-C. 최악의 시나리오
- Dashboard 복구도 실패 시 → Supabase 고객센터 문의 (Pro 플랜이라 우선순위 지원 가능)
- 그 동안 점검 배너는 계속 유지

### 10-D. 코드 레벨 롤백
- `index.html` doSubmit 변경은 별도 커밋 → 문제 시 `git revert <hash>` + 푸시
- 점검 배너도 별도 커밋

---

## 11. 최종 체크리스트 (팀장님 실행 승인 전)

- [x] 섹션 1-5 기본값(F-3~F-10, F-12, F-13) 팀장님 확인 완료
- [x] 섹션 4 트리거·함수 본문 확정 완료 (Chrome 제공 본문 기반 — A안: 트리거 유지 + doSubmit PATCH)
- [ ] 섹션 2 백업 2종(Dashboard + CSV) 완료
- [ ] 섹션 8 점검 배너 반영 + 사이트 표시 확인
- [ ] 이 지시서 전체 재검토 완료
- [ ] Chrome 실행 직전 Claude Code에 "실행 시작" 공지

**실행 주체:** Claude in Chrome
**감독 주체:** 임태성 팀장
**기술 지원:** Claude Code (SQL 디버깅, 에러 분석)

---

## 📋 실행 직후 기록 템플릿 (팀장님 작성)

```
실행 시작: 2026-04-__ __:__
DB 백업 시각: 2026-04-__ __:__
섹션 3 완료: __:__
섹션 4 완료: __:__
섹션 5 완료: __:__
섹션 6 완료: __:__
섹션 7 완료: __:__
점검 배너 제거: __:__
이슈/에러:
  -
교훈:
  -
```

---

*이 지시서는 Claude Code가 작성한 초안. 팀장님 최종 승인 후에만 실행.*
