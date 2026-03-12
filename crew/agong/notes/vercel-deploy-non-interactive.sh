#!/bin/bash

# Vercel 非互動式部署腳本 (CI/CD 專用)
#
# 功能：自動化連結專案、建置、並部署到生產環境。
# 使用前請務必設定以下三個環境變數：
# VERCEL_TOKEN: 你的 Vercel Access Token
# VERCEL_ORG_ID: 你的 Vercel Organization ID
# VERCEL_PROJECT_ID: 你要部署的 Vercel Project ID

set -e # 任何指令失敗就立刻終止腳本

# 1. 檢查環境變數是否存在
if [ -z "$VERCEL_TOKEN" ] || [ -z "$VERCEL_ORG_ID" ] || [ -z "$VERCEL_PROJECT_ID" ]; then
  echo "🔴 錯誤：環境變數 VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID 必須被設定。"
  exit 1
fi

# 2. 連結到指定的 Vercel 專案
# 這一命令會建立一個 .vercel 目錄，其中包含專案連結資訊。
# 這樣後續的 vercel deploy 就不會再問你要部署到哪個專案。
echo "🔗 正在連結 Vercel 專案..."
vercel link --yes -t "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" --project "$VERCEL_PROJECT_ID"

# 3. 拉取最新的專案環境變數 (可選，但建議)
echo "⬇️ 正在拉取 Vercel 專案環境變數..."
vercel env pull .env.production.local --yes -t "$VERCEL_TOKEN"

# 4. 執行部署到生產環境
# --prod: 直接部署到生產環境 (production)
# --yes: 自動同意所有 Vercel CLI 的提示
# -t: 使用 token 進行驗證
echo "🚀 開始部署到生產環境..."
DEPLOY_URL=$(vercel deploy --prod --yes -t "$VERCEL_TOKEN")

# 5. 回報結果
echo "✅ 部署成功！"
echo "URL: $DEPLOY_URL"

exit 0
