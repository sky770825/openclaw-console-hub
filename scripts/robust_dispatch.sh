#!/bin/bash
API_BASE="http://localhost:3000/api/openclaw"

echo "Fetching 'ready' tasks..."
READY_TASKS=$(curl -s "$API_BASE/tasks?status=ready")

for row in $(echo "${READY_TASKS}" | jq -r '.[] | @base64'); do
    _jq() {
     echo ${row} | base64 --decode | jq -r ${1}
    }
    TASK_ID=$(_jq '.id')
    echo "Manually triggering execution for $TASK_ID"
    curl -s -X POST "$API_BASE/auto-executor/execute" -H "Content-Type: application/json" -d "{\"taskId\": \"$TASK_ID\"}"
done
