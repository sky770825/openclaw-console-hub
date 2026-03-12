#!/bin/bash
# 阿工自動化部署引擎 - Vercel 非互動式版本
set -e

PROJECT_PATH="${1:-.}"
TOKEN="$VERCEL_TOKEN"

if [ -z "$TOKEN" ]; then
    echo "Error: VERCEL_TOKEN is required for non-interactive deployment."
    exit 1
fi

echo ">>> 啟動 Vercel 部署程序..."
echo ">>> 目錄: $PROJECT_PATH"

# 連結專案 (Link)
# 使用 --yes 確保非互動，若有 VERCEL_ORG_ID 與 VERCEL_PROJECT_ID 效果更佳
npx vercel link --yes --token "$TOKEN" --cwd "$PROJECT_PATH"

# 提取環境變數 (Pull)
npx vercel pull --yes --environment=production --token "$TOKEN" --cwd "$PROJECT_PATH"

# 建置 (Build)
npx vercel build --prod --token "$TOKEN" --cwd "$PROJECT_PATH"

# 部署 (Deploy)
npx vercel deploy --prebuilt --prod --token "$TOKEN" --cwd "$PROJECT_PATH"

echo ">>> [成功] 部署完成。"
