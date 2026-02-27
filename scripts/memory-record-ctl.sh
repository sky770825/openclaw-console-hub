#!/usr/bin/env bash
# 記憶記錄服務器控制腳本

set -euo pipefail

WORKSPACE="${HOME}/.openclaw/workspace"
SERVER_SCRIPT="${WORKSPACE}/scripts/memory-record-server.py"
PID_FILE="${HOME}/.openclaw/memory-record-server.pid"
LOG_FILE="${HOME}/.openclaw/logs/memory-record-server.log"
PORT=8765

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

log_warn() {
    echo -e "${YELLOW}⚠️  ${NC}$1"
}

# ============================================================================
# 檢查服務器狀態
# ============================================================================

check_status() {
    if [[ -f "$PID_FILE" ]]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0  # 運行中
        else
            rm -f "$PID_FILE"
            return 1  # 已停止
        fi
    else
        return 1  # 已停止
    fi
}

# ============================================================================
# 啟動服務器
# ============================================================================

start_server() {
    log_info "啟動記憶記錄服務器..."

    # 檢查是否已運行
    if check_status; then
        log_warn "服務器已在運行中 (PID: $(cat "$PID_FILE"))"
        return 0
    fi

    # 確保日誌目錄存在
    mkdir -p "$(dirname "$LOG_FILE")"

    # 啟動服務器（後台運行）
    nohup python3 "$SERVER_SCRIPT" "$PORT" > "$LOG_FILE" 2>&1 &
    local pid=$!

    # 保存 PID
    echo "$pid" > "$PID_FILE"

    # 等待服務器啟動
    sleep 1

    # 驗證啟動
    if check_status; then
        log_success "服務器已啟動 (PID: $pid)"
        log_info "端點: http://localhost:${PORT}/record"
        log_info "日誌: $LOG_FILE"
    else
        log_error "服務器啟動失敗"
        log_info "請檢查日誌: $LOG_FILE"
        return 1
    fi
}

# ============================================================================
# 停止服務器
# ============================================================================

stop_server() {
    log_info "停止記憶記錄服務器..."

    if ! check_status; then
        log_warn "服務器未運行"
        return 0
    fi

    local pid=$(cat "$PID_FILE")

    # 發送 SIGTERM
    if kill "$pid" 2>/dev/null; then
        log_success "服務器已停止 (PID: $pid)"
        rm -f "$PID_FILE"
    else
        log_error "無法停止服務器 (PID: $pid)"
        return 1
    fi
}

# ============================================================================
# 重啟服務器
# ============================================================================

restart_server() {
    log_info "重啟記憶記錄服務器..."
    stop_server
    sleep 1
    start_server
}

# ============================================================================
# 顯示狀態
# ============================================================================

show_status() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  記憶記錄服務器狀態"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    if check_status; then
        local pid=$(cat "$PID_FILE")
        log_success "狀態: 運行中"
        echo "  PID: $pid"
        echo "  端口: $PORT"
        echo "  端點: http://localhost:${PORT}/record"
        echo "  日誌: $LOG_FILE"

        # 檢查端口是否可達
        if curl -s "http://localhost:${PORT}/health" > /dev/null 2>&1; then
            log_success "健康檢查: 正常"
        else
            log_warn "健康檢查: 失敗（服務可能還在啟動中）"
        fi
    else
        log_warn "狀態: 已停止"
    fi

    echo ""
}

# ============================================================================
# 查看日誌
# ============================================================================

show_logs() {
    local lines="${1:-20}"

    if [[ ! -f "$LOG_FILE" ]]; then
        log_warn "日誌檔案不存在: $LOG_FILE"
        return 0
    fi

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  最近 $lines 行日誌"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    tail -n "$lines" "$LOG_FILE"
}

# ============================================================================
# 測試端點
# ============================================================================

test_endpoint() {
    log_info "測試記憶記錄端點..."

    if ! check_status; then
        log_error "服務器未運行，請先啟動服務器"
        return 1
    fi

    # 測試健康檢查
    log_info "測試健康檢查..."
    if curl -s "http://localhost:${PORT}/health" | jq . 2>/dev/null; then
        log_success "健康檢查: 通過"
    else
        log_error "健康檢查: 失敗"
        return 1
    fi

    echo ""

    # 測試記憶記錄
    log_info "測試記憶記錄..."
    local test_data='{
  "taskName": "測試任務",
  "status": "成功",
  "summary": "這是一個測試記錄",
  "assignee": "測試腳本"
}'

    echo "發送測試數據:"
    echo "$test_data" | jq .
    echo ""

    local response=$(curl -s -X POST "http://localhost:${PORT}/record" \
        -H "Content-Type: application/json" \
        -d "$test_data")

    echo "服務器響應:"
    echo "$response" | jq .
    echo ""

    if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
        log_success "記憶記錄: 成功"
    else
        log_error "記憶記錄: 失敗"
        return 1
    fi
}

# ============================================================================
# 使用說明
# ============================================================================

show_usage() {
    cat <<EOF
記憶記錄服務器控制腳本

用法:
  $0 <command> [options]

Commands:
  start       啟動服務器
  stop        停止服務器
  restart     重啟服務器
  status      顯示狀態
  logs        查看日誌（預設 20 行）
  logs <N>    查看最近 N 行日誌
  test        測試端點

範例:
  $0 start                # 啟動服務器
  $0 status               # 查看狀態
  $0 logs 50              # 查看最近 50 行日誌
  $0 test                 # 測試端點
  $0 stop                 # 停止服務器
EOF
}

# ============================================================================
# 主程式
# ============================================================================

main() {
    case "${1:-}" in
        start)
            start_server
            ;;
        stop)
            stop_server
            ;;
        restart)
            restart_server
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs "${2:-20}"
            ;;
        test)
            test_endpoint
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            show_usage
            exit 1
            ;;
    esac
}

main "$@"
