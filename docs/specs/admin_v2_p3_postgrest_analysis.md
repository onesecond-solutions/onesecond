# admin_v2 별 트랙 — P3 PostgREST overhead 분석 (Phase E 격상)

> **작성일:** 2026-05-04
> **격상 근거:** D-2 라이브 회귀 P3 FAIL (`docs/specs/admin_v2_d2_live_regression_2026-05-04.md` § 7)
> **선행 트랙:** 별 트랙 #3 `get_stage_distribution()` RPC 신설 (commit `788b617`) — 함수 자체는 청산
> **상태:** 🟡 Phase E 진입 시 분석 (D-3~D-final 메인 트랙 진행 중 차단 사유 없음)

---

## 0. 본 별 트랙의 위치

### 0.1 발생 배경

D-2 별 트랙 #3 청산 후 라이브 회귀 P3·P4 신규 항목 추가 측정:

| # | 측정 대상 | 기대값 | 실측 raw | 결과 |
|---|---|---|---|:--:|
| P1 (baseline) | `/scripts?select=stage&limit=10000` | 5/4 1차 raw | 243~1022ms | ✅ baseline |
| P2 (baseline) | content 섹션 진입 → 표시 총 시간 | 5/4 1차 raw | >1초 | ✅ baseline |
| **P3** | **`/rest/v1/rpc/get_stage_distribution` POST 라운드트립** | **< 200ms** | **cold 1143ms / warm 6회: 800·292·241·547·208·553ms (min 208 / avg ~440 / max 800ms)** | **❌ FAIL** |
| P4 | content 진입 → 모든 데이터 표시 총 시간 | < 1초 | 553ms (병렬 fetch 최대) | ✅ PASS |

### 0.2 사용자 영향 평가

- **P4 PASS** = 사용자 체감 영향 **0** (콘텐츠 섹션 진입 1초 미만 안정)
- D-2 본 작업은 24/25 PASS = "완전 종료" 표기 처리 (`_INDEX.md` Phase D 표 갱신)
- 본 별 트랙 = 본질 분석 + 미래 RPC 표준 (D-5 RPC 4종 + 사용자 페이지 동일 패턴) 학습 가치

### 0.3 baseline P1 vs P3 raw 비교

| 측정 | min | avg | max | 데이터 부피 |
|---|---:|---:|---:|---|
| P1 baseline (RPC 미적용) | 243ms | ~600ms | 1022ms | 59행 stage 컬럼 raw + 클라이언트 GROUP BY |
| P3 RPC 적용 | 208ms | ~440ms | 800ms | jsonb { total, counts } 작은 payload |
| **단축 효과** | **-14%** | **-27%** | **-22%** | **단축 본질 효과 미미** |

**결론:** RPC 신설의 본질 가치 = "9 query → 1 query 변환 + payload 축소" 패턴 표준 확보. 라운드트립 자체 단축은 PostgREST overhead 본질 한계.

---

## 1. 분석 가설 4가지 (Chrome 5/4 회신 제안)

### 1.1 가설 H-1 — DB 쿼리 자체 시간 vs PostgREST overhead 분리

**의뢰 SQL (Chrome 위임, Supabase Dashboard SQL Editor):**

```sql
-- ① RPC 함수 자체 EXPLAIN ANALYZE
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT public.get_stage_distribution();

-- ② 함수 본체 raw GROUP BY EXPLAIN ANALYZE
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  COALESCE(stage, '(미지정)') AS stage_key,
  COUNT(*) AS cnt
FROM public.scripts
GROUP BY COALESCE(stage, '(미지정)');

-- ③ 단순 COUNT 비교
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT COUNT(*) FROM public.scripts;
```

**기대 결과:**
- ① RPC 함수 호출 = ~5~15ms (DB 본체 시간)
- ② raw GROUP BY = ~3~8ms
- ③ 단순 COUNT = ~1~3ms

**FAIL/PASS 판정:**
- DB 본체 < 20ms 확인 시 → **PostgREST + HTTP overhead가 본질 (220ms~580ms 추가)** → 가설 H-1 PASS, H-2~H-4로 이동
- DB 본체 >50ms 시 → DB 측 비효율 (인덱스·플랜 캐시) — 별 트랙 분기

### 1.2 가설 H-2 — Sentry SDK 로딩 영향

**의뢰 검증 패턴 (Chrome 라이브):**

1. DevTools Network 탭에서 Sentry 관련 요청(envelope.io / sentry.io 등) 시점·크기 측정
2. `window.Sentry` 비활성화 상태에서 P3 재측정 (DevTools Console: `window.Sentry = null;` 후 측정)
3. 활성/비활성 raw 비교

**기대:** Sentry 영향 0~50ms 추정. 영향 크면 별 트랙 (lazy init / DSN 분기).

### 1.3 가설 H-3 — PostgREST connection pool 워밍

**의뢰 패턴 (Chrome 라이브):**

1. cold-start 1회 raw (1143ms) — 첫 진입
2. 5분 휴면 후 재진입 raw — pool decay 효과 측정
3. 15분 휴면 후 재진입 raw — full cold-start 효과 측정

**기대:** Supabase Free/Pro tier connection pool TTL 확인 → pool warming pattern 결정 (예: 5분마다 dummy ping).

### 1.4 가설 H-4 — Edge Function 대체 검토

**의뢰 분석:**

1. Supabase Edge Function (Deno runtime) vs PostgREST RPC 라운드트립 raw 비교 ([공식 docs](https://supabase.com/docs/guides/functions))
2. 동일 기능 Edge Function 작성 시 예상 효과 (~50~100ms? — Cloudflare Workers 기반)
3. 캐싱 전략 (CDN edge cache + jsonb 응답)

**기대:** Edge Function이 P3 본질 청산 가능하면 D-5 RPC 4종 신설 시점에 패턴 비교 결정.

---

## 2. 의뢰 단계 (Phase E 진입 시 sequential)

### Step 1 — H-1 EXPLAIN ANALYZE 의뢰 (Chrome Dashboard SQL Editor)

- 본 별 트랙 § 1.1 SQL 3건 실행 → DB 본체 시간 raw 확정
- raw 회신 후 H-2~H-4 진입 결정

### Step 2 — H-2 Sentry SDK 영향 측정 (Chrome 라이브)

- Network 탭 Sentry 요청 시점 + window.Sentry 비활성/활성 raw 비교

### Step 3 — H-3 connection pool 워밍 패턴 측정 (Chrome 라이브)

- 0분/5분/15분 휴면 raw

### Step 4 — H-4 Edge Function 대체 분석 + 패턴 비교

- 공식 docs + Edge Function PoC 작성 (Code 직접 작성 가능 영역)

---

## 3. 본질 결론 옵션 (Phase E 분석 결과 따라 분기)

| 결과 | 권장 처리 |
|---|---|
| H-1 = DB <20ms + H-3 = pool decay 명확 | pool warming 패턴 채택 (5분마다 dummy ping) — 비용 0 |
| H-2 = Sentry 영향 >100ms | Sentry lazy init 또는 admin 페이지 DSN 분기 |
| H-4 = Edge Function 효과 >150ms | D-5 RPC 4종 + 사용자 페이지 fetch 패턴 모두 Edge Function 마이그레이션 |
| 모두 영향 미미 | "Supabase 인프라 본질 변동성"으로 명문화 + P3 기대값 < 600ms로 완화 |

---

## 4. 참고

### 4.1 본 별 트랙의 진실 원천

- D-2 라이브 회귀 의뢰서: `docs/specs/admin_v2_d2_live_regression_2026-05-04.md` § 7 종합 판정 + § 8 부채 #7
- D-2 작업지시서: `docs/specs/admin_v2_d2_workorder.md` § 7 부채 #3
- 별 트랙 #3 RPC 신설: commit `788b617` (2026-05-04 push 10번째)
- 본 분리 결정: 2026-05-04 (옵션 A — D-2 완전 종료 + P3 별 트랙)

### 4.2 D-5 RPC 4종 신설 시 본 분석 결과 활용

`docs/specs/admin_v2_d3_to_dfinal_workorder_v1.md` § 4 (D-5 analytics):
- L-2 결정: "RPC cold-start 대비 — D-2 별 트랙 #3 학습 — RPC P3·P4 < 200ms 보장"
- 본 별 트랙 분석 결과에 따라 L-2 기대값 완화 또는 H-3/H-4 패턴 채택 결정

### 4.3 본 별 트랙 진입 트리거

- (a) Phase E 정밀화 단계 진입 시 자동 진입
- (b) D-5 RPC 4종 신설 시 P3·P4 < 200ms 미달 발견 시 즉시 진입
- (c) 사용자 페이지 동일 RPC 패턴 도입 시 (예: 보험뉴스 자동 증식 엔진의 admin 측 집계)

---

*본 별 트랙은 D-2 본 작업 24/25 PASS 후 P3 FAIL 1건 분리 처리. D-2는 사용자 영향 0으로 완전 종료. 본 분석은 미래 RPC 표준 + 인프라 본질 학습 가치.*
