#!/bin/bash
# Data Inspector v1.0 - Execution Script

# 檢查是否提供了 URL
if [ -z "$1" ]; then
  echo "錯誤：請提供一個 CSV 檔案的 URL。"
  echo "用法: $0 <csv_url>"
  exit 1
fi

CSV_URL="$1"

# 獲取腳本所在目錄，以確保能找到 python 腳本
SCRIPT_DIR=$(dirname "$0")

# 執行 Python 腳本
# 假設執行環境中 `python3` 和 `pandas` 函式庫是可用的
python3 "$SCRIPT_DIR/inspector.py" "$CSV_URL"
