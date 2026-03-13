#!/bin/bash
# 檢查專案同步狀態腳本
TARGET_DIR="/Users/sky770825/openclaw任務面版設計"
echo "--- 專案同步檢查 ---"
if [ -d "$TARGET_DIR/.git" ]; then
    cd "$TARGET_DIR"
    echo "分支: $(git rev-parse --abbrev-ref HEAD)"
    echo "遠端狀態:"
    git fetch --dry-run 2>&1
    git status
else
    echo "錯誤: 找不到 Git 儲存庫 $TARGET_DIR"
fi
