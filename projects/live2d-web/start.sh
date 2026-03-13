#!/bin/bash
# Live2D Web 啟動腳本

cd "$(dirname "$0")"

echo "🎭 達爾 Live2D 啟動中..."

# 檢查 node 是否存在
if ! command -v node &> /dev/null; then
  echo "❌ 需要安裝 Node.js"
  exit 1
fi

# 安裝依賴
if [ ! -d "node_modules" ]; then
  echo "📦 安裝依賴..."
  npm install ws
fi

# 啟動
echo "✅ 啟動 http://localhost:8080"
echo "📱 用瀏覽器開啟上面的網址就能看到達爾"
node server.js
