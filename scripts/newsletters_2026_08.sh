#!/usr/bin/env bash
# ============================================================
# Newsletter 2026-08 pipeline (upload + register + promote + rollback)
# 2026-08-03. 7월 파이프라인(docs/work_orders/2026-07-01_newsletter_submit_pipeline.md) 복제.
# service_role 값 미출력. 23 고정 해시 외 어떤 행도 접근 안 함. .env.local은 작업 중에만.
#
# MODE:
#   upload    Storage 업로드(newsletters 버킷, 키 2026-08/<sha256>.pdf, x-upsert 멱등)
#   verify    등록 상태 조회(EXISTS/MISSING)
#   register  newsletters 23행 INSERT (status=reviewing, 중복 file_hash SKIP)
#   promote   reviewing → published 승격
#   rollback  23행 DELETE (복구용)
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
BUCKET="newsletters"; PREFIX="2026-08"
LIFE_ROOT="$ROOT/upgrade_20260521/소식지/2026년 8월 생명보험 소식지 모음"
FIRE_ROOT="$ROOT/upgrade_20260521/소식지/2026년 8월 손해보험 소식지 모음"

# 23 고정행: fh|company|itype|category|title|localfile
ROWS=(
  '0f0e0ca1940234df4f2f129585233b91f1c33fed04607f8f5a4ca2eb87bd501e|DB손해보험|손해|소식지|DB손보 GA소식지 26.08|노주영_2608_DB손보.pdf'
  'd6ca47daa47e097c3eccbd8d853d62a68a269af6dd87ef6e0cbdabe0126a1b00|KB손해보험|손해|소식지|KB손보 GA소식지 26.08|노주영_2608_KB손보.pdf'
  '3315ce70d160b9f75b644e86fd84bd52902c92d35d140935a4a275a2190a8bb6|NH농협손해보험|손해|소식지|NH농협손보 GA소식지 26.08|노주영_2608_농협손보.pdf'
  '926ef1d9748d23d15f26e511e0b5621fba6583e25f381b93303cc723277f5798|롯데손해보험|손해|소식지|롯데손보 GA소식지 26.08|노주영_2608_롯데손보.pdf'
  '4c6172f38db4b91a4d57ab27c50c892547369470ae0601050faeb694ed4b6490|삼성화재|손해|소식지|삼성화재 GA소식지 26.08|노주영_2608_삼성화재.pdf'
  '8cb09960eae985d7f78cd16db55ad7a5a4361eeb81b94a89e41af7debfed2dea|하나손해보험|손해|소식지|하나손보 GA소식지 26.08|노주영_2608_하나손보.pdf'
  '724fee6e2eaff3e5d6cabcd5997b6956701ead62dba69b595324ca0158d2a022|한화손해보험|손해|소식지|한화손보 GA소식지 26.08|노주영_2608_한화손보.pdf'
  '0e06391d813097107f5f6cfabb641f1cfc6063f17fb18ac244ffdc622051b68f|현대해상|손해|소식지|현대해상 GA소식지 26.08|노주영_2608_현대해상.pdf'
  '1f8d805a96182e8e3a6c01f99324ea6702b20ce3da0a8f5b2f7b0e5b5af045fc|흥국화재|손해|소식지|흥국화재 GA소식지 26.08|노주영_2608_흥국화재.pdf'
  'b8b4d4b22be3bf6eb007a366c4389d7de174fe74b5c82a3743b0fbc13da44487|NH농협생명|생명|소식지|NH농협생명 GA소식지 26.08|2608_농협생명.pdf'
  '25fdca9d4c7383ad7558f22aa02b815f226a82e7caa75d4edb63cfe26781a388|동양생명|생명|소식지|동양생명 GA소식지 26.08|2608_동양생명.pdf'
  'abe2df5abd742680c710b353a1842c3595a8e21415b8d0cb9d9658f5c3c7a403|라이나생명|생명|소식지|라이나생명 GA소식지 26.08|2608_라이나생명.pdf'
  'efe96b81484526240aa65c2f83a539196d7602cf88a4630b8e3dae4705909262|ABL생명|생명|소식지|ABL생명 GA소식지 26.08|노주영_2608_ABL.pdf'
  'b013331982cb966150c8c07fb1df3c4a5cefb18b672bcc3e3ecbfd79fee22250|AIA생명|생명|소식지|AIA생명 GA소식지 26.08|노주영_2608_AIA.pdf'
  '2a012559eb68cc3a73337b7c2655c8142049993460be2ef8eb6c4474b2f7e882|DB생명|생명|소식지|DB생명 GA소식지 26.08|노주영_2608_DB생명.pdf'
  'f16a451ac78f81f2e64d7da0a6ca60a7a80c36ccfbd54d2af1b088887556bc64|KB라이프|생명|소식지|KB라이프 GA소식지 26.08|노주영_2608_KB라이프.pdf'
  '50d47a3b5ac1bc87456c3aa4fb802e190ce77b50831a6961af97d4956e0da11d|KDB생명|생명|소식지|KDB생명 GA소식지 26.08|노주영_2608_KDB생명.pdf'
  '40901376c6a73d1cf6c0882b323fe2ff95a1a32787d9dd510a7fc55aa7f93094|메트라이프|생명|소식지|메트라이프 GA소식지 26.08|노주영_2608_메트라이프.pdf'
  '1a1e6c084e57bd41533ff597fcc5d72fc82a23a34ad24e79e06ad9fe9b5abf91|삼성생명|생명|소식지|삼성생명 GA소식지 26.08|노주영_2608_삼성생명.pdf'
  '2118e5e0d99db2e1ecca3ce81b05abcc7b021e5b996b211007a89e65afbeb13e|신한라이프|생명|소식지|신한라이프 GA소식지 26.08|노주영_2608_신한라이프.pdf'
  '3486cf1e3e44ff4d2e1188955ec5e7b094cb405423c83eed20afe3a05301b625|하나생명|생명|소식지|하나생명 GA소식지 26.08|노주영_2608_하나생명.pdf'
  '06e05fc48f5145c5fee60f905a2fbf021768e0e93bfb52d8e0052ffbac9e63ff|한화생명|생명|소식지|한화생명 GA소식지 26.08|노주영_2608_한화생명.pdf'
  'ce0787847d2a8c790af86f3970ecd1f7fa0d2abb7e09d1f0d7ed05bb1741fa73|흥국생명|생명|소식지|흥국생명 GA소식지 26.08|노주영_2608_흥국생명.pdf'
)
[ "${#ROWS[@]}" = "23" ] || { echo "STOP: 내장 행 23 아님(${#ROWS[@]})"; exit 1; }

jesc(){ local s="$1"; s="${s//\\/\\\\}"; s="${s//\"/\\\"}"; printf '"%s"' "$s"; }
count_aug(){ curl -s "${AUTH[@]}" -H "Prefer: count=exact" -I "$API?publish_year=eq.2026&publish_month=eq.8&select=id" | tr -d '\r' | awk -F'/' 'tolower($0) ~ /content-range/{print $NF}'; }
exists(){ curl -s "${AUTH[@]}" "$API?file_hash=eq.$1&select=id" | grep -c '"id"'; }
localpath(){ local f="$1"; [ -f "$LIFE_ROOT/$f" ] && { echo "$LIFE_ROOT/$f"; return; }; [ -f "$FIRE_ROOT/$f" ] && { echo "$FIRE_ROOT/$f"; return; }; echo ""; }

echo "== MODE=$MODE / 2026-08 현재 행수: $(count_aug) =="
up=0; upskip=0; upfail=0; ins=0; skip=0; prom=0; del=0
for r in "${ROWS[@]}"; do
  IFS='|' read -r fh co it ca ti lf <<< "$r"
  sp="$PREFIX/$fh.pdf"; sf="$ti.pdf"
  case "$MODE" in
    upload)
      f="$(localpath "$lf")"; [ -n "$f" ] || { echo "  FAIL 로컬파일없음 $lf"; upfail=$((upfail+1)); continue; }
      ah="$(sha256sum "$f" | awk '{print $1}')"
      [ "$ah" = "$fh" ] || { echo "  ABORT 해시불일치 $lf ($ah)"; exit 3; }
      code="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$URL/storage/v1/object/$BUCKET/$sp" \
        "${AUTH[@]}" -H "x-upsert: true" -H "Content-Type: application/pdf" --data-binary "@$f")"
      if [ "$code" = "200" ] || [ "$code" = "201" ]; then echo "  UP  $co  <- $lf"; up=$((up+1));
      else echo "  UPFAIL http=$code $lf"; upfail=$((upfail+1)); fi ;;
    verify)
      echo "  $([ "$(exists "$fh")" -gt 0 ] && echo EXISTS || echo MISSING)  $co / $it / $ca  <- $ti" ;;
    register)
      if [ "$(exists "$fh")" -gt 0 ]; then echo "  SKIP(중복) $ti"; skip=$((skip+1)); continue; fi
      body="{\"source_filename\":$(jesc "$sf"),\"company\":$(jesc "$co"),\"insurance_type\":$(jesc "$it"),\"publish_year\":2026,\"publish_month\":8,\"category\":$(jesc "$ca"),\"title\":$(jesc "$ti"),\"source_path\":$(jesc "$sp"),\"file_hash\":$(jesc "$fh"),\"status\":\"reviewing\"}"
      tmp="$(mktemp)"; printf '%s' "$body" > "$tmp"
      code=$(curl -s -o /dev/null -w '%{http_code}' "${AUTH[@]}" -H "Content-Type: application/json" -H "Prefer: return=minimal" -X POST "$API" --data-binary "@$tmp"); rm -f "$tmp"
      if [ "$code" = "201" ]; then echo "  INSERT reviewing $ti"; ins=$((ins+1)); else echo "  FAIL http=$code $ti — 전체 중단"; exit 3; fi ;;
    promote)
      code=$(curl -s -o /dev/null -w '%{http_code}' "${AUTH[@]}" -H "Content-Type: application/json" -H "Prefer: return=minimal" -X PATCH "$API?file_hash=eq.$fh&status=eq.reviewing" -d '{"status":"published"}')
      [ "$code" = "204" ] || [ "$code" = "200" ] && { echo "  PUBLISH $ti"; prom=$((prom+1)); } || { echo "  FAIL http=$code $ti"; exit 3; } ;;
    rollback)
      code=$(curl -s -o /dev/null -w '%{http_code}' "${AUTH[@]}" -H "Prefer: return=minimal" -X DELETE "$API?file_hash=eq.$fh")
      [ "$code" = "204" ] || [ "$code" = "200" ] && { echo "  DELETE $ti"; del=$((del+1)); } || echo "  (del http=$code) $ti" ;;
  esac
done
echo "== 완료: up=$up upfail=$upfail ins=$ins skip=$skip prom=$prom del=$del / 2026-08 행수: $(count_aug) =="
