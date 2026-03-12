#!/bin/bash
API_BASE="http://localhost:3000/api"
TASKS=("t1772326075591" "t1772325127506")

echo "Attempting to reset task statuses to 'ready'..."
for TASK_ID in "${TASKS[@]}"; do
    echo "Updating $TASK_ID..."
    # Attempting to use the documented endpoint structure. 
    # Usually it's PATCH /api/tasks/:id or similar.
    curl -s -X PATCH "$API_BASE/tasks/$TASK_ID" \
         -H "Content-Type: application/json" \
         -d '{"status": "ready"}' || echo "Failed to update $TASK_ID via PATCH /tasks/$TASK_ID"
    
    # Alternative endpoint if project uses a different structure
    curl -s -X POST "$API_BASE/openclaw/tasks/update" \
         -H "Content-Type: application/json" \
         -d "{\"id\": \"$TASK_ID\", \"status\": \"ready\"}" || echo "Failed to update $TASK_ID via POST update"
done
