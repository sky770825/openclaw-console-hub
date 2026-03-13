#!/bin/bash
set -e

ASSIGNEE=$1
TERM=$2
TASK_ID=$(date +%s)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
INBOX="/Users/sky770825/.openclaw/workspace/sandbox/inbox"

TASK_FILE="$INBOX/task_$TASK_ID.json"

cat << JSON > "$TASK_FILE"
{
  "protocol": "NEUXA_1.0",
  "task_id": "$TASK_ID",
  "assignee": "$ASSIGNEE",
  "action": "QUERY",
  "params": {
    "term": "$TERM",
    "context": "Verification of NEUXA protocol"
  },
  "timestamp": "$TIMESTAMP"
}
JSON

echo "$TASK_FILE"
