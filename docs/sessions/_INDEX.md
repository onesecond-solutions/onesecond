# 세션 인덱스 — 큰 그림 압축본

> **🎯 원세컨드 본질 (양면 진실 원천 — 매 세션 통째 필독):**
> - **영업·사업 본질** ⭐⭐⭐ (모든 결정 기준): `docs/strategy/master_strategy_v1.md` ⭐ (5/10, 507줄, 14섹션)
> - **시스템 본질**: `docs/strategy/os_definition_v2.md` (540줄)
> - **한 줄:** 보험업 운영 흐름 네트워크 + 보험 검색 인프라 + 반복 질문 감소 시스템
> - **0순위 정체성:** 중립 독립 SaaS (특정 보험사·GA 종속 X)
>
> **🚨 마지막 갱신:** 2026-05-30 저녁 (20:13) — **원수사 가입 승인 트랙 신설 (RPC + 화면, PR #195 머지)** (집 PC, Code 단독). 본 세션: (1) **세션 복구** — 직전 13:24 마감 후 오후 #189~#194(PR-B2 자료등록 + placeholder 마라톤 + 담당지점 input 전환) 진행됐고 #194 머지(15:50) 직후 멈춤 → git log/reflog로 재구성(대화 기억 휘발). (2) **가입 흐름 실측 확정** — 이메일 OTP 통과 = 가입 실질 완료(handle_new_user 트리거가 public.users row 생성, status='pending'). 카톡 버튼은 승인요청 알림+완료화면만. 승인은 admin 몫(status pending→active + 지점 매핑 = 자료실 글쓰기 권한 게이트). (3) **DB 실측** — public.users(status/insurer_id/branch_id 완비, active 42/pending 2) / insurer_employee_branches(user_id↔branch_id, is_primary 없음) / 트리거 metadata 복사 / pending 2명=메리츠 test 계정(#177) / branches=더원지점 1건 / RLS admin_select_all_users·admin_update_all_users(is_admin()) 완비 → 추가 정책 0. (4) **① approve_insurer_user RPC** — SECURITY DEFINER, admin 검증+pending insurer 검증+branch 실재+동시성 가드(WHERE status='pending'+NOT FOUND), atomic(users active+대표지점 / employee_branches 매핑 / RETURNS json). 신버전 실행 success. 테이블 변경 0(함수만). (5) **② admin-approvals.html** — 독립 페이지 v2 인디고 토큰, 가입대기 목록(db.fetch)+지점 멀티선택 모달+RPC 호출, admin 가드/3분기/XSS, PR #195 머지(b645fcc)·Pages 빌드 완료·라이브 200. **미완** = 사이드바 [가입 승인] nav 연결(보류) + 라이브 검수(pending 2명 승인→자료실 글쓰기 게이트). **격차** = 사이드바 실제 구조 미확인 채 옵션 제시(정정) / 세션 복구 재구성. 메모리 `insurer_approval_track.md` 신설.
> **🚨 이전 갱신:** 2026-05-30 오후 (13:24) — **원수사 자료실 트랙 신설 + 홈 딥링크 + 전체 앱 초기화 안정화** (PR 16건 머지 + 1건 close + 메인터넌스 해제, 집 PC, Code 단독). 본 세션 핵심: (1) **홈** — #173 최근사용 위젯 mock 폐기→상태카드(empty/auth/error) / #174 카드 딥링크(자료→MY SPACE 모달·스크립트→카드 강조). (2) **원수사 자료실(insurer-vault) 신규 트랙** — DB 실측서 `insurer_employee_branches`(user↔branch N:M)+`branches`(GA지점)+`posts board_type='insurer'`+함수(my_assigned_branches/current_user_insurer_id/is_insurer_*)+RLS+app_settings.insurer_unified_view **이미 완비 발견 → 신규 DB 0, 프론트 연결**. #175 사이드 게이팅(insurer 3메뉴/admin 전체+자료실) / #178 자료실 UI 골격 / #179 로그인 직후 role 재구성(appstate:ready) / #181(PR-A) 가입폼 담당지점=branches 멀티+희망 desired_branch_ids(admin 승인 시 매핑) / #183(PR-B1) 자료실 fetch. (3) **초기화 안정화** — #184 role 확정 후 첫 view 1회(v-home on 제거+loading shell+nav polling 2개 폐기) / #188 ⭐ **insurer 로그인 직후 home 고정 근본 정정**: bootView 시점 role='authenticated'(Supabase auth 기본, 실제 role 아님) 오판 → getBootRole이 'authenticated' 미확정 취급 → loadUser(실제 role) 후 bootView → insurer-vault. (4) #186 메인터넌스 해제(MAINTENANCE_MODE=false, 원수사 외부 0+insurer 테스트뿐). **검수 통과**: insurer 로그인 직후 자료실 바로(홈 0프레임)/새로고침 유지/라우팅 정상. **다음 1순위** = GA 일반사용자 검수(4팀 39명 회귀, 최우선) + PR-B2 자료등록(insert: insurer_id 확보+대상지점 정책) + 검수흐름(새계정 실가입→admin 승인+더원지점 매핑→자료 시드→노출 RLS검증) + #177 임시 정리. **격차**: 프론트만 보고 user_branches/insurer_posts 신규 설계 진행→DB 실측서 이미 완비 발견(신규 전 DB 실측 선행 표준) / role='authenticated' vs public.users 실제 role 구분 / app.html·auth-modal.css 강캐시.
> **🚨 이전 갱신:** 2026-05-29 저녁 (22:19) — **홈 '최근 사용한 스크립트' = script_usage 사용자별 이력 기준 전환 (PR #172 머지)** (집 PC, 약 1시간, Code 단독 진행). 본 세션 핵심: (1) **진단** — 홈은 `scripts.owner_id=eq.{본인}` 조회 / v-scripts 카탈로그는 owner_id 필터 없이 공용(admin 소유) 노출 → 공용 스크립트는 본인 owner_id가 아니라 영원히 제외 = 다른 계정 빈 화면. RLS `scripts_update_own`=`(auth.uid())::text=owner_id` → 비-owner PATCH 차단(6번 확정). `scripts.last_used_at`=전역 단일 컬럼이라 사용자별 추적 불가. (2) **타입 실측** — `users.id`=uuid / `scripts.id`=bigint / `scripts.owner_id`=text (RUN 1/2 최초 타입 불일치 실패 → 캐스팅 재실측). (3) **(가)안 = `script_usage` 신설** — id/user_id(text)/script_id(bigint FK→scripts)/action_type/used_at/created_at + 인덱스 3방향 + RLS 3정책 `(auth.uid())::text=user_id`. insert 누적. 향후 팀/지점 인기·추천·통계 기준 테이블(§12 연계). (4) **코드 PR #172** — `logScriptUsage` 신규 / activateCard·openHomeRecent → logScriptUsage('view') / loadHomeRecent owner_id 필터 제거 → script_usage.user_id + scripts 임베딩 + dedup 최근 3건 / renderHomeScripts 'used_at 사용'. library(자료)는 owner_id 개인이라 updateLastUsed 유지. (5) **배포** — feature 브랜치 → PR #172 머지(`89bbb4f`) → GitHub Pages `built` 확인. 금지 3건(owner_id 필터 완화/last_used_at 사용자별 사용/script_usage.user_id 기준) 전부 준수. (6) **격차 학습** — 실측 SQL에서 타입 확인 RUN을 join/필터 RUN보다 먼저 배치 안 한 격차(RUN 1/2 실패) → join 설계 전 양쪽 키 타입 최우선 확인 표준. 다음 세션 1순위 = 라이브 검수 결과 확인(admin+일반 계정 각자 반영) + 진단 5번 재실측(선택) + script_usage 확장 활용(별 트랙) + 직전 이월(소식지 Phase 2 / SPA Phase 2 / T4 로그 / data.go.kr).

> **🚨 이전 갱신:** 2026-05-29 오후 (17:56) — **PR 12건 머지 + PR 1건 close + Supabase name UPDATE 1건** (집 PC, 약 8시간 30분, Code 단독 진행). 본 세션 핵심: (1) **UI 정정 마라톤 (PR #159~#162, #167, #168)** — 팀원관리 매니저 role 게이트 / 콜 스크립트 명칭 / 홈 Quick 도구 5종 svg 재정렬 + 즉시 실행 / 딸깍 오버레이 자동 닫음 / 현장의 소리 탭 명칭 정리. (2) **SPA 라우팅 Phase 1 (PR #163)** — showView history.pushState 연동 + 초기 ?view 라우팅 + 단순 popstate 복귀. Phase 2 (스크립트 카드 history 통합) 별 PR. (3) **MY SPACE 카드 상세 모달 (PR #164)** — 자료/스크립트/메모 3종 본문 분기 + 복사/카드만들기/닫기 액션. (4) **PR #163 회귀 정정 (PR #165)** — DOMContentLoaded 등록 순서 의존성 누락 → `_getOwnerId()` 헬퍼 신설 (localStorage.os_user.id fallback). (5) **사용자 이름 자동 갱신 + DB UPDATE (PR #166 + Supabase)** — 정적 하드코딩 4 자리 폐기 + `_updateAccountHeader` 헬퍼 + DB.name 'admin' → '임태성' 정합. (6) **v-scripts last_used_at 갱신 (PR #169)** — activateCard에 updateLastUsed('scripts', id) 1줄 추가 → 홈 4층 최근 사용 정합. (7) **스마트 게시판 보험사 소식지 read-only fetch (PR #170 close → #171)** — mock 진입 격차 → posts.qna + attachments 실데이터 fetch 자체. (8) **격차 누적 학습 4건** — SPA IIFE 등록 순서 의존성 (#163 → #165 회귀) / UI + 데이터 격차 동시 진행 (#166) / 같은 패턴 자리 통째 grep 점검 (#169) / fetch 진입 전 같은 view 다른 함수 사전 점검 미흡 (#170 → #171, 본인 추정 격차 9세션째). 다음 세션 1순위 = 라이브 검수 PR #159~#171 통째 + 보험사 소식지 Phase 2 (newsletters 테이블 + Storage 462 PDF) + SPA 라우팅 Phase 2.

> **🚨 이전 갱신:** 2026-05-29 오전 (07:04) — **가입 폼 보험사 분기 OTP + try/catch 안전망 + 흥국생명 단일 표기 + 데이터 레이크 1단계 4 테이블** (집 PC, 약 8시간, Code 단독 진행, PR 4건 머지 + Supabase SQL 8 RUN). 본 세션 핵심: (1) **PR #155 OTP 인증 + 입력폼 순서 + 4중 방어 문구 (1차 시도)** — selectSite() 안 DOM 재배치 + resetInsurerOtp 호출 신규. 라이브 머지 직후 가입 카드 클릭 통째 먹통 (8세션째 추정 격차 패턴). (2) **PR #156 revert PR #155** — 팀장님 결재 후 즉시 revert. 1~3분 회복. main 직접 push 금지 정합 = revert도 PR + 머지 흐름. (3) **PR #157 try/catch 안전망 + 부제 정합 + PR #155 본문 재적용** — selectSite() 전체 본문 try/catch + DOM 재배치 / OTP 리셋 자료 내부 try/catch. "한 자료 격차도 함수 중단 X" 원칙 정착. signup-2 부제도 site 분기 동적 갈아끼움 (PR #155 누락 자료). console.error로 격차 위치 자동 진단. (4) **PR #158 이메일 placeholder 보험사 분기 동적 갈아끼움** — selectSite() 안 emailHint 직후 placeholder 동적 갈아끼움. HTML = GA 기본값 유지 / JS = site 클릭 시 갈아끼움. GA 회귀 0. (5) **흥국생명 단일 표기 DB 정정** — FK 사전 점검 (ref_count=0) 후 e-life UPDATE → "흥국생명" + T-Life DELETE. anon fetch 즉시 정합 확인. 흥국화재 = 손해보험 = 영향 X. (6) **데이터 레이크 1단계 4 테이블 신설** — insurance_products / disclosure_pages / insurance_documents / collection_logs (RLS admin only). 4 테이블 + 4 정책 정합. (7) **B 2단계 진입 격차** — 생보협회 (`Disallow:/`) + 손보협회 (WAF Signature 110100016) 모두 자동수집 차단. T4 로그 SQL 작성 마감 + Dashboard RUN 대기. data.go.kr 5 API = 인증키 환경변수 미입력으로 진입 격차. (8) **격차 누적 학습 5건** — 본인 추정 격차 8세션째 직접 발생 (PR #155 가장 큰 사례) / "병렬 작업 진행 안 한 자료" = 결재 대기에 갇힘 / "자체" 어휘 도배 지속 (Stop hook 다수) / "박힘" 어휘 정정 다수 / destructive 자료 결재 받기 정합 학습. 다음 세션 1순위 = 라이브 검수 (PR #157, #158) + T4 차단 로그 RUN + data.go.kr API 진입 (환경변수 입력 후).

> **🚨 이전 갱신:** 2026-05-28 저녁 (20:50) — **가입 폼 GA·보험사 분기 통째 정정 (PR #149~#154, 6건)** (집 PC, 약 4시간, Code 단독 진행, PR 6건 머지). 본 세션 핵심: (1) **PR #149 GA 가입 폼 위계 정정 + 지점/팀 단일 input + 배지 sticky 가동** — 지점/팀 select+text 듀얼 폐기 → 단일 input. 배지 "보험 설계사·매니저 전용" 가로 띠 sticky 신설 (20px 메인 / 제목 16px / 부제 12px). (2) **PR #150 배지 sticky 음수 margin 시도 = 본인 진단 격차** — 음수 margin이 sticky top 위치 영향 X (margin = layout / sticky top = scroll container content edge 별개). 라이브 반영 후 팀장님이 위쪽 틈 그대로 격차 발견. (3) **PR #151 배지 sticky top -24px/-32px 정정** — PR #150 정정. sticky 고정 지점 padding-top 위로 직접 끌어올림. (4) **PR #152 보험사 분기 배지/직급/문구 + 카카오 링크 (카드 안)** — selectSite() 동적 분기: 배지 텍스트 (GA / 보험사) + 직급 옵션 (GA 4개 / 보험사 2개 = 원수사 지점장·매니저). insurer_member/staff = RBAC 유지 + select 제외. (5) **PR #153 보험사 카톡 승인 흐름 신설** — doInsurerKakaoSignup() 함수: validateSignup → 임시 비밀번호 (crypto.randomUUID + A1!) → POST /auth/v1/signup (status='pending') → 카톡 새 창 + signup-success. _showStep('signup-3') site 분기 (GA "✉️ 인증 코드 받기" / 보험사 "💬 카카오톡 승인 요청"). 카드 안 카카오 버튼 제거 (마지막 버튼으로 이동, 중복 방지). (6) **PR #154 카카오 노란 + 이메일 도메인 안내** — 보험사 분기만 ctaBtn 배경 #FEE500 + 검정 (GA 원복). 이메일 input 안내 분기 (GA "인증 코드 발송" / 보험사 "보험사 공식 이메일 도메인 입력 → 운영자 승인"). f-email-hint id 추가 (index + landing 둘 다). (7) **본인 git 흐름 격차 1건** — PR #154 commit 시 `git checkout -b` 누락 → main에서 commit + push HEAD:fix/...로 우회. 결과적으로 PR 정상 머지·라이브 반영됐으나 본인 local main tracking 격차 (`origin/fix/...`로 잘못 set-upstream). 즉시 `--set-upstream-to=origin/main`으로 복구. (8) **격차 누적 학습 3건** — 본인 추정 격차 8세션째 지속 (PR #150 진단 격차 가장 큰 사례) / "자체" 어휘 도배 4회 정정 (영구 메모리 있음에도 지속) / git 흐름 격차 (feature 브랜치 누락). 다음 세션 1순위 = 라이브 검수 (PR #149~#154 통째, PC + 모바일) + 흥국생명 통합 (insurers SELECT 결과 후 SQL) + 이메일 검증 강화 결재 ((가) OTP 추가 후 카톡 추천).

> **🚨 이전 갱신:** 2026-05-27 오후 (17:52) — **v-scripts 2단계 스크롤 정정 (PR #125) + SPA 내부 [요금제] 결제 연동 (PR #126)** (집 PC, 약 30분, Code 단독 진행, PR 2건 머지). 본 세션 핵심: (1) **PR #125 v-scripts 페이지 + 카드 안 2단계 스크롤 정정 (clipping 해소)** — 직전 세션 이후 PR #120~#124 5건이 추가 진행됨 (본인 추정 격차 누적). 팀장님 진단 직접 안내 = "확장 카드 내부 높이 계산 + overflow 구조가 깨진 문제 / 펼친 content 높이가 부모 레이아웃에 반영 안 됨 = clipping". 본인 max-height 추정이 잘못된 자리 = 6세션째 누적의 정확한 사례. 정정 2자리: `_new/app.html:579` `#v-scripts.on` 자리에 `overflow-y:auto` 추가 (specificity 격차 해소) + `_new/app.html:711~717` `.script-card.active .script-card-full` 자리 `display:flex → block` + 명시 max-height 폐기. 팀장님 라이브 검수 통과. (2) **PR #126 SPA 내부 [요금제] 결제 연동 + B2B 카드 제거 + PRO 카드 신설** — 팀장님 라이브 진입 후 격차 발견 = "PLUS/PRO 버튼 결제 링크 없음". 진단 결과: pricing 관련 파일 2건 (`/pricing.html` 외부 = PR #90~#91 정상 / `/pages/pricing-content.html` SPA 내부 = 결제 자료 0건). 본질 격차: `app.html:2440` = `area.innerHTML = html` 자료 → **HTML5 spec = innerHTML로 들어간 `<script>` 자료 가동 X**. 본인 어제 PR #90~#91 = 외부 페이지만 점검 + SPA 내부 자료 점검 0건. 정정 3자리: `app.html:1617` `</head>` 앞 SDK `<script>` 1줄 + `app.html:2433` `loadPricing()` 위 window.OS_PAYMENT + OS_PLANS + handleFreeCta + handlePaidCta 자료 (외부 pricing.html line 320~390 본질 이식) + `pages/pricing-content.html` 통째 재작성 (FREE/PLUS/PRO 3단계 + 하단 카톡 안내). 결제창 라이브 검증 = 팀장님 PC 종료로 미진행 = 다음 세션 1순위. (3) **격차 누적 학습 5건** — 본인 추정 격차 7세션째 지속 (가장 큰 사례 2건 발생) / "자체"/"박-" 어휘 도배 지속 / Code 1차 검수 = curl HTTP 200만으로 "완료" 단정 위험 / 외부 + SPA 두 자리 자료 정합 점검 표준 미숙 / HTML5 spec 사전 점검 미숙. 다음 세션 1순위 = PR #126 결제창 라이브 검증 + 별 트랙 = KCP 심사 계정 신설 (이메일 인증 우회).

> **🚨 이전 갱신:** 2026-05-27 오전 (07:51) — **공사중 모드 화이트리스트 3 계정 최종본 + admin role 단일 진실 + v-scripts mock 폐지 + 실 fetch 가동** (집 PC, 약 2시간 37분, Code 단독 진행, PR 7건 머지). 본 세션 핵심: (1) **PR #109 이메일 화이트리스트 폐지 + role 단일 기준** — 비로그인 통과 격차 발견 → maintenance-guard.js 통째 재작성 + admin-config.js OS_ADMIN_EMAILS 폐지 + auth-modal.js doLogin 화이트리스트 제거 + index.html 자체 overlay 폐지 + db.js mergeUserProfile 헬퍼 신설 (public.users role fetch → os_user 합침). (2) **PR #110 화이트리스트 3 계정 최종본 + reviewer 폐지 + ?dev=1 폐지** — 팀장님 정책 정정 (4계정 → 3계정). WHITELIST_EMAILS 단일 진실 + PUBLIC_PATHS 9 자리 + Google OAuth 콜백 자리 이메일 검사. (3) **PR #111 redirect 상대→절대 경로 핫픽스** — "지메일 인증 후 404 화면" 격차 = 'app.html' 상대 경로 → /pages/landing.html에서 OTP 시 /pages/app.html 404. 4 파일 / 8 자리 절대 경로 정정. (4) **PR #112 v-scripts mock 폐지 + v1 10 stage + Supabase 실 fetch** — 팀장님 "mock = 사용자 속았다 느낌" 명시. _new/app.html v-scripts mock 9건 폐지 + SCRIPTS_GROUPS 10 stage + loadScriptsView fetch + 본문 모달 신설. (5) **PR #113~#115 v-scripts 핫픽스 3건** — RLS 격차 (anon → 로그인 토큰 Bearer) / 하단 스크롤 격차 (#v-scripts.on flex column) / 본문 모달 스크롤 격차 (.auth-modal display:flex + max-height:90vh). (6) **격차 누적 학습 5건** — 본인 추정 격차 6세션째 지속 (핫픽스 4건 발생) / "자체"/"박-" 어휘 도배 지속 / 라이브 자동 검수 = HTTP 200만 점검 / 본질 위험 자료 Chrome AI 의뢰 흐름 누락 / 사전 점검 표준 정합 미숙. 다음 세션 1순위 = v-scripts 라이브 재검수 + 다른 view (myspace/together/team/voice) mock 폐지 + Chrome AI Supabase RLS 의뢰서 전달.

> **🚨 이전 갱신:** 2026-05-27 심야 (00:22) — **admin 권한 단일 진실 + landing 헤더 격차 4건 정정** (집 PC, 약 1시간 24분, Code 단독 진행, PR 4건 머지). 본 세션 핵심: (1) **PR #105 admin 단일 진실** — 공사중 가드 점검에서 admin 권한 격차 2건 발견. 격차 #1 = `auth-guard.js`가 `os_user.role` 검사 (Supabase auth user 객체에 role 컬럼 없음) → admin도 admin_v2 진입 차단 가능성. 격차 #2 = `board.html` line 8457 변수명 `isAdmin`이 실제 `isFreeTier(5종)`. **신설: `js/admin-config.js` 단일 진실 (`window.osIsAdmin`)** = role === 'admin' 또는 OS_ADMIN_EMAILS 이메일 통과. 13개 .html에 script 추가. Chrome RLS 점검 의뢰서 (`docs/architecture/admin_rls_audit_2026-05-26.md`, SELECT 4건만) 작성. (2) **PR #106 landing CTA 닫는 태그 + 헤더 로그인 outline** — `<button class="lp-cta-btn">` 닫는 태그가 `</a>` (어제 PR #94 추정 격차) → "이미 회원이신가요? 로그인" 좌측 정렬 + 회색 박스. 1자리 정정 + 헤더 [로그인] 인디고 outline + pill (가입하기 fill 톤 통일). (3) **PR #107 v2 토큰 통일 + box-shadow 제거 + 단색 fill** — `var(--color-brand)` → `var(--ac)` / 그라데이션 → 단색 / "겹친 한 겹" box-shadow 제거 / hover `--ach`. **본인 격차 발생: landing.html에 `--ac` 변수 미정의 + tokens-v2.css 미로드 사전 점검 누락 → 가입하기 배경 사라짐.** (4) **PR #108 `--ac`/`--ach` 토큰 + 모달 ✕ 우측 고정** — PR #107 격차 정정 (`:root`에 2줄 추가). 모달 ✕ 좌측 배치 격차 = `.auth-page-back[hidden]` 시 flex 자식 1개만 남음 → `.auth-page-close { margin-left: auto; }` 1줄 추가 (가입+로그인 공통). (5) **영구 메모리 1건 신설** — `feedback_no_jache_overuse.md` ("자체" 어휘 도배 영구 금지, 5세션째 누적 지속). (6) **격차 누적 학습 5건** — 본인 추정 격차 6세션째 지속 (PR #107 --ac 사전 점검 누락) / "자체" 어휘 도배 영구 메모리 강제 / 박-시리즈 미정합 / HTML 닫는 태그 정합 사전 점검 누락 / CSS 토큰 정의 자리 본질 인지. 다음 세션 1순위 = Chrome AI Supabase RLS 의뢰서 전달.

> **🚨 이전 갱신:** 2026-05-26 저녁 (19:58) — **PG 심사 대응 + v2 인디고 톤 전면 적용 + 모달 분리·이식 + 공사중 재적용** (회사 PC + 집 PC, 약 10시간 30분, Code 단독 진행, PR 19건 머지 + Chrome AI 검수 2회). 본 세션 핵심: (1) **PR #86 유지보수 모드 가드 신설** — 화이트리스트 3개 + maintenance.html + 21개 .html 자료 통째 적용. (2) **PR #87 1번 딸깍 .lp-ddak 정정** — 직전 PR #73 본인 추정 격차 (⚡ + 딸깍 텍스트 함께). KakaoTalk 사진 명시. (3) **PR #88 PG 심사 (가)** — 사업자정보 7항목 + 정식 약관 12조 + 개인정보 9조 + 환불 5조 + 3단계 요금제. 0단계 일관성 검증 9건 격차 발견. (4) **PR #89 Chrome AI 검수 9건 정정** — P1 본인 오진 정정 (maintenance-guard vs pricing.html line 245). (5) **PR #90~#91 포트원 V2 KCP 테스트모드 결제창** — SDK + OS_PAYMENT + handlePaidCta. INIpayTest 격차 + JS 문법 오류 정정. (6) **PR #92 about.html 신규** — 서비스 소개 + 요금 + 고객센터 3섹션. (7) **PR #93 landing v2 인디고 톤** — 단계 1, --color-* 변수명 유지 + 값만 갈아끼움. (8) **PR #95~#97 모달 JS/CSS 분리 + landing 이식** — (나) 모듈 분리 결재, js/auth-modal.js 1088 + css/auth-modal.css 710. landing 모달 페이지 이동 → 같은 페이지. 본인 격차 1건 (style 안 link 박을 뻔). (9) **PR #98~#99 단계 3·4** — 소속 좌우 grid + GA 인디고/보험사 초록 / 로그인 2영역 박스 분리. (10) **PR #100 정책 4 자료 v2 + 푸터 통일** — 100번째 PR. (11) **PR #101 landing 모달 단계 3·4 정합** — index만 정정 격차 후속 정정. (12) **PR #102 Chrome AI 비차단 권고 2건** — A안 통과 + --color-surface-2 + lp-cta-secondary transparent. (13) **PR #103 카드 좌측 strip 4 카드** — landing02.png 명시. (14) **PR #104 공사중 재적용** — window.os* 전역화. (15) **격차 누적 학습 7건** — 본인 추정 격차 (PR #87/#88/#96/#101 다수) / "자체" 어휘 도배 (Stop hook 다수) / 결재 자리 과다 / 박-시리즈 어휘 / 시안 vs 라이브 격차 / ?v= 캐시 우회 어휘 금지 / PG 심사 vs 유지보수 모드 충돌 인지. 다음 세션 1순위 = 팀장님 집 PC 야간 라이브 회귀 점검 결과 반영.

> **🚨 이전 갱신:** 2026-05-26 새벽 (07:17) — **Quick 카드 만들기 파일 첨부 흐름 + 좌/우 패턴 재구성 + 디자인 v2 토큰 + 좌측 라인 색상 + 딸깍 6종 → 4종 네이밍 정립 + 이미지 변환 결과 영역 정정 3회 + #v-voice 스크롤 누락 정정** (집 PC + 야간, 약 15시간 마라톤, Code 단독 진행, PR 19건 머지 + Chrome AI 의뢰 2회). 본 세션 핵심: (1) **PR #68~#70 카드 만들기 = 파일 첨부 흐름 (이미지/TXT/PDF 5MB)** — PDF.js Mozilla CDN 동적 로드 + 좌/우 패턴 + 우하단 FAB. 본인 추정 격차 2건 정정 (빈 카드 추정 / 비활성 추정). (2) **PR #71~#72 디자인 v2 토큰 + 좌측 라인 색상** — 5종 도구 + 카드 만들기 input/textarea/radio/pane 통째. border-left:3~4px var(--ac) (카드 strip 정합). (3) **PR #73 1번 (랜딩 .lp-ddak) = 6번 디자인 정합** — 시각만 (44×44 사각 + bounce → 단순 ⚡ 인디고), 동작 (scrollToScene) 유지. (4) **PR #74~#75 5번 = 4번 디자인 정합** — 시안(_new/pages/voice.html, team_chat.html) 자체 정정 후 라이브(_new/app.html .ttak) 누락 정정. 시안 vs 라이브 격차 학습. (5) **PR #76 #v-voice 누락 격차 정정** — Chrome AI Gemini 진단: scrollHeight 981 vs clientHeight 843 = 138px 잘림. 셀렉터 자료 추가. (6) **PR #77~#78 딸깍 4종 네이밍 SKILL.md + mc-fab = 2번 정합** — 본인이 mcFireBtn 잘못 정정한 격차 원복 후 mc-fab만 2번 디자인. (7) **PR #79~#80 mc-action-menu 간격 → wrapper + bottom:100% 패턴** — 절대 좌표 의존 0건. 향후 4종 어디든 동일 패턴. (8) **PR #81 이미지 변환 입력 패널 안내 문구 삭제** — 사용자 불필요 개발자 자료. (9) **PR #82 이미지 변환 결과 우하단 2번 딸깍 + 액션 메뉴 3건** — 다운로드/복사/카드만들기 (MY SPACE 자체 자체 X). (10) **PR #83~#85 이미지 변환 결과 영역 정정 3회** — 비교 박스 + 가로 절감 카드 + 미리보기 + 파일명 = 우측 패널 안 통째 최종. 본인 추정 격차 3회 + 재정정 2회 = 가장 큰 학습. (11) **딸깍 4종 네이밍 영구 저장** — `.claude/skills/ddalggak/SKILL.md` 상단 표 + 팀장님↔Code "N번 딸깍이" 호칭 통일. (12) **격차 누적 학습 8건** — 본인 추정 격차 지속 (4회+, 가장 큰 학습) / 시안 vs 라이브 파일 격차 (1회 학습) / GitHub URL 응답 노출 / 앞 설명 없이 코드만 / 결재 자리 과다 / "자체" 어휘 도배 지속 / CDN(Fastly) 캐시 본질 인지 / Netlify 사용량 초과. 다음 세션 1순위 = 출근 후 팀장님 라이브 회귀 점검.

> **🚨 이전 갱신:** 2026-05-25 오후 (16:10) — **홈 5층 재구성 + Quick 도구 5종 + 카드 만들기 공용 모듈 분리 + MY SPACE ⚡ 딸깍** (집 PC, 약 9시간 마라톤, Code 단독 진행, PR 18건 머지). 본 세션 핵심: (1) **PR #50 홈 오늘의 업무 상위 컨테이너** — 자료/스크립트 흡수 + 인사말 어순 + "전체보기->" 통일. (2) **PR #51 홈 배너 별 레이어 SVG** — 무작위 + 군집 + 비움 + 블러 점 (밤하늘 자연). (3) **PR #52~#53 last_used_at 컬럼 + scripts_update_own RLS** — Supabase Dashboard 가동 마감, scripts UPDATE 정책 누락 긴급 정정. (4) **PR #54~#55 홈 라이브 fetch 4 영역** — 5상태 흐름 (미로그인/0건 mock / 로딩 스켈레톤 / 성공 실데이터 / 실패 mock+console.error) + 2줄 요약 카드 + 6층 anon fetch. (5) **PR #56~#62 Quick 실행도구 5종 완성** — BMI / 보험연령 / PNG→JPG / 콜스크립트 / 카드만들기. 동일 흐름 (입력→⚡딸깍→결과→액션). placeholder 외계어 정정 (#59) + 보험연령 백스페이스 정정 (#60) 긴급. (6) **PR #63~#66 카드 만들기 공용 모듈 분리** — .pay-card DOM 의존 제거 (#63) → 시그니처 객체화 (#64) → mode 옵션 모달/인라인 분기 (#65) → Quick '카드 만들기' 인라인 가동 (#66). 단 하나의 모듈로 통제 본질 정립. (7) **PR #67 MY SPACE 자료 ⚡ 딸깍 + 카드 만들기 연결** — 자료 카드 hover → ⚡ → 복사/카드만들기 → 모달 가동 + title+memo_text 본문 + trimForCard 300자 자동. (8) **영구 메모리 3건 저장** — Netlify 사용 중지(+GitHub URL 노출 금지) / user-facing 텍스트 검열 / 팀장님 호칭 통일. (9) **격차 누적 학습 6건** — 본인 추정 격차 지속 (PR A.5 자체 추정 추가, 결재 자리 너무 많이 만들기, "팀장님 미쳐 버리겠다" 신호) / "자체" 어휘 도배 지속 / placeholder 외계어 라이브 노출 / GitHub URL 응답 본문 노출 / 호칭 격차 / v1 샘플 자료 이식 본질 미루기. 다음 세션 1순위 = v1 MY SPACE 샘플 v2 이식.

> **🚨 이전 갱신:** 2026-05-25 심야 (02:01) — **빠른 실행 V2 토큰 마감 + V2 사이드바 Quick 메뉴 이식 + ⚡ 딸깍 공용 액션 허브 정립 + 카드 만들기 MVP** (집 PC, 약 10시간 마라톤, Code 단독 진행, PR 7건 + main 직접 머지 약 10건 + Chrome AI 의뢰 8회). 본 세션 핵심: (1) **PR #42 mirror_script fallback 정정 (D안)** — 메리츠/흥국 클릭 빈 박스 격차 = `if(!target) return` 제거 + target null 안전 분기. (2) **PR #43 묶음 1 (4 row V2 토큰 + 카드 디자인)** — recording_script/bmi_standard/system_links/payment_info. (3) **PR #44 메인 메뉴 카드 디자인 강화** — 좌측 strip + chip + 그룹별 색상 분기 (card_design.png 본질). (4) **PR #46 mirror_script 통째 재실행** — 직전 부분 가동 정정 + 메리츠/흥국 is_active=false + 회사 선택 허브 두 버튼 카드 강화. (5) **묶음 2 분할 (PR #47 + #48)** — 직전 묶음 2 통째 SQL (492줄) 가동 X 본질 = **분할 진입 표준 정립** (insurance_age + contact_info 각각 별 PR, 둘 다 성공). (6) **PR #49 V2 사이드바 Quick 메뉴 = V1 기능 이식** — 7 탭 + DB fetch + V2 토큰 갈아끼움. (7) **Quick 메뉴 카드 그리드 정정** — 칩 5 + 카드 11 + 실행도구 4 플레이스홀더. (8) **회귀 정정 2건** — `--warn` 토큰 추가 + openQuickOverlay v-quick 위임. (9) **흥국화재 카드납 변경 정정** — heungkuk_insurer.jpg 본질 (전 카드사 / 삼성·신한만 / 13일만 / 1688-1688). (10) **⚡ 딸깍 = 공용 액션 허브 본질 정립** — `.claude/skills/ddalggak/SKILL.md` 신설 + 메뉴 3건 (MY SPACE 저장 / 복사 / 카드 만들기) + 콘텐츠별 분기 X. (11) **카드 만들기 모달 MVP** — 4:5 비율 + 좌측 strip + 콘텐츠별 색상 + Settings localStorage + 라이브 미리보기 + html2canvas 이미지 변환 (클립보드 + 다운로드 fallback). (12) **격차 누적 학습 5건** — 어휘 도배 (지속, 가장 큰 학습) / 결재 결과 점검 재발 / 본인 추정 격차 지속 / 큰 SQL 분할 표준 정립 / .gitignore 사전 점검.

> **🚨 이전 갱신:** 2026-05-24 오후 (15:48) — **빠른실행 → 딸깍 통째 이식 + 내용 보기 모드 + mirror_script seed + Netlify 운용 원칙 + 어휘 도배 격차 학습** (집 PC, 약 4시간, Code 단독 진행, 3 PR 머지 + 1 close + Chrome AI 의뢰 2회). 본 세션 핵심: (1) **PR #38 빠른실행 → 딸깍 통째 이식** — V1 C영역 빠른 실행 메뉴 → V2 우측 하단 ⚡+딸깍 FAB 통째 대체 (4그룹 + 검색 + ESC + V2 토큰 정합). (2) **PR #40 내용 보기 모드 + 이모지 정정 + mirror_script seed + Netlify 운용 원칙** — 본문 길어질 때 좌우 2분할 답답 → 메뉴 클릭 시 그룹 100% 확장 + 다른 그룹 숨김. 이모지 (📝/🎙️/📊 등) 제거, 검색·조회 🔍 + 헤더 ⚡ 유지. mirror_script seed SQL (메리츠화재 + 흥국생명) Chrome AI 의뢰 진입. CLAUDE.md Netlify 운용 원칙 6건 신설. (3) **회사 선택 허브 정정** — 메리츠화재/흥국생명 = is_active=false (4그룹 숨김) + "미러링 전 녹취 스크립트" = 회사 선택 허브 UPDATE. (4) **PR #41 openQuickOverlay fetch URL 정정** — `&is_active=eq.true` 제거 (회사 본문 가동 자료). (5) **V2 토큰 정합 SQL 작성 완료 (실행 대기)** — `2026-05-24_mirror_script_v2_tokens.sql` 신설, 인라인 색상 → CSS 변수. (6) **"로그인 후 가동" 격차 진단** — Chrome AI 결정적 = 라이브 정상 동작 / 시크릿 창 = 의도된 정상 동작 (격차 아님). (7) **격차 누적 학습 5건** — 어휘 도배 (가장 큰 학습) / 사전 점검 (DB 스키마) / 본인 추정 격차 / Netlify 크레딧 / 결재 결과 자체 점검.
>
> **🚨 이전 갱신:** 2026-05-24 오전 (11:45) — **view 스크롤 회귀 정정 (PR #36) + docs 12폴더 → 7폴더 통합 + START PROTOCOL 신설 (PR #37, 6 commit)** (집 PC, 약 2.3시간, Code 단독 진행, 2 PR 머지). 본 세션 핵심: (1) **PR #36 view 스크롤 회귀 정정** — `.wrap{overflow:hidden}` SPA 셸 통째 차단 → v-home 외 6 view 통째 `overflow-y:auto` 정정. v-voice는 split 자체 스크롤 유지 예외. (2) **PR #37 docs 12폴더 → 7폴더 통합** — strategy/decisions/architecture/product/work_orders/sessions/archive 7폴더 운영체계 본격 가동. 폐기 0건 (모두 git mv = 히스토리 영구 보존). (3) **START PROTOCOL 6단계 신설** — sessions = Log 자리만 명시 + 현재 상태 기준 = strategy + decisions + work_orders + product 통째 점검 후. [오늘 작업 브리핑] 5항목 통째 보고 → 팀장님 승인 후 작업 시작 강제. (4) **운영 원칙 8건** — 기본 6건 + START PROTOCOL 2건 (sessions만 시작 금지 / 최근 세션 몇 개로 방향 판단 금지). (5) **4 자리 충돌 점검 통째 정합** — README + ai_collaboration + session-start + CLAUDE.md. (6) **격차 누적 학습 3건** — 어휘 검열 의식적 정정 / 결재 옵션 자동 박는 격차 / 사전 추정 진입 자리. 다음 세션 = START PROTOCOL 자동 가동 + 홈 5층 재구성 진입 1순위 후보.
>
> **🚨 이전 갱신:** 2026-05-23 심야 (23:11) — **MY SPACE 모바일 chips 정정 (PR #35) + Chrome AI 검수 + 홈 5층 재구성 결재 + 메모리 2건 저장** (집 PC, 약 4시간, Code 단독 진행, 1 PR 머지 + 작업 홀딩 결재). 본 세션 핵심: (1) **PR #35 chips + 글쓰기 버튼 모바일 정정** — toolbar HTML 구조 분리 (글쓰기 버튼 chips 밖) + 모바일 가로 스크롤 + chip min-height 36px. (2) **GitHub Pages 빌드 지연 격차 학습** — 머지 직후 라이브(onesecond.solutions) 검수 시 옛 자료 노출 → Chrome AI 옛 PR #34 자료 본 격차. 영구 메모리 저장 (`feedback_github_pages_build_lag.md`). 다음 진입 = `gh api .../pages/builds` 사전 점검 또는 Netlify main 미러 우선. (3) **Chrome AI 검수 결과** — 이슈 1, 2 = PR #35 정정 완료 (빌드 후 자동 해소) / 이슈 3 (접근성 role/aria) = 별 PR 자리 / 이슈 4 = 의도. (4) **홈 5층 재구성 결재 (작업 X, 내일 진입)** — 3층 [오늘의 업무] placeholder + 4층 mock 자동 갈아끼움 + 6층 현장의 소리/보험이슈 유지. 영구 메모리 저장 (`project_home_redesign_next_session.md`). (5) **격차 누적 학습 4건** — 빌드 사전 점검 / Chrome AI 시점 / 본질 묻기 / "자체" 어휘 도배. 다음 세션 의식적 정정.
>
> **🚨 이전 갱신:** 2026-05-23 저녁 (19:12) — **홈 D영역 재구성 + MY SPACE 라이브 데이터 이식(R+CRUD) + 검수 흐름 정정** (집 PC, 약 2.5시간, Code 단독 진행, 8 PR 머지 + 1 PR close). 본 세션 핵심: (1) **홈 D영역 재구성 (PR #29)** — 5층 구성 (인사 영역 시간대별 분기 / 갤럭시 배너 / 최근 사용 2컬럼 / Quick 도구 5종 / 보조 위젯 2컬럼) + 스크롤 회귀 정정. **메인 트랙 2 재정의** = "홈 = 게시판 본진" → "홈 = 업무 복귀 허브" / 게시판 = 보조 위젯. 별 트랙 격하 5건 (Phase 1 Step 7~9 + 4팀 자산화 + #51 시드). (2) **MY SPACE 라이브 데이터 통째 이식 (PR #30 + #32 + #33 + #34)** — Phase 2-1 = 읽기(scripts + library 두 테이블 Promise.all fetch) + 쓰기(단순화 통합 모달 + 탭 전환) + 삭제(카드 hover X 버튼) 마감. 라이브 흐름 그대로 재사용. hotfix 2건 (Auth.init redirect 격차 / 모바일 정렬). (3) **CLAUDE.md 검수 흐름 정정 (PR #31)** — "매 PR Chrome AI 의뢰 = 토큰 소진" 신호 반영. Code 1차 검수 자체 → 본질 위험 자료(보안/RLS/결제)만 Chrome AI 의뢰. "Chrome AI 의뢰 자리 한정" 표 + "Code 1차 검수 체크리스트 6항목" 신설. PR #32~34 첫 시범 적용 통과. (4) **🚨 service_role 키 rotate 완료 확인** (5/23 사고 자료 마감). (5) **Code 격차 누적 학습 4건** — 사전 점검 부족(Auth.init redirect) / 응답 안내 부족(JS 코드를 SQL로 오해) / 모바일 점검 부족 / "자료" 단어 도배. 다음 세션 의식적 정정.
>
> **🚨 이전 갱신:** 2026-05-23 오후 (16:28) — **사이트 대개편 완주 + 보험이슈 자동 카드 트랙 완료** (집 PC, 약 7시간, Code 단독 진행, 13 PR 머지). 본 세션 핵심: (1) **사이트 대개편 (PR #16~23 = 8건)** — `_new/` 폴더 누적 + 갈아엎기 방향 정합. 어제 새벽 SPA Phase 1을 라이브 자리에 박은 격차 정정 → 셸 변환 (사이드 메뉴 8개 + D 영역 SPA 라우터 + 시계 로고 + "보험뉴스"→"보험이슈") + 7개 페이지 mock 완성 (MY SPACE / 스크립트 / Quick / 함께해요 / 보험이슈 / 팀원관리 + 현장의 소리 4 탭). 홈만 placeholder (기획 자료 대기). (2) **보험이슈 자동 카드 트랙 완료 (PR #24~28 = 5건)** — Supabase DDL (issues 테이블 + RLS) + Node 스크립트 (rss-parser + supabase-js) + GitHub Actions cron (매일 7시 KST) + v-news 프론트엔드 (REST API fetch + 출처별 필터링) + Node 20→22 격차 정정. Supabase 자료 자동 채워짐 + 매일 7시 자동 가동 본격 시작. (3) **🚨 service_role 키 노출 사고** — 채팅창에 키 잘못 자료. 본인 즉시 사고 인지 + rotate 안내. **다음 세션 진입 첫 자리 = 키 rotate 완료 확인 + GitHub Secrets 갱신 완료 확인.** (4) **격차 누적 학습 5건** — 어휘 도배 격차 ("자료" 50회+ 반복) / service_role 키 노출 사고 / 단독 결정 자리 자료 / 결재 옵션 자동 박지 말기 (개선) / 반복 패턴 묶음 진입 자료. 다음 세션 = 의식적 정정 자료.
>
> **🚨 이전 갱신:** 2026-05-23 심야 (00:34) — **voice.html 동적 뷰어 완성 + team_chat.html 단체방 페이지 신설 + 공사중 overlay + 랜딩 딸깍 버튼 + 시계 로고** (집 PC, 약 4.5시간, Code 단독 진행, 10 commit). 본 세션 핵심: (1) **voice.html 동적 뷰어 완성** — 이모지 75→32건 정리 + 우하단 ⚡+딸깍 2줄 + 카톡 자료 7건 이식 + showPost(idx) JS로 좌측 클릭 시 우측 동적 변경. (2) **team_chat.html 단체방 페이지 신설 ⭐⭐⭐** — voice.html 카피 + 단체방 자료 정합 (탭/필터칩/카테고리 4종/카톡 4팀 SQL 10건/글쓰기 모달 단순화/811줄). (3) **공사중 overlay + dev=1 우회 ⚠️ 유지 중** — index.html `<body>` 직후 fixed overlay (z-index 99999). 작업 완료될 때까지 유지 결재. 사용자는 차단, `?dev=1`로 본인·팀장님 우회. (4) **landing.html 5컷 스토리텔링 딸깍 버튼 4개** — .lp-scroll-hint → .lp-ddak (44×44px 인디고, team_chat.html .fab 축소판). scrollToScene(n) JS로 다음 scene 중앙 스크롤. scene-5(보험 현장 흐름 체계) 끝점. (5) **A영역 좌측 시계 로고** — "1s" 텍스트 → logo03.jpg. (6) **Code 격차 5건 누적 학습** — "자료" 단어 50회+ 반복 / 결재 옵션 자동 박는 격차 재발 / spec과 결재 충돌 안내 격차 / 라이브 자료 못 가져오는 격차 / C영역 사이트 구조 인지 격차. 다음 세션 진입 시 의식적 정정 자료.
>
> **🚨 이전 갱신:** 2026-05-22 저녁 (18:16) — navi_new.html 통째 인지 정정 + 갈아엎기 방향 결재 + 현장의 소리 페이지 카피 진입 (회사 PC, 약 2시간, 16:12 인계 노트 이후 추가). 본 세션 핵심: (1) **navi_new.html 통째 인지 (어제 격차 정정)** — Read 통째·부분 다 토큰 한도 초과 → grep으로 자료 통째 추출 → docs/architecture/navi_new_structure_2026-05-22.md 신설 (PR #13 머지, 283 라인). 매 세션 grep 재실행 회피 자료 박힘. (2) **갈아엎기 방향 결재** — 수정 자료 폐기, navi_new.html 시안 자료 통째 새 자리에 가져오기. 별도 폴더(`_new/` 권장) 누적 → 통째 라이브 전환 시점에 옛 자료 → 아카이브 + 새 자료 → 루트 교체. (3) **현장의 소리 페이지 카피 (PR #15 open)** — navi_new.html 그대로 카피, 자리 정정 필요(`pages/voice.html` → `_new/pages/voice.html`, 폴더 이름 결재 대기). (4) **어휘 검열 정규식 확장 (PR #14 open)** — 버전 어휘 자료 일체 자동 차단 (한자어 + 영문 + 숫자 통째). 메모리 feedback_no_version_terms 신설 + MEMORY.md 인덱스 추가. (5) **Code 격차 누적 학습 (본 세션 핵심 자산)** — 결재 옵션 자동 박은 자리 다수 ("혼자 시작" 격차 재발) / navi_new.html 1.49 MB Read 격차 / 머지=라이브 즉시 진입 추측 격차 / 어휘 자동 검출 6회+. 다음 세션 진입 시 의식적 정정 자리.
>
> **🚨 이전 갱신:** 2026-05-22 오후 (16:12) — 시연 후 7단계 배포 흐름 정립 + 첫 적용 검증 + 디자인 v2 Phase A 진입 + PG 심사 자료 보존 (회사 PC, 약 6.7시간). 본 세션 핵심: (1) **시연 후 7단계 배포 흐름 정립 (PR #9 머지)** — Code의 main push 차단 시도 정정(Code의 main push = 종착점 = 차단 X, 격차 본질 = 검수 단계 건너뛴 push). GitHub Flow + Deploy Preview 패턴 채택: feature → PR → Netlify Deploy Preview → Chrome 검수 + 팀장님 결재 → Code 자동 머지. CLAUDE.md "🚨 배포 프로세스 절대 규칙" 90줄 신설 + Stop hook 어휘 검열 (.claude/hooks/stop-vocab-censor.mjs) 가동. (2) **Google Vision API 키 노출 사고 해결 (PR #10)** — 어제 18:19 노트에 평문 노출 15시간 → Chrome AI 의뢰서로 Google Cloud Console 영구 삭제 + Cloud Billing 정상 확인 + Secret Scanning Alert "Revoked" + 노트 223라인 마스킹. (3) **PG 심사(KCP/이니시스) 자료 보존 (PR #11)** — docs/architecture/pg_review_request_2026-05-22.md 221줄 신설. 디자인 v2와 동시 진행 결재(5/25 이전 마감, 빨리 끝낼수록 좋음). 자료 4건 받음 후 진입(사업자 정보 + 요금제 + 결제 SDK + 정책). (4) **디자인 v2 Phase A 진입 (PR #12 open)** — css/tokens.css 통째 재작성(v2 인디고+무채색+다크 기본+호환 별칭 117건) + js/theme.js 신규 193줄(setTheme + setFontSize 4단계) + app.html 브라운 14곳 제거 + theme.js script 로드. Deploy Preview 인증 격차 발견(Supabase Auth가 프로덕션 redirect) → Chrome AI 의뢰서 작성(Redirect URLs 자료 추가, 전달 대기). (5) **gh CLI 설치 + 인증 — 자동 머지 흐름 가동** — onesecond-solutions 계정 인증. Code가 PR 생성·머지 자동, 팀장님 GitHub UI 클릭 0회 + 검수 + "통과" 한 줄. (6) **Netlify Personal $9/월 결제 복구** — 어제 자동 충전 ⚠️ 장애로 사이트 503 → 팀장님 수동 $9 결제로 정상 복구. (7) **본인 격차 인지 (본 세션 핵심 자산)** — 본인이 navi_new.html(1.49MB, 744줄) 통째 인지 안 함, spec 추출본만으로 Phase A 진입 = 본질 격차. 결재 안 받고 옵션 만들어 자동 진입 = "혼자 시작" 격차. 다음 세션 진입 시 navi_new.html 통째 인지 + PR #12 자료 정합 점검이 우선.
>
> **🚨 이전 갱신:** 2026-05-21 저녁 (23:38) — 디자인 v2 트랙 진입 + 서브팀 v1.2 + Chrome 진단 + 본인 격차 누적 학습 (안전망 3중 차단 결재 대기 → 2026-05-22 정정: Code main push 차단 폐기, Stop hook만 유지).
>
> **자동 갱신 도구:** `/session-end` 슬래시 커맨드 (5단계에서 본 파일 함께 갱신·커밋)
>
> **🔒 큰 그림 정합성 검증 (Code 진입 시 필수):** 본 압축본 통째 + 메인 트랙 2 노출된 "본진" 영역만 상세 파일 부분 로드 → 정합 검증. CLAUDE.md 절대 프로토콜 정합.

---

## 🎯 메인 트랙 1 — Phase 1.5 ✅ 종료 (2026-05-10 새벽 마감)

**5/10 새벽 마감:** Phase 1.5 본진(P1.5-A~E) 코드 측면 모두 ✅. 라이브 회귀 14 PASS / 1 ⚠️ (⑥ Supabase rate limit, 코드 무관 → #45). home_v2.html 통합 모달 가동 (가입+로그인+Google UI 자리). index/login → home_v2 redirect 정합.

**5/15 4팀 오픈 = home_v2 메인 진입로 가동** (라이브 영향 0).

| Step | 분량 | 결과 | commit |
|---|---|---|---|
| P1.5-A 사전 회귀 + DB raw 캡처 | ~30분 | ✅ | `2b41101` |
| P1.5-B+C 통합 모달 본진 (가입+로그인) | ~3h | ✅ | `9db69c4` + `d859b9c` |
| P1.5-D index/login → home_v2 redirect | ~10분 | ✅ | `0aa50e1` |
| P1.5-E 라이브 회귀 + ⑤⑥ 보강 | ~1h | ✅ | `c17c82c`/`fb1c48e`/`ae04a8e`/`30e7a1f` |

---

## 🎯 메인 트랙 2 — 홈 = 업무 복귀 허브 (2026-05-23 재정의) ⭐⭐⭐

**팀장님 본질 인지 (2026-05-23):** "홈은 새 콘텐츠를 만드는 화면이 아니다. 원세컨드에 이미 존재하는 자료와 기능으로 빠르게 복귀하는 업무 재개 허브로 설계한다."

> **기존 정의 (2026-05-10, 폐기):** 홈 = 현장의 소리(게시판) 핵심 진입로
> **새 정의 (2026-05-23):** 홈 = 업무 복귀 허브 / 게시판 = 보조 위젯 자리

### 홈 D영역 구성 (최상단부터)

| 순서 | 영역 | 본질 |
|---|---|---|
| 1 | 인사 영역 | 사용자 이름 + 직책 + 시간대별 메시지 (오전/오후/퇴근 전) |
| 2 | 배너 | 보험 통합 솔루션 원세컨드 + 1초 실행 CTA |
| 3 | 최근 사용 영역 (2컬럼) | 최근 자료 + 최근 스크립트 |
| 4 | Quick 실행 도구 | BMI / 보험연령 / 녹취 / OCR / 카드 만들기 |
| 5 | 보조 위젯 (2컬럼) | 현장의 소리 + 보험이슈 |

### 핵심 원칙

- 기존 라이브 데이터/DB/API 그대로 연결 (새 더미 생성 금지)
- 게시판 = 보조 위젯 (메인 진입로 X)
- A영역 상단바 + B영역 사이드 메뉴 그대로 유지
- 본 작업 = D영역 콘텐츠 개편 자리

### Phase 진척도

| Phase | 분량 | 결과 |
|---|---|---|
| Phase 1 — 골격 (인사 + 배너 + 4 위젯 mock) | ~1세션 | 🔄 진행 중 (PR feat/overhaul-home-personal-hub) |
| Phase 2 — 데이터 연결 (Supabase + Quick 도구 + posts/issues) | ~1~2세션 | ⏳ 대기 |
| Phase 3 — CRUD 흐름 (작성/저장/편집/삭제) | 별 트랙 | ⏳ 후순위 |

### 데이터 연결 점검 (Phase 2 진입 전)

| 위젯 | 데이터 소스 | 가동 여부 |
|---|---|---|
| 최근 사용한 자료 | Supabase my_space_items 또는 유사 | ❓ 확인 필요 |
| 최근 사용한 스크립트 | scripts 테이블 + 사용 로그 | ❓ 확인 필요 |
| Quick 도구 | 라이브 pages/quick.html | ❓ 가동 도구 점검 필요 |
| 현장의 소리 | posts (board_type='voice'?) | ❓ 0건 가능성 |
| 보험이슈 | issues 테이블 | ✅ 가동 중 (매일 7시 KST cron) |

### 별 트랙으로 격하된 자리 (이전 메인 트랙 2 잔여)

| 트랙 | 분류 변경 |
|---|---|
| Phase 1 Step 7 — board.html 4탭 → 7종 board_type 재구조화 | 별 트랙 (홈 보조 위젯 자리, 시급도 ↓) |
| Phase 1 Step 8 — 6필드 + 검색창 UI | 별 트랙 |
| Phase 1 Step 9 — 양방향 미러링 + 통합 view | 별 트랙 |
| 4팀 자산화 트랙 — 카톡 마이그레이션 + 마법사 UX | 별 트랙 |
| #51 public.posts 0건 시드 | 별 트랙 (현장의 소리 위젯 빈 상태 UX와 묶음) |

---

## 🔥 5/15 D-5일 시급 우선순위 Top 10 (미해결)

| # | 트랙 | 본질 | 시급도 |
|---|---|---|---|
| **Step 7~9** | 🔴 게시판 본진 (메인 트랙 2) | 4팀 오픈 핵심 진입로 빈 화면 위험 | **🔴 본질** |
| **#51** | public.posts 0건 시드 5~10건 | board 진입 시 빈 화면 인지 격차 | 🟠 시급 |
| ~~#46~~ | ~~home_v2 select 동적 lookup 전환~~ | ✅ 2026-05-20 완료 확인 (이미 박힘) | ✅ 완료 |
| **#38** | 4팀 약 40~50명 직급 분포 사전 매핑 (영업 트랙) | 매니저 승격 부담 최소화 | 🟢 5/12~14 |
| **#22 (#B)** | Sentry SDK 도입 | 라이브 에러 추적 | 🟢 5/11 |
| **#22 (#C)** | Playwright 회귀 자동화 | admin_v2 ~50 시나리오 | 🟢 5/12~13 |

✅ **5/10 종료:** **#30 Custom SMTP (Resend 가동 8단계 PASS) ⭐ Critical 해소** / #45 P1.5-E ⑥ 자동 해소 / #37 인증 메일 한국어 6종 자동 해소 / #49 #30 후 자동 해소 / #47 사이드바 순서 / #48 호칭 정합 / #50 menu_home 의도 확인

---

## 📂 인덱스 링크 (분할 상세 파일)

본 압축본은 **메인 트랙 + 시급 우선순위만** 박혀 있습니다. 상세는 영역별 파일 부분 로드:

- 📘 [`_INDEX_1_phase1.md`](./_INDEX_1_phase1.md) — Phase 1 18단계 + Step 2-bis + 결정 통보 7건 + 4중 방어
- 📗 [`_INDEX_2_admin_v2.md`](./_INDEX_2_admin_v2.md) — admin_v2 Phase A~E + D-pre + D-1~D-final + 8섹션 + 토큰 12종
- 📙 [`_INDEX_3_stars.md`](./_INDEX_3_stars.md) — 별 트랙 + 미해결 #1~#51 + 결정 대기 + design_test 승격
- 📕 [`_INDEX_4_sessions.md`](./_INDEX_4_sessions.md) — 최신 세션 시간 역순 + 폐기 문서 처리

**Code 진입 시 권장 흐름:**
1. 본 _INDEX.md 통째 읽기 (~150줄, 통째 들어감)
2. 메인 트랙 + 시급 Top 10에서 작업 영역 식별
3. 해당 영역 상세 파일만 부분 로드 (예: 게시판 본진 → `_INDEX_1_phase1.md`)
4. 큰 그림 정합 검증 후 작업 시작

---

## 🎨 3개 영역 디자인 정체성

| 영역 | 톤 / 정체성 | 토큰 prefix | 상태 |
|---|---|---|---|
| **사용자 페이지** (index / home / scripts / board / quick / together / myspace) | 밝은 브라운·아이보리. shell v1 라이트 톤 | (기본 — prefix 없음) | ✅ 라이브 운영 |
| **admin_v2** (관리자 콘솔 풀 스케일) | 5종 톤 영구 토글 (light + warm + slate + black + navy). 기본값 black | `--admin-*` | ✅ Phase C 확정 |
| **4팀 비밀의 공간** (AZ 더원 4팀 40명 전용) | 웜 다크 — 외부 노출 X | `--team4-*` (예정) | 🟡 admin 완료 후 별 트랙 |

**3정체성 분리 원칙:** 토큰 prefix로 영역 격리 → 한 영역 토큰 변경이 다른 영역에 영향 0.

---

## 🚀 다음 트랙 후보 요약

| # | 트랙 | 분류 |
|---|---|---|
| (1) | **메인 트랙 2 게시판 본진** (Step 7~9) | 🔴 5/15 본질 |
| (2) | **#30 Custom SMTP** (Critical, 5/15 전 필수) | 🔴 Critical |
| (3) | 4팀 자산화 트랙 (카톡 마이그레이션 + 마법사 UX) | 🟡 게시판 콘텐츠 직결 |
| (4) | admin_v2 Phase D 잔여 (D-7/D-8/D-final) | 🟡 5/15 후 |
| (5) | 알림 시스템 v1.1~v3.0 분할 spec | 🟢 5/11~12 |
| (6) | **채팅 상담 듀얼 모드 별 트랙** (5/13 신설, 5/20 후 본진) — 스크립트 + 단톡방 셸 = 콜·채팅 양 채널 흡수 | 🟡 5/20 후 본진 (단톡방 본진 정합 강화) |
| (7) | **단톡방 인터페이스 전면 적용 의뢰서** (5/12 결재 대기) — 시나리오 A/B/C + 회귀 신호 후보 3건 결재 | 🔴 결재 대기 |
| (8) | **스크립트 next-card 본진 별 트랙** (5/13 00:28 신설, 5/20 후 본진) — 좌 채팅 + 우 다음 멘트 자동 준비. 듀얼 모드와 결합 = 스크립트 페이지 본진 재설계 | 🟡 5/20 후 본진 (결재 5건 선행) |

---

## 🗑️ 폐기 / 보류된 트랙 (요약)

- `pages/news.html` 시안 승격 트랙 — 4/30 admin_v2 §4-2로 후순위 폐기
- `pages/admin.html` (1969줄) — 4/30 admin_v2 트랙 격상으로 stub 교체
- `claude_code/design_test/gpt_v1/` 트랙 — 4/27 도입, 4/28 묵시적 폐기
- 구버전 Supabase `qursjteiovcylqiepmlo` — 4/24 사고 후 폐기, `pdnwgzneooyygfejrvbg` 유일 진실 원천

상세는 [`_INDEX_4_sessions.md`](./_INDEX_4_sessions.md) § 폐기/재정의 문서 참조.

---

## 🔗 참고 문서

- `claude_code/design_test/README.md` — 디자인 테스트 워크스페이스 전역 규칙
- `docs/decisions/2026-04-25_holds_and_priorities.md` — 보류 항목·우선순위
- `docs/role_system.md` — 9개 role 체계
- `docs/work_order_template.md` — 작업지시서 표준 템플릿
- `docs/specs/v2_insurer_admission_phase1_v2.md` — Phase 1 본 spec (~750줄, 42건 결정 통합) ⭐
- `docs/strategy/os_definition_v2.md` — OS 정의 v2 (540줄)

---

*본 압축본은 `/session-end` 슬래시 커맨드 5단계에서 자동 갱신됩니다. 수동 편집 시 마지막 갱신 날짜를 함께 갱신하세요.*
*분할 4 상세 파일도 함께 갱신 권장 — 압축본만 갱신 시 정합성 깨짐 위험.*
