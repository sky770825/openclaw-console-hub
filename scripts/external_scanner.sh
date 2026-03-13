#!/bin/bash
# External Scanner Tool - Used to find external protocol definitions and API integrations
SEARCH_DIR="/Users/sky770825/openclaw任務面版設計"
KEYWORD=$1

if [ -z "$KEYWORD" ]; then
    echo "Usage: $0 <keyword>"
    exit 1
fi

echo "Searching for '$KEYWORD' in non-restricted files..."
grep -rni "$KEYWORD" "$SEARCH_DIR" \
    --exclude-dir=".git" \
    --exclude-dir="node_modules" \
    --exclude="SOUL.md" \
    --exclude="AWAKENING.md" \
    --exclude="IDENTITY.md" \
    --exclude="openclaw.json" \
    --exclude="sessions.json" \
    --exclude="config.json" \
    --exclude=".env"
