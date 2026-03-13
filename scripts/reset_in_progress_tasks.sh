#!/bin/bash
set -e

IDS=("t1772427226902" "t1772429067794" "t1772437041072")
WORKSPACE="/Users/sky770825/.openclaw/workspace"
LOG_FILE="/Users/sky770825/.openclaw/workspace/reports/reset_execution.log"

echo "=== Task Reset Execution: $(date) ===" > "$LOG_FILE"

# Function to update task status in a file
update_task_status() {
    local file=$1
    local id=$2
    echo "Processing $file for ID $id" >> "$LOG_FILE"
    
    # Create a temp file
    tmp=$(mktemp)
    
    # Apply JQ transformation based on JSON structure
    # Supports: single object, array of objects, or object with 'tasks' array
    jq --arg id "$id" '
        if type == "array" then
            map(if .id == $id then .status = "ready" else . end)
        elif type == "object" and .id == $id then
            .status = "ready"
        elif type == "object" and .tasks then
            .tasks |= map(if .id == $id then .status = "ready" else . end)
        else
            .
        end
    ' "$file" > "$tmp" && mv "$tmp" "$file"
    
    echo "Successfully updated $id in $file" >> "$LOG_FILE"
}

# Search in writable workspace directories for files containing the IDs
SEARCH_PATHS=("$WORKSPACE/sandbox" "$WORKSPACE/scripts" "$WORKSPACE/reports" "$WORKSPACE/knowledge")

for ID in "${IDS[@]}"; do
    echo "Searching for task ID: $ID" >> "$LOG_FILE"
    
    # Find all JSON files in the workspace (excluding node_modules)
    FILES=$(find "${SEARCH_PATHS[@]}" -name "*.json" -type f 2>/dev/null || true)
    
    found=false
    for f in $FILES; do
        if grep -q "$ID" "$f"; then
            update_task_status "$f" "$ID"
            found=true
        fi
    done
    
    if [ "$found" = false ]; then
        echo "Warning: Task $ID not found in any JSON files in the writable workspace." >> "$LOG_FILE"
    fi
done

# Check if an API is running and try to notify it (common ports for openclaw)
for port in 3000 3001 8000 8080; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        for ID in "${IDS[@]}"; do
            echo "Attempting API reset via port $port for $ID" >> "$LOG_FILE"
            curl -s -X PATCH "http://localhost:$port/api/tasks/$ID" \
                 -H "Content-Type: application/json" \
                 -d '{"status": "ready"}' >> "$LOG_FILE" 2>&1 || true
        done
    fi
done

echo "Reset sequence completed." >> "$LOG_FILE"
