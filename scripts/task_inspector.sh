#!/bin/bash
SOURCE_DIR="/Users/sky770825/openclaw任務面版設計"
SEARCH_TERM=${1:-"task"}

echo "--- Searching for '$SEARCH_TERM' in $SOURCE_DIR ---"
grep -rEi "$SEARCH_TERM" "$SOURCE_DIR" \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir=dist \
    | head -n 50

echo ""
echo "--- File structure overview ---"
find "$SOURCE_DIR" -maxdepth 3 -not -path '*/.*' -not -path '*node_modules*'
