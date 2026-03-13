#!/bin/bash
TERM=$1
if [ -z "$TERM" ]; then
    echo "Usage: $0 <term>"
    exit 1
fi
grep -A 5 "$TERM" /Users/sky770825/.openclaw/workspace/knowledge/terminology.md
