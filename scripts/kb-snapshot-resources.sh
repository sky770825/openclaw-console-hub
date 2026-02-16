#!/usr/bin/env bash
set -euo pipefail

# Snapshot a small set of high-quality reference pages to local files for offline reading.
# Default input is the Desktop "小蔡" knowledge base (created in Batch A).
#
# Usage:
#   ./scripts/kb-snapshot-resources.sh
#   RESOURCES_MD="/path/to/RESOURCES.md" OUT_DIR="/tmp/kb-snapshots" ./scripts/kb-snapshot-resources.sh
#
# Notes:
# - This fetches the top-level pages only (no crawling).
# - Some sites block automated fetches; those will be marked as failed and skipped.

RESOURCES_MD="${RESOURCES_MD:-/Users/caijunchang/Desktop/小蔡/知識庫/SOP-資訊庫/RESOURCES/RESOURCES.md}"
OUT_DIR="${OUT_DIR:-/Users/caijunchang/Desktop/小蔡/知識庫/SOP-資訊庫/RESOURCES/SNAPSHOTS/$(date +%F)}"
MAX_TIME="${MAX_TIME:-25}"
CONNECT_TIMEOUT="${CONNECT_TIMEOUT:-5}"

if [[ ! -f "$RESOURCES_MD" ]]; then
  echo "RESOURCES.md not found: $RESOURCES_MD" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

urls="$(rg -No --glob '!*snapshots*' 'https?://[^)[:space:]]+' "$RESOURCES_MD" | sort -u || true)"
if [[ -z "${urls// }" ]]; then
  echo "No URLs found in: $RESOURCES_MD" >&2
  exit 0
fi

echo "Input : $RESOURCES_MD"
echo "Output: $OUT_DIR"
echo

i=0
ok=0
fail=0

while IFS= read -r url; do
  [[ -z "${url// }" ]] && continue
  i=$((i + 1))

  # Create a stable, filesystem-safe filename.
  safe="$(echo "$url" | tr '[:upper:]' '[:lower:]' | sed -E 's#https?://##; s#[^a-z0-9._-]+#_#g; s#_+#_#g; s#^_+|_+$##g')"
  file="$OUT_DIR/$(printf '%03d' "$i")_${safe}.html"

  echo "[$i] $url"
  if curl -fsSL \
    --connect-timeout "$CONNECT_TIMEOUT" \
    --max-time "$MAX_TIME" \
    -H 'User-Agent: Mozilla/5.0 (OpenClaw KB Snapshot)' \
    "$url" >"$file"; then
    ok=$((ok + 1))
    echo "  -> OK: $file"
  else
    fail=$((fail + 1))
    rm -f "$file" || true
    echo "  -> FAIL"
  fi
done <<<"$urls"

echo
echo "Done. total=$i ok=$ok fail=$fail"

