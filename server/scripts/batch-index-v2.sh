#!/bin/bash
# batch-index v2: 每個文件獨立 node 進程
DIR="${1:-/Users/sky770825/openclaw任務面版設計/cookbook}"
CAT="${2:-cookbook}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
T=0; OK=0; FAIL=0

echo "=== Batch Index v2: $DIR (category=$CAT) ==="

for f in "$DIR"/*.md; do
  [ -f "$f" ] || continue
  T=$((T + 1))
  NAME=$(basename "$f")
  echo -n "[$T] $NAME ... "

  R=$(node --max-old-space-size=512 "$SCRIPT_DIR/index-one-file.mjs" "$f" "$CAT" 2>&1)
  echo "$R"

  if echo "$R" | grep -q "^OK:"; then
    OK=$((OK + 1))
  else
    FAIL=$((FAIL + 1))
  fi
done

echo ""
echo "=== Done! total=$T indexed=$OK failed=$FAIL ==="
