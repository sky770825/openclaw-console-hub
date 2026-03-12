#!/bin/bash
# Generated script to simulate Xiao Cai issuing a command to the Star Cluster (星群)
MESSAGE="各位，報告一下目前系統狀態"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

echo "[$TIMESTAMP] Initiating crew collaboration test..."
echo "Command: $MESSAGE"

# Attempt to send the message via the project's local API
# We assume a standard JSON-based API for task/message management
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:/api/messages \
  -H "Content-Type: application/json" \
  -d "{\"content\": \"$MESSAGE\", \"sender\": \"小蔡\", \"target\": \"crew-all\"}" 2>/dev/null || echo "CONNECTION_FAILED")

HTTP_STATUS=$(echo "$RESPONSE" | tail -n 1)

if [ "$HTTP_STATUS" == "200" ] || [ "$HTTP_STATUS" == "201" ]; then
    echo "Successfully sent command to crew via API (Status: $HTTP_STATUS)."
else
    echo "API request failed or endpoint not found (Status: $HTTP_STATUS)."
    echo "Falling back to local signal file mechanism..."
    
    # Simulating a file-based trigger if the API is not active
    TRIGGER_FILE="/Users/caijunchang/.openclaw/workspace/sandbox/crew_trigger.json"
    echo "{\"timestamp\": \"$TIMESTAMP\", \"author\": \"小蔡\", \"command\": \"$MESSAGE\"}" > "$TRIGGER_FILE"
    echo "Command written to $TRIGGER_FILE"
fi

# Log action to a central history file
LOG_FILE="/Users/caijunchang/.openclaw/workspace/sandbox/output/crew_test_history.log"
echo "[$TIMESTAMP] Command Issued: $MESSAGE" >> "$LOG_FILE"
