# 프로젝트 네비게이션 가이드 (비개발자 운영용)

> 비개발자(팀장님)가 어떤 문서를 어디서 봐야 할지 한 페이지로 본다.
> "이게 어디 있더라" 헷갈릴 때 본 문서 한 번만 보면 답.

---

## 🔥 매번 보는 파일

| 상황 | 파일 |
|---|---|
| **영업·사업 본질 (모든 결정 기준)** ⭐⭐⭐ | **`docs/core/onesecond_master_strategy_v1_20260510.md`** ⭐ NEW (5/10) |
| **시스템 본질 (OS 정의, 양면 진실 원천)** ⭐⭐ | **`docs/core/onesecond_os_definition_v2_2026-05-07.md`** ⭐ |
| 오늘 뭐 하나 / 어디까지 진행됐나 | **`docs/02_CURRENT_STATUS.md`** ⭐ |
| 활성 방향 / 핵심 철학 / 일정 | **`docs/00_CURRENT_DIRECTION.md`** ⭐ |
| 어떤 게 폐기됐는지 / 절대 하지 말 것 | **`docs/01_DO_NOT_DO.md`** ⭐ |

---

## 🆕 새 AI(Claude / GPT 등) 들여놓을 때

- **`docs/03_AI_ONBOARDING.md`** — 5분 안에 방향 잡기 가이드
- 본 가이드를 먼저 새 AI에게 읽힌 후 작업 시작

---

## 📚 큰 그림 (Code 작업 진입 시)

- **`docs/sessions/_INDEX.md`** — 압축본 ~155줄 (전체 큰 그림 한눈)
- **`docs/sessions/_INDEX_1~4_*.md`** — 영역별 상세
  - `_INDEX_1_phase1.md` — Phase 1 18단계 + 결정 7건 + 4중 방어
  - `_INDEX_2_admin_v2.md` — admin_v2 Phase A~E + D-pre + 8섹션
  - `_INDEX_3_stars.md` — 별 트랙 + 미해결 #1~#51 + 결정 대기
  - `_INDEX_4_sessions.md` — 세션 로그 + 폐기 트랙
- **`docs/sessions/2026-05-XX_*.md`** — 직전 세션 인계 노트 (시간 역순 누적)

---

## 📂 폴더 한 줄 설명

| 폴더 | 역할 |
|---|---|
| `docs/00~04_*.md` ⭐ | **CURRENT 계층** (매번 읽기) |
| `docs/sessions/` | 세션 인계 노트 + 큰 그림 인덱스 |
| `docs/specs/` | 작업지시서 (Phase 1 v2 spec 등) |
| `docs/architecture/` | DB·인증·라우팅 raw 캡처 + Chrome 의뢰서 |
| `docs/decisions/` | 결정 문서 누적 (PITR / 안전장치 등) |
| `docs/core/` | OS 정의 + AI 협업 전략 (영구 진실 원천) |
| `docs/strategy/` | 전략 통합 (5/7 1163줄) |
| `docs/product/` | 콘텐츠 정책 |
| `docs/operations/` | 운영·체크리스트 |
| `docs/migrations/` | 마이그레이션 SQL 이력 |
| `docs/deprecated/` ⛔ | **절대 참조 금지 (폐기된 옛 문서)** |

---

## 🌳 코드 폴더 (라이브 운영 파일)

| 위치 | 파일 |
|---|---|
| **root** | `app.html`(셸 2017줄) / `index.html`(redirect 25줄) / `login.html`(redirect 30줄) / `pricing.html` / `privacy.html` / `terms.html` / `README.md` |
| **`pages/`** | `home_v2.html` ⭐ 메인 진입로 / `home.html`(셸 안 룰렛) / `board.html` / `scripts.html` / `quick.html` / `myspace.html` / `together.html` / `news.html` / `admin.html`(stub) / `admin_v2.html`(풀) / `about.html` / `pricing-content.html` / `_template.html`(코드 기준서) |
| **`css/`** | `tokens.css` (단일 파일) |
| **`js/`** | `auth.js` / `db.js` / `admin_v2.js` / `scripts-data.js` / `scripts-page.js` |
| **`assets/`** | 이미지 자산 (logo, preview 등) |

---

## ⚠️ 정리 대기 폴더 (3단계 별 세션)

본 폴더들은 옛 raw가 섞여 있어 **절대 참조 금지** (`01_DO_NOT_DO.md`):

- `claude_code/_archive/` — 4중 archive (3단계에서 `docs/90_ARCHIVE/`로 통합 예정)
- `claude_code/_context/` — 4/19 옛 컨텍스트
- `claude_code/_docs/supabase_dumps/` — 4/20 구버전 스냅샷
- `claude_code/_instructions/` — 4/19~25 옛 작업지시서
- `claude_deskktop/` — typo 폴더 (3단계 삭제)
- `claude_code/script_update/` — 5/3 신설, 사용 여부 미확인

---

## 🛟 사고 발생 시 어디 보나

| 상황 | 어디 보기 |
|---|---|
| Supabase DB 이상 신호 | `CLAUDE.md` § Supabase DB 작업 규칙 (첫 질문 강제) |
| 핵심 철학 회귀 신호 | `01_DO_NOT_DO.md` § 핵심 철학 회귀 금지 |
| AI가 옛 트랙 인용 | `01_DO_NOT_DO.md` § 무효화된 트랙 |
| 작업 큰 그림 모르겠음 | `_INDEX.md` 압축본 + `00_CURRENT_DIRECTION.md` |
| 어떤 작업 다음에 하지 | `02_CURRENT_STATUS.md` § 시급 Top 5 + 다음 액션 |

---

*본 문서는 폴더 구조 변경 시 갱신. 3단계 폴더 마이그레이션 후 통째 재작성 예정.*
