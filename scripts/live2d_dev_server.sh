#!/bin/bash
# 啟動 Live2D 原型預覽伺服器
PORT=8081
TARGET_DIR="/Users/sky770825/.openclaw/workspace/sandbox/live2d_prototype"

echo "正在啟動 Live2D 原型開發伺服器..."
echo "存取地址: http://localhost:$PORT"
echo "按 Ctrl+C 停止伺服器"

cd "$TARGET_DIR" && python3 -m http.server $PORT
