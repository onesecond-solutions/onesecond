# v2.0 원수사 입점 모델 — Phase 1 통합 spec (v2)

> **spec명:** `docs/specs/v2_insurer_admission_phase1_v2.md`
> **작성일:** 2026-05-08
> **이전 버전:** `docs/specs/v2_insurer_admission_phase1_v1.md` (폐기 헤더 박힘, 829줄, 2026-05-07 작성)
> **진실 원천 (OS 정의):** `docs/core/onesecond_os_definition_v2_2026-05-07.md` (540줄)
> **진실 원천 (정합 통합):** `docs/strategy/onesecond_strategy_overview_2026-05-07.md` (940줄, 정합 16건 명시)
> **9역할 진실 원천:** `docs/role_system.md`
> **상태:** v2 재작성 완료. 본 spec ↔ 진실 원천 충돌 시 **본 spec 우선** (작성 시점 더 최신).
> **메인 트랙:** v2.0 원수사 입점 모델 Phase 1 (admin_v2 Phase D 잔여 융합)
> **버전 진화:** v1.0 (본 spec) → v1.5 (Phase 2) → v2.0 (admin_v2 D-10)

---

## 📑 본문 구성

| § | 섹션 | 내용 |
|---|---|---|
| 0 | 본질 + 핵심 문장 TOP 3 + 정합성 검증 | 본질 한 줄·핵심 문장·42건 결정 통합 |
| 1 | 4단계 데이터 파이프라인 | 시드 트랙 + Q&A 트랙 + 정제 + 허브 승격 |
| 2 | 게시판 7종 + 카테고리 매트릭스 | board_type ENUM 7종 + question_type 분기 + source_type |
| 3 | 가시성 매트릭스 (운영 단위 = 지점) | 7영역 × 단위 + RLS 핵심 조건 |
| 4 | admin 토글 패턴 3건 | 매니저 라운지 / 통합 view / 허브 노출 |
| 5 | 9역할 RBAC 매트릭스 | 9역할 × 7영역 권한표 |
| 6 | RLS 정책 골격 + SECURITY DEFINER 함수 9종 | 단일 데이터 + 가시성 분기 표준 |
| 7 | DB 마이그레이션 (Step 2-bis 보강) | branches/teams/IEB + posts·users 컬럼 |
| 8 | 시드 데이터 흐름 (단일 데이터 + RLS) | 메뉴-DB 일치 + RLS OR 분기 |
| 9 | 작업 순서 18단계 + 세션 분배 | Step 0-bis / 0-tris 분리 + 12.6세션 |
| 10 | 별 트랙 (본 spec 외) | KCP / PITR / Sentry / Playwright / 카톡 |
| 11 | 위험 요소 매트릭스 | 12건 + 강도 평가 |
| 12 | 다음 단계 진입 준비 | 본 spec 승인 후 Step 2-bis 진입 |

---

# § 0. 본질 + 핵심 문장 TOP 3 + 정합성 검증

## 0-1. 본질 한 줄

> **흐름은 지점 단위로 닫고, 지식은 허브로 선별 승격한다.**

## 0-2. 핵심 문장 TOP 3

1. **흐름은 지점 단위로 닫고, 지식은 허브로 선별 승격한다.**
2. **단일 데이터 + 가시성 분기 (RLS) — 복제 ❌.**
3. **네비게이션방은 질문 생성 엔진이다.**

## 0-3. 정합성 검증 결과

본 spec은 다음 진실 원천을 인용·정합 처리한다:

| 진실 원천 | 본 spec 처리 |
|---|---|
| `docs/core/onesecond_os_definition_v2_2026-05-07.md` | OS 정의 (보험 상담 흐름 운영체제) 그대로 인용 |
| `docs/strategy/onesecond_strategy_overview_2026-05-07.md` | § ⚠️ 정합 9건 + 미반영 7건 = 16건 본 spec에서 해소 |
| `docs/role_system.md` | 9역할 RBAC 그대로 인용 |
| `CLAUDE.md` | 절대 프로토콜 + DB 작업 규칙 그대로 정합 |

폐기 처리 완료 (이미 `docs/deprecated/` 이전):
- `claude_code/_context/00_MASTER.md` (5/7 commit `7f7ed8a`, MASTER 역할 → OS 정의 v2로 이전)
- 4탭(hub/team/branch/insurer) 구조 → 본 spec 7종 `board_type`으로 재정의

## 0-4. 결정 통합 매트릭스 (42건)

본 spec은 다음 결정을 통합 반영한다:

| 분류 | 건수 | 처리 |
|---|---|---|
| A. 채팅 누적 결정 25건 (1~25번) | 25 | § 1~§ 9 본문 흡수 |
| B. GPT 5차 보강 1건 (#26 question_type ENUM) | 1 | § 2 board_type + question_type 매트릭스 |
| C. 정합성 점검 9건 (strategy_overview § ⚠️) | 9 | § 0-3 정합 처리 |
| D. GitHub 미반영 7건 (strategy_overview § ⚠️) | 7 | § 본문에서 신규 명문화 |
| **합계** | **42** | |

## 0-5. strategy_overview 16건 정합 처리 매핑

### 정합성 점검 9건 → 본 spec 해소

| # | 정합 점검 항목 | 본 spec 해소 |
|---|---|---|
| 1 | role 6 vs 9 (00_MASTER / README) | 00_MASTER 폐기 완료 + README는 Step 0-tris로 분리 (§ 9) |
| 2 | Supabase 프로젝트 ID 불일치 (00_MASTER) | 00_MASTER 폐기 완료, 진실 = `pdnwgzneooyygfejrvbg` (CLAUDE.md) |
| 3 | 관리자 예외 — admin만 vs admin+branch_manager (00_MASTER) | 00_MASTER 폐기 완료 + 본 spec § 5 = admin만 예외 |
| 4 | 게시판 권한 표 (6 role 시점, 00_MASTER) | 00_MASTER 폐기 완료 + 본 spec § 5 = 9역할 매트릭스 |
| 5 | 4팀 인원수 — "40명" vs 4명 첫 배포 | Step 0-tris로 분리 (§ 9, README 갱신 함께) |
| 6 | tokens.css 색상 값 (00_MASTER) | 00_MASTER 폐기 완료, 진실 = `css/tokens.css` 라이브 |
| 7 | README "4축" 헤딩 vs 5개 항목 | Step 0-tris로 분리 (§ 9, "5축 구조"로 갱신) |
| 8 | README 첫 배포 일자 (4/20 잔존) | Step 0-tris로 분리 (§ 9) |
| 9 | 00_MASTER "다음 검토 권장" 잔존 | 00_MASTER 폐기 완료 |

### GitHub 미반영 7건 → 본 spec 신규 명문화

| # | 미반영 항목 | 본 spec 명문화 |
|---|---|---|
| 1 | 사이트 분리 모델 (`onesecond.solutions` / `pro.onesecond.solutions`) | § 10 별 트랙 (본 spec 영역 외, v2.0+ 결정 대기) |
| 2 | "5/6 마감 폐기" | 일정 1일 shift + 5/14 버퍼 확보로 동등 정신 (§ 9) |
| 3 | "강 보수 검수 모드" | CLAUDE.md "필수" 섹션으로 동등 정신 (§ 0-4 D-pre.7~.8 패턴) |
| 4 | 게시판 미러링·자동 분류·출처 뱃지 | § 1 4단계 파이프라인 + § 2 source_type 명문화 |
| 5 | **네비게이션방** | § 2 `board_type='navigation'` 신규 도입 ⭐ |
| 6 | `index.html ↔ app.html` 완전 분리 원칙 | 본 spec 영역 외 (구조 유지) |
| 7 | 메모리 #11 "자료 자산화 본 트랙 격상" | 본 spec § 10 별 트랙 (Phase 1 종료 후 진입) |

## 0-6. 추가 GPT 조율 차단

본 spec 작성 후 추가 라운드 ❌. 본문 작성 중 발견 사항은 본문 안에서 해결.
4/28 사고 패턴 정합 (무한 미세 조정 진입 차단).

---

# § 1. 4단계 데이터 파이프라인

## 1-1. 본질 다이어그램

```
[A. 시드 트랙 — admin, 초기 부트스트랩]
admin (4팀 단톡방·소식지·자료 가공)
  ↓
posts INSERT 1회 (단일 row, 복제 ❌)
  - board_type     = 'insurer'           ⭐ 메뉴-DB 일치
  - source_type    = 'seed'
  - insurer_id     = <보험사 id>
  - question_type  = '공지' | '상품' | '인수'
  - display_author = 'onesecond 자료실'
  - source_label   = '메리츠화재 소식지'
  - branch_id      = NULL                 ⭐ 모든 지점 공유 가시성
  ↓
RLS 가시성 분기 (SELECT 시점에 자동)
  - 보험사 게시판: posts_select_insurer_employee → 보험사 임직원
  - 현장 Q&A:     posts_select_qna_seed_or_branch → 모든 지점 사용자
  → 단일 row, 두 영역에 노출 (가시성 분기, 복제 ❌)

[B. Q&A 트랙 — 정상 가동 후]
사용자 (지점 단위)
  ↓
네비게이션방 INSERT (질문 생성 엔진)
  - board_type      = 'navigation'
  - branch_id       = my_branch_id()
  - insurer_target  = '회사지정' | '손보전체' | '생보전체' | '전체'
  - source_type     = 'user_post'
  ↓
RLS 가시성 분기:
  - 사용자 네비방: 본인 지점 사용자만 (branch_id 매칭)
  - 보험사 임직원: 본인 담당 지점 + insurer_target 매칭
  ↓
보험사 임직원 답변 INSERT (본인 회사 게시판)
  - board_type      = 'insurer'
  - parent_post_id  = <원 질문 id>     ⭐ 답변 연결
  - branch_id       = <원 질문의 branch_id>  ⭐ 답변 가시성 = 질문 발생 지점
  - insurer_id      = current_user_insurer_id()
  - source_type     = 'insurer_post'
  ↓
RLS 가시성 분기:
  - 사용자 네비방: 답변 row도 함께 노출 (parent_post_id 매칭)
  - 보험사 임직원: 본인 담당 지점만 (or 통합 view 토글)

[C. 시스템 정제 → 현장 Q&A]
  v1.0 = 단순 수동 승격 (admin이 우수 질답 선별)
  v1.5+ = 키워드 추출 자동 분류
  v2.0+ = LLM 정제 (Claude API)

[D. 허브 승격 (선별)]
  현장 Q&A 누적 → admin 큐레이션 → 허브 게시판 promotion
  허브 게시판 → admin 토글로 사용자 노출 (보험판 구글 검색창)
```

## 1-2. 검색창 위치 매트릭스

| 위치 | 검색 범위 | UI 톤 |
|---|---|---|
| **현장 Q&A 페이지 상단** | 본인 지점 안 (시드 + 정제 + 답변) | **큼지막 구글 느낌** ⭐ |
| **허브 / 보험판 구글** | 글로벌 (오픈 시점 admin 토글) | 보험판 구글 = 최종 목표 |

검색 = `posts.keywords` GIN 인덱스 + 본문 텍스트 검색 (TBD: tsvector or pg_trgm) — Step 8에서 구현.

## 1-3. 사용자 영역별 진입 동선

```
[admin]                매니저공지 / 현장Q&A / 네비게이션방 / 보험사게시판 (4탭)
[사용자 (ga_*)]         매니저공지 / 현장Q&A / 네비게이션방 (3탭)
[보험사 임직원 (insurer_*)] 현장Q&A / 보험사게시판 (2탭) ⭐ 네비방 비노출
[보험사 임직원 (admin 토글 매니저 라운지 ON 시)] 위 + 매니저 라운지 추가
```

* 보험사 임직원 페이지 네비방 비노출 = 직전 결정 #3 정합 (영역 분리 본질 유지, 답변 공급 전문 모델 보호)
* 답변 작성은 보험사 게시판 안에서 → RLS로 사용자 네비방에 자동 노출

---

# § 2. 게시판 7종 + 카테고리 매트릭스

## 2-1. board_type ENUM 7종

| board_type | 한국어 | 가시성 단위 | admin 토글 |
|---|---|---|---|
| `qna` | 현장 Q&A | 지점 단위 + 시드 글로벌 | — |
| `manager_notice` | 매니저 공지 | **팀 단위 격리** ⭐ | — |
| `manager_lounge` | 매니저 라운지 (= "관리자 라운지" 동의어) | 매니저급+ × 지점 | #1 (`manager_lounge_enabled`, 기본 OFF) |
| `navigation` | 네비게이션방 ⭐ 신규 | 지점 단위 | — |
| `insurer` | 보험사 게시판 | 보험사 × 임직원 담당지점 N:M | #2 (`insurer_unified_view`, 기본 OFF) |
| `hub` | 허브 게시판 ⭐ 신규 — **모든 지식의 저장소 (현재 미오픈)** ⭐ 팀장님 본질 명시 (5/10 새벽). 분류 안 된 글의 default 적재처 (4팀 자산화 30.7% = 481건 매칭 부재 흡수) | 글로벌 (잠정 admin) | #3 (`hub_public`, 기본 OFF) |
| `archive_legacy` | 폐기 4 row 보존 | (admin 격리) | — |

폐기 처리 (board.html 라인 1166~1173 갱신 필요, Step 7):
- 라이브 4탭(`hub`(구) / `team` / `branch` / `insurer4`)
- → 본 spec 7종으로 재정의

## 2-2. question_type ENUM (admin migration 단독 권한, additive only)

### v1.x (5/15 시작값) — 인지 부담 최소화

```
'공지' / '상품' / '인수'  (3개)
```

이유: 4팀 약 40~50명 5/15 진입 시 분류 인지 부담 최소화.

### v2.0 (확장 후) — 데이터 누적 후 admin migration 추가

```
'공지' / '상품' / '인수' / '운영' / '사례' / '기타'  (6개)
```

### 확장 정책

- ENUM 추가 = admin migration 단독 권한 (코드 변경 없이 DB 만으로)
- 기존 row scope 영향 없음 (additive only)
- 4/28 사고 패턴 정합 (한 번에 다 박지 않음)

### 중요성

```
question_type → scope 결정 → 검색 분류 → 허브 승격 → 보험사 통계 → AI 정제
              = 보험판 구글 카테고리의 씨앗
```

## 2-3. source_type ENUM (출처 추적)

| source_type | 의미 | 작성자 |
|---|---|---|
| `seed` | admin 시드 (보험사 게시판 → RLS로 현장 Q&A 노출) | admin |
| `insurer_post` | 보험사 임직원 답변 + 자발 글 | 보험사 임직원 |
| `navigation_distilled` | 네비방 질문·답변 정제 (v1.5+) | 시스템 |
| `user_post` | 사용자 네비방 질문 | 사용자 (ga_*) |

## 2-4. display_author / source_label (시드 표기)

```sql
-- admin 시드 INSERT 시
INSERT INTO posts (
  board_type, source_type, display_author, source_label,
  insurer_id, question_type, branch_id, ...
) VALUES (
  'insurer', 'seed', 'onesecond 자료실', '메리츠화재 소식지',
  <메리츠 id>, '공지', NULL, ...
);
```

**프론트 노출 규칙:**
- `display_author IS NOT NULL` → 작성자 = `display_author` 값으로 노출 ("onesecond 자료실")
- `display_author IS NULL` → 작성자 = `users.name` (실제 작성자)
- `source_label IS NOT NULL` → 작성자 옆에 출처 뱃지 노출 ("메리츠화재 소식지")

---

# § 3. 가시성 매트릭스 (운영 단위 = 지점)

## 3-1. 7영역 × 단위 + RLS 핵심 조건

| 게시판 | 가시성 단위 | RLS 핵심 조건 |
|---|---|---|
| 매니저 공지 | **팀 단위 격리** ⭐ | `team_id = my_team_id()` |
| 매니저 라운지 | 매니저급+ × 지점 (admin 토글 #1) | `is_manager() AND branch_id = my_branch_id() AND is_setting_enabled('manager_lounge_enabled')` |
| 네비게이션방 | 지점 단위 | `branch_id = my_branch_id() AND NOT is_insurer_employee()` |
| 현장 Q&A | 지점 단위 + 시드 글로벌 | `(branch_id = my_branch_id()) OR (board_type='insurer' AND source_type='seed' AND branch_id IS NULL)` |
| 보험사 게시판 | 보험사 × 임직원 담당지점 N:M (admin 토글 #2) | `is_insurer_employee() AND insurer_id = current_user_insurer_id() AND (is_setting_enabled('insurer_unified_view') OR branch_id = ANY(my_assigned_branches()) OR branch_id IS NULL)` |
| 허브 게시판 | 글로벌 (admin 토글 #3) | `is_admin() OR is_setting_enabled('hub_public')` |

## 3-2. 원칙 (핵심 문장 #2 정합)

- **단일 row → RLS 가시성 분기로 다른 영역에서 노출** (dual-write ❌, trigger ❌)
- **시드 데이터:** `branch_id IS NULL` = 모든 지점 공유 가시성
- **일반 데이터:** `branch_id NOT NULL` = 본인 지점만
- **답변:** `parent_post_id` + `branch_id` = 질문 발생 지점에만 노출

## 3-3. 지점 간 격리 + 허브 연결

```
[지점 A] 4팀 = 더원지점          [지점 B] 향후 확장          [지점 C] ...
   ↓                                ↓                          ↓
   ─────────────── 허브 게시판 (글로벌, admin 큐레이션) ───────────────
                              ↓
                       보험판 구글 검색창 (admin 토글 ON 시)
```

* 지점끼리 = 기본 격리 (경쟁 관계 가정)
* 연결 통로 = 허브 게시판 only

## 3-4. 보험사 임직원-지점 N:M 가시성

```
[메리츠 박매니저]  →  [더원지점, 스타지점] (담당 2개)
                    ↓
[기본] 본인 담당 지점들의 질문·답변만 (정보 과부하 방지)
       branch_id = ANY(my_assigned_branches())
       
[admin 토글 #2 ON 시]
       insurer_unified_view = true
       → 모든 지점 통합 view (시장 인사이트)
```

향후 시점:
- 4팀 → 보험사 → 원세컨드: 통합 view 건의 시 → admin 토글 ON
- 또는 원세컨드 → 보험사: 통합 view 제안 (영업 무기)

---

# § 4. admin 토글 패턴 3건

## 4-1. app_settings 테이블 활용 (D-9 화면설정 정합)

```sql
INSERT INTO app_settings (key, value, description, updated_at) VALUES
  ('manager_lounge_enabled', 'false', 
   '매니저 라운지 메뉴 활성화 — 매니저급 이상 지점 단위 사용 시 ON',
   now()),
  ('insurer_unified_view', 'false',
   '보험사 임직원 통합 view — 담당 지점 외 모든 지점 글 노출',
   now()),
  ('hub_public', 'false',
   '허브 게시판 일반 사용자 노출 — 보험판 구글 검색창 가동 시 ON',
   now());
```

## 4-2. 원칙 (1차 준비 + 숨김 패턴)

- DB 골격 + UI 골격 + RLS 분기 모두 박혀있되 `enabled=false`
- admin이 `admin_v2` D-9 화면설정에서 토글 → 즉시 작동
- 테스트 진행 가능 수준 (admin enabled=true 토글 후 즉시 검증)
- admin_v2 D-9 화면설정 § 1 메뉴 ON/OFF 패턴 정합

## 4-3. 토글 영향 범위

| 토글 | DB | UI | RLS |
|---|---|---|---|
| `manager_lounge_enabled` | board_type 추가 (`manager_lounge`) + 글 INSERT 가능 | 사이드바 "매니저 라운지" 메뉴 표시 | `posts_select_manager_lounge` 정책 통과 조건 |
| `insurer_unified_view` | (스키마 영향 X) | 보험사 임직원 페이지 토글 옵션 표시 | `posts_select_insurer_employee` 정책의 OR 분기 |
| `hub_public` | (스키마 영향 X) | 허브 게시판 메뉴 사용자 노출 | `posts_select_hub` 정책의 OR 분기 |

---

# § 5. 9역할 RBAC 매트릭스 (Phase 1)

## 5-1. 9역할 × 7영역 권한표

| role | 매니저공지 | 매니저라운지 | 네비방 | 현장Q&A | 보험사 | 허브 | 회원가입 폼 |
|---|---|---|---|---|---|---|---|
| `admin` | 전체 R/W | 전체 R/W | 전체 R | R/W | 전체 R/W | R/W | (admin 직접 생성) |
| `ga_branch_manager` | ❌ ⭐ | 본인 지점 R/W | 본 지점 R/W | R | ❌ | ❌ | 설계사 폼 |
| `ga_manager` | 본인 팀 R/W | 본인 지점 R/W | 본 지점 R/W | R | ❌ | ❌ | 설계사 폼 |
| `ga_member` | 본인 팀 R | ❌ | 본 지점 R/W | R | ❌ | ❌ | 설계사 폼 (기본) |
| `ga_staff` | 본인 팀 R | ❌ | 본 지점 R/W | R | ❌ | ❌ | 설계사 폼 |
| `insurer_branch_manager` | ❌ | ❌ | ❌ | 담당 지점 R | 본인사 R/W | ❌ | 보험사 폼 (admin 승인) |
| `insurer_manager` | ❌ | ❌ | ❌ | 담당 지점 R | 본인사 R/W | ❌ | 보험사 폼 (매니저 승인) |
| `insurer_member` | ❌ | ❌ | ❌ | 담당 지점 R | 본인사 R/W | ❌ | 보험사 폼 (기본) |
| `insurer_staff` | ❌ | ❌ | ❌ | 담당 지점 R | 본인사 R/W | ❌ | 보험사 폼 |

## 5-2. 핵심 정정 — `ga_branch_manager` 매니저 공지 ❌ ⭐

**이유:** 매니저 공지 = 해당 팀만, **타 팀 매니저·지점장도 못 봄** (본질 격리).

지점장이 운영 공지 필요 시 → **매니저 라운지 사용** (admin 토글 #1 ON 후).

매니저 공지 작성 권한 정정:
- `admin`: 전사 (admin은 무한 권한)
- `ga_manager`: 본인 팀 (실장이 본인 팀에 공지)
- (기타 매니저 그룹 = 매니저 라운지 사용)

## 5-3. 매니저 라운지 권한

```
매니저 라운지 = (admin) OR (ga_manager + ga_branch_manager + 
                           insurer_manager + insurer_branch_manager)
                          × 본인 지점 안에서 + admin 토글 ON 시점
```

* 보험사 매니저는 본인 회사 게시판 외 일반 매니저 라운지 진입 — 보험사 측 매니저 ↔ GA 측 매니저 교류 가능 (TBD: 본질 검토 필요, 현 spec은 권한만 부여 + 토글 OFF로 차단)

## 5-4. 보험사 임직원 가시성 (네비방 비노출 + 본인 회사 게시판 + 답변 + 자발 글)

- 사이드바 메뉴: 현장 Q&A / 보험사 게시판 (2탭, 네비방 비노출)
- 본인 회사 게시판:
  - 답변 (parent_post_id 박힌 글) ✅
  - 자발 글 (공지/상품/인수 양식 차용) ✅
  - 가시성 = 본인 담당 지점 (admin 토글 #2 OFF 기본)
- 현장 Q&A: 담당 지점 글 R (시드 + 정제 + 답변)

## 5-5. 화면설정(`applyMenuSettings`) 무시 대상

- **무시 대상:** `admin` 만
- **적용 대상:** 나머지 8역할 전부
- 보험사 게시판 메뉴 = 화면설정 + role 분기 둘 다 통과해야 표시
- (strategy_overview § ⚠️ 정합 #3 해소 정합)

---

# § 6. RLS 정책 골격 + SECURITY DEFINER 함수 9종

## 6-1. SECURITY DEFINER 함수 9종

### 기존 5종 (Phase 1 Step 2 commit 완료, 5/7)

```sql
-- 1. is_admin() — 기존 (D-pre.7 신설)
-- 2. is_manager() — 매니저급 6역할 (admin + ga/insurer 매니저)
-- 3. is_insurer_employee() — insurer_* 4역할
-- 4. is_insurer_manager() — insurer_branch_manager + insurer_manager
-- 5. current_user_insurer_id() — 본인 회사 게시판 RLS용
```

### 신규 4종 (Step 2-bis)

```sql
-- 6. my_team_id() — 매니저 공지 가시성용
CREATE OR REPLACE FUNCTION my_team_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT team_id FROM users WHERE id = auth.uid();
$$;

-- 7. my_branch_id() — 네비방·현장Q&A 가시성용
CREATE OR REPLACE FUNCTION my_branch_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT branch_id FROM users WHERE id = auth.uid();
$$;

-- 8. my_assigned_branches() — 보험사 임직원 N:M 다대다
CREATE OR REPLACE FUNCTION my_assigned_branches() RETURNS UUID[]
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT array_agg(branch_id) FROM insurer_employee_branches
  WHERE user_id = auth.uid();
$$;

-- 9. is_setting_enabled(key TEXT) RETURNS BOOLEAN — admin 토글
CREATE OR REPLACE FUNCTION is_setting_enabled(setting_key TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT (value::boolean) FROM app_settings WHERE key = setting_key;
$$;
```

## 6-2. posts SELECT 정책 골격

```sql
-- 정책 1. 현장 Q&A + 시드 OR 분기 (보강 1 결정 반영) ⭐
CREATE POLICY posts_select_qna_seed_or_branch ON posts FOR SELECT TO authenticated
USING (
  -- 일반 현장 Q&A: 본인 지점 안
  (board_type = 'qna' AND branch_id = my_branch_id())
  OR
  -- 시드 데이터: 보험사 게시판이지만 모든 지점 사용자에게 노출
  (board_type = 'insurer' AND source_type = 'seed' AND branch_id IS NULL)
);

-- 정책 2. 네비게이션방 (보험사 임직원 비노출)
CREATE POLICY posts_select_navigation ON posts FOR SELECT TO authenticated
USING (
  board_type = 'navigation'
  AND branch_id = my_branch_id()
  AND NOT is_insurer_employee()
);

-- 정책 3. 보험사 임직원 (네비방 질문 + 보험사 게시판)
CREATE POLICY posts_select_insurer_employee ON posts FOR SELECT TO authenticated
USING (
  is_insurer_employee()
  AND (
    -- 보험사 게시판 본인 회사
    (board_type = 'insurer' AND insurer_id = current_user_insurer_id())
    OR
    -- 네비방 질문 (답변 작성용 노출)
    (board_type = 'navigation' AND insurer_id = current_user_insurer_id())
  )
  AND (
    -- 통합 view 토글 ON OR 본인 담당 지점
    is_setting_enabled('insurer_unified_view')
    OR branch_id = ANY(my_assigned_branches())
    OR branch_id IS NULL  -- 시드 글로벌
  )
);

-- 정책 4. 매니저 공지 (팀 단위 격리)
CREATE POLICY posts_select_manager_notice ON posts FOR SELECT TO authenticated
USING (
  board_type = 'manager_notice'
  AND team_id = my_team_id()
);

-- 정책 5. 매니저 라운지 (매니저급 + 지점 + admin 토글)
CREATE POLICY posts_select_manager_lounge ON posts FOR SELECT TO authenticated
USING (
  board_type = 'manager_lounge'
  AND is_manager()
  AND branch_id = my_branch_id()
  AND is_setting_enabled('manager_lounge_enabled')
);

-- 정책 6. 허브 게시판 (admin 토글)
CREATE POLICY posts_select_hub ON posts FOR SELECT TO authenticated
USING (
  board_type = 'hub'
  AND (is_admin() OR is_setting_enabled('hub_public'))
);

-- 정책 7. admin 전체 SELECT (D-pre.7 패턴 정합)
CREATE POLICY posts_select_admin ON posts FOR SELECT TO authenticated
USING (is_admin());
```

## 6-3. posts INSERT 정책 골격

```sql
-- 정책 1. 매니저 공지 INSERT — 본인 팀 + 매니저(ga_manager + admin)
CREATE POLICY posts_insert_manager_notice ON posts FOR INSERT TO authenticated
WITH CHECK (
  board_type = 'manager_notice'
  AND team_id = my_team_id()
  AND (
    is_admin()
    OR (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ga_manager')
    )
  )
);
-- ⚠️ 자기 참조 EXISTS 회피: ga_manager 역할 검증을 별도 함수로 캡슐화 권장
-- (Step 2-bis 본문에서 is_ga_manager() 함수 신설 검토)

-- 정책 2. 매니저 라운지 INSERT — 매니저급+ + 지점 + 토글
CREATE POLICY posts_insert_manager_lounge ON posts FOR INSERT TO authenticated
WITH CHECK (
  board_type = 'manager_lounge'
  AND is_manager()
  AND branch_id = my_branch_id()
  AND is_setting_enabled('manager_lounge_enabled')
);

-- 정책 3. 네비방 INSERT — 사용자 (ga_*) + 본인 지점
CREATE POLICY posts_insert_navigation ON posts FOR INSERT TO authenticated
WITH CHECK (
  board_type = 'navigation'
  AND branch_id = my_branch_id()
  AND NOT is_insurer_employee()
  AND insurer_id IS NULL  -- 네비방은 insurer_id NULL (insurer_target만 사용)
);

-- 정책 4. 보험사 게시판 INSERT — 본인 회사 + 답변 OR 자발 글
CREATE POLICY posts_insert_insurer ON posts FOR INSERT TO authenticated
WITH CHECK (
  board_type = 'insurer'
  AND is_insurer_employee()
  AND insurer_id = current_user_insurer_id()
);

-- 정책 5. admin 시드 INSERT — admin only, branch_id NULL 가능
CREATE POLICY posts_insert_admin_seed ON posts FOR INSERT TO authenticated
WITH CHECK (
  is_admin()
);

-- 정책 6. 허브 INSERT — admin only
CREATE POLICY posts_insert_hub ON posts FOR INSERT TO authenticated
WITH CHECK (
  board_type = 'hub'
  AND is_admin()
);

-- 정책 7. 현장 Q&A INSERT — 시스템 정제 결과만 (사용자 직접 쓰기 ❌)
CREATE POLICY posts_insert_qna_system ON posts FOR INSERT TO authenticated
WITH CHECK (
  board_type = 'qna'
  AND is_admin()
  AND source_type IN ('navigation_distilled', 'seed')
);
```

## 6-4. posts UPDATE / DELETE 정책 골격

```sql
-- 본인 글 수정 (D-pre.7~.8 패턴 정합)
-- 보존: author or admin update posts (라이브 그대로)

-- 보험사 매니저 모더레이션 (Step B-extra 정정 정합)
-- 보존: posts_update_insurer_manager (is_insurer_manager() 가드)

-- 매니저 공지/라운지: 작성자 본인 + 같은 매니저급 (TBD)
-- → Step 2-bis 본문에서 결정
```

## 6-5. RLS 사전 검증 표준 (D-pre.7~.8 정합)

> ⚠️ **자기 참조 EXISTS 절대 금지** (D-pre.7 1차 사고).
> ⚠️ **DB 메타 통과 ≠ 라이브 안전** (D-pre.7 학습).
> ⚠️ **같은 테이블 다른 cmd 정책에도 동일 패턴 잔존 가능** (D-pre.7 점검 3 사후 발견).
> ⚠️ **사전 검증 단계 전수 sweep 필수** (D-pre.7~.8 정합).
> ⚠️ **SECURITY DEFINER 함수 컬럼 의존** (Step B 1차 ROLLBACK, 2026-05-07).

신규 RLS 정책 적용 시:
1. SECURITY DEFINER 함수 표준 활용 (`is_admin()` / `is_manager()` / `my_branch_id()` 등)
2. EXISTS 서브쿼리 사용 시 **다른 테이블만** 참조 (자기 참조 금지)
3. SELECT / INSERT / UPDATE / DELETE 4 cmd 모두 sweep 검증
4. 함수 정의 시점에 참조 컬럼 존재 확인 (Phase 7b 패턴)
5. 라이브 회귀 검증 9건 이상 (9역할 × 영역)

---

# § 7. DB 마이그레이션 (Step 2-bis 보강)

## 7-1. 이미 변경된 5/7 마이그레이션과 호환

Step 2 commit (`b5cf51c` + 후속) 그대로 보존:

| 변경 | 본 spec 정합 |
|---|---|
| ✅ `insurers` 31사 INSERT | 그대로 (보험사 게시판 + 회원가입 드롭다운 + 보험사 선택 메커니즘) |
| ✅ `posts.insurer_target` | 네비방 보험사 선택 메커니즘으로 활용 ⭐ |
| ✅ `posts.keywords` | 검색 인프라 (현장 Q&A 검색창 + 허브 검색) |
| ✅ `posts.question_type` | v1.x 3개로 시작 (CHECK 제약 추가) |
| ✅ `posts.status` | pending/active/suspended 흐름 |
| ✅ `posts.drug_usage` | 6필드 단계형 입력 |
| ✅ `posts.insurer_id` | 보험사 게시판 연결 |
| ✅ `users.insurer_id` | 보험사 임직원 매칭 (단, branch는 별도 테이블) |
| ✅ SECURITY DEFINER 함수 4종 | 그대로 활용 |
| ✅ `archive_legacy` 변환 4 row | 그대로 보존 |

## 7-2. Step 2-bis 신설

### 7-2-1. 신설 테이블 3종

```sql
-- branches (지점 마스터)
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,           -- '더원지점'
  ga_org_name TEXT NOT NULL,            -- 'AZ금융' (v1.0은 단일 GA, v2.0에서 ga_organizations FK로 정규화)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 시드: 더원지점 1 row
INSERT INTO branches (name, ga_org_name) VALUES ('더원지점', 'AZ금융');

-- teams (팀 마스터)
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                  -- '1팀' / '2팀' / '3팀' / '4팀'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (branch_id, name)
);

-- 시드: 더원지점 4팀
INSERT INTO teams (branch_id, name) VALUES
  ((SELECT id FROM branches WHERE name='더원지점'), '1팀'),
  ((SELECT id FROM branches WHERE name='더원지점'), '2팀'),
  ((SELECT id FROM branches WHERE name='더원지점'), '3팀'),
  ((SELECT id FROM branches WHERE name='더원지점'), '4팀');

-- insurer_employee_branches (보험사 임직원 ↔ 지점 N:M)
CREATE TABLE insurer_employee_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, branch_id)
);

CREATE INDEX idx_ieb_user ON insurer_employee_branches(user_id);
CREATE INDEX idx_ieb_branch ON insurer_employee_branches(branch_id);
```

(`ga_organizations` 테이블은 v2.0 후순위 — 타 GA 입점 시점)

### 7-2-2. users +2 컬럼

```sql
ALTER TABLE users ADD COLUMN branch_id UUID REFERENCES branches(id);
ALTER TABLE users ADD COLUMN team_id UUID REFERENCES teams(id);

CREATE INDEX idx_users_branch_id ON users(branch_id);
CREATE INDEX idx_users_team_id ON users(team_id);

-- 시드: GA 사용자 21건 → 더원지점 + 4팀 분배
-- (구체 분배는 라이브 데이터 기준, Step 2-bis 본 진입 시 결정)
-- ga_branch_manager(2건)·ga_manager·ga_member·ga_staff → branch_id NOT NULL
-- ga_member의 일부 → team_id NOT NULL (4팀 분배)
-- 보험사 임직원 (insurer_*) → branch_id NULL + insurer_employee_branches 사용
```

### 7-2-3. posts +5 컬럼 + parent_post_id

```sql
ALTER TABLE posts ADD COLUMN branch_id UUID REFERENCES branches(id);
ALTER TABLE posts ADD COLUMN team_id UUID REFERENCES teams(id);
ALTER TABLE posts ADD COLUMN source_type TEXT;
ALTER TABLE posts ADD COLUMN display_author TEXT;
ALTER TABLE posts ADD COLUMN source_label TEXT;
ALTER TABLE posts ADD COLUMN parent_post_id UUID REFERENCES posts(id);  -- 답변-질문 연결 ⭐

CREATE INDEX idx_posts_branch_id ON posts(branch_id);
CREATE INDEX idx_posts_team_id ON posts(team_id);
CREATE INDEX idx_posts_source_type ON posts(source_type);
CREATE INDEX idx_posts_parent_post_id ON posts(parent_post_id);

-- source_type CHECK
ALTER TABLE posts ADD CONSTRAINT posts_source_type_check
  CHECK (source_type IN ('seed', 'insurer_post', 'navigation_distilled', 'user_post'));
```

### 7-2-4. board_type ENUM 확장

```sql
-- 기존: 'qna' / 'manager_notice' / 'insurer' / 'archive_legacy'
-- 추가: 'navigation' / 'manager_lounge' / 'hub'

ALTER TABLE posts DROP CONSTRAINT posts_board_type_check;
ALTER TABLE posts ADD CONSTRAINT posts_board_type_check
  CHECK (board_type IN (
    'qna', 'manager_notice', 'manager_lounge',
    'navigation', 'insurer', 'hub', 'archive_legacy'
  ));
```

### 7-2-5. question_type CHECK (v1.x 시작값)

```sql
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_question_type_check;
ALTER TABLE posts ADD CONSTRAINT posts_question_type_check
  CHECK (question_type IS NULL OR question_type IN ('공지', '상품', '인수'));

-- v2.0 시점에 ALTER로 ('운영', '사례', '기타') 추가 (admin migration)
```

### 7-2-6. app_settings +3 row

```sql
INSERT INTO app_settings (key, value, description, updated_at) VALUES
  ('manager_lounge_enabled', 'false',
   '매니저 라운지 메뉴 활성화', now()),
  ('insurer_unified_view', 'false',
   '보험사 임직원 통합 view (모든 담당 지점 외 전체)', now()),
  ('hub_public', 'false',
   '허브 게시판 일반 사용자 노출 (보험판 구글 검색창)', now());
```

### 7-2-7. SECURITY DEFINER 함수 4종 신설

§ 6-1 본문 그대로 (my_team_id / my_branch_id / my_assigned_branches / is_setting_enabled).

### 7-2-8. RLS 정책 sweep

posts 기존 정책 DROP + 신규 정책 CREATE (§ 6-2 ~ § 6-3 매트릭스 그대로).
자기 참조 EXISTS 검증 (D-pre.7~.8 패턴 정합).

### 7-2-9. teams / branches / insurer_employee_branches RLS

```sql
-- branches: 인증 사용자 SELECT 가능 (UI 드롭다운용) + admin write
CREATE POLICY branches_select_authenticated ON branches FOR SELECT TO authenticated
USING (is_active = true);
CREATE POLICY branches_write_admin ON branches FOR ALL TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

-- teams: 본인 branch 내 SELECT 가능 + admin write
CREATE POLICY teams_select_my_branch ON teams FOR SELECT TO authenticated
USING (branch_id = my_branch_id() AND is_active = true);
CREATE POLICY teams_select_admin ON teams FOR SELECT TO authenticated
USING (is_admin());
CREATE POLICY teams_write_admin ON teams FOR ALL TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

-- insurer_employee_branches: 본인 row + admin
CREATE POLICY ieb_select_self ON insurer_employee_branches FOR SELECT TO authenticated
USING (user_id = auth.uid());
CREATE POLICY ieb_select_admin ON insurer_employee_branches FOR SELECT TO authenticated
USING (is_admin());
CREATE POLICY ieb_write_admin ON insurer_employee_branches FOR ALL TO authenticated
USING (is_admin()) WITH CHECK (is_admin());
```

## 7-3. Step 2-bis 진행 패턴 (D-pre.5~.8 + Step A·B·C·D 정합)

```
Step A — 사전 분석 (코드 / DB 변경 0건)
  - 라이브 users 21건 분배 매트릭스 확정 (4팀 어떻게 분배할지)
  - 라이브 posts 기존 row → branch_id 부여 매트릭스
  - SECURITY DEFINER 함수 컬럼 의존 검증 (B 1차 ROLLBACK 학습 정합)

Step B — DB 변경 (트랜잭션 분할)
  - B-1: 신설 테이블 3종 + 시드 (branches/teams)
  - B-2: users +2 컬럼 + 분배 UPDATE
  - B-3: posts +6 컬럼 + 기존 row branch_id 부여
  - B-4: board_type / question_type CHECK 갱신
  - B-5: app_settings +3 row
  - B-6: SECURITY DEFINER 함수 4종 신설
  - B-7: RLS 정책 sweep (DROP + CREATE)

Step C — 사후 검증 (코드 0건)
  - 메타 조회: pg_policies / information_schema.columns
  - 자기 참조 EXISTS 잔존 0건 확인 (D-pre.7 정합)
  - SECURITY DEFINER 함수 9개 본문 검증

Step D — 라이브 검증
  - 9역할별 진입 회귀 9건 이상
  - 사고 신호 즉시 정지 표준 (D-pre.5/6 사고 재발 방지)
```

**세션 산정: 1.0세션 이상** (보강 3 정합, 0.5세션으로 되돌리지 말 것).

이유: 신설 3 테이블 + 시드 데이터 입력 + users 21건 분배 + posts 기존 row branch_id 부여 + RLS 7+3 정책 sweep + 9역할 라이브 회귀 = 트랜잭션 7건 분할 + 라이브 검증.

## 7-4. Step 2-bis 본 진입 영구 학습 (2026-05-09 새벽)

본 진입에서 발견된 사고 학습 2건 + Step A 결재 결과 + Step B-1~B-6 진행 누적 명문화. spec v3 작성 시점에 본 § 7-4 발췌·흡수 권장.

### 7-4-1. 사고 학습 1 — Supabase SQL Editor RUN 단위 세션 분리

본 spec v1에서 트랜잭션을 1단계(BEGIN+명령)+2단계(검증)+3단계(COMMIT) 3 RUN으로 분리 가정 → Supabase 자동 ROLLBACK 사고. 표준 정정:

- **Pre-flight RUN:** 신설 항목 부재 + 참조 PK 타입 사전 확인
- **메인 트랜잭션 RUN:** BEGIN ~ COMMIT 모두 한 RUN (세션 종료 시 미COMMIT 자동 ROLLBACK 회피)
- **검증 RUN:** COMMIT 후 별도 RUN
- **함수 의존 분리:** SECURITY DEFINER 함수가 ALTER ADD COLUMN으로 신설된 컬럼 참조 시 트랜잭션 분리 (컬럼 신설 트랜잭션 → COMMIT → 함수 신설 트랜잭션, 5/7 ROLLBACK 학습 정합)
- **검증 실패 시:** 수동 DROP/REVERT SQL 별도 의뢰서 발행

메모리 등록: `supabase_sql_editor_session_isolation.md`.

### 7-4-2. 사고 학습 2 — parent_post_id UUID → BIGINT 정정 (참조 PK 타입 사전 확인)

본 spec § 7-2-3 SQL = `parent_post_id UUID REFERENCES posts(id)` → 라이브 posts.id = **bigint** 타입과 불일치 → FK 위반 → 자동 ROLLBACK. 정정 적용:

- spec v2 § 7-2-3 정정: `parent_post_id BIGINT REFERENCES posts(id)`
- 별 트랙 #36 누적 — posts PK 타입 통일 (bigint → uuid, author_id #33과 묶음, Phase 1 종료 후)
- **영구 학습:** ALTER ADD COLUMN ... REFERENCES 시 참조 PK 타입 사전 확인 필수 (Pre-flight RUN에 참조 PK 타입 raw 검증 SQL 포함)

### 7-4-3. Step A 결재 결과 (2026-05-09 본 진입)

| 결재 | 확정 | Step B 영향 |
|---|---|---|
| ① users 분배 | 3계정 NULL 유지 (admin/조현영/테스트). 5/15 매니저 승인 흐름에서 부여 | B-2 UPDATE 0건 |
| ② posts branch_id | 4건 모두 NULL (archive_legacy 폐기 게시판) | B-3 UPDATE 0건 |
| ③ author_id 타입 | 별 트랙 #33 누적 (Phase 1 종료 후) | 영향 없음 |
| ④ app_settings | (key, value, label, group_name, updated_at) 5컬럼 정합 SQL + 별 트랙 #34 (hub_public ↔ board_hub 통합) | B-5 SQL 정정 |
| ⑤ parent_post_id | BIGINT 정정 + 별 트랙 #36 (PK 타입 통일) | B-3 SQL 정정 |

### 7-4-4. Step B 진행 누적 (2026-05-09 새벽 + 점심)

| Step | 트랜잭션 | 라이브 변경 | 상태 |
|---|---|---|---|
| B-1 | 1건 | branches/teams/IEB 신설 + 시드 5 row + 인덱스 4건 | ✅ commit (새벽) |
| B-2~B-5 | 1건 | users +2 컬럼 + posts +6 컬럼 (parent_post_id BIGINT) + CHECK 3 + app_settings +3 row + 인덱스 6 | ✅ commit (새벽) |
| B-6 | 1건 | SECURITY DEFINER 함수 4종 (my_team_id / my_branch_id / my_assigned_branches / is_setting_enabled). 총 16 함수 | ✅ commit (새벽) |
| **B-6.5** | **1건** | **get_my_role() 함수 신설 (§ 6-3 정책 1번 (b) 정정 의존). 총 17 함수** | **✅ commit (점심)** |
| **B-7** | **1건** | **posts 정책 sweep (DROP 7 + CREATE 14, UPDATE/DELETE 보존 3) + 신설 3 테이블 RLS 활성화 + 정책 8건 (branches 2 + teams 3 + IEB 3)** | **✅ commit (점심)** |
| **C** | **0건** | **사후 검증 (RUN #5에 메타+자기참조 0건+함수 본문 모두 포함)** | **✅ 사실상 종료** |
| **D** | **0건** | **라이브 9역할 회귀 — admin + ga_member 2명만 가입, 6역할 0건** | **🟡 보류 (5/15 4팀 오픈 후 Step 16 통합 권장)** |

### 7-4-5. Step B-7 본 진입 결재 (2026-05-09 점심)

| 결재 | 채택 | 사유 |
|---|---|---|
| § 6-3 정책 1번 자기참조 + ga_branch_manager 누락 정정 | (b) get_my_role() 범용 함수 신설 + 인라인 IN ('admin', 'ga_branch_manager', 'ga_manager') | 향후 다른 정책 재활용 가능 + D-pre.7~.8 SECURITY DEFINER 함수 표준 정합 |

### 7-4-6. Step B-7 라이브 정책 sweep raw (2026-05-09 점심)

**DROP 7건 (옛 spec 정책, Step 2 commit 시점):**
- `posts_insert_admin` / `posts_insert_insurer` / `posts_insert_manager_notice` / `posts_insert_qna` (INSERT 4)
- `posts_select_admin` / `posts_select_insurer` / `posts_select_qna_notice` (SELECT 3)

**CREATE 14건 (spec v2 § 6-2 + § 6-3, 정책 1번 (b) 정정 적용):**
- SELECT 7: posts_select_qna_seed_or_branch / navigation / insurer_employee / manager_notice / manager_lounge / hub / admin
- INSERT 7: posts_insert_manager_notice (get_my_role() IN 패턴) / manager_lounge / navigation / insurer / admin_seed / hub / qna_system

**보존 3건 (spec v2 § 6-4 정합):**
- `author or admin delete posts` (DELETE)
- `author or admin update posts` (UPDATE)
- `posts_update_insurer_manager` (UPDATE, is_insurer_manager 가드)

**branches/teams/IEB RLS 정책 8건:**
- branches 2: branches_select_authenticated / branches_write_admin
- teams 3: teams_select_my_branch / teams_select_admin / teams_write_admin
- IEB 3: ieb_select_self / ieb_select_admin / ieb_write_admin

### 7-4-7. Step C 사후 검증 결과 + Step D 인계

**Step C (사실상 종료, RUN #5에 통합):**
- 메타 조회: pg_policies (posts 17 정책 + branches/teams/IEB 8 정책) ✅
- 자기참조 EXISTS 잔존 0건 sweep ✅
- SECURITY DEFINER 함수 17개 본문 검증 ✅
- 데이터 회귀 (users=3 / posts=4) ✅

**Step D (보류 → 5/15 후 Step 16 통합):**
- 본 시점 라이브 = admin 1 + ga_member 2 (3계정), 6역할(ga_branch_manager / ga_manager / ga_staff / insurer_* 4종) 가입자 0건
- 9역할 진입 회귀 = 본질 검증 불가
- **권장:** Phase 1 Step 16 (라이브 회귀 + 9역할 종합 검수) 시점에 4팀 가입자 + 보험사 임직원 가입자 활용 통합 진행

### 7-4-8. Step 2-bis 종료 인계 (다음 메인 트랙 = Step 5)

본 spec § 9 (작업 순서 18단계) 정합:
- ✅ 종료 7건: Step 0 + 0-bis + 0-tris + 2 + **2-bis** + 3 + 4
- 🟡 보류 1건: Step 1 D-9 회귀 회신 마무리 (별도 30분)
- ⏸ 잔여 9건: Step 5 + 6 + 7 + 8 + 9 + 10~15 (admin 융합) + 16

다음 메인 트랙 진입 = **Step 5 보험사 회원가입 폼** (1.0세션, 4중 방어 + 직급→9역할 매핑).

진실 원천: 본 spec § 7-4 + 메모리 [`supabase_sql_editor_session_isolation.md`] + [`rls_self_reference_avoidance.md`].

---

# § 8. 시드 데이터 흐름 (단일 데이터 + RLS 가시성 분기)

## 8-1. 시드 데이터 INSERT 표준 (보강 1 결정 반영) ⭐

```sql
-- admin이 보험사 게시판에 시드 INSERT (단 1회, 복제 ❌)
INSERT INTO posts (
  board_type,           -- 'insurer' (메뉴-DB 일치 ⭐)
  source_type,          -- 'seed'
  insurer_id,           -- <보험사 id>
  question_type,        -- '공지' | '상품' | '인수'
  display_author,       -- 'onesecond 자료실'
  source_label,         -- '메리츠화재 소식지'
  branch_id,            -- NULL ⭐ 모든 지점 공유
  title, content, keywords, created_at, ...
) VALUES (
  'insurer', 'seed',
  (SELECT id FROM insurers WHERE slug='meritz'),
  '공지',
  'onesecond 자료실',
  '메리츠화재 소식지',
  NULL,
  '메리츠화재 2026년 5월 신상품 안내',
  '...',
  ARRAY['신상품', '인수기준', '5월']::text[],
  now()
);
```

## 8-2. RLS 가시성 분기 (SELECT 시점에 자동)

### 8-2-1. 보험사 임직원 진입 시

`posts_select_insurer_employee` 정책 통과:
```
is_insurer_employee()
  AND board_type = 'insurer'
  AND insurer_id = current_user_insurer_id()  -- 메리츠 임직원만
  AND (
    is_setting_enabled('insurer_unified_view')
    OR branch_id = ANY(my_assigned_branches())
    OR branch_id IS NULL  -- 시드 글로벌
  )
```

→ 메리츠 임직원이 본인 회사 게시판에서 시드 글 보임 (모든 담당 지점 공유).

### 8-2-2. 사용자 (지점 단위) 진입 시

`posts_select_qna_seed_or_branch` 정책 통과:
```
(board_type = 'qna' AND branch_id = my_branch_id())  -- 미스
  OR
(board_type = 'insurer' AND source_type = 'seed' AND branch_id IS NULL)  -- 통과 ⭐
```

→ 더원지점 사용자가 현장 Q&A 페이지 진입 시 시드 글 노출 (메리츠 시드 = 모든 지점 공유).

### 8-2-3. RLS 복잡도 캡슐화

자주 등장하는 조건 → SECURITY DEFINER 함수로 캡슐화:

```sql
-- (선택, 미래 패턴) 시드 데이터 가시성 함수
CREATE OR REPLACE FUNCTION is_seed_post(post_row posts) RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
  SELECT post_row.source_type = 'seed' AND post_row.branch_id IS NULL;
$$;
```

(Step 2-bis 본문에서 도입 여부 결정)

## 8-3. 메뉴-DB 일치 본질

| 메뉴 | board_type DB 값 |
|---|---|
| 매니저 공지 | `manager_notice` |
| 매니저 라운지 | `manager_lounge` |
| 네비게이션방 | `navigation` |
| 현장 Q&A | `qna` (+ 시드는 `insurer` + RLS OR 분기로 흡수) |
| 보험사 게시판 | `insurer` ⭐ 시드 + 답변 + 자발 글 모두 |
| 허브 게시판 | `hub` |

**시드 데이터:** `board_type='insurer'` (메뉴-DB 일치) + 현장 Q&A에는 RLS OR 분기로 노출.

이유 (보강 1 정합):
- 메뉴-DB 일치 본질 정합 (보험사 게시판 메뉴 = `board_type='insurer'`)
- 시드 = 보험사 공급 자료 = `board_type='insurer'` 자연스러움
- RLS 복잡도 = SECURITY DEFINER 함수로 캡슐화

## 8-4. 사용자 화면 노출 패턴

### 8-4-1. 현장 Q&A 페이지 진입

```
[큼지막 구글 느낌 검색창]
  ┌────────────────────────────────────────┐
  │ 🔍 무엇을 찾으세요?                      │
  └────────────────────────────────────────┘
  
[카테고리 필터]
[전체] [공지] [상품] [인수]
                       ↑ v1.x 시작값 3개

[게시판 목록 — 본인 지점 + 시드 글로벌]
- [메리츠] [공지] 메리츠화재 2026년 5월 신상품 안내
  📌 onesecond 자료실 / 메리츠화재 소식지 / 5/8
- [DB손보] [상품] DB손해보험 종신보험 ABC 안내
  📌 onesecond 자료실 / DB손보 소식지 / 5/8
- [정제 Q&A] 인수질문 — 고혈압 + 약복용 + 30대 남
  💬 17 답변 / 본인 지점 토픽 / 5/7
- [매니저공지] 4팀 5월 회의 일정 (작성자: 김매니저)
  📋 본인 팀만 / 5/7
- ...
```

### 8-4-2. 보험사 임직원 본인 회사 게시판 진입

```
[메리츠 게시판 — 본인 담당 지점만 (admin 토글 #2 OFF)]

[탭] [공지] [상품] [인수] [Q&A 답변]

[게시판 목록]
- [공지] 메리츠화재 2026년 5월 신상품 안내
  📌 시드 / 모든 지점 공유 / onesecond 자료실
- [상품] (자발 글) 메리츠 종신보험 인수 가이드
  ✍️ 박매니저 / 더원지점 + 스타지점 (본인 담당) / 5/8
- [Q&A 답변] 더원지점 1팀 — 고혈압 + 약복용 답변
  💬 박매니저 → 김OO / 더원지점 / 5/8
- ...
```

---

# § 9. 작업 순서 18단계 + 세션 분배

## 9-1. Phase 1 진행 상태 (5/8 새벽 기준)

이미 종료 (4/18):
| Step | 단계 | 종료 시점 |
|---|---|---|
| 0 | spec 명문화 (v1) | 5/7 → **본 v2 재작성으로 보강** |
| 2 | DB 마이그레이션 (insurers + posts ALTER + users.insurer_id + RLS sweep) | 5/7 |
| 3 | Quick 메뉴 §원전산 전환 (옵션 a 단순 채택) | 5/8 새벽 |
| 4 | Supabase Auth 이메일 인증 ON (검증 단계) | 5/8 새벽 |

진행 예정 (14단계):

| Step | 단계 | 세션 | 비고 |
|---|---|---|---|
| **0-bis** | spec v2 재작성 (본 진입) | 0.5 (3~4시간) | docs/specs/v2_insurer_admission_phase1_v2.md 신설 + v1 폐기 헤더 |
| **0-tris** | README.md 9 role 갱신 + 4축→5축 + 4팀 40명 표기 정리 | 0.3 | strategy_overview § ⚠️ #1 + #5 + #7 + #8 정합 처리 (보강 3 분리) |
| 2-bis | DB 보강 마이그레이션 (branches/teams/IEB + 컬럼 + RLS) | **1.0+** | Step A·B·C·D 분할 (보강 4 정합, 0.5 세션으로 되돌리지 말 것) |
| **5** | ~~보험사 회원가입 폼 (4중 방어 + 직급→9역할 매핑) — index.html 인라인~~ → **재정의: home_v2 통합 (Phase 1.5 즉시 흡수)** | ~~1.0~~ → **2.5세션** | ~~(b) 일반 폼 첫 단계 분기~~ → **5/9 저녁 결정 변경: index.html → home_v2.html 가입/로그인 통합. Step 5-A/5-B/5-C 박힌 코드(434줄) 100% 재사용 + 위치 이전. 세부는 Phase 1.5 작업지시서 (별도 신설) 참조** |
| 6 | 보험사 독립 페이지 (insurer.html 동적 라우팅) | 0.5 | /insurer/{slug} |
| 7 | 게시판 7메뉴 재구조화 (board.html) | 1.3 | 4탭 → 7종 board_type, 메뉴-DB 일치 |
| 8 | 6필드 + 검색창 큼지막 UI | 1.8 | 단계형 입력 + 정규식 차단 + 구글 느낌 검색 |
| 9 | 양방향 미러링 + 시드 자동 분기 + 통합 view 1차 준비 | 1.3 | 답변 가시성 자동 + admin 토글 #2 골격 |
| 10~15 | admin Phase D 융합 (D-1/D-9/D-10/D-7/D-8/D-final) | 2.4 | 본 spec § 10 융합 트랙 |
| 16 | 라이브 회귀 + 9역할 종합 검수 | 0.5 | Step D 통합 |
| | **소계 (잔여)** | **~10.6세션** | (Step 0-bis + 0-tris + 2-bis + 5~16) |

**총 잔여 ~10.6세션** (기존 10.4 + 보강 ~0.2~2.2세션 — Step 2-bis 1.0+ 포함).

---

## 9-1-bis. ⚠️ 5/9 저녁 전략 재수정 — Phase 1.5 즉시 흡수 (옵션 Y' 채택)

> **5/9 저녁 결정:** Step 5 재정의 (index.html → home_v2 통합). Phase 1 잔여(Step 6~16) 5/15 후 진행.
> 진실 원천: 메모리 [phase_1_5_index_home_absorption.md] + _INDEX.md 메인 트랙 갱신.

### 변경된 작업 순서 (5/9 저녁 ~ 5/15)

| # | 단계 | 분량 | 비고 |
|---|---|---|---|
| 5-rev (Step 1) | branches+teams RLS 비활성화 | 5분 | Chrome 트랜잭션 (FK 위반 해소) |
| 5-rev (Step 2) | 메모리 + _INDEX.md + spec v2 § 9 갱신 commit | 0.3 | Phase 1.5 즉시 흡수 명문화 (본 § 9-1-bis 포함) |
| 5-rev (Step 3) | Phase 1.5 작업지시서 (home_v2 가입/로그인 통합) | 0.5 | 결재 박스 + 작업 분할 |
| 5-rev (Step 4) | home_v2.html 본 빌드 | 2.0 | Step 5-A/5-B/5-C 박힌 DB + 코드 이전 |
| 5-rev (Step 5) | index.html → home_v2 redirect | 0.2 | URL 정합 |
| 5-rev (Step 6) | Chrome 라이브 회귀 (시나리오 9건) | 0.5 | 5/15 직전 |
| | **5/15 본진** | **~3.5세션** | 6일 일정 정합 |

### 5/15 후 잔여 (Phase 1 Step 6~16)

| Step | 단계 | 분량 |
|---|---|---|
| 6 | 보험사 독립 페이지 (insurer.html) | 0.5 |
| 7 | 게시판 7메뉴 재구조화 | 1.3 |
| 8 | 6필드 + 검색창 큼지막 UI | 1.8 |
| 9 | 양방향 미러링 + 시드 분기 | 1.3 |
| 10~15 | admin 융합 | 2.4 |
| 16 | 라이브 회귀 종합 | 0.5 |
| | **잔여 합계** | **~7.8세션** |

### 본질 정합

- **Sunk cost 0:** Step 5-B (DB 신설 + RPC 2 + RLS 1 + 28사 도메인) + Step 5-C (handle_new_user trigger 4컬럼 추가) = Phase 1.5에서 100% 재사용
- **코드 이전:** index.html 가입 폼 코드(434줄) = home_v2.html로 위치만 이전
- **strategy_overview § 8-4 정합:** "index 철학 변경 — 단순 랜딩 → home 흡수 (Phase 1.5)" 즉시 실현
- **5/15 일정 보호:** 4팀 약 40~50명 오픈 시점에 home_v2가 메인 진입로 (가입 + 로그인 + 랜딩 통합)

### 결재 흐름 (5/9 저녁)

| 시점 | 결재 |
|---|---|
| Step 5-C 본 빌드 + 라이브 테스트 | branches RLS FK 위반 발견 |
| 팀장님 메시지 | "인덱스 안 쓸 건데 시간지체할 필요 있냐?" |
| Code 큰 그림 재정독 | 옵션 X (Phase 1 그대로) / Y' (Phase 1.5 즉시) / Z (하이브리드) 분석 |
| Code 추천 | Y' (sunk cost 0 + 본질 정합 + 5/15 일정 가능) |
| 팀장님 채택 | **(Y') Phase 1.5 즉시 흡수** ⭐ |

## 9-2. 1일 ~6시간 = 1세션 가정 시 일정 (5/8 ~ 5/15 + 5/16~)

| 일자 | Step | 비고 |
|---|---|---|
| **5/8 (목)** | 0-bis (본 진입, 3~4시간) + 0-tris (0.3세션) | spec v2 + README 갱신 |
| 5/9 (금) | 2-bis (1.0+ 세션) + Step 5 진입 (잔여 시간) | DB 보강 + 회원가입 |
| 5/10 (토) | Step 5 마무리 + Step 6 + Step 7 진입 | 회원가입 + 보험사 페이지 + 게시판 |
| 5/11 (일) | Step 7 마무리 + Step 8 진입 | 게시판 + 6필드+검색창 |
| 5/12 (월) | Step 8 마무리 + Step 9 진입 | 6필드+검색창 + 미러링 |
| 5/13 (화) | Step 9 마무리 + Step 10~12 (admin 융합) | 미러링 + admin D-1/D-9/D-10 |
| 5/14 (수) | Step 13~15 (admin 융합) + Step 16 진입 | admin D-7/D-8/D-final + 회귀 |
| **5/15 (목)** | 🎯 4팀 오픈 (Step 16 안정화) | 9역할 종합 검수 |
| 5/16~ (금~) | 잔여 융합 + 안정화 + 별 트랙 진입 | KCP / PITR / Sentry / Playwright |

**버퍼:** 5/14 일부 슬롯 + 5/16~5/26 (KCP 결제 시스템 미가동 = 4팀 무료 모드 + 보험사 입점 영업 자료 보강).

## 9-3. 외부 마감 압박 단어 사용 금지

`feedback_no_external_deadline.md` 정합:
- 4팀 5/15 오픈 = 내부 일정. 외부 마감 압박 X
- 사용자 0명 = 호환성 걱정 0 환경 = 라이브 전면 개편 가능
- "5/15까지", "데드라인" 같은 표현 금지

## 9-4. Step 0-bis / 0-tris 분리 이유 (보강 3 정합)

- Step 0-bis: spec v2 재작성 = 본 spec 신설 + v1 폐기 헤더 (3~4시간)
- Step 0-tris: README.md 9 role 갱신 + 4축→5축 + 4팀 40명 표기 정리 (0.3세션, 약 30~40분)
- 이유: 4/28 사고 패턴 정합 (한 번에 너무 많이 박지 않음)
- README.md 갱신 시 **strategy_overview § ⚠️ #1 + #5 + #7 + #8 동시 처리**

---

# § 10. 별 트랙 (본 spec 영역 외)

## 10-1. KCP 전자결제 신청

- 진행: 다음 주 (5/12~)
- 5/15~5/26 결제 미가동 기간 = 4팀 무료 모드 + 보험사 입점 영업 자료 보강
- 본 spec 트랙과 분리

## 10-2. v1.1 운영 안전장치 3종

| 트랙 | 도입 시점 | 상태 |
|---|---|---|
| #A PITR (Supabase 백업) | 2026-05-06 (1일 shift) | 결제 직전 + Chrome 5/5 PASS |
| #B Sentry.io 라이브 에러 추적 | 2026-05-12 | 무료 플랜 (5,000 events/월) |
| #C Playwright 회귀 자동화 1세트 | 2026-05-13 | admin_v2 D-1~D-6 ~50 시나리오 |

## 10-3. 카톡 → 원세컨드 마이그레이션

- 보류 상태 (2026-05-05 결정)
- 5/14 1일 버퍼 확보 = 의논 시점에 별도 평가

## 10-4. 알림 시스템 v1.1 5개 항목

- C영역 5배너 / 호버 프리뷰 / MY SPACE 알림 설정 / DND / A1 🔔
- 5/15 4팀 오픈 시점 우선
- 5/11~12 admin Phase D 마무리 후 분할 spec 작성 권장

## 10-5. Storage RLS 전수 sweep

- 작업지시서: `docs/specs/storage_rls_full_sweep_workorder.md` (4 Step 분할)
- 5/11 슬롯 진입 권장 (~0.6세션)

## 10-6. 사이트 분리 모델

- `onesecond.solutions` (무료) / `pro.onesecond.solutions` (PRO)
- 키워드 grep 결과 0건 → strategy_overview § ⚠️ 미반영 #1
- 본 spec 영역 외, v2.0+ 결정 대기

## 10-7. 보험뉴스 자동 증식 / 4팀 vault Phase 1

- Phase 1 종료 후 진입
- `docs/specs/2026-05-05_team4_vault_phase1.md` (455줄, 5/12 이후 진입)

## 10-8. 무료 회원 저장 공간 정책 후속 4건

- Cloudflare CDN 도입 시점
- 30MB 한도 강제 3중 방어
- 다운그레이드 grace period
- 5,000명 진입 전 한도 재검토

---

# § 11. 위험 요소 매트릭스

## 11-1. 위험 12건

| # | 위험 | 결정 반영 | 강도 |
|---|---|---|---|
| 1 | 6필드 → 사용자 실 환자 정보 입력 | 정규식 차단 + 안내 박스 + 토스트 + 가이드 모달 | 🟢 낮음 |
| 2 | 가짜 보험사 임직원 가입 | 4중 방어 (도메인 + Auth + pending + 승인) | 🟢 낮음 |
| 3 | 첫 보험사 입점 닭-달걀 | admin 직접 매니저 생성 + 1주일 정착 | 🟡 중간 |
| 4 | admin Phase D 잔여 누락 | 융합 결정 → 자연 처리 | 🟢 낮음 |
| 5 | Quick §원전산 정리 누락 | Step A·B·C·D 분할 (5/8 새벽 종료) | 🟢 낮음 |
| 6 | Phase 2 진입 시점 | 5/22 이후 권장 | 🟢 낮음 |
| 7 | 9역할 + insurer_id + status + branch_id + team_id RLS 복합 | D-pre.7~.8 패턴 정합 + 자기 참조 EXISTS 금지 | 🟡 중간 |
| 8 | Auth 메일 템플릿 영문 잔존 | 미해결 #31, Step 5 진입 시 통합 처리 | 🟢 낮음 |
| 9 | board_type 의미 변경 시 데이터 손실 | Step A·B·C 분할 + 'archive_legacy' 보존 | 🟡 중간 |
| 10 | 매니저 공지 팀 격리 운영 혼동 | spec § 5-2 명문화 + 매니저 라운지 분리 | 🟢 낮음 |
| 11 | 시드 데이터 RLS OR 분기 복잡도 | SECURITY DEFINER 함수 캡슐화 + 라이브 회귀 9건 | 🟡 중간 |
| 12 | 보험사 임직원 N:M 다대다 분배 운영 부담 | admin_v2 D-10에서 입점 관리 UI 신설 | 🟢 낮음 |

**대형 위험(🔴) 0건. 🟡 중간 4건. 🟢 낮음 8건.**

## 11-2. 영구 학습 명문화 (D-pre.7~.8 + Step B 1차 ROLLBACK)

> ⚠️ RLS USING/WITH CHECK 동일 테이블 SELECT 서브쿼리 절대 금지
> ⚠️ admin/role 검증은 SECURITY DEFINER 함수 표준 (`is_admin()` / `is_manager()` / `my_branch_id()`)
> ⚠️ DB 메타 통과 ≠ 라이브 안전
> ⚠️ 같은 테이블 다른 cmd 정책에도 동일 패턴 잔존 가능 — 사전 검증 단계 전수 sweep 필수
> ⚠️ Code "재귀 안전 ✅" 단정 결론 금지
> ⚠️ SECURITY DEFINER 함수 컬럼 의존 — 함수 정의 시점에 참조 컬럼 존재 확인 필수 (Step B 1차 ROLLBACK)
> ⚠️ 라이브 컬럼 보존 우선 — 라이브 5컬럼(`patient_age` 등) 보존 + spec 정합화 (5/7 Step A 결정 1)
> ⚠️ board_type 의미 재정의 시 데이터 마이그레이션 — archive_legacy 변환 패턴 (5/7 Step A 결정 3)

---

# § 12. 다음 단계 진입 준비

## 12-1. 본 spec 작성 후 즉시

- ✅ 본 spec (`v2_insurer_admission_phase1_v2.md`) 작성 완료
- 다음: v1 폐기 헤더 박음 (`v2_insurer_admission_phase1_v1.md`)
- 다음: Step 0-tris (README.md 9 role 갱신 + 4축→5축 + 4팀 40명 표기 정리, 0.3세션)
- 다음: Step 2-bis (DB 보강 마이그레이션, 1.0+ 세션)
- 다음: Step 5 진입 (보험사 회원가입 폼, 1.0세션)

## 12-2. Phase 1 진입 체크리스트

- [x] strategy_overview 통독 + 16건 정합 식별 (5/8 새벽)
- [x] 본 spec v2 작성 (5/8 새벽)
- [ ] v1 폐기 헤더 박음
- [ ] _INDEX.md 메인 트랙 갱신 (Step 0-bis 종료 표시)
- [ ] README.md 9 role + 4축→5축 + 4팀 40명 표기 갱신 (Step 0-tris)
- [ ] Step 2-bis 의뢰서 발행 (DB 보강 마이그레이션)
- [ ] Step 5 의뢰서 발행 (보험사 회원가입 폼)

## 12-3. 외부 / 별 트랙 종속

- D-9 Step 5 라이브 회귀 회신 (5/5 의뢰서, Phase 1과 별개 30분)
- PITR 결제 후 사후 검증 Chrome 회신 (5/5 의뢰서)
- KCP 가맹점 회원가입 회신 (5/8 의뢰서, 별 트랙)

---

**END OF SPEC v2**

> 본 spec은 v2.0 원수사 입점 모델 Phase 1의 통합 명세서입니다.
> 본 spec과 충돌하는 기존 문서·코드는 모두 본 spec 우선
> (진실 원천: `docs/core/onesecond_os_definition_v2_2026-05-07.md` + `docs/role_system.md`).
> Phase 1 본격 진입은 본 spec 승인 + Step 2-bis 의뢰서 발송 후.
> 추가 GPT 조율 차단 (4/28 사고 패턴 정합).
