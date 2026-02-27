#!/bin/bash
# Universal Data Connector v1.0 - Main Dispatcher

MODULE="$1"
COMMAND="$2"
shift 2
ARGS=("$@")

SCRIPT_DIR=$(dirname "$0")
MODULE_DIR="$SCRIPT_DIR/modules/$MODULE"

if [ ! -d "$MODULE_DIR" ]; then
    echo "{\"error\": \"錯誤：找不到模組 '$MODULE'\"}"
    exit 1
fi

# 在此版本中，我們假設第一個參數永遠是 db_path
# 未來版本可以做得更通用
DB_PATH="${ARGS[0]}"
QUERY="${ARGS[@]:1}"

# 調用特定模組的執行器
python3 "$MODULE_DIR/executor.py" "$DB_PATH" "$COMMAND" "$QUERY"
