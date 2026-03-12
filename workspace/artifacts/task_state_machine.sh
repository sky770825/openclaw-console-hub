#!/bin/bash
TASK_FILE="$1"
NEW_STATUS="$2"
WEBHOOK_URL="http://localhost:5678/rest/webhooks/task-status-update"

if [ ! -f "$TASK_FILE" ]; then
  echo "Task file not found."
  exit 1
fi

# Update status using jq
cat "$TASK_FILE" | jq --arg status "$NEW_STATUS" '.status = $status' > "${TASK_FILE}.tmp" && mv "${TASK_FILE}.tmp" "$TASK_FILE"

echo "Task status updated to: $NEW_STATUS"

# Trigger logic
if [ "$NEW_STATUS" == "done" ]; then
  echo "Triggering n8n Webhook..."
  # In a real environment, we would use curl:
  # curl -X POST -H "Content-Type: application/json" -d @$TASK_FILE $WEBHOOK_URL
  echo "[MOCK CURL] POST $WEBHOOK_URL with data: $(cat $TASK_FILE)"
fi
