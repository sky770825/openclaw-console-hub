#!/bin/bash
# Tool to search for functional project content, skipping meta-docs
PROJECT_ROOT="/Users/caijunchang/openclaw任務面版設計"
SEARCH_TERM=$1

if [ -z "$SEARCH_TERM" ]; then
    echo "Usage: $0 <search_term>"
    exit 1
fi

grep -riI "$SEARCH_TERM" "$PROJECT_ROOT" \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir=.next \
    --exclude="AGENTS.md" \
    --exclude="SOUL.md" \
    --exclude="AWAKENING.md" \
    --exclude="IDENTITY.md"
