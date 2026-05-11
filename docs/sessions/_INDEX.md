# 세션 인덱스 — 큰 그림 압축본

> **🎯 원세컨드 본질 (양면 진실 원천 — 매 세션 통째 필독):**
> - **영업·사업 본질** ⭐⭐⭐ (모든 결정 기준): `docs/core/onesecond_master_strategy_v1_20260510.md` ⭐ NEW (5/10, 507줄, 14섹션)
> - **시스템 본질**: `docs/core/onesecond_os_definition_v2_2026-05-07.md` (540줄)
> - **한 줄:** 보험업 운영 흐름 네트워크 + 보험 검색 인프라 + 반복 질문 감소 시스템
> - **0순위 정체성:** 중립 독립 SaaS (특정 보험사·GA 종속 X)
>
> **🚨 마지막 갱신:** 2026-05-11 저녁 (18:10) — **별 트랙 #58 v0 ✅ 4종 폼 완성 (슬롯 5~9 모두 박힘)**. 본 세션 5 commit 박힘: 슬롯 5 마이그레이션 SQL `9d1ce22` (audience_target ENUM 5종 + responder_hint) → 라이브 검증 3건 PASS / 슬롯 6 공지 폼 `a101dd0` (admin/매니저급, audience 5종) / 슬롯 7 인수 폼 `b04d156` (라이브 6 컬럼 + 정규식 차단 3종 PII 방어 + 노란 경고 박스) / 슬롯 8 상품 폼 `02b97cf` (product_category + 블루 운영 안내 박스) / 슬롯 9 기타 폼 `e792c52` (질문유형 9종 + responder_hint). 결재 4건 받음: content 자유 흡수(c) / insurer_target 영문 키(b) / file v0 제외 / audience 기본값 team_internal. content prefix 구조 = 향후 search_index/RAG/AI 구조화 기반. 라이브 회귀 0 보장. 5/15 D-4일. 다음 세션 진입 후보: #56 매니저 라운지 탭 오버플로우 / Sentry #22 #B / search_index 연동 / 실 질문 흐름 검증. 직전: 2026-05-11 오전 (07:08) 슬롯 4 (#51 시드 10건) + 슬롯 3 (#53 Step 7 라이브 회귀 검수) 종료.
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
