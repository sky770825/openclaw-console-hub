#!/bin/bash
PROJECT_DIR="/Users/caijunchang/openclaw任務面版設計/server"
cd "$PROJECT_DIR"

# 嘗試找出 tsc 的路徑，優先使用本地 node_modules
TSC_BIN="./node_modules/.bin/tsc"

if [ -f "$TSC_BIN" ]; then
    echo "使用本地 tsc 進行檢查..."
    "$TSC_BIN" --noEmit
else
    echo "本地 tsc 不存在，嘗試使用 npx..."
    npx tsc --noEmit
fi
