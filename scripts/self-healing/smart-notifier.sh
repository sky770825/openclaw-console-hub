#!/bin/zsh
# smart-notifier.sh - 智能預警發送器
# 用法: ./scripts/self-healing/smart-notifier.sh "標題" "級別(INFO|WARN|ERROR|CRITICAL)" "描述" "上下文JSON"

TITLE=$1
LEVEL=$2
MESSAGE=$3
CONTEXT=${4:-"{}"}

# 根據級別選擇 Emoji
case $LEVEL in
    INFO) EMOJI="ℹ️" ;;
    WARN) EMOJI="⚠️" ;;
    ERROR) EMOJI="❌" ;;
    CRITICAL) EMOJI="🚨" ;;
    *) EMOJI="🔔" ;;
esac

# 獲取系統資訊
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
HOSTNAME=$(hostname)
UPTIME=$(uptime | awk -F'up ' '{print $2}' | awk -F',' '{print $1}')

# 格式化通知文本
cat <<EOF > /tmp/alert_payload.txt
$EMOJI [$LEVEL] $TITLE
━━━━━━━━━━━━━━━
⏰ 時間: $TIMESTAMP
📍 主機: $HOSTNAME (Uptime: $UPTIME)
📝 描述: $MESSAGE

🔍 上下文詳情:
$(echo "$CONTEXT" | jq '.' 2>/dev/null || echo "$CONTEXT")

🛠️ 建議行動:
$(if [[ "$LEVEL" == "CRITICAL" ]]; then echo "👉 請立即檢查系統，可能需要手動重啟。"; else echo "👉 系統已嘗試自動處理，請留意後續狀態。"; fi)
━━━━━━━━━━━━━━━
#OpenClaw #SelfHealing
EOF

# 模擬發送到監控儀表板 (在此實作中寫入特定 log 並輸出)
# 未來可對接 Telegram Bot API 或 n8n Webhook
echo "--- SENDING ALERT ---"
cat /tmp/alert_payload.txt
echo "---------------------"

# 記錄到統一預警日誌
mkdir -p logs/alerts
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [$LEVEL] $TITLE - $MESSAGE" >> logs/alerts/alert-history.log
