# 인덱스 상세 3 — 별 트랙 + 미해결 + 결정 대기 + design_test 승격

> **상위 인덱스:** [`_INDEX.md`](./_INDEX.md) (압축본 ~150줄)
> **본 파일 범위:** 미해결 #1~#51 + 별 트랙 후보 + 결정 대기 + design_test 9 시안 승격 진행

---

## 🚧 미해결 이슈 (인계, 누적)

### 종료된 항목 (✅ 해소 표기 보존)

1. ~~admin standalone hex 8건 토큰화~~ — admin_v2 트랙 격상으로 사실상 무효화
2. **B 사이드바 "함께해요" 활성 오작동** — home 진입 시 잘못된 메뉴 활성. home 작업 트랙과 분리 (별 트랙 진단 대기)
3. **🟡 라이브 검수 부채 (별 카운터, 4/29 + 4/30 17커밋)** — 코드 자체는 완료, 팀장님 Chrome 1회 PASS만 남은 상태
4. **logo03.jpg 라이트 헤더 사각형 경계** — 이미지 배경 옅은 그레이/아이보리(JPG, 투명 X)
5. **app 푸터 셸 최하단 정정 라이브 검수 미완** (`79c0052`, 4/29 오전)
6. **terms/privacy 닫기 버튼 라이브 검수 미완** (`710d452`, 4/29 오전)
7. **scripts 동적 STEP 표시 별 트랙** — C영역 진행 상태 박스 동적 갱신 미구현
8. **scripts v2 sticky 세로 탭바 미이식**
9. **scripts top_category 컬럼 활용 미정**
10. **(보류) news.html 표준 `.pg-outer` 구조 마이그레이션** — admin_v2 §4-2로 후순위 폐기
11. **(4/29 저녁) 안내박스 글로벌 클래스 `.pg-guide` 정착** — myspace `.mys-guide` + board `.hub-notice` 통합
12. **(4/29 저녁) `.mys-card-stage` 클래스 JS 인라인 정리**
13. **(4/29 저녁) myspace 검색 모드 예시 카드 인터랙션 미정의**
14. **(4/29 저녁) myspace view-write 폼 stage select 부재**
15. **(4/29 저녁) `_SAMPLE_LIBRARY` url/content 빈값**
16. ~~admin_v2 다크 톤 4종 후보 결정~~ → ✅ 해소 (5종 운영 확정)
17. ~~보험뉴스 메뉴 숨김~~ → ✅ 해소 (화면설정 admin.html에서 숨김 처리)
18. ~~admin_v2 라이브 검수 통합 시점~~ → ✅ 해소 (5/1 Phase B/C 모두 완료)
19. **admin_v2 Phase D 진입 — 9역할 RBAC 권한 검증 로직** — Phase D mock → 실 Supabase 연결
20. **team4_vault Phase 1 진입 시점 충돌 가능성** — admin Phase D 잔여 ~8.3세션과 5/12 시점 충돌
21. **메모리 #11 자료 자산화 본 트랙 격상이 _INDEX.md 미반영** — 5/4 격상 결정 시점 명문화 필요
22. **v1.1 운영 안전장치 3종 (PITR / Sentry / Playwright)** — 결정 + 결재 (a/a/a) 완료. **트랙 #A PITR Compute Small 먼저 → PITR 7 days. 비용 raw: 신규 청구 ~$130.15/월 (Pro $25 + PITR $100 + Compute 차액 +$5.15)**. #B Sentry 5/11 + #C Playwright 5/12~13
23. **(5/5 후속) 알림 시스템 전면 재설계 v1.1~v3.0 통찰 문서 별 트랙 등록** — `docs/sessions/2026-05-05_dawn_notification_system.md` (443줄, Claude AI 새벽 통찰)
24. **(5/5 후속 09:30) menu_home = false 라이브 의도 vs 잔재 확인 필요** — D-9 진행 차단 아님
25. **(5/5 후속 09:30) Storage RLS 전수 sweep 별 트랙 (작업지시서 신설)** — D-9 Step 1.6 옵션 B 채택 후 잔여 부채. 추정 진행량 ~0.6세션. **5/11 슬롯 진입 권장**
26. **(5/5 10:30 후속) 카톡 → 원세컨드 마이그레이션 트랙** — 5/9~10 새벽 archive 후 활성 트랙 격상 (`docs/sessions/2026-05-10_0037_kakao_migration_chat_archive.md`)
27. **(5/5 후속) 무료 회원 저장 공간 정책 검증 — 별 트랙 종료** — 정책 골격 ✅ + 4건 ⚠️ 보강 필요
28. ~~C영역 빠른실행 오버레이 STEP 2 / 1턴~~ → ✅ 종료 (5/7 오전, 6 commit 누적)
29. **(5/7 오전) v2.0 원수사 입점 모델 Phase 1 메인 트랙 전환** — admin_v2 Phase D → 본 트랙 전환

---

### 🚨 5/15 4팀 오픈 영향 (Critical / 시급)

30. **🚨 (Critical 격상 5/10) Custom SMTP 도입 — 5/15 전 필수** → ✅ **종료 (5/10 오후, Resend Custom SMTP 가동, 8단계 PASS)** — Phase 1 Step 4 진입 시 검토 발견. Supabase 기본 SMTP rate limit = **3 emails/hour**. **5/10 새벽 P1.5-E ⑥ 사고로 입증** + **5/10 #49 검증 중 over_email_send_rate_limit (429) 라이브 입증**. **결정:** (a) 채택 — Resend 채택 + 도메인 SPF/DKIM/DMARC 박힘 + Supabase Custom SMTP ON + 6종 한국어 템플릿 적용. **자동 해소 별 트랙 4건:** #31 / #37 / #45 / #49.

31. **(5/8 새벽) 인증 메일 템플릿 한국어 변경 미작업** → ✅ **종료 (5/10 오후, #30 단계 4 6종 한국어 적용 자동 해소)** — Phase 1 Step 4 검증에서 발견. `Confirm Your Signup` 영문 잔존. 4팀 약 40~50명 한국어 사용자 대상 → 신뢰도 저하 우려

32. **(5/8 새벽) Step 4-D 시나리오 3 미완 — 팀장님 직접 메일 클릭 검증** — 시나리오 1·2·4 PASS로 본질 검증 충분

33. **(5/9 새벽) posts.author_id 타입 정합화 (text → uuid 마이그레이션 + orphan 3건 처리)** — Step 2-bis Step A 발견. **트리거 = Phase 1 종료 후**. #36과 묶음 처리 권장

34. **(5/9 새벽) hub_public ↔ board_hub 의미 통합** — Step 2-bis Step A app_settings raw 검증에서 발견. **트리거 = D-9 본격 가동 시점**

35. **(5/9 새벽) Supabase SQL Editor RUN 단위 세션 분리 학습 + 트랜잭션 표준 영구 명문화** — Step 2-bis B-1 사고. 메모리 [`supabase_sql_editor_session_isolation.md`] 신설 완료

36. **(5/9 새벽) posts PK 타입 통일 (bigint → uuid 마이그레이션)** — Step 2-bis 1차 시도 발견. parent_post_id BIGINT로 정정 후 PASS. **트리거 = Phase 1 종료 후**. #33과 묶음

37. **(5/9 오후) 인증 메일 한국어 템플릿 (#31과 묶음, D8 결재 (b))** → ✅ **종료 (5/10 오후, #30 단계 4 6종 한국어 적용 자동 해소)** — 5/12~14 슬롯 진행 권장 → #30 트랙 안에서 동시 처리됨

38. **(5/9 오후) 5/15 4팀 약 40~50명 직급 분포 사전 매핑 운영 데이터 (영업 트랙)** — 4팀 명단 확보 후 ga_manager / ga_member / ga_branch_manager / ga_staff 분포 사전 매핑

39. **(5/9 오후) 첫 보험사 매니저 admin 직접 생성 흐름 (Phase 1 종료 후)** — 닭-달걀 문제

40. **(5/9 오후) admin_v2 D-1 매니저 승인 UI (Phase 1 Step 10~15 융합)** — UI = Phase 1 Step 10~15 admin 융합 트랙(2.4세션) 안에서 자연 흡수

41. **(갱신 5/9 저녁) 🚨 Phase 1.5 즉시 흡수 결정 (옵션 Y' 채택)** ⭐⭐ → ✅ 종료 (5/10 새벽)

42. **(5/9 오후) 흥국 e-life / T-Life slug 통합 결재** — 두 slug 동일 법인. **트리거 = Phase 2 진입 시점** (5/22 이후)

43. **(5/9 오후) ⚠️ 추정 3사 도메인 사후 검증 (db-life / im-life / kb-life)** — Step 5-A Chrome 조사 ⚠️ 추정. **트리거 = 첫 입점 시점 admin 사후 보강** (영업 트랙)

44. **(5/9 오후) RPC 2종 PUBLIC EXECUTE 후속 정정** — Step 5-B 사후 검증에서 발견. **보안 위험 0** 확인. best practice 정합으로 `REVOKE EXECUTE ... FROM PUBLIC` 추가 권장

---

### 5/10 새벽~5/10 신설 (Phase 1.5 후속 + #49 처방)

45. **(5/10 새벽) 🟠 P1.5-E ⑥ 실 가입 시연 후속 — Supabase rate limit 해소 후 GA 가입 PASS** → ✅ **자동 해소 (5/10 오후, #30 단계 5-B 실 가입 시연 PASS)** — UUID 1글자 수정(`ae04a8e`) FK 23503 해소 ✅ / rate limit 해소 후 1회 PASS 확인용. **#30 Custom SMTP 후 자동 추적**

46. **(5/10 새벽) home_v2.html signup form select 동적 lookup 전환 — 보험사 패턴 정합** — 정적 하드코딩 → DB 정합 깨질 위험. **트리거 = Phase 1.5 종료 후 별 트랙** (~30분, 미래 안전성)

47. ~~사이드바 메뉴 순서 정합~~ → ✅ 종료 (5/10 새벽 commit `5b161ac` + 18/18 PASS)

48. ~~호칭 정합 (스마트 게시판 → 현장의 소리)~~ → ✅ 종료 (5/10 새벽 commit `8c544d8` + 18/18 PASS)

49. **(5/10 오전) home_v2.html 가입 안내 노출 보강** — UX 보강 코드 정합 ✅ (commit `344eae3` + 6 PASS / 2 미확인 rate limit). A-4 진짜 원인 단정은 #30 후속 자동 추적 (소스 분석 기반 case(a) 가능성 높음)

50. ~~app_settings menu_home/menu_news 의도 확인~~ → ✅ 종료 (5/10 오전, 의도된 화면설정 + admin 정상 노출 확인)

51. **(5/10 오전) public.posts 0건 시드 부재** — 4팀 오픈 첫날 board 빈 화면 위험. **트리거 = 5/14~15 새벽 5~10건 INSERT** 또는 4팀 자산화 트랙 결과 자동 시드

---

## 🪧 별 트랙 후보 — admin_v2 Phase C 외 (2026-05-01 신규 등록)

| # | 트랙 | 대상 | 권장 처리 시점 |
|---|---|---|---|
| **B-1** | 차트 SVG grid line light 톤 무대비 | dashboard / D-3 board / D-5 analytics | grid line stroke를 CSS 변수화 (`--admin-chart-grid`). Phase D 진입 후 별 트랙 |
| **B-2** | dashboard 기본 뱃지 light 톤 미달 | `.adm-badge.online` / `.pro` / `.branch` / `.manager` / `.admin` (라인 677~683) | Phase D D-8 대시보드 종합 단계에 묶음 |
| **B-3** | Phase B 마무리 borderline — light 액센트 #D4845A | B영역 카테고리 라벨 + C영역 활성 메뉴 | 별 트랙 우선순위 낮음. 5월 패키지에서 함께 검토 |
| **#A v1.1 PITR** | Supabase 백업 시스템 강화 | 5/6 진입 가능 (Compute Small 먼저 → PITR 7 days) — 결재 #1 승인 후 |
| **#B v1.1 Sentry** | 라이브 에러 추적 SDK 도입 | **5/11 (월)** 알림 v1.1 본 진입 + 별 트랙 #25 병렬 — 결재 #2 승인 후 |
| **#C v1.1 Playwright** | 라이브 회귀 자동화 1세트 | **5/12 (화)** D-final 보안 sweep 병렬 — 결재 #3 승인 후 |

---

## 🚀 다음 트랙 후보 (2026-05-01 admin_v2 Phase C 확정 직후)

| # | 트랙 | 분류 | 비고 |
|---|---|---|---|
| (1) | **admin_v2 Phase D 진입 — 실 Supabase 연동** | 🔴 메인 트랙 다음 단계 | 9역할 RBAC + RLS 정합 |
| (2) | myspace 갭 분석 6항목 결정 | 🟡 별 트랙 | 4/30 분석 보고 기반 |
| (3) | 5/9~10 주말 패키지 | 🟡 별 트랙 | UI 스케일 슬라이더 / Sticky Nav / Safari 보강 |
| (4) | 보험뉴스 → 스크립트 자동 증식 엔진 | 🟢 큰 별 트랙 | 5/6 후 본격 시작 예정 |
| **(5)** | **알림 시스템 전면 재설계 v1.1~v3.0 (5/5 후속 신규)** | 🟢 큰 별 트랙 | 7개 분할 spec 예정. 분할 spec 작성 시점 = admin Phase D 마무리 후(5/11~12경) |

---

## 📋 결정 대기 항목

### 활성 (결정 대기)

1. **GPT v1 트랙 폐기 명문화** — 4/28 묵시적 폐기 → 명문 결정 문서 신설 대기
3. **(4/29 저녁) 라이브 검수 통합 시점** — 4/29 + 4/30 17커밋 누적
7. **(5/5 후속) 알림 시스템 분할 작업지시서 7건 중 우선순위** — Code 권장: v1.1 C영역 → 호버 → 설정 순
8. **(5/5 후속) 알림 시스템 v1.1 우선 5개 항목 작업 순서** — admin Phase D 잔여 ~5.9세션과 병렬 가능 여부 결정 필요
9. **(5/5 후속) 알림 시스템 빠진 후보 [필수] 10건 확정** — 시스템 공지 자리·매니저 공지 범위·푸시·모바일 동기화 DB 등 (통찰 문서 §12)
10. **(5/5 후속) 무료 회원 저장 공간 정책 후속 4건 보류:**
    - #1 Cloudflare CDN 도입 시점 — 트리거 = 1,000명 도달
    - #2 30MB 한도 강제 3중 방어 구조 작업지시서 — 트리거 = 4팀 v1.1 출시(5/15)
    - #3 다운그레이드 grace period 정책 — Code 권장: 30일 grace + 정리 유도
    - #4 5,000명 진입 전 한도 재검토 — 트리거 = 3,000명 도달 + 4,000명 도달 2단계
11. **(5/7 오전) 사이드바 메뉴 기준 영역 분리 운영 모드** — Phase 1 완료 후 진입 권장
12. **(5/8 새벽) 인증 메일 템플릿 한국어 변경 시점·범위 결정** — Code 권장 (a) Step 5 (보험사 회원가입 폼) 진입 시 통합 처리

### 종료 (참고)

- ✅ 4/28 결정 4건 (design_test 트랙 / 7페이지 우선순위 / index 결정 6건 / home 결정 10건)
- ✅ 4/30 결정 7건 (admin_v2 풀 스케일 / 다크 테마 / 통합 방식 (a)+(c) / viewport / news 폐기 / _INDEX 즉시 갱신)
- ✅ 5/1 결정 7건 (5종 톤 / Phase B 결함 5건 / Phase C 7섹션 mock / 9역할 매핑 / WCAG AA / 토큰 12종 / 3정체성 분리)
- ✅ 5/5 결정 (v1.1 안전장치 a/a/a)

---

## 🎨 design_test 시안 라이브 승격 (보조 트랙, 4/30 강등)

`claude_code/design_test/<page>/v1-full.html` 시안을 라이브 페이지에 승격하는 트랙. 메인 트랙 격상 후 **보조 트랙으로 강등** (2026-04-30).

### 승격 진행 현황 (2026-04-30 기준)

| 영역 | 상태 | 근거 커밋 |
|---|---|---|
| `css/tokens.css` (9 시안 :root 통합 + 공통 간격 토큰 5종 + admin 다크 토큰) | ✅ 완료 | `71f08b0` (4/27) / `2cd372e` (4/29) / Phase B 본 세션 |
| `app.html` (shell v1) | ✅ 완료 + 4/28 A1 라이트 톤 + 4/29 푸터 트랙 | `5592749` (4/27) → `fd8b264` `1ab35c4` (4/28) → 푸터 4커밋 (4/29) |
| `pages/board.html` | ✅ 시안 통째 적용 + 공통 간격 토큰 + `.hub-notice` 톤 정정 | `ebb9b3b` (4/26) / `e5b5afe` (4/29) |
| `index.html` | ✅ 시안 통째 승격 완료 (Phase 1.5 진입으로 redirect 페이지 25줄로 교체) | `83665c4` 등 누적 → `0aa50e1` (P1.5-D) |
| `pages/home.html` | 🟡 사실상 흡수 완료 — 라이브 1116줄 vs 시안 1202줄 (-86) | C-1 `b854878` / C-2 줄무늬 / hexagon 시계 `4071194` |
| `pages/admin.html` | 🛑 stub 90줄 교체 완료 (4/30 admin_v2 트랙 격상) | `e8949f2` / 백업 `_archive/admin_v1_20260430.html` |
| `pages/myspace.html` | ✅ 부분 흡수 (A) Phase 1 완주 (라이브 검수 미완) | 7커밋 누적 (4/29 저녁) |
| `pages/scripts.html` | ✅ v2-full 통째 승격 완료 + 폰트 위계 + C영역 ON | D 영역 `6882753` / 폰트 `be40cc6` / C영역 `c96d833` |
| `pages/news.html` | 🛑 트랙 폐기·후순위 (admin_v2 §4-2) | 헤더·푸터 board 통일만 진행: `ee64d9a` |
| `pages/quick.html` | 🟢 흡수 완료 — 라이브 396줄 ≥ 시안 302줄 | 토큰 `e5b5afe` / myspace 정합 5건 / 헤더 brown |
| `pages/together.html` | 🟢 흡수 완료 — 라이브 1088줄 ≥ 시안 373줄 | 토큰 + 룩 통일 `86c9807` |

### index.html 승격 사전 결정 6건 (2026-04-28 확정)

| # | 항목 | 결정 |
|:---:|---|---|
| 1 | 적용 방식 | (A) 시안 통째 승격 (board 패턴) |
| 2 | `inaction-section` 카피 | (b) 폐기 |
| 3 | `vs-section` BEFORE/AFTER | (a) 폐기 |
| 4 | `#togetherIntroOverlay` | (a) 보존 |
| 5 | 가입 폼 패러다임 | (a) 시안 인라인 채택 (모달 제거) |
| 6 | privacy/terms 외부 페이지 전환 | OK |

근거 보고서: `docs/sessions/work_index_gap_analysis_2026-04-28.md` (커밋 `902dca0`)

### 다음 후보 우선순위 (2026-04-30 변경)

1. 🔴 **admin_v2.html 풀 스케일 (메인 트랙)** — 사업 전략 핵심 축
2. ✅ `index.html` (Phase 1.5 흡수)
3. 🟡 `pages/home.html` (사실상 흡수 완료)
4. ✅ `pages/scripts.html` (라이브 검수 대기)
5. ✅ `pages/board.html`
6. ✅ `pages/myspace.html` (라이브 검수 대기)
7. 🛑 ~~`pages/news.html`~~ → 후순위 폐기
8. 🟢 `pages/quick.html` (흡수 완료)
9. 🟢 `pages/together.html` (흡수 완료)
10. 🛑 ~~`pages/admin.html`~~ → admin_v2 메인 트랙

---

*상위 인덱스 [`_INDEX.md`](./_INDEX.md) | 이전: [`_INDEX_2_admin_v2.md`](./_INDEX_2_admin_v2.md) | 다음: [`_INDEX_4_sessions.md`](./_INDEX_4_sessions.md) 세션 로그*
