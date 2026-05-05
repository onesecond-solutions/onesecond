# v1.1 안전장치 트랙 #A PITR Chrome 위임 의뢰서 (결제 직전까지) — Step A 사전 검증 + 결제 진입 화면 안내

> **작성일:** 2026-05-05
> **작성자:** Claude Code
> **대상:** Claude in Chrome (자동 진행) — 또는 팀장님 직접 (수동 진행 가능)
> **선행 산출물:**
> - 결정 문서: `docs/decisions/2026-05-05_v1_1_safety_3track_schedule.md` § 5 결재 (a) 채택
> - 트랙 작업지시서: `docs/specs/v1_1_safety_pitr_workorder.md` (4 Step 분할)
> - 통합본 Chrome 의뢰서: `docs/specs/v1_1_safety_pitr_chrome_request_2026-05-05.md` (Step A·B·C 일괄 — 본 의뢰서는 그중 결제 직전까지만 분리)
> **목적:** Step A 사전 검증 + Step B 결제 화면 진입 직전까지 안내 (결제는 팀장님 직접)
> **소요 시간:** ~15분 (SQL 2개 + Dashboard 화면 진입 + raw 캡처)
> **🚫 결제 진행 금지** — 본 의뢰서 범위는 결제 화면 도달까지. 결제 클릭은 팀장님 직접 수행.

---

## 0. 큰 그림 정합성 검증

본 의뢰서는 "결제 단계는 팀장님이 직접 진행" 결정에 따른 Chrome 자동 진행 범위 한정 분리:

- 결재 #1 PITR 비용 (a) 활성 채택 완료 (2026-05-05 후속)
- **본 의뢰서 범위:** Step A 사전 검증 (DB 변경 0건) + Step B 결제 화면 진입 직전 raw 캡처
- **본 의뢰서 범위 외:** PITR 보관 기간 선택 + 결제 카드 등록 + Confirm 클릭 (팀장님 직접) / Step C 사후 검증 (별도 의뢰서, 결제 완료 후 발행)

---

## 1. 🚨 진입 전 필수 확인 (CLAUDE.md 강제)

**Chrome 브라우저로 Supabase Dashboard 진입 직후, 어떤 작업도 시작하기 전에 반드시 확인:**

### 1-1. 프로젝트 식별 확인

다음 중 **하나라도 일치**하면 신버전 DB 정합:

- ✅ Dashboard 왼쪽 상단 프로젝트명 표시 = **`onesecond-v1-restore-0420`**
- ✅ 브라우저 URL에 **`pdnwgzneooyygfejrvbg`** 포함

### 1-2. 구버전 진입 시 즉시 중단

- ❌ 프로젝트명 = `qursjteiovcylqiepmlo` 또는 옛 프로젝트명
- ❌ URL에 `qursjteiovcylqiepmlo` 포함

**구버전 진입 시 절대 SQL·결제 화면 진입 금지** — 2026-04-22~23 데이터 소실 사고 재발 방지.

### 1-3. 신버전 직접 진입 URL

```
https://supabase.com/dashboard/project/pdnwgzneooyygfejrvbg
```

위 URL을 Chrome 새 탭에서 직접 열면 신버전 Dashboard가 즉시 표시됩니다.

---

## 2. Step A — 사전 검증 (~10분, DB 변경 0건)

### A-1. 현재 Compute 사이즈 확인

**진입 경로:** Dashboard 좌측 메뉴 → `Project Settings` (또는 `Settings`) → `Infrastructure` → `Compute size` 섹션

**캡처할 raw:**
- 현재 사이즈 표기 (예: `Nano` / `Micro` / `Small` 등)
- 사이즈 옆 비용 표기 (예: `$0/month` / `$10/month`)
- PITR 요구사항 안내 문구 (있다면 raw 그대로)

**보고 양식:**

```
A-1 Compute 사이즈: ___
A-1 비용 표기: $___/월
A-1 PITR 안내 문구: ___ (있으면 raw, 없으면 "표기 없음")
```

### A-2. 현재 백업 상태 확인

**진입 경로:** Dashboard 좌측 메뉴 → `Database` → `Backups`

**캡처할 raw:**
- `Daily backups` 섹션 상태 (예: `Enabled` / `Active`)
- `Point in Time Recovery` 섹션 상태 (예: `Disabled` / `Not enabled`)
- PITR 활성 버튼 명칭 (예: `Enable PITR` / `Add PITR add-on` / `Upgrade`)
- PITR 비용 표기 (있으면 raw 그대로)

**보고 양식:**

```
A-2 Daily backups: ___
A-2 PITR 상태: ___
A-2 PITR 활성 버튼명: ___
A-2 PITR 비용 표기: ___ (있으면 raw)
```

### A-3. WAL 설정 raw (SQL Editor 2개)

**진입 경로:** Dashboard 좌측 메뉴 → `SQL Editor` → `+ New query` 또는 새 query 탭

#### A-3-① 신버전 DB 재확인

```sql
SELECT current_database();
```

**기대값:** `postgres`

**보고 양식:**
```
A-3-① current_database(): ___
```

#### A-3-② 현재 WAL 설정 raw

```sql
SELECT name, setting, unit, short_desc
FROM pg_settings
WHERE name IN (
  'wal_level',
  'archive_mode',
  'archive_command',
  'max_wal_size',
  'min_wal_size',
  'wal_keep_size'
)
ORDER BY name;
```

**보고 양식:**
```
A-3-② WAL 설정 raw:
  (결과 표 raw 그대로 복사 — name / setting / unit / short_desc 4컬럼)
```

⚠️ **이 baseline raw는 Step C 사후 검증(별도 의뢰서)에서 비교용으로 필수.** 누락 시 변화 raw 비교 불가.

---

## 3. Step B-prep — 결제 진입 화면까지 안내 (~5분, 결제 클릭 금지)

### B-prep-1. 라이브 사용자 0명 시점 권장 (정보)

본 단계는 정보성 안내. 팀장님이 결제·재시작 진입 시 라이브 사용자 0명 시점 선택을 권장:

- 새벽 (예: 02:00 ~ 06:00 KST)
- 점심 시간 (예: 12:00 ~ 13:00 KST)

**보고 양식:**
```
B-prep-1 본 의뢰서 진입 시각: 2026-05-XX HH:MM KST
B-prep-1 진입 시 라이브 접속자 raw (https://onesecond.solutions 별도 탭 확인): ___명
```

### B-prep-2. PITR 활성 화면 진입 (결제 카드 등록 직전까지)

**진입 경로:** Dashboard `Database` → `Backups` → `Point in Time Recovery` 섹션 → A-2에서 확인한 활성 버튼 클릭 (예: `Enable PITR` 또는 `Add PITR add-on`)

**진입 후 화면 raw:**
- 보관 기간 선택 옵션 (예: `7 days` / `14 days` / `28 days`)
- 각 옵션 옆 비용 표기 (예: `$100/month` / `$200/month` / `$400/month`)
- 결제 카드 등록 섹션 또는 `Continue to payment` 버튼 위치

**🚫 클릭 금지:**
- `Continue` / `Confirm` / `Activate` 등 결제로 이어지는 버튼 클릭 금지
- 결제 카드 정보 입력 금지

**보고 양식:**
```
B-prep-2 보관 기간 옵션 raw:
  - 7 days: $___/월
  - 14 days: $___/월
  - 28 days: $___/월
B-prep-2 결제 진입 버튼명: ___
B-prep-2 화면 캡처: (스크린샷 첨부 또는 raw 그대로)
```

→ 본 화면 도달 후 다음 단계 진입 (B-prep-3). **여기서 결제 진행 금지** — 팀장님이 직접 보관 기간(권장 7 days) 선택 + 결제 진행.

### B-prep-3. Compute 업그레이드 화면 진입 (결제 직전까지)

**진입 경로:** Dashboard `Project Settings` (또는 `Settings`) → `Infrastructure` → `Compute size` → `Upgrade` 또는 `Change` 버튼 클릭

**진입 후 화면 raw:**
- Compute 사이즈 옵션 raw (예: `Nano` / `Micro` / `Small` / `Medium` 등)
- 각 옵션 옆 비용 표기 (예: `$0/month` / `$10/month` / `$20/month` 등)
- `Small` 옵션 명시적 표기 위치 (PITR 요구 최소 사이즈)
- 재시작 안내 문구 (있다면 raw 그대로)
- `Upgrade` / `Confirm` 버튼 위치

**🚫 클릭 금지:**
- `Upgrade` / `Confirm` 등 결제·재시작으로 이어지는 버튼 클릭 금지

**보고 양식:**
```
B-prep-3 Compute 사이즈 옵션 raw:
  - Nano: $___/월 (현재 사이즈)
  - Small: $___/월 (PITR 요구 최소)
  - Medium: $___/월 (참고)
B-prep-3 재시작 안내 문구: ___ (있으면 raw)
B-prep-3 Upgrade 버튼명: ___
B-prep-3 화면 캡처: (스크린샷 첨부 또는 raw 그대로)
```

→ 본 화면 도달 후 본 의뢰서 종료. 팀장님이 직접 `Small` 선택 + 결제·재시작 진행.

---

## 4. 팀장님께 인계 (결제 단계 직접 진행)

본 의뢰서 종료 후 팀장님이 직접 진행할 단계:

### 4-1. PITR 활성 결제 (B-prep-2 화면에서 시작)

1. 보관 기간 선택 — **Code 권장: `7 days` ($100/월)**
   - 14 days ($200/월) / 28 days ($400/월) 격상은 본 결재 #1 (a) 권장 7일 정합 (4팀 오픈 직후 사고 발견 시간 + 비용 가성비)
2. 결제 카드 정보 입력
3. `Confirm` 또는 `Activate` 클릭
4. 활성 진행 표시 (수 분 소요 가능) → 완료 메시지 확인
5. PITR 섹션 `Status: Active` 표기 확인

### 4-2. Compute 업그레이드 결제 (B-prep-3 화면에서 시작)

1. `Small` 선택
2. 비용 확인 ($10~$20/월)
3. `Upgrade` 또는 `Confirm` 클릭
4. **재시작 동반 (수 분 다운타임)** — 진행 중 표시 확인
5. 업그레이드 완료 + 사이즈 표기 = `Small`

### 4-3. 라이브 사이트 정상 작동 즉시 확인

- 별도 탭에서 https://onesecond.solutions 진입
- 페이지 로드 / 로그인 / admin_v2 진입 / DB fetch 정상 확인

→ 회귀 0 확인 후 Step C 사후 검증 의뢰서(별도 발행) 진입.

---

## 5. 결과 raw (Chrome 회신 후 Code가 채움)

### Step A 결과

#### A-1 Compute 사이즈 / 비용 / PITR 안내
```
(여기에 raw 붙여넣기)
```

#### A-2 백업 상태 raw
```
(여기에 raw 붙여넣기)
```

#### A-3-① current_database()
```
(여기에 raw 붙여넣기)
```

#### A-3-② WAL 설정 baseline raw (Step C 비교용 필수)
```
(여기에 결과 표 raw 그대로 복사)
```

### Step B-prep 결과

#### B-prep-1 진입 시각 + 라이브 접속자 raw
```
(여기에 raw 붙여넣기)
```

#### B-prep-2 PITR 보관 기간 옵션 raw
```
(여기에 raw 붙여넣기)
```

#### B-prep-3 Compute 옵션 raw
```
(여기에 raw 붙여넣기)
```

---

## 6. 본 의뢰서 PASS 판정 (결제 직전 도달)

다음 5건 모두 OK 시 본 의뢰서 종료 + 팀장님 인계:

- [ ] Step A-1: 현재 Compute 사이즈 raw 캡처
- [ ] Step A-2: 현재 PITR Disabled + 활성 버튼명 raw 캡처
- [ ] Step A-3-②: WAL 설정 baseline raw 캡처 (Step C 비교용)
- [ ] Step B-prep-2: PITR 보관 기간 선택 화면 도달 + 옵션 raw 캡처
- [ ] Step B-prep-3: Compute 업그레이드 선택 화면 도달 + 옵션 raw 캡처

→ 5/5 모두 PASS 후 팀장님께 보고 + 결제 진행 인계.

---

## 7. 안전 protocol

### 7-1. Step A SQL 실행 중 오류 발생 시

- 즉시 SQL Editor 중단
- 오류 메시지 raw 복사 + 어떤 SQL ① ~ ② 중 어디서 오류 발생인지 명시 → 회신
- DB 상태 변경 0건 (SELECT만) — 롤백 불필요

### 7-2. 신버전 DB가 아닌 경우 (§ 1 위반)

- 즉시 모든 작업 중단
- 신버전 진입 URL (`https://supabase.com/dashboard/project/pdnwgzneooyygfejrvbg`)로 재진입
- 그래도 구버전이면 팀장님 즉시 회신 (Supabase 계정 자체 문제 가능성)

### 7-3. PITR 또는 Compute 화면에서 실수로 결제 버튼 클릭 시

- 결제 진행 화면 (카드 정보 입력) 도달 시 즉시 브라우저 뒤로 가기 또는 X 닫기
- 카드 정보 입력 금지
- 만약 결제가 진행됐다면 즉시 팀장님 회신 + Supabase Dashboard 결제 내역 확인 + 환불 시도

### 7-4. Dashboard 메뉴 위치가 본 의뢰서 안내와 다를 시

- Supabase UI 변경 가능성 (본 의뢰서 작성 시점 2026-05-05 기준)
- 메뉴 명칭 raw + 위치 raw 그대로 보고 → Code가 의뢰서 갱신 후 재진입 안내

### 7-5. 본 의뢰서 진행 중 라이브 사이트 결함 발생 시

- 본 의뢰서는 SELECT + 화면 진입만 = 라이브 영향 0
- 결함 발생 시 본 의뢰서 외 원인 가능성 → 즉시 팀장님 회신

---

## 8. 보고 채널

Step A → B-prep 순차 진행 후 결과 raw를:

- **(권장) 채팅으로 회신** — Code가 본 § 5에 raw 추가 + 팀장님 인계 명문화 + Step C 사후 검증 의뢰서 발행 준비
- **본 문서 § 5 직접 편집 후 GitHub 커밋** — 팀장님이 GitHub 웹에서 직접 편집 가능

---

## 9. 본 의뢰서 PASS 후 다음 단계

### 즉시 (팀장님 직접 진행)

1. PITR 7 days 보관 기간 선택 + 결제 (B-prep-2 화면)
2. Compute Small 업그레이드 + 재시작 동반 결제 (B-prep-3 화면)
3. 라이브 사이트 정상 작동 즉시 확인

### 결제 완료 후 (Code 별도 의뢰서 발행)

`docs/specs/v1_1_safety_pitr_post_payment_chrome_request_2026-05-05.md` 신설 (가칭):
- Step C-1 WAL 설정 변화 raw (Step A-3-② baseline 비교)
- Step C-2 PITR Active 상태 raw
- Step C-3 Compute Small 표기 raw
- Step C-4 Storage 첨부 회귀 1회 (board_attachments)
- 본 트랙 #A PASS 판정 + capture 신설 + _INDEX.md 미해결 #22 갱신

→ 결제 완료 raw 회신 시 Code가 즉시 별도 의뢰서 발행.

---

*본 의뢰서는 PITR 작업지시서 § 1 Step A·B 진입까지를 Chrome 위임 형식으로 분리. 결제 단계는 팀장님 직접 진행 정합. Step C 사후 검증은 결제 완료 후 별도 의뢰서.*
