#!/bin/bash
# 模擬 OpenClaw 發送 Webhook 到 n8n
WEBHOOK_URL=$1

if [ -z "$WEBHOOK_URL" ]; then
  echo "Usage: $0 <n8n_webhook_url>"
  exit 1
fi

curl -X POST "$WEBHOOK_URL" \
-H "Content-Type: application/json" \
-d '{
  "title": "實作 n8n 自動化流程",
  "status": "待驗收",
  "assignee": "阿策"
}'

echo -e "\nWebhook Sent!"
