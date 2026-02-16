#!/bin/bash
# 重新部署 OpenClaw 任務板到 Railway
# 使用方式: bash deploy-to-railway.sh

set -e

echo "🚀 OpenClaw 任務板 Railway 重新部署腳本"
echo "=========================================="
echo ""

# 顏色設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 檢查是否在正確目錄
if [ ! -f "railway.json" ]; then
    echo -e "${RED}❌ 錯誤: 請在專案根目錄執行此腳本${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  警告: 這將刪除現有 Railway 專案並重新部署${NC}"
echo ""
read -p "確定要繼續嗎? (y/N): " confirm
if [[ $confirm != [yY] ]]; then
    echo "已取消"
    exit 0
fi

echo ""
echo "📝 步驟 1: 確認環境變數"
echo "=========================================="

# 檢查 .env 是否存在
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ 錯誤: 找不到 .env 檔案${NC}"
    echo "請先建立 .env 檔案，包含:"
    echo "  SUPABASE_URL="
    echo "  SUPABASE_SERVICE_ROLE_KEY="
    exit 1
fi

# 讀取環境變數
export $(cat .env | grep -v '^#' | xargs)

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ 錯誤: .env 檔案缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 環境變數檢查通過${NC}"

echo ""
echo "🔧 步驟 2: 檢查 Railway CLI"
echo "=========================================="

if ! command -v railway &> /dev/null; then
    echo "安裝 Railway CLI..."
    npm install -g @railway/cli
fi

echo -e "${GREEN}✅ Railway CLI 已就緒${NC}"

echo ""
echo "🔐 步驟 3: 登入 Railway"
echo "=========================================="
echo "請在瀏覽器中完成登入..."
railway login

echo ""
echo "🗑️ 步驟 4: 刪除舊專案（如果存在）"
echo "=========================================="

# 嘗試找到並刪除舊專案
PROJECT_NAME="xiaojicai-production"
echo "嘗試刪除舊專案: $PROJECT_NAME"
railway delete $PROJECT_NAME 2>/dev/null || echo "舊專案不存在或已刪除"

echo ""
echo "📦 步驟 5: 建立新專案"
echo "=========================================="

railway init --name "$PROJECT_NAME"

echo ""
echo "🔧 步驟 6: 設定環境變數"
echo "=========================================="

railway variables set \
    SUPABASE_URL="$SUPABASE_URL" \
    SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
    PORT="3011"

echo -e "${GREEN}✅ 環境變數設定完成${NC}"

echo ""
echo "🚀 步驟 7: 部署！"
echo "=========================================="

railway up

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}✅ 部署完成！${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo "等待服務啟動..."
sleep 10

# 嘗試獲取部署後的網址
echo ""
echo "🌐 您的任務板網址:"
railway domain 2>/dev/null || echo "請在 Railway Dashboard 查看"

echo ""
echo "📋 下一步:"
echo "1. 等待 30-60 秒讓服務完全啟動"
echo "2. 訪問上方網址查看任務板"
echo "3. 本地和線上現在會同步到同一個 Supabase 資料庫！"
