#!/usr/bin/env bash
# 타이포 재발 방지 가드 (2026-07-04, 1차 잠금)
# 목적: 읽기용 텍스트에서 10·11px급 폰트가 다시 들어오는 것을 차단한다.
# 대상(금지): font-size 값이 정확히 10·11px에 해당하는 하드코딩
#   → 0.625rem · 0.6875rem · 0.7rem · 10px · 11px
# 반드시 토큰 사용: var(--ts-badge)=12 · var(--ts-meta)=13 · var(--ts-preview)=14
#                   · var(--ts-list-title)=15 · var(--ts-body)=16 · var(--ts-viewer-title)=20
# 주의(범위 밖, 이번 잠금 대상 아님):
#   - 11.5~11.8px 경계(0.72rem·0.74rem) — 후속 단계에서 판단
#   - 알림 카운트·nav 뱃지 등 의도적 마이크로 뱃지(<0.62rem) — 장식 요소라 유지
set -euo pipefail
FILE="${1:-app.html}"
[ -f "$FILE" ] || { echo "파일 없음: $FILE"; exit 2; }

hits=$(grep -nE "font-size:(0\.625rem|0\.6875rem|0\.7rem|10px|11px)([^0-9]|$)" "$FILE" || true)

if [ -n "$hits" ]; then
  echo "❌ 타이포 가드 위반 — $FILE 에 10·11px급 하드코딩 font-size 재유입:"
  echo "$hits"
  echo ""
  echo "→ 토큰을 쓰세요: var(--ts-badge)=12 · var(--ts-meta)=13 · var(--ts-preview)=14 · var(--ts-list-title)=15 · var(--ts-body)=16 · var(--ts-viewer-title)=20"
  exit 1
fi
echo "✅ 타이포 가드 통과 — $FILE 에 10·11px급 하드코딩 없음"
