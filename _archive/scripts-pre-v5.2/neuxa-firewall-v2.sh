#!/bin/bash
# NEUXA Starship Firewall v2.1 (Autonomous Edition)
# 新增功能：黑名單自動熔斷檢查

ACCESS_LEVEL=$1
RESOURCE=$2
SOURCE_ID=${3:-"UNKNOWN"}
DENY_LIST="config/deny_list.txt"

# [Step 0] 檢查黑名單
if grep -q "$SOURCE_ID" "$DENY_LIST" 2>/dev/null; then
    echo "🚫 [NEUXA-FIREWALL] 永久封鎖：來源 $SOURCE_ID 已列入黑名單。"
    ./scripts/neuxa-logger.sh RISK CRITICAL "黑名單來源 $SOURCE_ID 試圖再次存取 $RESOURCE，已攔截。"
    exit 1
fi

echo "[NEUXA-FIREWALL] 正在請求存取: $RESOURCE (層級: $ACCESS_LEVEL | 來源: $SOURCE_ID)"

case "$ACCESS_LEVEL" in
  "ZONE_0") echo "✅ 許可：區外白帶區 (Public)。" ;;
  "ZONE_1") echo "🟡 驗證：公民驗證區。" ;;
  "ZONE_2") echo "🚨 警告：司令部。請輸入大師口令！" ;;
  "VAULT")
    echo "❌ 拒絕：專利鎖櫃。物理隔離！"
    ./scripts/neuxa-logger.sh RISK CRITICAL "來源 $SOURCE_ID 試圖存取專利鎖櫃，觸發計次。"
    # 這裡可以加入自動觸發 blacklist 的邏輯
    exit 1
    ;;
esac
