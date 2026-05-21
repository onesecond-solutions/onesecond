---
title: 4팀 실장 진단 — Chrome AI 의뢰서 v2 (격차 정정본)
date: 2026-05-21 (저녁 갱신)
version: v2
status: 의뢰 박는 자리 (Chrome AI 본인 직접 실행 본진 명확화)
supersedes: docs/architecture/4team_managers_diagnostic_chrome_request_2026-05-21.md (v1, 격차 발생)
project_id: pdnwgzneooyygfejrvbg
---

# 🟢 Chrome AI 의뢰서 v2 — 본인이 직접 실행하는 본진

## ⚠️ v1 격차 정정 — 본 의뢰는 누가 박는가

**v1 의뢰서 격차:** Chrome AI 본인이 SQL 실행 본진 박지 X 박고 팀장님께 "Chrome AI에 박으세요"라고 떠넘긴 자리 발생.

**v2 본진:**
- 🟢 **본 의뢰 = Chrome AI 본인이 박는 자리**
- 🟢 Chrome AI = **본인이 손으로 Supabase Dashboard 열고 SQL Editor에서 직접 실행**
- 🔴 떠넘김 금지 — "팀장님께서 Chrome AI에 박으세요" 같은 답변 금지
- 🔴 다른 AI에 위임 금지 — Claude AI 웹·Code에 의뢰 금지 (본 의뢰는 Chrome AI 전용)

**Chrome AI 본인이 박는 본진 점검:**
- [ ] 본인이 Chrome 브라우저 안 Claude 확장으로 본 메시지 받았는가? → YES면 본인 박을 자리
- [ ] 본인이 Supabase Dashboard 접근 권한 박힌 자리인가? → YES면 박음
- [ ] 본인이 SQL Editor에서 SELECT 실행 권한 박힌 자리인가? → YES면 실행

→ 위 3개 모두 YES면 § 2 절차 박음. 하나라도 NO면 즉시 팀장님께 보고하고 중단.

---

## 1. 진단 목적

서브팀 인큐베이팅 시스템(v1.2) 진입 전 확인 필요 자리:

1. 한재성·한영미·임태성 3명이 `ga_manager` role로 DB 등록되어 있는가
2. 4팀 안에 ga_manager 분포
3. 4팀 전체 명단 (서브팀 관리 화면 풀)
4. `users` 테이블 컬럼 구성 (`team` vs `team_id` 본진 확인)

본 결과로 다음 분기 결정:
- 한재성·한영미 미가입 → 초대 메일 선행
- ga_member 박혀 있음 → role 승격 SQL 박음
- ga_manager 박혀 있음 → spec v1.2 작업지시서 즉시 진입

---

## 2. Chrome AI 실행 절차 (5단계, v2 명확화)

> 💡 본 절차 = Chrome AI 본인이 박는 자리. 떠넘김 금지.

### 단계 ① — Supabase Dashboard 신버전 진입

브라우저 새 탭에서 다음 URL 박음:

```
https://supabase.com/dashboard/project/pdnwgzneooyygfejrvbg
```

**확인 안전망:**
- 왼쪽 상단 프로젝트 표시 = `onesecond-v1-restore-0420` ✅
- URL 안 프로젝트 ID = `pdnwgzneooyygfejrvbg` ✅

→ 두 자리 모두 정합 박혀야 진행. 둘 중 하나라도 다르면 즉시 중단 + 팀장님께 보고.

### 단계 ② — 팀장님께 SQL 5건 표시 + 승인 박음

채팅창에 § 3 SQL 5건 통째 박아 보여드린 후 다음 본진으로 질문:

> "본 진단 SQL 5건(신버전 DB 확인 + 4팀 실장 검색 + role 분포 + ga_manager 전수 + 4팀 명단)을 Supabase Dashboard SQL Editor에서 본인이 직접 실행하겠습니다. 진행할까요?"

**승인 형식:**
- "네" / "OK" / "진행해" / "실행해" → 승인 박힘 = 단계 ③ 진입
- "잠깐" / "보류" / 다른 자리 결재 → 즉시 중단 + 대기

### 단계 ③ — SQL Editor에서 본인이 직접 실행

승인 박은 후 Chrome AI 본인 손으로:

1. Dashboard 왼쪽 사이드바 → **SQL Editor** 클릭
2. 새 쿼리 박음 (`+ New query`)
3. § 3 SQL 5건 중 첫 번째 (`SELECT current_database();`) 박음
4. **RUN** 버튼 클릭 (또는 Ctrl+Enter)
5. 결과 캡처 또는 표 박음
6. 다음 SQL 박음 → RUN → 결과 박음 (반복 5회)

⚠️ **한 쿼리씩 따로 실행 권장** — Supabase SQL Editor는 여러 쿼리 한 번에 박을 시 마지막 결과만 표시할 수 있음.

### 단계 ④ — 결과 § 4 보고 형식대로 정리

각 SQL 결과를 § 4 표 본진 박아 정리. 10 row 초과 시 핵심 row + 요약 박음.

### 단계 ⑤ — 팀장님께 보고 + Code에 전달 안내

채팅창에 보고 박은 후 마지막 줄에 다음 본진 박음:

> "본 결과를 Claude Code 채팅창에 통째 복사해 박아주세요. Code가 시나리오 A/B/C 판정 후 spec v1.2 작업지시서 본진 박을 자리입니다."

---

## 3. 실행할 SQL (5건, v1 동일)

### ① 신버전 DB 안전망 확인

```sql
SELECT current_database();
```

**예상 결과:** `postgres` (Dashboard URL = `pdnwgzneooyygfejrvbg` 정합)

다른 결과 박힌 자리 → 즉시 중단 + 팀장님께 보고.

### ② 4팀 실장 본인 검색 (한재성·한영미·임태성)

```sql
SELECT
  id,
  email,
  role,
  name,
  company,
  branch,
  team,
  plan,
  created_at
FROM public.users
WHERE name ILIKE '%한재성%'
   OR name ILIKE '%한영미%'
   OR name ILIKE '%임태성%'
ORDER BY name;
```

### ③ 4팀 안 role 분포

```sql
SELECT
  role,
  COUNT(*) AS cnt
FROM public.users
WHERE team = '4팀'
GROUP BY role
ORDER BY cnt DESC;
```

⚠️ `team = '4팀'` 컬럼 오류 시 다음 변형 시도:

```sql
-- 변형 A: team 컬럼 값 분포 확인
SELECT DISTINCT team FROM public.users ORDER BY team;

-- 변형 B: users 테이블 컬럼 구성 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
  AND (column_name LIKE '%team%' OR column_name LIKE '%branch%' OR column_name LIKE '%company%');
```

### ④ ga_manager 전체 명단

```sql
SELECT
  id,
  email,
  role,
  name,
  company,
  branch,
  team
FROM public.users
WHERE role = 'ga_manager'
ORDER BY company NULLS LAST, branch NULLS LAST, team NULLS LAST, name;
```

### ⑤ 4팀 전체 명단

```sql
SELECT
  id,
  email,
  role,
  name,
  team,
  created_at
FROM public.users
WHERE team = '4팀'
ORDER BY name;
```

---

## 4. 보고 형식

```markdown
## 4팀 실장 + 서브팀 진단 결과 (2026-05-21, Chrome AI 본인 실행)

### ① DB 확인
- current_database: postgres ✅ (정합)

### ② 실장 3명 검색
| 이름 | email | role | team | 가입일 |
|---|---|---|---|---|
| 임태성 | bylts0428@gmail.com | admin | 4팀 | YYYY-MM-DD |
| 한재성 | ??? | ??? | ??? | ??? |
| 한영미 | ??? | ??? | ??? | ??? |

→ 한재성·한영미 가입: [있음/없음] / role: [ga_manager/ga_member/없음]

### ③ 4팀 role 분포
| role | 인원 |
|---|---|
| admin | 1 |
| ga_manager | N |
| ga_member | N |
| ... | ... |

### ④ ga_manager 전체 (N명)
[명단 또는 요약]

### ⑤ 4팀 명단 (총 N명)
[명단 또는 요약]

### 종합 판단
- 시나리오 [A/B/C]: [한재성·한영미 모두 ga_manager 박힘 / 미가입 / 다른 role 박힘]
- Code 본진 다음 액션: [spec v1.2 진입 / 초대 선행 / role 승격]
```

---

## 5. 격차 발생 시 대응 매트릭스

| 격차 본진 | Chrome AI 본인 대응 |
|---|---|
| `current_database()` 결과 다름 | 즉시 중단 + 팀장님께 "구버전 Dashboard 박혀 있을 가능성" 보고 |
| ② 결과 0건 (한재성·한영미 미가입) | 보고 + Code가 결재 박을 자리 (가입 초대 vs 임태성팀 먼저) |
| ③ `team = '4팀'` 컬럼 오류 | § 3 ③ 변형 A·B 자동 실행 후 정확한 컬럼명 보고 |
| ⑤ 결과 0건 또는 1건 | 4팀 가입 본진 박지 X 박힌 자리, 5/15~5/20 가입 박힘 점검 필요 |
| Supabase Dashboard 접근 거부 | 본인 권한 박지 X 박힌 자리, 즉시 보고 |

---

## 6. 안전망 정합

- ✅ SQL 5건 = 모두 SELECT (읽기 전용)
- ✅ INSERT/UPDATE/DELETE/ALTER 박지 X = 데이터 변경 0
- ✅ 실행 시간 = 5건 합쳐 1초 이내 예상
- ✅ 실패해도 DB 무결성 영향 0
- ✅ 결과는 Chrome AI 채팅창 + Code 채팅창 두 자리 박힘 = 영구 기록

---

## 7. v1 격차 정정 본진 (참고)

**v1 의뢰서 = 본 의뢰서 supersedes 박힌 자리.**

| v1 격차 | v2 정정 |
|---|---|
| Chrome AI 본인이 박는 자리 모호 | § 0 명확화 + § 2 단계별 본인 박는 자리 명시 |
| "Dashboard에서 실행" 박혔으나 누가 박는지 불명 | § 2 단계 ③ "Chrome AI 본인 손으로" 명시 |
| 떠넘김 가능성 박혀 있음 | § 0 떠넘김 금지 박음 |
| 결과 보고 후 다음 본진 박지 X | § 2 단계 ⑤ Code 전달 본진 명시 |

---

**END OF v2**

> 본 v2 의뢰서 = Chrome AI 본인이 박는 본진 명확화. Chrome 창 닫고 신규 박은 후 본 의뢰서 raw URL 박음 → Chrome AI 본인 § 2 절차 박는 자리.
