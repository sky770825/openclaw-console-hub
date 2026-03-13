#!/bin/bash
set -e
REPORT_FILE="/Users/sky770825/.openclaw/workspace/reports/clawhub_report.md"
SEARCH_TERMS=("commander" "orchestrator" "agent" "executor" "skill" "workflow")
echo "# ClawHub Recon Update - $(date)" >> "$REPORT_FILE"
for term in "${SEARCH_TERMS[@]}"; do
    echo "## Search: $term" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    npx -y @openclaw/cli search "$term" >> "$REPORT_FILE" 2>&1
    echo '```' >> "$REPORT_FILE"
done
