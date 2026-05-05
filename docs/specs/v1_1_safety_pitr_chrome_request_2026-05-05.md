# v1.1 안전장치 트랙 #A PITR Chrome 위임 의뢰서 — Dashboard 진입 + SQL 검증

> **작성일:** 2026-05-05
> **작성자:** Claude Code
> **대상:** 팀장님 (Chrome 브라우저 + Supabase Dashboard 직접 조작)
> **선행 산출물:**
> - 결정 문서: `docs/decisions/2026-05-05_v1_1_safety_3track_schedule.md` § 5 결재 (a)/(a)/(a) 채택
> - 본 트랙 작업지시서: `docs/specs/v1_1_safety_pitr_workorder.md` (4 Step 분할)
> **목적:** Step A 사전 검증 + Step B PITR 활성·Compute 업그레이드 + Step C 사후 검증 일괄 진행
> **소요 시간:** ~30~45분 (SQL 4개 + Dashboard 결제 + 재시작 다운타임 + 사후 검증)
> **결제 동반:** PITR 7일 보관 +$100/월 + Compute Small +$10~$20/월 (신규 월 청구 +$110~$120/월)

---

## 0. 큰 그림 정합성 검증

본 의뢰서는 PITR 작업지시서 § 1 Step A·B·C를 Chrome 위임 형식으로 분리한 것입니다.

- 결재 #1 PITR 비용 (a) 활성 채택 완료 (2026-05-05 후속)
- Step A·C = SELECT 검증 (DB 변경 0건)
- Step B = Dashboard 결제·설정 (라이브 영향: Compute 재시작 다운타임 수 분)
- Step D 분 단위 복구 시뮬은 5/13~14 종합 회귀 슬롯 (본 의뢰서 범위 외)

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

**구버전 진입 시 절대 결제·활성·SQL 금지** — 2026-04-22~23 데이터 소실 사고 재발 방지.

### 1-3. 신버전 직접 진입 URL

```
https://supabase.com/dashboard/project/pdnwgzneooyygfejrvbg
```

위 URL을 직접 클릭하면 신버전 DB Dashboard가 즉시 열립니다.

---

## 2. Step A — 사전 검증 (~10분)

### A-1. 현재 Compute 사이즈 확인 (Dashboard)

**경로:** Dashboard 좌측 메뉴 → `Settings` → `Infrastructure` → `Compute size` 섹션

**확인:**
- 현재 사이즈 = `Nano` 표기 여부
- PITR 요구사항 = `Small 이상` (안내 문구 표시될 가능성)

### A-2. 현재 백업 상태 확인 (Dashboard)

**경로:** Dashboard 좌측 메뉴 → `Database` → `Backups`

**확인:**
- `Daily backups` 섹션 = `Enabled` 표기
- `Point in Time Recovery` 섹션 = `Disabled` 표기 (활성화 버튼 보임)

### A-3. WAL 설정 raw (SQL Editor)

**경로:** Dashboard 좌측 메뉴 → `SQL Editor` → `New query`

**SQL ① — 신버전 DB 재확인:**

```sql
SELECT current_database();
```

**기대값:** `postgres`

**SQL ② — 현재 WAL 설정 raw:**

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

**기대 raw:** Step B 진입 전 baseline. 결과는 § 7 § A-3 보고에 그대로 복사.

---

## 3. Step B — Dashboard 진입 (~15분, 결제 + 재시작 동반)

### B-1. 라이브 사용자 0명 시점 선택 (필수)

Compute 재시작 = 수 분 다운타임 동반. 진입 전 시점 권장:
- 새벽 (예: 02:00 ~ 06:00 KST)
- 점심 시간 (예: 12:00 ~ 13:00 KST)

본 의뢰서 진입 직전 https://onesecond.solutions 접속자 수 확인 (본인 외 0명 권장).

### B-2. PITR 애드온 활성

**경로:** Dashboard `Database` → `Backups` → `Point in Time Recovery` 섹션

**진입 단계:**

1. `Enable PITR` 또는 `Add PITR add-on` 버튼 클릭
2. **PITR 보관 기간 선택 화면 — Code 권장 = `7 days`**
   - `7 days`: $100/월 ⭐ 권장
   - `14 days`: $200/월
   - `28 days`: $400/월
3. 결제 카드 등록 (필요 시) + 결제 동의 체크
4. `Confirm` 또는 `Activate` 클릭
5. 활성 진행 표시 (수 분 소요 가능) → 완료 메시지 확인

**확인 raw:** PITR 활성 후 Dashboard `Database → Backups → PITR` 섹션에 `Status: Active` 표기 + `Earliest restore point` / `Latest restore point` 시각 표시.

### B-3. Compute 업그레이드 (Nano → Small)

**경로:** Dashboard `Settings` → `Infrastructure` → `Compute size` → `Upgrade` 버튼

**진입 단계:**

1. `Small` 선택 (PITR 요구 최소 사이즈)
2. 비용 확인: $10~$20/월 (Nano $0 → Small 차액)
3. `Upgrade` 또는 `Confirm` 클릭
4. **재시작 동반 (수 분 다운타임)** — 진행 중 표시 확인
5. 업그레이드 완료 메시지 + 사이즈 표기 = `Small`

### B-4. 라이브 사이트 정상 작동 즉시 확인 (~3분)

**별도 탭 또는 브라우저:** https://onesecond.solutions 진입

**확인:**
1. ✅ 페이지 로드 정상 (5초 이내)
2. ✅ 로그인 (`bylts0428@gmail.com`) 정상
3. ✅ admin_v2 진입 (`#admin/dashboard`) 정상
4. ✅ DB fetch 정상 (사용자 테이블 행 표시 확인)

→ 회귀 0 확인 후 Step C 진입.

---

## 4. Step C — 사후 검증 (~5분)

### C-1. WAL 설정 변경 확인 (SQL Editor)

Step A-3 SQL ② **동일 SQL 재실행**.

**기대 변화:**
- `wal_level`: `replica` → `logical` 또는 동일 (PITR 활성으로 변경 가능)
- `archive_mode`: `off` → `on`
- `archive_command`: 빈값/`(disabled)` → S3 또는 PG WAL 보관 명령
- `max_wal_size`: 증가
- `wal_keep_size`: 증가

⚠️ 변화 0건이면 → PITR 활성 미완료 가능성 → § 8 안전 protocol 진입.

### C-2. PITR 활성 상태 raw (Dashboard)

**경로:** Dashboard `Database` → `Backups` → `Point in Time Recovery`

**확인 raw:**
- `Status` = `Active`
- `Retention` = `7 days`
- `Earliest restore point` = 활성 시점부터 +수 분
- `Latest restore point` = 최신 (수 초~분 단위)

### C-3. Compute 사이즈 raw (Dashboard)

**경로:** Dashboard `Settings` → `Infrastructure` → `Compute size`

**확인:** `Current` = `Small` (이전 `Nano` 대비)

### C-4. 게시판 첨부 회귀 1회 (라이브 사이트)

**경로:** https://onesecond.solutions → 로그인 → 게시판 진입

**진입 단계:**
1. "글쓰기" 클릭
2. 본문에 "PITR 활성 회귀 테스트" 입력
3. 첨부 1건 (이미지 또는 작은 파일) 추가 → board_attachments Storage INSERT
4. "등록" 클릭
5. 등록 후 글 진입 → 첨부 표시 확인 → 다시 삭제

→ Storage 회귀 0 확인 (D-pre.8 sweep + 별 트랙 #25 정합).

---

## 5. 결과 raw 보고 형식 (Code 회신용)

각 결과를 다음 형식으로 raw 복사 → 본 문서 § 7에 채우거나 채팅으로 회신:

### Step A 결과

```
A-1 Compute 사이즈: ___ (Nano / Small / 기타)
A-2 PITR 상태: ___ (Disabled / Enabled)
A-2 Daily 백업: ___ (Enabled / 기타)
A-3 SQL ① current_database(): ___
A-3 SQL ② WAL 설정 raw:
  (raw 그대로 복사)
```

### Step B 결과

```
B-1 진입 시점: 2026-05-XX HH:MM KST / 라이브 접속자: ___명
B-2 PITR 보관 기간 채택: ___ (7 days / 14 days / 28 days)
B-2 PITR 결제 시각: 2026-05-XX HH:MM KST
B-2 결제 금액: $___/월
B-3 Compute 업그레이드 시각: 2026-05-XX HH:MM KST
B-3 다운타임 raw: ___분 ___초
B-4 라이브 회귀 결과: ___ (정상 / 결함 ___)
```

### Step C 결과

```
C-1 WAL 설정 변경 raw:
  (Step A-3 SQL ② 결과와 비교 — 변경 항목 명시)
C-2 PITR 활성 상태:
  Status: ___
  Retention: ___ days
  Earliest restore point: 2026-05-XX HH:MM:SS
  Latest restore point: 2026-05-XX HH:MM:SS
C-3 Compute 사이즈: ___
C-4 Storage 회귀: ___ (정상 / 결함 ___)
```

---

## 6. 본 의뢰서 PASS 판정

다음 5건 모두 OK 시 트랙 #A PITR Step A·B·C 종료 + capture 진입:

- [ ] Step A: Nano + PITR Disabled + WAL baseline 캡처
- [ ] Step B: PITR 7일 활성 + Compute Small 업그레이드 + 라이브 회귀 0
- [ ] Step C-1: WAL 설정 변화 raw 캡처
- [ ] Step C-2·C-3: PITR Active + Compute Small 표기 정합
- [ ] Step C-4: Storage 회귀 0

→ 5/5 모두 PASS 후 Code가 `docs/architecture/db_pitr_activation_capture.md` 신설 + 본 의뢰서 § 7에 raw 추가 + 본 트랙 #A 완료 명문화.

---

## 7. 결과 raw (Chrome 회신 후 Code가 채움)

### Step A 결과

```
(여기에 raw 붙여넣기)
```

### Step B 결과

```
(여기에 raw 붙여넣기)
```

### Step C 결과

```
(여기에 raw 붙여넣기)
```

→ **본 의뢰서 PASS 판정: ___ / 5건**

---

## 8. 안전 protocol

### 8-1. Step A·C SQL 실행 중 오류 발생 시

- 즉시 SQL Editor 중단
- 오류 메시지 raw 복사 + 어떤 SQL ① ~ ② 중 어디서 오류 발생인지 명시 → 회신
- DB 상태 변경 0건 (SELECT만) — 롤백 불필요

### 8-2. Step B 결제 중 카드 거절·결제 실패 시

- 즉시 결제 중단 + 화면 raw 캡처 (Dashboard 메시지)
- 다른 카드 시도 또는 Supabase 지원에 문의
- **활성 미완료 상태로 라이브 작업 진입 금지**

### 8-3. Step B Compute 재시작 후 라이브 사이트 결함 발생 시

- 즉시 Dashboard `Settings` → `Infrastructure` → `Compute size`에서 `Nano` 다운그레이드 시도
- 라이브 사이트 정상 복귀 확인 + 결함 raw 보고
- 다운그레이드 후 PITR 활성 자동 해제 가능성 → 별도 결재 필요

### 8-4. Step C-1 WAL 설정 변화 0건 시

- PITR 활성 미완료 가능성 → Dashboard `Database → Backups → PITR` 재확인
- `Status: Active` 표기인데도 WAL 변화 0이면 Supabase 측 비동기 적용 가능성 (~5분 대기 후 재실행)
- 그래도 변화 0이면 Supabase 지원 문의 + 본 의뢰서 ROLLBACK 결정 (PITR 비활성 + Compute Nano 다운)

### 8-5. Step C-2 PITR Status가 Active가 아닐 시

- `Initializing` / `Pending` 등 상태이면 ~10분 추가 대기
- `Failed` / `Error` 상태이면 즉시 Supabase 지원 문의 + 결제 환불 검토

### 8-6. Step C-4 Storage 회귀 결함 발생 시

- 첨부 업로드 실패 / 표시 실패 → board_attachments Storage RLS 영향 가능성 (별 트랙 #25)
- 결함 raw 보고 + 본 의뢰서 PASS 판정 보류 + 별 트랙 #25 즉시 진입 검토

---

## 9. 보고 채널

Step A → B → C 순차 진행 후 결과 raw를:

- **(권장) 채팅으로 회신** — Code가 본 § 7에 raw 추가 + capture 문서 신설 + 트랙 #A 완료 명문화 즉시 진행
- **본 문서 § 7 직접 편집 후 GitHub 커밋** — 팀장님이 GitHub 웹에서 직접 편집 가능

---

## 10. 본 의뢰서 PASS 후 다음 단계

### 즉시 (5/6 슬롯 완료)

1. Code가 본 § 7에 raw 추가
2. Code가 `docs/architecture/db_pitr_activation_capture.md` 신설 (Step A·B·C 결과 + 영구 학습)
3. _INDEX.md 미해결 #22 갱신 (트랙 #A ✅ 종료 표기)
4. 트랙 #B Sentry 5/11 슬롯 진입 차단 신호 1건 ✅

### 5/13~14 슬롯 (Step D 분 단위 복구 시뮬, 본 의뢰서 범위 외)

본 트랙 작업지시서 § 1 Step D 진행:
- 테스트 row INSERT (T1) → DELETE (T2)
- PITR Restore 시뮬 (T1.5 시점, DRY RUN 또는 별도 프로젝트 복구)
- 복구 결과 raw 보고

---

*본 의뢰서는 PITR 작업지시서 § 1 Step A·B·C를 Chrome 위임 형식으로 분리. 회신 후 Code가 capture 신설 + 트랙 #A 완료 명문화 즉시 진행.*
