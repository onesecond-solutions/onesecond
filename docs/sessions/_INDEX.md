# 세션 인덱스 — 큰 그림 압축본

> **🎯 원세컨드 본질 (양면 진실 원천 — 매 세션 통째 필독):**
> - **영업·사업 본질** ⭐⭐⭐ (모든 결정 기준): `docs/core/onesecond_master_strategy_v1_20260510.md` ⭐ NEW (5/10, 507줄, 14섹션)
> - **시스템 본질**: `docs/core/onesecond_os_definition_v2_2026-05-07.md` (540줄)
> - **한 줄:** 보험업 운영 흐름 네트워크 + 보험 검색 인프라 + 반복 질문 감소 시스템
> - **0순위 정체성:** 중립 독립 SaaS (특정 보험사·GA 종속 X)
>
> **🚨 마지막 갱신:** 2026-05-23 오후 (16:28) — **사이트 대개편 완주 + 보험이슈 자동 카드 트랙 완료** (집 PC, 약 7시간, Code 단독 진행, 13 PR 머지). 본 세션 핵심: (1) **사이트 대개편 (PR #16~23 = 8건)** — `_new/` 폴더 누적 + 갈아엎기 방향 정합. 어제 새벽 SPA Phase 1을 라이브 자리에 박은 격차 정정 → 셸 변환 (사이드 메뉴 8개 + D 영역 SPA 라우터 + 시계 로고 + "보험뉴스"→"보험이슈") + 7개 페이지 mock 완성 (MY SPACE / 스크립트 / Quick / 함께해요 / 보험이슈 / 팀원관리 + 현장의 소리 4 탭). 홈만 placeholder (기획 자료 대기). (2) **보험이슈 자동 카드 트랙 완료 (PR #24~28 = 5건)** — Supabase DDL (issues 테이블 + RLS) + Node 스크립트 (rss-parser + supabase-js) + GitHub Actions cron (매일 7시 KST) + v-news 프론트엔드 (REST API fetch + 출처별 필터링) + Node 20→22 격차 정정. Supabase 자료 자동 채워짐 + 매일 7시 자동 가동 본격 시작. (3) **🚨 service_role 키 노출 사고** — 채팅창에 키 잘못 자료. 본인 즉시 사고 인지 + rotate 안내. **다음 세션 진입 첫 자리 = 키 rotate 완료 확인 + GitHub Secrets 갱신 완료 확인.** (4) **격차 누적 학습 5건** — 어휘 도배 격차 ("자료" 50회+ 반복) / service_role 키 노출 사고 / 단독 결정 자리 자료 / 결재 옵션 자동 박지 말기 (개선) / 반복 패턴 묶음 진입 자료. 다음 세션 = 의식적 정정 자료.
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
- `docs/core/onesecond_os_definition_v2_2026-05-07.md` — OS 정의 v2 (540줄)

---

*본 압축본은 `/session-end` 슬래시 커맨드 5단계에서 자동 갱신됩니다. 수동 편집 시 마지막 갱신 날짜를 함께 갱신하세요.*
*분할 4 상세 파일도 함께 갱신 권장 — 압축본만 갱신 시 정합성 깨짐 위험.*
