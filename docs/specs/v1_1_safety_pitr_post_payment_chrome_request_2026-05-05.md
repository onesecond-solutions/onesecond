# v1.1 안전장치 트랙 #A PITR Chrome 위임 의뢰서 (결제 후 사후 검증) — Step C 4단계

> **작성일:** 2026-05-05
> **작성자:** Claude Code
> **대상:** Claude in Chrome (자동 진행) 또는 팀장님 직접
> **선행 산출물:**
> - 결제 직전 capture: `docs/architecture/db_pitr_activation_capture.md` (§ 1 결제 직전 raw 5/5 PASS)
> - 결제 직전 의뢰서: `docs/specs/v1_1_safety_pitr_pre_payment_chrome_request_2026-05-05.md`
> - 트랙 작업지시서: `docs/specs/v1_1_safety_pitr_workorder.md` § 1 Step C
> **목적:** 결제 완료 후 PITR/Compute 활성 정합 + WAL 변화 + Storage 회귀 검증
> **소요 시간:** ~10~15분 (SQL 1개 + Dashboard 확인 3건 + 라이브 회귀 1건)
> **상태:** 🟢 결제 완료 (2026-05-05) → Step C 진입 가능

---

## 0. 큰 그림 정합성 검증

본 의뢰서는 PITR 결제 완료 후 사후 검증 4단계를 Chrome 위임 형식으로 분리:

- 결제 직전 raw baseline = capture § 1-5 (WAL 6행) + § 1-2 (Compute Nano) + § 1-3 (PITR Disabled)
- **본 의뢰서 = baseline 대비 변화 raw 검증** (Step C-1 WAL / C-2 PITR Active / C-3 Compute Small / C-4 Storage 회귀)
- 본 의뢰서 PASS 후 트랙 #A PITR 완전 종료 + capture § 6 누적 + _INDEX.md 미해결 #22 ✅

---

## 1. 🚨 진입 전 필수 확인 (CLAUDE.md 강제)

### 신버전 DB 정합 (다음 중 하나라도 일치)
- ✅ Dashboard 왼쪽 상단 프로젝트명 = **`onesecond-v1-restore-0420`**
- ✅ 브라우저 URL에 **`pdnwgzneooyygfejrvbg`** 포함

### 신버전 직접 진입 URL

```
https://supabase.com/dashboard/project/pdnwgzneooyygfejrvbg
```

---

## 2. Step C-1 — WAL 설정 변화 raw (SQL Editor)

**진입:** Dashboard 좌측 → `SQL Editor` → `+ New query`

### 결제 직전 baseline (capture § 1-5 raw)

| name | setting | unit |
|---|---|---|
| archive_command | `/usr/bin/admin-mgr wal-push %p >> /var/log/wal-g/wal-push.log 2>&1` | NULL |
| archive_mode | **on** | NULL |
| max_wal_size | 4096 | MB |
| min_wal_size | 1024 | MB |
| wal_keep_size | **0** | MB |
| wal_level | **logical** | NULL |

### C-1 SQL — 결제 직전 baseline과 동일 SQL 재실행

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

**기대 변화 후보:**
- `wal_keep_size`: 0 → 비-0 (PITR 보관 기간 위해 증가 가능)
- `archive_command`: 동일 또는 PITR 전용 명령 변경
- `max_wal_size`: 4096 → 더 큼 (PITR 위해 증가 가능)
- 다른 항목 = 동일 (이미 logical + on + WAL-G 활성)

⚠️ **변화 0건이면** → PITR 활성 미완료 가능성 → § 7 안전 protocol 진입.

**보고 양식:**
```
C-1 WAL 변화 raw (6 rows):
  (결과 표 raw 그대로 복사)

C-1 변화 항목 (baseline 대비):
  - archive_command: ___ (동일 / 변경 — 변경 시 raw)
  - archive_mode: ___ (동일 / 변경)
  - max_wal_size: ___ (4096MB → ___MB)
  - min_wal_size: ___ (1024MB → ___MB)
  - wal_keep_size: ___ (0MB → ___MB) ⭐
  - wal_level: ___ (동일 / 변경)
```

---

## 3. Step C-2 — PITR Active 상태 raw (Dashboard)

**진입:** Dashboard 좌측 → `Database` → `Backups` → `Point in time` 탭

**캡처할 raw:**
- `Status` 표기 (예: `Active` / `Initializing` / `Pending`)
- `Retention` 표기 (예: `7 days`)
- `Earliest restore point` raw (예: `2026-05-05 15:23:11 KST` 형식)
- `Latest restore point` raw (예: `2026-05-05 15:45:02 KST` 형식)
- 최신 시점이 현재 시각 +수 초~분 단위인지 확인

**보고 양식:**
```
C-2 PITR Status: ___
C-2 Retention: ___ days
C-2 Earliest restore point: 2026-05-XX HH:MM:SS
C-2 Latest restore point: 2026-05-XX HH:MM:SS
C-2 현재 시각과 Latest 차이: ___분 ___초
```

⚠️ Status가 `Active`가 아닐 시 → § 7 안전 protocol 진입 (~10분 추가 대기 후 재확인).

---

## 4. Step C-3 — Compute Small 표기 raw (Dashboard)

**진입:** Dashboard 좌측 → `Project Settings` → `Infrastructure` → `Compute size` 섹션 (또는 `Compute and Disk`)

**캡처할 raw:**
- 현재 사이즈 표기 (기대: `Small`)
- 시간당 요금 (기대: `$0.0206/hour`)
- 메모리 (기대: `2 GB`)
- CPU (기대: `2-core ARM CPU`)
- 마지막 변경 시각 (있다면 raw)

**보고 양식:**
```
C-3 Compute 사이즈: ___
C-3 시간당 요금: $___/hour
C-3 메모리: ___ GB
C-3 CPU: ___
C-3 마지막 변경 시각: 2026-05-XX HH:MM (있으면)
```

---

## 5. Step C-4 — 라이브 사이트 Storage 첨부 회귀 1회

**진입:** 별도 탭에서 https://onesecond.solutions

### 회귀 단계

1. 페이지 로드 정상 확인 (5초 이내)
2. 로그인 (`bylts0428@gmail.com`)
3. 게시판 진입 (B영역 메뉴 → 게시판)
4. "글쓰기" 클릭
5. 본문 입력 (예: "PITR 활성 회귀 테스트")
6. **첨부 1건 추가** (이미지 또는 작은 파일, 1MB 이하 권장) → board_attachments Storage INSERT
7. "등록" 클릭
8. 등록 후 글 진입 → 첨부 표시 확인 (이미지 또는 다운로드 링크)
9. **글 삭제** (board_attachments Storage DELETE 회귀 옵션)

### 검증 사항

- F12 콘솔 Error 0건
- F12 Network — Storage POST `/storage/v1/object/board_attachments/...` 200 OK
- F12 Network — DB POST `/rest/v1/posts` 200 OK
- 첨부 표시 정상 (이미지 미리보기 또는 파일명 표시)

**보고 양식:**
```
C-4 페이지 로드: ___ (정상 / 결함 ___)
C-4 로그인: ___ (정상 / 결함 ___)
C-4 게시판 진입: ___ (정상 / 결함 ___)
C-4 글쓰기 + 첨부 등록: ___ (정상 / 결함 ___)
C-4 첨부 표시: ___ (정상 / 결함 ___)
C-4 글 삭제: ___ (정상 / 결함 ___)
C-4 콘솔 Error: ___건
C-4 Network 200 OK 건수: Storage POST ___ / DB POST ___
```

---

## 6. 본 의뢰서 PASS 판정 (Step C 종료 + 트랙 #A 완전 종료)

다음 4건 모두 OK 시 본 의뢰서 종료 + 트랙 #A PITR 완전 종료:

- [ ] Step C-1: WAL 변화 raw 캡처 (baseline 대비 1건 이상 변화 또는 변화 0 + Active 정합)
- [ ] Step C-2: PITR `Status: Active` + Retention `7 days` + Latest restore point 최신
- [ ] Step C-3: Compute `Small` ($0.0206/hour / 2 GB / 2-core ARM)
- [ ] Step C-4: 라이브 사이트 첨부 회귀 0 결함 + 콘솔 Error 0

→ 4/4 PASS 후 결과 raw 회신 → Code가 capture § 6 누적 + 트랙 #A 완료 명문화.

---

## 7. 안전 protocol

### 7-1. C-1 WAL 변화 0건 시
- PITR 활성 미완료 가능성 → Dashboard `Database → Backups → Point in time` 재확인
- `Status: Active`인데도 변화 0이면 Supabase 비동기 적용 가능성 → ~5분 대기 후 SQL 재실행
- 그래도 변화 0이면 사용자 회신 (Supabase 지원 문의 검토)

### 7-2. C-2 PITR Status가 Active가 아닐 시
- `Initializing` / `Pending` → ~10분 추가 대기 후 재확인
- `Failed` / `Error` → 즉시 사용자 회신 + 결제 환불 검토

### 7-3. C-3 Compute Small 표기가 아닐 시
- `Nano` 또는 다른 사이즈 표기 시 → 결제 미반영 가능성 → 사용자 회신
- 결제 내역 (Dashboard `Settings → Billing`) 확인 필요

### 7-4. C-4 첨부 등록 실패 시
- Storage RLS 영향 가능성 → 별 트랙 #25 (Storage RLS 전수 sweep) 즉시 진입 검토
- 콘솔 raw + Network raw 그대로 회신
- D-pre.8 sweep + Step 1.6 청산 회귀 영향 가능성 검토

### 7-5. 라이브 사이트 페이지 로드 자체 결함 시
- Compute Small 업그레이드 후 재시작 미완료 가능성 → ~5분 대기 후 재진입
- 그래도 결함이면 즉시 사용자 회신 + Compute 다운그레이드 검토

---

## 8. 결과 raw (Chrome 회신 후 Code가 채움)

### Step C-1 WAL 변화

```
(여기에 raw 붙여넣기)
```

### Step C-2 PITR Active

```
(여기에 raw 붙여넣기)
```

### Step C-3 Compute Small

```
(여기에 raw 붙여넣기)
```

### Step C-4 Storage 회귀

```
(여기에 raw 붙여넣기)
```

→ **본 의뢰서 PASS 판정: ___ / 4건**

---

## 9. 본 의뢰서 PASS 후 다음 단계

### 즉시 (Code 진행)

1. capture `db_pitr_activation_capture.md` § 6 사후 검증 결과 누적
2. _INDEX.md 미해결 #22 갱신 (트랙 #A ✅ 완전 종료 표기)
3. 결정 문서 § 0 상태 갱신 (트랙 #A ✅)
4. 트랙 #B Sentry 5/11 슬롯 진입 차단 신호 1건 ✅

### 5/13~14 슬롯 (Step D 분 단위 복구 시뮬, 본 의뢰서 범위 외)

본 트랙 작업지시서 § 1 Step D 진행 — 별도 의뢰서:
- 테스트 row INSERT (T1) → DELETE (T2)
- PITR Restore 시뮬 (T1.5 시점, DRY RUN 또는 별도 프로젝트 복구)
- 복구 결과 raw 보고

---

## 10. 보고 채널

Step C-1 → C-2 → C-3 → C-4 순차 진행 후 결과 raw를:

- **(권장) 채팅으로 회신** — Code가 본 § 8에 raw 추가 + capture § 6 누적 + 트랙 #A 완료 명문화 즉시 진행
- **본 문서 § 8 직접 편집 후 GitHub 커밋** — 사용자가 GitHub 웹에서 직접 편집 가능

---

*본 의뢰서는 PITR 결제 완료 후 Step C 사후 검증을 Chrome 위임 형식으로 분리. 회신 후 Code가 capture 누적 + 트랙 #A 완료 명문화.*
