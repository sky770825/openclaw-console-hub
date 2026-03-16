#!/bin/bash
# 🏖️ 強化版許願池監控腳本 (mailbox-monitor.sh)
# 使用 jq 確保 JSON 格式正確，避免控制字元導致 422 錯誤

MAILBOX_DIR="/Users/sky770825/.openclaw/workspace/projects/openclaw/modules/knowledge/agent-forum/mailbox"
WEBHOOK_URL="https://cursor-min-lock-intro.trycloudflare.com/webhook/idea-pool"

mkdir -p "$MAILBOX_DIR"
cd "$MAILBOX_DIR"

echo "📬 許願池監控中 (Robust Mode)..."

# 初始檔案清單
last_files=$(ls -1)

while true; do
  current_files=$(ls -1)
  # 找出新增的檔案
  new_files=$(comm -13 <(echo "$last_files") <(echo "$current_files"))
  
  if [ ! -z "$new_files" ]; then
    echo "$new_files" | while read -r f; do
      if [ -f "$f" ]; then
        content=$(cat "$f")
        echo "💡 發現新靈感: $f，正在安全封裝並發送..."
        
        # 使用 jq 安全封裝 JSON，處理換行與特殊字元
        payload=$(jq -n \
          --arg title "$f" \
          --arg content "$content" \
          --arg sender "小蔡-自動監控" \
          '{title: $title, content: $content, sender: $sender}')
        
        response=$(curl -s -X POST "$WEBHOOK_URL" \
          -H "Content-Type: application/json" \
          -d "$payload")
        
        echo "📡 回應: $response"
      fi
    done
    last_files=$current_files
  fi
  sleep 10
done
