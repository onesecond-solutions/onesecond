# 새 AI 첫 진입 가이드 (5분 안에 방향 잡기)

> 본 문서는 새 AI(Claude Code / Claude AI / Claude in Chrome / GPT 등)가 원세컨드 프로젝트에 진입할 때
> **5분 안에 활성 방향을 잃지 않게 만드는 가이드**다.

---

## 1. 무조건 먼저 읽을 파일 (순서 그대로)

| # | 파일 | 분량 | 역할 |
|---|---|---|---|
| **0** | **`docs/strategy/master_strategy_v1.md`** ⭐⭐⭐ | 507줄 | **영업·사업 본질 (모든 결정 기준, 매 세션 첫 진입 강제)** |
| **0'** | **`docs/strategy/os_definition_v2.md`** ⭐⭐ | 540줄 | **시스템 본질 (OS 정의, 양면 진실 원천)** |
| 1 | `CLAUDE.md` (root) | ~200줄 | 절대 프로토콜 (DB 규칙·9역할·세션 시작 보고) |
| 2 | `docs/00_CURRENT_DIRECTION.md` ⭐ | ~50줄 | 현재 활성 방향 + 핵심 철학 4종 |
| 3 | `docs/01_DO_NOT_DO.md` ⭐ | ~100줄 | 절대 금지 (이거 위반하면 큰 사고) |
| 4 | `docs/02_CURRENT_STATUS.md` ⭐ | ~50줄 | 오늘 진행 상태 + 시급 Top 5 |
| 5 | `docs/sessions/_INDEX.md` | ~160줄 | 큰 그림 압축본 |

총 ~1607줄, 모든 AI 컨텍스트 한도 내에서 통째 들어감 (양면 진실 원천 박힘).

---

## 2. 브랜드 정체성 (0순위, 모든 결정의 기준) ⭐⭐⭐

**중립 독립 SaaS** — 원세컨드는 어느 보험회사·GA에도 소속되지 않은 독립 SaaS. 모든 사업 결정은 **"현장 전체 기준"의 중립 위치**에서.

| 본진 | 회귀 신호 (즉시 보고) |
|---|---|
| 중립 독립 SaaS | ❌ 특정 보험사 기능 중심 / ❌ 특정 GA 편향 UX / ❌ 폐쇄형 조직 SaaS 해석 |

오해 방지: 4팀(AZ 더원) = 5/15 첫 사용자 검증이지 영구 단독 고객 X.

## 3. 핵심 운영 철학 4종 (절대 잊지 말 것) ⭐⭐⭐

| # | 본진 | 회귀 금지 |
|---|---|---|
| 1 | **현장의 소리 = 질문 운영 시스템** | 커뮤니티형 게시판 X / CRM·SaaS X |
| 2 | **home_v2 = 운영형 홈** | 랜딩페이지 X |
| 3 | **Quick 메뉴 = 긴급 실행도구** | 일반 메뉴 X |
| 4 | **고정 프레임 구조 = 앱 셸** | 단일 셸 + 동적 메뉴 로드 / iframe·다중 페이지 X |

회귀 신호 발견 시 작업 중단 + 즉시 팀장님 보고.

---

## 3. 작업 시작 전 필수 확인 (CLAUDE.md 정합)

- **Supabase 신버전:** `pdnwgzneooyygfejrvbg` (프로젝트명 `onesecond-v1-restore-0420`)
- **구버전 절대 참조 금지:** `qursjteiovcylqiepmlo` (4/24 사고 후 폐기)
- **9역할 체계:** admin / ga_* 4종 / insurer_* 4종
- **세션 시작 보고 4건:** 최신 commit / 현재 브랜치 / 미커밋 변경 / 최근 세션 요약
- 작업 진입 시 `_INDEX.md` 큰 그림 정합성 검증 (CLAUDE.md "절대 프로토콜")

---

## 4. 폴더 우선순위 (위에서 아래)

| 우선 | 폴더/파일 | 역할 |
|---|---|---|
| ⭐ 매번 | `docs/00~04_*.md` | CURRENT 계층 |
| 큰 그림 | `docs/sessions/_INDEX.md` (+ `_INDEX_1~4_*.md`) | 큰 그림 인덱스 |
| 직전 인계 | `docs/sessions/2026-05-XX_*.md` | 가장 최근 세션 인계 |
| 작업 spec | `docs/specs/v2_*.md` | 활성 작업지시서 |
| DB raw | `docs/architecture/db_*.md` | DB·Chrome 의뢰서 |
| 결정 이력 | `docs/decisions/` | 결정 문서 누적 |
| 영구 진실 | `docs/strategy/ai_collaboration.md` + OS 정의 | 본 PC 영구 진실 원천 |
| ⛔ 절대 X | `docs/archive/_deprecated/` + `claude_code/_*` | 옛 raw, 절대 참조 금지 |

---

## 5. 사고 시 행동

- "DB가 이상해 보이면 보고 있는 프로젝트부터 의심" (CLAUDE.md)
- 23503 FK 위반 = (가) RLS + (나) row 부재 둘 다 검증
- 추정 단정 금지 — raw SQL 또는 grep로 확인 후 답변
- 큰 그림 놓침 사고 = `_INDEX.md` 압축본(~155줄) 통째 읽기 (200줄 초과 시 분할 처방 위반)
- 옛 raw 매칭 시 `01_DO_NOT_DO.md` 위반 여부 즉시 확인

---

## 6. 협업 시 권장 패턴

- **의견 의뢰 시 옵션 묶음 (a)/(b)/(c) 단답형** — 팀장님 작업 스타일 메모리 정합
- 사양 확정 즉시 실행 (마이크로 디테일 묻기보다 큰 그림 정합성 우선)
- "맞다 싶으면 바로"이지만 **큰 그림 정합성은 엄격** (CLAUDE.md 절대 원칙)
- 진단 사고 신호 발견 시 두 가설 동시 검증 (메모리 `fk_violation_dual_hypothesis.md` 정합)

---

## 7. 다중 AI 인계 프로토콜 (메모리 `ai_handoff_protocol.md` 정합)

- Claude AI(웹/앱 채팅) = 총괄 기획자 (전략·작업지시서 MD 작성)
- Claude Code = 실행 개발자 (코드·Supabase·Git)
- Claude in Chrome = 브라우저 검증자 (라이브 시연)

각 AI 컨텍스트 격차 발생 시 진실 원천(GitHub) 즉시 archive로 동기화.

---

*본 문서는 새 AI가 첫 진입할 때 통째 읽힘. 이후 영역별 상세 파일로 부분 로드.*
