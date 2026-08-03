#!/usr/bin/env bash
# ============================================================
# Newsletter 추가분 (2026-07 백필 1 + 2026-08 신규 3) — 2026-08-03
# 7월 파이프라인 복제. service_role 값 미출력. 4 고정 해시 외 접근 안 함.
# MODE: upload|verify|register|promote|rollback
# ============================================================
set -euo pipefail
MODE="${1:-verify}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV="$ROOT/.env.local"
[ -f "$ENV" ] || { echo "STOP: .env.local 없음"; exit 1; }
URL="$(tr -s '[:space:]' '\n' < "$ENV" | grep -m1 '^SUPABASE_URL=' | cut -d= -f2-)"
KEY="$(tr -s '[:space:]' '\n' < "$ENV" | grep -m1 '^SUPABASE_SERVICE_ROLE_KEY=' | cut -d= -f2-)"
[ -n "$URL" ] && [ -n "$KEY" ] || { echo "STOP: URL/KEY 비어있음"; exit 1; }
case "$URL" in *pdnwgzneooyygfejrvbg*) : ;; *) echo "STOP: 신버전 프로젝트 아님"; exit 1 ;; esac
AUTH=(-H "apikey: $KEY" -H "Authorization: Bearer $KEY")
API="$URL/rest/v1/newsletters"
BUCKET="newsletters"
DL="/c/Users/az/Downloads"

# fh|company|itype|category|title|month|prefix|localfile
ROWS=(
  "1cd2b21c64568decbb3590962e3b8b20c284a1400ca731eae185cad72f374e96|메리츠화재|손해|소식지|메리츠화재 GA소식지 26.07|7|2026-07|$DL/메리츠화재 GA소식지 26.07.pdf"
  "644dcd7bb63e6506734ca2788bd22c490dd022be0d8eeb2e6d61dc1c6233f7d2|메리츠화재|손해|소식지|메리츠화재 GA소식지 26.08|8|2026-08|$DL/메리츠화재 GA소식지 26.08.pdf"
  "9efb904c25b3be2197deddda4d6f958745fb566041fdb712a324fcd4c64cbb67|라이나손해보험|손해|소식지|라이나손보 GA소식지 26.08|8|2026-08|$DL/라이나손보 GA소식지 26.08.pdf"
  "66836549c6e0c863c6bbb57b3afff16ff8857f195261ea0df9d3ca1cf7ea89de|하나손해보험|손해|소식지|하나손보 GA소식지 26.08(펼침면)|8|2026-08|$DL/하나손보 GA소식지 26.08(펼침면).pdf"
)
[ "${#ROWS[@]}" = "4" ] || { echo "STOP: 행 4 아님(${#ROWS[@]})"; exit 1; }

jesc(){ local s="$1"; s="${s//\\/\\\\}"; s="${s//\"/\\\"}"; printf '"%s"' "$s"; }
exists(){ curl -s "${AUTH[@]}" "$API?file_hash=eq.$1&select=id" | grep -c '"id"'; }

echo "== MODE=$MODE =="
up=0; upfail=0; ins=0; skip=0; prom=0; del=0
for r in "${ROWS[@]}"; do
  IFS='|' read -r fh co it ca ti mo pf lf <<< "$r"
  sp="$pf/$fh.pdf"; sf="$ti.pdf"
  case "$MODE" in
    upload)
      [ -f "$lf" ] || { echo "  FAIL 로컬없음 $lf"; upfail=$((upfail+1)); continue; }
      ah="$(sha256sum "$lf" | awk '{print $1}')"
      [ "$ah" = "$fh" ] || { echo "  ABORT 해시불일치 $ti ($ah)"; exit 3; }
      code="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$URL/storage/v1/object/$BUCKET/$sp" \
        "${AUTH[@]}" -H "x-upsert: true" -H "Content-Type: application/pdf" --data-binary "@$lf")"
      [ "$code" = "200" ] || [ "$code" = "201" ] && { echo "  UP  $ti"; up=$((up+1)); } || { echo "  UPFAIL http=$code $ti"; upfail=$((upfail+1)); } ;;
    verify)
      echo "  $([ "$(exists "$fh")" -gt 0 ] && echo EXISTS || echo MISSING)  $co / 2026.$mo  <- $ti" ;;
    register)
      if [ "$(exists "$fh")" -gt 0 ]; then echo "  SKIP(중복) $ti"; skip=$((skip+1)); continue; fi
      body="{\"source_filename\":$(jesc "$sf"),\"company\":$(jesc "$co"),\"insurance_type\":$(jesc "$it"),\"publish_year\":2026,\"publish_month\":$mo,\"category\":$(jesc "$ca"),\"title\":$(jesc "$ti"),\"source_path\":$(jesc "$sp"),\"file_hash\":$(jesc "$fh"),\"status\":\"reviewing\"}"
      tmp="$(mktemp)"; printf '%s' "$body" > "$tmp"
      code=$(curl -s -o /dev/null -w '%{http_code}' "${AUTH[@]}" -H "Content-Type: application/json" -H "Prefer: return=minimal" -X POST "$API" --data-binary "@$tmp"); rm -f "$tmp"
      [ "$code" = "201" ] && { echo "  INSERT reviewing $ti"; ins=$((ins+1)); } || { echo "  FAIL http=$code $ti — 중단"; exit 3; } ;;
    promote)
      code=$(curl -s -o /dev/null -w '%{http_code}' "${AUTH[@]}" -H "Content-Type: application/json" -H "Prefer: return=minimal" -X PATCH "$API?file_hash=eq.$fh&status=eq.reviewing" -d '{"status":"published"}')
      [ "$code" = "204" ] || [ "$code" = "200" ] && { echo "  PUBLISH $ti"; prom=$((prom+1)); } || { echo "  FAIL http=$code $ti"; exit 3; } ;;
    rollback)
      code=$(curl -s -o /dev/null -w '%{http_code}' "${AUTH[@]}" -H "Prefer: return=minimal" -X DELETE "$API?file_hash=eq.$fh")
      [ "$code" = "204" ] || [ "$code" = "200" ] && { echo "  DELETE $ti"; del=$((del+1)); } || echo "  (del http=$code) $ti" ;;
  esac
done
echo "== 완료: up=$up upfail=$upfail ins=$ins skip=$skip prom=$prom del=$del =="
