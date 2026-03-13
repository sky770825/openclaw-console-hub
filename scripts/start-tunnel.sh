#!/bin/bash
# 啟動 cloudflared tunnel 並將 URL 寫入 .env
# 用法：bash scripts/start-tunnel.sh

ENV_FILE="/Users/sky770825/openclaw任務面版設計/server/.env"
LOG_FILE="/Users/sky770825/.openclaw/automation/logs/tunnel.log"

# 殺掉舊的 tunnel
pkill -f "cloudflared tunnel" 2>/dev/null
sleep 1

# 啟動新 tunnel
cloudflared tunnel --url http://localhost:3011 > "$LOG_FILE" 2>&1 &
TUNNEL_PID=$!
echo "Tunnel PID: $TUNNEL_PID"

# 等待 URL 出現
for i in $(seq 1 15); do
  TUNNEL_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$LOG_FILE" 2>/dev/null | head -1)
  if [ -n "$TUNNEL_URL" ]; then
    break
  fi
  sleep 1
done

if [ -z "$TUNNEL_URL" ]; then
  echo "ERROR: 無法取得 tunnel URL"
  exit 1
fi

echo "Tunnel URL: $TUNNEL_URL"

# 更新 .env
sed -i '' '/^TUNNEL_URL=/d' "$ENV_FILE" 2>/dev/null
echo "TUNNEL_URL=$TUNNEL_URL" >> "$ENV_FILE"

echo "已寫入 .env: TUNNEL_URL=$TUNNEL_URL"
echo "$TUNNEL_URL" > /Users/sky770825/.openclaw/workspace/TUNNEL_URL.txt
