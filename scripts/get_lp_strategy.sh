#!/bin/bash
# 快速獲取 Landing Page 策略範本內容
FILE_PATH="/Users/caijunchang/.openclaw/workspace/knowledge/landing_page_strategy_template.md"
if [ -f "$FILE_PATH" ]; then
    cat "$FILE_PATH"
else
    echo "錯誤：找不到 Landing Page 策略範本。"
    exit 1
fi
