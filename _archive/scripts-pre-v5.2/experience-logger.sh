#!/bin/bash
set -e

# Configuration
SRC_DIR="/Users/sky770825/.openclaw/workspace/sandbox/output"
BASE_ARTIFACTS_DIR="/Users/sky770825/.openclaw/workspace/artifacts"
LOG_FILE="/Users/sky770825/.openclaw/workspace/experience-log.jsonl"
DATE_STAMP=$(date +%Y%m%d)
DEST_DIR="$BASE_ARTIFACTS_DIR/$DATE_STAMP"

# Ensure destination exists
mkdir -p "$DEST_DIR"

# Track copied files
COPIED_FILES=()

# Scan for files (excluding the script itself if it happens to be in output)
# Note: find is more robust for scanning
if [ -d "$SRC_DIR" ]; then
    while IFS= read -r file; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            cp "$file" "$DEST_DIR/"
            COPIED_FILES+=("$filename")
        fi
    done < <(find "$SRC_DIR" -maxdepth 1 -type f)
fi

# Generate JSON log entry using jq
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
FILES_COUNT=${#COPIED_FILES[@]}

# Convert bash array to JSON array
FILES_JSON=$(printf '%s\n' "${COPIED_FILES[@]}" | jq -R . | jq -s -c .)

# Create log entry
LOG_ENTRY=$(jq -n \
    --arg ts "$TIMESTAMP" \
    --argjson count "$FILES_COUNT" \
    --argjson files "$FILES_JSON" \
    '{timestamp: $ts, event: "archive", copied_count: $count, files: $files}')

# Append to JSONL
echo "$LOG_ENTRY" >> "$LOG_FILE"
