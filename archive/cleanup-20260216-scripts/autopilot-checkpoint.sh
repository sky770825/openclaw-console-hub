#!/bin/bash
set -e
# OpenClaw Autopilot 檢查點整合
# 用途：讓 Autopilot 在執行任務前自動建立檢查點

OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
CHECKPOINT_SCRIPT="$OPENCLAW_HOME/workspace/scripts/checkpoint.sh"

# 任務執行前的檢查點
task_pre_checkpoint() {
    local task_id="$1"
    local task_name="$2"
    
    # 只有在 AUTO_CHECKPOINT_ENABLED 啟用時才建立
    if [[ "${AUTO_CHECKPOINT_ENABLED:-true}" == "true" ]]; then
        echo "[AUTOPILOT] 任務 $task_id 執行前建立檢查點..."
        AUTO_CHECKPOINT=true "$CHECKPOINT_SCRIPT" create "Autopilot-$task_name" "執行前"
    fi
}

# 任務執行後的狀態更新
task_post_checkpoint() {
    local task_id="$1"
    local status="$2"  # success 或 failed
    
    if [[ "$status" == "failed" && "${AUTO_ROLLBACK_ON_FAILURE:-false}" == "true" ]]; then
        echo "[AUTOPILOT] 任務 $task_id 失敗，自動回滾..."
        "$CHECKPOINT_SCRIPT" rollback
    fi
}

# 步驟級檢查點（在任務內部的關鍵步驟前）
step_checkpoint() {
    local task_id="$1"
    local step_name="$2"
    local task_name="${3:-未知任務}"
    
    if [[ "${AUTO_CHECKPOINT_ENABLED:-true}" == "true" && "${STEP_CHECKPOINT:-false}" == "true" ]]; then
        echo "[AUTOPILOT] 步驟檢查點: $step_name"
        AUTO_CHECKPOINT=true "$CHECKPOINT_SCRIPT" create "Autopilot-$task_name" "$step_name"
    fi
}

# 顯示幫助
show_help() {
    cat <<EOF
Autopilot 檢查點整合模組

環境變數:
  AUTO_CHECKPOINT_ENABLED=true|false    - 是否啟用自動檢查點（預設: true）
  AUTO_ROLLBACK_ON_FAILURE=true|false   - 失敗時是否自動回滾（預設: false）
  STEP_CHECKPOINT=true|false            - 是否啟用步驟級檢查點（預設: false）

函數:
  task_pre_checkpoint <任務ID> <任務名稱>    - 任務開始前
  step_checkpoint <任務ID> <步驟名> <任務名>  - 關鍵步驟前
  task_post_checkpoint <任務ID> <狀態>       - 任務結束後

使用範例:
  source $0
  task_pre_checkpoint "TASK-001" "資料遷移"
  # 執行任務...
  step_checkpoint "TASK-001" "刪除舊檔案前" "資料遷移"
  # 執行刪除...
  task_post_checkpoint "TASK-001" "success"

檢查點位置: ~/Desktop/小蔡/檢查點/
EOF
}

# 如果直接執行，顯示幫助
case "${1:-}" in
    help|--help|-h)
        show_help
        ;;
    *)
        if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
            show_help
        fi
        ;;
esac
