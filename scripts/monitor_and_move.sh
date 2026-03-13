#!/bin/bash
# Description: Monitor sandbox output and move reports to designated directory
MONITOR_DIR="/Users/sky770825/.openclaw/workspace/sandbox/output"
DEST_DIR="/Users/sky770825/.openclaw/workspace/reports"

if [ -d "$MONITOR_DIR" ]; then
    find "$MONITOR_DIR" -type f \( -name "*.md" -o -name "*.report" \) -mmin -60 -exec mv {} "$DEST_DIR/" \;
    echo "Files moved at $(date)"
fi
