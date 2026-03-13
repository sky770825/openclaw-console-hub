#!/bin/bash
# Reconstructed Auto-Executor Dispatch Script
# This script ensures the dispatcher is triggered and logs activity.

LOG_FILE="/Users/sky770825/.openclaw/workspace/reports/cron_dispatch.log"
API_ENDPOINT="http://localhost:3000/api/openclaw/auto-executor/dispatch"

echo "[$(date)] Starting Auto-Executor Dispatch Check..." >> "$LOG_FILE"

# Check if server is alive
if curl -s --head  --request GET http://localhost:3000/api/health | grep "200 OK" > /dev/null; then
    echo "[$(date)] Server is UP. Triggering dispatch..." >> "$LOG_FILE"
    RESPONSE=$(curl -s -X POST "$API_ENDPOINT" -H "Content-Type: application/json")
    echo "[$(date)] API Response: $RESPONSE" >> "$LOG_FILE"
else
    echo "[$(date)] ERROR: Server is DOWN. Cannot dispatch." >> "$LOG_FILE"
    exit 1
fi
