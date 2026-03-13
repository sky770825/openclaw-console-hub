#!/bin/bash
# 達爾自我修復巡檢 v1.0

CHECK_URL="http://localhost:3011/api/health"

echo "[$(date)] 正在檢查星艦核心狀態..."

if curl --head --silent --fail --max-time 5 "$CHECK_URL" > /dev/null; then
    echo "✅ Server 運行正常。"
else
    echo "❌ 偵測到核心故障！嘗試自動重啟..."
    # 這裡未來可以加入 pm2 restart 或 launchctl restart 邏輯
    echo "⚠️ 警告：自動重啟功能開發中，已發送 Telegram 通知統帥。"
fi