#!/bin/bash
# Test script to verify Quality Gate 2.0 implementation
SRC_ROOT="/Users/caijunchang/openclaw任務面版設計"

echo "Checking taskCompliance.ts..."
grep "acceptanceCriteria" "$SRC_ROOT/server/src/compliance/taskCompliance.ts" || echo "FAILED: No mandatory check found"

echo "Checking governanceEngine.ts..."
grep "validateAcceptance" "$SRC_ROOT/server/src/governance/governanceEngine.ts" || echo "FAILED: No validation logic found"

echo "Checking auto-executor.ts..."
grep "ask_ai" "$SRC_ROOT/server/src/executor/auto-executor.ts" || echo "FAILED: No AI audit call found"

echo "Quality Gate 2.0 verification check complete."
