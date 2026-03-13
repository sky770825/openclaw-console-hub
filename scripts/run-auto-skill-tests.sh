#!/bin/bash
# Auto-generated Test Runner for auto-skill-v2.sh

echo "Executing Test Suite at $(date)" > "/Users/sky770825/.openclaw/workspace/reports/auto-skill-v2-test-report.txt"
echo "------------------------------------------" >> "/Users/sky770825/.openclaw/workspace/reports/auto-skill-v2-test-report.txt"

# Execute Zsh test script
zsh "/Users/sky770825/.openclaw/workspace/scripts/tests/auto-skill-v2.test.zsh" "/Users/sky770825/openclaw任務面版設計/scripts/auto-skill-v2.sh" >> "/Users/sky770825/.openclaw/workspace/reports/auto-skill-v2-test-report.txt" 2>&1

RESULT=$?

if [ $RESULT -eq 0 ]; then
    echo "RESULT: SUCCESS" >> "/Users/sky770825/.openclaw/workspace/reports/auto-skill-v2-test-report.txt"
    echo "Status: All tests passed."
else
    echo "RESULT: FAILED" >> "/Users/sky770825/.openclaw/workspace/reports/auto-skill-v2-test-report.txt"
    echo "Status: Some tests failed. Check report at /Users/sky770825/.openclaw/workspace/reports/auto-skill-v2-test-report.txt"
fi

cat "/Users/sky770825/.openclaw/workspace/reports/auto-skill-v2-test-report.txt"
