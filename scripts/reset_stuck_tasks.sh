#!/bin/bash
# Manual reset script for stuck tasks
TARGET_IDS=("t1772427226902" "t1772429067794" "t1772437041072")
WORKSPACE="/Users/caijunchang/.openclaw/workspace"

for ID in "${TARGET_IDS[@]}"; do
    FILE=$(find "$WORKSPACE" -name "${ID}.json" -maxdepth 4 2>/dev/null | head -n 1)
    if [ -n "$FILE" ]; then
        if [ "$(jq -r '.status' "$FILE")" == "in_progress" ]; then
            jq '.status = "ready"' "$FILE" > "${FILE}.tmp" && mv "${FILE}.tmp" "$FILE"
            echo "Reset $ID to ready"
        fi
    fi
done
