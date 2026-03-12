#!/usr/bin/env bash
# 任務完成後處理器 - 通用記憶記錄接口
# 供所有 Autopilot 任務使用，確保每個任務都有記憶記錄

set -euo pipefail

WORKSPACE="${HOME}/.openclaw/workspace"
LOG_SCRIPT="${WORKSPACE}/scripts/log-autopilot-task.sh"
API_URL="http://localhost:3011/api/openclaw"

# 顏色輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ ${NC}$1" >&2
}

log_success() {
    echo -e "${GREEN}✅ ${NC}$1" >&2
}

log_error() {
    echo -e "${RED}❌ ${NC}$1" >&2
}

# ============================================================================
# 使用方式
# ============================================================================

show_usage() {
    cat <<EOF
任務完成後處理器 - 通用記憶記錄接口

用法:
  $0 <任務名稱> <狀態> <摘要> [選項]

參數:
  任務名稱    - 任務的簡短描述（如：向量索引、Telegram Bot 修復）
  狀態       - 任務執行狀態（成功、失敗、警告、完成）
  摘要       - 任務執行的詳細摘要

選項:
  --task-id <ID>        - TaskBoard 任務 ID（可選）
  --assignee <執行者>   - 執行者標識（如：Gemini Flash 2.5、n8n、Claude）
  --update-api          - 更新 TaskBoard API 狀態

範例:
  # 基本用法
  $0 "向量索引" "成功" "檔案:223 | Chunks:3378 | 耗時:45s"

  # 帶任務 ID
  $0 "資料清理" "完成" "清除 500 個過期檔案" --task-id task-123

  # 完整範例（n8n 使用）
  $0 "每日摘要生成" "成功" "生成摘要並發送到 Telegram" \\
     --task-id task-456 \\
     --assignee "n8n workflow" \\
     --update-api
EOF
}

# ============================================================================
# 參數解析
# ============================================================================

# 檢查參數數量
if [[ $# -lt 3 ]]; then
    show_usage
    exit 1
fi

TASK_NAME="$1"
STATUS="$2"
SUMMARY="$3"
shift 3

# 選項預設值
TASK_ID=""
ASSIGNEE=""
UPDATE_API=false

# 解析選項
while [[ $# -gt 0 ]]; do
    case "$1" in
        --task-id)
            TASK_ID="$2"
            shift 2
            ;;
        --assignee)
            ASSIGNEE="$2"
            shift 2
            ;;
        --update-api)
            UPDATE_API=true
            shift
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        *)
            log_error "未知選項: $1"
            show_usage
            exit 1
            ;;
    esac
done

# ============================================================================
# 記憶記錄
# ============================================================================

record_memory() {
    log_info "記錄任務記憶..."

    # 調用通用日誌腳本
    if "$LOG_SCRIPT" "$TASK_NAME" "$STATUS" "$SUMMARY"; then
        log_success "記憶記錄完成"
        return 0
    else
        log_error "記憶記錄失敗"
        return 1
    fi
}

# ============================================================================
# 更新 API 狀態
# ============================================================================

update_api_status() {
    if [[ -z "$TASK_ID" ]]; then
        log_info "跳過 API 更新（無任務 ID）"
        return 0
    fi

    log_info "更新 TaskBoard API 狀態..."

    # 將狀態映射到 API 格式
    local api_status
    case "$STATUS" in
        "成功"|"完成")
            api_status="completed"
            ;;
        "失敗")
            api_status="failed"
            ;;
        "警告")
            api_status="completed_with_warnings"
            ;;
        *)
            api_status="completed"
            ;;
    esac

    # 更新任務狀態
    local response
    response=$(curl -s -X PATCH "${API_URL}/tasks/${TASK_ID}" \
        -H "Content-Type: application/json" \
        -d "{\"status\":\"${api_status}\",\"result\":\"${SUMMARY}\"}" 2>&1)

    if [[ $? -eq 0 ]]; then
        log_success "API 狀態已更新"
    else
        log_error "API 更新失敗: $response"
        # 不中斷流程，繼續執行
    fi
}

# ============================================================================
# 增強摘要（添加執行者資訊）
# ============================================================================

enhance_summary() {
    local enhanced="$SUMMARY"

    # 如果有執行者，附加到摘要
    if [[ -n "$ASSIGNEE" ]]; then
        enhanced="${enhanced} | 執行者:${ASSIGNEE}"
    fi

    # 如果有任務 ID，附加到摘要
    if [[ -n "$TASK_ID" ]]; then
        enhanced="${enhanced} | ID:${TASK_ID}"
    fi

    echo "$enhanced"
}

# ============================================================================
# 主程式
# ============================================================================

main() {
    log_info "處理任務完成: ${TASK_NAME}"

    # 增強摘要
    SUMMARY=$(enhance_summary)

    # 記錄記憶（最重要）
    if ! record_memory; then
        log_error "任務記憶記錄失敗，但繼續執行"
    fi

    # 更新 API（如果需要）
    if [[ "$UPDATE_API" == true ]]; then
        update_api_status
    fi

    log_success "任務處理完成: ${TASK_NAME}"

    # 輸出簡潔摘要（供調用者使用）
    echo "✅ ${TASK_NAME} - ${STATUS}"
}

main "$@"
