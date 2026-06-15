# 인덱스 상세 4 — 세션 로그 + 진행 중·완료된 별건 트랙 + 폐기/보류

> **상위 인덱스:** [`_INDEX.md`](./_INDEX.md) (압축본 ~150줄)
> **본 파일 범위:** 최신 세션 시간 역순 + 별건 트랙 (4/28~5/3 누적 ~30건) + 폐기/보류된 트랙

---

## 🗓️ 최신 세션 요약 (시간 역순)

- `docs/sessions/2026-06-16_0726.md` — 2026-06-16 오전 (보류함 신설 + OCR 18MB 크기초과 마킹 + 검색 누출 점검 전 소스 RLS 실측=정상 — PR #763~#768 전부 머지·라이브)

- `docs/sessions/2026-05-28_2050.md` — 2026-05-28 저녁 (가입 폼 GA·보험사 분기 통째 정정 — PR #149~#154 6건 머지, 본인 진단 격차 1건 + git 흐름 격차 1건)

- `docs/sessions/2026-05-22_1816.md` — **2026-05-22 저녁 (navi_new.html 통째 인지 정정 + 갈아엎기 방향 결재 + 현장의 소리 페이지 카피 진입)**

- `docs/sessions/2026-05-22_1612.md` — **2026-05-22 오후 (시연 후 7단계 배포 흐름 정립 + 첫 적용 검증 + 디자인 v2 Phase A 진입 + PG 심사 자료 보존)**

- `docs/sessions/2026-05-14_2003.md` — **2026-05-14 저녁 (5/18 D-3 통합 헤더 박음 + 카카오임 채팅 본진 해소 + 풍선 클릭 풀폼 전환 — ~17 commit + DB 변경 4건)** ⭐⭐⭐ 통합 헤더(PC 옛 .a1 + 모바일 신 헤더 분기 — ☰ 햄버거 + 🕐 로고 + 🔍 검색창 + 🔔 알림 + [카] 사용자 dropdown) / 본인 풍선 클릭 → 풀폼 진입(수정+삭제, openEditNoticePost) `adeea0d` / 글쓰기 _editMode reset 격차 `4282653` / 검색바 본진 4건 (자동 펼침 + 칩 덮음 + ✕ 닫기 + iOS Safari) / 단톡방 햄버거 ☰ 추가 `f4a0b1b` / 카카오임(bylts@kakao.com) 4팀 단체방 215건 채팅 본진 해소 — DB 격차: public.users.team_id(1팀→4팀) + auth.users.raw_user_meta_data(JWT 갱신) 두 자리 정합 / vulcanlife@naver.com 4팀 박음(팀장님 직접) / app_settings.ops_calendar=true(운영 일정 표시) / .tab-bar(하단 갈색 톤 7건 메뉴) display:none(햄버거 진입로 통합) / Chrome AI 진단 4회 의뢰 + 라이브 검증 병행. 라이브 검증 = 카카오임 채팅/우측 일정/A1 한 줄/검색 input 시각/사용자 dropdown 모두 PASS. 미해결 = 단톡방(board.html) 햄버거 클릭 박지 X 격차(별 본진, Chrome 진단 권장) + 전수 team_id 점검 + 4팀 실장 3명 vs DB 2건. 본 세션 박은 교훈 5건: (1) CSS specificity cascade 격차 = body .a1 박음 (2) JS 함수 partial 안 박힘 = app.html 전역 박을 자리 (3) Supabase JWT vs RLS = public.users + auth.users 두 자리 정합 (4) iOS Safari font-size:16px + -webkit-text-fill-color 명시 (5) z-index 정합 103>102>101>100. 직전: 2026-05-14 오후(15:49) 5/18 D-4 카톡 톤 모바일 본진 + 카톡 전파 + RLS 통째 박음 (18 commit).
- `docs/sessions/2026-05-14_1549.md` — **2026-05-14 오후 (5/18 D-4 카톡 톤 모바일 본진 + 카톡 전파 + Supabase RLS 통째 박힘 — 18 commit 라이브 push + DB 변경)** ⭐⭐⭐ v2 모바일 퍼스트 전략 9 PART 중 7건 박음 (PART E-1 시나리오 1 / PART F 1단/2단 칩 + 핀 옵션 C / PART D-4 버블 여백 / PART C 축 1 맥락 태그 / PART C 축 5 길게 누르기 v1.1 placeholder / 카톡 톤 ~75% + 풀스크린 + sticky + visualViewport) / 어드민 옵션 2 (admin_v2 허브 게시판 admin 전용 보기 `3c5a73e`) / 카톡 전파 본진 (OG + /start + PWA + 아이콘 192/512 maskable + og-preview 1200×630 `e0b7d9b`) / 긴급 처방 2건 (스크롤 회귀 처방 A `c3f2e60` + PWA 캐시 network-first `69d91e0`) / Supabase RLS 격차 해소 (branches/teams enable + anon_signup 정책, DB 변경 commit X) / Chrome AI 회귀 검증 52 항목 § 1~8 PASS + 팀장님 모바일 직접 검증 PASS. 본 세션 = Code 본진 박힘 (Claude AI = 의뢰서 박힌 자리만, 코드·DB 통째 Code). 5/18 D-3 진입 안전마진 박힘. 다음 진입 = _INDEX.md 갱신 + untracked 3건 처리 + CLAUDE.md auth_user_id/"5/15" 정정.
- `docs/sessions/2026-05-13_0035.md` — **2026-05-13 심야 (단톡방 셸 + 듀얼 모드 + next-card 큰 그림 3-archive 박힘 — 2 commit + 시안 2건 untracked)** ⭐⭐⭐ Code 본진 수행 / 단톡방 의뢰서 답변(5/12 23:30 시나리오 A/B/C + 회귀 신호 후보 3건) / 듀얼 모드 archive `29b4cee` (OS v2 §16 확장 = 콜·채팅 양 채널 흡수) / 실장님 공지방 mockup v2-notice-room (1차 카카오 본질 v2-talkroom → 2차 브랜드 웜톤 + 용어 정합 / 카카오 변수 5종 제거 / "단톡방·카톡·카카오" 잔존 0건 / commit X 의뢰서 정합) / next-card archive `75e4e10` (좌 채팅 + 우 다음 멘트 자동 준비 / OS v2 §1·§2·§4·§6·§11·§13·§16·§17 한 페이지 결합 / §4 회피 결재 필수). 3-archive 결합 = 스크립트 페이지 본진 재설계 큰 그림 박힘. 5/18 본진(실장님 공지방 단독) 흔들지 X / 라이브 영향 0 / 코드 변경 0 / DB 변경 0 / 회귀 신호 0. AI 인계 프로토콜 정합 표준 가동 (archive + 메모리 2건 + _INDEX.md + commit·push). 결재 11건 누적 (시나리오 / 회귀 신호 후보 3건 / Q24 / 듀얼 3건 / next-card 5건 / mockup). 다음 진입 = 단톡방 의뢰서 결재 + 회귀 신호 해소 + mockup 시각 결재 + Phase E Step E-3 부채.
- `docs/sessions/2026-05-12_2150.md` — 2026-05-12 저녁 (4팀 단톡방 → manager_notice 215건 INSERT 본진 박힘 — 4 commit + 1 SQL 폐기)
- `docs/sessions/2026-05-12_1908.md` — 2026-05-12 저녁 (Phase E 본진 진입 + 인지 정정 + 별 트랙 정리 — 6 commit)
- `docs/sessions/2026-05-12_1602.md` — 2026-05-12 오후 (Phase A 본진 박은 큰 날 + Phase E Step E-1 SQL 박음 — 20 commit)
- `docs/sessions/2026-05-12_0050.md` — **2026-05-12 심야 (운영 흐름 OS 4 레이어 박음 + admin 토글 결재 대기 — 총 16 commit)** ⭐⭐⭐ home_v2 카드 흡수 `e6f576d` / home_v2 footer 블랙 SaaS `e813a15` / home-cards 여백 `76ac6a9` / 조직 운영 v1 `64180b8` (사이드바 운영 카테고리 + team-management 4섹션 placeholder + applyOpsMenuByRole) / 알림 v1 Step 1~3 `8bbf7ab`/`7ee78f1`/`e466d7a` (🔔 badge / C영역 카드 3종 / board 집계 바) / 운영 캘린더 v1 `8378ac8` (4 일정, 유형 4종) / 색상 hierarchy v1 `041f61d` / 캘린더 grid 반응형 `36d0b9c` (1→2/3열) / 색상 hierarchy v2 `38fd25e` (::before 70% 세로선 + date accent) / 운영 콘솔 Step A `84376a4` (탭 2줄) / Step B `17d4cf5` (2컬럼 68:32) / 좌우 카드 top 정렬 `f2389b2` / 탭바 top = 캘린더 top `7c51736` / 탭바↔게시판 간격 `07de08e`. 박힌 결정 영구 = "기능 완성 X, 구조 선언 ⭕" / 운영 레이어 4 트랙 (조직·알림·캘린더·콘솔) / 9 role 코드 등장 (admin/ga_*/insurer_staff) / 알림 3단 통합 본질 / 캘린더 월간 X 운영 보드형 / 콘솔 모바일 1열 + order (캘린더 → 탭바 → 게시판). 라이브 검증 부분 미수령. 회귀 0 보장. 5/15 D-3일. 5/18 본진 fix (추가 기능 X / 씨드 데이터 X). 다음 진입 = admin 토글 Step 1 rail 9→4 / Step 2/3 운영 레이어 섹션 + DB + 페이지 분기 / 본 세션 16 commit 라이브 검증.
- `docs/sessions/2026-05-11_2001.md` — **2026-05-11 저녁 (FOUC 안정화 풀 스케일 + 실장님 공지 팝업 본진 — 총 7 commit)** ⭐⭐⭐ 옵션 C `cfc3918` (글로벌 안전망 + D영역 visibility + 사이드바 is-pending) / 옵션 D `6cad232` (board data-ready 통째 + home force-show) / 옵션 E `bf42696` (ready 가드 범위 축소 manager_lounge·hub 2 탭만 + role 동기 판정 분리) / 탭 순서 재정렬 `0b8fff0` (매니저 라운지 2→4번) / 옵션 J `69f7163` (사이드바 visibility 전환 — DB SELECT 검증 menu_home·menu_news=false 박힘) / 옵션 L-2 `741dc67` (Quick transition 제거 + Scripts 정적 10 그룹 탭바 + D영역 헤더 블록 추가) / 실장님 공지 팝업 `04f9169` (manager_notice 모드 분기 — _noticeWriteMode 플래그 + 기존 write-form-notice 재사용 + 권한 정정 ga_branch_manager 추가). 박힌 결정 영구 = "fetch/RBAC 의존 영역만 부분 가드" / visibility + data-ready 패턴 / 운영툴 톤(transition 최소화) / !important 0건 / 옵션 B 모드 분기. 메모리 신설 2건 (`feedback_ui_operations_tool_tone.md` / `feedback_fouc_visibility_pattern.md`). 라이브 검증 PASS = 옵션 C/D/E + 탭 순서 + 옵션 J. 미수령 = 옵션 L-2 + 실장님 공지. 다음 진입 = 옵션 L-2/실장님 공지 검증 / 2차 F-mid (myspace·quick·together·news page-ready 가드) / #56 매니저 라운지 핫픽스 / Sentry #22 #B.
- `docs/sessions/2026-05-11_1810.md` — **2026-05-11 저녁 (별 트랙 #58 v0 ✅ 4종 폼 완성 — 공지/인수/상품/기타)** ⭐⭐⭐ 본 세션 7 commit 박힘 (9d1ce22→33ea243) / 슬롯 5 SQL `9d1ce22` (audience_target ENUM 5종 + responder_hint, 라이브 검증 3건 PASS) / 슬롯 6 공지 폼 `a101dd0` (admin/매니저급, content 흡수 `[공지유형:{}]\n{}`) / 슬롯 7 인수 폼 `b04d156` (정규식 차단 3종 주민/전화/실명 + 노란 경고 박스, 라이브 6 컬럼 활용) / 슬롯 8 상품 폼 `02b97cf` (상품군 11+건강체 3+확인내용 8, 블루 운영 안내 박스 = 교육 오해 방지) / 슬롯 9 기타 폼 `e792c52` (질문유형 9+responder_hint 자유 입력) / _INDEX 갱신 `33ea243`. content prefix 구조 = 향후 search_index/RAG/AI 구조화 기반 영구 박힘. 결재 4건 받음 (content c / insurer_target 영문 키 / file v0 제외 / audience 기본값 team_internal). 라이브 회귀 0 보장. 다음 진입 = #56 매니저 라운지 탭 오버플로우 / Sentry #22 #B / search_index 연동.
- `docs/sessions/2026-05-11_1700.md` — **2026-05-11 오후 (별 트랙 #58 슬롯 5 ✅ 마이그레이션 SQL 박음)** posts.audience_target / responder_hint 컬럼 신설 SQL 박음 (97줄, CHECK ENUM 5종 = team_internal/branch/navigation_all/insurer_specific/admin_only) / 팀장님 라이브 진단 4건 PASS (legacy 4 + 시드 6 = 10건, 모두 NULL 정합) / 검증 3 expected 주석 4→10 갱신 (출처 박음) / 큰 그림 정합성 검증 PASS (마스터 전략 § 13 #1 + 메인 트랙 2 #58) / commit `9d1ce22` 푸시 / 5/15 D-4일 / Supabase 실행은 팀장님 별도 진행 대기
- `docs/sessions/2026-05-10_1654.md` — **2026-05-10 오후 (Phase 1 Step 7 ✅ 종료 + spec § 6-2 v0/v1 분기 결재 + D-6 라이브 DB 진단 영구 보존 + 안정화 4건)** ⭐⭐⭐ board.html 4탭 → 7종 board_type 재구조화 (qna/manager_notice/manager_lounge/navigation/insurer/hub/archive_legacy) / IIFE syntax error `*/` 토큰 핫픽스 + "공개" 라벨 옛 4탭 잔재 제거 / PRO 배지 일괄 숨김 (.pro/.quick-pro-badge/.search-lock-badge) / home_v2 .nav 모바일 반응형 (1024px 이하 hide) / 옛 index 푸터 4컬럼 이식 (PG 6요건 ④ 충족) / spec § 6-2 정책 3 자체 모순 발견 → v0 (가짜 연결) / Phase 3 (insurer_target 매칭) v0/v1 분기 패턴 채택 / 라이브 DB 진단 (Chrome read-only) — posts 37 컬럼 / insurers 31사 정합 (생명 21 + 손해 10) / 컬럼명 type (category 아님) / D-6 영구 보존 (`docs/architecture/db_v0_diagnosis_2026-05-10.md` 267줄 신설) / push 8 commit / 사고 학습 2건 박음 (multi-line 주석 `*/` 토큰 + spec 자체 모순 v0/v1 분기 패턴)
- `docs/sessions/2026-05-10_1257.md` — **2026-05-10 오후 (#30 Custom SMTP ✅ 종료 + 별 트랙 4건 자동 해소 + 165 자기 복제 정정 + Claude AI 채팅 창 정리)** ⭐⭐ Resend Custom SMTP 가동 8단계 PASS (Critical 해소) / #31 / #37 / #45 / #49 자동 해소 / "4팀 165명" → "약 40~50명" 11 파일 정정 (자기 복제 사고 18건+ 추적 / 출처 = 카톡 첨부 165개) / Claude AI 프로젝트 지식 9 → 10 갱신 + 자체 메모리 + 프로젝트 지침 삭제 + 새 채팅 첫 메시지 표준 / 02 § 비즈니스 인프라 신설 + 05_USER_PROFILE 신설 (CURRENT 00~05) / 01 § 표기 자기 복제 사고 신규 박힘 / 메모리 `team4_size_self_replication.md` 신설 / push 4 commit / 사고 학습 = AI 채팅창 5가지 구조적 한계 (5번째 자기 복제 신규 식별) / 라이브 5중 안전장치 가동
- `docs/sessions/2026-05-10_0943.md` — **2026-05-10 오전 (1단계 응급 안정화 ✅ 종료)** ⭐⭐ CURRENT 계층 5 파일(00~04) + 분할 _INDEX 5 파일 + AI 협업 전략 영구 진실 원천(`docs/core/AI_COLLABORATION_STRATEGY.md`) + 핵심 철학 5종(0+1~4) 명문화 (0순위 = 중립 독립 SaaS 브랜드 정체성 추가) / #47/#48 라이브 18/18 PASS + #49 UX 종료 + #50 의도 확인 종료 / push 7 commit / 사고 학습 영구 박음 (5/10 컨텍스트 폭증 + 옛 분류 인용) / 메모리 `ai_collaboration_priority.md` 신설 + `user_work_style.md` 보강 / 본 세션 본질 = 기능 < 컨텍스트 안정화 (5/15 4팀 오픈 본진의 전제 조건)
- `docs/sessions/2026-05-10_0042.md` — **2026-05-10 심야 (Phase 1.5 본진 ✅ 종료)** P1.5-A/B/C/D/E 라이브 회귀 14/15 PASS / 통합 모달 본진 home_v2.html 619→1,965줄 / index/login → home_v2 redirect 통째 폐기 (-2,990줄) / 사이드바 정합 #47 + 호칭 정합 #48 / UUID 1글자 오타 수정 (396→306) / 4팀 자산화 트랙 채팅 로그 archive / 사고 학습 3건 메모리 박음 / push 16 commit / 별 트랙 #45/#46/#47/#48 신설 + #30 Custom SMTP Critical 격상
- `docs/sessions/2026-05-10_0037_kakao_migration_chat_archive.md` ⭐ — 4팀 자산화 트랙 컨텍스트 archive (1,564건 인덱싱 + 5 카테고리 + 마법사 UX)
- `docs/sessions/2026-05-09_1757.md` — 2026-05-09 오후·저녁 (Step 5 본진 5-A/5-B/5-C 종료 + Phase 1.5 즉시 흡수 결정 (옵션 Y' 채택) / push 10 commit +3,611줄 / 사고 학습 1건 / 미해결 #37~#44 누적)
- `docs/sessions/2026-05-09_1253.md` — 2026-05-09 오후 (Step 2-bis 본질 종료 — 라이브 트랜잭션 5건 / 사고 학습 2건 / 별 트랙 #33~#36 / Phase 1 8/18 44.4%)
- `docs/sessions/2026-05-08_2020.md` — 2026-05-08 저녁 (spec v2 재작성 + v1 폐기 + README 9역할 정합 / 42건 결정 통합 / commit `bdc5c19` + `dd673cb` / Phase 1 6/18 33.3%)
- `docs/sessions/2026-05-07_1940.md` — 2026-05-07 저녁 (메인 트랙 전환 admin_v2 Phase D → v2.0 원수사 입점 모델 Phase 1 + OS 정의 v2 재정의 / 17 commit 누적)
- `docs/sessions/2026-05-07_0704.md` — 2026-05-07 새벽 (전략·큰 그림·원칙 통합 스냅샷 940줄 + C영역 빠른실행 1턴 골격 + (b) 후속)
- `docs/sessions/2026-05-05_1613.md` — 2026-05-05 오후 (v1.1 안전장치 a/a/a + PITR 결제 직전 PASS + 무료 회원 저장 공간 정책 검증)
- `docs/sessions/2026-05-05_1054.md` — 2026-05-05 오전 후속 (D-9 Step 1.6 옵션 B + Step 2~4 묶음 1107줄 / 카톡 보류 결정 / 22 commit + rebase 2)
- `docs/sessions/2026-05-05_0813.md` — 2026-05-05 오전 후속 (admin_v2 D-9 진입 + 알림 시스템 통찰 등록 / 4 commit + 발견 3건)
- `docs/sessions/2026-05-05_0659.md` — 2026-05-05 새벽 (admin_v2 Phase D-5·D-6 완전 종료 / 11 commit + rebase 2 / D-9 즉시 진입 가능)
- `fe19b3d` 원격 업로드 (5/5 04:48) — `docs/specs/2026-05-05_index_hero_headline_c_plus.md` (267줄) + `docs/specs/2026-05-05_team4_vault_phase1.md` (455줄)
- `docs/sessions/2026-05-04_2032.md` — 2026-05-04 저녁 (admin_v2 D-2/D-3/D-4 완전 종료 / 13 commit / 영구 학습 5건)
- `docs/sessions/2026-05-04_1630.md` — 2026-05-04 오후 (D-1·D-2 종료 / 9 commit / 영구 학습 4건)
- `docs/sessions/2026-05-03_1747.md` — 2026-05-03 오후 (admin_v2 D-1 Step 4·5 완료 / js/admin_v2.js 신설 342줄 / 3 commit)
- `docs/sessions/2026-05-03_1534.md` — 2026-05-03 오후 (D-1 Step 1 사전 검증 / Phase 1 마이그레이션 불필요 확정 / 3 commit + Chrome 25 PASS)
- `docs/sessions/2026-05-03_*` — 2026-05-03 (재오픈 전 헬스 체크 R1~R6 + 별 트랙 α + β + D-pre.8)
- `docs/sessions/2026-05-02_2002.md` — 2026-05-02 저녁 (D-9 보류 + D-pre.7 1차 EXISTS 사고 + 2차 SECURITY DEFINER 재진입)
- `docs/sessions/2026-05-02_1557.md` — 2026-05-02 오후 (D-pre.5 + D-pre.6 두 트랙 완수 / 검증 37건 + 산출물 5종 2,427줄)
- `docs/sessions/2026-05-01_2257.md` — 2026-05-01 저녁 (Phase D-pre 마이그레이션 첫 코드 변경 단계)
- `docs/sessions/2026-05-01_1834.md` — 2026-05-01 저녁 (DB 변경 0건)
- `docs/sessions/2026-05-01_1044.md` — 2026-05-01 오전 (Quick "미러링 전 녹취 스크립트" 카드 1줄 2컬럼)
- `docs/sessions/2026-05-01_1036.md` — 2026-05-01 오전 (admin_v2.html: 1,484 → 2,855줄)
- `docs/sessions/2026-05-01_<TBD>.md` — 5/1 (admin_v2 Phase B 마무리 + Phase C 진입·확정 / 4커밋)
- `docs/sessions/2026-04-30_<TBD>.md` — 4/30 (admin_v2 풀 스케일 트랙 진입: Phase A 분석 + Phase B 골격)
- `claude_code/_archive/news_migration_phaseA_20260430.md` — 4/30 news 트랙 후순위 폐기 시 Phase A 분석 보존본
- `docs/sessions/2026-04-29_1932.md` — 4/29 저녁 (myspace Phase 1 단일 세션 완주 / 7커밋 + 5머지)
- `docs/sessions/2026-04-29_1348.md` — 4/29 오후 (home C-2 + scripts v2-full / 6커밋 + 6머지)
- `docs/sessions/2026-04-29_0657.md` — 4/29 오전 (푸터 트랙 / 4커밋)
- `docs/sessions/2026-04-28_1929.md` — 4/28 저녁 (대규모 27 커밋: A1 라이트 톤 / sweep 4슬롯 / index 시안 통째 승격)
- `docs/sessions/work_*` — 갭 분석 보고서 7건 (home/index/myspace/scripts)
- `docs/sessions/2026-04-28_0004.md` — 4/28 심야 (home GPT v1 회귀)
- `docs/sessions/2026-04-27_pre_sweep_diagnosis.md` — 4/27 sweep 진입 전 시스템 안정성 진단
- `docs/sessions/2026-04-27_fallback_sweep_scan.md` — 4/27 fallback 부채 전수 스캔
- `docs/sessions/2026-04-27_1905.md` — 4/27 저녁
- `docs/sessions/2026-04-27_fallback_debt_finding.md` — 4/27 옛 브라운 fallback 발견
- `docs/sessions/2026-04-27_gap_analysis.md` — 4/27 9페이지 갭 분석

---

## 📌 폐기 / 보류된 트랙

- **`pages/news.html` 시안 승격 트랙** (4/30 admin_v2 작업지시서 §4-2로 후순위 폐기) — Phase A 분석 보존: `claude_code/_archive/news_migration_phaseA_20260430.md`. 보험뉴스 메뉴 숨김 결정으로 사용자 동선 단절 + v1.5~v2.0 보험뉴스 엔진 가동 시점에 함께 처리
- **`pages/admin.html` (1969줄 ver.)** (4/30 admin_v2 트랙 격상으로 stub 교체) — `claude_code/_archive/admin_v1_20260430.html` 보존. admin_v2.html 트랙 진행에 따라 단계적으로 새 콘텐츠로 대체
- **`claude_code/design_test/gpt_v1/` 트랙** (4/27 도입, 4/28 묵시적 폐기, 4/29 한 단계 진행) — GPT 이미지 생성 PNG 시안 4종(home/board/myspace/scripts). 결정 문서 여전히 대기
- **구버전 Supabase `qursjteiovcylqiepmlo`** (4/24 사고 후 폐기) — `pdnwgzneooyygfejrvbg`(신버전)이 유일 진실 원천

---

## 🔄 진행 중·완료된 별건 트랙 (메인 트랙과 분리)

| 트랙 | 상태 | 근거 |
|---|---|---|
| **fallback sweep** (옛 브라운 6값 → 새 토큰 본체) | ✅ 4슬롯 완료 (4/28 누적 346건) | `70fd368` `2b9a4b0` `f2db460` `6587254` |
| **admin standalone hex 8건 토큰화** | 🛑 admin_v2 격상으로 무효화 | `a0bdfbf` (4/28, git 히스토리에만 잔존) |
| **A1 헤더 라이트 톤 + 모바일 반응형** | ✅ 완료 (4/28) | `fd8b264` `1ab35c4` |
| **빠른실행 v2 사양 메모리 등록** | ✅ 등록 완료 (코드 변경 없음) | `project_quick_overlay_v2_spec.md` |
| **app 푸터 트랙 (4컬럼 → 한 줄 미니 → 셸 최하단)** | ✅ 완료 (4/29 오전, 라이브 검수 대기) | `54cd148` `fa835d2` `ae669d0` `79c0052` |
| **카피라이트 사이트 전체 onesecond 단일 표기** | ✅ 완료 (4/29 오전) | `216ce9f` |
| **terms/privacy 돌아가기 → 닫기 버튼** | ✅ 완료 (4/29 오전, 라이브 검수 대기) | `710d452` |
| **design_test/README 갱신** | ✅ 완료 (4/29 오전) | `c2e2d86` |
| **home hero 줄무늬 그라데이션 디바이더** | ✅ 완료 (4/29 오후) | `869510d` `c71db6d` |
| **home hexagon 시계 흰 원형 카드** | ✅ 완료 (4/29 오후) | `4071194` |
| **scripts D영역 v2-full 통째 승격** | ✅ 완료 (4/29 오후) | `6882753` |
| **scripts 컬럼 1·4 폰트 위계 회복** | ✅ 완료 (4/29 오후) | `be40cc6` |
| **scripts C영역 표시 ON + 진행 상태 박스** | ✅ 완료 (4/29 오후) | `c96d833` |
| **myspace 갭 분석 v2 (3개 탭 전체)** | ✅ 완료 (4/29 저녁) | `978904c` |
| **myspace 부분 흡수 — pg-page-header + 카드 토큰** | ✅ 완료 (4/29 저녁) | `656aa99` |
| **myspace `.pg-outer` board 정합 통일** | ✅ 완료 (4/29 저녁) | `9be9d3c` |
| **myspace 카드 그리드 + 그레이 푸터 + 공통 간격 토큰 5종** | ✅ 완료 (4/29 저녁) | `2cd372e` |
| **myspace scripts fetch 400 회귀 수정** | ✅ 완료 (4/29 저녁) | `efeb1ad` |
| **myspace 4건 통합 정리** | ✅ 완료 (4/29 저녁) | `6ede634` |
| **3페이지 공통 간격 토큰 적용 + board `.hub-notice` 톤 정정** | ✅ 완료 (4/29 저녁) | `e5b5afe` |
| **news 헤더·푸터 board 룩 통일** | ✅ 완료 (4/30) | `ee64d9a` |
| **quick myspace 정합 5건** | ✅ 완료 (4/30) | `3846dc2` |
| **quick 헤더 타이틀 brown + 탭바 폭** | ✅ 완료 (4/30) | `68b2cba` |
| **together MY SPACE 룩 통일 + 카드 그리드 반응형** | ✅ 완료 (4/30) | `86c9807` |
| **🔴 admin_v2 풀 스케일 Phase B 골격 (메인 트랙)** | ✅ 완료 (2026-04-30) | `e8949f2` |
| **🔴 admin_v2 Phase B-2 B영역 가독성 표준화** | ✅ 완료 (2026-05-01) | `fece099` |
| **🔴 admin_v2 Phase B 마무리 결함 5건 일괄** | ✅ 완료 (2026-05-01) | `99f70e4` |
| **🔴 admin_v2 Phase C 7섹션 mock 콘텐츠 풀 채움** | ✅ 완료 (2026-05-01) | `5fb83bf` |
| **🔴 admin_v2 status·역할 badge 5종 톤 WCAG AA** | ✅ 완료 (2026-05-01) | `e2d7a78` |
| **별 트랙 α — exception_diseases 검색 전면 차단 (UI + DB 이중 잠금)** | ✅ 완료 (2026-05-03) | `7ea9044` + `61545f9` |
| **별 트랙 β — pages/*.html 9페이지 직접 URL 인증 게이트** | ✅ 완료 (2026-05-03) | `2142ab1` + `7096c6b` |
| **🔴 D-pre.8 — DB 정합 일괄 청산 5항목 (B + ② + ⑤ + ⑤-2 + ⑦)** | ✅ 완료 (2026-05-03) | DROP 9 + CREATE 10 + 사후 검증 SELECT 18행 |

---

*상위 인덱스 [`_INDEX.md`](./_INDEX.md) | 이전: [`_INDEX_3_stars.md`](./_INDEX_3_stars.md)*
