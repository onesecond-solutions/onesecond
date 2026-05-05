# v1.1 운영 안전장치 트랙 #A — Supabase PITR 작업지시서

> **작성일:** 2026-05-05 (결재 #1 (a) 채택 후 신설)
> **작성자:** Claude Code
> **선행 산출물:**
> - 결정 문서: `docs/decisions/2026-05-05_v1_1_safety_3track_schedule.md` § 4 트랙 #A + § 5 회신 박스 ((a) 채택)
> - 4/22~23 사고 학습: `docs/sessions/_INDEX.md` 미해결 #22 / `CLAUDE.md` 폐기 기록 (구버전 DB 데이터 소실)
> - 메모리 `supabase_pricing.md` (Pro $25/월 + Nano Compute / Daily 백업 Enabled / **PITR Disabled**)
> **상태:** 🟢 결재 (a) 회신 완료 → Dashboard 진입 즉시 가능 (5/6 슬롯, 1일 shift 적용)
> **우선순위:** 🔴 1순위 — 데이터 손실 방어 = 최우선 안전망 / 4팀 오픈 5/15 직전 안전장치 3종 중 첫 번째

---

## 0. 큰 그림 정합성 검증

### 배경

- **Daily 백업** = 24시간 단위 복구 (현 상태)
- **PITR (Point-in-Time Recovery)** = 분 단위 복구 (WAL 보관)
- 4/22~23 구버전 DB 사고 시점에도 **Daily 백업만 가용** → 24시간 단위 복구 한계 (학습: `CLAUDE.md` Supabase DB 작업 규칙)
- 4팀 오픈 5/15 직전까지 PITR 미활성 시 동일 사고 재발 시 **분 단위 복구 불가**

### 본 작업의 역할

- 안전장치 3종 중 **#A (1순위)** — 데이터 영역
- 트랙 #B Sentry (런타임 에러 추적) / #C Playwright (회귀 자동화) 진입 전 선행
- 본 작업 = Dashboard 결제·설정 + 검증 SQL (코드 변경 0건)

### 정합 충돌 0

- 메인 트랙 admin_v2 Phase D-9 Step 5와 코드 영역 다름 → 병렬 진행 가능
- 별 트랙 #25 Storage RLS sweep과 무관 (5/11 슬롯)

---

## 1. 작업 범위 (4 Step)

### Step A — 사전 검증 (~10분, Code + 팀장님 협업)

**목적:** Compute 사이즈 / 현재 백업 상태 / WAL 설정 확인 → Step B 진입 정합

**A-1. 신버전 DB 확인 (필수, CLAUDE.md 절대 룰)**

팀장님께 먼저 확인:

> "Supabase Dashboard 왼쪽 상단 프로젝트 표시가 `onesecond-v1-restore-0420` 맞으신가요?
> 또는 URL의 프로젝트 ID가 `pdnwgzneooyygfejrvbg`로 시작하나요?"

답변 확인 전까지 어떤 SQL도 실행하지 않음.

**A-2. 현재 Compute 사이즈 확인 (Dashboard)**

Dashboard 경로: `Settings → Infrastructure → Compute size`

확인 사항:
- 현재 사이즈 = `Nano` (메모리 `supabase_pricing.md` 기준)
- PITR 요구사항 = `Small 이상`

→ Compute 업그레이드 필요 (Step B-2에서 동반 결제)

**A-3. 현재 백업 상태 확인 (Dashboard)**

Dashboard 경로: `Database → Backups`

확인 사항:
- Daily backup = `Enabled` (현 상태 유지)
- PITR section = `Disabled` (본 작업으로 활성)

**A-4. 현재 WAL 설정 raw 확인 (Code 검증 SQL)**

```sql
-- 신버전 DB 확인
SELECT current_database();

-- 현재 WAL 관련 설정 raw
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

Step B 활성 후 동일 SQL 재실행 → 변경 사항 비교 (Step C-1).

### Step B — Dashboard 진입 (팀장님 직접 진행, 결제 동반)

**B-1. PITR 애드온 활성**

Dashboard 경로: `Database → Backups → Point in Time Recovery`

진입 단계:
1. `Enable PITR` 또는 `Add-on 활성` 버튼 클릭
2. **PITR 보관 기간 선택** — Code 권장: **7일** (4팀 오픈 직후 사고 발견 시간 여유 + 비용 최소)
   - 7일: $100/월
   - 14일: $200/월
   - 28일: $400/월
3. 결제 카드 등록 (필요 시)
4. 활성 확인 (Dashboard 상태 표시)

**B-2. Compute 업그레이드 (Nano → Small)**

Dashboard 경로: `Settings → Infrastructure → Compute size → Upgrade`

진입 단계:
1. `Small` 선택 (PITR 요구 최소 사이즈)
2. 비용 확인: $10~$20/월 (Nano $0 → Small $10~$20 차액)
3. **재시작 동반** (수 분 다운타임) — 라이브 사이트 사용자 0명 시점 권장 (예: 새벽 또는 점심)
4. 업그레이드 후 라이브 사이트 정상 작동 확인 (`https://onesecond.solutions` 새로고침 + 로그인 + admin 진입)

**B-3. 결제 안내**

| 항목 | 비용 | 비고 |
|---|---|---|
| Pro 플랜 (현재) | $25/월 | 기존 청구 |
| PITR 7일 보관 | +$100/월 | 본 트랙 신규 |
| Compute Small | +$10~$20/월 | Nano $0 차액 |
| **신규 월 청구 합계** | **$135~$145/월** | (Pro $25 포함) |

> 참고: PITR 14일 / 28일 보관 선택 시 +$200 / +$400. Code 권장 = **7일** (가성비 + 4팀 오픈 직후 사고 발견 여유).

### Step C — 사후 검증 (~5분, Code SQL + Dashboard 확인)

**C-1. WAL 설정 변경 확인 (Code SQL)**

Step A-4와 동일 SQL 재실행. 기대 변화:
- `wal_level`: `replica` → `logical` 또는 동일
- `archive_mode`: `off` → `on`
- `archive_command`: 빈값 → S3 또는 PG WAL 보관 명령
- `max_wal_size`: 증가
- `wal_keep_size`: 증가

**C-2. PITR 활성 상태 확인 (Dashboard)**

Dashboard 경로: `Database → Backups → Point in Time Recovery`

기대 표시:
- Status: `Active`
- Earliest restore point: 활성 시점부터 +수 분
- Latest restore point: 최신 (수 분 단위)

**C-3. Compute 사이즈 확인 (Dashboard)**

Dashboard 경로: `Settings → Infrastructure → Compute size`

기대 표시: `Small` (이전 `Nano` 대비)

**C-4. 라이브 사이트 정상 작동 확인 (팀장님 위임)**

- `https://onesecond.solutions` 진입
- 로그인 (admin 본 계정 `bylts0428@gmail.com`)
- admin_v2 진입 (`#admin/dashboard`)
- 게시판 진입 + 글 작성 1건 (Storage 첨부 포함 권장 — board_attachments 회귀)
- 새로고침 후 데이터 정합 확인

→ 회귀 0 확인 후 본 트랙 PASS.

### Step D — 분 단위 복구 시뮬 (5/13~14 종합 회귀 슬롯)

**D-1. 테스트 row INSERT (시점 T1 기록)**

```sql
-- 테스트 row INSERT 직전 시각 raw
SELECT now() AT TIME ZONE 'Asia/Seoul' AS t1_seoul, now() AS t1_utc;

-- 테스트 row INSERT (admin 본 계정으로)
INSERT INTO public.activity_logs (event_type, user_id, metadata, created_at)
VALUES ('pitr_test', auth.uid(), '{"note": "PITR 시뮬 테스트"}', now())
RETURNING id, created_at;
```

T1 시각·INSERT id 기록.

**D-2. 즉시 row DELETE (T2 시점)**

```sql
-- DELETE 직전 시각 raw
SELECT now() AT TIME ZONE 'Asia/Seoul' AS t2_seoul, now() AS t2_utc;

-- 위 INSERT row DELETE
DELETE FROM public.activity_logs WHERE event_type = 'pitr_test' AND id = '<위 INSERT id>';
```

T2 시각 기록 (T1 + 수 분).

**D-3. PITR Restore 시뮬 (Dashboard, T1.5 시점 = T1과 T2 중간)**

Dashboard 경로: `Database → Backups → Point in Time Recovery → Restore`

진입 단계:
1. Restore 시점 선택 = T1.5 (예: T1 + 30초)
2. **DRY RUN 또는 별도 프로젝트 복구** 권장 (라이브 DB 직접 복구 시 다른 데이터 영향)
3. 복구 결과 → activity_logs row 존재 확인

> ⚠️ **Step D는 5/13~14 종합 회귀 슬롯에서만 진행** — 본 작업지시서 5/6 진입 시점에는 Step A·B·C까지만 PASS 후 별도 보류.

---

## 2. 비용·청구 안내

### 즉시 청구 (Step B 결제 시점)

- PITR 7일 보관: **+$100/월**
- Compute Small: **+$10~$20/월** (Nano 차액)
- **신규 월 청구 합계: $135~$145/월** (Pro $25 포함)

### 4팀 오픈 후 트래픽 증가 시 추가 검토

- DAU 50명 초과 시 Small Compute 부족 → Medium 격상 필요 가능 ($30~$50/월 추가)
- PITR 14일 보관 격상 필요 시 +$100/월 추가
- 본 작업지시서 범위 외 (5/15 이후 별도 결재)

---

## 3. 진입 차단 신호 (Step B 진입 직전 강제 체크)

- [x] 결재 #1 PITR 비용 (a) 회신 완료 (2026-05-05)
- [ ] 신버전 DB 확인 완료 (Step A-1)
- [ ] 현재 Compute 사이즈 = Nano 확인 (Step A-2)
- [ ] 현재 PITR Disabled 확인 (Step A-3)
- [ ] WAL 설정 raw 캡처 완료 (Step A-4)
- [ ] 라이브 사이트 사용자 0명 시점 선택 (Step B-2 재시작 다운타임 동반)

---

## 4. 결과 capture 위치

**신설 capture 파일:** `docs/architecture/db_pitr_activation_capture.md`

기록 항목:
1. 본 작업 진입 시각 raw + 결재 회신 인용 (결정 문서 § 5)
2. Step A-2 / A-3 / A-4 사전 raw
3. Step B-1 PITR 보관 기간 선택 + 결제 시각
4. Step B-2 Compute 업그레이드 + 다운타임 raw
5. Step C-1 / C-2 / C-3 사후 raw + 회귀 결과
6. Step D 시뮬 결과 (5/13~14 슬롯에서 추가)
7. 영구 학습 후보 raw

---

## 5. 다음 액션 (5/6 슬롯)

1. **본 작업지시서 commit + push** (5/6 진입 직전 산출물 명문화)
2. **팀장님 Dashboard 진입** — Step A → Step B → Step C 순차 진행
3. **결과 capture** (`db_pitr_activation_capture.md` 신설)
4. **트랙 #B Sentry 5/11 슬롯 진입 직전 본 트랙 PASS 확인** (결정 문서 § 6 차단 신호)

---

## 6. 본 트랙 변경·재논의 트리거

다음 신호 발생 시 본 트랙 재논의:

1. PITR 7일 보관 → 14일 / 28일 격상 필요 (4팀 오픈 후 사고 발견 시간 부족)
2. Compute Small → Medium 격상 필요 (트래픽 증가)
3. PITR 활성 후 라이브 회귀 결함 발견 (Step C-4)
4. Step D 시뮬 실패 (Restore 결과 row 부재)

---

**작성:** Code 트랙 #A 작업지시서 (2026-05-05 결재 (a) 회신 후)
**다음 액션:** 본 commit + push → 5/6 슬롯 팀장님 Dashboard 진입 → Step C 사후 검증 → capture 신설
