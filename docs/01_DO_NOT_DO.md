# 절대 하지 말 것 / 폐기·금지 / 회귀 위험 (2026-05-10 갱신)

> 본 문서는 AI/팀장님이 옛 트랙·폐기 구조에 빠지지 않게 명시한다.
> 작업 진입 시 통째 읽고 **회귀 위험 즉시 인지**.

---

## 🛑 절대 참조 금지 (옛 raw)

| 대상 | 폐기 사유 |
|---|---|
| `claude_code/_docs/supabase_dumps/*.csv` | 4/20 구버전 스냅샷 (CLAUDE.md 명시) |
| 구버전 Supabase `qursjteiovcylqiepmlo` | 4/24 사고 후 폐기. 신버전 `pdnwgzneooyygfejrvbg` 유일 진실 원천 |
| `docs/deprecated/*` (6 파일) | 폐기 헤더 박힌 문서들 (00_MASTER / supabase_schema / phase1_definition_20260507 / 4탭 visibility / index_together / 4/19 evening) |
| `docs/specs/v2_insurer_admission_phase1_v1.md` | v2가 본진 (v1은 폐기 헤더 박힘) |
| `claude_code/_archive/admin_v1_20260430.html` | 1969줄 백업 (admin_v2 풀이 본진) |
| `claude_code/_instructions/*` (10 파일, 4/19~25) | 옛 작업지시서 — 3단계 archive 통일 예정 |
| `claude_code/_context/*` (3 파일) | 4/19 옛 컨텍스트 — 3단계 archive 통일 예정 |

---

## 🛑 무효화된 트랙 (회귀 금지)

- admin standalone hex 8건 토큰화 (admin_v2 격상으로 무효)
- `pages/news.html` 시안 승격 트랙 (보험뉴스 엔진 가동 시점에 함께 처리)
- `pages/admin.html` 1969줄 ver. (admin_v2 stub로 교체)
- GPT v1 트랙 (4/28 묵시적 폐기)
- 4탭 게시판 구조 (2탭 + 7종 board_type 재구조화 본진)
- 5역할 체계 (9역할 체계 정합 / admin / ga_* 4종 / insurer_* 4종)
- 옛 home GPT v1 회귀 흐름

---

## 🛑 브랜드 정체성 회귀 금지 (0순위) ⭐⭐⭐

| 본진 | 회귀 신호 (즉시 보고) |
|---|---|
| **중립 독립 SaaS** (어느 보험사·GA에도 소속 X, 현장 전체 기준 중립) | ❌ 특정 보험사 기능 중심 사고 (NH 전용 / 삼성생명 편향 등) / ❌ 특정 GA 편향 UX / ❌ 폐쇄형 조직 SaaS 해석 / ❌ 4팀(AZ 더원) 단독 고객 가정 |

**오해 방지:** 4팀 = 5/15 첫 사용자 검증이지 영구 단독 고객 X. 향후 다른 GA / 다른 보험사 매니저 입점 시 동일 OS.

---

## 🛑 핵심 운영 철학 회귀 금지 ⭐⭐⭐ (절대 흔들리지 X)

| 본진 | 회귀 신호 (즉시 보고) |
|---|---|
| 현장의 소리 = 질문 운영 시스템 | ❌ 커뮤니티형 게시판 SaaS화 회귀 / ❌ CRM/일반 게시판 회귀 |
| home_v2 = 운영형 홈 | ❌ 랜딩페이지 / 마케팅 페이지 회귀 |
| Quick 메뉴 = 긴급 실행도구 | ❌ 일반 메뉴 / 부가 기능 회귀 |
| 고정 프레임 구조 = 앱 셸 | ❌ 다중 페이지 / iframe 회귀 |

**회귀 신호 발견 시 작업 중단 + 즉시 팀장님 보고.**

---

## ⚠️ AI 혼동 유발 폴더 (정리 대기, 3단계 별 세션)

| 폴더 | 처리 예정 |
|---|---|
| `claude_deskktop/` (typo "desktop") | 3단계 삭제 (빈 폴더 추정) |
| `claude_code/_instructions/` | 3단계 `docs/90_ARCHIVE/legacy_instructions/`로 통합 |
| `claude_code/_context/` | 3단계 동일 |
| `claude_code/_docs/supabase_dumps/` | 3단계 동일 |
| `claude_code/_archive/` | 3단계 동일 |
| `pages/_template.html` | 3단계 위치 이전 (`claude_code/_instructions/_template.html`) |

3단계 작업 전까지는 **본 폴더들 raw 절대 참조 X** (옛 raw로 큰 사고 위험).

---

## 🛑 작업 패턴 금지 (CLAUDE.md 정합)

- 원세컨드 제품 코드(`app.html`, `pages/*.html`, `js/*.js`, `css/*.css`) **명시적 지시 없이 수정 금지**
- 파일 없이 추측 수정 금지
- 팀장님 확인 전 **"완료" / "완벽" 선언 금지**
- E영역 외 영역(A, B, C, D) 임의 수정 금지

---

## ⚠️ 사고 신호 발생 시 즉시 정지 (CLAUDE.md "Supabase DB 작업 규칙" 정합)

다음 신호 발생 시 모든 작업 중단하고 팀장님께 즉시 보고:
- 로컬 덤프 결과와 Dashboard 결과 다름 → 90% 확률로 구버전 보고 있음
- "분명히 row가 있어야 하는데 없다" / "없어야 하는데 있다"
- RLS 정책 개수, 컬럼 구성, 테이블 목록이 메모리·CLAUDE.md와 다름

→ 즉시 CLAUDE.md "DB 작업 첫 질문" 정합 복귀 (신버전 Dashboard 확인)

---

## 🛑 표기 자기 복제 사고 (165 사례, 2026-05-10 학습) ⭐

**진실 그라운드:** 4팀 인원 = **약 40~50명** / 더원지점 전체 = **약 100명**.

| ❌ 폐기 표기 | ✅ 정합 표기 |
|---|---|
| "4팀 165명" | "4팀 약 40~50명" |
| "165명 가입" / "165명 명단" | "4팀 인원 가입" / "4팀 명단" |
| (더원지점 인원 누락) | "더원지점 약 100명" |

**원인:** 카톡 첨부 파일 165개(`docs/sessions/2026-04-26_2003.md:97` 출처)를 어느 시점에 "4팀 165명"으로 혼동 → spec 18건+ 자기 복제 → `_INDEX.md` 압축본까지 침투. 단순 메모리 문제 X = **AI 채팅창의 자기 복제 사고 본질**.

**회귀 신호:** "165명" 표기 발견 시 → ① 즉시 정지 + 팀장님 보고 → ② grep 전수 추적 → ③ 일괄 정정 + 본 섹션 회귀 신호 갱신.

**예외 (165 다른 맥락 — 정합):** "165개 파일" / "165줄" / "라인 165" / RGB 165 / UUID 일부.

---

## 🛑 컨텍스트 안정화 위반 패턴 (2026-05-10 본 세션 사고 학습)

- `_INDEX.md` 200줄 초과 시 통째 못 읽음 → 분할 처방 위반
- 옛 분류(예: "Phase 1 잔여 5/15 후") 그대로 인용 → 본질 후순위 잘못 분류
- "활성 vs 폐기" 구분 모호한 채로 작업 진입
- 핵심 철학 4종 노출 안 된 채로 세부 작업 진입

→ 발견 즉시 응급 안정화 진입 (`docs/core/AI_COLLABORATION_STRATEGY.md` § 5 처방 정합)

---

*본 문서는 새 폐기·금지가 발견될 때마다 누적 박음. `/session-end` 자동 갱신 X, 수동 보강.*
