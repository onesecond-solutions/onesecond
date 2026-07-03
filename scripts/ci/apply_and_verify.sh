#!/usr/bin/env bash
# CI apply + 사후 검증 (deploy job, Environment 승인 후에만 실행 = Secret 접근 가능).
# 보안(item 6): set -x 금지 · DB_URL/환경변수 에코 금지 · 오류 로그에 연결문자열 미노출.
set -euo pipefail

: "${SUPABASE_DB_URL:?missing}"   # Environment Secret (값 출력 안 함)
: "${MIG_FILE:?}"; : "${MIG_SHA:?}"; : "${RUN_ID:?}"; : "${COMMIT_SHA:?}"
PROJECT_REF="${PROJECT_REF:-pdnwgzneooyygfejrvbg}"
FILE="db/migrations/${MIG_FILE}"

# 조건7: 공식 URI를 표준 PG* 환경변수로 안전 분해(비밀번호 percent-decode). PGDATABASE=dbname만(전체 URI 아님).
#   secret을 셸 명령문에 결합하거나 argv/conninfo 인자에 노출하지 않음. psql은 PG* env로만 접속.
_dec(){ printf '%s' "$1" | perl -pe 's/%([0-9A-Fa-f]{2})/chr(hex($1))/ge'; }
_np="${SUPABASE_DB_URL#*://}"; _up="${_np%@*}"; _hp="${_np##*@}"      # user:pass / host:port/db?query (마지막 @ 기준)
_hpq="${_hp%%\?*}"; _q="${_hp#*\?}"; _hostport="${_hpq%%/*}"
export PGUSER="$(_dec "${_up%%:*}")"
export PGPASSWORD="$(_dec "${_up#*:}")"
export PGDATABASE="${_hpq#*/}"
export PGHOST="${_hostport%%:*}"
[ "$_hostport" = "$PGHOST" ] || export PGPORT="${_hostport##*:}"
# Supabase pooler(Supavisor)는 사용자명이 postgres.<projectref> 형식 필요 — ref 누락 시 자동 보정.
case "$PGHOST" in
  *pooler.supabase.com*) case "$PGUSER" in *.*) : ;; *) export PGUSER="${PGUSER}.${PROJECT_REF}" ;; esac ;;
esac
case "$_q" in *sslmode=*) _sm="${_q##*sslmode=}"; export PGSSLMODE="${_sm%%&*}";; *) export PGSSLMODE=require;; esac
unset _np _up _hp _hpq _q _hostport _sm SUPABASE_DB_URL_UNUSED
PSQL=(psql -v ON_ERROR_STOP=1 -X -q -t -A)   # conninfo 인자 없음 → argv에 접속정보 0

# 안전 진단(비밀번호 값 절대 미출력): 접속 구조·비번 상태 플래그만. 리전/user/ref/치환상태 규명용.
case "$PGPASSWORD" in *%[0-9A-Fa-f][0-9A-Fa-f]*) _pct=percentlike;; *%*) _pct=has_raw_percent;; *) _pct=none;; esac
case "$PGPASSWORD" in *YOUR-PASSWORD*|*'['*|*']'*|"") _ph=PLACEHOLDER_OR_EMPTY;; *) _ph=filled;; esac
echo "DIAG host=$PGHOST user=$PGUSER db=$PGDATABASE port=${PGPORT:-5432} sslmode=$PGSSLMODE pw_len=${#PGPASSWORD} pw_percent=$_pct pw_state=$_ph"
unset _pct _ph

# 로그 유출 방지: URL·비밀번호 스크럽(perl \Q 리터럴 → 특수문자 안전).
scrub(){ perl -pe 'BEGIN{$u=$ENV{SUPABASE_DB_URL};$p=$ENV{PGPASSWORD}} s/\Q$u\E/<redacted>/g if length($u); s/\Q$p\E/<redacted>/g if length($p)'; }
run_sql(){ "${PSQL[@]}" "$@" 2> >(scrub >&2); }

# 조건: 연결 검증(실제 러너 psql 버전) — 성공해야만 이후 SQL 실행. 실패 시 즉시 중단.
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
