# D-5 analytics RPC 4종 신설 캡처본 — 2026-05-05

> **작업 분류:** admin_v2 Phase D-5 RPC 4종 신설 (get_dau / get_wau / get_mau / get_feature_usage / get_retention_d30)
> **상태:** ✅ Step 1 사전 검증 7/7 + Step 2 신설 + Step 3 정합 검증 15/15 PASS
> **신버전 DB 검증:** 프로젝트 ID `pdnwgzneooyygfejrvbg` (`onesecond-v1-restore-0420`) ✅
> **사양 출처:** `docs/specs/admin_v2_d5_workorder.md` § 3 Step 2 (L-9 SECURITY DEFINER 표준)
> **결재 정합:** L-1 (KST 자정) / L-2 (cold-start) / L-4 (b) 6메뉴 매핑 / L-8 정의 / L-9 표준
> **트랜잭션:** Chrome 1트랜잭션 1회 실행 (BEGIN ... COMMIT) — 5종 CREATE + 15 GRANT/REVOKE + COMMENT

---

## § 1. 신설 RPC 5종 시그니처

| RPC | 시그니처 | LANGUAGE / Volatility / SECURITY |
|---|---|---|
| `get_dau(start_date date, end_date date)` | `RETURNS TABLE(day date, dau bigint)` | plpgsql STABLE SECURITY DEFINER |
| `get_wau()` | `RETURNS bigint` | plpgsql STABLE SECURITY DEFINER |
| `get_mau()` | `RETURNS bigint` | plpgsql STABLE SECURITY DEFINER |
| `get_feature_usage(start_date date, end_date date)` | `RETURNS TABLE(feature text, count bigint)` | plpgsql STABLE SECURITY DEFINER |
| `get_retention_d30()` | `RETURNS numeric` | plpgsql STABLE SECURITY DEFINER |

각 함수 공통:
- `SET search_path = public`
- 본문 시작에 `IF NOT public.is_admin() THEN RAISE EXCEPTION 'permission denied' USING ERRCODE = '42501'; END IF;` 가드
- `REVOKE ALL ON FUNCTION ... FROM PUBLIC` + `GRANT EXECUTE ... TO authenticated` + `REVOKE EXECUTE ... FROM anon`
- `COMMENT ON FUNCTION ...` 메타

---

## § 2. RPC 4종 본문 (1트랜잭션, COMMIT 완료 — `4cd4603` 직전 시점 기록)

### 2.1 get_dau(start_date, end_date)

```sql
CREATE OR REPLACE FUNCTION public.get_dau(start_date date, end_date date)
RETURNS TABLE(day date, dau bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'permission denied' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT
    (al.created_at AT TIME ZONE 'Asia/Seoul')::date AS day,
    COUNT(DISTINCT al.user_id)::bigint AS dau
  FROM public.activity_logs al
  WHERE al.user_id IS NOT NULL
    AND (al.created_at AT TIME ZONE 'Asia/Seoul')::date >= start_date
    AND (al.created_at AT TIME ZONE 'Asia/Seoul')::date <= end_date
  GROUP BY (al.created_at AT TIME ZONE 'Asia/Seoul')::date
  ORDER BY day;
END;
$$;
```

### 2.2 get_wau() / get_mau()

```sql
CREATE OR REPLACE FUNCTION public.get_wau()
RETURNS bigint
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count bigint;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'permission denied' USING ERRCODE = '42501';
  END IF;
  SELECT COUNT(DISTINCT user_id) INTO v_count
  FROM public.activity_logs
  WHERE user_id IS NOT NULL AND created_at >= now() - interval '7 days';
  RETURN v_count;
END;
$$;

-- get_mau는 동일 패턴, '7 days' → '30 days'
```

### 2.3 get_feature_usage(start_date, end_date) — L-4 (b) 6메뉴 매핑

```sql
CREATE OR REPLACE FUNCTION public.get_feature_usage(start_date date, end_date date)
RETURNS TABLE(feature text, count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'permission denied' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  WITH features AS (
    SELECT unnest(ARRAY['script','home','together','myspace','library','notice']) AS feature
  ),
  counts AS (
    SELECT
      CASE
        WHEN al.target_type = 'script'                     THEN 'script'
        WHEN al.target_type = 'home'                       THEN 'home'
        WHEN al.target_type IN ('post','together','board') THEN 'together'
        WHEN al.target_type = 'myspace'                    THEN 'myspace'
        WHEN al.target_type IN ('file','library','asset')  THEN 'library'
        WHEN al.target_type = 'notice'                     THEN 'notice'
        ELSE NULL
      END AS feature,
      COUNT(*)::bigint AS cnt
    FROM public.activity_logs al
    WHERE (al.created_at AT TIME ZONE 'Asia/Seoul')::date >= start_date
      AND (al.created_at AT TIME ZONE 'Asia/Seoul')::date <= end_date
      AND al.target_type IS NOT NULL
    GROUP BY 1
  )
  SELECT f.feature, COALESCE(c.cnt, 0)::bigint AS count
  FROM features f
  LEFT JOIN counts c ON c.feature = f.feature
  ORDER BY count DESC, f.feature;
END;
$$;
```

### 2.4 get_retention_d30() — L-8 정의

```sql
CREATE OR REPLACE FUNCTION public.get_retention_d30()
RETURNS numeric
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_total bigint; v_retained bigint;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'permission denied' USING ERRCODE = '42501';
  END IF;
  SELECT COUNT(*) INTO v_total FROM public.users
   WHERE created_at <= now() - interval '30 days';
  IF v_total = 0 THEN RETURN 0::numeric; END IF;
  SELECT COUNT(*) INTO v_retained FROM public.users
   WHERE created_at <= now() - interval '30 days'
     AND last_seen_at IS NOT NULL
     AND last_seen_at >= created_at + interval '1 day'
     AND last_seen_at <= created_at + interval '30 days';
  RETURN ROUND((v_retained::numeric / v_total::numeric) * 100.0, 1);
END;
$$;
```

---

## § 3. Step 1 사전 검증 raw (7/7 PASS)

| # | 항목 | 결과 | 판정 |
|:--:|---|---|:--:|
| ① | `current_database()` | postgres | ✅ |
| ② | activity_logs 90일 total / target_type 분포 | 743 / `script` 581 (1종) | ✅ |
| ③ | users 분포 | total=2 / new_30d=2 / with_last_seen=0 / active_30d=0 | ⚠️ last_seen_at 갱신 미구현 (별 트랙 부채 #7) |
| ④ | activity_logs RLS 6건 | `admin read all logs` qual = `is_admin()` (D-6 Step 1.5 회귀) | ✅ |
| ⑤ | RPC 5종 충돌 확인 | 0 row (신설 안전) | ✅ |
| ⑥ | activity_logs 인덱스 | 7건 (`idx_activity_logs_user_id` + `idx_activity_logs_created_at` 모두 존재) | ✅ |
| ⑦ | `is_admin()` 함수 | security_definer=true / provolatile='s' (STABLE) | ✅ |

차단 기준 ①·④·⑤·⑦ 전부 PASS → D-5 진입 정합.

---

## § 4. Step 2 사후 검증 raw (5/5 등록 + 권한 정합)

### 4.1 pg_proc 5종 등록

| proname | pronargs | security_definer | provolatile | args |
|---|:--:|:--:|:--:|---|
| get_dau | 2 | true | s | start_date date, end_date date |
| get_feature_usage | 2 | true | s | start_date date, end_date date |
| get_mau | 0 | true | s | (없음) |
| get_retention_d30 | 0 | true | s | (없음) |
| get_wau | 0 | true | s | (없음) |

5종 전부 `security_definer=true` + `provolatile='s'` (STABLE) 정합.

### 4.2 routine_privileges (15건)

5함수 × 3 grantee (authenticated / postgres / service_role) = 15건. anon grantee 미존재 (REVOKE 정합).

---

## § 5. Step 3 RPC 정합 검증 15/15 PASS raw

### 5.1 검증 A — anon 차단 5건 (has_function_privilege 기반)

| check_id | func_name | result | 판정 |
|:--:|---|---|:--:|
| A1 | get_wau() | PASS-anon blocked | ✅ |
| A2 | get_mau() | PASS-anon blocked | ✅ |
| A3 | get_dau(date,date) | PASS-anon blocked | ✅ |
| A4 | get_feature_usage(date,date) | PASS-anon blocked | ✅ |
| A5 | get_retention_d30() | PASS-anon blocked | ✅ |

### 5.2 검증 B+C — admin 시뮬 호출 + 결과 raw

`set_config('request.jwt.claims', '{"sub":"de7ba389-...","role":"authenticated"}', true)` 시뮬 후:

| 검증 | 결과 raw | 판정 |
|---|---|:--:|
| B1+C1 get_wau() | bigint 2 (7일 distinct user_id) | ✅ |
| B2+C2 get_mau() | bigint 2 (30일 distinct user_id) | ✅ |
| B3+C3 get_dau(90d) | 19행 / 일자별 dau=1~2 (KST 자정 기준) | ✅ |
| B4+C4 get_feature_usage(90d) | 6행 / `script` 580 + 나머지 5종 0 (L-4 (b) 매핑 정합) | ✅ |
| B5+C5 get_retention_d30() | numeric 0 (last_seen_at 미기록 → 0/2 = 0%, L-6 "데이터 수집 중" 표준 정합) | ✅ |

### 5.3 라이브 데이터 raw 정합 검증

- Step 1 ② total_90d=743 (모든 row) vs Step 3 B4 sum(script 580) — script 외 target_type 미존재 + total=743에 user_id IS NULL row 포함 가능
- Step 1 ② event_type 분포 (D-6 Step 1 ③ raw): script_view 580 + login 162 = 742 (Step 3 시점 743으로 +1)
- Step 3 B4 feature 매핑은 target_type 기반이라 `script_view`/`login` 분포와 직접 비교 X — 매핑 정합 (L-4 (b))

---

## § 6. 잔존 부채 (D-5 Step 4·5·6 후 별 트랙)

| # | 항목 | 권장 처리 |
|:--:|---|---|
| 1 | last_seen_at 갱신 메커니즘 미구현 (Step 1 ③ 사후 발견) | auth.js login flow 또는 PostgreSQL trigger — 5/15 4팀 오픈 직전 별 트랙 |
| 2 | activity_logs target_type 분포 1종(script) — 6메뉴 다양화 부족 | 4팀 오픈 후 자연 누적 / 5/12 시점 시드 데이터 별 트랙 |
| 3 | get_dau KST 자정 timezone 변환 cold-start 영향 | D-2 P3 별 트랙 (`admin_v2_p3_postgrest_analysis.md`) 정합 |
| 4 | RPC EXECUTE postgres / service_role 추가 grantee | Supabase 기본 패턴 정합 (변경 0) |

---

## § 7. 영구 학습 raw (D-pre.7/8 + D-2 별 트랙 #3 누적)

1. **RPC SECURITY DEFINER 표준** — `STABLE SECURITY DEFINER SET search_path = public` + `IF NOT is_admin() THEN RAISE EXCEPTION USING ERRCODE = '42501'` 가드 + `REVOKE PUBLIC + GRANT authenticated + REVOKE anon` (D-2 별 트랙 #3 패턴 5종 일괄 적용)
2. **anon 차단 검증 = `has_function_privilege` 직접 조회** — Dashboard SQL Editor가 RAISE NOTICE 미표시할 때 더 정확한 검증 방법 (Step 3 사후 학습)
3. **admin 시뮬 호출 = `set_config('request.jwt.claims', ...)`** — Dashboard에서 admin 본 계정 RPC 호출 시뮬 표준 (Step 3 사후 학습)
4. **KST 자정 timezone 변환 = `(created_at AT TIME ZONE 'Asia/Seoul')::date`** — D-2 fetchContentKPI 패턴(`setUTCHours(15,0,0,0)`)을 SQL 측 정합으로 적용 (L-1)
5. **L-4 (b) 6메뉴 매핑 = features CTE + LEFT JOIN** — 라이브 분포 부족해도 6종 모두 0으로 표시 보장 (UX 안정)
6. **last_seen_at 갱신 메커니즘 미구현 사후 발견** — D-pre.5 컬럼 신설만 했고 갱신 로직 부재. 리텐션 D-30 산식은 정합하나 라이브 결과 0% 한계 (L-6 "데이터 수집 중" 표준 정합으로 회피)

---

## § 8. 관련 산출물

- D-5 작업지시서: `docs/specs/admin_v2_d5_workorder.md` (commit `4957e53`)
- 본 capture: 본 파일 (Step 2·3 commit에 통합)
- D-2 RPC 원본 (참고 패턴): `js/admin_v2.js` `get_stage_distribution` 호출부 + Supabase DB 함수
- D-pre.7 RLS 자기 참조 회피 학습: `docs/architecture/db_pre_dpre7_capture.md`
- D-pre.8 RLS sweep 학습: `docs/architecture/db_pre_dpre8_capture.md`

---

*본 capture는 D-5 RPC 4종 신설의 진실 원천. 향후 RPC 변경·회귀 시 본 SQL 본문 기준. last_seen_at 갱신 메커니즘 미구현(부채 #1)은 5/15 4팀 오픈 직전 별 트랙 처리.*
