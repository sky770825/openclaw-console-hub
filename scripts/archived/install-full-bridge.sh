#!/bin/bash
#
# OpenClaw + n8n 完整橋接安裝
# 執行此腳本完成所有設定

echo "🚀 OpenClaw + n8n 完整橋接安裝"
echo "=============================="
echo ""

# 1. 測試 n8n
echo "步驟 1/3: 測試 n8n 連線..."
if curl -s http://localhost:5678/healthz > /dev/null 2>&1; then
    echo "✅ n8n 運行中"
else
    echo "❌ n8n 未運行"
    echo "請先執行: ./scripts/deploy-n8n.sh docker"
    exit 1
fi

# 2. 測試 Qdrant
echo "步驟 2/3: 測試 Qdrant..."
if curl -s http://localhost:6333/collections/ltm > /dev/null 2>&1; then
    echo "✅ Qdrant 就緒"
else
    echo "⚠️  Qdrant Collection 不存在，建立中..."
    curl -s -X PUT 'http://localhost:6333/collections/ltm' \
      -H 'Content-Type: application/json' \
      -d '{"vectors": {"size": 1024, "distance": "Cosine"}}' > /dev/null
    echo "✅ Collection 已建立"
fi

# 3. 測試 Webhook
echo "步驟 3/3: 測試 Webhook..."
RESPONSE=$(curl -s -X POST http://localhost:5678/webhook/openclaw-memory \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"install-test","userMessage":"安裝測試","context":{}}' \
  --max-time 5 2>/dev/null || echo "")

if [ -n "$RESPONSE" ]; then
    echo "✅ Webhook 回應正常"
    echo "回應: $RESPONSE"
else
    echo "⚠️  Webhook 無回應"
    echo "請確認 n8n 工作流已 Import 並 Activate"
fi

echo ""
echo "=============================="
echo "安裝完成！"
echo ""
echo "📚 下一步:"
echo "   1. 開啟 n8n: http://localhost:5678"
echo "   2. Import 工作流: n8n-workflows/openclaw-memory-agent.json"
echo "   3. 設定 Credentials (OpenAI + Qdrant)"
echo "   4. Activate 工作流"
echo ""
echo "🧪 測試指令:"
echo "   ./scripts/test-n8n-bridge.sh"
echo ""
