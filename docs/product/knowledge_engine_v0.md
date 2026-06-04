# 보험 지식 엔진 v0 — 구조 설계 (2026-06-04)

> **상태:** 구조 설계 단계 (실행 전). 오늘 = 설계까지만 / 밤·주말 = 샘플 20~30건 자율 실행 / 승인 후 = 전체 확장.
> **본질:** master_strategy §11 "검색 가능 구조화 = 진입장벽" + "보험판 구글 = 검색창이 아니라 **살아있는 보험 백과사전**".
> **핵심 원칙:** AI는 추출·구조화 엔진 / 팀장님(17년 현장)은 정확성 검증 / **실데이터가 진실의 원천**(AI 머릿속 일반지식 X → 환각 방지).

---

## 🔒 절대 원칙 7 (팀장님 지시 2026-06-04)

1. **검색창 비노출 유지** — 이번 작업이 검색 UI를 켜지 않는다.
2. **기존 동작 영향 금지** — 홈/Quick/MY SPACE/스크립트/자료실 코드·동작 무변경.
3. **소스는 읽기 중심** — newsletters / 카톡 / 네비방 데이터는 **SELECT만**, 절대 수정·삭제 안 함.
4. **격리 저장** — 결과는 **신규 테이블 + 관리자 전용(admin RLS) + AI초안(status=ai_draft) 상태로만**.
5. **기존 검색 로직 미반영** — search-answer / 통합검색에 아직 연결 안 함.
6. **샘플 먼저** — 20~30건으로 **비용·시간·품질 실측** 후 판단.
7. **승인 게이트** — 샘플 결과 보고 → 팀장님 승인 → 전체 채굴.

---

## 📥 데이터 소스 (읽기 전용)

| 소스 | 규모 | 가치 |
|---|---|---|
| `newsletters` (DB 본문화 완료) | 525건 | 용어·상품·보험사 공지 (정제된 텍스트) |
| 카톡 마이그레이션 (`work folder/` + 네비방 적재분) | 17,786줄 | **실제 현장 질문·답변 = 시나리오집 금광** |
| `posts` board_type=navigation | 6,889건 | 현장 질의·정보 흐름 |

→ 모두 **SELECT 전용**. 추출 결과는 **별도 테이블**에만 쌓는다 (소스 무변경).

---

## 🗄️ 지식 코퍼스 구조 (신규 테이블 — 설계안, 실행 전)

```sql
-- 실행은 샘플 단계에서 (오늘은 설계만). 신버전(pdnwgzneooyygfejrvbg) 기준.
create table if not exists public.knowledge_entries (
  id           bigserial primary key,
  type         text not null,          -- 'term' | 'scenario' | 'insurer' | 'onesecond_term'
  title        text not null,          -- 용어명 / 시나리오 제목 / 보험사명
  body         text,                   -- 정의 / 설명 / 시나리오 본문
  category     text,                   -- 분류 (계약·보장·인수·판매·민원 등)
  tags         text[],                 -- 검색 키워드
  source_type  text,                   -- 'newsletter' | 'kakao' | 'navigation' | 'manual' | 'ai_general'
  source_ref   text,                   -- 출처 id/링크 (newsletters.id 등 — 근거 추적)
  status       text not null default 'ai_draft',  -- 'ai_draft' | 'reviewed' | 'published'
  confidence   text,                   -- AI 추출 신뢰도 'high'|'med'|'low'
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   text
);
alter table public.knowledge_entries enable row level security;
-- 관리자 전용 (사용자 노출 0). is_admin() SECURITY DEFINER 재사용.
create policy knowledge_admin_all on public.knowledge_entries
  for all to authenticated using (is_admin()) with check (is_admin());
```

**핵심 설계 포인트:**
- `source_ref` = **근거 추적** (어느 소식지/카톡에서 나왔는지) → 환각 검증 + 출처 표시 가능.
- `status=ai_draft` 기본 → **검증 전엔 어디에도 노출 안 됨**.
- `is_admin()` RLS → **사용자 RLS·기존 테이블 무관**, 완전 격리.

---

## ⚙️ 추출 파이프라인 (설계 — workflow 다중 에이전트, 서버 자율)

```
[소스 SELECT (읽기)] → [에이전트: 용어·시나리오·보험사특징 추출]
   → [분류 + 신뢰도 판정 + source_ref 부착] → [knowledge_entries INSERT (status=ai_draft)]
```

- **서버 자율 실행** (PC 꺼져도): Workflow로 N건 동시 처리 / 향후 스케줄 에이전트로 신규 자료 자동 갱신(5단계).
- 각 항목은 **반드시 source_ref**(근거) 동반 → 검증 가능.
- AI 단독 일반지식(`source_type=ai_general`)은 **별도 표시 + 검증 필수**(환각 격리).

---

## 🧪 샘플 계획 (밤/주말 — 측정용)

1. `knowledge_entries` 테이블 생성 (관리자 전용).
2. **소식지 20~30건만** 읽어 추출 → ai_draft 저장.
3. **실측 보고:** 토큰 비용 / 소요 시간 / 추출 품질(샘플 검토) / 건당 평균.
4. → 그 수치로 전체(525+17,786+6,889) 견적 산출 → 승인 게이트.

**측정 지표:** 건당 토큰·비용, 건당 시간, 추출 정확도(팀장님 표본 검수), 중복·노이즈 비율.

---

## 🗺️ 단계 로드맵

| 단계 | 내용 | 시점 |
|---|---|---|
| 0 | **구조 설계 (본 문서)** | ✅ 오늘 |
| 1 | 기초 사전 100개 seed (AI 초안 → 검증) | 샘플과 병행 가능 |
| 2 | **소식지 샘플 20~30건 채굴 + 실측** | 밤/주말 |
| 3 | (승인 후) 전체 채굴: 소식지 525 + 카톡 17,786 + 네비방 6,889 | 승인 후 |
| 4 | 관리자 검토 UI (ai_draft → reviewed → published) | 채굴 후 |
| 5 | search-answer(AI 검색)에 published만 연결 (RAG) | 검증·승인 후 |
| 6 | 신규 자료 자동 갱신 (스케줄 에이전트 = 살아있는 백과사전) | 최종 |

---

## ⚠️ 정직한 한계 (설계 전제)

- **AI 강점:** 용어 정의·구조화·분류·요약·시나리오 추출 = 매우 높음.
- **AI 위험:** 한국 보험 현행 디테일(특정 인수기준·수치)을 **단독 생성하면 환각** 가능 → 그래서 **실데이터 grounding + source_ref + 검증 게이트**로 막는다.
- **published 게이트:** 검증(`reviewed`) 안 된 항목은 절대 사용자·검색에 노출 안 됨.

---

## 기존 자산·전략 연계

- master_strategy §11 (진입장벽 = 검색 가능 구조화), §1 (검색 인프라).
- 기존 `newsletters` + `search_newsletters` RPC + `search-answer` Edge Function (이미 구축됨) — 지식 엔진은 그 위에 **published 지식층**을 얹는 구조. 단, **본 단계에선 미연결**(원칙 5).
