#!/bin/bash
# Usage: ./fix_task_status.sh <task_id> <status>
TASK_ID=$1
NEW_STATUS=$2
API_BASE="http://localhost:3000/api/openclaw" # Adjusting based on standard port

if [ -z "$TASK_ID" ] || [ -z "$NEW_STATUS" ]; then
    echo "Usage: $0 <task_id> <status>"
    exit 1
fi

echo "Updating task $TASK_ID to $NEW_STATUS..."
curl -X PATCH "$API_BASE/tasks/$TASK_ID" \
     -H "Content-Type: application/json" \
     -d "{\"status\": \"$NEW_STATUS\"}" || echo "Failed to update task via API. Check if server is running."
