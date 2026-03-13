#!/bin/bash
# A helper tool to search and explore the read-only project source safely.
# Usage: ./explore_src.sh <keyword>

PROJECT_ROOT="/Users/sky770825/openclaw任務面版設計"
KEYWORD=$1

if [ -z "$KEYWORD" ]; then
    echo "Current Source Map (Top Level):"
    ls -F "$PROJECT_ROOT"
else
    echo "Searching for '$KEYWORD' in $PROJECT_ROOT (excluding node_modules)..."
    grep -rnE "$KEYWORD" "$PROJECT_ROOT" --exclude-dir=node_modules --exclude-dir=.git | head -n 20
fi
