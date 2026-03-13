#!/bin/bash
# 每日健康巡檢腳本 - 任務板 + 系統狀態
# 建議放進 crontab: 0 9 * * * /Users/sky770825/.openclaw/workspace/scripts/daily-health-check.sh

LOG_FILE="/Users/sky770825/.openclaw/workspace/logs/health-check-$(date +%Y%m%d).log"
API_URL="http://localhost:3011/api/tasks"
ALERT_BOT="@ollama168bot"

mkdir -p $(dirname $LOG_FILE)

echo "=== $(date) 健康巡檢開始 ===" >> $LOG_FILE

# 1. 檢查任務板 API 存活
curl -s -o /dev/null -w "%{http_code}" $API_URL | grep -q "200"
if [ $? -ne 0 ]; then
  echo "❌ 任務板 API 無回應" >> $LOG_FILE
  # message send --target "$ALERT_BOT" --message "🚨 任務板 API 異常"
else
  echo "✅ 任務板 API 正常" >> $LOG_FILE
fi

# 2. 統計 draft/noncompliant 任務數
DRAFT_COUNT=$(curl -s "$API_URL?status=draft" | jq -r 'length' 2>/dev/null || echo "0")
NONCOMP_COUNT=$(curl -s "$API_URL?tags=noncompliant" | jq -r 'length' 2>/dev/null || echo "0")

echo "📊 Draft 任務: $DRAFT_COUNT" >> $LOG_FILE
echo "📊 Noncompliant 任務: $NONCOMP_COUNT" >> $LOG_FILE

# 3. 檢查是否有 running 過久的任務 ( > 24h )
# TODO: 實作 lastRunAt 檢查

# 4. 檢查 OpenClaw Gateway
gateway_status=$(openclaw status 2>/dev/null | head -1 || echo "unknown")
echo "🦞 OpenClaw: $gateway_status" >> $LOG_FILE

# 5. 檢查磁碟空間
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$DISK_USAGE" -gt 90 ]; then
  echo "⚠️ 磁碟使用率 ${DISK_USAGE}%" >> $LOG_FILE
fi

echo "=== 巡檢完成 ===" >> $LOG_FILE

# 輸出摘要給 Telegram（如有異常）
if [ "$DRAFT_COUNT" -gt 100 ] || [ "$NONCOMP_COUNT" -gt 50 ]; then
  echo "⚠️ 任務板異常：$DRAFT_COUNT draft, $NONCOMP_COUNT noncompliant" | tee -a $LOG_FILE
fi