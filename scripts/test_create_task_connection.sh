#!/bin/bash
# Generated Connection Test Script
# Target: http://localhost:3011/api/tasks

URL="http://localhost:3011/api/tasks"
API_KEY="{}"

echo "Attempting to create a task at $URL..."

PAYLOAD=$(cat <<JSON
{
  "title": "Connection Test - $(date '+%Y-%m-%d %H:%M:%S')",
  "description": "This is an automated diagnostic task to verify create_task connectivity.",
  "status": "todo",
  "priority": "low",
  "metadata": {
    "source": "diagnostic-script",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  }
}
JSON
)

# Perform the request
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "$PAYLOAD")

HTTP_STATUS=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "-----------------------------------"
echo "HTTP Status: $HTTP_STATUS"
echo "Response Body: $BODY"
echo "-----------------------------------"

if [[ "$HTTP_STATUS" == "200" || "$HTTP_STATUS" == "201" ]]; then
    echo "SUCCESS: Connection verified and task created."
    exit 0
else
    echo "FAILURE: Server returned error status $HTTP_STATUS"
    exit 1
fi
