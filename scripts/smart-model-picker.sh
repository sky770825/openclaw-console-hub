#!/bin/zsh
# 智慧模型選擇器 - 自動挑選最省的模型

set -euo pipefail

CONFIG_DIR="${HOME}/.openclaw/secure"
LOG_FILE="${CONFIG_DIR}/gemini-usage-daily.log"

# 檢查今日 Gemini 使用量
if [[ -f "$LOG_FILE" ]]; then
    today_count=$(grep "^$(date +%Y-%m-%d)" "$LOG_FILE" | grep -v "查詢額度" | wc -l)
else
    today_count=0
fi

FREE_TIER_RPD=1500
usage_percent=$(( today_count * 100 / FREE_TIER_RPD ))

# 根據額度選擇模型
if [[ $usage_percent -lt 80 ]]; then
    echo "gemini-2.5-flash"
else
    echo "kimi-k2.5"
fi
