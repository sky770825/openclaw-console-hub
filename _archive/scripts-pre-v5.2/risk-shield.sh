#!/usr/bin/env bash
# NEUXA 紫燈風險調度中間件 (Risk Shield)
# 用法: ./risk-shield.sh "任務內容"

TASK_CONTENT="$1"
RISK_LEVEL="low"

# 1. 關鍵字過濾 (紫燈/紅燈特徵)
if echo "$TASK_CONTENT" | grep -iE "rm -rf|format|delete database|truncate|drop table|unset|system-reset|config.apply" > /dev/null; then
    RISK_LEVEL="critical" # 紫燈
elif echo "$TASK_CONTENT" | grep -iE "git push --force|docker stop|kill|restart|git checkout" > /dev/null; then
    RISK_LEVEL="high"     # 紅燈
elif echo "$TASK_CONTENT" | grep -iE "update|install|git commit|npm install" > /dev/null; then
    RISK_LEVEL="medium"   # 黃燈
fi

# 2. 輸出結果與自動攔截
echo "Detected Risk Level: $RISK_LEVEL"

if [ "$RISK_LEVEL" == "critical" ]; then
    echo "🚨 [PURPLE ALERT] Critical risk detected! Operation intercepted."
    # 觸發 Telegram 警報
    bash scripts/honeypot-alert.sh "[Critical] 紫燈風險攔截: $TASK_CONTENT" 2>/dev/null || true
    exit 1
elif [ "$RISK_LEVEL" == "high" ]; then
    echo "🔴 [RED ALERT] High risk operation. Requires manual approval."
    exit 2
fi

exit 0
