#!/bin/bash
# 990 Lite — 一鍵安全掃描腳本
# 用法: ./scan-990.sh [掃描目錄]  （預設：當前目錄）

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="${1:-.}"

echo "[990 Lite] 掃描目標：$(cd "$TARGET" && pwd)"

python3 "$SCRIPT_DIR/src/main.py" "$TARGET" 2>&1 | tee "$SCRIPT_DIR/990-report.md"

echo ""
echo "報告已儲存至 990-report.md"
