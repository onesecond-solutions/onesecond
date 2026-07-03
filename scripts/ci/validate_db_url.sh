#!/usr/bin/env bash
# 비운영 진단(parse-only): SUPABASE_DB_URL 파싱 상태 플래그만 출력.
#   - DB 접속 없음 · DB 변경 없음 · psql 없음.
#   - 비밀번호 원문/일부값/해시·전체 URL 절대 미출력(값 → 파생 플래그만).
#   - apply_and_verify.sh와 동일 파싱 로직 → 실제 배포 잡이 보게 될 값과 일치.
# 보안: set -x 금지 · URL/비번 에코 금지.
set -euo pipefail

: "${SUPABASE_DB_URL:?missing}"
PROJECT_REF="${PROJECT_REF:-pdnwgzneooyygfejrvbg}"

# 조건7과 동일: 표준 PG* 분해(비밀번호 percent-decode). 마지막 @ 기준으로 user:pass / host 분리.
_dec(){ printf '%s' "$1" | perl -pe 's/%([0-9A-Fa-f]{2})/chr(hex($1))/ge'; }
_np="${SUPABASE_DB_URL#*://}"; _up="${_np%@*}"; _hp="${_np##*@}"
_hpq="${_hp%%\?*}"; _hostport="${_hpq%%/*}"
_RAWPW="${_up#*:}"                       # 디코드 전 원본 비번(URL에 저장된 그대로)
PGUSER="$(_dec "${_up%%:*}")"
PGPASSWORD="$(_dec "$_RAWPW")"           # 실제 PG에 전달되는 값(디코드 후)
PGDATABASE="${_hpq#*/}"
PGHOST="${_hostport%%:*}"
PGPORT="5432"
[ "$_hostport" = "$PGHOST" ] || PGPORT="${_hostport##*:}"
# Supabase pooler는 사용자명이 postgres.<ref> 형식 필요 — ref 누락 시 자동 보정(배포 잡과 동일).
case "$PGHOST" in
  *pooler.supabase.com*) case "$PGUSER" in *.*) : ;; *) PGUSER="${PGUSER}.${PROJECT_REF}" ;; esac ;;
esac

# 비밀번호 상태 플래그만(값 미출력). ⚠️ percent 검사는 반드시 '디코드 전' 원본에서 — 디코드 후엔 %XX가 사라져 오탐.
case "$_RAWPW" in
  *%[0-9A-Fa-f][0-9A-Fa-f]*) PW_PERCENT=percentlike ;;   # %XX 존재 → _dec가 디코드(치환)함 = 원본과 달라짐
  *%*)                       PW_PERCENT=raw_percent ;;    # % 있으나 %XX 아님
  *)                         PW_PERCENT=none ;;
esac
case "$_RAWPW" in
  *YOUR-PASSWORD*|*'['*|*']'*|"") PW_STATE=PLACEHOLDER_OR_EMPTY ;;  # 치환 안 된 플레이스홀더/공백
  *)                              PW_STATE=filled ;;
esac
# _dec가 실제로 비번을 바꿨는가(percent-decode 오손 여부의 직접 증거). 값은 미출력.
if [ "$_RAWPW" = "$PGPASSWORD" ]; then PW_DECODE_CHANGED=no; else PW_DECODE_CHANGED=yes; fi

echo "=== SUPABASE_DB_URL parse-only diagnose (DB 접속 없음) ==="
echo "pw_state=$PW_STATE"
echo "pw_len=${#PGPASSWORD}"
echo "pw_len_raw=${#_RAWPW}"
echo "pw_percent=$PW_PERCENT"
echo "pw_decode_changed=$PW_DECODE_CHANGED"
echo "PGHOST=$PGHOST"
echo "PGUSER=$PGUSER"
echo "PGDATABASE=$PGDATABASE"
echo "PROJECT_REF=$PROJECT_REF"
echo "NOTE: 비밀번호 값·전체 URL 미출력 · DB 접속/변경 0."
