#!/usr/bin/env bash
# =====================================================================
# WAV → MP3 파생본 변환·업로드·playback_path 연결 (회사 PC 전용)
# =====================================================================
# 원칙: 원본 WAV·storage_path 불변. MP3는 같은 폴더의 별도 객체(.play.mp3),
#       myspace_files 별도 행 X, 그 행의 playback_path 에만 키 연결.
# PoC 검증 변환식: ffmpeg -ac 1 -c:a libmp3lame -b:a 48k
# 멱등: 대상 행 playback_path 이미 있으면 skip. 업로드는 x-upsert.
# 안전 게이트: 2번째 인자 '--write' 없으면 '계획만 출력'(변환·업로드·DB write 0).
#
# 필요 환경(회사 PC): bash, curl, python3, ffmpeg
#   환경변수 SB_SERVICE_ROLE_KEY (절대 출력/커밋 금지)
#   선행: classify.sh 실행 → _work/classify.csv 존재
#
# 사용:
#   bash scripts/wav_mp3/convert.sh sample            # 표본 5건 '선정 계획만' (write 0)
#   bash scripts/wav_mp3/convert.sh sample --write     # 표본 5건 실제 변환·업로드 (대표 승인 후)
#   bash scripts/wav_mp3/convert.sh all --write        # 전체 비-PCM 변환 (표본 검수·승인 후에만)
# =====================================================================
set -euo pipefail

SB_URL="https://pdnwgzneooyygfejrvbg.supabase.co"
BUCKET="myspace"
WORK="$(dirname "$0")/_work"
CSV="$WORK/classify.csv"
MODE="${1:-}"; CONFIRM="${2:-}"
mkdir -p "$WORK/mp3"

[ -z "${SB_SERVICE_ROLE_KEY:-}" ] && { echo "[중단] SB_SERVICE_ROLE_KEY 없음" >&2; exit 1; }
[ -f "$CSV" ] || { echo "[중단] $CSV 없음 — classify.sh 먼저 실행" >&2; exit 1; }
[ "$MODE" = "sample" ] || [ "$MODE" = "all" ] || { echo "[사용법] convert.sh sample|all [--write]" >&2; exit 1; }
command -v ffmpeg >/dev/null || { echo "[중단] ffmpeg 없음(이 PC는 변환 불가)" >&2; exit 1; }

# 대상 선정: 비-PCM(=PCM_재생가능/헤더이상/download_fail/MP3 제외)만.
#   sample = 크기구간 다양 5건(<1MB 2 / 1-5MB 2 / 5-18MB 1). all = 비-PCM 전체.
SEL="$WORK/selected.csv"
python3 - "$CSV" "$MODE" > "$SEL" <<'PY'
import csv,sys
rows=[r for r in csv.DictReader(open(sys.argv[1])) ]
def nonpcm(r):
    n=r["fmt_name"]
    return n not in ("PCM_재생가능","헤더이상","download_fail","MP3")
cand=[r for r in rows if nonpcm(r) and r.get("storage_path")]
if sys.argv[2]=="all":
    out=cand
else:
    def sz(r):
        try:return int(r["file_size"] or 0)
        except:return 0
    lt1=[r for r in cand if sz(r)<1048576]
    m15=[r for r in cand if 1048576<=sz(r)<5242880]
    m518=[r for r in cand if 5242880<=sz(r)<18874368]
    out=lt1[:2]+m15[:2]+m518[:1]
    # 부족분 보충(있는 것에서)
    if len(out)<5:
        for r in cand:
            if r not in out: out.append(r)
            if len(out)>=5: break
w=csv.writer(sys.stdout); w.writerow(["id","file_size","fmt_name","storage_path"])
for r in out: w.writerow([r["id"],r["file_size"],r["fmt_name"],r["storage_path"]])
PY

N=$(($(wc -l < "$SEL")-1))
echo "==== 변환 선정 $N 건 (모드=$MODE) ===="
cat "$SEL"
echo "====================================="

if [ "$CONFIRM" != "--write" ]; then
  echo "[계획 모드] --write 없음 → 변환·업로드·DB write 0. 대표 승인 후 --write 로 재실행." >&2
  exit 0
fi

echo "[WRITE 모드] 실제 변환·업로드·playback_path 갱신 시작" >&2
OK=0; SKIP=0; FAIL=0; FAILS=""; CONSEC=0
# process substitution(< <(...)) 사용 — 파이프 서브셸 카운터 손실 방지
while IFS=, read -r ID SIZE FMT PATH_; do
  [ -z "$ID" ] && continue
  # 연속 실패 가드(작업지시 5단계): 직전 3건 연속 실패면 즉시 중단
  if [ "$CONSEC" -ge 3 ]; then echo "[중단] 연속 3건 실패 — 점검 필요" >&2; break; fi
  # 멱등: 대상 행 playback_path 재확인
  CUR=$(curl -s "$SB_URL/rest/v1/myspace_files?select=playback_path&id=eq.$ID" \
        -H "apikey: $SB_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SB_SERVICE_ROLE_KEY" \
        | python3 -c "import json,sys;d=json.load(sys.stdin);print((d[0].get('playback_path') or '') if d else '')" 2>/dev/null || echo "")
  if [ -n "$CUR" ]; then echo "  skip(이미 playback) $ID"; SKIP=$((SKIP+1)); continue; fi

  SAFE=$(echo "$ID" | tr -c 'A-Za-z0-9' '_')
  WAVF="$WORK/mp3/$SAFE.wav"; MP3F="$WORK/mp3/$SAFE.play.mp3"
  MP3PATH="${PATH_%.wav}.play.mp3"; MP3PATH="${MP3PATH%.wave}.play.mp3"

  # 1) 원본 다운로드(읽기) → 2) ffmpeg 변환 → 3) MP3 업로드(x-upsert) → 4) playback_path UPDATE
  if ! curl -s -f "$SB_URL/storage/v1/object/$BUCKET/$PATH_" \
        -H "apikey: $SB_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SB_SERVICE_ROLE_KEY" -o "$WAVF"; then
    echo "  FAIL download $ID"; FAIL=$((FAIL+1)); CONSEC=$((CONSEC+1)); FAILS="$FAILS $ID:dl"; continue; fi
  if ! ffmpeg -y -loglevel error -i "$WAVF" -ac 1 -c:a libmp3lame -b:a 48k "$MP3F"; then
    echo "  FAIL ffmpeg $ID"; FAIL=$((FAIL+1)); CONSEC=$((CONSEC+1)); FAILS="$FAILS $ID:ff"; continue; fi
  UP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$SB_URL/storage/v1/object/$BUCKET/$MP3PATH" \
    -H "apikey: $SB_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SB_SERVICE_ROLE_KEY" \
    -H "Content-Type: audio/mpeg" -H "x-upsert: true" --data-binary "@$MP3F")
  case "$UP" in 200|201) :;; *) echo "  FAIL upload $ID ($UP)"; FAIL=$((FAIL+1)); CONSEC=$((CONSEC+1)); FAILS="$FAILS $ID:up$UP"; continue;; esac
  PT=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$SB_URL/rest/v1/myspace_files?id=eq.$ID" \
    -H "apikey: $SB_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SB_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" -H "Prefer: return=minimal" \
    -d "{\"playback_path\":\"$MP3PATH\"}")
  case "$PT" in
    200|204) echo "  OK $ID → $MP3PATH"; OK=$((OK+1)); CONSEC=0;;
    *) echo "  FAIL patch $ID ($PT)"; FAIL=$((FAIL+1)); CONSEC=$((CONSEC+1)); FAILS="$FAILS $ID:pt$PT";;
  esac
done < <(tail -n +2 "$SEL")

echo "==== 결과 OK=$OK SKIP=$SKIP FAIL=$FAIL ===="
[ -n "$FAILS" ] && echo "실패: $FAILS"
echo "원본 WAV 삭제·수정 없음(다운로드만). 로컬 임시본=$WORK/mp3 (커밋 안 됨)"
