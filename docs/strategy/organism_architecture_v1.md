# 원세컨드 데이터 유기체 아키텍처 v1 — 상위 운영 원칙 (진실 원천)

> **확정일:** 2026-07-07 (대표님 확정)
> **위치:** CLAUDE.md START PROTOCOL 대원칙 배너의 진실 원천 · 매 세션 필독
> **상태:** 상위 운영 원칙. 화면·데이터·기능 결정 시 본 문서 우선.
> **정합:** `master_strategy_v1.md` §11(검색 가능 구조화 = 진짜 권력)의 구조적 실체. 회귀 아니라 본질 강화.

---

## §1. 대원칙 (대표님 확정 문구)

**원세컨드는 하드코딩 페이지 모음이 아니다. 보험 데이터를 중심으로 여러 화면이 조회·재조립되는 유기체 구조로 간다.**

하드코딩 페이지 추가 방식은 **원칙적으로 중단**한다. **데이터 원장 → DB → 검색/채굴 → 화면 재사용** 구조를 우선한다.

같은 데이터를 상품라인업 화면·알릴의무 페이지·통합검색·스마트 설계서·상담자료·고객용 보기에서 반복 재사용할 수 있어야 한다. 원세컨드는 페이지를 만드는 사이트가 아니라, 보험 데이터를 중심으로 여러 화면이 연결되는 유기체다.

---

## §2. 유기체 구성 — 뼈대 · 피 · 순환계 · 결과물

### 정적 지식 DB = 뼈대
변화 느리고 **정확성**이 생명. 흐름 = 원장 JSON → 검수 approved → DB → 화면.
- 상품라인업
- 알릴의무
- 실손 세대
- 담보/치료비 지식
- 보험 용어

### 동적 현장 데이터 = 피
사람이 계속 입력. **실시간성·생동감**. 흐름 = 입력 → RAW 즉시 검색 → 채굴 훅 → raw/ai_draft → 검수 → approved.
- 원수사 자료실
- 보험 Q&A
- 소식지
- 현장 입력 자료
- 사람이 계속 올리는 질문과 답변

### 검색·채굴·태그·요약·관련도 보강 = 순환계
피를 거의 실시간으로 수확해 검색·태그·동의어·관련 상품·관련 알릴의무·스마트 설계서 재료로 연결. 이 순환이 돌아야 원세컨드가 살아있는 사이트가 된다.

### 스마트 설계서 · 고객용 보기 = 결과물
뼈대 + 피를 조회해 재조립한 산출물. 고객용 보기 화면은 스마트 설계서 payload와 동일 소스를 재사용.

```
            [ insurers ]  회사 마스터 (유일하게 실재·조회 중인 등뼈)
                 │ id
        ┌────────┴────────┐
 [insurer_products]   (회사 스냅샷·소식지)
   상품 마스터  ← 2026-07-03 DDL 설계됨(DRAFT·미실행)
        │ id (FK)
   ┌────┴────────────┐
[상품 월 스냅샷]   [goji_disclosures]  ← 알릴의무 (product_id로 연결)
 라인업(테마)

[silson_generations]  ← 실손 세대: 회사·상품 무관 "제도 지식" 독립 축
[담보/치료비 지식] · [보험 용어]  ← 정적 뼈대 (스키마 미착수)

── 피(동적) ───────────────────────────────
[posts board_type=insurer]  원수사 자료실   ┐
[posts board_type=qna] + [comments]  Q&A   ┼─ 순환계(채굴) → knowledge_entries(ai_draft→approved)
[newsletters]  소식지                        ┘   → 검색·태그·동의어·관련도
```

---

## §3. 화면 추가 4대 질문 (하드코딩 착수 전 강제)

새 화면·기능을 만들기 전 반드시 자문한다. 하나라도 답이 막히면 하드코딩 대신 데이터 원장부터 설계한다.

1. 이 화면이 **어떤 데이터 원장**을 조회하는가?
2. 그 데이터는 **어디서 관리**되는가?
3. **다른 화면에서도 재사용** 가능한가?
4. **권한 격리**는 지켜지는가?

---

## §4. 채굴 헌장 7조건 (절대 · 대표님 확정)

동적 채굴은 권한 격리를 절대 깨면 안 된다.

1. **권한 격리 절대 유지**
2. **공개/공유 가능한 범위만 채굴**
3. 개인 자료·팀 제한·지점 제한 자료를 **플랫폼 공용 지식으로 흡수 금지**
4. **원문을 그대로 빼앗는 구조 금지** (원본은 제자리, 채굴은 곁에 메타데이터만 부가)
5. **검색성·태그·요약·관련도만 안전하게 보강**
6. 채굴 결과 **raw / ai_draft 분리**
7. 사람 **검수 전 approved 지식으로 승격 금지**

### 채굴팀 목표 재정의
남의 자료를 공용화하는 게 아니다. **각 자료가 가진 권한 범위 안에서** 검색 가능성·관련도·태그·요약·연결성을 높이는 것이다. 공개 가능한 자료만 공용 지식 후보가 되고, **소속 제한 자료는 그 소속 안에서만 살아 움직인다**(scope 상속 — 채굴 산출물이 원본의 공개범위를 그대로 물려받음).

---

## §5. 두 트랙 분리 설계

| | 정적 지식 트랙 (뼈대) | 동적 채굴 파이프 (피) |
|---|---|---|
| 성격 | 정확성 우선 | 실시간성·생동감 우선 |
| 소스 | 원장(상품라인업·알릴의무·실손세대·담보/치료비·보험용어) | 사람 입력(원수사 자료실·Q&A·소식지·현장자료) |
| 흐름 | 원장 JSON → 검수 approved → DB → 화면 | 입력 → RAW 즉시검색 → 채굴 훅 → raw/ai_draft → 검수 → approved |
| 노출 게이트 | published | approved 전 공용 승격 금지 |
| 격리 | 회사·상품 마스터 연결 | scope 상속 |
| 변화 속도 | 느림 | 실시간 |

---

## §6. 현황 진단 (2026-07-07 조사 실측 · 설계 출발점)

### 살아있는 등뼈는 하나뿐
실제 DB를 조회하는 건 `insurers`(회사 마스터)뿐. 나머지는 하드코딩 또는 정적 JSON.

| 자산 | 현재 형태 | 위치 |
|---|---|---|
| 실손 세대 | **전량 하드코딩** | `pages/silson-generations.html` (표·카드 250줄), app.html:3523 iframe 로드 |
| 상품 라인업 | JSON 파일 + 삼성화재 JS 배열 하드코딩 | `data/insurer_products_2607.json` 246건, `loadProductLineup` app.html:12293 / 삼성 12191-12226 |
| 알릴의무 | JSON 파일 | `data/goji_records.json` 114건, `#v-goji` app.html:13143 |
| 회사 마스터 | **DB 테이블 실재·조회 중** | `insurers` (fetch app.html:6088 등) |
| 상품 마스터 | 스키마 설계만(DRAFT 실행금지) | `db/migrations/2026-07-03_product_lineup_schema.sql` (7테이블) |
| 알릴의무 스키마 | JSON 초안 | `docs/work_orders/2026-07-07_goji_disclosure_schema_draft.json` (`goji_disclosures`) |

### 동적 데이터·채굴 현황
- posts 단일 테이블, `board_type`(insurer/qna/community) 구분. Q&A 답변 = `comments` 별 테이블.
- **보험Q&A** = 검색 RAW 실시간 가동(질문+답변), **채굴 미연동**.
- **원수사 자료실**(insurer) = **검색조차 미반영**(검색 groups에 qna만·insurer 없음) + 채굴 미연동.
- **채굴 파이프** = `extract-knowledge`(newsletter만) + **`mine-batch` v1d**. mine-batch가 posts(qna/insurer)를 읽되 `evaluateSourceEligibility`가 전부 `internal_only`→discarded(너무 보수적). **실행 0회·cron 미등록·CRON_ENABLED=false·dry_run 기본·자동 approved 0·MINE_SECRET 분리 인증.**
- **핵심:** mine-batch v1d가 헌장 6·7·3조건(ai_draft 분리·검수 전 승격 금지·internal_only discard)을 이미 구현. 열려면 eligibility에 **공개 판별**(`branch_id IS NULL` + `author_type='platform'`) 추가만 하면 됨. **신축 아니라 헌장대로 개방.**
- 동의어 = `data/search_synonyms.json` 정적 수동 수확(`knowledge_synonyms` 테이블 미사용). 지능층 자동화 없음.
- 실시간 훅: `trg_notify_post`(posts qna/insurer INSERT→push) **활성** = 유일 채굴 훅 후보. 단 트리거→Edge 직접호출은 2026-06-23 push broadcast 폭주 사고 이력 → **cron `*/N` + 멱등(`knowledge_mining_state`)이 더 안전**. `team_notices` 트리거 = DISABLE(재활성 금지). `ocr-batch` */5 가동.

---

## §7. 재사용 매핑 (같은 row, 6개 화면)

| 화면 | 조회하는 DB |
|---|---|
| 상품라인업 화면 | `insurer_products` + 스냅샷 + themes |
| 알릴의무 페이지 | `goji_disclosures` (product_id 조인) |
| 통합검색 | 뼈대 + 피 전부 인덱싱 |
| 스마트 설계서 | `goji_disclosures`(확정·approved) + `silson_generations`(세대 판정) + `insurer_products` + 담보/용어 |
| 상담자료 | 위 조합 |
| 고객용 보기 | 스마트 설계서 payload (동일 소스) |

---

## §8. 전환 로드맵 (하드코딩 추가 중단 → 원장→DB→화면 조회)

공통 흐름 = **JSON 원장 → 검수 approved → DB → 화면 배선** (임태성 게이트 우선, 회귀 최소).

- **Phase 1 (파일럿) — 실손 세대**: 가장 고립·저위험(5 row). 전 사이클 1회전 검증.
- **Phase 2 (등뼈) — 상품 마스터**: 2026-07-03 DDL 실행 + `insurers` 연결.
- **Phase 3 — 알릴의무**: `goji_disclosures` DDL화 + goji 114를 상품 id에 매핑.
- **Phase 4 — 상품라인업 배선**: `loadProductLineup` JSON→DB, 삼성 하드코딩→스냅샷 흡수.
- **동적 트랙(병행)**: (a) 원수사 자료실 검색 반영(검색 groups에 insurer 추가·저위험 큰 효과) (b) mine-batch eligibility에 공개 판별 추가 → posts 채굴 개방 (c) 실시간 방식 = cron `*/N`(안전) — 트리거→Edge 직접호출은 폭주 이력으로 지양.

### 방향 확정 (2026-07-07 대표님 · 실행은 다음 세션부터 순서대로)
1. **정적 파일럿 = 실손 세대부터** — 독립 축·5 row 저위험·전환 사이클 검증용
2. **검수·발행 게이트 = approved/published 통일** — 검수 전 화면 노출 금지, approved만 재사용
3. **문자열→id 매핑 = 상품 마스터 확정 후 일괄 트랙** — 회사명/상품명 문자열 매칭 지속 금지, 상품 마스터 id를 등뼈로 세운 뒤 연결
4. **동적 착수 = 원수사 자료실 검색 반영부터** — 트리거 직접호출 지양(알람 폭주 이력), cron 기반 채굴 또는 안전 큐, 권한 격리·공개 범위 필터 먼저 확정

> **4건 동시 실행 금지. 순서대로 간다. 다음 세션 첫 작업 = 실손 세대 DB화 파일럿 작업안 1건만.** 상세 = `docs/work_orders/2026-07-07_silson_generation_db_pilot.md`

---

**관련 메모리:** `organism_two_track_mining_charter` · `self_growth_search_system` · `unified_search_isolation_verified` · `feedback_no_platform_asset_absorption_copy`
