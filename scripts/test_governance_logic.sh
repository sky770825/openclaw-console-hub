#!/bin/bash
TARGET="/Users/caijunchang/openclaw任務面版設計/server/src/governanceEngine.ts"
if grep -q "FAILED: Artifacts Real Landing Verification Failed" "$TARGET"; then
    echo "Validation Passed: Quality gate enforcement logic found."
else
    echo "Validation Failed: Logic not found in source."
    exit 1
fi
