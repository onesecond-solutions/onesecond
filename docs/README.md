# docs/ — onesecond 운영체계

> docs는 저장소가 아니라 운영체계다.
> 모든 자료는 7개 폴더 중 한 곳에 분명한 위치를 가진다.

---

## 7폴더 역할 본질

| 폴더 | 역할 | 본질 |
|---|---|---|
| `strategy/` | **프로젝트 정체성 + 장기 방향** | 마스터 전략 / OS 정의 / 협업 표준 / role 체계 |
| `decisions/` | **중요한 의사결정 기록** | 한 번 내린 후 영구 보존 |
| `architecture/` | 시스템 아키텍처 | DB 스키마 / SQL / 운영 |
| `product/` | **현재 만들고 있는 것** | active 진행 중 사양 + backlog |
| `work_orders/` | **현재 해야 하는 것** | 진행 중 작업 지시서 |
| `sessions/` | **작업 과정 + AI 인계 기록 (Log)** | 시간순 누적 / 이력 추적 |
| `archive/` | 마감 자료 | 트랙 완주 / 결과 종료 / 폐기 |

> ⚠️ **sessions = Log (이력) 자리 / 현재 상태의 기준 X**
> 현재 상태 판단 = strategy + decisions + work_orders + product 통째 점검 후

---

## START PROTOCOL (신규 AI / 새 세션 진입 시 필수)

진입 시 반드시 아래 순서로 통째 점검:

| # | 자리 | 본질 |
|---|---|---|
| 1 | `strategy/master_strategy_v1.md` | 프로젝트 정체성 + 장기 방향 |
| 2 | **최근 중요 `decisions/`** | 본질 결재 자리 (단순 시간순 X / 중요 결정 판단) |
| 3 | `sessions/_INDEX.md` | 큰 그림 압축본 |
| 4 | `work_orders/` 안 active 자료 | 현재 해야 하는 것 |
| 5 | `product/` 안 active 사양 | 현재 만들고 있는 것 |
| 6 | 최근 `sessions/` 1~3개 | 직전 진행 흐름 |

→ 통째 점검 후 **반드시 아래 [오늘 작업 브리핑] 형식으로 먼저 보고**.

---

## 오늘 작업 브리핑 (START PROTOCOL 완주 후 필수 보고)

```
[오늘 작업 브리핑]

* 현재 진행 중 트랙:
* 어제 완료 사항:
* 미완료 작업:
* 오늘 우선순위 1~3:
* 주의사항 + 충돌 가능성:
```

→ 브리핑 본 후 **팀장님 승인 후 작업 시작**. (승인 전 작업 진입 금지)

### 오늘 우선순위 산출 방식

**4 자리 통째 종합 판단** (특정 자리 가중치 고정 X):

- `strategy/` = 회귀 신호 / 본질 변경 점검
- `decisions/` = 최근 중요 결재 본질 + 결재 자리 확정
- `work_orders/` = active 자료 + 최근 갱신 자리
- `product/` = active 사양 + 최근 갱신 자리

→ 4 자리 통째 점검 후 본인 추천 1~3 + 사유 안내 + 팀장님 결재.

---

## 운영 원칙 (8건)

### 기본 원칙 (6건)
1. **새 작업 시 즉시 폴더 신설 X** — 기존 자리 흡수 가능성 먼저 검토
2. **새 문서 신설 전 흡수 가능성 점검** — 기존 문서에 섹션 / 표 행 추가 우선
3. **동일 주제 = 한 문서** — 분할 금지
4. **폴더 최소 개수 유지** — 7개 고정, 무한 신설 금지
5. **AI와 사람이 5초 안에 위치 찾기** — 본 자료가 진입 자리
6. **docs는 저장소가 아니라 운영체계** — 운영 흐름 우선

### START PROTOCOL 원칙 (2건, 2026-05-24 신설)
7. **sessions만 읽고 작업 시작 금지** — 현재 상태 판단은 strategy / decisions / work_orders / product 기준
8. **최근 세션 몇 개만 보고 전체 방향 판단 금지** — 큰 그림 = strategy + decisions

---

## "어디로 가야 하지?" — 시나리오 빠른 안내

| 찾고 있는 자료 | 자리 |
|---|---|
| 새 세션 진입 / 오늘 무엇? | **START PROTOCOL 6단계 통째** (위 §) |
| 프로젝트 정체성 / 장기 방향? | `strategy/master_strategy_v1.md` |
| 시스템 본질 / OS 정의? | `strategy/os_definition_v2.md` |
| AI 협업 표준 / 작업 흐름? | `strategy/ai_collaboration.md` |
| 중요한 의사결정 본질? | `decisions/` 시간순 |
| 현재 만들고 있는 것? | `product/` 안 active 사양 |
| 현재 해야 하는 것? | `work_orders/` 안 active 자료 |
| DB 스키마 / SQL? | `architecture/db_schema.md` + `architecture/migrations/` |
| 이력 / 진행 과정 (Log)? | `sessions/` 시간순 (보조 자리) |
| 마감된 트랙 / 옛 자료? | `archive/YYYY-MM/` 시간순 |
| Chrome AI 의뢰 결과? | `sessions/` 안 해당 세션 노트 (인라인) |

---

## 진입자별 첫 자리

### 3개월 후의 본인 (오랜 후 다시 진입)
1. `strategy/master_strategy_v1.md` — 프로젝트 정체성
2. 최근 중요 `decisions/` — 그동안 내린 결정
3. `sessions/_INDEX.md` — 그동안 진행 상황 통째
4. `archive/` — 마감된 트랙 (필요 시)

### 신규 AI (다른 Claude 인스턴스 또는 새 세션 첫 진입)
→ **START PROTOCOL 6단계 통째 진입** (위 §)
→ 통째 점검 후 [오늘 작업 브리핑] 형식 보고 + 팀장님 승인 후 작업 시작

### 신규 개발자 (코드 진입자)
1. 루트 `README.md` (저장소 자체 안내) — 프로젝트 통째 인지
2. `docs/README.md` (본 자료) — 문서 구조 인지
3. `strategy/role_system.md` — 9개 role 체계
4. `architecture/db_schema.md` — DB 스키마
5. `architecture/navi_new_structure.md` — 사이트 구조

---

## 파일명 규칙 (요약)

| 카테고리 | 패턴 |
|---|---|
| 시간순 (세션 / 일회성) | `YYYY-MM-DD[_HHMM]_본질명.md` |
| 본질 (사양 / 전략 / 결정) | `본질명[_v버전].md` |
| 시간순 + 결정 | `YYYY-MM-DD_본질명.md` |

**기본 원칙:** 영문 소문자 + 언더스코어 우선 / 한국어 허용 / `YYYY-MM-DD` 통일 / 버전 = `v1`, `v2`.

→ **상세 규칙은 `strategy/ai_collaboration.md` 안 통합** (별 신설 0건).

---

## 문서 생명주기 (4단계)

```
[1. 신설] → [2. 진행] → [3. 마감] → [4. 영구 / 폐기]
work_orders/   work_orders/    archive/YYYY-MM/    strategy/ (영구 본질)
product/       product/                            archive/_deprecated/ (폐기)
```

---

## archive 이동 트리거 (5건 중 하나)

| # | 트리거 |
|---|---|
| 1 | 트랙 완주 (예: Phase 1.5 마감 → P1.5 자료 통째) |
| 2 | 결과 종료 (Chrome 의뢰서 = sessions/ 인라인 후) |
| 3 | 버전 업그레이드 (v1 → v2 = v1 archive) |
| 4 | 시점 경과 (7일 이상 활성도 0) |
| 5 | 폐기 결정 (archive/_deprecated/ 이동) |

→ **진짜 삭제 0건** (git 히스토리 영구 보존).

---

## 자동 흐름

| 자동화 | 흐름 |
|---|---|
| `/session-end` | 세션 종료 시 `sessions/` 자동 누적 + `_INDEX.md` 갱신 |
| `/session-start` | 새 세션 컨텍스트 패키지 자동 생성 (START PROTOCOL 6단계 통째 반영) |
| 매주 1회 점검 | `work_orders/` 안 7일 이상 활성도 0 자료 → archive 이동 (수동 결재) |

---

## 변경 이력

| 날짜 | 변경 |
|---|---|
| 2026-05-24 | 12폴더 → 7폴더 통합 + 본 README 신설 + START PROTOCOL + sessions 역할 정정 (Log만) |

---

**마지막 갱신: 2026-05-24**
**관리: Claude Code (`/session-end` 자동 갱신 시 본 자료 함께 점검)**
