#!/bin/bash
# Monitoring script for OpenClaw context health
WORKSPACE_PATH="/Users/sky770825/.openclaw/workspace"

echo "--- Context Health Report ---"
if [ -f "$WORKSPACE_PATH/sandbox/NOW.md" ]; then
    SIZE=$(wc -c < "$WORKSPACE_PATH/sandbox/NOW.md")
    LINE_COUNT=$(wc -l < "$WORKSPACE_PATH/sandbox/NOW.md")
    echo "NOW.md Size: $SIZE bytes ($LINE_COUNT lines)"
else
    echo "NOW.md not found in sandbox."
fi

if [ -f "$WORKSPACE_PATH/sandbox/SESSION-STATE.md" ]; then
    SIZE=$(wc -c < "$WORKSPACE_PATH/sandbox/SESSION-STATE.md")
    echo "SESSION-STATE.md Size: $SIZE bytes"
else
    echo "SESSION-STATE.md not found in sandbox."
fi

# Warning if sizes are too large
MAX_SIZE=20000
if [ ${SIZE:-0} -gt $MAX_SIZE ]; then
    echo "WARNING: Context size exceeds threshold. Compression recommended."
fi
