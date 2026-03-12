#!/bin/bash
# 測試 GBP API 連通性腳本 (僅供手動測試或 n8n 參數除錯)

ACCESS_TOKEN="YOUR_ACCESS_TOKEN"
ACCOUNT_ID="YOUR_ACCOUNT_ID"
LOCATION_ID="YOUR_LOCATION_ID"

if [ "$ACCESS_TOKEN" == "YOUR_ACCESS_TOKEN" ]; then
  echo "請先在腳本中設定有效的 ACCESS_TOKEN"
  exit 1
fi

echo "正在嘗試獲取評論清單..."
curl -X GET \
  "https://mybusiness.googleapis.com/v1/accounts/${ACCOUNT_ID}/locations/${LOCATION_ID}/reviews" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json"
