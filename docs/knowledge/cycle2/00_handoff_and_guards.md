# 지식엔진 사이클2 — 채굴 핸드오프 + 가드 (김실장용)

> 발신: 기획실장(Web) / 채굴 주체: **전략실장(김실장/GPT)** / PR 저장: **총괄팀장(Code)** / 승인: 대표(임태성) / 2026-06-10
> 본 문서 = Code가 준비한 **채굴 셋업**. 김실장이 이 베이스라인·가드로 채굴 → 산출물(review summary + proposed SQL)을 대표 보고 → Code 전달 → Code가 PR 저장(김실장·Web 직접 push 권한 없음).

## 0. 진실 원천 / 정합
- 신버전 Supabase = `pdnwgzneooyygfejrvbg`(Pro)만 참조. 구 ID(`qursjteiovcylqiepmlo`) 참조 금지.
- 사이클1 결과: 채굴 293 → 검수 276(PR #460), 하·확인불가 2차 웹검증 승격 64건. 이 학습 반영.
- **DB write 금지.** 산출물 = 제안 SQL·검수 후보까지. **대표 결재 전 적재 절대 금지(결재 관문).**

## 1. 가드 (불변 + 기획 보강)
- [불변] §4 방어선·중립 독립. **특정 원수사 상품 홍보성 항목 금지** — 법령·감독규정·일반 보험지식 중심.
- [불변] 비영리 방어선: 채굴물 = 교육 정보 → **전 티어 무료 동일 제공** 전제. 잘라 팔 항목으로 설계 금지.
- [기획] **검색 가치 우선**: 합격선 = "정확한 사실"이 아니라 **"현장 설계사가 실제로 검색할 질문/키워드에 걸리는가"**. 단순 사실 나열·검색어 없는 항목 = 등급 강등.
- [기획] **레이어 분리**: 후보는 knowledge(지식엔진) 레이어. `posts`(수요·**스마트 게시판**)·`insurer_posts`(공급)와 물리 혼입 금지.
- [기획] **호칭**: "현장 Q&A" 금지 → **"스마트 게시판"** 통일.

## 2. dedup 베이스라인 (기존 정본 235건 — 중복 제외 대상)
중복은 **문자열뿐 아니라 "같은 검색의도 다른 표현"까지** 판정. 기존 분포:
- `cycle1_mined` 92 (ai_draft) / `official_glossary` 50 (approved) / `cycle1_error_fix` 21 (ai_draft) / `newsletter` 72 (approved)

**라이브 진실 = 아래 읽기전용 SELECT로 현 정본 title 전수 확보 후 대조** (대표님이 신버전에서 실행 → 김실장 전달):
```sql
-- 🟢 읽기전용. 기존 정본 전수(중복 제외 베이스라인)
select source_type, category, confidence, title
from public.knowledge_entries
order by source_type, category, title;
```
repo 원본(참고): `docs/migrations/2026-06-09_knowledge_entries_cycle1_mined.sql`(92) / `2026-06-06_knowledge_entries_glossary50.sql`(50) / `2026-06-08_knowledge_cycle1_error_fix_load.sql`(21).

## 3. 출처 정합 (공식만)
- 허용: **법령**(예: 금소법 §46, 상법 보험편)·**감독규정**(금융위/금감원)·**협회**(생명·손해보험협회)·**원수사 공식 자료**. 법제처 찾기쉬운 생활법령(easylaw)·금감원 파인(fine.fss) OK.
- 배제: 블로그·카페·비공식 게시물.
- 사이클1 법령 정정 패턴 적용(예: 청약철회 14→15/30일 등 — 1차 채굴 오류를 공식 출처로 교정).

## 4. 산출물 형식
### 4-1. review summary (문서)
- 총 채굴 / 상·중 / 하·확인불가 분포
- 출처 분포(법령·감독규정·협회·원수사)
- **탈락·보류 사유표**(사유 코드화 권장: DUP=중복, NONOFF=비공식출처, NOSRCH=검색어부재, FACT=사실미확정 등)
- **검색의도 매칭 메모**(이 항목이 어떤 현장 검색어에 걸리는지)
- 채굴 메타 수기 기록: 일자 / 건수 / "사이클2" (※ `knowledge_logs` Phase3 미구축 = 자동 기록 안 됨)

### 4-2. proposed SQL (실행 금지·결재 대기)
- 테이블 = `public.knowledge_entries`, **상태값 `status='ai_draft'`**, `source_type='cycle2_mined'`(기존과 구분).
- 컬럼 순서(정합): `(type, title, body, category, tags, source_type, source_id, source_title, status, confidence, created_by)`.
- **상/중 후보만** 본 SQL. 하·확인불가 = 2차 웹검증 트랙으로 **별도 적치**(사이클1 방식).
- 한글·여러 줄 JSON/배열 주의: 0x0d(CRLF) 함정 — 배열은 `array[...]` 형식 유지(사이클1과 동일), raw JSON 리터럴 지양.

## 5. 범위 밖
- 보류 5건 재판정(소급면책·미공개사항 등) = 사이클2 신규 채굴과 **섞지 말고 별 트랙** 보고.

## 6. 저장 경로
- 본 핸드오프: `docs/knowledge/cycle2/00_handoff_and_guards.md`
- 김실장 산출물(전달 시 Code가 저장): `docs/knowledge/cycle2/review_summary.md` + `docs/knowledge/cycle2/proposed_cycle2_mined.sql`
- main 직접 push 금지 → Code가 브랜치+PR.
