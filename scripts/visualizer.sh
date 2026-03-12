#!/bin/bash
# Visual Feedback: Formats results into a visual report
REPORT_NAME=$1
CONTENT=$2
OUTPUT_FILE="/Users/caijunchang/.openclaw/workspace/reports/${REPORT_NAME}.md"

{
    echo "# Visual Feedback Report: $REPORT_NAME"
    echo "Generated on: $(date)"
    echo "## Execution Log"
    echo "\`\`\`"
    echo "$CONTENT"
    echo "\`\`\`"
} > "$OUTPUT_FILE"
echo "Visual Feedback: Report generated at $OUTPUT_FILE"
