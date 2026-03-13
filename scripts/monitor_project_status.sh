#!/bin/bash
PROJECT_PATH="/Users/caijunchang/openclaw任務面版設計"
echo "--- 專案狀態快照 $(date) ---"
echo "檔案總數: $(find "$PROJECT_PATH" -not -path '*/.*' | wc -l)"
echo "最近 5 分鐘變動檔案:"
find "$PROJECT_PATH" -maxdepth 4 -not -path '*/.*' -mmin -5
