#!/bin/bash
# Ensure Auto-Executor is actually processing tasks
HEALTH_API="http://localhost:3000/api/health"
STATUS=$(curl -s "$HEALTH_API")

IS_RUNNING=$(echo "$STATUS" | jq -r '.isRunning // empty')
LAST_EXEC=$(echo "$STATUS" | jq -r '.lastExecutedAt // empty')

echo "Auto-Executor Status: $IS_RUNNING, Last Executed: $LAST_EXEC"

if [ "$IS_RUNNING" = "true" ] && [ "$LAST_EXEC" = "null" ]; then
    echo "CRITICAL: Executor is running but idle. Forcing dispatch..."
    /Users/sky770825/.openclaw/workspace/scripts/auto_dispatch_trigger.sh
fi
