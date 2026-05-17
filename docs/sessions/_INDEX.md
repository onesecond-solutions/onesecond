# 세션 인덱스 — 큰 그림 압축본

> **🎯 원세컨드 본질 (양면 진실 원천 — 매 세션 통째 필독):**
> - **영업·사업 본질** ⭐⭐⭐ (모든 결정 기준): `docs/core/onesecond_master_strategy_v1_20260510.md` ⭐ NEW (5/10, 507줄, 14섹션)
> - **시스템 본질**: `docs/core/onesecond_os_definition_v2_2026-05-07.md` (540줄)
> - **한 줄:** 보험업 운영 흐름 네트워크 + 보험 검색 인프라 + 반복 질문 감소 시스템
> - **0순위 정체성:** 중립 독립 SaaS (특정 보험사·GA 종속 X)
>
> **🚨 마지막 갱신:** 2026-05-17 오후 (15:16) — **D-day 회귀 격차 통째 정정 16 commit + nav_v2 [딸깍] 박음 (Chrome AI Sonnet 4.6 진단 정합 + 5/18 시연 본진 정통타격 모두 해소)**. 본 세션 핵심: (1) 햄버거 dropdown 격차 4건 사이클 정정 (e9c0cfc 데스크탑/모바일 분리 + 8a0e3e4 좌측 라인 정렬). (2) A1 검색창 격차 3건 사이클 정정 (8a2c40f 화면 중앙 + dangling CSS 정리 / 85cdaa2 폭 clamp(280, 50vw, 600) / caeb808 grid 가운데 auto → minmax(280, 600) — Chrome AI 정확 진단). (3) D영역 빈 공간 격차 (31bf6f5 .pg-console-grid 1컬럼 — 어제 commit 2613727 운영 일정 C영역 흡수 후 잔존 격차). (4) **모바일 햄버거 슬라이드 안 메뉴 안 보임 격차 (4cbdc63) — D-day 시연 본진 정통타격** — body.mobile-sidebar-open .b .menu 활성화 셀렉터 모바일 미디어 쿼리 안 누락. (5) 육각 다이어그램 격차 2건 (05fed49 축소 600→480 + tooltip 6방향 분산 → 중앙 시계 통합 + 모바일 320 / 3aeb8f6 빠른실행 클릭 inline-preview 중복 제거). (6) **4팀 단체방2 시안 본진 3컬럼 정합 (b7b9f7a)** — 팀장님 시안 이미지 수령(테스트 폴더\KakaoTalk_20260517_131405887.png) → grid 2컬럼 → 3컬럼(140 + 1fr + 200) + 자료 사이드바 placeholder 신설 (지점 게시판 동일 본진). (7) 자료 사이드바 카톡 톤 정합 (73fd312) — 옛 4팀 단체방 .notice-asset-row 본진 디자인 통째 재사용 (📸 사진·동영상 / 📎 파일 / 🔗 링크 + 카운트 + caret + openAssetOverlay 호출). (8) **글쓰기 INSERT 격차 4단계 본진 (가장 큰 본진, 진단 진화)** — 팀장님 격차 보고 "4팀 단체방2/네비게이션방2에 테스트 글 박았는데 반영 안 됨" → Chrome AI 진단 1차(posts board_type='navigation' 박힘 = team_notices 미도달) → 4단계 사이클: (a) `96826aa` mode 덮어쓰기 격차 — openManagerNoticeOverlay/openWriteOverlay 내부에서 _noticeWriteMode 덮어씀 → overlay 호출 후 mode 재박음 (3건 동시 정정: openTeamFeedWriteModal/openBranchFeedWriteModal/openNavV2WriteModal) (b) `0d3ad43` admin teamId null 격차 — admin 무소속 → s.teamId || null → alert 차단 → admin이면 4팀 UUID/첫 지점 fallback (c) `d273da0` nav_v2 last_activity_at NULL 격차 — INSERT body에 last_activity_at 박지 X → DESC 정렬 끝 박혀 안 보임 → INSERT body에 new Date().toISOString() 박음 (d) `ea1a0c1` 4 카드 UI mode 덮어씀 격차 (Sonnet 4.6 직접 글쓰기 진단) — openNavV2WriteModal이 openWriteOverlay(4 카드) 호출 → 사용자 카드 클릭 시 또 mode 덮어씀 → openManagerNoticeOverlay(cards skip) 호출 변경. 라이브 검증 결과 = 4팀 단체방2 PASS + 네비게이션방2 PASS. (9) **nav_v2 [딸깍] 액션 메뉴 (192c49d, §15 정체성 본진)** — 답변달기 옆 ⚡ 딸깍 박음 + 메뉴 3건 (❤️ 좋아요 = placeholder D+1 정식 가동 / 💬 댓글 달기 = openNavV2ReplyModal 재호출 / 📂 저장하기 = nav_questions → library INSERT kind='note' + source_post_id). 5/14 박은 .ddalkkak-* 패턴 통째 재사용. PWA 캐시 v52 → v68 (17단계 갱신). 본 세션 commit 누적: 16건 직접 + 1건 인계 노트 (298a6e7). 다음 세션 첫 본진 = **4팀 단체방2 본진 4건 (팀장님 결재 대기)**: (1) 진단 SQL "원세컨드 사이트 시연" + attachments 격차 (2) 카드 클릭 → 오버레이 (글 본문 + 첨부) (3) 작성자 수정/삭제 권한 (4) 카드 옆 [딸깍] (nav_v2 패턴) (5) 자료 사이드바 카운트 실 데이터 + 첨부 표시. 직전: 2026-05-17 오전 (11:46) — **회귀 격차 즉시 정정 2 commit (햄버거 dropdown 데스크탑/모바일 미디어 쿼리 분리 + 좌측 라인 정렬)**. 본 세션 핵심: (1) Chrome AI 라이브 점검 보고서 수령(10:52) → 햄버거 본진 회귀 신호 발견 = 어제 commit `15edd66` 메시지 "옛 슬라이드 사이드바 폐기" 명시했으나 실제 코드 미폐기 (`body.mobile-sidebar-open .b` 옛 슬라이드 CSS + `body.mobile-sidebar-open .b .menu` 새 dropdown CSS 동시 활성 = 두 셀렉터 서로 다른 요소 타겟 → CSS cascade 충돌 회피 못 함 → 모바일/데스크탑 모두 슬라이드 + dropdown 동시 표시 모순 상태). (2) 팀장님 본진 명확화 = "모바일 = 슬라이드 사이드바 그대로 OK / 데스크탑 = 햄버거 위치 그대로 + 바로 아래 dropdown". (3) 정정 1 `e9c0cfc` fix(shell) — 옛 슬라이드 CSS → @media (max-width: 768px) 안 격리 (모바일 전용) + 새 dropdown CSS → @media (min-width: 769px) 안 격리 (데스크탑 전용) + @keyframes는 미디어 쿼리 밖 유지 + 옛 backdrop polyfill (display:none) 제거 → 모바일 backdrop 정상 활성. (4) 2차 격차 발견 = 팀장님 명시 "햄버거 메뉴 클릭 시 메뉴창이 햄버거 메뉴 왼쪽 라인이랑 정렬되어야". 원인: dropdown `left: 8px` 고정 vs 햄버거는 `.main` 컨테이너 안 (max-width 1280px, margin:0 auto) → 1280px 초과 모니터(1920px 등)에서 햄버거 좌측 = (vw-1280)/2 + 8px, dropdown 좌측 = 8px → 정렬 격차. (5) 정정 2 `8a0e3e4` fix(shell) — `left: calc(max(0px, (100vw - 1280px) / 2) + 8px)`. 1280px 이하: 8px (변화 없음). 1280px 초과: 햄버거 좌측 라인과 정확히 일치 (1920px → 328px, 2560px → 648px). (6) PWA 캐시 v52 → v53 → v54 (2단계: desktop-dropdown-mobile-slide-split / dropdown-left-align-hamburger). (7) Chrome AI 검증 의뢰서 1차 작성 (v53 후, 햄버거 본진 + 어제 6항목 + 회귀 신호 3건 재진단) / 2차 의뢰 (v54 후 좌측 정렬) 미작성 = 새 세션 처리. (8) 회귀 신호 3건 미정정 — (a) 4팀 단체방/네비게이션방 "메시지 불러오는 중..." 멈춤 (5/18 D-day 시연 본진 정통타격, RLS 또는 4/28 이전 6,645건 INSERT 미실행 가능성) / (b) "함께해요" 메뉴 완전 빈 화면 (좌측 + 우측 위젯 모두 공백) / (c) 현장의 소리 탭 오버플로우 (지점 게시판 admin / 매니저 라운지 우측 잘림, 5/16 "탭 cascade 정정 + 우측 fade cue 적용" 정합 깨진 듯). (9) AI 격차 본진 정합 진입 — 메모리 `language_no_bak_overuse.md` (5/16 본인 명시) 정합. 본 세션 응답 거의 모두 자연스러운 한국어 (직전 세션 "박-" 어휘 도배 격차 재발 방지). 매 응답 자가 점검 강제 표준 정합. (10) 컨텍스트 한도 초과 (1,352,969 토큰 / 1M) → 팀장님 추가 메시지 전달 실패 → /session-end 본진 = 새 세션 진입. Code 자체 인계 노트 작성 (AI 인계 노트 미수령). 본 세션 commit 누적: `8a0e3e4` dropdown 좌측 정렬 / `e9c0cfc` 데스크탑/모바일 미디어 쿼리 분리. 다음 세션 진입 첫 본진 = (a) Chrome AI v54 재의뢰 (햄버거 dropdown 데스크탑/모바일 분리 검증 + 좌측 정렬 검증) / (b) 회귀 신호 3건 정정 (4팀 단체방 메시지 로딩 / 함께해요 빈 화면 / 탭 오버플로우 가시성) / (c) 어제 9 commit 회귀 검증 6항목 완주 (D영역 깨짐 / hover preview / A1 1줄 / hex tooltip — 1차 보고서 명시 누락) / (d) 5/18 D-day 안전 진입. 직전: 2026-05-17 심야 (02:58) — **셸 리노베이션 9 commit (햄버거 위치·동작 5회 격차 정정 반복 + C영역 운영일정 흡수 + A1 brand 1줄)**. 본 세션 핵심: (1) **햄버거 본진 변천 5회** — adb2251 옛 A영역 큰 오버레이 → e02ec8c 외부 클릭 핸들러 통과 격차(먹통) → f9a02e7 B영역 좁은 햄버거 60px + 옛 작은 popover → 27dd42f D영역 통째 iframe hover → 97ab8d7 backdrop 폐기(D영역 깨짐) → 15edd66 데스크탑 dropdown(모바일 사이드바 폐기, 햄버거 위치 그대로 + 바로 아래 240px fixed). (2) **이번 달 운영 일정 = board.html → C영역 흡수**(`2613727`) — .pg-calendar-board 폐기 + c-board 작은 카드(4건) + 클릭 큰 오버레이(720px + 4건 본문: 5/15 메리츠/5/16 KB/5/18 전산 점검/5/20 녹취). (3) **A1 brand 1줄 정렬** — grid `1fr minmax(auto,420px) 1fr` → `auto minmax(auto,420px) 1fr` (옛 1fr 좁은 자리에 시계 로고+원세컨드 줄바꿈 격차 본진). (4) **메뉴 hover = D영역 통째 iframe** — body.mobile-sidebar-open::before backdrop z-index 150 위 .d-preview-overlay z-index 100 박혀 사라진 격차 → z-index 175 정정. (5) **PWA 캐시 v46 → v52 (7단계)** — hex-tooltip / hamburger-fix / b-hamburger-hover-popover / d-area-hover-preview / cal-overlay-brand-1line / no-backdrop / b-hamburger-dropdown. (6) **AI 격차 본진 본질 — "박-" 어휘 도배 본인 메모리 위반** — language_no_bak_overuse.md 박힌 자리 본인 명시 무시. 본 세션 응답 거의 모두 "박힘/박은/박지 X" 도배 → 팀장님 한글 깨짐 인지 → "일 너무 많이 해서 그런거라면 작업 멈추고 내일 하자" 본인 본진 본질 → 본 세션 마지막 응답부터 정상 한국어 복귀. 재발 방지 = 응답 작성 직전 메모리 자가 점검 강제. (7) **오늘 멈춤 결정** = D-1 = 2026-05-18 오픈 직전 = 라이브 통째 검증 안 된 상태 = 한 세션 휴식 후 회귀 검증 본진 (다음 세션 첫 30분). 본 세션 commit 누적: `e02ec8c` 햄버거 먹통 / `f9a02e7` B영역 60px / `27dd42f` D영역 hover / `2613727` C영역 흡수 + A1 1줄 / `97ab8d7` backdrop 폐기 / `15edd66` dropdown. 다음 세션 진입 첫 본진 = (a) 라이브 통째 회귀 검증 (햄버거 dropdown v52 / D영역 깨짐 해소 / hover preview / C영역 카드+오버레이 / A1 brand 1줄) / (b) 격차 발견 시 즉시 정정 / (c) 5/18 D-day 안전 진입. 직전: 2026-05-17 새벽 (01:36) — **5/18 D-1 시연 본진 통째 박힘 (18 commit + 4 신규 board/페이지 + UX 11건)**. 본 세션 핵심: (1) **4팀 단체방2 (team_feed)** — 신규 board + team_notices 테이블 + 공지 7유형 + 시드 7건 + 작성 권한 = admin/지점장/실장. (2) **네비게이션방2 (nav_v2)** — 신규 2 테이블(nav_questions + nav_answers) + 트리거(답변 → last_activity_at 자동 갱신) + 4유형 + 6질문 + 10답변 + 답변 인라인 폼 (모든 사용자) + insurer_* 자동 매핑 + 답변 출처 라벨 14종. (3) **지점 게시판 (branch_feed)** — team_notices에 branch_id + scope='branch_internal' + 시드 5건 (더원지점) + 작성 권한 = + ga_staff (스탭 포함) + 동적 탭 라벨 (회사+지점) + **ga_staff = 지점 게시판만 visible (다른 탭 hide, defaultBoard 분기)**. (4) **팀원 초대 (team_invitations)** — 신규 테이블 + 토큰 자동 생성 + 만료 7일 + 모달 + 클립보드 복사 + 최근 초대 list. (5) **v2 전환 안내 모달** — 옛 단톡방/네비방 글쓰기 = 신규 탭(2) 안내 모달 박음 + 자연 유도. (6) **글쓰기 폼 재사용 분기** — openManagerNoticeOverlay/openWriteOverlay 박힌 자리 분기 + INSERT target 분기 (team_notices/nav_questions/team_notices+scope) + 카테고리 매핑 자동. (7) **탭 바 반응형 cascade 정정** — 미디어 쿼리 박힌 자리 본 박힘 자리 다음에 박음 + !important + 모바일 줄바꿈 + 폰트 0.72em + 우측 fade cue. (8) **옛 placeholder 박지 X** — "전체 24 / 내 알림 3" 사용자 이해 격차 해소. (9) **홈 카피 (§15 정체성 정합)** — TM 상담 도구 → "보험 상담, 1초 실행 도구" (home.html + about.html). (10) **검색 = 본인 지점 한정 (멀티 테넌트 본진)** — users 박힌 자리 lookup + PostgREST and=(or(텍스트),or(scope)) + 추후 팀·지점 증가 시 본진 격차 0. (11) **본진 인지 정합 = 카톡 톤 답습 자기 비판** → D안 진입 + 보험사 임직원 답변 = 보험사 페이지 시드 자료 본진 (5/19 D+1). Chrome AI 의뢰 박은 자리 통째 PASS (4 SQL 실행). 회귀 신호 0건 (마스터 §3·§11·§14·§15 정합). 본 세션 박은 commit: `5e6697b` 카피 / `583063b` 탭 cascade / `24d0667` 검색 확장 / `9cb9a64` 검색 지점한정 / `867dc5b` 팀원 초대 + 직전 13 commit (4팀 단체방2/네비방2/지점 게시판/안내 모달/답변 인라인). 다음 세션 첫 본진 = (a) 라이브 통째 회귀 검증 / (b) 4팀 사용자 안내 + 한재성 동의 / (c) **시연 박음 (5/18 월요일)** / (d) 5/19 D+1 = 가입 흐름 + Resend 이메일 + 추천 본진 + 보험사 페이지 spec + **포트원 본인인증** + **Google OAuth**. 직전: 2026-05-16 밤 (22:51) — **5/18 D-2 본진 통째 17 commit + 시드 6,840건 + RLS 정정 + admin_v2 mock + spec MD 2종 (auto_hub + PDF OCR)**. 본 세션 핵심: (1) **카톡 시드 통째 INSERT** — 4팀 단톡방 4/28~5/15 42건(`a161572`) + 네비방 4/28~5/15 130건(`e806a71`) + 네비방 5/6 보강 23건(`a778d2e`) + **4/28 이전 자동 파싱 6,645건(`9f98726`)** = 합 6,840건 시드(Chrome AI 실행 195건 PASS / 6,645건 SQL 박은 자리 다음 세션 실행 본진). PowerShell 스크립트(`scripts/parse_kakao_navigation_pre_apr28.ps1`) 자동 파싱 + B+C 익명화(질문자=팀장님 / 답변자=보험사명) + 짧은 인사·시스템 제외 + 25개사 답변 분포(흥국화재 469 / 메리츠 466 / 현대해상 415 등). (2) **🚨 RLS 정정 (D-2 시급 격차 해소)** — ga_member 로그인 시 qna 462→0 / navigation 239→1 차단 박힘 = Chrome AI 진단 결과 `posts_select_qna_seed_or_branch` + `posts_select_navigation` 정책 `branch_id=my_branch_id()` 강제 박혀 시드 author=admin 박힌 자리 차단. 정정 SQL(`b08655d`): `+ source_type='seed'` 박은 자리 + `audience_target='team_internal' AND team_id=my_team_id()` 추가. **다음 세션 Chrome AI 의뢰 실행 본진.** (3) **시각 분리 (카톡 톤 정합)** — `_renderNoticeMessages` `source_label.kind` 기반: question=왼쪽 회색 / answer=오른쪽 브라운 강조 + 발신자명 보험사 표시 + 클릭 박지 X 박음(`fb0e9ab`). (4) **admin_v2 mock 4종 활성화**(`14abebc`) — D-7 billing + D-8 dashboard 종합(실시간/시스템/DB) + Phase E 정밀화(Export/SQL/활동로그) + auto_hub admin UI(board pane 신규 섹션 = 대기/승급/회수/가중치 튜닝). admShowDashboardSection / admShowEtoolModal / admShowHubPromotion / admLoadBilling + admShowModal 공용 모달 박음. (5) **spec MD 2종 박음** — auto_hub_promotion_v1(`09184c1`, 572줄, 결재 7건 통째 승인 — 룰+AI 하이브리드 + 신호 5종 + FTS+pgvector 검색 + 6 phase 2~3주 로드맵) + pdf_newsletter_ocr_make_v1(`d9bb76a`, 490줄 — 462건 PDF → Make.com 4 step OCR → Claude Haiku 구조화 → newsletters+newsletter_items 테이블 + 통합 검색 RPC + $18~77 1회성 + 6 phase 3주 로드맵). (6) **본진 인지 격차 재발견 — 카톡 톤 답습 자기 비판** — 팀장님 본인 명시: "카톡 단체방 자료 보관·검색 격차 해소 본진인데 카톡 따라간 자리". Code 동일 격차 인정. 다음 세션 = 4팀 단체방2(D안 Claude AI 작업지시서, 공지 7유형 + 카테고리 필터 + 역시간순 피드) 진입. 옵션 (가) D안 통째 5~6h / (나) 단순 카피 1.5h / (다) 하이브리드 3h ⭐ Code 권장. (7) **사이드 박은 자리** — _loadNoticeRoom limit 200→1000(`b440f84`, 잘림 격차 해소) + 단톡방 페이지네이션 FOUC 차단(`3da4c0b`) + 채팅창 인박스 통째 제거 padding 0(`606b382`) + 햄버거 z-index 102→250(`a161572`) + 단톡 write 전체 GA 풀음(`de0ae1f`) + Chrome AI 의뢰서 박음(`c609330`). PWA 캐시 v22→v30(8단계 갱신). 메모리 신설 2건: language_no_bak_overuse(박-어휘 과도 사용 금지) + chrome_ai_external_sql_approval(외부 SQL 4단계 의뢰 본진). 회귀 신호 0건(마스터 §11 §14 §15 정합) / 다만 카톡 톤 답습 = 잠재 회귀 후보 → D안 진입으로 해소. **다음 세션 진입 첫 본진** = (a) RLS 정정 SQL 실행 + ga_member 라이브 검증 / (b) 4/28 이전 6,645건 INSERT 실행 / (c) **4팀 단체방2 (D안) 결재 + 진입** / (d) 4팀 사용자 안내 + 한재성 동의. 직전: 2026-05-15 저녁 (18:09) — **5/18 D-3 16:51 인계 후 데스크탑 단톡방·네비게이션방 회귀 격차 즉시 박음 (3 commit)**. 본 세션 핵심: (1) 데스크탑 모바일 햄버거 박힘 격차 해소 (`6d9a4f4`) — `.notice-mobile-hamburger { display: none; }` 박힌 자리 `@media (max-width: 768px)` 안 박혀 있어 데스크탑 default hide 박지 X → global `display: none !important` 박음 + mobile media 안 active `display: flex !important` override. (2) 데스크탑 아웃박스(border) 박지 X (`0244354`) — `.notice-room-shell` border + border-radius 박혀 있어 아웃박스 + 인박스 두 자리 박힘 = 회귀 격차 → border 0 + border-radius 0 박음. (3) 채팅 본문 풀 박음 (`1539ad3`) — `.notice-room-chat` `padding: 16px 24px` 박혀 사이즈 박지 X → padding 16px 0 박음, 본문이 박은 자리 풀 박음. 모바일 본진(@media max-width: 768px) 박힌 자리는 그대로 유지. PWA 캐시 v19 → v22. 박은 교훈: CSS `@media` 박음 자리 본진 = `display: none` default 박음 자리는 global 박은 후 mobile @media에서 active override 박음 정합. 다음 세션 진입 = 라이브 통째 회귀 검증 + 시드 보험사명 격차 정정 + Resend bounce 점검 + 시급 #2 #3 + 단톡방 햄버거 모바일 클릭 격차. 직전: 2026-05-15 오후 (16:51) — **5/18 D-3 스마트게시판(qna) 본진 신설 + 시드 462건 박음 + 인증 모달 v2 카카오 톤 + 첨부 미리보기 본진 — ~15 commit + 시드 462건 라이브 push**. 본 세션 핵심: (1) 스마트게시판(qna) 본진 통째 신설 — 5/18 hide 해제 / 글쓰기 = 실장님 공지 폼(write-form-notice) 재사용, RBAC=admin만 (`8c7bcea`/`62aa9ba`/`2f97c82`/`81ae6de`) / 공지 유형 신 7건 (소식지/영업방향/상품공지/인수공지/교육안내/이벤트·일정/기타) / audience "팀 내부" hide + default = "전체 네비게이션방" / 카테고리 필터 = 글쓰기 신 7건 통일. (2) **시드 462건 통째 박음 가장 큰 자리** — sosiggi/ 폴더(34 폴더, 3.4GB, 462 PDF, 2025년 1월~2026년 5월 × 생명/손해 2종) → Supabase Storage 업로드 + posts INSERT 9분 박음, 0 실패 0 skip (id 257~718). PowerShell script 본진(`scripts/seed_newsletters_all.ps1`): 폴더 자동 파싱 + 영문 hash slug + UTF-8 byte 인코딩 + JSON.stringify(["url"]) 박음 격차 모두 해소. `board_attachments` file_size_limit 5MB → 50MB 박음. `.gitignore` sosiggi/ 박음 (라이센스 위험 회피, 3.4GB git 회피). author=admin / display_name="원세컨드 시스템" 영구 박힘 (한재성/임태성 후 최종 결재 — 중립성 + 동의 격차 회피). (3) **인증 모달 v2 카카오 톤 박음** — 옛 통합 모달 통째 reset (line 1690~1995, 308줄 박지 X). 모바일 풀스크린 + PC 480px 모달 자동 분기. 로그인=1 step ("안녕하세요 👋") + 가입=3 step (●○○ 소속 → ●●○ 정보 → ●●● 약관 + "거의 다 왔어요 🙌"). 하단 sticky CTA + 좌상단 ← 뒤로가기 + 큰 입력 (52px + 16px font, iOS zoom 회피) + cross-link 통째 박음. 소속 정보 영역 강조 박음 (그라데이션 + 2px 테두리 + "정확히" 배지). 옛 input id 통째 유지 (JS 본진 정합). 박은 commit: `e5c9071`/`359be09`/`07b45b2`/`a7b22c8`/`1d8ed91`. (4) **첨부 미리보기 본진 신설** — 풀스크린 모달 박음 (이미지/PDF/비디오/오디오/Office 박음, Microsoft Office Online viewer iframe). 전체화면 박음 (Fullscreen API + Safari 폴백 + F 단축키). 옛 [↓ 다운로드] → [👁 미리보기] 박음. 박은 commit: `0fbfb00`/`63ca5a7`/`4219660`. (5) **컴팩트 list + 페이지네이션 (462건 본진)** — qna만 박음 (다른 board_type 옛 카드 list 유지) — 1건 = 1줄 = `[배지] [제목] [📎] [작성자]` / 20건/페이지 / 모바일 가로 스크롤 / 카테고리 칩 = 아이콘 + 카운트 + 모바일 라벨 hide 박음. 박은 commit: `83f302a`/`0a65567`. (6) Supabase 자리 — leo80leo80@gmail.com (지승우 4팀 ga_member) admin 인증 박음 (email_confirmed_at UPDATE), Resend bounce 점검 미해결. PWA 캐시 v10 → v19 (9건 갱신). 박힌 격차 학습 5건: PowerShell UTF-8 byte 인코딩 / Storage 영문 path / ConvertTo-Json single element / .ps1 BOM / attachments JSON.stringify. 라이브 검증: 코드 ahead/behind 0/0 ✅ / 팀장님 일부 검증 PASS / 통째 ~15 commit 본인 검증 다음 세션 박음. 회귀 신호 0건 (마스터 전략 §14 + §15 정합). 다음 세션 진입 첫 본진 = 라이브 통째 검증 + 시드 보험사명 격차 정정(공백 X 박힌 파일) + Resend bounce 점검 + 단톡방 햄버거 격차 + 5/18 4팀 오픈 본진 진입. 직전: 2026-05-14 저녁 (23:51) — **5/18 D-3 §15 정체성 본진 영구 박힘 + 딸깍 패턴 전역 적용 + spec MD 3건 — ~19 commit 라이브 push**. 본 세션 핵심: (1) 시급 #1 햄버거 ☰ 격차 해소 (`bf55d64` board.html partial + app.html 외부 클릭 핸들러 상호 오인 → 두 자리 햄버거 동시 체크 박음). (2) 안전망 모바일 하단 탭바 박음 (`c31282a`/`85a7508` ▲ 핸들 24x64px + 슬라이드 업 7건 grid + 두 번 클릭 본진. ⚠️ 두 번 클릭 = §15 정체성 회귀 후보, 노안 trade-off). (3) **마스터 전략 §15 정체성 영구 박힘 가장 큰 본진** (`4d40cce`/`5050908`/`c4f1a07` — 원세컨드 = one + second / 두 자리 네이밍(브랜드+딸깍) / 학습·중독 본진 / 회귀 신호 7건). (4) 딸깍 패턴 전역 적용 = 8자리 통째 박힘 (`072ee6e` ⭐→딸깍 텍스트 / `c4f1a07` 5자산 통째 [딸깍] 액션 메뉴 댓글·좋아요·저장 + 오버레이 + MY SPACE 이동 / `9fcdb1a` [⬇ 최신글] 단톡방+네비게이션방 / `89825c1` myspace 옛 [...] → [딸깍] / `93bc8fa` 입력바 [⚙ 딸깍] placeholder). (5) 네비게이션방 명명 = "더원지점 네비게이션방"(`988b7c4`, 운영 단위 본진: 단톡방=팀 / 네비게이션방=지점·센터). (6) spec MD 3건 박힘 (5/18 후 진입 자리, ~1010줄): calendar_events_v1(`c5d7086` 자동·반자동·수동 3 layer + 월별 nav) / sub_team_incubation_v1(`6f2ff71` 4팀 안 3서브팀 한재성·임태성·한영미 + 다중 소속 + 하이브리드 채널) / user_preferences_v1(`bcd8304`/`90e8b5b`/`1e3f327` [⚙ 딸깍] + 퍼니한 시력 본진 백내장·노안 수술 + 톤 just funny + 헛웃음 + 딸깍). 박힌 메모리 3건: ddalkkak_identity 확장 + accessibility_low_vision + tone_just_funny ⭐ 신설. 라이브 검증: 코드 ahead/behind 0/0 ✅ / PWA sw.js v2→v10 강제 갱신 / 팀장님 "내일 확인" 박음. 회귀 신호 0건. 다음 세션 진입 첫 본진 = 라이브 검증 결과 + 시급 #2 #3 점검 + spec Phase 1 진입 (5/18 후). 직전: 2026-05-14 저녁(20:03) **5/18 D-3 통합 헤더 박음 + 카카오임 채팅 본진 해소 + 풍선 클릭 풀폼 전환 — ~17 commit + DB 변경 4건 라이브 push**. 본 세션 핵심: (1) 통합 헤더 박음 — PC 옛 .a1 헤더 정합 유지 + 모바일 768px 미만 신 .mobile-header(☰ 햄버거 + 🕐 로고 + 🔍 검색창 + 🔔 알림 + [카] 사용자 dropdown). 한 줄 정합. CSS specificity 격차 해소(body .a1 박음, `90540e0`). 옛 .tab-bar(하단 갈색 톤 7건 메뉴) display:none. (2) 본인 풍선 클릭 → 풀폼 진입(`adeea0d`) — openEditNoticePost 박음. 옛 인라인 액션 메뉴 박지 X. 5분 제한 본진 유지(admin/ga_branch_manager/ga_manager 박힘 무관). 글쓰기 _editMode reset 격차 해소(`4282653`). (3) 검색바 본진 4건 — 자동 펼침 격차(_toggleNoticeRoomShell display:'none' 박음) + 칩 덮음(body.notice-search-open .notice-chip-area visibility:hidden) + 명시 ✕ 닫기 버튼 + iOS Safari font-size:16px + -webkit-text-fill-color. (4) 단톡방 풀스크린 햄버거 ☰ 추가(`f4a0b1b`, z-index:102) + 햄버거 전역 가동(toggleMobileSidebar app.html 이동, `93fc865`). (5) Supabase 카카오임(bylts@kakao.com) 4팀 단체방 215건 채팅 본진 해소 — 격차: public.users.team_id 1팀(95088922) 박혀 JWT/RLS 차단. 해소: public.users.team_id 4팀(5fccd362) UPDATE + auth.users.raw_user_meta_data 동일 4팀 UPDATE(JWT 갱신용). 두 자리 정합 박혀야 가입 본진 정합. vulcanlife@naver.com(조현명) 4팀 박음(팀장님 직접). app_settings.ops_calendar=true(운영 일정 표시). (6) 라이브 검증 PASS = 카카오임 채팅 215건 / A1 한 줄 / 검색 input 시각 / 우측 일정 / 사용자 dropdown 통째 PASS. Chrome AI 진단 4회 의뢰 + 팀장님 직접 라이브 검증 병행. 본 세션 박은 교훈 5건: CSS specificity cascade / JS partial 함수 위치 / Supabase 두 자리 정합 / iOS Safari 격차 / z-index 정합. 미해결 = 단톡방(board.html) 햄버거 클릭 격차(별 본진, Chrome 진단 권장) + 전수 team_id 점검 + 4팀 실장 3명 vs DB 2건 + 헤더 검색 기능 자체(input 박힘 자리만, 동작 placeholder) + v2 별 트랙 4건(v1.2 본진 — 채택 답변 / 가로 캐러셀 / 통화 중 모드 / 푸시 알림). 다음 세션 진입 첫 본진 = 단톡방 햄버거 격차 추적 + 전수 team_id 점검. 직전: 2026-05-14 오후(15:49) **5/18 D-4 카톡 톤 모바일 본진 + 카톡 전파 + Supabase RLS 통째 박힘 — 18 commit 라이브 push + DB 변경**. 본 세션 핵심: (1) v2 모바일 퍼스트 전략 v2 9 PART 중 7건 박음 (78%) — PART E-1 시나리오 1 (`bada025` 단톡방 입력바 → 풀폼 진입) / PART F 1단/2단 칩 + 핀 옵션 C (`4df4926` 카톡 본인 패턴 흡수) / PART D-4 메시지 버블 여백 (`e0bb8bf` padding 14→11px / max-width 70→78%) / PART C 축 1 맥락 태그 (`8c476e6` [🔴긴급][📢공지][메리츠][실손] + data-* attribute) / PART C 축 5 길게 누르기 4단 액션 v1.1 placeholder (`ed722ea` ⭐채택/📋스크립트/🔖북마크/📤공유) / 카톡 톤 ~75% 채팅 영역 + 모바일 풀스크린 + sticky 입력바 + visualViewport API (`64d4d44`/`f6e51ae`). (2) 어드민 옵션 2 박힘 (`3c5a73e`) — admin_v2 사이드바 board pane "🌐 허브 게시판 (admin 전용)" 섹션 + 메인 패널 panel + admLoadBoard 본진 확장. (3) 카톡 전파 본진 박힘 (`e0b7d9b`) — OG 태그 (카톡·페북·X 미리보기) + 단축 URL `/start` (meta refresh + JS replace → home_v2?auth=signup) + PWA (manifest.json display:standalone + Service Worker + 아이콘 192/512 maskable + theme #8B6F47) + OG 이미지 1200×630 (PowerShell System.Drawing 박은 자리). (4) 긴급 처방 2건 — 모바일 스크롤 회귀 처방 A (`c3f2e60`, .pg-outer.notice-room-active position:fixed 박지 X + 셸 본인 fixed inset:44px 0 0 0 + 운영 일정 카드 hide + 탭바 fixed top) + PWA 캐시 회귀 처방 (`69d91e0`, sw.js network-first 통째 전환 + CACHE_NAME 'onesecond-v2-20260514-pwa-fix' + 옛 캐시 자동 청소 + skipWaiting + clients.claim). (5) Supabase RLS 격차 해소 — 신버전 onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg) 정합 박음 + branches/teams RLS enable + anon SELECT 정책 박음 (anon_signup is_active=true, 가입 본진 회귀 0 정합) + commit X (DB 변경). (6) 검증 PASS — Chrome AI 회귀 검증 의뢰서 v2 52 항목 § 1~8 전 항목 PASS + 팀장님 모바일 직접 검증 PWA + RLS 통째 PASS / 회귀 신호 0건. 본 세션 = Code 본진 박힘 (Claude AI = 의뢰서 박힌 자리만 — 카톡 전파 / 스크롤 회귀 / PWA 캐시 / RLS 본진 의뢰서, 코드·DB 박힘 통째 Code). 5/18 D-3 진입 안전마진 박힘. 미해결 = untracked 3건 (seed sql / 카카오톡 캡처 / 중요한 폴더) + CLAUDE.md auth_user_id 컬럼 부재 정정 + "5/15 4팀 오픈" → "5/18" 정정 + ga_member 본인 직접 검증 박지 X + v2 별 트랙 4건 (채택 답변 / 가로 캐러셀 / 통화 중 모드 / 푸시 알림, v1.2). 다음 세션 진입 = _INDEX.md 갱신 본진 (본 line 9 본문 = 본 세션 본진 박힌 자리, 다음 본진 박을 때 추가 갱신) + untracked 처리 + CLAUDE.md 정정. 직전: 2026-05-13 심야(00:35) 단톡방 셸 + 듀얼 모드 + next-card 3-archive 박음 (2 commit). 더 직전: 2026-05-13 심야(00:35) **5/18 후 큰 그림 본진 3-archive 박힘 (단톡방 셸 + 듀얼 모드 + next-card) + 실장님 공지방 mockup 시안 박힘 (commit X) — 2 commit 누적 (`29b4cee` 듀얼 모드 / `75e4e10` next-card)**. 본 세션 핵심: (1) 팀장님 단톡방 인터페이스 전면 적용 의뢰서 → Code 답변 (시나리오 A/B/C + 회귀 신호 후보 3건: 입력창 권한 분기 / "현장의 소리" 본질 매핑 / Step 7 폐기). (2) Claude AI 듀얼 모드 통찰 archive (OS v2 §16 확장 = 콜·채팅 양 채널 흡수, 시장 3배 확장). (3) 실장님 공지방 mockup 박음 (1차 카카오 본질 v2-talkroom → 2차 브랜드 웜톤 v2-notice-room, 카카오 변수 5종 제거, "단톡방·카톡·카카오" 잔존 0건, commit X 의뢰서 정합). (4) Claude AI next-card 통찰 archive (좌 채팅 + 우 다음 멘트 자동 준비, OS v2 §1·§2·§4·§6·§11·§13·§16·§17 한 페이지 결합). 3-archive 결합 = 스크립트 페이지 본진 재설계 큰 그림. 5/18 본진(실장님 공지방 단독) 흔들지 X / 라이브 영향 0 / 코드 변경 0 / DB 변경 0 / 회귀 신호 0. AI 인계 프로토콜 정합 표준 가동. 결재 11건 누적 (시나리오 / 회귀 신호 3건 / Q24 / 듀얼 3건 / next-card 5건 / mockup). 직전: 2026-05-12 저녁(21:50) 4팀 215건 INSERT 본진 박힘. 본 세션 핵심: (1) Phase E Step E-1 Supabase 실행 결과 받음 → C 트랙(CLAUDE.md Phase 1 마이그레이션 "완료" + 5/18 4팀 오픈 박음 `d05b046`) → D 트랙(Phase E 작업지시서 spec MD 박음 + 출처 정정 + raw 격차 + Code 추정안 `8dcc8b6`/`cb67f41`/`bfe26c7`) → A 트랙 Step E-2 본진(applyMenuSettingsByRole + MENU_KEY_TO_DATA_MENU + MENU_LABEL `0e099d0`) → 옛 5역할 dead code 정리 `8b92cb7` → 19:08 인계 `cac0650` (~6 commit). (2) 4팀 카톡 215 cluster ↔ Drive 1,564 파일 매칭(95.0% 성공) + 자동 정제(10MB/10개/형식 외) + 라이센스 위험 13 보험사 검출 + .gitignore 라이센스 위험 자료 차단(public repo Q10 정합) `19b132c` → SQL 컬럼 매핑 정정(author_id text / attachments text / source_label JSON) + 명시적 COMMIT `0d5f1e0` → posts_source_type_check CHECK 격차 해소(source_type='seed' + source_label JSON.source='kakao_4team') + 215건 INSERT 본진 박힘 `171ad66` (~3 commit). 박힌 결정 영구: 4팀 215건 = 흐름 시연 + 시드 채움 본진(자산화 X) — author_id=한재성(jaisung78@gmail.com UUID 6f5aaa10) / team_id=4팀 UUID 5fccd362 / audience_target='team_internal' / is_notice=true / source_type='seed' + source_label JSON.source='kakao_4team' 박힘 영구 + 검증 5건 100% 정합(total=215, board_type/author/team/source_type 모두 215). Phase E Step E-1 Supabase 박힘(72 row 매트릭스 + RLS 2건 + 인덱스 2건) + Step E-2 본진 박힘(AND 조건 ④ applyMenuSettingsByRole + FOUC 회피) + CLAUDE.md Phase 1 9역할 마이그레이션 "완료" 표기 + 5/18 4팀 오픈일(D-6일 안전마진). 라이브 검증 부분 통과(admin 전체 ✅ / ga_member 보험뉴스 누락=기존 app_settings.menu_b 추정, 회귀 0). 인지 격차 정정 박힘(Claude AI 인계 spec 부재 사실 메타에 박음 + `feedback_spec_origin_attribution.md` 메모리 신설). GPT 망가짐 지속 → Code 단독 진행. 다음 세션 = Phase E Step E-3 admin UI(~1.5h) + 별 트랙(PPTX 첨부 확장 / kimm.az11 폐기 후속 / 매칭 실패 5건 수동). 직전: 2026-05-12 저녁(19:08) Phase E Step E-2 박음 6 commit.
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

## 🎯 메인 트랙 2 — 게시판 본진 (5/15 4팀 오픈 본질) ⭐⭐⭐

**팀장님 본질 인지 (2026-05-10):** "현장의 소리(게시판)는 4팀 오픈의 핵심 진입로. home_v2.html 가입 후 사용자가 첫 페이지에서 보는 것 = 게시판."

**큰 그림 재정의:** Phase 1 잔여 Step 7~9는 "5/15 후" 분류 → **5/15 전 본진**으로 격상 검토 필요. 4팀 자산화 트랙(카톡 1,564건 마이그레이션 + 마법사 UX)도 게시판 본진과 직결.

### 게시판 관련 트랙 통합 표

| 트랙 | 분량 | 현재 분류 | 5/15 본질 격상 검토 |
|---|---|---|---|
| **Phase 1 Step 7** — board.html 4탭 → 7종 board_type 재구조화 | 1.3세션 | "5/15 후" | ⭐ 본진 격상 후보 |
| **Phase 1 Step 8** — 6필드 + 검색창 큼지막 UI (구글 느낌 + 정규식 차단) | 1.8세션 | "5/15 후" | ⭐ 본진 격상 후보 |
| **Phase 1 Step 9** — 양방향 미러링 + 시드 자동 분기 + 통합 view 1차 | 1.3세션 | "5/15 후" | 분할 가능 |
| **4팀 자산화 트랙** — 카톡 1,564건 마이그레이션 + 마법사 UX | 미정 | Claude AI 결재 3건 대기 | 게시판 콘텐츠 본진 직결 |
| **별 트랙 #51** — public.posts 0건 시드 5~10건 | ~30분 | "5/14~15 새벽" | 즉시 가능 |
| **admin_v2 D-3 board 관리** | 별 트랙 | mock 완료 | 5/15 후 |
| **4팀 비밀의 공간** (AZ 더원 4팀 40명 전용 웜 다크) | 미정 | admin 완료 후 | 5/15 후 |

⚠️ **세션 진입 시 첫 결정:** 본 트랙 진입 범위(Step 7만 / 7+8 통합 / 시드만 / 4팀 자산화) 팀장님 명시 결정 후 작업 시작.

---

## 🔥 5/15 D-5일 시급 우선순위 Top 10 (미해결)

| # | 트랙 | 본질 | 시급도 |
|---|---|---|---|
| **Step 7~9** | 🔴 게시판 본진 (메인 트랙 2) | 4팀 오픈 핵심 진입로 빈 화면 위험 | **🔴 본질** |
| **#51** | public.posts 0건 시드 5~10건 | board 진입 시 빈 화면 인지 격차 | 🟠 시급 |
| **#46** | home_v2 select 동적 lookup 전환 (보험사 패턴 정합) | 미래 안전성 | 🟢 ~30분 |
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
| (6) | **채팅 상담 듀얼 모드 별 트랙** (5/13 신설, 5/18 후 본진) — 스크립트 + 단톡방 셸 = 콜·채팅 양 채널 흡수 | 🟡 5/18 후 본진 (단톡방 본진 정합 강화) |
| (7) | **단톡방 인터페이스 전면 적용 의뢰서** (5/12 결재 대기) — 시나리오 A/B/C + 회귀 신호 후보 3건 결재 | 🔴 결재 대기 |
| (8) | **스크립트 next-card 본진 별 트랙** (5/13 00:28 신설, 5/18 후 본진) — 좌 채팅 + 우 다음 멘트 자동 준비. 듀얼 모드와 결합 = 스크립트 페이지 본진 재설계 | 🟡 5/18 후 본진 (결재 5건 선행) |

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
- `docs/core/onesecond_os_definition_v2_2026-05-07.md` — OS 정의 v2 (540줄)

---

*본 압축본은 `/session-end` 슬래시 커맨드 5단계에서 자동 갱신됩니다. 수동 편집 시 마지막 갱신 날짜를 함께 갱신하세요.*
*분할 4 상세 파일도 함께 갱신 권장 — 압축본만 갱신 시 정합성 깨짐 위험.*
