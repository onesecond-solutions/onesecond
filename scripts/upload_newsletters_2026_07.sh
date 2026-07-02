#!/usr/bin/env bash
# ============================================================
# Newsletter 2026-07 uploader  (UPLOAD-ONLY, no newsletters INSERT)
# 2026-07-02. Pipeline WO docs/work_orders/2026-07-01_newsletter_submit_pipeline.md
#
# WHY upload-only (differs from June script):
#   July flow = [Code] Storage upload + hash table  ->  [GPT/Web] create_draft (creates DB row)
#               ->  [Code] source_path UPDATE.  Code must NOT INSERT into newsletters here.
#
# Storage key = "2026-07/<sha256>.pdf"  (ASCII, unique, idempotent on re-run; Korean name kept
#   only in the connection table / later source_filename column).
# Bucket: newsletters (private).  Reads creds from ../.env.local  (never printed).
#
# Usage:
#   bash scripts/upload_newsletters_2026_07.sh            # DRY-RUN (default, no writes)
#   bash scripts/upload_newsletters_2026_07.sh --execute  # real Storage upload
#   bash scripts/upload_newsletters_2026_07.sh --verify   # read-only: list 2026-07/ objects
# ============================================================
set -euo pipefail

MODE="dryrun"
case "${1:-}" in
  --execute) MODE="execute" ;;
  --verify)  MODE="verify" ;;
  ""|--dry-run|--dryrun) MODE="dryrun" ;;
  *) echo "unknown arg: $1"; exit 2 ;;
esac

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV="$ROOT/.env.local"
[ -f "$ENV" ] || { echo "ERROR: .env.local not found"; exit 1; }

# --- load creds (values never echoed) ---
SUPABASE_URL="$(grep -m1 '^SUPABASE_URL=' "$ENV" | cut -d= -f2- | tr -d '\r' | xargs)"
SERVICE_KEY="$(grep -m1 '^SUPABASE_SERVICE_ROLE_KEY=' "$ENV" | cut -d= -f2- | tr -d '\r' | xargs)"
[ -n "$SUPABASE_URL" ] && [ -n "$SERVICE_KEY" ] || { echo "ERROR: SUPABASE_URL or SERVICE key empty"; exit 1; }
# --- project guard: new project only ---
case "$SUPABASE_URL" in
  *pdnwgzneooyygfejrvbg*) : ;;
  *) echo "ERROR: not new project (pdnwgzneooyygfejrvbg) -> abort"; exit 1 ;;
esac

BUCKET="newsletters"
PREFIX="2026-07"
MANIFEST="$ROOT/scripts/_newsletter_2026_07_manifest.csv"

# --- source roots (life / fire) ---
LIFE_ROOT="$ROOT/upgrade_20260521/소식지/2026년 7월 생명보험 소식지 모음-20260701T025759Z-3-001"
FIRE_ROOT="$ROOT/upgrade_20260521/소식지/2026년 7월 손해보험 소식지 모음-20260701T025817Z-3-001"

# --- ledger allowlist: 23 known sha256 (docs/work_orders/2026-07-01_newsletter_july_hashes.md) ---
ALLOW="568aeee342c14cd418148739a51654420cef30ca32d5f3e268bf5a13f41875f1
f90de3ce7540d874d07a69f37e7aaaedacaaaa9c9f008497ac858307e120982a
b899d232f3cff9a9b75ed2758ffc7ab43b1d864c4a174c6101bf32789007bd22
a5577c5cd8ff1e98efe6d7f664ab5b230efcb8d5edc764344853aff642fbe502
3394be369dfc475a2397ba67cb240f4360226ca1c2ea687089b9f0446d6fe3c1
d84a99ba3cfe212d9411cb245012b8fca96e82d30d910b5de7f0e0b79ce07591
fe411fcf23f7ae54ca7bfeab171aa1d09f5c0980e7ed0b1ca9a1329fa540b6f5
73415e35da7c328deaeefedf0432a3d3f71e249c34e8a745742510542b94372f
45727411374c9050fcddcf778e915a09a226fec98379297eedbd8541afedb476
1e49d4315f33d1c8c17e6b613c94daf963fa0021c46cdfcac2a88ab478f4f7e8
f3255a0b8c52262e1a4463edebf92bcbd0a614b4666b81b312c5b9e47b5698ae
24e35519aba950a8323139828f12d09055135be42a46b5604b1e39f6e9ced8b6
def14ba6684bbfb87a837da841bc771dce8178d53d3c04a1771650ba8756260d
efe303e11aff2ce30d1840eafd18a9100384fb3c5a11c0452c3bc1b09edae8f8
0c15d8f963a2f7d97bfe6c970b97576ad6599c4275098a73ee3c54f30b9b229c
a69075fb2934909944241baffa520d1d3b5f0c93bde0fcd3cf53cdd977af47a1
0866e7759db849eafbac31ad583625be7fbcb9912220a15f23e9637757339f41
8deb8bc6fc2daf46ef1c3a63f08013f44f67ac9d1e6de3f7536967171e6a38cb
6a679e5992bb26f90321fbd9a9b241dc0362af3c353c9c2e4e58a9955614adc9
0c26e9a0b4626b3f2b0165bef56958c103336f773b8e6de438a8c115e5c5074b
a35371c9a65ca1d4ec83272f6420b9f83c0995e5a71aa9239389d5da1e68cd5c
b861d4cee3c1b74c199ae8c9241b6577519d317ed61765572846258d3a9f4d2d
7cea47ad49c73a7a0fcd2314287d6bb00c2163456684137967d5f0cadd317922"

is_allowed() { echo "$ALLOW" | grep -qx "$1"; }

# --- verify mode: read-only list of what is already in the bucket under 2026-07/ ---
if [ "$MODE" = "verify" ]; then
  echo "=== VERIFY (read-only): list $BUCKET/$PREFIX/ ==="
  curl -s -X POST "$SUPABASE_URL/storage/v1/object/list/$BUCKET" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"prefix\":\"$PREFIX/\",\"limit\":1000,\"sortBy\":{\"column\":\"name\",\"order\":\"asc\"}}"
  echo
  exit 0
fi

echo "=== Newsletter 2026-07 upload [$MODE] (UPLOAD-ONLY, no DB INSERT) ==="
echo "Project guard: pdnwgzneooyygfejrvbg OK / Bucket: $BUCKET (private) / key=$PREFIX/<sha256>.pdf"
echo

# manifest header (create once)
if [ ! -f "$MANIFEST" ]; then echo "file_hash,source_path,size_bytes,insurance_type,status,http_code" > "$MANIFEST"; fi

plan=0; done_n=0; skip=0; fail=0
process() {
  local root="$1" itype="$2"
  [ -d "$root" ] || { echo "ERROR: source root missing: $root"; exit 1; }
  while IFS= read -r f; do
    local name h size key
    name="$(basename "$f")"
    h="$(sha256sum "$f" | awk '{print $1}')"
    size="$(stat -c %s "$f")"
    if ! is_allowed "$h"; then
      echo "  ABORT  unknown hash (not in ledger): $name"; echo "         -> stop, no further upload"; exit 3
    fi
    key="$PREFIX/$h.pdf"
    # resume: skip if manifest already records OK for this hash
    if grep -q "^$h,.*,OK," "$MANIFEST" 2>/dev/null; then
      echo "  SKIP   [$itype] $name  (manifest OK)"; skip=$((skip+1)); continue
    fi
    echo "  PLAN   [$itype] $name  ->  $key  ($size bytes)"
    plan=$((plan+1))
    if [ "$MODE" = "execute" ]; then
      code="$(curl -s -o /dev/null -w '%{http_code}' \
        -X POST "$SUPABASE_URL/storage/v1/object/$BUCKET/$key" \
        -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
        -H "x-upsert: true" -H "Content-Type: application/pdf" \
        --data-binary "@$f")"
      if [ "$code" = "200" ] || [ "$code" = "201" ]; then
        echo "$h,$key,$size,$itype,OK,$code" >> "$MANIFEST"; done_n=$((done_n+1))
      else
        echo "         FAIL http=$code"; echo "$h,$key,$size,$itype,FAIL,$code" >> "$MANIFEST"; fail=$((fail+1))
      fi
    fi
  done < <(find "$root" -type f -name "*.pdf" | sort)
}

process "$LIFE_ROOT" "life"
process "$FIRE_ROOT" "fire"

echo
echo "=== Summary ==="
echo "Plan(new): $plan / resume-skip: $skip"
if [ "$MODE" = "execute" ]; then
  echo "Uploaded: $done_n / Failed: $fail"
  echo "Manifest: $MANIFEST"
else
  echo "DRY-RUN - nothing written. Re-run with --execute after review."
fi
