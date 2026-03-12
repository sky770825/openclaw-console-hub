#!/bin/bash
# 用於模擬 OpenClaw Server 發送 Webhook 到 n8n
TARGET_URL="http://localhost:5678/webhook-test/openclaw-task-update"

curl -X POST $TARGET_URL \
     -H "Content-Type: application/json" \
     -d '{
       "taskId": "T-12345",
       "taskName": "n8n Workflow Design",
       "assignee": "阿策",
       "newStatus": "COMPLETED"
     }'
