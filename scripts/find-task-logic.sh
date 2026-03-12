#!/bin/bash
# OpenClaw Task Logic Finder
# Authorized tool for searching the design project

SEARCH_ROOT="/Users/caijunchang/openclaw任務面版設計"
TERM=$1

if [ -z "$TERM" ]; then
    echo "Usage: $0 <search_term>"
    exit 1
fi

echo "--- Searching for '$TERM' in Task Panel Design ---"
grep -rnE "$TERM" "$SEARCH_ROOT" \
    --exclude-dir={.git,node_modules,dist,build,server/src,src} \
    --exclude={SOUL.md,AWAKENING.md,IDENTITY.md,.env,openclaw.json,sessions.json,config.json} \
    2>/dev/null || echo "No matches found in top-level files."

echo "--- Searching in Source Directories (Read-Only) ---"
grep -rnE "$TERM" "$SEARCH_ROOT/src" "$SEARCH_ROOT/server/src" 2>/dev/null || true
