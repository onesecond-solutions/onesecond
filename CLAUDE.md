# 원세컨드 프로젝트 — Claude Code 컨텍스트

## ⚠️ Supabase DB 작업 규칙 — 사고 재발 방지 (최우선 준수)

> **교훈 (2026-04-24 사고):** "DB가 이상해 보이면 코드를 의심하기 전에 보고 있는 프로젝트부터 의심한다."
>
> **폐기 기록 (2026-04-24):** 2026-04-24 오전 작성된 INSERT SQL 초안(admin row 복원용, 5블록)은 구버전 DB를 본 오판에서 나온 것이며 폐기됨. 미래 세션에서 20260424 날짜의 admin row INSERT 관련 코멘트/파일을 발견하면 실행하지 말고 삭제할 것.

### 진실 원천 — 단 하나

- **신버전(유일 진실 원천):** `pdnwgzneooyygfejrvbg` (프로젝트명: `onesecond-v1-restore-0420`)
- **구버전(폐기):** `qursjteiovcylqiepmlo` — 2026-04-22~23 데이터 소실로 폐기. **절대 참조 금지.**
- 신버전 직접 진입 URL: https://supabase.com/dashboard/project/pdnwgzneooyygfejrvbg

### 매 DB 작업 시작 시 첫 질문 (강제)

DB 관련 작업(코드 작성·SQL 작성·진단 무엇이든) 요청을 받으면 **다른 모든 행동에 앞서** 팀장님께 다음을 먼저 묻는다:

> "Supabase Dashboard 왼쪽 상단 프로젝트 표시가 `onesecond-v1-restore-0420` 맞으신가요?
> 또는 URL의 프로젝트 ID가 `pdnwgzneooyygfejrvbg`로 시작하나요?"

답변 받기 전까지 **어떤 SQL도 작성·실행·제안하지 않는다.** (Supabase Dashboard는 첫 진입 시 구버전이 먼저 열려서 팀장님도 헷갈리는 상태.)

### 로컬 덤프 파일 신뢰 금지

`claude_code/_docs/supabase_dumps/` 하위 CSV 파일들(q2_columns.csv, q5_rls_policies.csv 등)은 **2026-04-20 구버전 스냅샷**이다. 다음 3개 모두 만족 전까지 진단 근거로 사용 금지:

- [ ] 파일에 신버전 ID(`pdnwgzneooyygfejrvbg`)가 명시되어 있다
- [ ] 덤프 생성 일시가 2026-04-23 이후다
- [ ] 팀장님이 "이 덤프는 신버전 기준 맞다"고 확인했다

하나라도 불확실 → 로컬 덤프 무시하고 신버전 Dashboard에서 직접 SELECT 돌려 검증.

### DB 상태 단정 금지 — 검증 SQL 먼저

"public.users가 비어있다", "admin row가 없다" 같은 상태 단정은 신버전에서 직접 SELECT 돌려본 후에만. 추정·기억·과거 덤프 기반 단정은 **금지**.

표준 진단 쿼리:
```sql
-- 신버전 DB임을 한 번 더 확인
SELECT current_database();

-- public.users 전수 확인
SELECT COUNT(*) FROM public.users;
SELECT role, COUNT(*) FROM public.users GROUP BY role ORDER BY 2 DESC;

-- admin 본 계정 정합성
SELECT
  au.id AS auth_id, pu.id AS public_id, pu.auth_user_id,
  pu.email, pu.role, pu.plan, pu.name,
  (au.id = pu.id)            AS id_match,
  (au.id = pu.auth_user_id)  AS auth_user_id_match
FROM auth.users au
LEFT JOIN public.users pu ON pu.email = au.email
WHERE au.email = 'bylts0428@gmail.com';
```

### 사고 신호 발생 시 즉시 정지

다음 신호가 나타나면 모든 작업 중단하고 팀장님께 즉시 보고:
- 로컬 덤프 결과와 Dashboard 결과가 다르다
- "분명히 row가 있어야 하는데 없다" / "없어야 하는데 있다"
- RLS 정책 개수, 컬럼 구성, 테이블 목록이 메모리·CLAUDE.md와 다르다

→ **90% 확률로 구버전을 보고 있는 것.** 즉시 위 "첫 질문"으로 복귀.

---

## 🤝 Claude 3역할 협업 체계

이 프로젝트는 Claude 3개 인스턴스가 역할을 나눠 협업한다.

| 역할 | 인스턴스 | 책임 |
|---|---|---|
| 총괄 기획자 | Claude AI (웹/앱 채팅) | 전략 수립, 작업지시서 MD 작성, 코드 직접 생산 지양 |
| 실행 개발자 | Claude Code (당신) | 실제 코드 생성, Supabase 반영, 파일 수정, Git 커밋 |
| 브라우저 검증자 | Claude in Chrome | 라이브 사이트 테스트, UI 확인, 배포 결과 검증 |

## 📌 Claude Code의 위치 (핵심 인지)

**당신(Claude Code)은 이 프로젝트의 핵심 저장 장치이자 진실 원천 관리자다.**

- Claude AI는 매 세션 컨텍스트가 리셋된다. 메모리는 요약본이라 부정확할 수 있다.
- 진실은 항상 GitHub 저장소에 있다. Claude AI의 기억이 아니다.
- 당신이 git 히스토리를 통해 "지금 진짜 어떤 상태인가"를 알려주는 유일한 인스턴스다.
- /session-end 슬래시 커맨드로 세션 변경사항을 docs/sessions/ 에 자동 누적한다.
- 이 누적된 기록이 다음 세션 Claude AI의 출발점이 된다.

## 🚀 매 세션 시작 시 보고 절차 (필수)

세션이 시작되면 팀장님이 별도 요청하지 않아도 다음 정보를 먼저 보고하라.

### 보고 형식

📊 원세컨드 현재 상태 보고

1. 최신 커밋: {git log -1 --pretty=format:"%h %s (%ar)"}
2. 현재 브랜치: {git branch --show-current}
3. 미커밋 변경: {git status --short — 있으면 목록, 없으면 "깨끗함"}
4. 가장 최근 세션 요약: {ls -t docs/sessions/*.md 2>/dev/null | head -1 의 파일명, 없으면 "없음"}
5. 오늘 작업 시작 준비 완료. 어떤 작업부터 진행할까요?

### 보고 시점

- 팀장님이 첫 메시지를 보내면 응답 시작 직전에 위 보고를 먼저 출력
- 단순 인사("안녕")든 작업 요청이든 무관하게 항상 보고
- 보고 후 팀장님 요청에 대한 답변 진행

## 🛡️ 작업 원칙

### 절대 금지

- 원세컨드 제품 코드(app.html, pages/*.html, js/*.js, css/*.css)를 명시적 지시 없이 수정
- 파일 없이 추측 수정
- 팀장님 확인 전 "완료" / "완벽" 선언
- E영역 외 영역(A, B, C, D) 임의 수정

### 필수

- 계획 먼저 → 승인 후 실행
- 파일 삭제 전 반드시 확인
- 모든 함수는 window.* 로 전역 등록
- CSS는 tokens.css 커스텀 프로퍼티 사용 (도메인 특화 stage 색상 팔레트 제외 하드코딩 금지)
- 모든 컴포넌트 최소 --radius-sm 적용, 직각 모서리 금지

## 👥 role 체계 (총 9개)

| 구분 | role | 현장 호칭 |
|---|---|---|
| 플랫폼 | `admin` | 어드민 (팀장님 본인, 전역 권한) |
| GA | `ga_branch_manager` | 지점장/센터장 |
| GA | `ga_manager` | 실장 |
| GA | `ga_member` | 설계사/팀장 |
| GA | `ga_staff` | 스텝/총무 |
| 원수사 | `insurer_branch_manager` | 원수사 지점장 |
| 원수사 | `insurer_manager` | 원수사 매니저 |
| 원수사 | `insurer_member` | 원수사 일반 직원 |
| 원수사 | `insurer_staff` | 원수사 스텝 |

- **접두어 원칙**: `admin` 무접두어 / GA는 `ga_` / 원수사는 `insurer_`
- **화면설정(`applyMenuSettings`) 무시 대상**: `admin` 만 (나머지 9개 role은 모두 화면설정 적용 대상)
- **무료 혜택 대상**: `admin` + 각 소속의 `branch_manager`·`manager` (매니저 이상 무료 원칙)
- **"지점장" 호칭 혼동 금지**: `admin`/`ga_branch_manager`/`insurer_branch_manager`는 완전히 다른 권한군. 코드·설명에서 뭉뚱그리지 말 것
- **Phase 1 마이그레이션 대기 중**: 기존 `branch_manager`/`manager`/`member`/`staff` → `ga_*` 접두어 UPDATE (팀장님 승인 전 실행 금지)

상세: [`docs/role_system.md`](docs/role_system.md) — 마이그레이션 SQL, RLS 패턴, Phase 2 원수사 입점 계획 포함

## 📂 주요 경로

- 작업 디렉토리: C:\limtaesung\github\onesecond
- 슬래시 커맨드: .claude/commands/
- 세션 요약 아카이브: docs/sessions/
- 디자인 토큰: css/tokens.css
- Supabase 프로젝트 ID (신버전·유일 진실): `pdnwgzneooyygfejrvbg` (프로젝트명: `onesecond-v1-restore-0420`)
- Supabase 프로젝트 ID (구버전·폐기): `qursjteiovcylqiepmlo` — 2026-04-22~23 데이터 소실. **절대 참조 금지**
- 라이브 사이트: https://onesecond.solutions

## 🔄 세션 종료 시

세션이 끝날 때 팀장님이 /session-end 입력 → 변경사항 자동 요약 + GitHub 푸시.
이 흐름이 깨지면 다음 세션 Claude AI가 또 부정확한 상태로 시작하게 된다.
