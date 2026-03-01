#!/bin/bash
# 測試 OpenClaw → n8n 橋接

echo "🧪 測試 n8n 記憶串接..."

N8N_URL="http://localhost:5678/webhook/openclaw-memory"

# 測試請求
RESPONSE=$(curl -s -X POST "$N8N_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-openclaw-001",
    "userMessage": "你好，這是來自 OpenClaw 的測試訊息",
    "context": {
      "source": "openclaw",
      "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
    }
  }' 2>/dev/null)

if [ -n "$RESPONSE" ]; then
    echo "✅ n8n 回應成功:"
    echo "$RESPONSE" | head -200
else
    echo "❌ n8n 無回應，請確認:"
    echo "   1. 工作流已 Import"
    echo "   2. 工作流已 Activate"
    echo "   3. Credentials 已設定"
fi
