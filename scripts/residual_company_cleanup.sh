#!/usr/bin/env bash
# 원수사 소식지 잔여 회사명 정제 — 한 자격 세션: diagnose | patch | rollback | verify
# 대상=잔여 오염값만. 정상 데이터 무접촉. id 기준 수정. 스냅샷 롤백. 예상외/근거부족 자동 보류·중단.
# service_role 값 미출력. .env.local은 세션 중에만(작업 직후 삭제).
set -euo pipefail
MODE="${1:-diagnose}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV="$ROOT/.env.local"
SNAP="$ROOT/scripts/_residual_snapshot.tsv"   # id \t old_company \t old_type  (자격 아님)
PLAN="$ROOT/scripts/_residual_plan.tsv"        # id \t new_company \t new_type \t reason
[ -f "$ENV" ] || { echo "STOP: .env.local 없음(자격 세션 대기)"; exit 1; }
URL="$(tr -s '[:space:]' '\n' < "$ENV" | grep -m1 '^SUPABASE_URL=' | cut -d= -f2-)"
KEY="$(tr -s '[:space:]' '\n' < "$ENV" | grep -m1 '^SUPABASE_SERVICE_ROLE_KEY=' | cut -d= -f2-)"
[ -n "$URL" ] && [ -n "$KEY" ] || { echo "STOP: URL/KEY 비어있음"; exit 1; }
case "$URL" in *pdnwgzneooyygfejrvbg*) : ;; *) echo "STOP: 신버전 프로젝트 아님"; exit 1 ;; esac
A=(-H "apikey: $KEY" -H "Authorization: Bearer $KEY")
API="$URL/rest/v1/newsletters"
# 잔여 오염값 집합(정상 회사명은 여기 없음). 개인문서 2건 제외.
RESID='미상,라이나,소식지,MG손보,MG손해보험,MG손해보험GA소식지'
P1='28b9c9b7-6403-419c-b73d-c081ddac4903'; P2='856d7bda-f6ff-41a3-8e4c-9eb168632600'
FILT="or=(company.in.($RESID),company.ilike.*.pdf)"

# 잔여행 메타 CSV (full_text 제외; 개인문서 제외)
fetch_csv(){ curl -s -G "${A[@]}" -H "Accept: text/csv" "$API" \
  --data-urlencode "$FILT" --data-urlencode "id=not.in.($P1,$P2)" \
  --data-urlencode "select=id,company,insurance_type,source_filename,title,source_path" \
  --data-urlencode "order=company.asc,source_filename.asc"; }
ft(){ curl -s -G "${A[@]}" "$API" --data-urlencode "id=eq.$1" --data-urlencode "select=full_text" | tr -d '\n' | head -c 400; }

# 판정 규칙 → NEWCO|NEWTYPE|REASON|ACTION(fix/hold). 근거 부족=hold.
judge(){ local co="$1" sf="$2" id="$3"; local body
  case "$co" in
    'MG손보'|'MG손해보험'|'MG손해보험GA소식지') echo "MG손해보험|손해|MG소식지 연속물(OCR MG손해보험)|fix"; return;;
  esac
  if [ "$co" = '미상' ]; then
    if printf '%s' "$sf" | grep -qi 'IBK'; then echo "IBK연금보험|생명|파일태그 [IBK]|fix"; return; fi
    body="$(ft "$id")"
    if printf '%s' "$body" | grep -q '신한라이프'; then echo "신한라이프|생명|본문 신한라이프 상품군|fix"; return; fi
    if printf '%s' "$body" | grep -qi 'IBK'; then echo "IBK연금보험|생명|본문 IBK|fix"; return; fi
    echo "-|-|미상: 본문 발행사 불명|hold"; return
  fi
  # 라이나·소식지·파일명값 등 그 외 = 대표 승인상 자동수정 금지 → 조사만·항상 hold
  echo "-|-|자동수정 제외(조사·보류 전용): $co|hold"
}

case "$MODE" in
diagnose)
  echo "== DIAGNOSE (읽기전용) =="
  : > "$SNAP"; : > "$PLAN"; n=0; fx=0; hd=0
  fetch_csv | tail -n +2 | while IFS=, read -r id co it sf ti sp; do
    id="${id//\"/}"; co="${co//\"/}"; it="${it//\"/}"; sf="${sf//\"/}"
    [ -n "$id" ] || continue
    printf '%s\t%s\t%s\n' "$id" "$co" "$it" >> "$SNAP"
    IFS='|' read -r nco nt rs ac <<< "$(judge "$co" "$sf" "$id")"
    if [ "$ac" = fix ]; then
      printf '%s\t%s\t%s\t%s\n' "$id" "$nco" "$nt" "$rs" >> "$PLAN"
      echo "  FIX   [$co/$it] -> [$nco/$nt]  ($rs)  <- $sf"
    else
      echo "  HOLD  [$co/$it]  ($rs)  <- $sf"
      echo "        본문: $(ft "$id" | head -c 160)"
    fi
  done
  echo "-- 스냅샷: $SNAP / 패치안: $PLAN --"
  echo "-- FIX $(wc -l < "$PLAN") / HOLD $(( $(wc -l < "$SNAP") - $(wc -l < "$PLAN") )) / 총 $(wc -l < "$SNAP") --" ;;
patch)
  [ -s "$PLAN" ] || { echo "STOP: 패치안 없음(diagnose 먼저)"; exit 1; }
  echo "== PATCH (승인분만·id 스코프) =="; ap=0
  while IFS=$'\t' read -r id nco nt rs; do
    # 가드: 현재 company가 잔여값(또는 .pdf)인지 재확인 → 정상데이터면 건너뜀
    cur="$(curl -s -G "${A[@]}" --data-urlencode "id=eq.$id" --data-urlencode "select=company" | tr -d '\n')"
    if ! printf '%s' "$cur" | grep -qE '미상|라이나|소식지|MG손보|MG손해보험|\.pdf'; then
      echo "  SKIP(정상/이미변경) $id"; continue; fi
    tmp="$(mktemp)"; printf '{"company":"%s","insurance_type":"%s"}' "$nco" "$nt" > "$tmp"
    code="$(curl -s -o /dev/null -w '%{http_code}' "${A[@]}" -H "Content-Type: application/json" -H "Prefer: return=minimal" -X PATCH "$API?id=eq.$id" --data-binary "@$tmp")"; rm -f "$tmp"
    [ "$code" = "204" -o "$code" = "200" ] && { echo "  PATCH $id -> $nco/$nt"; ap=$((ap+1)); } || { echo "  FAIL http=$code $id — 전체 중단"; exit 3; }
  done < "$PLAN"
  echo "== 적용 $ap 건 ==" ;;
rollback)
  [ -s "$SNAP" ] || { echo "STOP: 스냅샷 없음"; exit 1; }
  echo "== ROLLBACK (스냅샷 복원) =="; rb=0
  while IFS=$'\t' read -r id oco ot; do
    tmp="$(mktemp)"; printf '{"company":"%s","insurance_type":%s}' "$oco" "$([ "$ot" = "" ] && echo null || printf '"%s"' "$ot")" > "$tmp"
    code="$(curl -s -o /dev/null -w '%{http_code}' "${A[@]}" -H "Content-Type: application/json" -H "Prefer: return=minimal" -X PATCH "$API?id=eq.$id" --data-binary "@$tmp")"; rm -f "$tmp"
    [ "$code" = "204" -o "$code" = "200" ] && rb=$((rb+1)) || echo "  (rb http=$code) $id"
  done < "$SNAP"
  echo "== 복원 $rb 건 ==" ;;
verify)
  echo "== VERIFY 잔여값 현황 =="; fetch_csv | tail -n +2 | wc -l | xargs echo "잔여행 남음:" ;;
*) echo "MODE: diagnose|patch|rollback|verify"; exit 2 ;;
esac
