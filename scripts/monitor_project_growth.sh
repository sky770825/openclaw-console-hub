#!/bin/bash
TARGET="/Users/caijunchang/openclaw任務面版設計"
echo "[$(date)] 正在檢查專案動態..."
echo "目錄: $TARGET"
echo "當前檔案總數: $(find "$TARGET" -type f | wc -l)"
echo "最近 5 分鐘內變動的檔案:"
find "$TARGET" -type f -mmin -5 -not -path '*/.*'
