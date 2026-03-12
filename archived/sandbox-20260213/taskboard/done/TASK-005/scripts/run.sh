#!/bin/bash
# 行銷自動化產品上架系統 - 執行腳本

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_CMD="python3"

echo "🚀 行銷自動化產品上架系統"
echo "================================"

# 檢查 Python
if ! command -v $PYTHON_CMD &> /dev/null; then
    echo "❌ Python 3 未安裝"
    exit 1
fi

echo "✅ Python 版本: $($PYTHON_CMD --version)"

# 進入專案目錄
cd "$PROJECT_DIR"

# 檢查虛擬環境
if [ ! -d "venv" ]; then
    echo "📦 建立虛擬環境..."
    $PYTHON_CMD -m venv venv
fi

# 啟用虛擬環境
source venv/bin/activate

# 安裝依賴
if [ ! -f ".installed" ]; then
    echo "📥 安裝依賴套件..."
    pip install -q -r requirements.txt
    touch .installed
fi

# 初始化系統
if [ ! -d "data" ]; then
    echo "🔧 初始化系統..."
    $PYTHON_CMD src/cli.py init
fi

# 執行命令
$PYTHON_CMD src/cli.py "$@"
