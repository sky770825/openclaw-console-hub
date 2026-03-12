#!/bin/bash
REPORT_FILE="/Users/caijunchang/.openclaw/workspace/reports/ace_identity_report.md"
if [ -f "$REPORT_FILE" ]; then
    cat "$REPORT_FILE"
else
    echo "Identity report not found."
fi
