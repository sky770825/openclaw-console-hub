#!/bin/bash
# 這是用於批准任務 t1772626514403 的快捷腳本

STATUS_FILE="/Users/caijunchang/.openclaw/workspace/reports/task_t1772626514403_status.json"

if [ ! -f "$STATUS_FILE" ]; then
    echo "錯誤：找不到任務狀態文件。"
    exit 1
fi

echo "正在批准任務 t1772626514403..."
# 使用 macOS 兼容的 sed -i 命令更新狀態
sed -i '' 's/"status": "draft"/"status": "approved"/g' "$STATUS_FILE"

echo "任務已成功批准！"
echo "當前狀態已更新為: $(grep "status" "$STATUS_FILE")"
