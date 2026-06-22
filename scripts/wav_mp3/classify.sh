#!/usr/bin/env bash
# =====================================================================
# WAV 헤더 포맷 분류 (회사 PC 전용 — 읽기 전용, DB/Storage write 0)
# =====================================================================
# 목적: myspace_files 의 미변환 WAV(playback_path 없음) 전체의 WAVE fmt
#       audioFormat 코드를 읽어 PCM(재생가능) vs 비-PCM(변환대상)으로 분류.
# 안전: Storage 객체의 헤더 64바이트만 Range GET. 파일 본문/원본 무변경. DB write 0.
#
# 필요 환경(회사 PC):
#   - bash, curl, python3
#   - 환경변수 SB_SERVICE_ROLE_KEY  (Supabase service_role key — 절대 출력/커밋 금지)
#     설정 예) export SB_SERVICE_ROLE_KEY=...(붙여넣기)   ← 터미널에만, 파일에 쓰지 말 것
#
# 출력: scripts/wav_mp3/_work/classify.csv  (id,file_size,fmt_code,fmt_name,storage_path)
#       + 표준출력에 PCM/비-PCM 집계 요약
# 실행: bash scripts/wav_mp3/classify.sh
# =====================================================================
set -euo pipefail

SB_URL="https://pdnwgzneooyygfejrvbg.supabase.co"
BUCKET="myspace"
OUT_DIR="$(dirname "$0")/_work"
OUT_CSV="$OUT_DIR/classify.csv"
mkdir -p "$OUT_DIR"

if [ -z "${SB_SERVICE_ROLE_KEY:-}" ]; then
  echo "[중단] SB_SERVICE_ROLE_KEY 환경변수가 없습니다. (export 후 재실행)" >&2; exit 1
fi

# 1) 미변환 WAV 목록 (playback_path 없음·삭제 아님). service_role → RLS 우회(전수).
echo "[1/3] WAV 목록 조회 중..." >&2
LIST_JSON="$OUT_DIR/list.json"
curl -s "$SB_URL/rest/v1/myspace_files?select=id,storage_path,file_size,ext,original_name,mime_type&deleted_at=is.null&or=(ext.ilike.wav,ext.ilike.wave,original_name.ilike.*.wav,mime_type.ilike.*wav*)&playback_path=is.null" \
  -H "apikey: $SB_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SB_SERVICE_ROLE_KEY" > "$LIST_JSON"

TOTAL=$(python3 -c "import json,sys;print(len(json.load(open(sys.argv[1]))))" "$LIST_JSON")
echo "[1/3] 대상 $TOTAL 건" >&2

# 2) 각 파일 헤더 64바이트 Range GET → audioFormat(offset 20, LE 2바이트) 파싱
echo "[2/3] 헤더 분류 중 (Range 64B)..." >&2
echo "id,file_size,fmt_code,fmt_name,storage_path" > "$OUT_CSV"

python3 - "$LIST_JSON" <<'PY' | while IFS=$'\t' read -r ID SIZE PATH_; do
import json,sys
for r in json.load(open(sys.argv[1])):
    print("\t".join([str(r.get("id","")), str(r.get("file_size","")), r.get("storage_path","")]))
PY
  HDR="$OUT_DIR/.hdr.bin"
  # path 는 URL 인코딩 필요(슬래시는 유지). curl --data-urlencode 미사용 → 경로 그대로(키에 공백 없음 가정)
  curl -s "$SB_URL/storage/v1/object/$BUCKET/$PATH_" \
    -H "apikey: $SB_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SB_SERVICE_ROLE_KEY" \
    -H "Range: bytes=0-63" -o "$HDR" || { echo "$ID,$SIZE,ERR,download_fail,$PATH_" >> "$OUT_CSV"; continue; }
  FMT=$(python3 -c "
import sys
b=open(sys.argv[1],'rb').read()
# RIFF/WAVE 검증 + fmt 청크가 offset 12라는 표준 레이아웃 가정(RIFF4+size4+WAVE4=12, audioFormat at 20)
if len(b)<22 or b[0:4]!=b'RIFF' or b[8:12]!=b'WAVE': print('NA'); sys.exit()
print(b[20]|(b[21]<<8))
" "$HDR" 2>/dev/null || echo "NA")
  case "$FMT" in
    1) NAME="PCM_재생가능";; 2) NAME="MS-ADPCM";; 6) NAME="A-law";; 7) NAME="u-law";;
    17) NAME="IMA-ADPCM";; 49) NAME="GSM6.10";; 85) NAME="MP3";; 65534) NAME="EXTENSIBLE";;
    NA) NAME="헤더이상";; ERR) NAME="download_fail";; *) NAME="기타비PCM_$FMT";;
  esac
  echo "$ID,$SIZE,$FMT,$NAME,$PATH_" >> "$OUT_CSV"
done

# 3) 집계
echo "[3/3] 분류 완료 → $OUT_CSV" >&2
echo "==== 포맷 집계 ===="
tail -n +2 "$OUT_CSV" | awk -F, '{c[$4]++} END{for(k in c) printf "%-18s %d\n", k, c[k]}' | sort
echo "==================="
echo "변환 대상(비-PCM) = PCM_재생가능/헤더이상/download_fail 제외한 합계"
