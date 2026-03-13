#!/bin/bash
TARGET="/Users/sky770825/.openclaw/workspace/sandbox/new_computer.txt"
if [ -f "$TARGET" ]; then
    CONTENT=$(cat "$TARGET")
    if [ "$CONTENT" == "新電腦來了" ]; then
        echo "[SUCCESS] 檔案存在且內容正確。"
        exit 0
    else
        echo "[FAILURE] 內容不符: $CONTENT"
        exit 1
    fi
else
    echo "[FAILURE] 檔案不存在。"
    exit 1
fi
