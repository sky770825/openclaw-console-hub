#!/usr/bin/env bash
# 完成當前 Autopilot 任務 - 便捷腳本
# 供小蔡在完成任務後快速記錄記憶

set -euo pipefail

WORKSPACE="${HOME}/.openclaw/workspace"
RESULT_DIR="${WORKSPACE}/memory/autopilot-results"
CURRENT_TASK_FILE="${RESULT_DIR}/current-task.json"
COMPLETION_HANDLER="${WORKSPACE}/scripts/task-completion-handler.sh"

# 顏色輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

log_success() {
    echo -e "${GREEN}✅ ${NC}$1"
}

log_error() {
    echo -e "${RED}❌ ${NC}$1"
}

# ============================================================================
# 檢查當前任務
# ============================================================================

check_current_task() {
    if [[ ! -f "$CURRENT_TASK_FILE" ]]; then
        log_error "沒有找到當前任務檔案"
        log_info "檔案位置: $CURRENT_TASK_FILE"
        exit 1
    fi

    # 讀取任務資訊
    TASK_ID=$(jq -r '.taskId // ""' "$CURRENT_TASK_FILE")
    TASK_NAME=$(jq -r '.name // "未知任務"' "$CURRENT_TASK_FILE")
    TASK_DESC=$(jq -r '.description // ""' "$CURRENT_TASK_FILE")

    log_info "當前任務: ${TASK_NAME}"
    if [[ -n "$TASK_ID" ]]; then
        log_info "任務 ID: ${TASK_ID}"
    fi
    if [[ -n "$TASK_DESC" ]]; then
        log_info "描述: ${TASK_DESC}"
    fi
}

# ============================================================================
# 使用方式
# ============================================================================

show_usage() {
    cat <<EOF
完成當前 Autopilot 任務 - 便捷腳本

用法:
  $0 <狀態> <摘要>

  或互動模式:
  $0

參數:
  狀態    - 任務執行狀態（成功、失敗、警告、完成）
  摘要    - 任務執行的詳細摘要

範例:
  # 非互動模式
  $0 "成功" "清除了 500 個過期檔案，釋放 2.3GB 空間"

  # 互動模式（會提示輸入）
  $0
EOF
}

# ============================================================================
# 互動模式
# ============================================================================

interactive_mode() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  完成當前 Autopilot 任務"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # 顯示當前任務
    check_current_task
    echo ""

    # 輸入狀態
    echo "請選擇任務狀態:"
    echo "  1) 成功"
    echo "  2) 完成"
    echo "  3) 失敗"
    echo "  4) 警告"
    echo ""
    read -p "選擇 [1-4]: " status_choice

    case "$status_choice" in
        1) STATUS="成功" ;;
        2) STATUS="完成" ;;
        3) STATUS="失敗" ;;
        4) STATUS="警告" ;;
        *)
            log_error "無效選擇"
            exit 1
            ;;
    esac

    echo ""
    # 輸入摘要
    echo "請輸入任務摘要（簡短描述執行結果）:"
    read -p "> " SUMMARY

    if [[ -z "$SUMMARY" ]]; then
        log_error "摘要不能為空"
        exit 1
    fi

    # 確認
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  確認資訊"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "任務: ${TASK_NAME}"
    echo "狀態: ${STATUS}"
    echo "摘要: ${SUMMARY}"
    echo ""
    read -p "確認記錄？[Y/n] " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ -n $REPLY ]]; then
        log_info "已取消"
        exit 0
    fi
}

# ============================================================================
# 主程式
# ============================================================================

main() {
    # 檢查是否有參數
    if [[ $# -eq 0 ]]; then
        # 互動模式
        interactive_mode
    elif [[ $# -eq 2 ]]; then
        # 非互動模式
        check_current_task
        STATUS="$1"
        SUMMARY="$2"
    elif [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
        show_usage
        exit 0
    else
        show_usage
        exit 1
    fi

    # 調用完成處理器
    log_info "記錄任務完成..."

    local handler_args=(
        "$TASK_NAME"
        "$STATUS"
        "$SUMMARY"
    )

    # 如果有任務 ID，添加參數
    if [[ -n "$TASK_ID" ]]; then
        handler_args+=("--task-id" "$TASK_ID")
        handler_args+=("--update-api")
    fi

    # 執行
    if "$COMPLETION_HANDLER" "${handler_args[@]}"; then
        log_success "任務完成記錄成功"

        # 清除當前任務檔案
        rm -f "$CURRENT_TASK_FILE"
        log_info "已清除當前任務檔案"
    else
        log_error "任務完成記錄失敗"
        exit 1
    fi
}

main "$@"
