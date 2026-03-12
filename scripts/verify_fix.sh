#!/bin/bash
TARGET_FILE="/Users/caijunchang/.openclaw/workspace/sandbox/output/auto-executor.ts"
echo "Verifying fix in $TARGET_FILE..."
if grep -q "status" "$TARGET_FILE" | grep -q "queued"; then
    echo "Verification SUCCESS: 'queued' status found in query logic."
else
    echo "Verification FAILED: 'queued' status not found in query logic."
    exit 1
fi
