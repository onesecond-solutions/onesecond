# CI 마이그레이션 러너 — 최종 설계 (구현본)

대표 승인 조건 10건 반영. **main 머지만으로 운영 DB 자동 변경 금지** — apply는 `production-db` Environment 수동 승인 후에만.

## 파일
- `.github/workflows/db-migrate.yml` — 워크플로(validate + deploy)
- `scripts/ci/precheck.mjs` — 사전검사(무DB)
- `scripts/ci/apply_and_verify.sh` — apply + 사후검증(승인 후)
- `scripts/ci/postverify_nlstd.sql` — 감사센터 사후검증(DB 권한 계층)
- `db/migrations/2026-07-03_ci_ops_migration_history.sql` — 정식 이력 구조(ops 스키마)

## 흐름
PR 검수 → 머지 → validate(자동, 무Secret) → **production-db 승인 1회(대표)** → apply → 사후 verify → 이력 기록. 검증 실패 시 deploy job 전체 FAIL·추가 중단·자동 down 없음.

## 부트스트랩 교착 해결 (item 1)
기존 마이그레이션은 push 감지가 안 되므로 **제한형 workflow_dispatch**로 파일명 지정. 입력=파일명만(SQL 본문 아님)·`^[A-Za-z0-9._-]+\.sql$`·경로이탈/URL/공백/셸 금지·현재 커밋 존재·미적용분만·승인 전 Secret 불가. 부트스트랩 후엔 push 자동감지 기본 + 누락복구용 수동 유지.

## 이력 구조 (item 3)
모든 운영 DDL은 리뷰 마이그레이션 안에. `ops.migration_history`(별도 스키마, RLS on·정책0·authenticated usage 0). apply 잡이 즉석 생성하지 않음 — 이 마이그레이션이 **CI 러너 최초 apply 대상**(감사센터보다 먼저). 최초 apply 시 이력 테이블 부재는 러너가 graceful 처리(그 apply가 테이블을 만들고, 이후 기록).

## 배포 역할 권한표 (item 6)
연결 Secret `SUPABASE_DB_URL` = **전용 최소권한 역할 `ci_migrate`**(슈퍼유저·과도한 소유자 아님, 1회 설정은 대시보드 elevated).

| 허용 | 불가(기본) |
|---|---|
| CREATE on schema public, ops | 슈퍼유저 |
| CREATE TABLE/FUNCTION/POLICY | BYPASSRLS(기본 미부여) |
| CREATEROLE (함수 소유자 역할 생성·소유권 이전용) | 임의 테이블 DROP(사전검사가 차단) |
| GRANT/REVOKE (자기 소유 객체) | newsletters 데이터 UPDATE/DELETE(사전검사 차단) |
| INSERT (매핑 시드 등) | 로그인(대화형) — CI 연결 전용 |

> `alter function … owner to ac_nlstd_fn_owner`는 `ci_migrate`가 해당 역할 멤버십 보유 시 가능. 슈퍼유저 불필요.

## 사전검사 한계 (item 7)
정규식은 **명백한 금지구문·파일/해시/경로·newsletters 데이터변경·기존 마이그레이션 수정**만 탐지. 주석·달러인용($$…$$) 본문 제거 후 탑레벨만 스캔(함수 본문의 `update newsletters` 오탐 방지). **최종 문법·실행가능성은 psql ON_ERROR_STOP 트랜잭션이 판정.** 검사 스크립트 자체도 검수팀 테스트 대상.

## 검증 2계층 (item 8)
- **CI(DB 권한 계층):** 객체·RPC4·RLS·직접쓰기정책0·PUBLIC EXECUTE 회수·함수 소유자·ops 접근차단. (JWT 무관 카탈로그 질의)
- **라이브 계정 게이트(별도 유지):** 임태성 실장 일반 계정으로 감사센터 비노출·RPC 직접호출 불가·소식지 검색/열람 정상 + admin 세션 prepare 실행가능·대상건수·개인문서/reviewing 제외·published 532/reviewing 2 불변.

## prepare 변경 범위 표현 (item 9)
"newsletters **원본** 변경 0 + 감사센터 작업·백업 테이블(ac_nlstd_jobs/job_items)에 **준비 기록 생성**". "DB 변경 0"으로 표기하지 않음.

## 첫 실행 순서 (item 10)
1. 워크플로 독립 보안 검수
2. production-db Environment·Secret 설정 확인(대표/설정 담당)
3. 제한형 수동 실행으로 `2026-07-03_ci_ops_migration_history.sql`(이력) → 이어서 `2026-07-03_nlstd_audit_center.sql`(감사센터) 지정
4. 대표 운영 배포 승인 1회(각)
5. apply + 자동 사후 검증
6. 임태성 실장 계정 실행 전 라이브 검수
7. 전부 PASS 후에만 [승인하고 실행] 상신. **회사명 실제 표준화는 CI 부트스트랩에 미포함.**

## 보안 검수 시나리오 (item 10)
fork PR 트리거 불가 · 비main push 무시 · 승인 없이 Secret 접근 0 · 2파일 이상 FAIL · 기존 마이그레이션 수정/삭제 FAIL · newsletters UPDATE 포함 FAIL · 재실행(동일 해시) FAIL · 경로이탈 파일명 FAIL · Secret/연결문자열 로그 노출 0 · psql 실패 시 부분 적용 0 · 사후검증 FAIL 시 완료보고 0·자동 down 0 · project 마커 불일치 시 중단.
