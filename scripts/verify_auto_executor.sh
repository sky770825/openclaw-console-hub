#!/bin/bash
FILE="/Users/caijunchang/.openclaw/workspace/scripts/auto-executor.ts"
if grep -q "upsertOpenClawTask" "$FILE" && grep -q "status: \"failed\"" "$FILE"; then
    echo "VERIFICATION SUCCESS: upsertOpenClawTask call found in failure branch."
    exit 0
else
    echo "VERIFICATION FAILED: Fix not found in file."
    exit 1
fi
