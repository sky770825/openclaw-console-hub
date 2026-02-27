#!/bin/bash
# Web Monitor Run Check - 執行監控檢查並發送通知

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="${HOME}/.web-monitor"

# 載入環境變數（如果存在）
[ -f "${DATA_DIR}/telegram.env" ] && source "${DATA_DIR}/telegram.env"
[ -f "${DATA_DIR}/discord.env" ] && source "${DATA_DIR}/discord.env"
[ -f "${DATA_DIR}/slack.env" ] && source "${DATA_DIR}/slack.env"

# 顏色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 開始執行監控檢查..."

# 執行檢查並獲取結果
RESULT=$(python3 "${SCRIPT_DIR}/monitor.py" check --notify 2>&1)
EXIT_CODE=$?

# 輸出結果
echo "$RESULT"

# 檢查是否有變化並發送通知
if [ $EXIT_CODE -eq 0 ]; then
    # 解析 JSON 結果中的變化
    CHANGED=$(echo "$RESULT" | grep -A 1000 "JSON 輸出:" | tail -n +2 | python3 -c "
import sys, json
data = json.load(sys.stdin)
changed = [r for r in data if r.get('changed') and not r.get('error')]
print('true' if changed else 'false')
" 2>/dev/null || echo "false")
    
    if [ "$CHANGED" = "true" ]; then
        echo ""
        echo -e "${YELLOW}📢 檢測到變化，發送通知...${NC}"
        
        # 提取變化的項目詳情
        echo "$RESULT" | grep -A 1000 "JSON 輸出:" | tail -n +2 | python3 -c "
import sys, json, os

data = json.load(sys.stdin)
script_dir = os.environ.get('SCRIPT_DIR', '')

for r in data:
    if r.get('changed') and not r.get('error'):
        url = r.get('url', '')
        diff = r.get('diff', '內容已更新')
        
        # 發送通知
        notify_cmd = f\"{script_dir}/notify.py\"
        
        # Telegram
        if os.environ.get('TELEGRAM_BOT_TOKEN'):
            os.system(f\"{notify_cmd} --telegram --url '{url}' --diff '{diff}' --message 'Web Monitor Alert'\")
        
        # Discord
        if os.environ.get('DISCORD_WEBHOOK_URL'):
            os.system(f\"{notify_cmd} --discord --url '{url}' --diff '{diff}' --message 'Web Monitor Alert'\")
        
        # Slack
        if os.environ.get('SLACK_WEBHOOK_URL'):
            os.system(f\"{notify_cmd} --slack --url '{url}' --diff '{diff}' --message 'Web Monitor Alert'\")
" 2>/dev/null || true
    fi
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 監控檢查完成"
