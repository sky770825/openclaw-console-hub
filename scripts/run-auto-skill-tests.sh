#!/bin/bash
# Auto-generated Test Runner for auto-skill-v2.sh

echo "Executing Test Suite at $(date)" > "/Users/caijunchang/.openclaw/workspace/reports/auto-skill-v2-test-report.txt"
echo "------------------------------------------" >> "/Users/caijunchang/.openclaw/workspace/reports/auto-skill-v2-test-report.txt"

# Execute Zsh test script
zsh "/Users/caijunchang/.openclaw/workspace/scripts/tests/auto-skill-v2.test.zsh" "/Users/caijunchang/openclaw任務面版設計/scripts/auto-skill-v2.sh" >> "/Users/caijunchang/.openclaw/workspace/reports/auto-skill-v2-test-report.txt" 2>&1

RESULT=$?

if [ $RESULT -eq 0 ]; then
    echo "RESULT: SUCCESS" >> "/Users/caijunchang/.openclaw/workspace/reports/auto-skill-v2-test-report.txt"
    echo "Status: All tests passed."
else
    echo "RESULT: FAILED" >> "/Users/caijunchang/.openclaw/workspace/reports/auto-skill-v2-test-report.txt"
    echo "Status: Some tests failed. Check report at /Users/caijunchang/.openclaw/workspace/reports/auto-skill-v2-test-report.txt"
fi

cat "/Users/caijunchang/.openclaw/workspace/reports/auto-skill-v2-test-report.txt"
