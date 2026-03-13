#!/bin/bash
# n8n 全自動化部署腳本
# 自動匯入工作流、設定憑證、啟動服務

set -e

echo "🚀 n8n 記憶串接 Agent 全自動化部署"
echo "======================================"

# 設定變數
N8N_URL="http://localhost:5678"
WORKFLOW_FILE="/Users/sky770825/.openclaw/workspace/n8n-workflows/openclaw-memory-agent.json"
OPENAI_KEY="${OPENAI_API_KEY:-}"
QDRANT_URL="http://host.docker.internal:6333"

# 檢查 OpenAI Key
if [ -z "$OPENAI_KEY" ]; then
    echo "❌ 錯誤: 找不到 OPENAI_API_KEY 環境變數"
    exit 1
fi

echo "✅ OpenAI API Key 已設定"

# 檢查 n8n 狀態
echo "🔍 檢查 n8n 服務..."
if ! curl -s "$N8N_URL/healthz" > /dev/null; then
    echo "❌ n8n 服務未運行"
    exit 1
fi
echo "✅ n8n 服務正常"

# 檢查 Qdrant
echo "🔍 檢查 Qdrant..."
if ! curl -s "$QDRANT_URL/collections/ltm" > /dev/null; then
    echo "⚠️  Qdrant Collection 'ltm' 不存在，正在建立..."
    curl -s -X PUT "$QDRANT_URL/collections/ltm" \
      -H 'Content-Type: application/json' \
      -d '{"vectors": {"size": 1024, "distance": "Cosine"}}' > /dev/null
fi
echo "✅ Qdrant 準備完成"

echo ""
echo "📋 手動完成步驟（因 n8n API 需認證）："
echo "======================================"
echo ""
echo "1️⃣  開啟 n8n: http://localhost:5678"
echo ""
echo "2️⃣  設定 Credentials:"
echo "    - 左側 Settings → Credentials → Add Credential"
echo ""
echo "    🔑 OpenAI API:"
echo "       類型: OpenAI API"
echo "       API Key: ${OPENAI_KEY:0:15}..."
echo ""
echo "    🔗 Qdrant:"
echo "       類型: Qdrant API"
echo "       URL: http://host.docker.internal:6333"
echo "       API Key: (留空)"
echo ""
echo "3️⃣  匯入工作流:"
echo "    - Workflows → Import from File"
echo "    - 選擇: $WORKFLOW_FILE"
echo ""
echo "4️⃣  更新 Credential IDs:"
echo "    開啟工作流後，將各節點的 Credential 設為剛剛建立的"
echo ""
echo "5️⃣  啟動: Save → Activate"
echo ""
echo "🎯 Webhook URL: $N8N_URL/webhook/openclaw-memory"
echo ""
