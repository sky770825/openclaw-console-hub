#!/bin/zsh
# proactive-monitor.sh - 主動式監控與自修復調度器
# 整合原本的 self-heal.sh 與新的智能預警機制

WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"
SELF_HEAL_SCRIPT="$WORKSPACE/scripts/self-heal.sh"
SMART_NOTIFIER="$WORKSPACE/scripts/self-healing/smart-notifier.sh"

# 確保依賴存在
if [[ ! -f "$SELF_HEAL_SCRIPT" ]]; then
    echo "Error: self-heal.sh not found"
    exit 1
fi

# 1. 執行診斷 (不修復)
echo "🔍 啟動主動式診斷..."
DIAG_RESULT=$($SELF_HEAL_SCRIPT check)
EXIT_CODE=$?

# 2. 如果有問題，嘗試自動修復
if [[ $EXIT_CODE -ne 0 ]]; then
    echo "❌ 發現問題，嘗試自動修復..."
    
    # 執行修復
    FIX_RESULT=$($SELF_HEAL_SCRIPT fix)
    
    # 再次檢查
    RECHECK_RESULT=$($SELF_HEAL_SCRIPT check)
    RECHECK_CODE=$?
    
    if [[ $RECHECK_CODE -eq 0 ]]; then
        # 修復成功
        $SMART_NOTIFIER "系統自癒成功" "INFO" "診斷發現問題但已自動修復。" "$FIX_RESULT"
    else
        # 修復失敗，發送高級別預警
        $SMART_NOTIFIER "系統自癒失敗" "ERROR" "自動修復嘗試後仍存在問題，需要人工介入。" "$RECHECK_RESULT"
    fi
else
    echo "✅ 系統狀態良好。"
fi
