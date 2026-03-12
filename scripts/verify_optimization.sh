#!/bin/bash
echo "Verifying optimization proposals..."
if [ -f "/Users/caijunchang/.openclaw/workspace/proposals/performance_optimization/AutoExecutor.ts" ]; then
    echo "[PASS] AutoExecutor.ts proposal generated."
    grep "pollIntervalMs = 5000" "/Users/caijunchang/.openclaw/workspace/proposals/performance_optimization/AutoExecutor.ts" || echo "[WARN] pollIntervalMs change not found in proposal."
else
    echo "[FAIL] AutoExecutor.ts proposal missing."
fi

if [ -f "/Users/caijunchang/.openclaw/workspace/proposals/performance_optimization/anti-stuck.ts" ]; then
    echo "[PASS] anti-stuck.ts proposal generated."
    grep "syncWithDatabase" "/Users/caijunchang/.openclaw/workspace/proposals/performance_optimization/anti-stuck.ts" || echo "[WARN] syncWithDatabase logic not found."
else
    echo "[FAIL] anti-stuck.ts proposal missing."
fi
