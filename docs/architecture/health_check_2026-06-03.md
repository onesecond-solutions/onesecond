---
title: 원세컨드 유기체 건강검진 결과지 (메뉴×롤 + RLS 전수)
date: 2026-06-03
검진자: Claude Code (실측 기반)
대상 DB: pdnwgzneooyygfejrvbg (onesecond-v1-restore-0420, 유일 진실 원천)
배경: 4팀 오픈(2026-05-20) 후 확장 전, "사이드바 메뉴 전체 + 롤별 RLS가 건강한 유기체처럼 돌아가는가" 팀장님 점검 요청
방법: 코드 전수(app.html 게이트) + DB 실측(pg_policies / pg_class.relrowsecurity) — 과거 덤프·문서 단정 금지(CLAUDE.md 원칙)
---

# 원세컨드 유기체 건강검진 결과지

> **한 줄 결론:** 면역(RLS)은 32개 테이블 전부 건강하다. 화면 게이트도 대체로 건강. 유일한 실질 격차였던 "GA 실장·지점장의 팀원 조회"는 본 세션에서 처방 완료. **건강하게 오픈 가능한 상태.**

## 0. 검진 동기 — 가설이 틀렸다

1차 코드·문서 기반 조사는 "library·calendar·scripts에 RLS가 없다(0건)"고 추정했다. **실측 결과 전부 틀렸다.** db_schema.md 등 로컬 문서가 실제 신버전 DB와 달랐던 것. → CLAUDE.md "DB 상태는 실측 후에만 단정" 원칙이 정확히 적중. 이 결과지는 **실측 기준**이다.

## 1. A축 — 사이드바 메뉴 × 9 role (화면 게이트)

게이트 3겹: CSS 클래스(`is-insurer`/`is-admin`) → `applyRoleClass()` → `showView()` 진입 가드.

| 메뉴 | admin | ga_branch_manager | ga_manager | ga_member | ga_staff | insurer_*(4종) |
|---|---|---|---|---|---|---|
| 홈/MY SPACE/스크립트/Quick/보험이슈/요금제 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌(자료실로 강제) |
| 현장의 소리 / 함께해요 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅(예외 허용) |
| 매니저룸 | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| 보험사 자료실 | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| 어드민 / 통합검색 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

**화면 약점 (유출로는 이어지지 않음):**
- `showView()` 진입 가드가 `insurer-vault`·`admin` 2개에만 존재 → ga_member가 주소창 `?view=team`으로 매니저룸 **화면**은 열 수 있음. 단 그 안 데이터는 RLS가 막아 **유출 없음**.
- role 변경 시 메뉴 즉시 갱신 안 되고 재부팅 필요 가능.

## 2. B축 — RLS 면역 전수 (실측)

**모든 32개 public 테이블 `relrowsecurity = true` (면역 스위치 전부 ON). 정책 0건 테이블 없음.**

| 테이블 | 정책수 | 격리 방식 |
|---|---|---|
| posts | 21 | board_type×role 정교: qna=같은 지점 / manager_notice=같은 팀 / manager_lounge=is_manager / insurer=같은 원수사(insurer_id) / hub=admin·setting |
| users / library / activity_logs | 6 | users=본인+admin+원수사매니저 / library=owner+shared / activity_logs=본인+매니저(팀)+지점장(지점) |
| team_notices | 5 | team_internal=같은 팀 / branch_internal=같은 지점 |
| calendar_events / nav_questions / nav_answers / newsletters / teams / team_invitations | 4 | 일정=권한별(개인/전체/팀/지점/원수사) / 네비방=같은 팀 / 소식지=공용 읽기 / 팀=같은 지점 |
| comments / insurers | 5 | — |
| 그 외(branches, companies, scripts, notifications, ...) | 1~3 | 용도별 적정 |

**핵심 격리 확인:**
- 개인자료(library) = 본인 + 공유분만. 남의 개인자료 불가
- 원수사 자료(posts insurer) = `insurer_id` 일치 필수 → **원수사끼리 데이터 안 섞임**
- 게시판/일정/네비방 = 지점·팀·원수사 단위로 정확히 분리
- 자기참조 재귀 회피 = `is_admin()`·`get_my_role()`·`my_team_id()`·`my_branch_id()`·`is_insurer_employee()` 전부 SECURITY DEFINER (실측 확인)

## 3. 발견된 유일한 실질 격차 → 처방 완료

**`users` SELECT 비대칭:** admin·원수사 매니저(`users_select_insurer_manager`)는 직원 조회 정책이 있으나, **GA 실장(ga_manager)·지점장(ga_branch_manager)의 팀원 조회 정책이 부재**했다.

- 증상(라이브 확인): 임태성 실장 로그인 시 매니저룸 실장 페이지가 **빈 화면** (본인 row만 조회 가능)
- 성격: **데이터 유출이 아니라 기능 결손** (남의 정보가 새는 게 아니라, 봐야 할 내 팀이 안 보임)

### 처방 (2026-06-03 적용)

| # | 처방 | 적용 |
|---|---|---|
| A | 매니저룸 팀원관리 진입 시 role별 자동 라우팅 (실장→실장 페이지+지점장 탭 숨김 / admin·지점장→지점장 페이지) | PR #359 (코드, 머지) |
| B | `users`에 RLS 정책 2개 추가 (SECURITY DEFINER 함수로 재귀 회피) | DB 적용 완료 |

```sql
-- 처방 B (적용됨)
CREATE POLICY users_select_team_manager ON public.users
  FOR SELECT TO authenticated
  USING (get_my_role() = 'ga_manager' AND team_id = my_team_id());
CREATE POLICY users_select_branch_manager ON public.users
  FOR SELECT TO authenticated
  USING (get_my_role() = 'ga_branch_manager' AND branch_id = my_branch_id());
```
- 추가만 (기존 정책 제거 0). 실장=같은 팀 전원 / 지점장=같은 지점 전원. 다른 팀·지점은 여전히 불가
- team_id/branch_id NULL이면 매칭 안 됨(과노출 방지)

## 4. 본 세션 함께 잡은 보험Q&A 일관성 (참고)

검진 중 발견: 보험Q&A(posts qna)가 화면마다 제각각. → 현장의 소리 탭 연결 누락 + 기본 모드 today 차이. PR #356·#357·#358로 4화면(MY SPACE·자료실·매니저룸·현장의 소리) 일관화.

## 5. 잔여 / 후속 점검 후보

- 처방 A·B 라이브 검증 (임태성 실장 재로그인 → 실장 페이지 자동 + 팀원 채워짐 + 타 팀 격리)
- `scripts` SELECT = `true`(전체 공개) — 공용 설계면 OK, 개인 스크립트 구분 필요 시 검토
- insurer_* 4종의 매니저룸/조직 기능 (현재 매니저룸은 GA 전용) — Phase 2 원수사 입점 시
- `showView()` 진입 가드를 전 메뉴로 확대할지 (현재 화면만 열림, 데이터는 RLS가 방어 중)

---

**검진 종합:** 원세컨드는 면역이 탄탄하게 깔린 건강한 유기체다. "얽히고 섞여 엉망"이 아니라, 지점>팀>사람 + 원수사 격리가 RLS로 정확히 작동한다. 발견된 단 하나의 실질 격차도 본 세션에 처방 완료.
