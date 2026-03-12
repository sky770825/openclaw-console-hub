#!/bin/bash
# 群組監聽 webhook 啟動腳本
# 1. 啟動 Python webhook 服務 (port 8000)
# 2. 啟動 ngrok 隧道
# 3. 自動 setWebhook（ngrok URL 每次不同）

BOT_TOKEN="8316840422:AAH3jcMMGB552XQEdlhyU2j0BPNXVAn57hE"
WEBHOOK_SCRIPT="$HOME/.openclaw/workspace/scripts/telegram_logger_webhook.py"
LOG_DIR="$HOME/.openclaw/automation/logs"
mkdir -p "$LOG_DIR"

# 殺掉舊進程
pkill -f "telegram_logger_webhook.py" 2>/dev/null
pkill -f "ngrok http 8000" 2>/dev/null
sleep 1

# 1. 啟動 webhook 服務
python3 "$WEBHOOK_SCRIPT" >> "$LOG_DIR/webhook-logger.log" 2>&1 &
WEBHOOK_PID=$!
echo "[$(date)] Webhook 服務啟動 PID=$WEBHOOK_PID" >> "$LOG_DIR/webhook-logger.log"

# 等 webhook 服務啟動
sleep 2

# 2. 啟動 ngrok
ngrok http 8000 --log=stdout >> "$LOG_DIR/ngrok.log" 2>&1 &
NGROK_PID=$!
echo "[$(date)] ngrok 啟動 PID=$NGROK_PID" >> "$LOG_DIR/ngrok.log"

# 等 ngrok 建立隧道
sleep 4

# 3. 取得 ngrok 公開 URL 並 setWebhook
for i in 1 2 3 4 5; do
  NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['tunnels'][0]['public_url'])" 2>/dev/null)
  if [ -n "$NGROK_URL" ]; then
    break
  fi
  sleep 2
done

if [ -n "$NGROK_URL" ]; then
  WEBHOOK_URL="${NGROK_URL}/webhook/${BOT_TOKEN}"
  RESULT=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
    -H "Content-Type: application/json" \
    -d "{\"url\":\"${WEBHOOK_URL}\"}" 2>/dev/null)
  echo "[$(date)] setWebhook: $RESULT | URL: $NGROK_URL" >> "$LOG_DIR/webhook-logger.log"
else
  echo "[$(date)] ERROR: 無法取得 ngrok URL" >> "$LOG_DIR/webhook-logger.log"
fi

# 保持前台運行（讓 launchd 管理）
wait $WEBHOOK_PID
