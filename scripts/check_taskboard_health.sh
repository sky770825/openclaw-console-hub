#!/bin/bash
# 任務版健康檢查工具 (Health Check Tool)

echo "--- 正在檢查任務版系統狀態 ---"

# 1. 檢查後端服務 (假設連接埠為 3000 或 3001)
echo "[1/3] 檢查後端服務回應..."
if curl -s --max-time 2 http://localhost:3000/health > /dev/null; then
    echo "✅ 後端服務 (port 3000) 正常"
elif curl -s --max-time 2 http://localhost:3001/health > /dev/null; then
    echo "✅ 後端服務 (port 3001) 正常"
else
    echo "❌ 無法連接到後端 API，請確認後端是否已啟動。"
fi

# 2. 檢查 Node.js 版本
echo "[2/3] 檢查開發環境..."
NODE_VER=$(node -v 2>/dev/null || echo "未安裝")
echo "Node 版本: $NODE_VER"

# 3. 檢查必要目錄
SOURCE_DIR="/Users/sky770825/openclaw任務面版設計"
echo "[3/3] 檢查原始碼目錄..."
if [ -d "$SOURCE_DIR" ]; then
    echo "✅ 原始碼目錄存在"
else
    echo "❌ 找不到原始碼目錄: $SOURCE_DIR"
fi

echo "--- 檢查完成 ---"
