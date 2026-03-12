#!/bin/bash
# openclaw-recovery.sh - OpenClaw 自救腳本 v2.0 (重構版)
#
# 功能: 當 OpenClaw 系統卡住或異常時，提供多層次的恢復機制。
#
# 用法: ./openclaw-recovery.sh [選項]
# 選項:
#   --soft     軟恢復：只清理程序，不重启服務 (預設)
#   --hard     硬恢復：清理 + 重啟所有服務
#   --force    強制恢復：忽略檢查，直接執行所有步驟
#   --log      顯示最後執行的日誌
#   --help     顯示此說明
#
# 環境變數:
#   OPENCLAW_RECOVERY_LOG_DIR 日誌檔案存放目錄 (預設: ~/.openclaw/logs/recovery)

set -euo pipefail

# --- 設定與初始化 ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="${HOME}/.openclaw/workspace"
LOG_DIR="${OPENCLAW_RECOVERY_LOG_DIR:-${HOME}/.openclaw/logs/recovery}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="${LOG_DIR}/recovery_${TIMESTAMP}.log"

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 預設值
MODE="soft"
FORCE=false
SHOW_LOG=false

# --- 函數定義 ---

# 輸出日誌（同時輸出到終端和檔案）
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # 確保日誌目錄存在
    mkdir -p "$LOG_DIR"
    
    # 寫入日誌檔案
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    
    # 輸出到終端（帶顏色）
    case "$level" in
        INFO)  echo -e "${BLUE}[INFO]${NC} $message" ;;
        SUCCESS) echo -e "${GREEN}[SUCCESS]${NC} $message" ;;
        WARN)  echo -e "${YELLOW}[WARN]${NC} $message" ;;
        ERROR) echo -e "${RED}[ERROR]${NC} $message" ;;
        *) echo "[$level] $message" ;;
    esac
}

# 檢查服務狀態
check_service() {
    local url="$1"
    local name="$2"
    
    if curl -s "$url/health" > /dev/null 2>&1; then
        log SUCCESS "$name 服務運行正常"
        return 0
    else
        log WARN "$name 服務未響應"
        return 1
    fi
}

# 清理後台程序
cleanup_processes() {
    log INFO "步驟 1: 清理後台程序..."
    
    local processes=(
        "playwright"
        "Chrome for Testing"
        "agent-browser"
        "Google Chrome.*remote-debugging"
        "tsx watch"
    )
    
    local killed_count=0
    
    for process in "${processes[@]}"; do
        if pkill -f "$process" 2>/dev/null; then
            log INFO "已終止: $process"
            ((killed_count++))
        fi
    done
    
    if [ $killed_count -eq 0 ]; then
        log INFO "沒有需要清理的程序"
    else
        log SUCCESS "已清理 $killed_count 個程序"
    fi
    
    sleep 2
}

# 重啟 Gateway 服務
restart_gateway() {
    log INFO "步驟 2: 檢查並重啟 Gateway 服務..."
    
    if check_service "http://localhost:18789" "Gateway"; then
        if [ "$MODE" = "hard" ] || [ "$FORCE" = true ]; then
            log INFO "強制重啟 Gateway..."
            openclaw gateway restart 2>/dev/null || log WARN "Gateway 重啟失敗"
            sleep 3
        fi
    else
        log INFO "正在重啟 Gateway..."
        openclaw gateway restart 2>/dev/null || log ERROR "Gateway 重啟失敗"
        sleep 3
    fi
}

# 重啟任務板服務
restart_taskboard() {
    log INFO "步驟 3: 檢查並重啟任務板服務..."
    
    if check_service "http://localhost:3011" "任務板"; then
        if [ "$MODE" = "hard" ] || [ "$FORCE" = true ]; then
            log INFO "強制重啟任務板..."
            _restart_taskboard_service
        fi
    else
        log INFO "正在重啟任務板..."
        _restart_taskboard_service
    fi
}

# 實際重啟任務板的函數
_restart_taskboard_service() {
    local server_dir="${HOME}/Desktop/openclaw任務面版設計/server"
    
    # 先終止現有的服務
    pkill -f "tsx watch" 2>/dev/null || true
    pkill -f "port 3011" 2>/dev/null || true
    sleep 1
    
    # 如果目錄存在，重啟服務
    if [ -d "$server_dir" ]; then
        cd "$server_dir"
        PORT=3011 npm run dev > /tmp/openclaw-server.log 2>&1 &
        local pid=$!
        sleep 2
        
        if kill -0 $pid 2>/dev/null; then
            log SUCCESS "任務板服務已重啟 (PID: $pid)"
        else
            log ERROR "任務板服務重啟失敗"
        fi
    else
        log ERROR "任務板目錄不存在: $server_dir"
    fi
}

# 顯示最後的日誌
show_last_log() {
    if [ -f "$LOG_FILE" ]; then
        echo ""
        echo "=== 最後執行日誌 ==="
        tail -n 20 "$LOG_FILE"
    else
        echo "沒有找到日誌檔案"
    fi
}

# 顯示說明
show_help() {
    cat << EOF
OpenClaw 自救腳本 v2.0

用法: $0 [選項]

選項:
  --soft     軟恢復：只清理程序，不重启服務 (預設)
  --hard     硬恢復：清理 + 重啟所有服務
  --force    強制恢復：忽略檢查，直接執行所有步驟
  --log      顯示最後執行的日誌
  --help     顯示此說明

範例:
  $0                    # 軟恢復（預設）
  $0 --hard             # 硬恢復
  $0 --force --hard     # 強制硬恢復
  $0 --log              # 查看最後的日誌

EOF
}

# --- 主程式 ---

# 解析參數
while [[ $# -gt 0 ]]; do
    case $1 in
        --soft)
            MODE="soft"
            shift
            ;;
        --hard)
            MODE="hard"
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --log)
            SHOW_LOG=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo "未知選項: $1"
            show_help
            exit 1
            ;;
    esac
done

# 如果顯示日誌，就直接顯示然後退出
if [ "$SHOW_LOG" = true ]; then
    show_last_log
    exit 0
fi

# ============ 熔斷器 ============
STATE_FILE="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/automation/state.json"
LOGS_DIR_CB="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/automation/logs"
SCRIPT_NAME="recovery"
mkdir -p "$(dirname "$STATE_FILE")" "$LOGS_DIR_CB"
[ ! -f "$STATE_FILE" ] && echo '{"automations":{},"emergencyStop":false,"dailyBudget":5,"maxConsecutiveErrors":5}' > "$STATE_FILE"

MAX_ERRORS=$(jq -r '.maxConsecutiveErrors // 5' "$STATE_FILE" 2>/dev/null || echo "5")
if jq -e '.emergencyStop == true' "$STATE_FILE" &>/dev/null; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${SCRIPT_NAME}] 🚨 緊急停止中，跳過執行" >> "$LOGS_DIR_CB/automation.log"
  exit 0
fi
if ! jq -e ".automations.${SCRIPT_NAME}.enabled == true" "$STATE_FILE" &>/dev/null; then
  exit 0
fi
errors=$(jq -r ".automations.${SCRIPT_NAME}.errors // 0" "$STATE_FILE" 2>/dev/null || echo "0")
if [ "${errors:-0}" -ge "${MAX_ERRORS:-5}" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${SCRIPT_NAME}] 🔴 連續錯誤 ${errors} 次，已熔斷" >> "$LOGS_DIR_CB/automation.log"
  exit 0
fi

update_state_success() {
  local tmp; tmp=$(mktemp)
  jq --arg name "$SCRIPT_NAME" '.automations[$name] = ((.automations[$name] // {}) | .errors = 0 | .lastRun = (now | todate))' "$STATE_FILE" > "$tmp" 2>/dev/null && mv "$tmp" "$STATE_FILE"
}
update_state_failure() {
  local tmp; tmp=$(mktemp)
  jq --arg name "$SCRIPT_NAME" '.automations[$name] = ((.automations[$name] // {}) | .errors = ((.errors // 0) + 1) | .lastRun = (now | todate))' "$STATE_FILE" > "$tmp" 2>/dev/null && mv "$tmp" "$STATE_FILE"
}
trap 'ec=$?; [ $ec -eq 0 ] && update_state_success || update_state_failure; exit $ec' EXIT

# --- 開始恢復流程 ---

log INFO "🚨 OpenClaw 自救程序 v2.0 啟動..."
log INFO "模式: $MODE"
log INFO "日誌檔案: $LOG_FILE"
echo ""

# 執行恢復步驟
cleanup_processes

if [ "$MODE" = "hard" ]; then
    restart_gateway
    restart_taskboard
fi

# 顯示最終狀態
echo ""
log SUCCESS "自救程序完成！"
log INFO "日誌已儲存至: $LOG_FILE"
echo ""
echo "📊 當前狀態:"
check_service "http://localhost:18789" "Gateway"
check_service "http://localhost:3011" "任務板"
echo ""
log INFO "如需查看詳細日誌，請執行: $0 --log"

exit 0
