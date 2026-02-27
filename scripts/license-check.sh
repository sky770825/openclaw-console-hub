#!/bin/bash
# NEUXA License Guard v1.0
MACHINE_ID=$(ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID | awk '{print $4}' | tr -d '"')
echo "[NEUXA] 正在驗證機器授權碼: $MACHINE_ID"
# 這裡未來會接 n8n API 檢查
# 模擬驗證失敗 (如果不輸入特定 key)
if [ "$1" != "NEUXA-STARSHIP-2026" ]; then
    echo "❌ 授權失敗！請聯繫老蔡獲取授權密鑰。"
    exit 1
fi
echo "✅ 授權成功！歡迎登上 NEUXA 星艦。"
