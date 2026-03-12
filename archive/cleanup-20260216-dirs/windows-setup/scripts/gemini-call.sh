#!/bin/bash
# Gemini API 呼叫腳本 - 用於 Auto-Skill 和智慧讀取
# 預設使用 gemini-2.5-flash（免費額度）

set -euo pipefail

# 設定
CONFIG_DIR="${HOME}/.openclaw/secure"
API_KEY_FILE="${CONFIG_DIR}/google-api.key"

# 相容舊路徑檢查
if [[ ! -f "$API_KEY_FILE" ]] && [[ -f "${HOME}/.openclaw/workspace/secure/google-api.key" ]]; then
    API_KEY_FILE="${HOME}/.openclaw/workspace/secure/google-api.key"
fi
DEFAULT_MODEL="gemini-2.5-flash"

# 讀取 API Key
if [[ ! -f "$API_KEY_FILE" ]]; then
    echo "❌ 找不到 API Key，請先執行設定腳本" >&2
    exit 1
fi

API_KEY=$(cat "$API_KEY_FILE" | tr -d '\n')

# 參數
MODEL="${1:-$DEFAULT_MODEL}"
PROMPT="${2:-}"

if [[ -z "$PROMPT" ]]; then
    echo "用法: gemini-call.sh [模型名稱] '你的提示詞'"
    echo "預設模型: $DEFAULT_MODEL"
    echo ""
    echo "可用模型:"
    echo "  gemini-2.5-flash  (推薦，免費額度)"
    echo "  gemini-2.5-pro    (高品質，付費)"
    echo "  gemini-2.0-flash  (舊版，免費額度)"
    exit 1
fi

# 呼叫 Gemini API
RESPONSE=$(curl -s -X POST "https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
        \"contents\": [{
            \"parts\": [{\"text\": \"${PROMPT//\"/\\\"}\"}]
        }],
        \"generationConfig\": {
            \"temperature\": 0.7,
            \"topP\": 0.95,
            \"topK\": 40,
            \"maxOutputTokens\": 2048
        }
    }" 2>/dev/null)

# 解析回應
if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    echo "❌ API 錯誤:"
    echo "$RESPONSE" | jq '.error.message' 2>/dev/null || echo "$RESPONSE"
    exit 1
fi

# 輸出結果
echo "$RESPONSE" | jq -r '.candidates[0].content.parts[0].text' 2>/dev/null || {
    echo "⚠️  無法解析回應，原始資料："
    echo "$RESPONSE"
}
