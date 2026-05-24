# PDF 보험소식지 OCR + 구조화 DB v1 — Spec

> **파일명:** `pdf_newsletter_ocr_make_v1_spec.md`
> **작성일:** 2026-05-16 D-2
> **작성 주체:** Claude Code
> **트리거:** 5/19 D+1 진입 (5/18 4팀 오픈 후)
> **분량 추정:** spec ~3시간 / 구현 ~3~4주 (Make.com 시나리오 + DB 마이그레이션 + 검색 인프라)
> **상위 본진:** 마스터 전략 §11 검색 가능 구조화 / §3 4 layer / §9 운영 효율 + 검색 인프라
> **연관 spec:** [[auto_hub_promotion_v1_spec]] — 자동 허브 이식 시스템과 검색 인프라 통합
> **연관 메모리:** [[news_system]]

---

## 📑 본 spec 구성

| § | 영역 | 본진 |
|---|---|---|
| 1 | 본질 (Why) | 462건 PDF 소식지 → 검색 인프라 변환 |
| 2 | 회사별 PDF 구조 격차 분석 | 25개사 포맷 격차 + 공통 골격 추출 |
| 3 | DB 스키마 설계 | newsletters + newsletter_items 분리 + 메타 |
| 4 | Make.com OCR 시나리오 | 4 step 자동화 (PDF 입력 → OCR → 구조화 → INSERT) |
| 5 | AI 구조화 추출 | Claude API 호출 패턴 + prompt 본진 |
| 6 | 검색 인프라 통합 | auto_hub spec FTS+pgvector 정합 |
| 7 | 단계별 구현 로드맵 | 6 phase, 3~4주 |

---

## §1. 본질 (Why)

### 마스터 전략 §11 정합

> **자료 보유 = 진입장벽 X**
> **검색 가능 구조화 = 진입장벽 ✅**

### 462건 PDF 소식지 현황 (5/15 박은 자리)

`sosiggi/2025년~2026년 5월/생명·손해 보험사 소식지/` 462 PDF 통째 → `qna` board에 INSERT 박힌 자리. 다만 본 박은 자리 = **메타 + URL link**만 박혀 있어 = 검색 박지 X.

본진 격차:
- ❌ PDF 본문 텍스트 검색 박지 X
- ❌ 회사별 구조 격차 박혀 추출 박지 X (신한라이프 vs 흥국생명 vs 농협생명 포맷 모두 다름)
- ❌ 상품명·담보·한도·유효기간 같은 구조화 데이터 0

본 spec 본진:
- ✅ PDF → 텍스트 추출 (OCR)
- ✅ 회사별 구조 정합 변환 (Make.com + Claude API)
- ✅ 검색 가능 구조화 (`auto_hub_promotion_v1` FTS + pgvector 정합)

### 운영 효율 (마스터 전략 §9 정합)

설계사 본진 시나리오:
- "흥국화재 5월 간편 3.10.5 한도?" 검색 → 즉시 답
- "신한라이프 단기납 종신 최저보험료?" 검색 → 즉시 답
- 기존: PDF 462건 일일이 박지 X → 반복 질문 → 매니저 피로

본 시스템 박힘 = 반복 질문 ↓ + 매니저 응대 피로 ↓ (KPI 1 + KPI 2 정합)

---

## §2. 회사별 PDF 구조 격차 분석

### 25개사 포맷 격차 (5/15 시드 462건 분석 기반)

| 회사 | 본진 자료 패턴 | 페이지 평균 | OCR 격차 |
|---|---|---|---|
| 신한라이프 | 상품 변경사항 + 영업 가이드 + Q&A | 8~15p | 표 박힌 자리 OCR 정합 ↓ |
| 흥국생명 | 베스트 GA 교안 + 상품 비교 | 12~25p | 이미지 박힌 자리 OCR 격차 |
| 한화생명 | 단기납 종신 + 변액보험 + 시뮬레이션 | 10~20p | 숫자 표 多 |
| 농협생명 | 신상품 출시 + 시책 | 5~10p | 단순 텍스트 多 |
| 메리츠화재 | 31간편 + 305간편 + 인수 케이스 | 15~30p | 케이스 박힌 자리 정합 ↑ |
| DB손보 | 마감 일정 + 상품 변경 + Q&A | 8~12p | 단순 표 |
| 삼성화재 | 5세대 실손 + 간병 + 365 시리즈 | 15~25p | 표 + 그림 혼합 |
| 현대해상 | 333 / 3255 / 내삶엔 시리즈 | 10~20p | 케이스 본진 |
| 라이나손보 / 라이나생명 | 표준 PDF 포맷 | 8~15p | 정합 ↑ |
| 기타 (16개사) | 회사별 자유 포맷 | 다양 | OCR 격차 다양 |

### 공통 골격 추출 (모든 회사 박힌 자리)

PDF에서 공통으로 박힌 자리:
- 발행 회사 (커버 또는 헤더/푸터)
- 발행 월 (예: "2026.05" / "25.07")
- 카테고리 (영업방향 / 상품안내 / 인수공지 / 교육안내 / Q&A / 마감일정)
- 상품명 (예: "31간편", "365고당지뇌심", "또또암", "내삶엔 3255")
- 상품 코드 (예: "3.10.5", "305간편", "355", "325")
- 담보 (예: "암진단", "뇌심진단", "간병인 사용일당")
- 한도 (예: "5천만원", "최저보험료 2만원")
- 유효기간 (예: "5/6 14:00부터 판매")
- 대상 (예: "61세 이상", "표준체", "유병자")

→ 본 9 공통 골격을 **`structured_meta` JSONB**에 박는 자리.

---

## §3. DB 스키마 설계

### 신 테이블: `public.newsletters`

```sql
CREATE TABLE IF NOT EXISTS public.newsletters (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 출처
  source_post_id  uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  source_pdf_url  text NOT NULL,  -- Supabase Storage URL
  
  -- 메타 (공통 9 골격)
  company         text NOT NULL,  -- '흥국화재', '메리츠', etc.
  publish_year    int NOT NULL,
  publish_month   int NOT NULL,
  category        text,  -- '영업방향' / '상품' / '인수' / '교육' / 'Q&A' / '마감'
  title           text,
  
  -- 본문
  full_text       text,  -- OCR 통째
  page_count      int,
  
  -- 구조화 데이터 (AI 추출)
  structured_meta jsonb,  -- 상품/담보/한도 등
  keywords        text[],  -- 검색 키워드 자동 추출
  
  -- 검색 인덱스
  search_tsv      tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(company, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(full_text, '')), 'B') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(keywords, '{}'::text[]), ' ')), 'B')
  ) STORED,
  embedding       vector(1536),  -- pgvector (auto_hub spec 정합)
  
  -- 처리 상태
  ocr_status      text DEFAULT 'pending',  -- pending / processing / done / failed
  ocr_error       text,
  extracted_at    timestamptz,
  
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newsletters_company        ON public.newsletters (company);
CREATE INDEX IF NOT EXISTS idx_newsletters_publish_date   ON public.newsletters (publish_year DESC, publish_month DESC);
CREATE INDEX IF NOT EXISTS idx_newsletters_search_tsv     ON public.newsletters USING GIN (search_tsv);
CREATE INDEX IF NOT EXISTS idx_newsletters_embedding      ON public.newsletters USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
CREATE INDEX IF NOT EXISTS idx_newsletters_ocr_status     ON public.newsletters (ocr_status);
```

### 신 테이블: `public.newsletter_items` (상품 단위 분리)

한 PDF에 박힌 자리 = 상품 多 → 상품 단위로 분리 박는 자리.

```sql
CREATE TABLE IF NOT EXISTS public.newsletter_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id   uuid NOT NULL REFERENCES public.newsletters(id) ON DELETE CASCADE,
  
  -- 상품 정보
  product_name    text,           -- '31간편', '내삶엔 3255'
  product_code    text,           -- '3.10.5', '305간편'
  category        text,           -- '실손' / '암' / '뇌심' / '간병' / '치아' / '종신' / '운전자'
  
  -- 담보·한도
  coverages       jsonb,          -- [{type:'암진단', limit:'5천만'}, ...]
  target_age      jsonb,          -- {min:60, max:80}
  target_health   text,           -- '표준체' / '유병자' / '간편' 
  
  -- 변경사항
  effective_date  date,           -- 적용 일자
  change_type     text,           -- '신규' / '개정' / '한도변경' / '판매중지'
  change_summary  text,
  
  -- 검색
  search_tsv      tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', 
      coalesce(product_name, '') || ' ' ||
      coalesce(product_code, '') || ' ' ||
      coalesce(category, '')     || ' ' ||
      coalesce(change_summary, '')
    )
  ) STORED,
  
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_items_product   ON public.newsletter_items (product_name);
CREATE INDEX IF NOT EXISTS idx_newsletter_items_category  ON public.newsletter_items (category);
CREATE INDEX IF NOT EXISTS idx_newsletter_items_search    ON public.newsletter_items USING GIN (search_tsv);
```

### structured_meta JSONB 스키마

```typescript
interface NewsletterStructuredMeta {
  // 핵심
  company: string;              // '흥국화재'
  publish_date: string;         // '2026-05'
  
  // 상품 목록 (newsletter_items와 동기화)
  products: Array<{
    name: string;
    code?: string;
    category: string;
  }>;
  
  // 핵심 변경사항
  key_changes?: string[];       // ['5세대 실손 5/6 14:00 판매 개시', ...]
  
  // 영업 가이드
  sales_tips?: string[];
  
  // Q&A
  qna?: Array<{question: string, answer: string}>;
  
  // 마감 일정
  deadlines?: Array<{date: string, type: string, detail: string}>;
}
```

---

## §4. Make.com OCR 시나리오 (4 step)

### 시나리오 구조

```
[Trigger]
  ├─ Webhook 박은 자리 (관리자가 PDF 업로드 시)
  └─ 또는 Scheduler (1일 1회 newsletters WHERE ocr_status='pending')
        ↓
[Step 1: PDF 다운로드]
  ├─ Module: HTTP / Make a request
  ├─ Source: source_pdf_url (Supabase Storage)
  └─ Output: binary PDF
        ↓
[Step 2: OCR (Google Cloud Vision OR Anthropic Vision)]
  ├─ Option A: Google Cloud Vision API
  │   ├─ Module: Google Vision / Detect Text
  │   ├─ Cost: $1.50 / 1,000 pages
  │   └─ Strength: 표 정합 ↑
  ├─ Option B: Anthropic Claude API (vision)
  │   ├─ Module: HTTP / API 호출
  │   ├─ Cost: $3 / 1M tokens (~$0.01/page)
  │   └─ Strength: 한국어 + 보험 용어 정합 ↑
  └─ 권장: Claude (한국어 보험 도메인 정합)
        ↓
[Step 3: AI 구조화 추출 (Claude API)]
  ├─ Module: Claude Messages API
  ├─ Model: claude-opus-4-7 (정확도 본진) OR claude-haiku-4-5 (비용 ↓)
  ├─ Prompt: §5 박힌 자리 본진
  └─ Output: structured_meta JSON
        ↓
[Step 4: Supabase INSERT]
  ├─ Module: Supabase / Insert Row
  ├─ Table: newsletters (full_text + structured_meta + keywords)
  ├─ + newsletter_items (상품별 분리 INSERT)
  └─ ocr_status = 'done'
        ↓
[Error Handler]
  └─ ocr_status = 'failed' + ocr_error 박음
```

### Make.com 비용 추정

- Operations: 4 step × 462 PDF = 1,848 operations
- Free tier = 1,000 ops/월 → 부족
- Core 플랜 = $9/월 (10,000 ops) → 충분 (~462건 × 4 = 1,848 ops)
- Pro 플랜 = $16/월 (10,000 ops + 고급 기능) → 권장 (에러 핸들링)

### API 비용 추정 (462 PDF, 평균 15 페이지)

| 서비스 | 단위 비용 | 총 비용 |
|---|---|---|
| Google Vision OCR | $1.50/1K pages | $10.40 |
| Claude Vision OCR | ~$0.01/page | ~$69 |
| Claude API 구조화 추출 (Haiku) | ~$0.001/page | ~$7 |
| OpenAI Embedding (3-small) | $0.02/1M tokens | ~$1 |
| **총 (Claude Vision + Haiku 추출 + Embedding)** | — | **~$77 (1회성)** |
| **총 (Google Vision + Haiku 추출 + Embedding)** | — | **~$18 (1회성)** |

**Code 권장 = Google Vision OCR + Claude Haiku 구조화 + OpenAI Embedding ≈ $18** (462 PDF 1회성).

### Make.com vs 직접 코드 박는 자리 비교

| 측면 | Make.com | PowerShell/Node 박는 자리 |
|---|---|---|
| 개발 시간 | ~1주 (UI 박는 자리) | ~2주 (모듈 박는 자리) |
| 유지보수 | UI 박은 자리 정합 | 코드 박은 자리 정합 |
| 비용 | $9~16/월 | $0 (자체) |
| 확장성 | 다른 회사 PDF 박을 때 시나리오 정합 | 코드 정합 |
| 에러 처리 | UI 박힌 자리 단순 | 코드 박는 자리 정합 |

**Code 권장 = Make.com (462건 1회성 + 향후 매월 신규 박는 자리 UI 박는 자리 정합)**

---

## §5. AI 구조화 추출 prompt

### Claude API 호출 prompt 본진

```typescript
const prompt = `
당신은 보험 도메인 전문 AI입니다. 다음 보험사 소식지 PDF의 OCR 텍스트를 구조화해주세요.

[입력]
회사명: ${company}
발행: ${publishYear}년 ${publishMonth}월
OCR 텍스트:
"""
${ocrText}
"""

[출력 — JSON]
{
  "company": "${company}",
  "publish_date": "${publishYear}-${publishMonth.toString().padStart(2, '0')}",
  "category": "영업방향 / 상품 / 인수 / 교육 / Q&A / 마감 중 하나",
  "title": "한 줄 요약",
  
  "products": [
    {
      "name": "상품명 (예: 31간편, 내삶엔 3255)",
      "code": "상품 코드 (예: 3.10.5, 305간편)",
      "category": "실손 / 암 / 뇌심 / 간병 / 치아 / 종신 / 운전자 / 화재 중 하나",
      "coverages": [
        {"type": "암진단", "limit": "5천만원"},
        ...
      ],
      "target_age": {"min": 60, "max": 80},
      "target_health": "표준체 / 유병자 / 간편 중 하나"
    }
  ],
  
  "key_changes": [
    "5세대 실손 5/6 14:00 판매 개시",
    "DB 간병인일당 20만 가입금액 축소 (5/25 이후)",
    ...
  ],
  
  "sales_tips": ["영업 팁 또는 추천 화법"],
  
  "qna": [
    {"question": "질문", "answer": "답변"},
    ...
  ],
  
  "deadlines": [
    {"date": "2026-05-06", "type": "판매 개시", "detail": "5세대 실손"},
    {"date": "2026-05-25", "type": "한도 축소", "detail": "DB 간병인일당 20만"}
  ],
  
  "keywords": ["검색 키워드 10~20개"]
}

[규칙]
- 추측 박지 X — OCR 텍스트에 박힌 자리만 추출
- 불명확한 자리는 null
- products 박지 X 박힌 자리는 빈 배열
- 표가 박힌 자리 = 표 본진 그대로 박음
- 보험 용어 정합 (예: '3.10.5' = 비고지 3년 + 입원수술 10년 + 추가 5년)
`;
```

### 모델 선택

- **OCR 단계**: Google Vision (저렴) 또는 Claude Vision (한국어 정합 ↑)
- **구조화 단계**: Claude Haiku 4.5 (빠름 + 저렴, 보험 도메인 충분)
- **검증 단계**: 정확도 < 80% 박힌 자리 = Claude Opus 4.7 재호출

---

## §6. 검색 인프라 통합 (auto_hub spec 정합)

### 통합 검색 RPC

```sql
CREATE OR REPLACE FUNCTION search_all_resources(
  p_query        text,
  p_embedding    vector(1536),
  p_limit        int DEFAULT 20
)
RETURNS TABLE (
  source_type     text,  -- 'hub_post' / 'newsletter' / 'newsletter_item'
  id              uuid,
  title           text,
  snippet         text,
  company         text,
  combined_score  real
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  WITH 
    hub AS (
      SELECT 'hub_post'::text, id, title,
        substring(content, 1, 200) AS snippet,
        NULL::text AS company,
        ts_rank(search_tsv, plainto_tsquery('simple', p_query)) * 0.4 +
          (1 - (embedding <=> p_embedding)) * 0.6 AS score
      FROM public.posts
      WHERE promoted_to_hub = true
      ORDER BY score DESC LIMIT p_limit
    ),
    nl AS (
      SELECT 'newsletter'::text, id, title,
        substring(full_text, 1, 200) AS snippet,
        company,
        ts_rank(search_tsv, plainto_tsquery('simple', p_query)) * 0.4 +
          (1 - (embedding <=> p_embedding)) * 0.6 AS score
      FROM public.newsletters
      WHERE ocr_status = 'done'
      ORDER BY score DESC LIMIT p_limit
    ),
    items AS (
      SELECT 'newsletter_item'::text, id, product_name AS title,
        change_summary AS snippet,
        (SELECT company FROM public.newsletters WHERE newsletters.id = newsletter_items.newsletter_id),
        ts_rank(search_tsv, plainto_tsquery('simple', p_query)) AS score
      FROM public.newsletter_items
      ORDER BY score DESC LIMIT p_limit
    )
  SELECT * FROM (
    SELECT * FROM hub
    UNION ALL SELECT * FROM nl
    UNION ALL SELECT * FROM items
  ) AS combined
  ORDER BY combined_score DESC
  LIMIT p_limit;
END;
$$;
```

### 사용자 화면 통합 검색 UI

```
[검색창]
  └─ "60대 남 협심증 간병보험"
        ↓
[검색 결과 (탭 분리)]
  ├─ 🌐 허브 게시판 (auto_hub 박힌 자리, 카케이스 답변)
  ├─ 📄 보험사 소식지 (newsletters 박힌 자리, PDF 본문)
  ├─ 📋 상품 단위 (newsletter_items 박힌 자리, 정확 매칭)
  └─ 💬 단톡방·네비방 (posts, 직접 박힌 자리)
```

---

## §7. 단계별 구현 로드맵 (5/19 D+1 진입)

| Phase | 작업 | 분량 | 시점 |
|---|---|---|---|
| **Phase 0** | spec 검토·결재·세부 조정 | 1세션 | 5/19 (D+1) |
| **Phase 1** | DB 마이그레이션 (newsletters + newsletter_items + 인덱스 + RLS) | 1세션 | 5/20 |
| **Phase 2** | Make.com 시나리오 박음 (4 step 통째) + 1건 PDF 테스트 | 2세션 | 5/21~22 |
| **Phase 3** | Claude API prompt 박음 + 5~10건 PDF 검증 (구조화 정합) | 2세션 | 5/23~24 |
| **Phase 4** | 462건 통째 batch 처리 (Make 시나리오 실행) | 2세션 (자동) | 5/25~26 |
| **Phase 5** | 검색 RPC 박음 + 사용자 페이지 통합 검색 UI | 3세션 | 5/27~6/2 |
| **Phase 6** | 라이브 검수 + 정확도 튜닝 + Phase 7 (월별 자동 갱신) | 2세션 | 6/3~5 |

**총 13세션 ≈ 3주 (5/19~6/5)**

---

## 📋 결재 항목 (Phase 0)

1. **OCR 서비스 선택**: Google Vision (저렴) vs Claude Vision (한국어 ↑)
2. **AI 모델**: Claude Haiku 4.5 (빠름·저렴) vs Opus 4.7 (정확)
3. **Make.com vs 직접 코드**: UI vs 코드
4. **신규 테이블 분리 vs posts 메타 확장**: 본 spec = 분리 권장
5. **검색 UI 통합 시점**: Phase 5 (5/27~) vs 별 트랙
6. **비용 승인**: ~$18~77 1회성 + Make.com $9~16/월

---

## 🚨 회귀 신호 점검 (마스터 전략 §14 정합)

- ❌ 특정 보험사 가중치 ↑ (편향) → 0순위 정체성 회귀
- ❌ admin이 PDF 메타 직접 박는 자리 (자동화 본진 위배)
- ❌ 결제 보험사 라벨 사용자 화면 노출
- ❌ 일방향 자동 저장 표현 (양방향 미러링 회귀)

---

## 📚 참고 자료

- `docs/core/onesecond_master_strategy_v1_20260510.md` — §11 검색 진입장벽 + §9 운영 효율
- `docs/specs/auto_hub_promotion_v1_spec.md` — 자동 허브 이식 시스템 (본 spec과 통합)
- `docs/sessions/_INDEX.md` — 5/15 시드 462건 박은 자리
- 5/12 인계 노트 — Drive 1,564 파일 매칭 결과 (별 트랙 잔존)

---

*본 spec은 5/19 D+1 진입 본진. 4팀 오픈 후 1주일 안 Phase 0~1 박음, 6월 첫째 주 Phase 5 사용자 페이지 통합 검색 박은 자리.*
