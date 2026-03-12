#!/bin/bash
# Script to manually reset task statuses and trigger dispatch
BASE_URL="http://localhost:3000/api/openclaw" # Adjust port if necessary

reset_task() {
    local task_id=$1
    echo "Resetting task $task_id to in_progress..."
    curl -s -X PATCH "$BASE_URL/tasks/$task_id" \
        -H "Content-Type: application/json" \
        -d '{"status": "in_progress"}' || echo "Failed to reset $task_id"
}

trigger_dispatch() {
    echo "Triggering Auto-Executor dispatch..."
    curl -s -X POST "$BASE_URL/auto-executor/dispatch" \
        -H "Content-Type: application/json" \
        -d '{}' || echo "Dispatch API call failed"
}

if [ "$1" == "reset" ]; then
    reset_task "t1772326075591"
    reset_task "t1772325127506"
elif [ "$1" == "dispatch" ]; then
    trigger_dispatch
else
    echo "Usage: $0 {reset|dispatch}"
fi
