---
title: 보험이슈 자동 카드 — Supabase DDL 자료
date: 2026-05-23
purpose: korea.kr 정책브리핑 RSS → Supabase issues 테이블 자동 자료
project: pdnwgzneooyygfejrvbg (onesecond-v1-restore-0420)
related:
  - 보험이슈 자동 카드 트랙 (RSS + GitHub Actions + Supabase)
  - _new/app.html v-news 자료 (다음 단계 = mock → Supabase fetch)
---

# 보험이슈 자동 카드 — Supabase DDL 자료

> **본 문서 본질:** korea.kr 정책브리핑 RSS 3곳 (금융위 / 질병청 / 공정위) → 매일 7시 KST GitHub Actions로 자동 자료 → Supabase `issues` 테이블 → `_new/app.html` v-news 자료 노출.
>
> **본 DDL 자료 = Chrome AI 외부 SQL 의뢰 자료**. 팀장님 승인 후 Supabase Dashboard SQL Editor에서 실행.

---

## §1. 자료 흐름 (큰 그림)

```
korea.kr RSS 3곳
  ├─ https://www.korea.kr/rss/dept_fsc.xml   (금융위)
  ├─ https://www.korea.kr/rss/dept_kdca.xml  (질병청)
  └─ https://www.korea.kr/rss/dept_ftc.xml   (공정위)
       ↓ (매일 7시 KST = UTC 22시)
GitHub Actions cron
       ↓
Node 스크립트 (rss-parser + @supabase/supabase-js)
       ↓
Supabase issues 테이블 (INSERT, url UNIQUE 중복 차단)
       ↓
_new/app.html v-news 자료 (fetch → 카드 노출)
```

---

## §2. issues 테이블 컬럼 자료

| 컬럼 | 타입 | NOT NULL | 자료 | 본질 |
|---|---|---|---|---|
| `id` | BIGSERIAL PRIMARY KEY | ✓ | 자동 자료 | PK |
| `title` | TEXT | ✓ | RSS `<title>` | 카드 제목 |
| `summary` | TEXT | — | RSS `<description>` (앞 자료 자르기 자료) | 카드 요약 |
| `url` | TEXT | ✓ UNIQUE | RSS `<link>` | 출처 링크 + 중복 차단 자료 |
| `pub_date` | TIMESTAMPTZ | — | RSS `<pubDate>` | 자료 발행 자료 |
| `source` | TEXT | ✓ | 부처 이름 ('금융위' / '질병청' / '공정위') | 출처 자료 |
| `category` | TEXT | — | 출처별 자동 태그 ('금융' / '건강' / '소비자') | 분류 자료 |
| `created_at` | TIMESTAMPTZ | ✓ | DEFAULT now() | 자료 들어온 자리 자동 자료 |

---

## §3. RLS 자료

| 정책 | 대상 | 자료 |
|---|---|---|
| `issues_read_all` | anon + authenticated | SELECT 자유 (사용자 화면 카드 노출 자료) |
| `issues_no_user_write` | anon + authenticated | INSERT/UPDATE/DELETE 차단 (GitHub Actions service_role만 가능) |

**service_role 키 자료:** GitHub Actions가 service_role 키로 INSERT. service_role은 RLS 자동 우회 자료라 별도 정책 X. 사용자(anon/authenticated)는 위 차단 정책으로 쓰기 차단.

**5/9 RLS 자기 참조 회피 자료 정합:** 본 정책 = 자기 테이블 SELECT 서브쿼리 자료 없음. 단순 USING(true) / USING(false) 자료.

---

## §4. 실행 SQL (Supabase Dashboard SQL Editor)

### §4-1. DDL + 정책 (RUN 1)

```sql
BEGIN;

-- issues 테이블 신설
CREATE TABLE IF NOT EXISTS public.issues (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  url TEXT NOT NULL UNIQUE,
  pub_date TIMESTAMPTZ,
  source TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스 자료
CREATE INDEX IF NOT EXISTS idx_issues_pub_date ON public.issues(pub_date DESC);
CREATE INDEX IF NOT EXISTS idx_issues_source ON public.issues(source);

-- RLS 가동
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

-- 읽기 정책: anon + authenticated 자유 읽기
CREATE POLICY "issues_read_all"
  ON public.issues
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 쓰기 차단 정책: anon/authenticated 쓰기 차단
-- (service_role 키는 RLS 자동 우회 = GitHub Actions만 INSERT 가능)
CREATE POLICY "issues_no_user_write"
  ON public.issues
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

COMMIT;
```

### §4-2. 검증 SQL (RUN 2 — 별도 RUN, 5/9 격차 학습 정합)

```sql
-- 현재 프로젝트 확인 (onesecond-v1-restore-0420 자료)
SELECT current_database();

-- 테이블 자료 확인
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND table_name='issues';

-- 컬럼 자료 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='issues'
ORDER BY ordinal_position;

-- 인덱스 확인
SELECT indexname FROM pg_indexes
WHERE schemaname='public' AND tablename='issues';

-- RLS 정책 확인
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='issues';
```

**검증 자료 합격 자료:**
- 테이블 1건 (issues)
- 컬럼 8건 (id, title, summary, url, pub_date, source, category, created_at)
- 인덱스 3건 (PK, idx_issues_pub_date, idx_issues_source — 단, URL UNIQUE 자동 인덱스도 추가됨 = 4건 자료 정합)
- 정책 2건 (issues_read_all, issues_no_user_write)

---

## §5. 다음 단계 (별도 PR)

| 단계 | 자료 | 진입 자리 |
|---|---|---|
| **2** | Node 스크립트 (`scripts/issues/fetch-rss.mjs`) | 본인 PR |
| **3** | GitHub Actions 워크플로 (`.github/workflows/issues-daily.yml`) | 본인 PR + 팀장님 Secrets 자료 |
| **4** | `_new/app.html` v-news 자료 정정 (mock → Supabase fetch) | 본인 PR + Chrome 검수 |

---

## §6. GitHub Secrets 자료 (단계 3 진입 시 자료 자리)

| Secret 이름 | 자료 |
|---|---|
| `SUPABASE_URL` | `https://pdnwgzneooyygfejrvbg.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase Dashboard → Settings → API → service_role 자료 (시크릿) |

→ 단계 3 진입 시 팀장님이 GitHub Repo Settings → Secrets and variables → Actions 자리에서 자료 자료.

---

**END OF DOCUMENT**

> 본 DDL = 한 번 실행 후 영구 자료. 재실행 시 IF NOT EXISTS 자료로 자동 스킵.
> 본 자료 정합 자료 시 5/22 시연 후 7단계 배포 흐름 정합 — feature 브랜치 + PR + Chrome 검수 + 팀장님 머지.
