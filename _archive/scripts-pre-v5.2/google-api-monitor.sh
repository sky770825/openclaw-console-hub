#!/bin/zsh
# Google API 用量監控器
# 每次呼叫時更新用量，超額時警告或停用

CONFIG_DIR="${HOME}/.openclaw/secure"
USAGE_FILE="$CONFIG_DIR/google-api-usage"
BUDGET_FILE="$CONFIG_DIR/google-api-budget"
KEY_FILE="$CONFIG_DIR/google-api.key"

# 檢查 Key 是否存在
[[ ! -f "$KEY_FILE" ]] && exit 0

# 讀取目前用量
usage=$(cat "$USAGE_FILE" 2>/dev/null || echo "0")
budget=$(cat "$BUDGET_FILE" 2>/dev/null || echo "300")

# 計算比例
percentage=$(( usage * 100 / budget ))

# 檢查是否超額
if [[ $percentage -ge 100 ]]; then
    echo "🚫 Google API 已達預算上限 ($budget USD)"
    echo "請到 Google Cloud Console 確認用量或增加預算"
    exit 1
elif [[ $percentage -ge 90 ]]; then
    echo "⚠️ 警告：Google API 用量已達 ${percentage}% (${usage}/${budget} USD)"
fi

# 這裡可以加上實際用量查詢（需要 Google Cloud Billing API）
# 目前用預估值，每次呼叫約 $0.001-0.01
