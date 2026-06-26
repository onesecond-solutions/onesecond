# 영업노트 import 재개 핸드오프 — 회사 PC 전용

> 생성: 2026-06-26 저녁 (집 PC) — **작업 재개 없음. 현재 확정 상태 기록 + 다음 회사 PC 세션 재진입 절차만.**
> 대표님 지시 정정: "업데이트"는 회사 PC에서 원본을 가공해 STEP1 파일을 만든 것까지를 의미. **GitHub push·DB 적재까지 끝났다는 뜻이 아님.**

---

## 현재 확정 상태 (대표님 직접 확인, 2026-06-26)

- **STEP1 DB 실행 안 됨**
- **`_sales_import_staging` 테이블 없음**
- **고객·상담 본 테이블 적재 0건** (`sales_customers` / `sales_consultations` / `sales_status_history` 전부 비어있음)
- **GitHub에는 개인정보 없는 STEP2만 존재**: `docs/ops/2026-06-26_sales_import_step2_load.sql` (변환·검증, 주민번호 리터럴 0)
- **원본 엑셀(`상담리스트_정리.xlsx`) + STEP1 SQL(1.2MB·주민번호 평문)은 회사 PC의 gitignore 폴더(`upgrade_20260521/`)에만 존재**
- 집 PC에는 원본·STEP1·`dbwork` 연결도구 **모두 없음** (gitignore라 PC 간 동기화 안 됨 — 의도된 개인정보 보호 설계)

---

## 다음 회사 PC 작업 절차 (한 단계씩 · 추측 금지)

0. **DB 신버전 확인** — Dashboard 프로젝트 = `onesecond-v1-restore-0420` / ID `pdnwgzneooyygfejrvbg` (확인 전 어떤 SQL도 작성·실행 금지)
1. **원본·STEP1 파일 실재 확인** — `upgrade_20260521/` 안에 엑셀 원본 + STEP1 staging SQL이 실제로 있는지 먼저 확인 (없으면 재가공부터)
2. **28P01 디버깅을 새로 정리해서 시작** (아래 주의)
3. 연결 통과 후 **STEP1 적재** → `_sales_import_staging` 2,621행
4. **STEP2 변환** — ROLLBACK 검증 5줄 확인 (기대값 2583 / 2621 / 230 / 35 / 2621)
5. 대표님 승인 → **COMMIT** → `DROP TABLE _sales_import_staging`
6. **영업노트 화면** (별 트랙, import 완료 후) — 목록·고객카드·상담 타임라인, `is-uat-salesnote` 류 게이트, Phase1 AI 없음(외부전송 0)

---

## 28P01 / 연결 주의사항

- **이전 scratchpad 경로(`dbwork/`, `connect_v3.js`, `diag.js` 등) 재사용 금지** — 대표님 지시. 새로 정리해서 시작.
- 직전 세션 결론: BASE 파싱 정상(host `aws-1-ap-south-1.pooler.supabase.com`·5432·user `postgres.pdnwgzneooyygfejrvbg`)이나 `28P01 password authentication failed` 지속 → **비번/pooler 인증으로 좁혀짐**.
- 우회로 후보(다음 세션에서 새로 검토):
  - (a) node(pg) 직접연결 재정비 — PW 길이/공백·user 전달값 눈으로 확정
  - (b) Transaction pooler(6543) vs Session pooler(5432) 전환
  - (c) **STEP1을 800행 단위로 분할해 SQL Editor 통과** (1MB 초과 거부 우회 — 인증 문제 자체를 회피, 대표님이 SQL Editor에 직접 붙여넣기)
  - (d) psql / Supabase CLI 설치 후 `\i`
- 접속정보는 대표님 PowerShell 환경변수에만 (채팅·로그·git 노출 0).

---

## 개인정보 보호 (절대)

- **STEP1(주민번호 1.2MB) = raw 공개 금지 · gitignore 유지 · 대표님 직접 실행**
- 변환·검증 SQL(STEP2 · 데이터 리터럴 0)만 raw 공개 가능 (Chrome 의뢰용)
- Chrome AI에 STEP1 전달 금지

---

## 참고

- 직전 세션 상세: `docs/sessions/2026-06-26_1244.md`
- DB 스키마(대표 SELECT 회신): `sales_customers`(18) / `sales_consultations`(10) / `sales_status_history`(7), RLS 전부 `ALL · (auth.uid())::text = owner_id`. `public.users.auth_user_id` 컬럼 없음 → owner_id = `auth.users.id` (import SQL이 `auth.users('bylts@naver.com')` 자동 조회).
- 설계 요약: 전화 dedup(고객 2,583), 원문 100% 보존(memo = 상담내용 + [추가메모] + [원본]), 상담일자 빈값 32 → `2000-01-01` sentinel, `source_ref='imp:<키>'` 매핑.
