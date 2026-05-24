# 자동 허브 이식 시스템 v1 — Spec

> **파일명:** `auto_hub_promotion_v1_spec.md`
> **작성일:** 2026-05-16
> **작성 주체:** Claude Code
> **결재 상태:** 7건 통째 승인 (2026-05-16 팀장님)
> **트리거:** 5/18 4팀 오픈 이후 본진 진입 (D+1 이후)
> **분량 추정:** spec ~3시간 / 구현 ~2~3주
> **상위 본진:** 마스터 전략 §3, §4, §11 / OS v2 §16
> **연관 메모리:** [[news_system]] [[ai_handoff_protocol]] [[ai_collaboration_priority]]

---

## 📑 본 spec 구성

| § | 영역 | 본질 |
|---|---|---|
| 1 | 본질 (Why) | 보험판 구글 = 검색 가능 구조화 진입장벽 |
| 2 | 4 layer 데이터 흐름 | 네비방·스마트게시판·보험사게시판 → 허브 |
| 3 | 승급 알고리즘 | 룰 + AI 하이브리드 |
| 4 | DB 스키마 변경 | posts 메타 컬럼 추가 마이그레이션 |
| 5 | 구조화 데이터 추출 | 정규식 + Claude API 하이브리드 |
| 6 | 검색 인덱스 | PostgreSQL FTS + pgvector 병행 |
| 7 | admin UI + 단계별 로드맵 | admin_v2 통합 + 4 phase 구현 |

---

## §1. 본질 (Why)

### 핵심 명제 (마스터 전략 §11 정합)

> **자료 보유 = 진입장벽 X**
> **검색 가능 구조화 = 진입장벽 ✅**

### 산업 현황

보험 업계에 이미 넘쳐나는 것:
- 자료 / PDF / 소식지 / 단톡방 정보 / 매니저 답변

진짜 문제:
- **검색이 안 됨** — 카톡 위로 밀려 사라짐, 회사별 자료 흩어짐, 매니저별 답변 격차

### onesecond 답

상품 / 인수 / 공지 / 질문 / 답변 / 사례 → **모두 검색 가능 구조** 로 변환

### 허브게시판 = 보험판 구글

- 4 레이어(네비방·스마트게시판·보험사게시판) 데이터 → 자동 선별 → 허브로 승급
- 허브 = 모든 팀·지점이 검색하는 공용 저장소
- 한 번 사용 후 빠져나갈 수 없는 구조 = 락인 본진

### 핵심 KPI (검증 지표, 마스터 전략 §12 정합)

| # | 지표 | 측정 방법 |
|---|---|---|
| 1 | 검색으로 해결된 질문 % | 새 질문 vs 기존 검색 클릭 비율 |
| 2 | 동일 질문 반복률 ↓ | 같은 케이스 패턴 재질문 빈도 추적 |
| 3 | 허브 승급 정확도 | admin 회수율 (잘못 승급된 비율) |
| 4 | 검색 응답 시간 | < 200ms (FTS + vector 하이브리드 목표) |

---

## §2. 4 Layer 데이터 흐름

### 전체 흐름도

```
┌─────────────────────────────────────────────────────────┐
│ Input (3 source layers)                                  │
├─────────────────────────────────────────────────────────┤
│ ① 네비게이션방 (navigation)                              │
│   - 지점 단위 운영                                        │
│   - 설계사 질문 + 보험사 매니저 답변                       │
│                                                          │
│ ② 스마트게시판 (qna)                                     │
│   - 보험회사 임직원 작성 자료 (상품/인수/기타)              │
│   - admin이 네비방에서 정제·이전한 글                       │
│                                                          │
│ ③ 보험사 게시판 (insurer)                                │
│   - 인큐베이션 단계 = admin 외 비공개                      │
│   - 네비방 질문 → 자동 전달 → 보험사 답변 → 네비방 반영     │
└─────────────────────────────────────────────────────────┘
                          ↓
         ┌─────────────────────────────────────┐
         │ 자동 선별 알고리즘 (§3)               │
         │  - 룰 기반 1차 필터                   │
         │  - AI 판정 2차 (Claude API)          │
         └─────────────────────────────────────┘
                          ↓
         ┌─────────────────────────────────────┐
         │ 구조화 데이터 추출 (§5)               │
         │  - 정규식 1차                        │
         │  - Claude API 2차 보강               │
         └─────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Output (Hub layer)                                       │
├─────────────────────────────────────────────────────────┤
│ ④ 허브게시판 (hub)                                       │
│   - 단일 row + promoted_to_hub flag (결재 4)             │
│   - FTS + pgvector 인덱스 (§6)                          │
│   - 모든 팀·지점 공통 검색                                 │
└─────────────────────────────────────────────────────────┘
```

### 흐름 본진 (마스터 전략 §3·§4 정합)

- 일방향 자동 저장 (§13 결재 #2 정합 — 양방향 미러링 표현 폐기)
- 네비방 질문 → 보험사 게시판 자동 전달 (역방향) → 답변 → 네비방 반영
- 스마트게시판 = 일반 사용자 글 작성 X (admin만 정제·이전)

---

## §3. 승급 알고리즘 (결재 1 + 2 + 3)

### 결재 1: 하이브리드 (룰 + AI)

1차 = 룰 기반 필터 / 2차 = Claude API 판정.

**Why:** 룰 기반만으로는 미묘한 양질 판정 어렵고, AI만으로는 비용·지연 발생. 하이브리드 = 비용 절감 + 품질 확보.

### 결재 2: 승급 신호 5종

| 신호 | 측정 방법 | threshold |
|---|---|---|
| (a) 답변 수 | `COUNT(replies) WHERE parent_id = post.id` | ≥ 3 |
| (b) 회사 다양성 | `COUNT(DISTINCT display_name) WHERE kind='answer'` | ≥ 3 |
| (e) 북마크 수 | `COUNT(*) FROM bookmarks WHERE post_id = post.id` | ≥ 5 |
| (f) 구조화 답변 | 보험사명 / 상품명 / 한도 패턴 박힌 답변 수 | ≥ 2 |
| (g) admin 수동 | `admin_promoted_at IS NOT NULL` | 1 (즉시) |

### 결재 3: 트리거 (하이브리드)

| 트리거 | 처리 |
|---|---|
| admin 수동 승급 | 즉시 (실시간) |
| 사용자 북마크 5번째 도달 | 즉시 (실시간) |
| 답변 수 / 회사 다양성 / 구조화 점수 | Batch (cron, 1시간 주기) |

### 점수 계산 공식

```
점수 = w_a × min(답변수, 10)/10
     + w_b × min(회사다양성, 5)/5
     + w_e × min(북마크수, 10)/10
     + w_f × min(구조화점수, 5)/5
     + w_g × admin_boost
```

가중치 초기값 (튜닝 가능):
- w_a = 0.25 (답변 수)
- w_b = 0.30 (회사 다양성 — 가장 본진)
- w_e = 0.20 (북마크)
- w_f = 0.15 (구조화)
- w_g = 0.10 (admin boost, 수동 승급 시 1.0)

**threshold = 0.6 이상 → 자동 승급**

### 2차 AI 판정 (점수 통과 후)

Claude API 호출:
- 입력 = post 본문 + 답변들
- 출력 = `{should_promote: true/false, confidence: 0.0~1.0, reason: "..."}`
- threshold = confidence ≥ 0.7 → 최종 승급

비용 관리:
- AI 호출 = batch 결과 통과한 자료에만 (1차 룰 필터로 ~90% 박지 X)
- 일일 한도 (예: 100건/일) → 초과 시 다음 batch로 이월

---

## §4. DB 스키마 변경

### 마이그레이션 SQL (계획)

```sql
-- ============================================================================
-- 자동 허브 이식 시스템 v1 - 스키마 마이그레이션
-- 작성: 2026-05-16 / 적용 트리거: 5/18 D-Day 후
-- ============================================================================

BEGIN;

-- 결재 4: Flag 방식 - posts에 메타 컬럼 추가
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS promoted_to_hub      boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS promoted_at          timestamptz,
  ADD COLUMN IF NOT EXISTS promoted_score       numeric(4,3),
  ADD COLUMN IF NOT EXISTS promotion_signals    jsonb,
  ADD COLUMN IF NOT EXISTS admin_promoted_by    uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS admin_promoted_at    timestamptz,
  ADD COLUMN IF NOT EXISTS structured_meta      jsonb,
  ADD COLUMN IF NOT EXISTS hub_anonymized_name  text;

COMMENT ON COLUMN public.posts.promoted_to_hub IS '허브게시판 자동 승급 여부 (결재 4 Flag 방식)';
COMMENT ON COLUMN public.posts.promoted_score IS '승급 점수 0.000~1.000 (§3 점수 공식)';
COMMENT ON COLUMN public.posts.promotion_signals IS '승급 신호 raw (a/b/e/f/g 각각의 값)';
COMMENT ON COLUMN public.posts.structured_meta IS '구조화 추출 결과 (case_pattern/keywords/companies/products 등, §5)';
COMMENT ON COLUMN public.posts.hub_anonymized_name IS '허브 표시용 익명화 발신자명 (결재 7: 회사+직급)';

-- 인덱스 (승급 후 검색 본진)
CREATE INDEX IF NOT EXISTS idx_posts_promoted_to_hub
  ON public.posts (promoted_to_hub, promoted_at DESC)
  WHERE promoted_to_hub = true;

CREATE INDEX IF NOT EXISTS idx_posts_promoted_score
  ON public.posts (promoted_score DESC)
  WHERE promoted_to_hub = false AND promoted_score >= 0.4;
-- 0.4 이상은 승급 후보 (admin 검토 진입로)

-- 북마크 테이블 (결재 2 신호 e)
CREATE TABLE IF NOT EXISTS public.post_bookmarks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_bookmarks_post_id
  ON public.post_bookmarks (post_id);

-- RLS
ALTER TABLE public.post_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY post_bookmarks_select_own ON public.post_bookmarks
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY post_bookmarks_insert_own ON public.post_bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY post_bookmarks_delete_own ON public.post_bookmarks
  FOR DELETE USING (auth.uid() = user_id);

COMMIT;
```

### structured_meta JSONB 스키마

```typescript
interface StructuredMeta {
  case_pattern?: string;       // "60대 남 / 협심증 / 간병보험"
  keywords?: string[];          // ["60대", "남", "협심증", "간병보험"]
  age_range?: string;           // "60-69"
  gender?: 'M' | 'F';
  companies_mentioned?: string[];   // ["메리츠", "DB손보"]
  products_mentioned?: string[];    // ["3.10.5간편", "365고당지뇌심"]
  disease_codes?: string[];     // ICD-10: ["I20", "I25"]
  risk_factors?: string[];      // ["고혈압", "당뇨"]
  extracted_at?: string;        // ISO timestamp
  extracted_by?: 'regex' | 'ai' | 'hybrid';
}
```

### promotion_signals JSONB 스키마

```typescript
interface PromotionSignals {
  answer_count: number;            // (a)
  company_diversity: number;       // (b) distinct companies
  bookmark_count: number;          // (e)
  structured_score: number;        // (f) 0.0~1.0
  admin_boost: boolean;            // (g)
  calculated_at: string;           // ISO timestamp
  ai_judgment?: {                  // 2차 AI 판정 결과
    should_promote: boolean;
    confidence: number;
    reason: string;
    judged_at: string;
  };
}
```

---

## §5. 구조화 데이터 추출 (결재 5: 하이브리드)

### 1차: 정규식 + 룰

```typescript
// 보험사명 추출 (사전 정의 리스트 매칭)
const COMPANIES = [
  '한화손보', '한화생명', '흥국화재', '흥국생명', 
  '라이나손보', '라이나생명', '신한라이프',
  '삼성화재', '삼성생명', '현대해상',
  '메리츠', 'DB손보', 'KB손보', 'KB라이프',
  '미래에셋', 'KDB생명', '롯데손보', 'ABL', '교보생명'
];

// 상품명 패턴 (숫자 조합)
const PRODUCT_PATTERN = /\b(\d{3}|\d\.\d{1,2}\.\d{1,2}(?:\.\d)?|간편\d+|365\w+|3N5)\b/g;

// 연령대 패턴
const AGE_PATTERN = /(\d{1,2})세|(\d{2})년생|(\d{2})대/g;

// 성별 패턴
const GENDER_PATTERN = /(남자|여자|남성|여성|남|여)\s*[가-힣]*?(?:고객|분|입니다)/;

// 병명 패턴 (사전 정의 200+ 보험 용어)
const DISEASE_KEYWORDS = [
  '고혈압', '당뇨', '고지혈', '갑상선암', '뇌경색', '협심증', 
  '심근경색', '뇌졸중', '치매', '대장용종', '자궁근종', ...
];
```

### 2차: Claude API 보강

정규식이 놓친 자료를 Claude API로 추출:

```typescript
async function aiStructuredExtract(post: Post): Promise<StructuredMeta> {
  const prompt = `
다음 보험 케이스 메시지에서 구조화 메타데이터를 추출하세요.

메시지: "${post.content}"

JSON으로 응답:
{
  "case_pattern": "한 줄 케이스 요약",
  "keywords": ["키워드 배열"],
  "age_range": "60-69 같은 형식",
  "gender": "M 또는 F",
  "companies_mentioned": [],
  "products_mentioned": [],
  "disease_codes": [],
  "risk_factors": []
}
`;
  
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',  // 빠른 추출
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }]
  });
  
  return JSON.parse(response.content[0].text);
}
```

### 호출 흐름

```
[게시글 INSERT 또는 UPDATE 트리거]
        ↓
[1차: 정규식 추출] → structured_meta 저장 (extracted_by: 'regex')
        ↓
[batch (1시간 주기)]
        ↓
[승급 점수 ≥ 0.5 + extracted_by = 'regex' 인 자료 선별]
        ↓
[2차: Claude API 호출] → 결과 머지 → structured_meta 갱신 (extracted_by: 'hybrid')
```

### 비용 관리

- 1차 정규식 = 무료, 즉시 처리
- 2차 AI = Claude Haiku 4.5 (가장 저렴)
  - 평균 500 tokens × $0.001 = $0.0005/건
  - 일일 100건 추출 = $0.05/일 = $1.5/월
  - 4팀 + 다른 지점 확장 시도 부담 적음

---

## §6. 검색 인덱스 (결재 6: FTS + pgvector 하이브리드)

### 1차: PostgreSQL Full-Text Search

```sql
-- 검색용 tsvector 컬럼 추가
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS search_tsv tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('simple', coalesce(content, '')), 'B') ||
      setweight(to_tsvector('simple', coalesce(structured_meta->>'case_pattern', '')), 'A') ||
      setweight(to_tsvector('simple', array_to_string(
        ARRAY(SELECT jsonb_array_elements_text(structured_meta->'keywords')),
        ' '
      ), 'simple'), 'B')
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_posts_search_tsv
  ON public.posts USING GIN (search_tsv)
  WHERE promoted_to_hub = true;
-- 허브게시판 자료만 인덱스 (검색 본진)
```

### 2차: pgvector (의미 검색)

```sql
-- pgvector 확장 설치 (Supabase Dashboard에서 활성화)
CREATE EXTENSION IF NOT EXISTS vector;

-- 임베딩 컬럼 추가 (Claude or OpenAI embedding-3-small = 1536 dim)
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

CREATE INDEX IF NOT EXISTS idx_posts_embedding
  ON public.posts USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100)
  WHERE promoted_to_hub = true;
```

### 검색 RPC (하이브리드)

```sql
CREATE OR REPLACE FUNCTION search_hub_posts(
  p_query        text,
  p_embedding    vector(1536),
  p_limit        int DEFAULT 20
)
RETURNS TABLE (
  id              uuid,
  title           text,
  content         text,
  structured_meta jsonb,
  fts_rank        real,
  vector_distance real,
  combined_score  real
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH 
    fts AS (
      SELECT 
        p.id, p.title, p.content, p.structured_meta,
        ts_rank(p.search_tsv, plainto_tsquery('simple', p_query)) AS rank
      FROM public.posts p
      WHERE p.promoted_to_hub = true
        AND p.search_tsv @@ plainto_tsquery('simple', p_query)
    ),
    vec AS (
      SELECT 
        p.id, p.embedding <=> p_embedding AS distance
      FROM public.posts p
      WHERE p.promoted_to_hub = true
      ORDER BY p.embedding <=> p_embedding
      LIMIT p_limit * 3
    )
  SELECT 
    COALESCE(fts.id, vec.id) AS id,
    fts.title, fts.content, fts.structured_meta,
    COALESCE(fts.rank, 0)::real AS fts_rank,
    COALESCE(vec.distance, 1)::real AS vector_distance,
    -- 결합 점수: FTS 0.4 + Vector 유사도 0.6
    (COALESCE(fts.rank, 0) * 0.4 + (1 - COALESCE(vec.distance, 1)) * 0.6)::real AS combined_score
  FROM fts FULL OUTER JOIN vec ON fts.id = vec.id
  ORDER BY combined_score DESC
  LIMIT p_limit;
END;
$$;
```

### 임베딩 생성 흐름

승급 직후 batch:
```typescript
// 승급된 자료에 embedding 자동 생성
const embedding = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: `${post.title}\n\n${post.content}\n\n${post.structured_meta.case_pattern}`
});

await supabase
  .from('posts')
  .update({ embedding: embedding.data[0].embedding })
  .eq('id', post.id);
```

비용: $0.02 / 1M tokens × 평균 200 tokens × 100건/일 = $0.0004/일 = 무시할 수준.

---

## §7. admin UI + 단계별 구현 로드맵

### admin_v2 통합 (D-3 board pane 확장)

`admin_v2.html` board pane에 신규 섹션 추가:

```
🌐 허브 게시판 관리
  ├─ 📋 자동 승급 대기 (점수 0.4 ~ 0.6, admin 검토 진입로)
  ├─ ✅ 자동 승급된 자료 (점수 ≥ 0.6, 회수 가능)
  ├─ 🚫 admin 수동 회수된 자료 (격리)
  └─ ⚙️ 승급 가중치 튜닝 (w_a/w_b/w_e/w_f/w_g 조절)
```

### 익명화 표시 (결재 7: 회사 + 직급)

원본 → 허브 표시 변환:

| 원본 | 허브 표시 (hub_anonymized_name) |
|---|---|
| "에즈 mg 메리츠 이주라" | "메리츠 매니저" |
| "당산 수석 김민정" + 본문 "[DB손보]" | "DB손보 매니저" |
| "에즈 흥국 대직 박세미 부지점장" | "흥국화재 부지점장" |
| "윤연실" (회사명 식별 불가, 질문자) | "GA 팀장" |
| "삼성생명 박선미매니져" | "삼성생명 매니저" |

직급 추출 룰:
- `매니저` / `부지점장` / `지점장` / `팀장` / `수석` 패턴 매칭
- 식별 불가 시 = `매니저` (보험사) 또는 `팀장` (GA)

### 단계별 구현 로드맵 (5/18 후 진입)

| Phase | 작업 | 분량 | 시점 |
|---|---|---|---|
| **Phase 0** | spec 검토·결재·세부 조정 | 1세션 | 5/19 (D+1) |
| **Phase 1** | DB 마이그레이션 (메타 컬럼 + 북마크 테이블 + 인덱스) | 1세션 | 5/20 |
| **Phase 2** | 1차 정규식 추출 + batch 승급 알고리즘 (Edge Function) | 2~3세션 | 5/21~22 |
| **Phase 3** | admin UI 통합 (승급 대기·회수·튜닝) | 2~3세션 | 5/23~26 |
| **Phase 4** | 2차 Claude API 보강 + pgvector embedding | 2~3세션 | 5/27~30 |
| **Phase 5** | 검색 UI (사용자 페이지 통합) + 사용 KPI 측정 | 3세션 | 6/2~5 |
| **Phase 6** | 라이브 검수 + 튜닝 + admin 가중치 조정 UI | 2세션 | 6/6~9 |

**총 14~17세션 = 약 2~3주** (5/19 진입 시 6월 둘째 주 완료 추정)

### 의존성 / 선행 자리

본 spec 진입 전 필수 자료:
- ✅ 4팀 단톡방 시드 (PASS)
- ⏳ 네비게이션방 시드 (Chrome AI 의뢰 진행 중)
- ⏳ Make.com OCR PDF 소식지 파싱 (별도 spec, 본 spec과 독립 진행)

### 후속 spec 후보

- **자동 허브 이식 v2** — RAG 박은 자리 (사용자 질문 입력 → AI가 허브에서 답 자동 생성)
- **인큐베이션 → 자발 입점 트리거** (마스터 전략 §5) — 보험사가 자기 답변이 허브에 박혀 있는 자료 발견하면 자발 입점 알림 박는 자리
- **케이스 클러스터링** — 유사 케이스 자동 그룹화 (예: "60대 남 / 협심증 / 간병" 패턴 100건 모음)

---

## 📋 결재 7건 통째 채택 (2026-05-16)

| # | 영역 | 채택 옵션 |
|---|---|---|
| 1 | 승급 판정 방식 | (D) 하이브리드 (룰 + AI) |
| 2 | 승급 신호 | (a) 답변 수 + (b) 회사 다양성 + (e) 북마크 + (f) 구조화 + (g) admin 수동 |
| 3 | 트리거 | (C) 하이브리드 (admin·북마크 즉시 / 점수 batch) |
| 4 | DB 처리 | (B) Flag 방식 (promoted_to_hub) |
| 5 | 구조화 추출 | (C) 하이브리드 (정규식 + AI) |
| 6 | 검색 인덱스 | (C) FTS + pgvector 병행 |
| 7 | 익명화 | (C) 회사 + 직급 |

---

## 🚨 회귀 신호 점검 (마스터 전략 §14 정합)

본 spec 구현 시 다음 회귀 신호 발견 즉시 작업 중단·보고:

- ❌ 특정 보험사 답변 가중치 ↑ (편향) → 0순위 정체성 회귀
- ❌ admin이 자동 승급 알고리즘 무시하고 모든 자료 수동 박는 자리 (시스템 본질 회귀)
- ❌ 사용자 화면에 결제 보험사 라벨 노출 (영업 본진 회귀)
- ❌ 일방향 자동 저장 표현 → "양방향 미러링" 회귀 (§13 결재 #2 정합)
- ❌ 다단계 입력 박힌 자리 (§15 딸깍 정체성 회귀)

---

## 📚 참고 자료

- `docs/core/onesecond_master_strategy_v1_20260510.md` — §3 4 layer / §11 검색 진입장벽 / §12 KPI 4종 / §13 결재 / §14 회귀 신호
- `docs/core/onesecond_os_definition_v2_2026-05-07.md` — §16 듀얼 채널 본진
- `docs/specs/v2_insurer_admission_phase1_v2.md` — 보험사 입점 spec
- `docs/sessions/_INDEX.md` — 현재 본진 위치

---

*본 spec은 결재 7건 통째 승인 받은 자료. Phase 0(5/19) 진입 시 세부 조정 가능.*
