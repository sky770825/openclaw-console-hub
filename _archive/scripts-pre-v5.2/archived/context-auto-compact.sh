#!/bin/bash
set -e
################################################################################
# context-auto-compact.sh - Context 自動壓縮管理工具
# 
# 功能：
#   - 檢查當前 session 的 context 使用率
#   - 使用率 >70% 時自動執行 checkpoint
#   - 使用率 >85% 時發出強制警告
#   - 可被 cron job 或 heartbeat 調用
#
# 用法：
#   ./context-auto-compact.sh [--session SESSION_KEY] [--dry-run]
#
# 選項：
#   --session SESSION_KEY    指定要檢查的 session (預設: agent:main:main)
#   --dry-run               只檢查不執行動作
#   --help                  顯示此說明
#
# 作者：執行員 D
# 日期：2026-02-12
################################################################################

set -euo pipefail

# === 設定 ===
WORKSPACE="$HOME/.openclaw/workspace"
CHECKPOINT_SCRIPT="$WORKSPACE/scripts/checkpoint.sh"
LOG_FILE="$WORKSPACE/memory/context-auto-compact.log"
DEFAULT_SESSION="agent:main:main"
DRY_RUN=false

# 閾值
THRESHOLD_CHECKPOINT=70
THRESHOLD_WARNING=85

# === 函數 ===

show_help() {
    head -n 24 "$0" | tail -n +2 | sed 's/^# //; s/^#//'
    exit 0
}

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# 獲取 session 的 context 使用率
get_context_usage() {
    local session_key="$1"
    local json_data
    
    json_data=$(openclaw sessions status --json 2>/dev/null || echo "{}")
    
    # 解析 JSON 獲取 totalTokens 和 contextTokens
    local total=$(echo "$json_data" | jq -r ".sessions[] | select(.key == \"$session_key\") | .totalTokens // 0")
    local context=$(echo "$json_data" | jq -r ".sessions[] | select(.key == \"$session_key\") | .contextTokens // 0")
    
    if [[ "$total" == "0" || "$context" == "0" ]]; then
        echo "0"
        return
    fi
    
    # 計算使用率百分比
    local usage=$(awk "BEGIN {printf \"%.2f\", ($total / $context) * 100}")
    echo "$usage"
}

# 執行 checkpoint
run_checkpoint() {
    if [[ ! -f "$CHECKPOINT_SCRIPT" ]]; then
        log "❌ 錯誤：checkpoint.sh 不存在於 $CHECKPOINT_SCRIPT"
        return 1
    fi
    
    log "🔄 執行 checkpoint..."
    bash "$CHECKPOINT_SCRIPT"
}

# 發送警告
send_warning() {
    local usage="$1"
    log "⚠️  警告：Context 使用率達到 ${usage}%！"
    log "⚠️  強烈建議執行 /new 開始新會話"
    
    # 寫入警告檔案
    local warning_file="$WORKSPACE/memory/CONTEXT_WARNING.txt"
    cat > "$warning_file" <<EOF
========================================
⚠️  CONTEXT 使用率警告 ⚠️
========================================
時間：$(date '+%Y-%m-%d %H:%M:%S')
使用率：${usage}%
狀態：超過 ${THRESHOLD_WARNING}% 閾值

建議動作：
1. 立即執行 /new 開始新會話
2. 檢查 NOW.md 確保狀態已儲存
3. 檢視最近的 checkpoint

========================================
EOF
    
    log "📝 警告已寫入 $warning_file"
}

# === 主程式 ===

# 解析參數
SESSION_KEY="$DEFAULT_SESSION"
while [[ $# -gt 0 ]]; do
    case $1 in
        --session)
            SESSION_KEY="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help|-h)
            show_help
            ;;
        *)
            echo "未知選項: $1"
            echo "使用 --help 查看說明"
            exit 1
            ;;
    esac
done

# 確保目錄存在
mkdir -p "$WORKSPACE/memory"

# 獲取 context 使用率
log "🔍 檢查 session: $SESSION_KEY"
USAGE=$(get_context_usage "$SESSION_KEY")

if [[ "$USAGE" == "0" ]]; then
    log "❌ 無法獲取 session 資訊"
    exit 1
fi

log "📊 Context 使用率: ${USAGE}%"

# 判斷是否需要動作
USAGE_INT=$(echo "$USAGE" | cut -d. -f1)

if [[ $USAGE_INT -ge $THRESHOLD_WARNING ]]; then
    log "🚨 使用率超過 ${THRESHOLD_WARNING}%！"
    if [[ "$DRY_RUN" == "false" ]]; then
        send_warning "$USAGE"
        run_checkpoint
    else
        log "🔵 [DRY-RUN] 將會發送警告並執行 checkpoint"
    fi
elif [[ $USAGE_INT -ge $THRESHOLD_CHECKPOINT ]]; then
    log "⚡ 使用率超過 ${THRESHOLD_CHECKPOINT}%"
    if [[ "$DRY_RUN" == "false" ]]; then
        run_checkpoint
    else
        log "🔵 [DRY-RUN] 將會執行 checkpoint"
    fi
else
    log "✅ Context 使用率正常"
fi

log "完成檢查"
