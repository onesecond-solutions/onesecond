# PITR 활성 capture — 결제 직전 raw + 사후 검증 (트랙 #A)

> **작성일:** 2026-05-05
> **작성자:** Claude Code (Chrome 회신 raw 정합)
> **선행 산출물:**
> - 결정 문서: `docs/decisions/2026-05-05_v1_1_safety_3track_schedule.md` § 5 결재 (a) 채택
> - 작업지시서: `docs/specs/v1_1_safety_pitr_workorder.md` (4 Step 분할)
> - 결제 직전 Chrome 의뢰서: `docs/specs/v1_1_safety_pitr_pre_payment_chrome_request_2026-05-05.md`
> **상태:** 🟢 결제 직전 5/5 PASS (Step A + B-prep) / ⏸ 결제 진행 + 사후 검증 대기

---

## 1. 결제 직전 raw (Chrome 회신 2026-05-05)

### 1-1. 신버전 DB 정합 확인

- 프로젝트명: `onesecond-v1-restore-0420` ✅
- URL: `https://supabase.com/dashboard/project/pdnwgzneooyygfejrvbg` ✅
- DB 변경 건수: 0건 (SELECT만 실행)

### 1-2. Step A-1 — Compute 사이즈

- 현재: **Nano** ($0.01344/hour ≈ $9.68~$10.18/월)
- PITR 안내: `"Project needs to be at least on a Small compute size to enable PITR"`

#### Compute 옵션 전체 raw

| 사이즈 | 시간당 요금 | 메모리 | CPU | 비고 |
|---|---|---|---|---|
| **Nano (현재)** | $0.01344/hour | Up to 0.5 GB | Shared CPU | — |
| Micro | $0.01344/hour | 1 GB | 2-core ARM | "No additional charge" 배지 (Pro 포함) |
| **Small** | $0.0206/hour | 2 GB | 2-core ARM | PITR 요구 최소 |
| Medium | $0.0822/hour | 4 GB | 2-core ARM | — |
| Large | $0.1517/hour | 8 GB | 2-core ARM | — |
| XL | $0.2877/hour | 16 GB | 4-core ARM | — |

### 1-3. Step A-2 — 백업 상태

- Daily backups: **Enabled** (Scheduled backups 탭, 매일 UTC 02:13~02:14 백업 8건 확인)
- PITR 상태: **Disabled** (Point in time 탭, "Point in Time Recovery is a Pro Plan add-on")
- PITR 활성 버튼명: **`Enable add-on`**

### 1-4. Step A-3-① — 신버전 DB 재확인

```
current_database(): postgres ✅
```

### 1-5. Step A-3-② — WAL 설정 baseline (사후 검증 비교용)

| name | setting | unit | short_desc |
|---|---|---|---|
| archive_command | `/usr/bin/admin-mgr wal-push %p >> /var/log/wal-g/wal-push.log 2>&1` | NULL | Sets the shell command that will be called to archive a WAL file. |
| archive_mode | **on** | NULL | Allows archiving of WAL files using "archive_command". |
| max_wal_size | 4096 | MB | Sets the WAL size that triggers a checkpoint. |
| min_wal_size | 1024 | MB | Sets the minimum size to shrink the WAL to. |
| wal_keep_size | **0** | MB | Sets the size of WAL files held for standby servers. |
| wal_level | **logical** | NULL | Sets the level of information written to the WAL. |

### 1-6. Step B-prep-1 — 라이브 접속자

- 본 의뢰서 진입 시각: 2026-05-05 (한국 시각 기준 오후)
- 라이브 접속자 raw: 사이트 정상 로드 확인. 실시간 접속자 카운터 없음 (별도 Analytics 대시보드 확인 필요)

### 1-7. Step B-prep-2 — PITR 활성 화면 (결제 직전, Confirm 클릭 안 함)

| 보관 기간 | 비용 | 안내 |
|---|---|---|
| **7 days** ⭐ | $100.00/월 | Allow database restorations to any time up to 7 days ago |
| 14 days | $200.00/월 | Allow database restorations to any time up to 14 days ago |
| 28 days | $400.00/월 | Allow database restorations to any time up to 28 days ago |

#### 핵심 안내 문구

- ⚠️ `"Project needs to be at least on a Small compute size to enable PITR"` + `Change compute size` 버튼 함께 표시
- 결제 진입 버튼명: **`Confirm`**
- ⭐ `"There are no immediate charges. The add-on is billed at the end of your billing cycle based on your usage and prorated to the hour."` ← **즉시 결제 X**
- `"Prices shown do not include applicable taxes."`

### 1-8. Step B-prep-3 — Compute 업그레이드 화면 (결제 직전, Confirm changes 클릭 안 함)

#### 차액 raw

- Nano $0.01344/hour → Small $0.0206/hour
- 월 차액 = **+$5.15/월** ($10.18 → $15.33)
- 작업지시서 추정 (+$10~$20/월) 대비 **약 1/2 ~ 1/4** 수준

#### 재시작 안내

- `"Project will restart automatically on confirmation."`
- `"Changes will be applied shortly after confirmation."`
- 표기: `Compute size: NANO → SMALL`
- Upgrade 버튼명: **`Confirm changes`**

---

## 2. 핵심 발견 + 진행 순서 정정

### 2-1. 진행 순서 정정 — Compute 먼저, PITR 나중

작업지시서 `v1_1_safety_pitr_workorder.md` § 1 Step B-1·B-2 순서 = PITR 먼저, Compute 나중. 그러나 실제 화면 raw에서:

- PITR Enable 화면에 `"Project needs to be at least on a Small compute size to enable PITR"` + `Change compute size` 버튼 함께 표기
- 즉 **Compute Small 업그레이드가 PITR 전제 조건**

→ **권장 순서 정정:** ① Compute Nano → Small (재시작 동반) → ② PITR 7 days 활성 (재시작 후)

### 2-2. 비용 raw 정정 — 신규 월 청구 ~$130.15/월

작업지시서 추정 vs 실제 raw:

| 항목 | 작업지시서 추정 | 실제 raw |
|---|---|---|
| Pro 플랜 | $25/월 | (Pro 베이스, 기존) |
| PITR 7일 | +$100/월 | +$100/월 ✅ |
| Compute Small | +$10~$20/월 | **+$5.15/월** (Nano $10.18 → Small $15.33) |
| **신규 월 청구 합계** | $135~$145/월 | **~$130.15/월** |

### 2-3. 즉시 결제 우려 해소

PITR 화면 raw `"There are no immediate charges. The add-on is billed at the end of your billing cycle based on your usage and prorated to the hour."` → 즉시 결제 X, 청구 사이클 종료 시 정합. **결제 카드 등록 후 즉시 카드 청구는 발생 X**.

### 2-4. WAL baseline raw — Pro Nano 이미 logical + archive_mode on

Supabase Pro Nano는 **이미 WAL 보관 활성** 상태. PITR Disabled 상태에서도:
- `wal_level = logical` (Realtime 등 위해 활성)
- `archive_mode = on` + `archive_command = /usr/bin/admin-mgr wal-push %p ...` (이미 WAL 백업 진행 중)

→ PITR 활성 시 변화 raw 후보 = **`wal_keep_size`** (현재 0MB, PITR 활성 시 증가 가능) 또는 보관 기간 관련 별도 설정.

→ 사후 검증 (Step C-1)에서 baseline 6행과 비교 시 변화 0~3건 정도 예상 (archive 관련은 이미 활성).

---

## 3. 영구 학습 후보 (4건)

### 학습 #1 (Supabase Pro Nano WAL baseline 이미 logical + archive_mode on)

Supabase Pro 플랜은 PITR Disabled 상태에서도 이미 WAL 보관 활성 (Realtime / Daily backup 위해). PITR 활성 시 차이는 **분 단위 복구 가능 여부 + WAL 보관 기간 (7~28일)**이지, WAL 자체 보관 시작 여부가 아님.

→ PITR 활성 = 분 단위 복구 + WAL 장기 보관 (5분 단위 회복 지점) / Daily 백업 = 24시간 단위 복구만 / 두 기능 병렬 운영 가능.

### 학습 #2 (PITR 결제 = 사용량 기반 prorated, 즉시 청구 X)

PITR add-on은 결제 카드 등록 + Confirm 클릭 시 즉시 카드 청구 발생 X. **청구 사이클 종료 시 사용량 기반 prorated 청구**.

→ 의뢰서 "결제 직전" 경계가 약간 모호 — Confirm 클릭은 결제 동의이지만 즉시 청구 X. 사용자가 5/6 슬롯에 즉시 결제 부담 0으로 진행 가능.

### 학습 #3 (Compute Nano → Small 차액 ~$5.15/월, 추정의 1/2 수준)

작업지시서 추정 +$10~$20/월 대비 실제 +$5.15/월. 차이 원인 = ARM CPU 효율 가성비 + Pro 플랜 베이스 산정 정합.

→ 신규 월 청구 ~$130.15/월 (Pro $25 + PITR $100 + Compute Small 차액 $5.15). 결정 문서 § 4 트랙 #A 견적 갱신 후보.

### 학습 #4 (PITR 전제 조건 = Compute Small 이상, 화면에서 자동 안내)

PITR Enable 화면에서 `"Project needs to be at least on a Small compute size"` 안내 + `Change compute size` 버튼 함께 표시. Supabase가 전제 조건 자동 안내.

→ 작업지시서 진행 순서 = Compute 먼저, PITR 나중 정합. 본 capture § 2-1 정정 명문화.

---

## 4. 사용자 인계 — 결제 진행 단계 (5/6 슬롯 직접)

### 4-1. ① Compute 업그레이드 먼저 (PITR 전제 조건)

1. Dashboard → `Settings` → `Compute and Disk` (또는 `Infrastructure` → `Compute size`)
2. **Small** 선택 (+$5.15/월, $0.0206/hour)
3. `Review changes` → `Confirm changes` 클릭
4. **프로젝트 자동 재시작 (수 분 다운타임)**
5. 라이브 사이트 https://onesecond.solutions 정상 작동 확인 (페이지 로드 / 로그인 / admin_v2 / DB fetch)

### 4-2. ② PITR 7 days 활성 (재시작 후)

1. Dashboard → `Database` → `Backups` → `Point in time` 탭
2. `Enable add-on` 클릭
3. **7 days** 선택 ($100/월) — Code 권장
4. `Confirm` 클릭 (즉시 카드 청구 X, 청구 사이클 종료 시 prorated)
5. PITR `Status: Active` 표기 확인

### 4-3. ③ 라이브 사이트 정상 작동 + 게시판 첨부 회귀 1회

- https://onesecond.solutions 진입
- 로그인 (`bylts0428@gmail.com`)
- admin_v2 진입 (`#admin/dashboard`)
- 게시판 진입 → 글쓰기 + 첨부 1건 → 등록 → 첨부 표시 확인 → 삭제 (board_attachments Storage 회귀)

→ 회귀 0 후 사후 검증 의뢰서 진입 (Code 별도 발행).

---

## 5. 결제 완료 후 사후 검증 (Code가 별도 의뢰서 발행)

`docs/specs/v1_1_safety_pitr_post_payment_chrome_request_2026-05-05.md` 신설 예정:

- Step C-1 WAL 설정 변화 raw (본 capture § 1-5 baseline 비교)
- Step C-2 PITR Active 상태 raw (Status / Retention / Earliest restore point / Latest restore point)
- Step C-3 Compute Small 표기 raw
- Step C-4 Storage 첨부 회귀 1회 + 콘솔 RLS 오류 0
- 본 트랙 #A PASS 판정 + 본 capture § 6 사후 검증 결과 누적
- _INDEX.md 미해결 #22 트랙 #A ✅ 종료 표기

---

## 6. 사후 검증 결과 raw (결제 완료 후 누적)

### 6-1. WAL 변화 raw (Step C-1)

⏸ 결제 완료 후 회신 누적 예정.

### 6-2. PITR Active raw (Step C-2)

⏸ 대기.

### 6-3. Compute Small raw (Step C-3)

⏸ 대기.

### 6-4. Storage 회귀 raw (Step C-4)

⏸ 대기.

---

## 7. 본 capture 변경·재논의 트리거

1. 결제 완료 후 사후 검증 결과 raw 추가 (§ 6 누적)
2. WAL baseline 변화 0건 시 → § 8 안전 protocol 진입 (PITR 활성 미완료 가능성)
3. 라이브 회귀 결함 발견 시 → 본 capture § 7 ROLLBACK 결정
4. 5/13~14 Step D 분 단위 복구 시뮬 결과 추가

---

## 8. 본 capture가 인용되는 후속 산출물

- 결제 후 사후 검증 의뢰서 (5/6 슬롯 발행 예정)
- _INDEX.md 미해결 #22 갱신 (트랙 #A 진행 상황)
- 결정 문서 § 4 트랙 #A 비용 raw 정정 (신규 청구 ~$130.15/월)
- 5/13~14 Step D 분 단위 복구 시뮬 결과 raw

---

*본 capture는 PITR 결제 직전 5/5 PASS 결과 raw + 영구 학습 4건 + 진행 순서 정정. 결제 완료 후 § 6 사후 검증 결과 누적.*
