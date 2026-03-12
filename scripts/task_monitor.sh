#!/bin/bash
# Scans for tasks marked 'done' that might be false positives
API_BASE="http://localhost:3000/api/openclaw"
TASKS=$(curl -s "$API_BASE/tasks?status=done")

# Simple logic: If 'done' but 'lastExecutedAt' is null, it's a suspect
echo "$TASKS" | jq -c '.[] | select(.lastExecutedAt == null)' > suspects.json || echo "No suspects found or jq missing"
