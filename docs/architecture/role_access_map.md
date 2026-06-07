---
title: 원세컨드 권한 전수조사 — role_access_map (권한 기준 문서)
date: 2026-06-07
작성자: Claude Code (코드 전수 기반)
대상 DB: pdnwgzneooyygfejrvbg (onesecond-v1-restore-0420, 유일 진실 원천)
토대 문서: docs/architecture/health_check_2026-06-03.md (A축 메뉴×롤 / B축 RLS 실측)
배경: (주)에즈금융서비스 / 직할팀 / 마케팅본부 등 표준 조직 모델(지점→팀) 밖 매핑 가입자 발생
       → "내가 설계한 권한대로 실제 사용자가 보고 있는가?"의 기준 문서 신설
용도: 향후 MY SPACE 개편 · 검색 개편 · 보험사 확장의 권한 기준점
---

# 원세컨드 권한 전수조사 — role_access_map

> **한 줄 결론:** 화면 게이트(프론트)는 CSS·JS 3겹으로 동작하고, 면역(RLS)은 32테이블 전부 ON이라
> **데이터 유출 경로는 없다.** 단 ① 화면 게이트와 RLS의 "기준 컬럼" 불일치, ② GA 가입 시
> `branch_id`/`team_id` NULL 저장으로 인한 **조용한 제외(빈 화면)**, ③ 코드 내부 주석↔실제 마크업
> 불일치(현장의 소리)가 차이 후보로 남는다. **모두 기능 결손 성격이지 유출 아님.**

## 📑 출처 3분류 (전 표 엄수)

| 태그 | 의미 |
|---|---|
| `[실측 6/3]` | `health_check_2026-06-03.md`가 신버전 DB에서 직접 실측한 사실 (pg_policies / relrowsecurity) |
| `[실측 6/7]` | 크롬이 2026-06-07 라이브·DB에서 직접 실측 (§2 미확인 해소 / §5 계정 검증 합류분) |
| `[코드 기준]` | repo 코드·SQL 파일에서 직접 확인 (app.html / js/*.js / *.sql, 파일:라인 명기) |
| `[미확인]` | 코드·문서 어디서도 확정 못함 (SQL 파일 미발견 / RPC 내부 등) → **크롬 후속 필요** |

> 🚨 본 문서는 DB를 직접 조회하지 않았다. `[실측 6/3]`은 6/3 시점 health_check의 실측을 인용한 것이며,
> 6/3 이후 변동분과 `[미확인]` 항목의 실측 확정은 **크롬 영역**이다. 추측을 `[실측]`으로 표기한 곳은 0건이다.

---

## §1. 설계표 — 9롤 × 메뉴 노출 매트릭스

### 1-1. 화면 게이트 구조 (3겹)

`[코드 기준]` 게이트는 다음 3겹으로 동작한다:

1. **CSS 클래스 게이트** — `app.html:36-40`
   - `#nav-insurer-vault{display:none}` (기본 숨김)
   - `#app.is-insurer .nav{display:none}` (원수사 = 전 메뉴 숨김)
   - `#app.is-insurer .nav.ins-show{display:flex}` (그 중 `ins-show`만 노출)
   - `#app.is-admin #nav-insurer-vault{display:flex}` (admin = 전체 + 자료실 추가)
2. **JS role 클래스 부착** — `applyRoleClass()` `app.html:2840-2857`
   - `is-admin`(admin) / `is-insurer`(insurer_*) 클래스 부착 `app.html:2844-2845`
   - `nav-admin` 메뉴 = admin만 `display` `app.html:2848`
   - 팀원관리 탭 = `['admin','ga_branch_manager','ga_manager']`만 `app.html:2850-2853`
   - 통합 검색(`.head .search`) = admin만 `app.html:2856`
3. **showView() 진입 가드** — `app.html:3671`
   - `key==='team'` → `'myspace'` 강제 (매니저룸 메뉴 폐지, 2026-06-05 통합 2단계)
   - `key==='insurer-vault'` && `!_canSeeVault()` → `'home'`
   - `key==='admin'` && `!_canSeeAdmin()` → `'home'`
   - **그 외 view(home/myspace/scripts/quick/voice/news/pricing/together)에는 런타임 가드 없음**
4. **bootView() 초기 진입 가드** — `app.html:3681-3696` (부팅 시 1회만)
   - `firstViewFor(role)`: insurer_* → `insurer-vault`, 그 외 → `home` `app.html:3679`
   - insurer_*가 `['insurer-vault','voice','together']` 외 view로 부팅 시 → `insurer-vault` 강제 `app.html:3688`

role 판별: `_getOsUserRole()` `app.html:2803` (localStorage `os_user.role`) / `_canSeeVault()` `app.html:2807` (`admin || insurer_*`) / `_canSeeAdmin()` `app.html:2813` (`admin`).

### 1-2. 매트릭스 (사이드바 메뉴 노출 = O/X/조건부)

`[코드 기준]` — `app.html:1436-1445`(메뉴 마크업) + `app.html:36-40`(CSS) + `app.html:2840-2857`(JS)

| 메뉴 (view key) | admin | ga_branch_manager | ga_manager | ga_member | ga_staff | insurer_branch_manager | insurer_manager | insurer_member | insurer_staff |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| 홈 (home) | O | O | O | O | O | X | X | X | X |
| MY SPACE (myspace) | O | O | O | O | O | X | X | X | X |
| 스크립트 (scripts) | O | O | O | O | O | X | X | X | X |
| Quick (quick) | O | O | O | O | O | X | X | X | X |
| 보험이슈 (news) | O | O | O | O | O | X | X | X | X |
| 현장의 소리 (voice) | O | O | O | O | O | **X** ⚠️ | **X** ⚠️ | **X** ⚠️ | **X** ⚠️ |
| 함께해요 (together) | O | O | O | O | O | O | O | O | O |
| 요금제 (pricing) | O | O | O | O | O | X | X | X | X |
| 보험사 자료실 (insurer-vault) | O | X | X | X | X | O | O | O | O |
| 어드민 (admin) | O | X | X | X | X | X | X | X | X |
| 통합 검색 (헤더) | O | X | X | X | X | X | X | X | X |
| 팀원관리 (MY SPACE 탭) | O | O | O | X | X | X | X | X | X |

> ⚠️ **현장의 소리(voice) 셀 주의:** insurer_*는 메뉴에 `ins-show` 클래스가 **없어 사이드바 비노출**
> (`app.html:1441` — `ins-show` 미부착). 그러나 CSS 주석(`app.html:39`)은 "자료실·현장의소리·함께해요
> 3개"라 명기, bootView(`app.html:3688`)도 voice를 insurer_* 허용 목록에 포함 → **코드 내부 3중 불일치**.
> → §6 차이 후보 #1.

> **매니저룸 셀 주의:** health_check 6/3 A축 표는 "매니저룸"을 별도 메뉴(ga_branch_manager/ga_manager에 O)로
> 표기했으나, 2026-06-05 통합으로 `team` view가 폐지(`showView`가 `myspace`로 라우팅, `app.html:3671`)되어
> 현재는 **MY SPACE 내 팀원관리 탭**으로 흡수됨. 위 표의 "팀원관리(MY SPACE 탭)" 행이 현행 기준. health_check 표는
> 그 시점 기준으로 stale. → §6 차이 후보 #7 (문서 정합).

### 1-3. URL 직접 입력(`?view=X`) 시 화면 진입 가능 여부 (별도 컬럼)

`[코드 기준]` — health_check 6/3가 지적한 "프론트 가드 한계". **단 데이터는 RLS가 방어 → 유출 없음.**

진입 가능 여부는 "부팅 시(`?view=X` 들고 첫 로드)"와 "런타임(이미 로그인 후 해시/showView 호출)"이 다르다:

| view | 부팅 시 (bootView 가드) | 런타임 (showView 가드) | 데이터 방어 |
|---|---|---|---|
| insurer-vault | admin·insurer_*만 통과, 그 외 home `app.html:3690` | `_canSeeVault()` 아니면 home `app.html:3671` | RLS posts insurer (insurer_id) |
| admin | (bootView 명시 차단 없음, showView가 잡음) | `_canSeeAdmin()` 아니면 home `app.html:3671` | RLS is_admin() 전반 |
| team | — | **myspace로 무조건 리다이렉트** `app.html:3671` | — |
| home/myspace/scripts/quick/news/pricing | insurer_*는 자료실 강제 `app.html:3688` | **런타임 가드 없음** → ga_*·누구나 열림 | RLS 각 테이블 (team/branch/insurer 격리) |
| voice/together | insurer_* 허용 `app.html:3688` | **런타임 가드 없음** | RLS team_id / board_type |

**핵심 한계 (health_check 6/3 재확인):**
- `[코드 기준]` insurer_*가 **로그인 후 런타임에** `showView('home')` 등을 호출하면 화면은 열린다(showView가 insurer-vault·admin·team만 가드). 단 메뉴가 숨겨져 클릭 경로가 없고, 부팅 시엔 자료실로 강제된다. URL 해시 조작이 유일한 경로.
- `[코드 기준]` ga_member가 `?view=team`을 시도해도 **myspace로 리다이렉트**되어 매니저룸 화면 자체가 열리지 않음 (health_check 6/3 당시 "ga_member가 매니저룸 화면 열림" 약점은 team view 폐지로 해소됨).
- `[코드 기준]` 팀원관리 탭은 JS `display:none`(`app.html:2853`)으로만 숨김 → DOM 조작 시 탭은 보일 수 있으나 데이터는 users RLS가 방어.

### 1-4. role 변경 시 메뉴 즉시 갱신

`[코드 기준]` `applyRoleClass()`/`bootView()`는 role 확정(loadUser 완료, `appstate:ready`) 후 1회 호출(`app.html:2859-2861`). **role이 세션 중 바뀌면 재부팅(새로고침) 전까지 메뉴 미갱신** 가능. health_check 6/3 동일 지적.

---

## §2. RLS 권한표 — 테이블 × 롤 × CRUD

### 2-1. 면역 스위치 전수

`[실측 6/3]` **32개 public 테이블 전부 `relrowsecurity = true`. 정책 0건 테이블 없음.** (health_check_2026-06-03.md §2)

### 2-2. SECURITY DEFINER 함수 (자기참조 재귀 회피)

`[실측 6/3]` 전부 SECURITY DEFINER로 실측 확인 (health_check_2026-06-03.md:51):

| 함수 | 용도 | 주요 참조 테이블 |
|---|---|---|
| `is_admin()` | admin 판정 | posts, team_notices, nav_*, knowledge_*, comments 등 |
| `get_my_role()` | 현재 role | users(처방B), team_invitations |
| `my_team_id()` | 내 팀 id | team_notices, nav_*, posts(navigation), users(처방B) |
| `my_branch_id()` | 내 지점 id | posts(qna), team_notices, team_invitations, users(처방B) |
| `is_insurer_employee()` | 원수사 직원 판정 | posts(navigation, 원수사 제외) |

### 2-3. 테이블별 정책 (repo SQL 파일 기준)

`[코드 기준]` 아래는 repo `*.sql` 파일에서 직접 추출 (정책명 / 명령 / 조건 / 파일:라인).

#### posts (board_type × role 정교)
| 정책 | 명령 | 조건 | 출처 |
|---|---|---|---|
| posts_select_qna_seed_or_branch | SELECT | `board_type='qna' AND branch_id=my_branch_id()` OR `qna AND source_type='seed'` OR `insurer AND source_type='seed' AND branch_id IS NULL` | `[코드 기준]` migrations/2026-05-16_d2_rls_fix_qna_navigation.sql:34 |
| posts_select_navigation | SELECT | `board_type='navigation' AND NOT is_insurer_employee() AND (branch_id=my_branch_id() OR source_type='seed' OR (audience_target='team_internal' AND team_id=my_team_id()))` | `[코드 기준]` 동 파일:56 |
| posts_admin_insert | INSERT | `is_admin()` | `[코드 기준]` migrations/2026-05-31_admin_vault_insert_rls.sql:17 |
| posts_admin_update | UPDATE | `is_admin()` | `[코드 기준]` migrations/2026-05-31_admin_moderation_rls.sql:21 |
| posts_admin_delete | DELETE | `is_admin()` | `[코드 기준]` migrations/2026-05-31_admin_moderation_rls.sql:28 |
| (posts 전체) | — | board_type×role 정교 (qna=같은지점 / manager_notice=같은팀 / insurer=같은 원수사 insurer_id / community=무제한 / hub=admin) | `[실측 6/7]` 크롬 **12정책** (health_check 6/3는 21로 실측 — §2-3 하단 주 참조) |

> 🚨 **posts 정책 수:** 크롬 6/7 실측 **12정책**(community 무제한 포함). health_check 6/3는 **21정책**으로 실측 → 차이(21→12)는 통폐합/재정의 또는 6/3 과대계상 가능. 본 문서는 최신 실측(6/7) 12를 현행으로 본다. repo SQL 파일엔 위 5개만 존재 → 나머지 7개 역보존 대상 = §6 차이 후보 #6.

#### users
| 정책 | 명령 | 조건 | 출처 |
|---|---|---|---|
| (본인) | SELECT | 본인 row | `[실측 6/3]` health_check §2 (6정책) |
| users_select_insurer_manager | SELECT | 원수사 매니저의 직원 조회 | `[실측 6/3]` health_check §3 |
| users_select_team_manager | SELECT | `get_my_role()='ga_manager' AND team_id=my_team_id()` | `[실측 6/7]` 크롬 (DB 실재 확인, SQL 파일 미보존) |
| users_select_branch_manager | SELECT | `get_my_role()='ga_branch_manager' AND branch_id=my_branch_id()` | `[실측 6/7]` 크롬 (DB 실재 확인, SQL 파일 미보존) |

> ✅ **처방 B 2정책 실재 확정 (크롬 6/7).** DB에 실재함을 실측 확인. 단 **repo에 마이그레이션 SQL 파일은 여전히 없음** → DB 재구성 시 유실 위험 = §6 차이 후보 #8 유지(역보존 대상).

#### team_notices
| 정책 | 명령 | 조건 | 출처 |
|---|---|---|---|
| team_notices_select | SELECT | `deleted_at IS NULL AND (is_admin() OR (scope='team_internal' AND team_id=my_team_id()) OR (scope='branch_internal' AND branch_id=my_branch_id()))` | `[코드 기준]` migrations/2026-05-17_branch_feed_setup.sql:69 |
| team_notices_insert | INSERT | `is_admin() OR (team_internal: role∈{ga_branch_manager,ga_manager} AND team_id 일치) OR (branch_internal: role∈{ga_branch_manager,ga_manager,ga_staff} AND branch_id 일치)` | `[코드 기준]` 동 파일:83 |
| team_notices_update / delete | UPDATE/DELETE | `is_admin() OR author_id=auth.uid()` | `[코드 기준]` migrations/2026-05-16_team_notices_setup.sql:93,101 |

#### nav_questions / nav_answers
| 정책 | 명령 | 조건 | 출처 |
|---|---|---|---|
| nav_questions_select | SELECT | `deleted_at IS NULL AND (is_admin() OR team_id=my_team_id())` | `[코드 기준]` migrations/2026-05-16_nav_v2_setup.sql:115 |
| nav_questions_insert | INSERT | `is_admin() OR (role LIKE 'ga_%' AND team_id 일치)` | `[코드 기준]` 동 파일:120 |
| nav_questions_update / delete | UPDATE/DELETE | `is_admin() OR author_id=auth.uid()` | `[코드 기준]` 동 파일:133,138 |
| nav_answers_select | SELECT | `deleted_at IS NULL AND (is_admin() OR team_id=my_team_id())` | `[코드 기준]` 동 파일:143 |
| nav_answers_insert | INSERT | `is_admin() OR role LIKE 'ga_%' OR role LIKE 'insurer_%'` | `[코드 기준]` 동 파일:148 |
| nav_answers_update / delete | UPDATE/DELETE | `is_admin() OR author_id=auth.uid()` | `[코드 기준]` 동 파일:160,165 |

#### team_invitations
| 정책 | 명령 | 조건 | 출처 |
|---|---|---|---|
| team_invitations_select | SELECT | `is_admin() OR inviter_id=auth.uid() OR (team_id IS NOT NULL AND team_id=my_team_id()) OR (branch_id IS NOT NULL AND branch_id=my_branch_id())` | `[코드 기준]` migrations/2026-05-17_team_invitations_setup.sql:68 |
| team_invitations_insert | INSERT | `inviter_id=auth.uid() AND (is_admin() OR role∈{ga_branch_manager,ga_manager})` | `[코드 기준]` 동 파일:78 |
| team_invitations_update / delete | UPDATE/DELETE | `is_admin() OR inviter_id=auth.uid()` | `[코드 기준]` 동 파일:93,99 |

> 📌 **team_invitations는 NULL을 명시 체크** (`team_id IS NOT NULL AND ...`). 처방 B(users)·다른 RLS는 이 가드가 없어 NULL이면 `NULL=NULL=FALSE`로 조용히 제외 → 모델 밖 값 대응 패턴의 모범. §4·§6 참조.

#### newsletters / scripts / personal_memos / menu_settings_by_role
| 정책 | 명령 | 조건 | 출처 |
|---|---|---|---|
| newsletters_select_authenticated | SELECT | `true` (인증 사용자 공개) | `[코드 기준]` db/newsletters/01_schema.sql:29 |
| newsletters_admin_insert/update/delete | C/U/D | `role='admin'` | `[코드 기준]` 동 파일:31,33,35 |
| scripts_update_own | UPDATE | `owner_id=auth.uid()::text` | `[코드 기준]` migrations/2026-05-25_scripts_update_own_policy.sql:16 |
| (scripts SELECT) | SELECT | `true` (전체 공개) | `[실측 6/3]` health_check §5 (개인/공용 구분 후속 검토 후보) |
| personal_memos_author_only | ALL | `user_id=auth.uid()` | `[코드 기준]` migrations/2026-05-13_personal_memos.sql:71 |
| admin_full_access_menu_settings_by_role | ALL | `role='admin'` | `[코드 기준]` migrations/2026-05-11_phase_e_menu_settings_by_role.sql:53 |
| user_read_own_role_menu_settings | SELECT | `role = (본인 role)` | `[코드 기준]` 동 파일:71 |

#### insurers / comments
| 정책 | 명령 | 조건 | 출처 |
|---|---|---|---|
| insurers_select_anon_signup | SELECT(anon) | `is_active=true` (미인증 signup 모달용) | `[코드 기준]` migrations/2026-05-11_insurers_anon_signup_policy.sql:32 |
| (insurers/comments 전체) | — | insurers 5 / comments 5 | `[실측 6/3]` health_check §2 |
| comments_admin_delete | DELETE | `is_admin()` | `[코드 기준]` migrations/2026-05-31_admin_moderation_rls.sql:34 |

#### knowledge_* (지식엔진, 전부 admin 전용)
| 테이블 | 정책 | 조건 | 출처 |
|---|---|---|---|
| knowledge_entries | kentries_admin (ALL) | `is_admin()` | `[코드 기준]` docs/migrations/2026-06-04_knowledge_entries.sql:92 |
| knowledge_extract_runs | kruns_admin (ALL) | `is_admin()` | `[코드 기준]` 동 파일:89 |
| knowledge_extract_run_items | kitems_admin (ALL) | `is_admin()` | `[코드 기준]` 동 파일:90 |
| knowledge_extract_errors | kerrors_admin (ALL) | `is_admin()` | `[코드 기준]` 동 파일:91 |
| knowledge_synonyms | ksyn_read (SELECT `true`) / ksyn_write (ALL `is_admin()`) | 검색 확장은 공개·쓰기는 admin | `[코드 기준]` docs/migrations/2026-06-05_knowledge_synonyms.sql:19-20 |
| knowledge_logs | klogs_admin (ALL) | `is_admin()` | `[코드 기준]` docs/migrations/2026-06-06_knowledge_logs.sql:36 |

#### calendar_events / teams / branches / companies / activity_logs / notifications
| 테이블 | 정책 요지 | 출처 |
|---|---|---|
| calendar_events | 4정책 — 권한별(개인/전체/팀/지점/원수사) | `[실측 6/3]` health_check §2 (repo SQL 미확인 → `[미확인]` 상세) |
| teams | 4정책 — 같은 지점 | `[실측 6/3]` health_check §2 |
| branches / companies | 1~3정책 — 용도별 적정 | `[실측 6/3]` health_check §2 |
| activity_logs | 6정책 — 본인+매니저(팀)+지점장(지점) | `[실측 6/3]` health_check §2 |
| notifications | 1~3정책 | `[실측 6/3]` health_check §2 |

#### board_reads / push_subscriptions / posts(community) — 크롬 실측 해소 (2026-06-07)
| 테이블 | 상태 | 출처 |
|---|---|---|
| board_reads | RLS ON·**3정책** 실재 확인 | `[실측 6/7]` 크롬 |
| push_subscriptions | RLS ON·**1정책** 실재 확인 | `[실측 6/7]` 크롬 |
| posts (전체) | **12정책** 실재 (board_type='community' 무제한 포함) | `[실측 6/7]` 크롬 |

> 🚨 **posts 정책 수 정정:** health_check 6/3는 posts **21정책**으로 실측했으나, 크롬 6/7 실측은 **12정책**.
> 차이(21→12)는 정책 통폐합/재정의 또는 6/3 과대계상 가능 — 본 문서는 **최신 실측(6/7) 12정책**을 현행으로 본다.
> repo SQL 파일엔 여전히 5개만 존재(§2-3 posts) → 나머지 7개 역보존 대상은 §6 차이 후보 #6 유지.

### 2-4. role별 CRUD 요약 (패턴)

`[코드 기준]` + `[실측 6/3]` 종합:

| 격리 패턴 | 대상 테이블 | 핵심 조건 |
|---|---|---|
| admin 전담 | knowledge_*(6), newsletters(C/U/D), menu_settings, posts 모더레이션 | `is_admin()` |
| 팀·지점 격리 (GA) | team_notices, nav_*, team_invitations, posts(qna/navigation) | `my_team_id()` / `my_branch_id()` |
| 개인 격리 | personal_memos, scripts(UPDATE) | `auth.uid()` |
| 원수사 격리 | posts(insurer, insurer_id), nav_answers(insurer_* 작성) | `insurer_id` / `is_insurer_employee()` |
| 인증 공개 | newsletters(SELECT), knowledge_synonyms(read), scripts(SELECT) | `true` |

---

## §3. 권한 부여 경로 추적

### 3-1. GA(설계사) 흐름 vs 보험사(insurer) 흐름

`[코드 기준]`

| 단계 | GA 흐름 | 보험사 흐름 |
|---|---|---|
| 사이트 선택 | `gSignupSite='ga'` `js/auth-modal.js:1495+` | `gSignupSite='insurer'` `js/auth-modal.js:1302+` |
| 직급 선택 | branch_manager/manager/member/staff | branch_manager/manager (지점장·매니저만) |
| role 결정 | `mapToRoleKey('ga', grade)` → `ga_*` `js/auth-modal.js:1159` | `mapToRoleKey('insurer', grade)` → `insurer_*` |
| OTP 발송 시 metadata | `{name,phone,company,branch,role,team, insurer_id:'',branch_id:'',team_id:'', status:'active'}` `js/auth-modal.js:1552-1563` | 1단계 `{status:'pending'}` `js/auth-modal.js:1322-1329` |
| OTP 인증 후 | 즉시 활성 (verifyOtp → 토큰 저장 → 리다이렉트) `js/auth-modal.js:618-634` | `updateInsurerProfile` PUT `{...,role:insurer_*,insurer_id, status:'pending', desired_branch_names:[...]}` `js/auth-modal.js:1437-1457` |
| 활성화 시점 | **가입 즉시 `active`** | **admin 승인 후 `active`** |
| 승인 | 없음 | 카톡 채널 안내 → admin `approve_insurer_user` RPC `js/admin-console.js:394` |

핵심: **GA = `status:'active'` 즉시 / 보험사 = `status:'pending'` 승인제.** 기본 role 미지정 시 `ga_member` (`js/auth-modal.js:1159-1162`).

### 3-2. admin 승인 경로 (보험사)

`[코드 기준]`
- admin 콘솔이 `users?status=eq.pending&role=like.insurer_*` 조회 `js/admin-console.js:344-413`
- 담당 지점 선택 후 `/rest/v1/rpc/approve_insurer_user {p_user_id, p_branch_ids}` 호출 `js/admin-console.js:394`
- `[미확인]` RPC 내부 동작(status='active' 변경 + branch 매핑)은 **SQL 파일 미발견** → 크롬/DB 실측 필요
- admin 사이드바 미처리 가입승인 배지 = `users?status=eq.pending&role=like.insurer_*` count `app.html:2821`

### 3-3. user_metadata → public.users 동기화 지점

`[코드 기준]` 클라이언트는 **public.users에서 읽기만** 한다:
- `mergeUserProfile()` `js/auth.js:34-57` — `/rest/v1/users?id=eq.{uid}&select=role,name,plan,phone`
- `loadUser()` `js/auth.js:119-201` — `select=name,role,phone,email,company,branch,team,plan,insurer_id`

`[실측 6/7]` **동기화 주체 = `handle_new_user` 트리거 확정 (크롬 6/7).** 클라이언트는 public.users에서 읽기만 하고, **가입 시 `handle_new_user` 트리거가 user_metadata를 public.users로 동기화**한다. 트리거는 **`branch_id`/`team_id`를 metadata 기반으로 기록** — 따라서 가입 폼이 `branch_id`/`team_id`를 metadata에 미전달하면 트리거가 **NULL을 기록**한다 (§4 조용한 제외의 근본 원인, organization_policy §5 참조).

### 3-4. 괴리 발생 가능 지점

`[코드 기준]` 코드 로직에서 도출한 괴리 시나리오:

| # | 시나리오 | 결과 | 근거 |
|---|---|---|---|
| A | OTP 발송 후 미인증 | auth.users만 생성, public.users row 없음 | verify 실패 시 롤백 없음 `js/auth-modal.js:1326-1354` |
| B | `updateInsurerProfile` PUT 실패 | metadata에 status='pending'만, 개인정보 미기록 | `js/auth-modal.js:1437-1473` (실패 시 return) |
| C | `approve_insurer_user` RPC 실패 | pending 유지, 권한 미부여 | `js/admin-console.js:394-413` (롤백 없음) |
| D | loadUser 시 public.users row 미완성 | `_applyAuthFallback()` → 빈 role/name 진행 | `js/auth.js:147-154` |
| E | **GA 가입 시 branch_id/team_id = NULL** | metadata엔 branch/team 문자열, public.users `*_id`는 NULL → admin 수동 매핑 필요 | `js/auth-modal.js` GA 분기 (드롭다운 폐기, `branchId/teamId=NULL`) |

> 🚨 시나리오 E가 본 작업의 트리거(에즈금융/직할팀/마케팅본부)와 직결. §4 참조.

---

## §4. 조직 매핑 정합성

### 4-1. company / branch / team 소비처 전수

`[코드 기준]`

| 소비처 | 파일:라인 | 용도 | 모델 밖 값(NULL/비표준) 시 거동 (코드 기준 예측) |
|---|---|---|---|
| AppState 저장 | js/auth.js:163-165 | 화면 표시용 | NULL → 빈 문자열. 표시만 빈칸 |
| 어드민 사용자카드 | js/admin-console.js:218,356,369 | 회사·이메일 렌더 | NULL → `'-'` 또는 빈칸 |
| 어드민 지점별 인원 집계 | js/admin-console.js:174,229 | `cnt[u.branch_id]` | NULL → `cnt['undefined']` 키, **집계 누락** |
| 스크립트 내정보 수정 | js/scripts-page.js:298-379 | 폼·PATCH | NULL → input 빈값, PATCH에 NULL/빈값 전송 |
| 매니저룸 지점장카드 | app.html:6207 | `role='ga_branch_manager'` 1명 조회 | RLS 의존, 첫 지점장만 |
| 매니저룸 지점조직 로드 | app.html:6223-6227 | **하드코딩 branch_id**로 teams/users 조회 | branch_id NULL 사용자 → 쿼리 제외 |
| 매니저룸 실장관점 | app.html:6250-6251 | branch_id 필터 + team_id 그룹 | team_id NULL → 우측 팀원 미표시 |
| 매니저룸 팀원목록 | app.html:6783 | `role LIKE 'ga_*'` 전체조회 (필터 X) | RLS 의존 (전체 노출 분기 X) |
| 조직 트리 렌더 | app.html:6228-6264 | `team_id===t.id` 그룹핑 | team_id NULL → 어떤 팀에도 미포함(고아), 화면 미표시 |
| 매니저룸 공지작성 | app.html:6834-6845 | team_id/branch_id INSERT | NULL → NULL 저장, 어떤 팀/지점에도 안 속함(타인 RLS로 못 봄) |

### 4-2. 하드코딩 발견

`[코드 기준]`
- **branch_id 고정값** `'306edf6a-15db-4b69-a6b9-dae74b08cd33'` (더원지점) — `app.html:6223, 6291` (코드 주석 `TODO: 로그인 지점으로 동적화`)
  - 🚨 다른 지점 지점장/실장은 매니저룸이 **더원지점 데이터만** 보거나 빈 화면 → §6 차이 후보 #4
- "직할팀"/"마케팅본부"/"에즈금융" 문자열 — **코드/RLS엔 하드코딩 없음**. 시드 데이터(`migrations/2026-05-16_kakao_*.sql` 등)에만 존재 (프로덕션 로직 영향 없음)
- `canonical_company_name` — 코드에서 미발견 (검색/지식엔진 정규화 용어로만 언급)

### 4-3. 모델 밖 매핑 시 화면 거동 종합 (코드 기준 예측)

`[코드 기준]` 표준 모델(지점→팀) 밖 사용자(team_id=NULL / branch_id=NULL / 비표준 branch명)의 거동:

| 기능 | 거동 | 성격 |
|---|---|---|
| 홈 인사말·프로필 | 소속 빈칸으로 표시 | 표시 결손 |
| 매니저룸 (ga_manager) | users RLS `team_id=my_team_id()` → `NULL=NULL=FALSE` → **빈 화면** | 기능 결손 (유출 X) |
| 매니저룸 (ga_branch_manager) | users RLS `branch_id=my_branch_id()` → FALSE → **빈 화면** | 기능 결손 |
| 팀 공지(team_notices team_internal) | `team_id=my_team_id()` FALSE → 공지 안 보임 | 기능 결손 |
| 지점 게시판(branch_internal) | `branch_id=my_branch_id()` FALSE → 안 보임 | 기능 결손 |
| 네비방(nav_questions) | `team_id=my_team_id()` FALSE → 안 보임 | 기능 결손 |
| 어드민 지점별 집계 | NULL 키로 집계 누락 | 통계 왜곡 |

**결론(코드 기준):** 모델 밖 값 = **조용한 제외(빈 화면)**. 데이터 유출도 에러도 없고, 봐야 할 내 것이 안 보이는 **기능 결손**. health_check 6/3가 "GA 실장 빈 화면"으로 처방한 것과 동일 원인(NULL 매칭). 처방 B(users 2정책)조차 `team_id`/`branch_id`가 NULL이면 작동하지 않는다 (team_invitations만 `IS NOT NULL` 가드 보유).

---

## §5. 실제 계정 검증표 (크롬 2026-06-07 실측 합류)

> "실제 노출"·"실측 소견" 컬럼 = 크롬 라이브 검증 결과. `[실측 6/7]` 표기. 미검증분은 `_`.
> 마스킹 표준: 이메일 `by***@gmail.com` / 이름 "AZ 본부장 계정" 식. 실명·이메일 원문 금지.

현재 사용자 분포(CLAUDE.md 기준): admin 1 / ga_manager 2 / ga_member 5 / insurer_branch_manager 1 / insurer_member 1 = 10명.

| 계정(마스킹) | role | 설계상 노출(§1·§2 기준) | 실측 소견 (크롬 6/7) | 차이 |
|---|---|---|---|---|
| (admin 본 계정) | admin | 전 메뉴 + 어드민 + 통합검색 | _ | _ |
| (ga_manager #1·#2) | ga_manager | 홈~요금제 + 팀원관리 탭 / 내 팀 범위 | _ | _ |
| (ga_member #1~#5) | ga_member | 홈~요금제 (팀원관리 X) / 내 팀 범위 | _ | _ |
| (insurer_member) | insurer_member | 자료실 + 함께해요 | **현장의 소리 메뉴 노출됨**(display:flex) `[실측 6/7]` | ⚠️ 차이 #1 확정 → fix PR #464 |
| (메리츠 테스트 #1·#2) | insurer 계열 | 자료실 + 함께해요 / posts insurer(insurer_id) | **GA 더원지점 branch_id(`306edf6a…`) 보유** `[실측 6/7]` | ⚠️ 신규 의심 #10 (org_policy §3 위반) |
| (dod*** 계정) | (GA 계열) | team_id·branch_id 정합 기대 | **team_id 有 · branch_id 無 모순** `[실측 6/7]` | ⚠️ 신규 의심 #11 |
| (비로그인 `?view=voice`) | — | (게이트 없음) | **화면 렌더됨(데이터 0건)** `[실측 6/7]` | ⚠️ 차이 #1에 포함 → fix PR #464 |

> 📌 위 외 계정(admin·ga 다수)의 행별 사이드바·매니저룸 실측은 미진행(`_`). team_id/branch_id NULL 보유
> 계정 식별 쿼리(아래)는 크롬 후속 진행 대상.

**크롬 후속 확인 쿼리(읽기 전용, 크롬 영역):**
- `users?select=email,role,company,branch,team,branch_id,team_id,insurer_id,status` → 모델 밖 값(branch_id/team_id NULL) 보유 계정 전수 식별
- 각 계정 로그인 → 사이드바 실제 메뉴 / 매니저룸 화면 / 현장의소리 노출 대조

---

## §6. 차이 후보 리포트

> §1(프론트) ↔ §2(RLS) ↔ §3(부여 경로) 간 불일치 의심 항목. 위험도(상/중/하) + 확인 방법.

| # | 차이 후보 | 위험도 | 판정 (6/7) | 확인 방법 / 처방 |
|---|---|---|---|---|
| 1 | **현장의 소리 3중 불일치** — insurer 계열 메뉴 노출(실측)·`?view=voice` 진입 가능. CSS 주석·bootView도 voice 허용 | 상 | ✅ **차이 확정** (크롬 6/7 실측: insurer voice 노출 + 비로그인 진입) → **fix [PR #464](https://github.com/onesecond-solutions/onesecond/pull/464)** | 머지 후 크롬 재검증 (insurer 미노출·차단 / ga·admin 회귀 0) |
| 2 | **가입 branch_id/team_id NULL** → 매니저룸·팀공지·네비방·지점게시판 조용한 제외(빈 화면) | 상 | ✅ **근본원인 규명** (크롬 6/7): 가입 폼이 branch_id/team_id를 metadata 미전달 → `handle_new_user` 트리거 NULL 기록 (§3-3) | **처방 = organization_policy §5** (조직 선택지 전환 + 11건 백필, v2 이후 별도 결재) |
| 3 | **동기화 주체** | 중 | ✅ **확정** (크롬 6/7): `handle_new_user` 트리거, branch_id/team_id metadata 기반 (§3-3) | 해소. RPC `approve_insurer_user` 내부는 §10 후속 |
| 4 | **매니저룸 하드코딩 branch_id**(더원지점, `app.html:6223,6291`) — 타 지점 지점장/실장 빈 화면 | 중 | `[코드 기준]` 유지 (코드 사실, 실측 무관) | 코드 TODO 동적화 (별도 결재). 크롬: 비더원 ga_branch_manager 거동 |
| 5 | **팀원관리 탭 JS 숨김만**(`app.html:2853`) — DOM 조작 시 탭 노출 (데이터는 users RLS 방어) | 중 | 미검증 | 크롬: ga_member로 탭 강제 노출 후 데이터 안 새는지 |
| 6 | **posts 정책 일부 SQL 파일 미발견** — 실측 12정책(6/7) 중 repo엔 5개만 | 중 | 부분 해소 (실측 12정책, §2) — 나머지 7개 역보존 대상 | 크롬/DB: posts 전 정책 덤프 → repo 역보존 |
| 7 | **health_check A축 표 stale** — 매니저룸 별도 메뉴 표기, 현재는 MY SPACE 팀원관리 탭 흡수 | 하 | 본 문서 §1이 현행 | health_check는 6/3 시점 보존 |
| 8 | **users 처방 B 2정책 SQL 파일 부재** | 중 | 실재 확정 (크롬 6/7, §2) — repo SQL 여전히 부재 | repo에 마이그레이션 역작성 (별도 결재) |
| 9 | **board_reads / push_subscriptions / posts(community) 정책** | 중 | ✅ **실측 해소** (크롬 6/7: board_reads 3 / push_subscriptions 1 / posts community 무제한, §2) | — |
| **10** | **메리츠 테스트 계정 2건 GA 지점 branch_id 보유** (`306edf6a…` 더원지점) — insurer가 GA 지점에 매핑 | 중 | ⚠️ **신규 의심** (크롬 6/7) — 테스트 계정이라 무해하나 **실보험사 입점 전 `approve_insurer_user` 부여 로직 점검 필수** | organization_policy §3 (GA 지점 매핑 금지) |
| **11** | **dod*** 계정 team_id 有 · branch_id 無 모순** — 팀은 있는데 지점이 없음 | 중 | ⚠️ **신규 의심** (크롬 6/7) — 조직 계층(지점→팀) 역전 데이터 | 크롬: 해당 계정 매니저룸/공지 거동 + 백필 검토 (org_policy §4) |

**위험도 상 = 2건** (#1 확정·fix PR #464 / #2 근본원인 규명·org_policy §5 처방 예약).

### 크롬 후속 검증 필요 항목 (잔여)
1. `users` 전수 SELECT → branch_id/team_id NULL·비표준 보유 계정 **전수 식별** (#2 영향 범위)
2. fix PR #464 머지 후: insurer 미노출·`?view=voice` 차단 / ga·admin 회귀 0 (#1 재검증)
3. `approve_insurer_user` RPC 정의 — 메리츠 계정 branch_id 부여 경위 (#10)
4. 비더원 ga_branch_manager 매니저룸 거동 (#4)
5. posts 전 정책 덤프 → repo 역보존 (#6) / users 처방 B 마이그레이션 역작성 (#8)
6. dod*** 계정 거동 + 백필 검토 (#11)

---

## 부록 — 본 문서 운영

- 본 문서 ↔ health_check_2026-06-03 충돌 시: **메뉴 매트릭스는 본 문서(현행)**, RLS 실측 사실은 health_check(6/3 실측) 우선. 6/3 이후 변동은 본 문서 §2가 보강.
- DB 변경·코드 수정 0건 (100% 문서). 신규 RLS/RPC 필요 판단 = 설계 오류 신호 → 별도 보고.
- 향후 MY SPACE 개편·검색 개편·보험사 확장 진입 시 본 문서 §1·§2·§4를 권한 기준점으로 점검.
- 크롬 검증 결과 합류 시 §5 채우고 §6 위험도 갱신.

**END OF DOCUMENT**
