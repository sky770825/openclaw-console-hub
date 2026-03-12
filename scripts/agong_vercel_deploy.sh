#!/bin/bash
# 阿工自動化部署工具 - Vercel 版
# 此腳本由任務執行器自動生成

SOURCE_ROOT="/Users/caijunchang/openclaw任務面版設計"
CONFIG_FILE="/Users/caijunchang/.openclaw/workspace/sandbox/output/vercel.json"

echo "--- 阿工部署啟動 ---"

if [ ! -d "$SOURCE_ROOT" ]; then
    echo "錯誤：找不到原始碼目錄 $SOURCE_ROOT"
    exit 1
fi

echo "1. 檢查 Vercel CLI..."
if ! command -v vercel &> /dev/null; then
    echo "正在安裝 Vercel CLI..."
    npm install -g vercel
fi

echo "2. 準備部署配置..."
# 將產生的 vercel.json 複製到臨時工作區（因為原始碼目錄唯讀）
TEMP_DEPLOY_DIR="/tmp/vercel_deploy_$USER"
rm -rf "$TEMP_DEPLOY_DIR"
mkdir -p "$TEMP_DEPLOY_DIR"

echo "3. 同步原始碼到臨時目錄..."
# 排除 node_modules 以加快速度
rsync -av --exclude 'node_modules' --exclude '.git' "$SOURCE_ROOT/" "$TEMP_DEPLOY_DIR/"

echo "4. 注入校準後的 vercel.json..."
cp "/Users/caijunchang/.openclaw/workspace/sandbox/output/vercel.json" "$TEMP_DEPLOY_DIR/vercel.json"

echo "5. 執行 Vercel 部署..."
cd "$TEMP_DEPLOY_DIR"
vercel --prod --yes

echo "--- 部署完成 ---"
