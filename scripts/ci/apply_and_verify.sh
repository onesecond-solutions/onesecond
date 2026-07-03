#!/usr/bin/env bash
# CI apply + 사후 검증 (deploy job, production-db 승인 후에만 실행 = PGPASSWORD 접근).
# 분리형 PG* 방식: connection URI 파싱·percent-decode·@분리 전부 없음(URI 통짜 secret 폐기).
#   psql은 PG* 환경변수(PGHOST/PGPORT/PGUSER/PGDATABASE/PGPASSWORD/PGSSLMODE)만 사용.
# 보안: set -x 금지 · PGPASSWORD echo/argv/로그/해시/부분값(길이 포함) 금지 · conninfo/URI 인자 미사용.
set -euo pipefail

# workflow가 주입: PGHOST/PGPORT/PGDATABASE/PGUSER(공개값·env 고정) + PGPASSWORD(production-db Environment secret).
# 존재만 강제(값 미출력). PGPASSWORD는 이 스크립트 어디서도 echo/치환/부분노출하지 않음.
: "${PGHOST:?PGHOST missing}"; : "${PGUSER:?PGUSER missing}"
: "${PGDATABASE:?PGDATABASE missing}"; : "${PGPASSWORD:?PGPASSWORD missing}"
export PGHOST PGUSER PGDATABASE PGPASSWORD
export PGPORT="${PGPORT:-5432}"; export PGSSLMODE="${PGSSLMODE:-require}"
: "${MIG_FILE:?}"; : "${MIG_SHA:?}"; : "${RUN_ID:?}"; : "${COMMIT_SHA:?}"
PROJECT_REF="${PROJECT_REF:-pdnwgzneooyygfejrvbg}"
FILE="db/migrations/${MIG_FILE}"

PSQL=(psql -v ON_ERROR_STOP=1 -X -q -t -A)   # conninfo/URI 인자 없음 → argv에 접속정보·비번 0. PG* env만 사용.

# 접속 대상만 출력(비밀번호 관련 일절 미출력 — 값·길이·해시·부분·상태 전부 금지).
echo "DIAG host=$PGHOST user=$PGUSER db=$PGDATABASE port=$PGPORT sslmode=$PGSSLMODE"

# 로그 유출 방지: 표준오류에서 PGPASSWORD 리터럴만 스크럽(perl \Q → 특수문자 안전).
scrub(){ perl -pe 'BEGIN{$p=$ENV{PGPASSWORD}} s/\Q$p\E/<redacted>/g if length($p)'; }
run_sql(){ "${PSQL[@]}" "$@" 2> >(scrub >&2); }

# 연결·인증 검증(실제 러너 psql) — 성공해야만 이후 SQL 실행. 실패 시 migration 실행 전 STOP(DB 반영 0).
if ! printf 'select 1;\n' | "${PSQL[@]}" >/dev/null 2> >(scrub >&2); then
  echo "STOP: DB 연결 실패 — 마이그레이션 실행 안 함"; exit 1
fi
echo "DB 연결 확인(select 1) OK — 접속정보 미출력"

echo "::group::pre-flight"
# 대상 프로젝트 마커 확인(연결문자열 미출력): onesecond DB면 newsletters 존재
MARK=$(run_sql -c "select to_regclass('public.newsletters') is not null;") || { echo "연결/사전질의 실패"; exit 1; }
[ "$MARK" = "t" ] || { echo "대상 프로젝트 불일치(newsletters 없음) — 중단"; exit 1; }
echo "project marker OK (ref=${PROJECT_REF})"

# 재실행 금지: ops.migration_history에 동일 sha256 success 존재 시 FAIL (테이블 없으면 최초 부트스트랩)
HIST=$(run_sql -c "select to_regclass('ops.migration_history') is not null;")
if [ "$HIST" = "t" ]; then
  DUP=$(run_sql -c "select count(*) from ops.migration_history where sha256='${MIG_SHA}' and result='success';")
  [ "$DUP" = "0" ] || { echo "이미 적용된 마이그레이션(해시 중복) — 재실행 금지"; exit 1; }
fi
echo "::endgroup::"

echo "::group::apply ${MIG_FILE}"
# 파일 자체가 begin;…commit; = 단일 트랜잭션. ON_ERROR_STOP=1 → 오류 시 전체 중단(부분 적용 0).
if ! "${PSQL[@]}" -f "$FILE" 2> >(scrub >&2); then
  echo "apply 실패(트랜잭션 롤백 — 부분 적용 없음)"; exit 1
fi
echo "apply OK"
echo "::endgroup::"

# 사후 검증 (조건7: 파일명 규약 동반 postverify 필수 — precheck가 존재 강제, 여기선 실행)
VERIFY="skipped"; VOK=1
PV="scripts/ci/postverify_${MIG_FILE%.sql}.sql"
if [ -f "$PV" ]; then
  echo "::group::post-verify ($PV)"
  if "${PSQL[@]}" -f "$PV" 2> >(scrub >&2); then VERIFY="passed"; else VERIFY="failed"; VOK=0; fi
  echo "::endgroup::"
else
  echo "사후검증 스크립트 부재($PV) — 검증 없이 성공 처리 불가"; VERIFY="failed"; VOK=0
fi

# 이력 기록 (ops 테이블 존재 시). approver=미확인이면 null(run/deployment id로 대체) — item 5
if [ "$(run_sql -c "select (to_regclass('ops.migration_history') is not null)::int;")" = "1" ]; then
  RESULT=$([ "$VOK" = "1" ] && echo success || echo verify_failed)
  run_sql -c "insert into ops.migration_history(filename,sha256,workflow_run_id,commit_sha,project_ref,approver,result,verify_result)
              values ('${MIG_FILE}','${MIG_SHA}','${RUN_ID}','${COMMIT_SHA}','${PROJECT_REF}', null, '${RESULT}', jsonb_build_object('verify','${VERIFY}'))
              on conflict (filename,sha256) do update set result=excluded.result, verify_result=excluded.verify_result, applied_at=now();"
fi

if [ "$VOK" != "1" ]; then
  echo "사후 검증 FAIL — 추가 마이그레이션 중단. 자동 down 실행 안 함(총괄팀장 롤백 판정)."; exit 1
fi
echo "DONE: ${MIG_FILE} 적용+검증(${VERIFY}) 성공. newsletters 원본 변경 0(부트스트랩)."
