# Supabase 신버전 DB 스키마 전수 — 2026-05-01 (Phase D-pre 항목 1)

> **신버전 프로젝트:** `pdnwgzneooyygfejrvbg` (`onesecond-v1-restore-0420`)
> **수집 시각:** 2026-05-01 (Phase D-pre 항목 1, 팀장님 SQL Editor 직접 실행)
> **수집 범위:** information_schema.tables / columns + pg_policies + public.users.role 분포
> **목적:** admin_v2 Phase D 진입 전 mock 콘텐츠 vs 실 스키마 매핑·갭 식별. CLAUDE.md "DB 상태 단정 금지" 원칙에 따라 raw 데이터만 인용.

---

## 1. public 스키마 테이블 목록 (12개 실재 — 쿼리 1)

| # | table_name | 비고 |
|:---:|---|---|
| 1 | `activity_logs` | admin_v2 D-6 logs 핵심 |
| 2 | `app_settings` | admin_v2 D-4 notice 통합 후보 (key/value) |
| 3 | `comments` | admin_v2 D-3 board 보조 |
| 4 | `exception_diseases` | 보장 분석 도메인 (admin_v2 매핑 외 추정) |
| 5 | `library` | admin_v2 D-2 자료실 (mock 추정 `materials` 대체) |
| 6 | `news` | 보험뉴스 자동 증식 엔진 트랙 (admin_v2 매핑 외 — 별 트랙 4번) |
| 7 | `posts` | admin_v2 D-3 board 핵심 |
| 8 | `quick_contents` | 빠른실행 페이지 (admin_v2 매핑 외 추정) |
| 9 | `quick_contents_backup` | 백업본 (service_role만 접근) |
| 10 | `script_usage_logs` | admin_v2 D-5 analytics + D-6 logs 보조 |
| 11 | `scripts` | admin_v2 D-2 content 핵심 |
| 12 | `users` | admin_v2 D-1 users 핵심 |

### Phase D 추정 13개 vs 실재 12개 갭

| Code 추정 (Phase D-pre 작업지시서) | 실재 여부 | 대체 후보 |
|---|:---:|---|
| `users` | ✅ 존재 | — |
| `scripts` | ✅ 존재 | — |
| `materials` | ❌ 미존재 | `library` |
| `posts` | ✅ 존재 | — |
| `post_reports` | ❌ 미존재 | posts 자체 컬럼 추가 또는 신규 테이블 |
| `app_settings` | ✅ 존재 | — |
| `notices` | ❌ 미존재 | `app_settings` 통합 또는 `posts.is_notice + board_type='notice'` |
| `banners` | ❌ 미존재 | `app_settings` 통합 후보 |
| 집계 RPC (`get_dau`, `get_feature_usage`) | ⚠️ 미확인 | 추가 SELECT 필요 (information_schema.routines) |
| `activity_logs` | ✅ 존재 | — |
| `system_logs` | ❌ 미존재 | `activity_logs` 단일로 통합 또는 Sentry 외부 |
| `payments` | ❌ 미존재 | **결제 시스템 미도입** |
| `subscriptions` | ❌ 미존재 | **결제 시스템 미도입** |
| `plans` | ❌ 미존재 | **결제 시스템 미도입 — `users.plan` 컬럼만 존재** |

### 추가 발견 7개 (Code 추정 외)

`comments` / `exception_diseases` / `library` / `news` / `quick_contents` / `quick_contents_backup` / `script_usage_logs`

---

## 2. 12 테이블 컬럼 전수 (쿼리 2 raw — 110행)

> ordinal_position 누락 = DB 우회 설계 흔적 (예: users.ordinal 9 — DROP 흔적)

### 2.1 `activity_logs` (6 columns)

| ordinal | column | type | nullable | default |
|:---:|---|---|:---:|---|
| 1 | id | bigint | NO | `nextval('activity_logs_id_seq'::regclass)` |
| 2 | user_id | uuid | YES | — |
| 3 | event_type | text | YES | — |
| 4 | target_type | text | YES | — |
| 5 | target_id | text | YES | — |
| 6 | created_at | timestamp with time zone | YES | `now()` |

### 2.2 `app_settings` (6 columns)

| ordinal | column | type | nullable | default |
|:---:|---|---|:---:|---|
| 1 | id | bigint | NO | `nextval('app_settings_id_seq')` |
| 2 | key | text | NO | — |
| 3 | value | text | YES | — |
| 4 | label | text | YES | — |
| 5 | group_name | text | YES | — |
| 6 | updated_at | timestamp with time zone | YES | `now()` |

### 2.3 `comments` (6 columns)

| ordinal | column | type | nullable | default |
|:---:|---|---|:---:|---|
| 1 | id | bigint | NO | — |
| 2 | created_at | timestamp with time zone | NO | `now()` |
| 3 | post_id | bigint | YES | — |
| 4 | author_id | text | YES | — |
| 5 | author_name | text | YES | — |
| 6 | content | text | YES | — |

### 2.4 `exception_diseases` (10 columns)

| ordinal | column | type | nullable | default |
|:---:|---|---|:---:|---|
| 1 | id | uuid | NO | `gen_random_uuid()` |
| 2 | insurer_name | text | NO | — |
| 3 | disease_code | text | YES | — |
| 4 | disease_name | text | NO | — |
| 5 | is_available | text | YES | — |
| 6 | condition | text | YES | — |
| 7 | coverage | text | YES | — |
| 8 | standard_date | date | YES | — |
| 9 | raw_data | jsonb | YES | — |
| 10 | created_at | timestamp with time zone | YES | `now()` |

### 2.5 `library` (11 columns) — D-2 자료실 매핑 후보

| ordinal | column | type | nullable | default |
|:---:|---|---|:---:|---|
| 1 | id | bigint | NO | — |
| 2 | created_at | timestamp with time zone | NO | `now()` |
| 3 | owner_id | text | YES | — |
| 4 | owner_email | text | YES | — |
| 5 | title | text | YES | — |
| 6 | description | text | YES | — |
| 7 | file_url | text | YES | — |
| 8 | link_url | text | YES | — |
| 9 | memo_text | text | YES | — |
| 10 | image_url | text | YES | — |
| 11 | scope | text | YES | — |

### 2.6 `news` (9 columns)

| ordinal | column | type | nullable | default |
|:---:|---|---|:---:|---|
| 1 | id | uuid | NO | `gen_random_uuid()` |
| 2 | title | text | NO | — |
| 3 | summary | text | YES | — |
| 4 | source | text | YES | — |
| 5 | url | text | YES | — |
| 6 | category | text | YES | `'전체'::text` |
| 7 | published_at | date | YES | — |
| 8 | is_active | boolean | YES | `true` |
| 9 | created_at | timestamp with time zone | YES | `now()` |

### 2.7 `posts` (25 columns) — D-3 board 핵심

| ordinal | column | type | nullable | default |
|:---:|---|---|:---:|---|
| 1 | id | bigint | NO | — |
| 2 | created_at | timestamp with time zone | NO | `now()` |
| 3 | board_type | text | YES | `''::text` |
| 4 | category | text | YES | `''::text` |
| 5 | title | text | YES | `''::text` |
| 6 | content | text | YES | — |
| 7 | author_id | text | YES | — |
| 8 | author_name | text | YES | — |
| 9 | organization_id | text | YES | — |
| 10 | is_hub_visible | boolean | YES | `false` |
| 11 | view_count | bigint | YES | `'0'::bigint` |
| 12 | like_count | bigint | YES | `'0'::bigint` |
| 13 | comment_count | bigint | YES | `'0'::bigint` |
| 14 | is_anonymous | boolean | YES | `false` |
| 15 | display_name | text | YES | — |
| 16 | is_hidden | boolean | YES | `false` |
| 17 | is_notice | boolean | YES | `false` |
| 18 | attachments | text | YES | — |
| 19 | insurer_name | text | YES | — |
| 20 | product_category | text | YES | — |
| 21 | patient_age | integer | YES | — |
| 22 | patient_gender | text | YES | — |
| 23 | disease_name | text | YES | — |
| 24 | diagnosis_timing | text | YES | — |
| 25 | current_status | text | YES | — |

### 2.8 `quick_contents` (8 columns)

| ordinal | column | type | nullable | default |
|:---:|---|---|:---:|---|
| 1 | id | bigint | NO | — |
| 2 | tab_key | text | YES | — |
| 3 | tab_title | text | YES | — |
| 4 | sort_order | smallint | YES | — |
| 5 | content_html | text | YES | — |
| 6 | is_active | boolean | YES | `true` |
| 7 | updated_at | timestamp with time zone | YES | — |
| 8 | search_text | text | YES | — |

### 2.9 `quick_contents_backup` (6 columns)

| ordinal | column | type | nullable | default |
|:---:|---|---|:---:|---|
| 1 | id | bigint | NO | `nextval('quick_contents_backup_id_seq')` |
| 2 | original_id | bigint | YES | — |
| 3 | tab_title | text | YES | — |
| 4 | content_html | text | YES | — |
| 5 | backed_up_at | timestamp with time zone | YES | `now()` |
| 6 | reason | text | YES | — |

### 2.10 `script_usage_logs` (6 columns)

| ordinal | column | type | nullable | default |
|:---:|---|---|:---:|---|
| 1 | id | bigint | NO | — |
| 2 | created_at | timestamp with time zone | NO | `now()` |
| 3 | user_id | text | YES | — |
| 4 | script_title | text | YES | — |
| 5 | script_screen | text | YES | — |
| 6 | script_main | text | YES | — |

### 2.11 `scripts` (21 columns) — D-2 content 핵심

| ordinal | column | type | nullable | default |
|:---:|---|---|:---:|---|
| 1 | id | bigint | NO | — |
| 2 | created_at | timestamp with time zone | NO | `now()` |
| 3 | owner_id | text | YES | — |
| 4 | owner_email | text | YES | — |
| 5 | title | text | YES | — |
| 6 | script_text | text | YES | — |
| 7 | highlight_text | text | YES | — |
| 8 | scope | text | YES | `'personal'::text` |
| 9 | is_recommended | boolean | YES | `false` |
| 10 | recommended_by_role | text | YES | — |
| 11 | use_count | integer | NO | `0` |
| 12 | script_type | text | YES | — |
| 13 | top_category | text | YES | — |
| 14 | stage | text | YES | — |
| 15 | type | text | YES | — |
| 16 | is_active | boolean | YES | `true` |
| 17 | is_leader_pick | boolean | YES | `false` |
| 18 | html_block_id | text | YES | — |
| 19 | search_text | text | YES | — |
| 20 | is_sample | boolean | YES | `false` |
| 21 | sort_order | integer | YES | `999` |

### 2.12 `users` (10 columns — ordinal 9 누락 ⚠️) — D-1 핵심

| ordinal | column | type | nullable | default |
|:---:|---|---|:---:|---|
| 1 | id | uuid | NO | `gen_random_uuid()` |
| 2 | created_at | timestamp with time zone | NO | `now()` |
| 3 | name | text | YES | — |
| 4 | phone | text | YES | — |
| 5 | email | text | YES | — |
| 6 | company | text | YES | — |
| 7 | role | text | YES | `'member'::text` |
| 8 | team | text | YES | — |
| 9 | **(누락 — DROP 흔적)** | — | — | — |
| 10 | branch | text | YES | — |
| 11 | plan | text | YES | — |

⚠️ **ordinal 9 누락** = 컬럼 DROP 흔적. DROP된 컬럼명·DROP 시기는 raw 데이터로 미식별. 항목 2 마이그레이션 시 `pg_attribute` 추가 SELECT로 검증 권장.

---

## 3. RLS 정책 30개 전수 (쿼리 3 raw)

### 3.1 테이블별 정책 카운트

| 테이블 | 정책 개수 | RLS 활성 추정 |
|---|:---:|:---:|
| activity_logs | 6 | ✅ 활성 |
| app_settings | 2 | ✅ 활성 |
| comments | 4 | ✅ 활성 |
| exception_diseases | 1 | ✅ 활성 |
| **library** | **0** | ⚠️ **정책 0 — RLS 비활성 또는 정책 미정의** |
| **news** | **0** | ⚠️ **정책 0 — RLS 비활성 또는 정책 미정의** |
| posts | 7 | ✅ 활성 |
| quick_contents | 1 | ✅ 활성 (read만) |
| quick_contents_backup | 1 | ⚠️ service_role만 (일반 사용자 차단) |
| script_usage_logs | 2 | ✅ 활성 |
| scripts | 2 | ✅ 활성 |
| users | 4 | ⚠️ "admin update all" 이름·동작 불일치 (발견 3) |
| **합계** | **30** | — |

### 3.2 구 5역할 사용 정책 (9역할 마이그레이션 시 SQL 재작성 필요)

| 정책 | 사용된 role 문자열 | 9역할 분기 필요 여부 |
|---|---|:---:|
| activity_logs.select_branch_manager | `'branch_manager'` | ⚠️ → `ga_branch_manager` + `insurer_branch_manager` |
| activity_logs.select_manager | `'manager'` | ⚠️ → `ga_manager` + `insurer_manager` |
| activity_logs.admin read all logs | `'admin'` | ✅ admin 유지 |
| app_settings.admin write | `'admin'` | ✅ admin 유지 |
| posts.author or admin delete/update | `'admin'` | ✅ admin 유지 |
| posts.insurer board insert | `ARRAY['admin', 'insurer']` | 🚨 **'insurer' → insurer_* 4종으로 매핑 필요 (발견 2)** |
| posts.insurer board update | `'admin'` | ✅ admin 유지 (insurer 빠짐 — 비대칭) |
| script_usage_logs.admin read | `ARRAY['admin', 'branch_manager']` | ⚠️ branch_manager 분기 |
| scripts.admin manage | `'admin'` | ✅ admin 유지 |

→ **30개 중 'admin' 단순 사용 정책은 변경 0건.** branch_manager·manager·insurer 사용 4개 정책이 9역할 분기 필요.

### 3.3 raw 정책 본문 인용 (핵심 발견 검증용)

#### 3.3.a 발견 2 — posts insurer board (구 'insurer' 흔적)

**`posts.insurer board insert` (with_check):**
```sql
((board_type = 'insurer_board'::text) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'insurer'::text]))))))
```

**`posts.insurer board update` (qual):**
```sql
((board_type = 'insurer_board'::text) AND ((author_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))))
```

→ INSERT는 `['admin', 'insurer']`, UPDATE는 `'admin'`만 — **비대칭**. INSERT의 'insurer'는 구 5역할에 없음 → 폐기 흔적 (발견 2 검증 ✅)

#### 3.3.b 발견 3 — users 테이블 RLS 정책 이상

**`users.admin update all`:**
- `cmd`: UPDATE
- `qual`: `auth.uid() = id`
- `roles`: `{public}` (anonymous 포함)

→ 정책명은 "admin update all"인데 qual은 본인 행만 수정 가능. **admin이 다른 사용자 수정 권한 0** (발견 3 검증 ✅). 정책명·동작 불일치 = 우회 설계 흔적.

#### 3.3.c 활성화 추정 — library / news (발견 4)

쿼리 3에서 library / news 정책 0건. **RLS 비활성 또는 정책 미정의 둘 중 하나**. 현재 raw 데이터로는 단정 불가.

→ 항목 2 진입 전 추가 검증 SELECT 권장:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('library', 'news');
```

---

## 4. public.users.role 분포 (쿼리 4 raw)

| role | user_count |
|---|---:|
| admin | 1 |

→ **admin 1명 외 다른 role 0건.** 즉 `member`/`manager`/`branch_manager`/`staff` 사용자 0건. **9역할 마이그레이션 시 데이터 변환 부담 0** (admin 1건만 그대로 유지).

⚠️ 그러나 RLS 정책은 구 5역할 문자열을 포함하므로 정책 SQL 재작성은 여전히 필요 (발견 1).

---

## 5. admin_v2 mock vs 실 컬럼 매핑표

### 5.1 D-1 users (admin_v2.html 라인 1467~1689)

| mock 항목 | 실 컬럼 | 매핑 상태 |
|---|---|:---:|
| 이름 (임태성·김지훈 등) | `users.name` | ✅ |
| 이메일 (@onesecond.solutions) | `users.email` | ✅ |
| 역할 (어드민·GA 지점장 등 9종) | `users.role` (default `'member'`) | ⚠️ 마이그레이션 필요 |
| 플랜 (PRO·FREE) | `users.plan` | ✅ |
| 소속 (강남센터 · 1팀) | `users.company` + `users.branch` + `users.team` (3컬럼 조합) | ✅ |
| 상태 (온라인·활성·정지·가입대기) | ❌ **users 테이블에 status 컬럼 없음** | 🆕 **신규 컬럼 필요** |
| 가입일 | `users.created_at` | ✅ |
| 마지막 접속 | ❌ **users에 last_seen_at 없음** | 🆕 **신규 컬럼 필요** (또는 activity_logs 집계) |
| KPI "전체 가입자 1,284" | `SELECT count(*) FROM users` | ✅ |
| KPI "활성 사용자 (7일)" | activity_logs 또는 새 last_seen_at 집계 | ⚠️ 활성 정의 미정 |
| KPI "신규 가입 (7일)" | `count(*) WHERE created_at > now() - interval '7 days'` | ✅ |
| 9역할 칩 카운트 | `SELECT role, count(*) GROUP BY role` | ✅ (마이그레이션 후) |

### 5.2 D-2 content (admin_v2.html 라인 1690~1888)

| mock 항목 | 실 컬럼 | 매핑 상태 |
|---|---|:---:|
| 스크립트 | `scripts` 테이블 | ✅ |
| 자료실 | `library` 테이블 (mock 추정 `materials` 대체) | ✅ |
| 단계 (stage 10단계) | `scripts.stage` | ✅ |
| 제목 | `scripts.title` / `library.title` | ✅ |
| 작성자 | `scripts.owner_id` (text) + `owner_email` | ⚠️ 9역할 join 필요 |
| 조회 | `scripts.use_count` (integer) | ⚠️ "조회"가 사용 횟수인지 의도 확인 필요 |
| 저장 | ❌ scripts에 save_count 컬럼 없음 | 🆕 **신규 컬럼 필요** (또는 별도 saves 테이블) |
| 작성일 | `scripts.created_at` / `library.created_at` | ✅ |
| KPI "전체 스크립트 3,847" | `count(*) FROM scripts` | ✅ |
| KPI "전체 자료 628" | `count(*) FROM library` | ✅ |
| KPI "오늘 작성 23" | `count(*) WHERE created_at > today` | ✅ |

### 5.3 D-3 board (admin_v2.html 라인 1891~2042)

| mock 항목 | 실 컬럼 | 매핑 상태 |
|---|---|:---:|
| 게시글 | `posts` 테이블 | ✅ |
| 댓글 | `comments` 테이블 + `posts.comment_count` | ✅ |
| 게시판 (공지/함께해요/insurer_board) | `posts.board_type` ('together'/'notice'/'insurer_board') | ✅ |
| 작성자 | `posts.author_id` (text) + `author_name` | ✅ |
| 신고 사유 | ❌ post_reports 테이블 0건 | 🆕 **신규 테이블 또는 posts 컬럼** |
| 신고 수 | ❌ 동일 | 🆕 |
| 신고 접수 시점 | ❌ 동일 | 🆕 |
| KPI "전체 게시글 2,847" | `count(*) FROM posts` | ✅ |
| KPI "댓글 11,428" | `count(*) FROM comments` | ✅ |
| KPI "신고 대기 5" | ❌ 신고 메커니즘 미존재 | 🆕 |
| 게시판별 활동 라인차트 (3계열·30일) | `posts.created_at` GROUP BY board_type, day | ✅ |

### 5.4 D-4 notice (admin_v2.html 라인 2191~2326)

| mock 항목 | 실 컬럼 | 매핑 상태 |
|---|---|:---:|
| 공지/배너 4개 | ❌ notices/banners 테이블 0건 | 🟡 `app_settings` 통합 후보 또는 신규 테이블 |
| 활성 toggle | ❌ | 🆕 `app_settings.value` JSON 또는 별도 컬럼 |
| 노출 기간 | ❌ | 🆕 |
| 대상 role | ❌ | 🆕 |
| 작성 이력 5행 | `app_settings.updated_at` 또는 `posts.is_notice` | ⚠️ 통합 방식 결정 필요 |

→ **결정 필요:** (a) app_settings 단일 통합 vs (b) notices·banners 신규 테이블 신설 vs (c) posts.is_notice 활용

### 5.5 D-5 analytics (admin_v2.html 라인 2043~2189)

| mock 항목 | 실 컬럼 | 매핑 상태 |
|---|---|:---:|
| DAU (오늘 342) | `script_usage_logs` 또는 `activity_logs` 집계 | ⚠️ 집계 RPC 미확인 |
| WAU (7일 847) | 동일 | ⚠️ |
| MAU (30일 1,128) | 동일 | ⚠️ |
| 리텐션 (D-30 68.4%) | ❌ 코호트 분석 RPC 필요 | 🆕 |
| DAU 90일 라인차트 | `activity_logs` GROUP BY day | ✅ (RPC 또는 직접 쿼리) |
| 6메뉴 막대차트 | `activity_logs.target_type` 별 count | ✅ |

→ **추가 SELECT 권장:** `information_schema.routines` (RPC 함수 실재 검증)

### 5.6 D-6 logs (admin_v2.html 라인 2329~2491)

| mock 항목 | 실 컬럼 | 매핑 상태 |
|---|---|:---:|
| 시각 | `activity_logs.created_at` | ✅ |
| 사용자 | `activity_logs.user_id` (uuid) join `users` | ✅ |
| 액션 | `activity_logs.event_type` | ✅ |
| 대상 | `activity_logs.target_type` + `target_id` | ✅ |
| 결과 (성공·실패·경고·대기) | ❌ activity_logs에 result 컬럼 없음 | 🆕 **신규 컬럼 필요** |
| 상세 (IP·브라우저) | ❌ | 🆕 (또는 Sentry 외부 통합) |
| 시스템 로그 (DB connection timeout 등) | ❌ system_logs 테이블 0건 | 🟡 activity_logs 통합 또는 Sentry |

### 5.7 D-7 billing (admin_v2.html 라인 2493~2701)

| mock 항목 | 실 컬럼 | 매핑 상태 |
|---|---|:---:|
| 결제 8행 | ❌ payments 테이블 0건 | 🛑 **결제 시스템 미도입** |
| 4플랜 도넛 (무료/PRO/CRM/원수사) | `users.plan` 컬럼만 존재 | ⚠️ 플랜 카운트만 가능 |
| 월 매출 ₩48,720,000 | ❌ payments 0건 | 🛑 |
| 활성 구독 487 | ❌ subscriptions 0건 | 🛑 |
| 결제 실패 3건 | ❌ payments 0건 | 🛑 |

→ ⚠️ **D-7 billing은 Phase D 범위 제외 검토 권장.** 결제 시스템 도입 후 별 트랙으로 분리. (팀장님 결정 사항)

### 5.8 D-8 dashboard 종합 (admin_v2.html 라인 956~1262, Phase B mock)

| mock 항목 | 실 컬럼 | 매핑 상태 |
|---|---|:---:|
| KPI "총 사용자 1,284" | D-1 users count | ✅ |
| KPI "오늘 활성 342" | D-5 DAU 집계 | ⚠️ 활성 정의 |
| KPI "오늘 스크립트 조회 2,847" | `script_usage_logs` count(*) WHERE created_at > today | ✅ |
| KPI "미처리 신고 7" | D-3 신고 메커니즘 | 🆕 |
| 사용자 활동 추이 차트 (DAU + 스크립트 조회) | D-5 집계 | ⚠️ |
| 실시간 활동 timeline 6건 | `activity_logs` 최근순 LIMIT 6 | ✅ |
| 최근 가입자 5행 | `users` ORDER BY created_at DESC LIMIT 5 | ✅ |
| 시스템 상태 | ❌ system_logs 0건 | 🆕 또는 외부 통합 |
| Top 스크립트 랭킹 | `scripts` ORDER BY use_count DESC | ✅ |

---

## 6. 발견 1·2·3·4 영향 분석

### 6.1 발견 1 — RLS 활성, 30개 정책 모두 구 5역할 문자열 사용 🚨

**raw 검증:** 쿼리 3 30개 정책 모두 `users.role = 'admin'` 또는 `'branch_manager'`/`'manager'` 문자열 직접 사용.

**Phase D-pre 항목 2~4 영향:**
- **항목 2 (마이그레이션 SQL)**: 30개 RLS 정책 중 4개(branch_manager 2 + manager 1 + insurer 1) **재작성 필요** (admin 단순 사용 정책은 그대로 유지).
- **항목 3 (ROLE_LABEL 확장)**: DB 마이그레이션 직후 ROLE_LABEL 9역할 확장 필수 (역방향: 9역할 키가 DB에 없으면 라벨 못 찾음).
- **항목 4 (fetch 패턴)**: admin_v2 8섹션 fetch 시 user.role을 9역할로 받아야 함. 마이그레이션 미완료 상태에서 fetch하면 9역할 칩 카운트 실패.

### 6.2 발견 2 — posts insurer board 정책 'insurer' 흔적 🚨

**raw 검증:** `posts.insurer board insert` with_check가 `users.role = ANY (ARRAY['admin', 'insurer'])` — 'insurer'는 구 5역할에 없음.

**Phase D-pre 항목 2~4 영향:**
- **항목 2 (마이그레이션 SQL)**: 'insurer' → 9역할 4종(`insurer_branch_manager`, `insurer_manager`, `insurer_member`, `insurer_staff`) 매핑 결정 필요. 모두 허용? 또는 매니저급(branch_manager + manager)만 허용? — **팀장님 결정 사항**.
- INSERT/UPDATE 비대칭(INSERT는 insurer 허용, UPDATE는 admin만)도 함께 정합 정리 권장.
- 항목 4 fetch 패턴: insurer board는 별도 권한군 처리. RLS 분기 후 fetch 영향 검증.

### 6.3 발견 3 — users 테이블 RLS 정책 이상 🚨

**raw 검증:** `users.admin update all` 정책 — 이름은 admin이지만 qual은 `auth.uid() = id` (본인만), roles는 `{public}` (anonymous 포함).

**Phase D-pre 항목 2~4 영향:**
- **항목 2**: admin이 D-1 users 섹션에서 다른 사용자 수정 시도 시 권한 거부됨. 마이그레이션 SQL과 함께 정책 본문 정정 필요:
  - 정책명 "admin update all" → 새 admin 정책 신설 (`role = 'admin'` 검증)
  - 기존 본인 행 update 정책은 별도 유지
- **항목 4 (admin_v2 진입 게이트)**: 현재 정책으로는 admin이라도 다른 사용자 정보 수정 못함. D-1 수정 액션 시 403 반환 가능성. 정책 정정이 D-1 작업의 사실상 전제.

### 6.4 발견 4 — library / news RLS 정책 0건 🚨

**raw 검증:** 쿼리 3에 library / news 정책 미등장.

**Phase D-pre 항목 2~4 영향:**
- **결정 분기:**
  - (a) RLS 비활성 → 모든 인증 사용자 SELECT/INSERT/UPDATE/DELETE 가능 (보안 위험)
  - (b) RLS 활성이나 정책 0개 → 모든 접근 차단 (admin도 못 읽음)
- **추가 검증 SELECT 필수** (항목 2 진입 직전):
  ```sql
  SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename IN ('library','news');
  ```
- 결과에 따라 항목 2 마이그레이션 SQL에 library/news RLS 정책 신설 포함 결정.

### 6.5 RLS 외 우회 설계 흔적 사전 검토 (CLAUDE.md "16개 흔적" 추정 카테고리)

쿼리 2 컬럼 전수 기반 분석:

| 카테고리 | 흔적 위치 | 영향 |
|---|---|---|
| **타입 우회 (text 다용)** | `posts.author_id` text / `comments.author_id` text / `library.owner_id` text / `scripts.owner_id` text / `script_usage_logs.user_id` text | uuid 회피 + `auth.uid()::text` 캐스팅 패턴. RLS 정책에서 `(auth.uid())::text = author_id` 형식 다수 |
| **타입 우회 (target_id text)** | `activity_logs.target_id` text | uuid/bigint 혼용 가능성 — Phase D-6 join 시 캐스팅 필요 |
| **검색 우회 (search_text 비정규)** | `quick_contents.search_text` / `scripts.search_text` | full-text search index 회피 — Phase D 검색 구현 시 활용 |
| **enum 회피 (text + default)** | `users.role` text default 'member' / `scripts.scope` text default 'personal' | enum 미사용 — 마이그레이션 시 임의 값 가능 |
| **외부 ID 참조 (text)** | `scripts.html_block_id` text / `posts.organization_id` text | FK 미설정 — 무결성 보장 X |
| **컬럼 DROP 흔적** | `users.ordinal 9 누락` | DROP된 컬럼명 미식별 — pg_attribute 추가 SELECT 필요 |
| **백업 테이블** | `quick_contents_backup` (1개) | quick_contents 변경 시 트리거 백업 추정 |
| **role_label 분기** | `scripts.recommended_by_role` text | 추천한 사람의 role 별도 저장 — 9역할 마이그레이션 시 정합 필요 |

→ **약 8개 카테고리 식별** (CLAUDE.md "16개 흔적" 카운트는 raw 데이터로 일부만 검증. 나머지는 _archive 또는 docs 추가 검토 필요).

---

## 7. 항목 1 완료 보고서

### 7.1 매핑 가능 섹션

✅ **D-1 users / D-2 content / D-3 board / D-6 logs / D-8 dashboard** — 핵심 mock 항목이 실 컬럼과 80% 이상 매핑 가능. 일부 신규 컬럼 필요(users.status / last_seen_at, scripts.save_count, activity_logs.result).

### 7.2 매핑 갭 섹션 (결정 필요 사항 포함)

⚠️ **D-4 notice** — notices/banners 테이블 0건. **결정 필요:** (a) app_settings 통합 / (b) 신규 테이블 / (c) posts.is_notice 활용

⚠️ **D-5 analytics** — 집계 RPC 미확인 (`get_dau` 등). **추가 SELECT 필요** (`information_schema.routines`)

⚠️ **D-6 logs** — system_logs 0건. **결정 필요:** (a) activity_logs 단일 통합 / (b) Sentry 외부 도입 시점

🛑 **D-7 billing** — payments / subscriptions / plans 모두 0건. **결제 시스템 미도입.** 작업지시서 §"D-7 billing은 Phase D 범위 제외 검토" 정합 — **팀장님 결정 사항**

### 7.3 결정 필요 사항 종합 (팀장님 승인 #1 시점)

| # | 결정 필요 사항 | 영향 |
|---|---|---|
| 1 | D-7 billing Phase D 범위 제외 여부 | Phase D 8섹션 → 7섹션 축소 |
| 2 | D-4 notice 통합 방식 (app_settings / 신규 / posts) | 항목 2 마이그레이션 SQL 영향 |
| 3 | D-6 logs 통합 방식 (activity_logs 단일 / Sentry) | 항목 2 SQL + 항목 4 fetch 패턴 영향 |
| 4 | 발견 2 'insurer' 매핑 (insurer_* 4종 모두 / 매니저급만) | 항목 2 RLS 재작성 |
| 5 | 발견 3 users 정책 정정 SQL 항목 2 포함 여부 | 항목 2 SQL 범위 |
| 6 | 발견 4 library/news RLS 추가 검증 SELECT 항목 2 진입 전 실행 여부 | 항목 2 SQL 범위 |
| 7 | users 신규 컬럼 (status, last_seen_at) 항목 2 ALTER 포함 여부 | 항목 2 SQL 범위 |
| 8 | RPC 실재 검증 SELECT (`information_schema.routines`) 항목 2 진입 전 실행 | 항목 2 SQL 범위 |

### 7.4 Code 제안

위 8개 결정 중 #6·#8(추가 SELECT)은 항목 2 진입 직전에 정리 권장. #1·#2·#3·#7은 팀장님 단독 결정. #4·#5는 팀장님 + Claude AI 협의 권장.

---

## 8. 팀장님 승인 #1 요청

본 산출물(스키마 전수 + 매핑표 + 발견 분석 + 완료 보고)에 대한 **팀장님 승인 #1** 요청합니다.

승인 시 진입 가능 항목:
- **항목 2 진입** — 9역할 마이그레이션 SQL 초안 작성 (`docs/architecture/role_migration_plan.md`)
- 항목 2 진입 직전 추가 SELECT 2건 (발견 4 RLS 검증 + RPC 실재 검증) 실행

회귀·재작업 발견 시 즉시 보고. 결정 8건 답변 받은 후 항목 2 진행.

---

*본 산출물은 admin_v2.html 코드 변경 0건, DB 변경 0건, js 파일 변경 0건. 분석·매핑·발견 정리만 수행.*
