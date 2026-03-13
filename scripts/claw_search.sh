#!/bin/bash
# Helper script to search project source safely
SOURCE_DIR="/Users/sky770825/openclaw任務面版設計"
SEARCH_TERM=$1

if [ -z "$SEARCH_TERM" ]; then
    echo "Usage: ./claw_search.sh <search_term>"
    exit 1
fi

grep -rE --exclude-dir={node_modules,dist,.git} "$SEARCH_TERM" "$SOURCE_DIR"
