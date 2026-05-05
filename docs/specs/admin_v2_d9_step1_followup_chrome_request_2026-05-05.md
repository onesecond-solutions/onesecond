# admin_v2 Phase D-9 Step 1 후속 — 추가 SQL 1건 Chrome 위임 의뢰서

> **작성일:** 2026-05-05
> **작성자:** Claude Code
> **대상:** 팀장님 (Chrome 브라우저 + Supabase Dashboard SQL Editor 직접 실행)
> **선행 산출물:**
> - 작업지시서: `docs/specs/admin_v2_d9_workorder.md` (241줄, Q-1~Q-8 일괄 (a) 승인)
> - Step 1 의뢰서: `docs/specs/admin_v2_d9_step1_chrome_request_2026-05-05.md` (335줄, 회신 완료)
> - Step 1 capture: `docs/architecture/db_d9_step1_capture.md` (192줄, 발견 3건)
> - Q-9 결재 (2026-05-05): **(a) 채택** — D-9 코드는 `page_banner` group_name 사용 + 옛 v1 `banner_img` 코드 포팅 시 group_name만 변경
> **목적:** Q-9 (a) 정밀화 — `page_banner` 그룹의 정확한 key 패턴(`banner_<page>` vs `banner_img_<page>` vs 기타) raw 확인 후 Step 2 코드 정합 보장
> **소요 시간:** ~2분 (SQL 1개 실행 + 결과 raw 보고)

---

## 0. 큰 그림 정합성 검증

본 의뢰서는 D-9 Step 1 capture § 3 "추가 SQL 1건"을 Chrome 위임 형식으로 분리한 것입니다.

- Q-9 (a) 채택 — `page_banner` 사용 결정. 단 정확한 key 패턴(`banner_home` vs `banner_img_home` vs `page_banner_home` 등) 미확인.
- Step 2 (`js/admin_v2.js` settings 섹션 12함수 신설) 진입 전 본 SQL로 코드 정합 보장.
- **DB 변경 0건** (SELECT 1건 + 결과 raw 수집만).
- 본 의뢰서 결과 raw → Code에서 capture 갱신 (`docs/architecture/db_d9_step1_capture.md` § 2 발견 #1 정밀화).

---

## 1. 🚨 진입 전 필수 확인 (CLAUDE.md 강제)

**Chrome 브라우저로 Supabase Dashboard 진입 직후, SQL 실행 전에 반드시 확인:**

### 1-1. 프로젝트 식별 확인

다음 중 **하나라도 일치**하면 신버전 DB 정합:

- ✅ Dashboard 왼쪽 상단 프로젝트명 표시 = **`onesecond-v1-restore-0420`**
- ✅ 브라우저 URL에 **`pdnwgzneooyygfejrvbg`** 포함

### 1-2. 구버전 진입 시 즉시 중단

- ❌ 프로젝트명 = `qursjteiovcylqiepmlo` 또는 옛 프로젝트명
- ❌ URL에 `qursjteiovcylqiepmlo` 포함

**구버전 진입 시 절대 SQL 실행 금지** — 2026-04-22~23 데이터 소실 사고 재발 방지.

### 1-3. 신버전 직접 진입 URL

```
https://supabase.com/dashboard/project/pdnwgzneooyygfejrvbg/sql/new
```

---

## 2. 실행 SQL 1건

### ⓐ 4그룹 key·value 전수 (Q-9 (a) 정밀화)

```sql
SELECT group_name, key, value
FROM public.app_settings
WHERE group_name IN ('page_banner', 'board_visibility', 'banner', 'feature_gate')
ORDER BY group_name, key;
```

**기대 raw (Step 1 capture § 1 group_name 분포 정합):**
- `page_banner` 6행 (배너 이미지 — 옛 v1 `banner_img` 정합)
- `board_visibility` 5행 (게시판 노출 — Q-3 (a) `board_tab` 정합 또는 별도 그룹)
- `banner` 2행 (다른 배너 운영 가능)
- `feature_gate` 1행 (PRO 게이트 — Q-2 (a) `gate` 정합 또는 별도 그룹)

총 14행 예상.

**Q-9 (a) 코드 정합 분기 protocol:**

| 패턴 raw | 코드 정합 방향 |
|---|---|
| `page_banner` keys = `banner_home` / `banner_scripts` / `banner_board` / `banner_myspace` / `banner_news` / `banner_together` (옛 v1 `banner_img_<page>`에서 `_img` 제거 패턴) | 옛 v1 코드 그대로 포팅 + group_name만 `page_banner` + key `_img` 제거 (변경 최소) |
| `page_banner` keys = `page_banner_home` 등 다른 패턴 | key 패턴도 변경 필요 (작업량 약간 증가) |
| `banner` 2행 + `page_banner` 6행 분리 운영 중 (다른 도메인) | Q-9 다시 검토 — 두 그룹 의미 차이 명확화 후 재결정 |
| `board_visibility` ↔ `board_tab` 의미 중복 | Q-3 (a) `board_tab` 사용 결정 그대로 (board_visibility는 별 트랙 또는 미사용) |
| `feature_gate` ↔ `gate` 의미 중복 | Q-2 (a) `gate` 사용 결정 그대로 (feature_gate는 별 트랙 또는 미사용) |

---

## 3. 결과 raw 보고 형식

```
group_name        | key                    | value
──────────────────┼────────────────────────┼─────────
banner            | <key1>                 | <value1>
banner            | <key2>                 | <value2>
board_visibility  | <key1>                 | <value1>
... (raw 그대로)
feature_gate      | <key1>                 | <value1>
page_banner       | <key1>                 | <value1>
... (총 14행 예상)
```

**보고 채널:** 채팅으로 raw 회신 (Code가 capture § 2 발견 #1 갱신 + Step 1.6 의뢰서 발행 + Step 2 진입 즉시 결정).

---

## 4. 다음 단계 (회신 후 Code 진행)

1. Code가 본 결과 raw → `docs/architecture/db_d9_step1_capture.md` § 2 발견 #1 갱신 (key 패턴 정밀화)
2. Code가 Step 1.6 트랜잭션 의뢰서 발행 (Q-10 (a) 채택 — Storage RLS DROP 4 + CREATE 3) — 별도 의뢰서 (`admin_v2_d9_step1_6_chrome_request_2026-05-05.md`)
3. 팀장님이 Step 1.6 트랜잭션 Chrome 실행
4. Code가 Step 2 진입 (`js/admin_v2.js` settings 섹션 12함수 신설, ~480~520줄)

---

## 5. 안전 protocol

### 5-1. SQL 실행 중 오류 발생 시

- 즉시 SQL Editor에서 중단
- 오류 메시지 raw 복사 → 회신
- DB 상태 변경 0건 (SELECT만 실행) — 롤백 불필요

### 5-2. 결과가 기대값과 크게 다를 시

예: `page_banner` 0행 또는 14행보다 훨씬 많거나 적음, key 패턴 완전 다름 등

→ Step 2 코드 정합 분기 재검토 필요. 결과 raw 그대로 회신 + "기대값과 다름" 표기.

### 5-3. 신버전 진입 확인 의심 시

→ 즉시 § 1 재실행. 90% 확률로 구버전 진입 가능성.

---

*본 의뢰서는 D-9 Step 1 capture § 3 추가 SQL을 Chrome 위임 형식으로 분리. 회신 후 Code가 capture 갱신 + Step 1.6 의뢰서 발행 + Step 2 진입 즉시 결정.*
