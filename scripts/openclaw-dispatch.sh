#!/bin/bash
# OpenClaw Auto-Executor Dispatcher
API_URL="http://localhost:3000/api/openclaw/auto-executor/dispatch"
LOG_FILE="/Users/caijunchang/.openclaw/workspace/reports/dispatch.log"

echo "[$(date)] Triggering Auto-Executor Dispatch..." >> "$LOG_FILE"
RESPONSE=$(curl -s -X POST "$API_URL" -H "Content-Type: application/json")
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "[$(date)] Success: $RESPONSE" >> "$LOG_FILE"
else
    echo "[$(date)] Error: Connection failed with exit code $EXIT_CODE" >> "$LOG_FILE"
fi
