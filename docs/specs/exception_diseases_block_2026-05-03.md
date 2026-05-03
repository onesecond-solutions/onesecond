# 별 트랙 α — exception_diseases 검색 전면 차단 (UI + DB 이중 잠금)

> **작성:** Code (Claude Code) · **작성일:** 2026-05-03 · **트랙 상태:** ✅ 종료
> **방식:** UI 호출 제거(외층) + DB SELECT 정책 admin 전용(내층)
> **데이터:** 23,463건 보존 (DROP TABLE 안 함)

---

## 1. 배경 + 결정

### 발생 경위
- 재오픈(v1.1, 5/10ish) 전 R6 RLS sweep에서 `exception_diseases` 정책 raw 확보
- 팀장님 보류 결정: 검색기용으로 만들었으나 **표준화 어려워 포기, 사이트 치명 영향 아니면 보류**
- Code 진단: 라이브에서 검색 작동 중 (R6-c `using_clause = true`) → 사용자 화면에 노출됐다 사라지면 혼란 가능
- **결정:** 검색 자체에서 사라지게 차단 (전면 차단)

### 차단 옵션 비교 (4안 중 (다) 채택)
| 옵션 | 채택 여부 | 근거 |
|---|---|---|
| (가) UI만 차단 | ❌ | API 직접 호출(curl/Postman) 시 23,463건 다운로드 가능 (anon key 노출) |
| (나) DB만 차단 | ❌ | UI는 살아있어 사용자 검색 시 "예외질환 0건" 빈 결과 → 혼란 |
| **(다) 둘 다 (이중 잠금)** | ✅ | 데이터 보존 + UI/API 양쪽 완전 차단 |
| (라) 테이블 DROP | ❌ | 23,463건 자산 손실, 향후 표준화 재시도 불가 |

### 크롬 제안 반박
크롬: "단건 차단이라면 `is_blocked` 컬럼 + UPDATE 정책 신설 필요"
→ Code 반박: 그건 **부분 차단** 시나리오용. 우리는 **전면 차단**이라 단순 SELECT 정책 admin 전용 교체로 충분. UPDATE 정책 / 컬럼 추가 / 데이터 변경 모두 불필요.

---

## 2. 실행 단계 결과

### Step A — 사전 캡처 (크롬, SELECT 진단)

```
policyname                                       | cmd    | roles           | using_clause | with_check_clause
authenticated users can read exception_diseases  | SELECT | {authenticated} | true         | NULL
```
- 정책 1건 (SELECT만)
- INSERT/UPDATE/DELETE 정책 0건 → 데이터는 service_role 또는 마이그레이션 스크립트로만 변경 가능 (현 상태 유지)

### Step B — UI 차단 (`app.html` Edit)

| Edit | 위치 | 변경 |
|---|---|---|
| 1 | `fetchSearchPreview` Promise.all | 4→3 fetch + destructuring `[sr, pr, qr, dr]` → `[sr, pr, qr]` (`exception_diseases` fetch 제거) |
| 2 | `fetchSearchPreview` 렌더 | `diseasePreview` 정의 4줄 + 드롭다운 예외질환 블록 12줄 통째 제거 + total 계산 정리 |
| 3 | `doSearch` Promise.all | 4→3 fetch + destructuring 정리 (Edit 1과 동일 패턴) |
| 4 | `doSearch` 렌더 | total + sub-line 정리 + 결과 페이지 예외질환 표 31줄 통째 제거 |

**잔존 검증:** `exception_diseases` / `diseases` / `diseasePreview` / `byInsurer` / `예외질환` 모두 0건 (`grep` 통과)
**영향 통계:** 60줄 삭제 + 11줄 신설 = 49줄 순감소

### Step E — UI 푸시

- 커밋: `7ea9044 fix(alpha): exception_diseases 검색 UI 차단 — fetch + 렌더 블록 제거`
- 푸시 시각: 2026-05-03 (별 트랙 α 진행 중)
- 라이브 배포: GitHub Pages 자동 (1~5분)

### Step C — DB 차단 (크롬, 트랜잭션)

```sql
BEGIN;
DROP POLICY IF EXISTS "authenticated users can read exception_diseases"
  ON public.exception_diseases;
CREATE POLICY "exception_diseases admin only"
  ON public.exception_diseases FOR SELECT TO authenticated
  USING (public.is_admin());
COMMIT;
```

**C-4 사후 검증 결과 (확정 커밋 상태):**
```
policyname                     | cmd    | roles           | using_clause | with_check_clause
exception_diseases admin only  | SELECT | {authenticated} | is_admin()   | NULL
```
→ 기대값 완전 일치, COMMIT 성공

### Step D — 라이브 검수

- 팀장님 직접 검수: ✅ 적용 완료 확인
- 검수 항목: 검색바에서 예외질환 결과 표시 여부

---

## 3. 영향 범위

| 영역 | 영향 |
|---|---|
| 사용자 화면 | 헤더 통합 검색 드롭다운 + 결과 페이지에서 🏥 예외질환 섹션 사라짐 |
| 다른 검색 결과 | 스크립트 / 현장 Q&A / 업무자료 3섹션 정상 작동 (변경 없음) |
| API 직접 호출 | anon key로 호출 시 빈 배열 반환 (admin 외 SELECT 차단) |
| admin 데이터 접근 | Supabase SQL Editor / DB 도구로 정상 SELECT 가능 (`is_admin()` 통과) |
| 데이터 보존 | 23,463건 그대로 (DROP/UPDATE 없음) |
| 다른 페이지 | 영향 없음 (`exception_diseases` 호출은 `app.html` 단 두 함수에만 있었음) |

---

## 4. 롤백 절차

| 사고 | 롤백 |
|---|---|
| DB 정책 사고 발견 | `DROP POLICY "exception_diseases admin only" ON public.exception_diseases;` + Step A 원본 정책 재생성: `CREATE POLICY "authenticated users can read exception_diseases" ON public.exception_diseases FOR SELECT TO authenticated USING (true);` |
| UI 사고 발견 | `git revert 7ea9044` + push |
| 향후 검색 다시 활성화 | 위 두 단계 모두 역순 실행 + `app.html` Edit 4건 복원 (본 문서 § 2 Step B 매핑 참조) |

---

## 5. 잔존 사항 / 후속 트랙

| # | 항목 | 처리 시점 |
|---|---|---|
| 1 | 데이터 표준화 재시도 | 미정 (사이트 본체 안정화 후) |
| 2 | "비교" 같은 금지어 안내 시스템 | 보류 (2026-05-03 검토 후 취소) |
| 3 | UI에 "예외질환 검색 종료" 안내 페이지 | 별 트랙 (사용자 문의 발생 시) |
| 4 | exception_diseases CSV 백업 (현재 DB 외) | 별 트랙 (대용량 마스터 자산 보존 차원) |

---

## 6. 본 트랙 학습

- **크롬의 "is_blocked 컬럼" 제안은 부분 차단 시나리오용** — 전면 차단엔 단순 SELECT 정책 교체가 정합. AI 추천 → Code 검증 후 반박 패턴 (D-pre 시리즈 누적 패턴)
- **단건 차단은 단건 트랙으로 분리** — D-pre.8 묶음에 포함 X. D-pre.7 학습 #6 ("한 묶음에 너무 많이 넣으면 사각지대") 정합
- **UI 푸시 → DB 변경 순서가 사용자 영향 최소** — UI에서 호출 자체 제거하면 DB 변경 갭 동안 사용자 영향 0

---

## 7. 별 트랙 α 종료 → 다음 트랙

```
🏁 별 트랙 α 종료
    ↓
🔵 D-pre.8 묶음 작업지시서 발행 (B + ⓛ + ② + ⑤ + ⑤-2 + ⑦)
    ↓
D-pre.8 본 작업
    ↓
🟢 D-1 admin_v2 users 본 진입 (메인 트랙)
    ↓
... → 재오픈 (v1.1, 5/10ish)
```

---

*본 문서는 별 트랙 α 단건 종료 캡처. 다음 트랙 진입 시 본 문서 GitHub URL을 참조 인계 가능.*
