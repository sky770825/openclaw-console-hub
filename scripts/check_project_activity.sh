#!/bin/bash
# 監控老蔡專案變動的工具
PROJECT_PATH="/Users/caijunchang/openclaw任務面版設計"
echo "--- 正在檢查最近 5 分鐘的檔案活動 ---"
if [ -d "$PROJECT_PATH" ]; then
    find "$PROJECT_PATH" -mmin -5 -not -path '*/.*'
else
    echo "找不到專案路徑: $PROJECT_PATH"
fi
