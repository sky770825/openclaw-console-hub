#!/bin/bash
# OpenClaw Heartbeat Diagnostic Tool
# Purpose: Diagnose issues with heartbeat signals in the Task Panel

LOG_FILE="/Users/caijunchang/.openclaw/workspace/reports/heartbeat_diagnosis.log"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

echo "--- Heartbeat Diagnosis Start: $TIMESTAMP ---" | tee -a "$LOG_FILE"

# 1. Check Network Connectivity to local API
echo "Checking Local API Health..." | tee -a "$LOG_FILE"
for PORT in 3000 3001 8080; do
    if curl -s -I "http://localhost:$PORT" --connect-timeout 2 > /dev/null; then
        echo "  [OK] Port $PORT is responding." | tee -a "$LOG_FILE"
    else
        echo "  [FAIL] Port $PORT is unreachable or not responding." | tee -a "$LOG_FILE"
    fi
done

# 2. Check for Process Overload
echo "Checking CPU Usage..." | tee -a "$LOG_FILE"
ps -A -o %cpu,%mem,comm | sort -nr | head -n 5 >> "$LOG_FILE"

# 3. Check for Socket Connections
echo "Checking Established Connections..." | tee -a "$LOG_FILE"
netstat -an | grep ESTABLISHED | grep -E "3000|3001" | wc -l | xargs echo "  Active connections on heartbeat ports: " >> "$LOG_FILE"

echo "--- Diagnosis Complete. Check $LOG_FILE for details ---"
