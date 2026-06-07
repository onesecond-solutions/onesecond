---
title: 원세컨드 전수 인벤토리 — onesecond_map_v1
date: 2026-06-07
작성자: Claude Code (코드·세션노트 전수)
대상 DB: pdnwgzneooyygfejrvbg (onesecond-v1-restore-0420, 유일 진실 원천)
용도: 원세컨드를 한 장의 지도로. 권한은 role_access_map.md / 조직은 organization_policy.md 참조
---

# 원세컨드 전수 인벤토리 — onesecond_map_v1

> **목표: 코드 수정 0줄. 원세컨드를 한 장의 지도 위에 올려놓는다.**

> 본 문서는 **사실 기록 전용**이다.
> - 권한·롤 서술 = `role_access_map.md` 참조 (본 문서는 자체 판단 X)
> - 조직 규칙 = `organization_policy.md` 참조
> - "없앨지/합칠지" IA 판단 = `information_architecture.md`(별도) 소관 — 본 문서는 **무엇이 있는가**만
> - 출처: `[코드]`(파일:라인) / `[세션]`(세션노트·_INDEX) / `[추측]`(코드 미확정, 검증 필요)

---

## §1. 사용자 (9롤)

9개 role: `admin` / `ga_branch_manager` / `ga_manager` / `ga_member` / `ga_staff` / `insurer_branch_manager` / `insurer_manager` / `insurer_member` / `insurer_staff`.

**각 롤의 화면·데이터 권한은 [`role_access_map.md`](role_access_map.md) §1·§2 참조.** (본 문서는 권한 서술 안 함)

현재 사용자 분포 `[세션]` (CLAUDE.md): admin 1 / ga_manager 2 / ga_member 5 / insurer_branch_manager 1 / insurer_member 1 = 10명.

---

## §2. 화면·메뉴 전수

### 2-1. SPA 뷰 (app.html, `VALID_VIEWS` `[코드]` app.html:3675)

| view key | 이름 | 진입 경로 | 담당 데이터 / 로더 | 상태 |
|---|---|---|---|---|
| home | 홈 | 사이드바·기본 | `loadHomeRecent()` → library·script_usage·posts·issues | 활성 |
| myspace | MY SPACE | 사이드바 | `mysTab()` (5탭, 아래 2-2) | 활성 |
| scripts | 스크립트 | 사이드바 | `loadScriptsView()` → scripts (10단계 멘트) | 활성 |
| quick | Quick 메뉴 | 사이드바·홈 | `loadQuickV2()` → quick_contents + 고정 도구 (§3) | 활성 |
| voice | 현장의 소리 | 사이드바 | `showTab()` (4탭, 아래 2-3) | 활성 |
| together | 함께해요 | 사이드바 | `loadTogether()` → posts(community) | 활성 |
| news | 보험이슈 | 사이드바 | `fetchNews()` → issues (korea.kr RSS) | 활성 |
| pricing | 요금제 | 사이드바 | `loadPricing()` → fetch `pages/pricing-content.html` | 활성 |
| insurer-vault | 보험사 자료실 | 사이드바(조건부) | `ivTab()` (3탭, 아래 2-4) | 활성 |
| admin | 운영센터(어드민) | 사이드바(조건부) | `acInitAdmin()` → 지연로드 js/admin-console.js | 활성 |
| **team** | (매니저룸) | — | **`showView('team')`→`myspace` 강제 리다이렉트** `[코드]` app.html:3671 | **폐지(2026-06-05 통합)** |

### 2-2. MY SPACE 내부 탭 `[코드]`

| 탭 | 이름 | 로더 | 데이터 |
|---|---|---|---|
| today | 오늘의 할 일 | `renderTodayTodo('myspace')` | 캘린더·단체방·Q&A 집계 |
| saved | 오피스 | `loadMyspace()` | library (본인 자료) |
| team | 단체방 | `loadMysTeam()` | team_notices(team_internal) |
| qna | 보험 Q&A | `loadMysQna()` | posts(qna) |
| members | 팀원관리 | `mrMemSub()` | (구 매니저룸 흡수 — 좌 조직트리/우 팀원, 권한·노출=role_access_map) |

### 2-3. 현장의 소리 내부 4탭 `[코드]`
보험 Q&A(`loadVoiceQna`→posts qna) / 단체방(`loadTeamNotices`→team_notices) / 스마트 게시판(`loadSmartNewsletters`→posts insurer) / 지점 게시판(`loadBranchFeed`→branch_internal).

### 2-4. 보험사 자료실 내부 3탭 `[코드]`
오늘의 할 일(`renderTodayTodo('vault')`) / 보험 Q&A(`loadVaultQna`→posts qna) / 오피스(`ivInit`→posts insurer + 글쓰기).

### 2-5. 헤더 요소 `[코드]` app.html:1450-1470
모바일 메뉴 토글 / 통합 검색(`openSearch`) / 전산 신고(`_goReport`→함께해요) / 알림 벨(`notifBellToggle`) / 계정 드롭다운(프로필·테마·글자크기·로그아웃).

### 2-6. 루트·pages HTML 파일 `[코드]` + `[추측]`

| 파일 | 역할 | 상태 |
|---|---|---|
| app.html | 메인 SPA (11뷰) | 활성 |
| index.html | 로그인/가입 진입 (`?auth=login`/`signup` 분기) | 활성 |
| pages/landing.html | 비로그인 랜딩(5컷) | 활성 |
| pages/pricing-content.html | v-pricing 본문 (fetch) | 활성 |
| pages/admin-console.html + js/admin-console.js | 어드민 UI (지연로드) | 활성 |
| about/pricing/privacy/terms/refund.html | 정적 정책·소개 페이지 | 활성 |
| maintenance.html | 점검 페이지 | 활성 |
| pages/admin.html, admin_v2.html, admin-approvals.html | 레거시 (admin-console로 흡수) | `[추측]` 휴면 → §7 |
| pages/team_chat.html, voice.html | 프로토타입 잔재 | `[추측]` 휴면 → §7 |
| pages/card-design-proto.html, knowledge-search-test.html | 개발·검증용 | `[추측]` 휴면/개발용 → §7 |

> ⚠️ **중복·이중 경로** (§7-B 재집계):
> - `index.html`(로그인 진입) vs `pages/landing.html`(비로그인 5컷) — 진입점 2개. 라이브에서 onesecond.solutions가 무엇을 먼저 서빙하는지 `[추측]` (크롬 확인 필요)
> - 매니저룸(`team` 폐지) → MY SPACE 팀원관리 탭 흡수 — 함수·id는 `mr-*` 명칭 잔존 `[코드]`
> - 단체방 글쓰기 모달이 MY SPACE·매니저룸 양쪽 (`mrWriteModal` 공유) `[코드]`
> - 레거시 admin 3파일·프로토 2파일 (위 표)

---

## §3. Quick 도구 전수 `[코드]`

| # | 도구 | 진입 함수 | 역할 | 라이브러리 | 게이트 플래그 |
|---|---|---|---|---|---|
| 1 | BMI 계산기 | `renderBmiTool()` app.html:4634 | 키·몸무게→BMI 분류 | 순수 JS | **없음** (전체 공개) |
| 2 | 보험연령 계산기 | `renderInsuranceAgeTool()` app.html:4763 | 생년월일→보험연령·변경예정일 | Date API | **없음** |
| 3 | 이미지 변환 | `renderConverterTool()` app.html:4976 | PNG/JPG/PDF→JPG·다이어트 | pdf.js, canvas, html2canvas | **없음** |
| 4 | 녹취·스크립트 변환 | `renderVoiceTool()` app.html:5254 | 음성→스크립트 **(미구현, UI만)** | — | **없음** |
| 5 | 카드 만들기 | `renderMakeCardTool()` app.html:4078 | 텍스트/이미지/PDF→Gemini 추출→satori PNG | html2canvas, pdf.js, quick-card+satori-render | **없음** (app.html 기준) |
| 6 | 보험료 비교표 | `renderCompareTool()` app.html:3877 | 회사별/리모델링 비교표→이미지 (저장 0) | html2canvas | **`CMP_LOCK_PLUS`** (기본 `false`=공개) app.html:3854, 판정 `_cmpLocked()` :3855 |

> 🚨 **게이트 플래그:** Quick 도구 중 잠금 상수는 **`CMP_LOCK_PLUS`(보험료 비교표) 1개뿐**, 기본 off(전체 공개). 나머지 5종은 게이트 없음. UI 설정쪽 `gate_quick_a2`/`gate_search_a2`(admin_v2.js)는 별도 플래그이나 app.html 실제 잠금 연결은 `[추측]` 미확인.

---

## §4. 생산 도구 (콘텐츠 생성) `[코드]`

| 도구 | 진입 | 저장처 | 비고 |
|---|---|---|---|
| 빠른메모 (📝 포스트잇) | 우하단 버튼 → 팝오버 | `library` (INSERT) | 색상=`keywords:['메모색:<key>']` 센티넬 / 임시저장=localStorage |
| MY SPACE 글쓰기 | MY SPACE·자료실 "+글쓰기" | `library` / `scripts` | 이미지·표·캘린더 삽입 도구 = html2canvas 이미지화 주입 |
| 스크립트 작성/편집 | MY SPACE 스크립트 | `scripts` (INSERT/PATCH) | 10단계 칩 + 첨부 |
| 카드 만들기 | §3-5 + 자료실 라이트박스 + MY SPACE 상세 | 다운로드/복사/library | **경로 3종 — 아래 4-1** |
| 자료 업로드 | 글쓰기 첨부 | Supabase Storage + library | 첨부 URL 저장 |

### 4-1. 카드 만들기 경로 (이중·삼중) `[코드]`

| 경로 | 진입 | 파이프라인 | 비고 |
|---|---|---|---|
| A. Quick 도구 | Quick "카드 만들기" | `quick-card`(Gemini 추출) → `satori-render`(PNG) | 표준 (2026-06-07 재설계) |
| B. 자료실 라이트박스 | 이미지 딸깍 메뉴 "카드 만들기" | `gemini-card`(이미지→추출) → 렌더 | `[추측]` satori 연결 여부 미확정 |
| C. MY SPACE 상세 | 자료 상세 "카드 만들기" | 경로 A와 동일(`quick-card`→`satori-render`) | 진입점만 다름 |
| D. BMI/보험연령 결과 | 계산 결과 "카드 만들기" | **미구현** (alert만) | 결재 대기 |

> 🚨 **카드 Edge Function 3종** = `quick-card`(텍스트/이미지 추출) / `gemini-card`(자료 이미지 추출) / `satori-render`(PNG 렌더). 경로 A·C는 satori 단일, 경로 B는 gemini-card → `[추측]`. **카드 경로 통합이 다음 세션 1순위 후보** `[세션]` (딸깍·MY SPACE → satori 하나, gemini-card·.thecard 정리).

---

## §5. 데이터 소스 전수

### 5-1. Supabase 테이블 (RLS 32테이블 실측 `[세션]` health_check) — 용도 1줄

| 테이블 | 용도 | 테이블 | 용도 |
|---|---|---|---|
| posts | 게시판(qna·navigation·insurer·community·hub) | users | 사용자·권한 |
| library | MY SPACE 개인자료·메모 | activity_logs | 활동 로그 |
| team_notices | 팀·지점 공지 | comments | 게시글 답글 |
| insurers | 보험사 마스터 | calendar_events | 일정(권한별) |
| nav_questions / nav_answers | 네비방 질문·답변 | newsletters | 소식지 본문(525건) |
| teams / branches / companies | 조직 마스터 | team_invitations | 팀 초대 |
| scripts | 설계사 스크립트 | notifications | 알림 |
| issues | 보험이슈(korea.kr RSS) | board_reads | 게시판 읽음(크로스기기) |
| push_subscriptions | 웹푸시 구독 | personal_memos | 메모 전용(실사용 `[추측]`) |
| knowledge_entries | 지식엔진 용어(72건 ai_draft) | knowledge_synonyms | 검색 동의어(7행) |
| knowledge_extract_runs / run_items / errors | 채굴 추적 | knowledge_logs | 지식엔진 로그 |
| menu_settings_by_role | 롤별 메뉴 설정 | (payments / subscriptions / insurer_employee_branches 등) | 결제·구독·원수사 매핑 `[추측]` 32 외 추가분 정확 수 미확정 |

> 정확한 테이블 수·정책은 `role_access_map.md` §2 / `health_check_2026-06-03.md` 참조. health_check 기준 **32테이블 RLS ON**.

### 5-2. Edge Function 전수 `[코드]` `supabase/functions/` (9)

| 함수 | 역할 | 배포 |
|---|---|---|
| gemini-card | 자료 이미지→Gemini 카드 추출 | 배포됨 `[세션]` |
| ocr-extract | PDF/이미지→Gemini OCR 전체텍스트 | 배포됨 |
| search-answer | 소식지 본문→AI 검색 답변(출처 강제) | 배포됨 |
| extract-knowledge | 소식지→용어 채굴(v0) | 배포(2026-06-04) |
| quick-card | Quick 입력→카드 데이터 추출 | 재배포(2026-06-07) |
| satori-render | 카드 JSON→서버 PNG(Satori+Resvg) | 재배포(2026-06-07) |
| charge-subscriptions | 구독 월 자동청구(PortOne V2) | 배포됨 |
| send-push | 웹푸시 발송(VAPID) | 배포(2026-06-04) |
| notify (DB 트리거) | pg_net 자동 알림 발송 | 배포됨 (Edge 아닌 트리거) |

### 5-3. 외부 API `[세션]`

| API | 용도 | 상태 |
|---|---|---|
| Gemini | 카드·OCR·검색·채굴 | 유료 전환(2026-06-03), 모델 동적 선택 |
| PortOne V2 | 정기결제(PLUS·PRO) | 운영 |
| Web Push VAPID | 푸시 알림 | 운영(2026-06-04) |
| korea.kr RSS | 보험 정책브리핑 수집 | 운영(매일 7시 KST) |
| Google OAuth | 로그인(PKCE) | 운영 (어드민은 이메일 OTP) |
| Kakao 메시지 | (Phase 2) | 미배포 |
| data.go.kr | 공공데이터 | **보류** |

### 5-4. GitHub Actions `[코드]` `.github/workflows/`
- `issues-daily.yml` — cron(매일 07:00 KST), korea.kr RSS 3곳 → issues 테이블 INSERT (`scripts/issues/fetch-rss.mjs`)
- 그 외 CI/CD `[추측]` 미확인 (워크플로 파일 추가 여부 확인 필요)

### 5-5. 적재 현황 `[세션]`
newsletters 525건 / posts qna 462(대부분 소식지) / posts navigation 6,889 / knowledge_entries 72(ai_draft) / knowledge_synonyms 7 / scripts ~60 / issues 자동증식.

---

## §6. 검색 — 닿는 / 안 닿는 소스

### 6-1. 통합검색이 닿는 소스 `[코드]` (`doSearch`/`_runSearch` app.html ~7029)
보험Q&A(posts qna) / 소식지(newsletters) / 현장의소리(team_notices) / 스크립트(scripts) / 캘린더(calendar_events) / 네비게이션방(posts navigation 6,889) / 메뉴·Quick 도구(OS_NAV_INDEX 정적). + **AI검색**(search-answer = 소식지 본문 한정).

### 6-2. 검색에 안 닿는 소스 `[세션]`

| 소스 | 안 닿는 이유 | 부활 조건 |
|---|---|---|
| knowledge_entries 72건 | status=ai_draft, 검색 미연결 | 검수·publish → 검색 쿼리 추가 |
| 용어 초안 293건 | DB 미적재(파일 보관) | 검수 후 적재 SQL |
| knowledge_synonyms 7행 | 지식엔진 검색에만, 통합검색 미연결 | 별도 결재 후 통합검색 합류 |
| newsletters | 통합검색·AI검색엔 있으나 **지식엔진 검색(knowledge_entries) 미합류** | 로드맵 2~3단계 pgvector+RAG 통합 `[세션]` |

> 🚨 **검색 합류 미완료** = 지식엔진(knowledge_entries)과 통합검색이 별도 트랙. 통합은 로드맵 2~3단계(pg_trgm→pgvector 시맨틱) 대상.

---

## §7. 휴면·잠든 자산 (★ 본 문서 핵심 — 소식지 OCR 전례 재발 방지)

### 7-A. 휴면 자산 목록 `[세션]` + `[코드]`

| # | 자산 | 위치 | 왜 휴면 | 부활 조건 |
|---|---|---|---|---|
| 1 | 소식지 OCR 미적재분 | `work folder/pdf_newsletter/` | 525건 중 일부만 적재(분할 적재 미완) `[세션]` | 잔여 분할 SQL 실행 |
| 2 | knowledge_entries 72건 | DB | ai_draft, 검증·UI 연결 전 | 눈검수→publish→검색 연결 |
| 3 | 용어 채굴물 293건 | `docs/data/terms_draft/` | 검수(276) 완료, 적재 대기 | 하오류30 수정+하확인불가73 웹검증+적재 SQL |
| 4 | BMI 12건 적재 SQL | `docs/migrations/2026-06-05_knowledge_entries_bmi12.sql` | placeholder(심사 수치·URL 미확정) | 수치 확정 후 실행 |
| 5 | canon() 회사명 정규화 | search-answer 소스 | 구현됐으나 Edge Function 재배포 안 됨 `[세션]` | 재배포(별도 결재) |
| 6 | gemini-card 경로 | `supabase/functions/gemini-card/` | 카드 satori 통합 진행 중 | 카드 경로 통합 시 정리 |
| 7 | html2canvas 카드(.thecard) | app.html | satori 재설계 후 폴백 잔존 | 카드 경로 통합 |
| 8 | 카톡 마이그레이션 원본 | `work folder/` + posts navigation | navigation 적재됨, 지식 채굴 일부만 활용 | 지식엔진 확장 시 |
| 9 | auto_hub 설계 | `docs/product/auto_hub_v1.md` | 설계만, 미구현 | 지식엔진 사이클 후 |
| 10 | `feat/report-button-header` 브랜치 | origin 미머지 | #425로 기능 반영 후 브랜치 잔존 `[세션]` | 브랜치 삭제 |
| 11 | `_scratch/` | 로컬 | satori 테스트 node_modules, 잠긴 핸들 미삭제 | 로컬 정리 (untracked, 커밋 무관) |
| (+) | 레거시 HTML | pages/admin*.html, team_chat/voice.html | admin-console·SPA로 흡수된 잔재 `[추측]` | IA 문서에서 정리 판단 |

**핵심 지표: 휴면·잠든 자산 11개 카테고리(+레거시 HTML 5파일).**

### 7-B. 중복·이중 경로 (§2-6 재집계)
1. `index.html`(로그인) vs `pages/landing.html`(비로그인 5컷) — 진입점 2개
2. 카드 만들기 3경로 (quick-card / gemini-card / satori-render) → 통합 예정
3. 매니저룸(team 폐지) → MY SPACE 팀원관리 탭 (mr-* 명칭 잔존)
4. 단체방 글쓰기 모달 양쪽 공유(mrWriteModal)
5. 레거시 admin 3파일 / 프로토 2파일

---

## §8. 지도에 안 그려지는 것 (구조 불명 — 후속 확인)

작성 중 사실 확정이 안 된 항목 (`[추측]`/`[미확인]`):
1. **라이브 진입점** — onesecond.solutions가 index.html / landing.html 중 무엇을 먼저 서빙하는지 (크롬 확인)
2. **personal_memos 테이블 실사용** — 메모는 library에 저장되는데 personal_memos의 현 용도 (2026-05-13 생성, 미사용 `[추측]`)
3. **테이블 정확 수** — health_check 32테이블 외 payments/subscriptions/insurer_employee_branches 등 추가분의 정확한 총수
4. **gemini-card → satori 연결** — 자료실 카드 경로 B의 렌더 단계
5. **gate_quick_a2 / gate_search_a2** — admin_v2.js 설정 플래그가 app.html 실제 잠금과 연결되는지
6. **GitHub Actions 추가 워크플로** — issues-daily.yml 외 존재 여부

> 위 항목은 본 인벤토리의 빈칸. 권한·조직은 role_access_map·organization_policy가 담당, IA 정리는 information_architecture(별도)가 담당.

---

**END OF DOCUMENT** — 코드 수정 0줄. 원세컨드를 한 장의 지도에 올려놓음.
