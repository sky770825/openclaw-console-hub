#!/bin/bash
set -e
echo "Running Regression Test Suite for Clawhub..."

# Test 1: Skill JSON Validity
if jq . "/Users/caijunchang/.openclaw/workspace/skills/aegis_scanner.json" > /dev/null; then
    echo "PASS: Aegis Scanner Skill JSON is valid."
else
    echo "FAIL: Aegis Scanner Skill JSON is invalid."
    exit 1
fi

# Test 2: Execution Script Run
echo "Testing Script Execution..."
"/Users/caijunchang/.openclaw/workspace/scripts/run_aegis_scan.sh" "/tmp" "fast" > /dev/null

# Test 3: Output Verification
LATEST_REPORT=$(ls -t "/Users/caijunchang/.openclaw/workspace/sandbox/output"/scan_report_*.txt | head -1)
if [ -f "$LATEST_REPORT" ] && grep -q "Completed Successfully" "$LATEST_REPORT"; then
    echo "PASS: Scanner execution and output generation verified."
else
    echo "FAIL: Scanner execution failed or output invalid."
    exit 1
fi

echo "ALL REGRESSION TESTS PASSED."
