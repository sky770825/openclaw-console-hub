#!/bin/bash
# OpenClaw Checkpoint 系統 - 任務執行保護機制
# 用途：在執行關鍵步驟前建立檢查點，失敗時可回滾

set -eo pipefail

# ============ 熔斷器 ============
STATE_FILE="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/automation/state.json"
LOGS_DIR="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/automation/logs"
SCRIPT_NAME="checkpoint"
mkdir -p "$(dirname "$STATE_FILE")" "$LOGS_DIR"
[ ! -f "$STATE_FILE" ] && echo '{"automations":{},"emergencyStop":false,"dailyBudget":5,"maxConsecutiveErrors":5}' > "$STATE_FILE"

MAX_ERRORS=$(jq -r '.maxConsecutiveErrors // 5' "$STATE_FILE" 2>/dev/null || echo "5")
if jq -e '.emergencyStop == true' "$STATE_FILE" &>/dev/null; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${SCRIPT_NAME}] 🚨 緊急停止中，跳過執行" >> "$LOGS_DIR/automation.log"
  exit 0
fi
if ! jq -e ".automations.${SCRIPT_NAME}.enabled == true" "$STATE_FILE" &>/dev/null; then
  exit 0
fi
errors=$(jq -r ".automations.${SCRIPT_NAME}.errors // 0" "$STATE_FILE" 2>/dev/null || echo "0")
if [ "${errors:-0}" -ge "${MAX_ERRORS:-5}" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${SCRIPT_NAME}] 🔴 連續錯誤 ${errors} 次，已熔斷" >> "$LOGS_DIR/automation.log"
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
# ============ 熔斷器結束 ============

OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
CHECKPOINT_DIR="$HOME/Desktop/小蔡/檢查點"
WORKSPACE="${OPENCLAW_WORKSPACE:-$OPENCLAW_HOME/workspace}"

# 顏色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 初始化檢查點目錄
init_checkpoint() {
    mkdir -p "$CHECKPOINT_DIR"
    mkdir -p "$CHECKPOINT_DIR/.history"
    echo "{\"checkpoints\": [], \"last_checkpoint\": null}" > "$CHECKPOINT_DIR/checkpoint-db.json"
}

# 建立檢查點
create_checkpoint() {
    local task_name="${1:-未命名任務}"
    local step_name="${2:-步驟}"
    local timestamp=$(date +%m/%d_%H:%M)
    local checkpoint_id="${timestamp}-${step_name}"
    local checkpoint_path="$CHECKPOINT_DIR/$checkpoint_id"
    
    mkdir -p "$checkpoint_path"
    
    echo -e "${BLUE}[CHECKPOINT]${NC} 建立檢查點: $checkpoint_id"
    
    # 備份關鍵檔案
    local temp_dir=$(mktemp -d)
    
    # 1. config/
    if [[ -d "$OPENCLAW_HOME/config" ]]; then
        cp -r "$OPENCLAW_HOME/config" "$temp_dir/" 2>/dev/null
        echo -e "  ${GREEN}✓${NC} config"
    fi
    
    # 2. openclaw.json
    if [[ -f "$OPENCLAW_HOME/openclaw.json" ]]; then
        cp "$OPENCLAW_HOME/openclaw.json" "$temp_dir/" 2>/dev/null
        echo -e "  ${GREEN}✓${NC} openclaw.json"
    fi
    
    # 3. memory/
    if [[ -d "$OPENCLAW_HOME/memory" ]]; then
        cp -r "$OPENCLAW_HOME/memory" "$temp_dir/" 2>/dev/null
        echo -e "  ${GREEN}✓${NC} memory"
    fi
    
    # 4. 當前工作目錄的關鍵檔案
    if [[ -n "${CHECKPOINT_TARGET:-}" && -d "$CHECKPOINT_TARGET" ]]; then
        cp -r "$CHECKPOINT_TARGET" "$temp_dir/target/" 2>/dev/null
        echo -e "  ${GREEN}✓${NC} 目標資料夾"
    fi
    
    # 打包
    tar czf "$checkpoint_path/backup.tar.gz" -C "$temp_dir" . 2>/dev/null
    rm -rf "$temp_dir"
    
    # 建立元數據
    cat > "$checkpoint_path/meta.json" <<EOF
{
  "id": "$checkpoint_id",
  "task_name": "$task_name",
  "step_name": "$step_name",
  "timestamp": "$(date -Iseconds)",
  "created_by": "${USER:-unknown}",
  "auto_created": ${AUTO_CHECKPOINT:-false}
}
EOF
    
    # 更新資料庫
    if [[ -f "$CHECKPOINT_DIR/checkpoint-db.json" ]]; then
        local db=$(cat "$CHECKPOINT_DIR/checkpoint-db.json")
        local new_db=$(echo "$db" | jq --arg id "$checkpoint_id" \
            --arg task "$task_name" \
            --arg step "$step_name" \
            --arg time "$(date -Iseconds)" \
            '.checkpoints += [{"id": $id, "task": $task, "step": $step, "time": $time}] | .last_checkpoint = $id')
        echo "$new_db" > "$CHECKPOINT_DIR/checkpoint-db.json"
    fi
    
    # 設定為當前檢查點
    echo "$checkpoint_id" > "$CHECKPOINT_DIR/.current"
    
    echo -e "${GREEN}[SUCCESS]${NC} 檢查點建立完成: $checkpoint_id"
    echo "$checkpoint_id"
}

# 回滾到上一個檢查點
rollback_checkpoint() {
    local checkpoint_id="${1:-}"
    
    # 如果沒有指定，使用最近的檢查點
    if [[ -z "$checkpoint_id" ]]; then
        if [[ -f "$CHECKPOINT_DIR/.current" ]]; then
            checkpoint_id=$(cat "$CHECKPOINT_DIR/.current")
        else
            echo -e "${RED}[ERROR]${NC} 沒有可用的檢查點"
            return 1
        fi
    fi
    
    local checkpoint_path="$CHECKPOINT_DIR/$checkpoint_id"
    
    if [[ ! -d "$checkpoint_path" ]]; then
        echo -e "${RED}[ERROR]${NC} 找不到檢查點: $checkpoint_id"
        return 1
    fi
    
    echo -e "${YELLOW}[ROLLBACK]${NC} 準備回滾到: $checkpoint_id"
    echo ""
    
    # 顯示檢查點資訊
    if [[ -f "$checkpoint_path/meta.json" ]]; then
        echo "  任務: $(jq -r '.task_name' "$checkpoint_path/meta.json")"
        echo "  步驟: $(jq -r '.step_name' "$checkpoint_path/meta.json")"
        echo "  時間: $(jq -r '.timestamp' "$checkpoint_path/meta.json")"
        echo ""
    fi
    
    read -p "確認回滾? 這會覆蓋目前狀態 (yes/no): " confirm
    
    if [[ "$confirm" != "yes" ]]; then
        echo "已取消"
        return 0
    fi
    
    echo ""
    echo "⏳ 正在回滾..."
    
    # 解壓並恢復
    local temp_dir=$(mktemp -d)
    tar xzf "$checkpoint_path/backup.tar.gz" -C "$temp_dir" 2>/dev/null
    
    [[ -d "$temp_dir/config" ]] && cp -r "$temp_dir/config"/* "$OPENCLAW_HOME/config/" 2>/dev/null && echo -e "  ${GREEN}✓${NC} config 已恢復"
    [[ -f "$temp_dir/openclaw.json" ]] && cp "$temp_dir/openclaw.json" "$OPENCLAW_HOME/" 2>/dev/null && echo -e "  ${GREEN}✓${NC} openclaw.json 已恢復"
    [[ -d "$temp_dir/memory" ]] && cp -r "$temp_dir/memory"/* "$OPENCLAW_HOME/memory/" 2>/dev/null && echo -e "  ${GREEN}✓${NC} memory 已恢復"
    
    if [[ -d "$temp_dir/target" && -n "${CHECKPOINT_TARGET:-}" ]]; then
        cp -r "$temp_dir/target"/* "$CHECKPOINT_TARGET/" 2>/dev/null && echo -e "  ${GREEN}✓${NC} 目標資料夾已恢復"
    fi
    
    rm -rf "$temp_dir"
    
    # 記錄回滾事件
    echo "$(date -Iseconds) ROLLBACK: $checkpoint_id" >> "$CHECKPOINT_DIR/.history/rollback.log"
    
    echo ""
    echo -e "${GREEN}[SUCCESS]${NC} 回滾完成！"
}

# 列出所有檢查點
list_checkpoints() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}                    📋 檢查點列表                              ${CYAN}║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    if [[ ! -d "$CHECKPOINT_DIR" ]] || [[ -z "$(ls -A "$CHECKPOINT_DIR" 2>/dev/null | grep -v 'checkpoint-db.json' | grep -v '.history' | grep -v '.current')" ]]; then
        echo "  尚無檢查點"
        return
    fi
    
    local current=""
    [[ -f "$CHECKPOINT_DIR/.current" ]] && current=$(cat "$CHECKPOINT_DIR/.current")
    
    for d in "$CHECKPOINT_DIR"/*/; do
        [[ -d "$d" ]] || continue
        [[ "$(basename "$d")" == ".history" ]] && continue
        
        local id=$(basename "$d")
        local marker=""
        [[ "$id" == "$current" ]] && marker=" ${YELLOW}← 當前${NC}"
        
        if [[ -f "$d/meta.json" ]]; then
            local task=$(jq -r '.task_name' "$d/meta.json" 2>/dev/null)
            local step=$(jq -r '.step_name' "$d/meta.json" 2>/dev/null)
            local time=$(jq -r '.timestamp' "$d/meta.json" 2>/dev/null | cut -d'T' -f1)
            echo -e "  • ${id}${marker}"
            echo "    任務: $task | 步驟: $step | $time"
        else
            echo "  • $id"
        fi
    done
    
    echo ""
}

# 清理舊檢查點（保留最近 10 個）
cleanup_checkpoints() {
    echo "清理舊檢查點..."
    
    local count=$(find "$CHECKPOINT_DIR" -mindepth 1 -maxdepth 1 -type d ! -name '.history' | wc -l)
    
    if [[ $count -gt 10 ]]; then
        find "$CHECKPOINT_DIR" -mindepth 1 -maxdepth 1 -type d ! -name '.history' -printf '%T@ %p\n' | \
            sort -n | head -n -10 | cut -d' ' -f2- | \
            while read dir; do
                echo "  移除: $(basename "$dir")"
                rm -rf "$dir"
            done
        echo "清理完成，保留最近 10 個檢查點"
    else
        echo "檢查點數量 ($count) 未超過限制，無需清理"
    fi
}

# 使用說明
show_help() {
    cat <<EOF
OpenClaw Checkpoint 系統 - 任務執行保護

用法:
  $0 create <任務名稱> [步驟名稱]  - 建立檢查點
  $0 rollback [檢查點ID]            - 回滾到檢查點
  $0 list                           - 列出所有檢查點
  $0 cleanup                        - 清理舊檢查點
  $0 help                           - 顯示說明

環境變數:
  CHECKPOINT_TARGET    - 額外要備份的目標資料夾
  AUTO_CHECKPOINT=true - 標記為自動建立的檢查點

範例:
  $0 create "資料遷移" "匯入前"
  $0 rollback
  $0 list

檢查點位置: ~/Desktop/小蔡/檢查點/
EOF
}

# 初始化
[[ ! -d "$CHECKPOINT_DIR" ]] && init_checkpoint

# 主入口
case "${1:-}" in
    create)
        create_checkpoint "$2" "$3"
        ;;
    rollback)
        rollback_checkpoint "$2"
        ;;
    list)
        list_checkpoints
        ;;
    cleanup)
        cleanup_checkpoints
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        show_help
        exit 1
        ;;
esac
