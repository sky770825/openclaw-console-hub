#!/bin/bash
# 阿工專用：檢查 Vercel/Linear 部署環境
echo "--- 部署環境校準檢查 ---"

CHECK_LIST=("LINEAR_API_KEY" "VERCEL_TOKEN" "NEXT_PUBLIC_APP_URL" "RAYCAST_EXT_ID")

for var in "${CHECK_LIST[@]}"; do
    if [ -z "${!var}" ]; then
        echo "[!] 缺失環境變數: $var (請在 Vercel Dashboard 設置)"
    else
        echo "[OK] 環境變數已設置: $var"
    fi
done

echo "--- 檢查結束 ---"
