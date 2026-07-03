#!/usr/bin/env bash
# 7월 소식지 23건 복구 — 기존 등록 경로(REST + service_role 임시). MODE: verify|register|promote|rollback
# service_role 값 미출력. 23 고정 해시 외 어떤 테이블·행도 접근하지 않음. .env.local은 작업 중에만.
set -euo pipefail
MODE="${1:-verify}"
ENV="$(cd "$(dirname "$0")/.." && pwd)/.env.local"
[ -f "$ENV" ] || { echo "STOP: .env.local 없음 — 대표 1회 입력 대기(SUPABASE_URL·SUPABASE_SERVICE_ROLE_KEY)"; exit 1; }
URL="$(tr -s '[:space:]' '\n' < "$ENV" | grep -m1 '^SUPABASE_URL=' | cut -d= -f2-)"
KEY="$(tr -s '[:space:]' '\n' < "$ENV" | grep -m1 '^SUPABASE_SERVICE_ROLE_KEY=' | cut -d= -f2-)"
[ -n "$URL" ] && [ -n "$KEY" ] || { echo "STOP: URL/KEY 비어있음"; exit 1; }
case "$URL" in *pdnwgzneooyygfejrvbg*) : ;; *) echo "STOP: 신버전 프로젝트 아님"; exit 1 ;; esac
AUTH=(-H "apikey: $KEY" -H "Authorization: Bearer $KEY")
API="$URL/rest/v1/newsletters"
# 23 고정행: fh|company|itype|category|title|source_path|source_filename
ROWS=(
  '1e49d4315f33d1c8c17e6b613c94daf963fa0021c46cdfcac2a88ab478f4f7e8|ABL생명|생명|영업방향|ABL생명 영업 Issue 26.07|2026-07/1e49d4315f33d1c8c17e6b613c94daf963fa0021c46cdfcac2a88ab478f4f7e8.pdf|ABL생명 영업 Issue 26.07.pdf'
  'f3255a0b8c52262e1a4463edebf92bcbd0a614b4666b81b312c5b9e47b5698ae|DB생명|생명|매거진|DB생명 위드유매거진 26.07|2026-07/f3255a0b8c52262e1a4463edebf92bcbd0a614b4666b81b312c5b9e47b5698ae.pdf|DB생명 위드유매거진 26.07.pdf'
  '568aeee342c14cd418148739a51654420cef30ca32d5f3e268bf5a13f41875f1|NH농협생명|생명|소식지|농협생명GA소식지 26.07|2026-07/568aeee342c14cd418148739a51654420cef30ca32d5f3e268bf5a13f41875f1.pdf|농협생명GA소식지 26.07.pdf'
  'f90de3ce7540d874d07a69f37e7aaaedacaaaa9c9f008497ac858307e120982a|동양생명|생명|소식지|동양생명 GA소식지 26.07|2026-07/f90de3ce7540d874d07a69f37e7aaaedacaaaa9c9f008497ac858307e120982a.pdf|동양생명 GA소식지 26.07.pdf'
  'b899d232f3cff9a9b75ed2758ffc7ab43b1d864c4a174c6101bf32789007bd22|라이나생명|생명|소식지|라이나생명 GA소식지 26.07|2026-07/b899d232f3cff9a9b75ed2758ffc7ab43b1d864c4a174c6101bf32789007bd22.pdf|라이나생명 GA소식지 26.07.pdf'
  'a5577c5cd8ff1e98efe6d7f664ab5b230efcb8d5edc764344853aff642fbe502|메트라이프|생명|소식지|메트라이프생명 GA소식지 26.07|2026-07/a5577c5cd8ff1e98efe6d7f664ab5b230efcb8d5edc764344853aff642fbe502.pdf|메트라이프생명 GA소식지 26.07.pdf'
  '3394be369dfc475a2397ba67cb240f4360226ca1c2ea687089b9f0446d6fe3c1|미래에셋생명|생명|소식지|미래에셋생명 GA소식지 26.07|2026-07/3394be369dfc475a2397ba67cb240f4360226ca1c2ea687089b9f0446d6fe3c1.pdf|미래에셋생명 GA소식지 26.07.pdf'
  'd84a99ba3cfe212d9411cb245012b8fca96e82d30d910b5de7f0e0b79ce07591|삼성생명|생명|소식지|삼성생명 GA소식지 26.07|2026-07/d84a99ba3cfe212d9411cb245012b8fca96e82d30d910b5de7f0e0b79ce07591.pdf|삼성생명 GA소식지 26.07.pdf'
  'fe411fcf23f7ae54ca7bfeab171aa1d09f5c0980e7ed0b1ca9a1329fa540b6f5|신한라이프|생명|소식지|신한라이프 GA소식지 26.07|2026-07/fe411fcf23f7ae54ca7bfeab171aa1d09f5c0980e7ed0b1ca9a1329fa540b6f5.pdf|신한라이프 GA소식지 26.07.pdf'
  '73415e35da7c328deaeefedf0432a3d3f71e249c34e8a745742510542b94372f|하나생명|생명|소식지|하나생명 GA소식지 26.07|2026-07/73415e35da7c328deaeefedf0432a3d3f71e249c34e8a745742510542b94372f.pdf|하나생명 GA소식지 26.07.pdf'
  '45727411374c9050fcddcf778e915a09a226fec98379297eedbd8541afedb476|한화생명|생명|소식지|한화생명 상품판매방향(소식지) 26.07|2026-07/45727411374c9050fcddcf778e915a09a226fec98379297eedbd8541afedb476.pdf|한화생명 상품판매방향(소식지) 26.07.pdf'
  '7cea47ad49c73a7a0fcd2314287d6bb00c2163456684137967d5f0cadd317922|DB손해보험|손해|소식지|DB손보 GA소식지 26.07|2026-07/7cea47ad49c73a7a0fcd2314287d6bb00c2163456684137967d5f0cadd317922.pdf|DB손보 GA소식지 26.07.pdf'
  '24e35519aba950a8323139828f12d09055135be42a46b5604b1e39f6e9ced8b6|롯데손해보험|손해|소식지|롯데손보 GA상품소식지 26.07|2026-07/24e35519aba950a8323139828f12d09055135be42a46b5604b1e39f6e9ced8b6.pdf|롯데손보 GA상품소식지 26.07.pdf'
  'a69075fb2934909944241baffa520d1d3b5f0c93bde0fcd3cf53cdd977af47a1|하나손해보험|손해|소식지|하나손보 GA소식지 26.07(단면)|2026-07/a69075fb2934909944241baffa520d1d3b5f0c93bde0fcd3cf53cdd977af47a1.pdf|하나손보 GA소식지 26.07(단면).pdf'
  '0c15d8f963a2f7d97bfe6c970b97576ad6599c4275098a73ee3c54f30b9b229c|하나손해보험|손해|소식지|하나손보 GA소식지 26.07|2026-07/0c15d8f963a2f7d97bfe6c970b97576ad6599c4275098a73ee3c54f30b9b229c.pdf|하나손보 GA소식지 26.07.pdf'
  'def14ba6684bbfb87a837da841bc771dce8178d53d3c04a1771650ba8756260d|하나손해보험|손해|리플렛|하나손보 영업이슈 리플렛 26.07|2026-07/def14ba6684bbfb87a837da841bc771dce8178d53d3c04a1771650ba8756260d.pdf|하나손보 영업이슈 리플렛 26.07.pdf'
  'efe303e11aff2ce30d1840eafd18a9100384fb3c5a11c0452c3bc1b09edae8f8|하나손해보험|손해|강의안|하나손보 운전자보험 강의안 20260616|2026-07/efe303e11aff2ce30d1840eafd18a9100384fb3c5a11c0452c3bc1b09edae8f8.pdf|하나손보 운전자보험 강의안 20260616.pdf'
  '0866e7759db849eafbac31ad583625be7fbcb9912220a15f23e9637757339f41|하나손해보험|손해|영업방향|하나손해보험 영업방향 26.07|2026-07/0866e7759db849eafbac31ad583625be7fbcb9912220a15f23e9637757339f41.pdf|하나손해보험 영업방향 26.07.pdf'
  '8deb8bc6fc2daf46ef1c3a63f08013f44f67ac9d1e6de3f7536967171e6a38cb|한화손해보험|손해|소식지|한화손보 GA뉴스 GA영업부문 26.07|2026-07/8deb8bc6fc2daf46ef1c3a63f08013f44f67ac9d1e6de3f7536967171e6a38cb.pdf|한화손보 GA뉴스 GA영업부문 26.07.pdf'
  '6a679e5992bb26f90321fbd9a9b241dc0362af3c353c9c2e4e58a9955614adc9|한화손해보험|손해|소식지|한화손보 GA소식지 26.07|2026-07/6a679e5992bb26f90321fbd9a9b241dc0362af3c353c9c2e4e58a9955614adc9.pdf|한화손보 GA소식지 26.07.pdf'
  '0c26e9a0b4626b3f2b0165bef56958c103336f773b8e6de438a8c115e5c5074b|현대해상|손해|매거진|현대해상 GA매거진 26.07|2026-07/0c26e9a0b4626b3f2b0165bef56958c103336f773b8e6de438a8c115e5c5074b.pdf|현대해상 GA매거진 26.07.pdf'
  'b861d4cee3c1b74c199ae8c9241b6577519d317ed61765572846258d3a9f4d2d|흥국화재|손해|소식지|흥국화재 GA소식지 26.07|2026-07/b861d4cee3c1b74c199ae8c9241b6577519d317ed61765572846258d3a9f4d2d.pdf|흥국화재 GA소식지 26.07.pdf'
  'a35371c9a65ca1d4ec83272f6420b9f83c0995e5a71aa9239389d5da1e68cd5c|흥국화재|손해|세일즈가이드|흥국화재 상품 세일즈 가이드 GA지원팀 26.07|2026-07/a35371c9a65ca1d4ec83272f6420b9f83c0995e5a71aa9239389d5da1e68cd5c.pdf|흥국화재 상품 세일즈 가이드 GA지원팀 26.07.pdf'
)
[ "${#ROWS[@]}" = "23" ] || { echo "STOP: 내장 행 23 아님(${#ROWS[@]})"; exit 1; }

jesc(){ local s="$1"; s="${s//\\/\\\\}"; s="${s//\"/\\\"}"; printf '"%s"' "$s"; }
count_jul(){ curl -s "${AUTH[@]}" -H "Prefer: count=exact" -I "$API?publish_year=eq.2026&publish_month=eq.7&select=id" | tr -d '\r' | awk -F'[ /]' 'tolower($1)=="content-range:"{print $NF}'; }
exists(){ local fh="$1"; curl -s "${AUTH[@]}" "$API?file_hash=eq.$fh&select=id" | grep -c '"id"'; }

echo "== MODE=$MODE / 2026-07 현재 행수: $(count_jul) =="
ins=0; skip=0; prom=0; del=0
for r in "${ROWS[@]}"; do
  IFS='|' read -r fh co it ca ti sp sf <<< "$r"
  case "$MODE" in
    verify)
      echo "  $([ "$(exists "$fh")" -gt 0 ] && echo EXISTS || echo MISSING)  $co / $it / $ca  <- $sf" ;;
    register)
      if [ "$(exists "$fh")" -gt 0 ]; then echo "  SKIP(중복) $sf"; skip=$((skip+1)); continue; fi
      body="{\"source_filename\":$(jesc "$sf"),\"company\":$(jesc "$co"),\"insurance_type\":$(jesc "$it"),\"publish_year\":2026,\"publish_month\":7,\"category\":$(jesc "$ca"),\"title\":$(jesc "$ti"),\"source_path\":$(jesc "$sp"),\"file_hash\":$(jesc "$fh"),\"status\":\"reviewing\"}"
      tmp="$(mktemp)"; printf '%s' "$body" > "$tmp"
      code=$(curl -s -o /dev/null -w '%{http_code}' "${AUTH[@]}" -H "Content-Type: application/json" -H "Prefer: return=minimal" -X POST "$API" --data-binary "@$tmp"); rm -f "$tmp"
      if [ "$code" = "201" ]; then echo "  INSERT reviewing $sf"; ins=$((ins+1)); else echo "  FAIL http=$code $sf — 전체 중단"; exit 3; fi ;;
    promote)
      code=$(curl -s -o /dev/null -w '%{http_code}' "${AUTH[@]}" -H "Content-Type: application/json" -H "Prefer: return=minimal" -X PATCH "$API?file_hash=eq.$fh&status=eq.reviewing" -d '{"status":"published"}')
      [ "$code" = "204" -o "$code" = "200" ] && { echo "  PUBLISH $sf"; prom=$((prom+1)); } || { echo "  FAIL http=$code $sf"; exit 3; } ;;
    rollback)
      code=$(curl -s -o /dev/null -w '%{http_code}' "${AUTH[@]}" -H "Prefer: return=minimal" -X DELETE "$API?file_hash=eq.$fh")
      [ "$code" = "204" -o "$code" = "200" ] && { echo "  DELETE $sf"; del=$((del+1)); } || echo "  (del http=$code) $sf" ;;
  esac
done
echo "== 완료: ins=$ins skip=$skip prom=$prom del=$del / 2026-07 행수: $(count_jul) =="
