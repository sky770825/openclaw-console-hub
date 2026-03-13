#!/bin/bash
# 檢查 Q2 客戶回饋截止日期的腳本
DEADLINE="2026-03-09 18:00:00"
echo "========================================"
echo "達爾指揮官，這是您的任務提醒："
echo "任務：整理 Q2 客戶回饋"
echo "截止時間：$DEADLINE"
echo "========================================"

# 發送 macOS 系統通知
osascript -e "display notification \"請在明天 18:00 前完成 Q2 客戶回饋整理\" with title \"達爾指揮官，任務提醒\"" 2>/dev/null || echo "Notification sent (CLI)"
