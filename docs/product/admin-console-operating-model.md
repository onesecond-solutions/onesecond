# 원세컨드 운영센터(Admin) 재설계 — 운영 데이터 모델 설계서

> **작성일:** 2026-05-31
> **상태:** 설계 확정 (코드 착수 전 잠금)
> **성격:** UI 설계 + 데이터 정의 + 로깅 정책 + 운영 모델 통합
> **관련:** `pages/admin-console.html` (셸 + 대시보드 골격), 기존 `pages/admin_v2.html`/`js/admin_v2.js` (참고·로직 재사용 자산)

---

## 0. 본질

> 운영센터 = 통계센터 ❌ → **운영자가 실제 일을 처리하는 업무 콘솔** ✅
> 관리자가 로그인 후 5초 안에 **① 현재 서비스 상태 ② 지금 처리할 업무**를 파악한다.

- v2 인디고 토큰 적용은 **기본 전제** (작업 목표 아님)
- 화면·메뉴·정보구조 = 새로 설계 / 데이터 접근 로직 = 재사용
- UI: 이모지 금지 → Lucide SVG 통일 / 상태 = 배지 / 테이블 중심

---

## 1. 정보구조 (IA)

```
대시보드
운영      — 가입 승인 · 사용자 · 지점
콘텐츠    — 게시글 · 댓글 · 자료실
시스템    — 메뉴 · 공지·배너 · 설정
로그·통계 — 로그 · 통계(보류)
[하단] 관리자 종료   [상단] 서비스로 돌아가기 · 로고
```

독립 전체화면 콘솔 경험(SPA 모듈 아님). 공통 자산(Auth Guard, Supabase 클라이언트, v2 토큰) 재사용.

---

## 2. 대시보드 우선순위 5단계 (확정)

```
1. Task Queue        처리해야 할 일   ← 최상단
2. Risk Alerts       위험 신호
3. Operations Feed   운영 피드
4. Branch Overview   조직 현황
5. Service Overview  서비스 현황       ← 통계는 최하단
```

원칙: "승인 대기 3건"이 "최근 활동 100건"·"총 사용자 N명"보다 위. 최상단은 반드시 행동(처리할 일).

---

## 3. 데이터 정의서 (위젯별)

| 위젯 | 표시값 | 데이터 소스 | 집계 방식 | 상태 |
|---|---|---|---|---|
| 승인 대기 | N건 | users | status=pending AND role in insurer_* | 가능 |
| 지점 미배정 | N명 | users | status=active AND branch_id IS NULL | 가능 |
| 장기 미처리 | N건 | users | pending AND created_at < now-24h | 가능 |
| 운영 피드 | 최근 20건 | activity_logs | severity·event_type + 문장 변환 | 로깅 선행 |
| 지점 현황 | N개 | branches×users | 지점별 인원 GROUP BY | 가능 |
| 운영 KPI | 사용자/콘텐츠 | users·posts·scripts·library | count | 가능 |

### 4분류

- **A. 지금 가능**: 승인 대기 / 지점 미배정 / 장기 미처리 / 지점 현황 / 운영 KPI
- **B. 데이터 없어 불가**: 신고(post_reports 없음) / 처리 요청(요청 모델 없음) / 통계 추세(RPC 없음) / 의미 있는 운영 피드(로깅 선행 필요)
- **C. 컬럼 추가 필요**: 공지 만료(team_notices.expires_at) / "최근 접속" 활성(last_seen_at 갱신 로직) / 원수사 희망지점(public.users)
- **D. 로그 수집 추가 필요**: 운영 액션 전반 (§5 카탈로그)

---

## 4. severity 표준 (ENUM 고정 — 운영 피드·위험 신호·배지 공유)

| severity | 의미 |
|---|---|
| `critical` | 즉시 조치 필요 |
| `high` | 당일 처리 권장 |
| `medium` | 운영 참고 |
| `normal` | 기록용 |

→ 운영 피드 배지, Risk Alerts, 알림 배지 모두 이 기준 공유.

---

## 5. event_type 표준 카탈로그 (15종 + 인증 2종)

| event_type | 한국어 | target_type | severity | 문장 변환 | 단계 |
|---|---|---|---|---|---|
| approve_user | 가입 승인 | user | high | "{대상}님 가입을 승인했습니다" | 1차 |
| assign_branch | 지점 배정 | branch | medium | "{대상}님을 {지점}에 배정했습니다" | 1차 |
| suspend_user | 사용자 정지 | user | high | "{대상}님을 정지했습니다" | 1차 |
| change_role | 권한 변경 | user | high | "{대상}님 권한을 {before}→{after}로 변경했습니다" | 1차 |
| create_notice | 공지 등록 | notice | normal | "공지를 등록했습니다" | 1차 |
| update_setting | 설정 변경 | setting | high | "시스템 설정을 변경했습니다" | 1차 |
| login_admin | 관리자 로그인 | — | high | "관리자가 로그인했습니다" | 1차(감사) |
| activate_user | 정지 해제 | user | high | "{대상}님 정지를 해제했습니다" | 2차 |
| update_notice | 공지 수정 | notice | normal | "공지를 수정했습니다" | 2차 |
| hide_post | 게시글 숨김 | post | medium | "게시글을 숨김 처리했습니다" | 2차 |
| delete_post | 게시글 삭제 | post | high | "게시글을 삭제했습니다" | 2차 |
| delete_comment | 댓글 삭제 | comment | medium | "댓글을 삭제했습니다" | 2차 |
| update_menu | 메뉴 설정 변경 | menu | medium | "메뉴 설정을 변경했습니다" | 2차 |
| create_branch | 지점 생성 | branch | high | "{지점}을 생성했습니다" | 2차 |
| update_branch | 지점 수정 | branch | medium | "{지점} 정보를 수정했습니다" | 2차 |
| delete_branch | 지점 삭제 | branch | high | "{지점}을 삭제했습니다" | 2차 |
| login | 로그인 | — | normal | "로그인" | 기존 |

**감사(Audit) 핵심 5종:** approve_user · suspend_user · activate_user · change_role · update_setting

---

## 6. activity_logs 확장 스키마

| 컬럼 | 현재 | 비고 |
|---|---|---|
| user_id | 있음 | actor(행위자) |
| event_type | 있음 | §5 카탈로그 |
| target_type | 있음 | user/branch/post/notice/setting/menu/comment |
| target_id | 있음 | 대상 id |
| **severity** | **추가** | §4 ENUM (default 'normal') |
| **metadata** (jsonb) | **추가** | 변경 전후·맥락 (§6-1 규칙) |
| created_at | 있음 | |

### 6-1. metadata 규칙 (중요)

- **id 계열만 저장** — `before_role` / `after_role` / `branch_id` 등
- **표시용 데이터(이름) 저장 금지** — `actor_name`, `branch_name` 등 ❌
- **이유:** 사용자/지점 이름 변경 시 과거 로그와 불일치 방지 (로그 무결성)
- **표시 시 변환:** user_id → users 조회, branch_id → branches 조회

```json
// change_role 예시 (저장)
{ "before_role": "ga_member", "after_role": "ga_manager", "branch_id": "xxxx" }
```

### 6-2. 마이그레이션 (신버전 pdnwgzneooyygfejrvbg 확인 후 실행)

```sql
ALTER TABLE activity_logs ADD COLUMN severity text DEFAULT 'normal';
ALTER TABLE activity_logs ADD COLUMN metadata jsonb;
```

→ 이 한 테이블이 **운영 피드 + 위험 신호 + 변경 이력 + 감사 로그**를 모두 떠받침.

---

## 7. logActivity 공용 헬퍼

```
logActivity(event_type, target_type, target_id, severity, metadata)
  → POST /rest/v1/activity_logs { user_id(actor), event_type, target_type, target_id, severity, metadata }
```

- 각 운영 액션 **성공 직후** 호출 (실패 시 액션 자체에 영향 주지 않게 catch 무시)
- 기존 `auth.js`의 login 로깅도 이 헬퍼로 통일 가능

---

## 8. 운영 피드 (Operations Feed)

- raw event_type 노출 **금지** → **문장 변환 계층** 필수
- 형태: `시각 + severity 배지 + 변환 문장`
  ```
  09:12  high    김OO님 가입을 승인했습니다
  08:44  medium  김OO님을 더원지점에 배정했습니다
  ```
- **조회 범위:** 대시보드 운영 피드 = **최근 20건** / 로그 화면 = 전체 조회·필터
- 변환 = event_type 템플릿 + actor(user_id→name) + metadata(id→name) 치환

---

## 9. UI 원칙

- 이모지 전면 금지 → Lucide SVG 통일
  - LayoutDashboard / Users / UserCheck / Building2 / FileText / MessageSquare / FolderKanban / Settings / Bell / ShieldAlert / Activity / LogOut
- 상태 = 배지 (§4 severity)
- 테이블·카드·빠른 액션 중심 / iframe·과도한 차트 배제
- 행동 KPI 최상단, 통계 KPI 최하단
- 이탈 경로 ≥2: 상단 "서비스로 돌아가기" + 좌측 하단 "관리자 종료" + 로고 + ESC

---

## 10. 코드 착수 순서 (확정)

| # | 단계 | 비고 |
|---|---|---|
| 1 | 본 설계서 작성 | ✅ (이 문서) |
| 2 | activity_logs 마이그레이션 (severity·metadata) | **신버전 확인 첫 질문** 거침 |
| 3 | `logActivity()` 공용 헬퍼 | |
| 4 | 1차 이벤트 7종 적용 (approve_user 포함) | 해당 기능 구현 시 심기 |
| 5 | 운영 피드 변환 계층 | 문장 변환 |
| 6 | 대시보드 실데이터 연결 | 운영 피드가 의미 있는 데이터로 채워짐 |

> **핵심:** 대시보드 구현보다 **logActivity 체계를 먼저** 만든다. 로깅을 먼저 심어야 운영 피드가 처음부터 의미 있는 데이터로 채워진다 (지금 연결하면 "최근 이슈"가 로그인 기록만 보임).

---

## 11. 진행 단계 분류 (재확인)

- **MVP**: 대시보드 + 가입 승인(admin-approvals 흡수) + 사용자 + 지점
- **2차**: 게시글 · 댓글 · 자료실
- **3차**: 메뉴 · 공지·배너 · 설정 · 로그
- **보류**: 통계(RPC 선행) · 신고(post_reports 신설) · 결제(데이터 없음)

---

## 12. 구현 고정 사항 (2026-05-31 보강)

### 12-1. event_type 네이밍 규칙
- **`동사_대상`** 형식 고정 (approve_user / create_branch / update_notice …)
- 규칙 유지 → 운영 피드 변환기가 단순해짐

### 12-2. severity 자동 부여 (수동 입력 금지)
- 시그니처 = `logActivity(event_type, target_type, target_id, metadata)` — **severity 인자 제거**
- severity = `EVENT_SEVERITY[event_type]` 내부 매핑으로 자동 부여 (db.js)
- 이유: approve_user를 normal로 잘못 넣는 사고 방지

### 12-3. metadata actor_name 금지 (재확인)
- id 계열만 (before_role / after_role / branch_id). 이름은 표시 시 users JOIN으로 변환.

### 12-4. 운영 피드 조회 기준
- 대시보드 운영 피드 = **최근 50건** 조회 후 severity(critical>high>medium>normal) 정렬
- (대안: 최근 24시간 필터) — 6개월 전 로그는 불필요

### 12-5. Risk Alerts 임계치 (구현자 공통 기준)
| 신호 | 조건 | severity |
|---|---|---|
| 승인 대기 장기 | pending AND created_at 24h 초과 ≥1 | critical |
| 지점 미배정 | status=active AND branch_id IS NULL ≥1 | high |
| 신규 가입 정체 | 최근 24h 신규 0건 | medium |
| 인원 0 지점 | 인원 0명 지점 존재 | medium |

### 12-6. 구현 우선순위 (MVP)
1. 운영 피드 변환 계층 → 2. Task Queue → 3. Risk Alerts → 4. Branch Overview → 5. Service Overview
- 2차 이벤트(댓글 삭제·게시글 숨김 로깅 등)는 지금 하지 않음 — 핵심은 "지금 처리할 일" 가시화
