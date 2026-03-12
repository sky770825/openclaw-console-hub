#!/bin/bash
# OpenClaw Task Poller Cron Script
# Checks for 'ready' tasks and triggers the executor
LOG_FILE="/Users/caijunchang/.openclaw/workspace/reports/cron_poller.log"
echo "[$(date)] Polling for ready tasks..." >> "$LOG_FILE"

# Trigger dispatch via API
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/openclaw/auto-executor/dispatch)

if [ "$RESPONSE" == "200" ]; then
    echo "[$(date)] Dispatch successful" >> "$LOG_FILE"
else
    echo "[$(date)] Dispatch failed with code $RESPONSE" >> "$LOG_FILE"
fi
