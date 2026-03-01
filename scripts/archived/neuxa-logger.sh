#!/bin/bash
# NEUXA Traffic & Risk Logger v1.0
TYPE=$1 # TRAFFIC / RISK
LEVEL=$2 # INFO / WARN / CRITICAL
MSG=$3

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
LOG_ENTRY="{\"timestamp\":\"$TIMESTAMP\",\"level\":\"$LEVEL\",\"message\":\"$MSG\"}"

if [ "$TYPE" == "TRAFFIC" ]; then
    echo "$LOG_ENTRY" >> logs/traffic/traffic-$(date +%Y%m%d).jsonl
else
    echo "$LOG_ENTRY" >> logs/risk/risk-$(date +%Y%m%d).jsonl
fi
