#!/bin/bash
set -e
INBOX_DIR="/Users/sky770825/.openclaw/workspace/sandbox/neuxa_inbox"
TASK_ID=$(date +%s)
RECEIVER=$1
QUERY=$2

if [ -z "$RECEIVER" ] || [ -z "$QUERY" ]; then
    echo "Usage: $0 <receiver> <query>"
    exit 1
fi

TASK_FILE="$INBOX_DIR/task_$TASK_ID.json"

# Create JSON Task
jq -n \
  --arg id "$TASK_ID" \
  --arg sender "Commander" \
  --arg receiver "$RECEIVER" \
  --arg action "QUERY" \
  --arg query "$QUERY" \
  --arg ts "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  '{id: $id, sender: $sender, receiver: $receiver, action: $action, payload: {query: $query}, status: "PENDING", timestamp: $ts}' \
  > "$TASK_FILE"

echo "$TASK_FILE"
