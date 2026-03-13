#!/bin/bash
# Script to safely upgrade AGENTS.md
SOURCE="/Users/sky770825/.openclaw/workspace/AGENTS.md.new"
DEST="/Users/sky770825/.openclaw/workspace/AGENTS.md"
if [ -f "$SOURCE" ]; then
    mv "$SOURCE" "$DEST"
    echo "Upgrade successful."
else
    echo "Source file missing."
    exit 1
fi
