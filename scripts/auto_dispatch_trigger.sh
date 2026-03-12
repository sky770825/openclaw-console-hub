#!/bin/bash
# Manually trigger the Auto-Executor dispatch mechanism
API_URL="http://localhost:3011/api/openclaw/auto-executor/dispatch" # Fixed port to 3011

echo "Triggering Auto-Executor Dispatch at $(date)"
RESPONSE=$(curl -s -X POST "$API_URL" -H "Content-Type: application/json" -d '{}')

if echo "$RESPONSE" | grep -q "success"; then
    echo "Dispatch successful: $RESPONSE"
else
    echo "Dispatch failed or returned unexpected response: $RESPONSE"
    exit 1
fi