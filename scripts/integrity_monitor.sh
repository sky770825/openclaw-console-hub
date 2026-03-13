#!/bin/bash
# Workspace Integrity Monitor
TARGET_DIR="/Users/sky770825/.openclaw/workspace/sandbox"
LOG_FILE="/Users/sky770825/.openclaw/workspace/reports/integrity_violations.log"

echo "Monitoring $TARGET_DIR for changes..."
# Use fswatch if available, otherwise fallback to polling
if command -v fswatch &> /dev/null; then
    fswatch -o "$TARGET_DIR" | while read num; do
        echo "[$(date)] Change detected in $TARGET_DIR. Status:" >> "$LOG_FILE"
        git -C "$TARGET_DIR" status >> "$LOG_FILE"
    done
else
    while true; do
        STATUS=$(git -C "$TARGET_DIR" status --short)
        if [ ! -z "$STATUS" ]; then
            echo "[$(date)] Changes detected:" >> "$LOG_FILE"
            echo "$STATUS" >> "$LOG_FILE"
        fi
        sleep 5
    done
fi
