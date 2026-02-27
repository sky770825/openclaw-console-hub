#!/bin/bash
# run-with-timeout.sh - 通用超時包裝器
# 用法: ./run-with-timeout.sh <秒數> <命令> [參數...]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMEOUT_SEC="${1:-60}"
shift

if [[ $# -eq 0 ]]; then
    echo "用法: $0 <秒數> <命令> [參數...]"
    echo "範例: $0 60 ./autopilot-lean.sh"
    exit 1
fi

LOG_FILE="${OPENCLAW_HOME:-$HOME/.openclaw}/logs/timeout-$(date +%Y%m%d).log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%H:%M:%S')] $1" >> "$LOG_FILE"
}

log "執行: $* (timeout: ${TIMEOUT_SEC}s)"

# macOS 使用 gtimeout，Linux 使用 timeout
if command -v gtimeout &>/dev/null; then
    TIMEOUT_CMD="gtimeout"
elif command -v timeout &>/dev/null; then
    TIMEOUT_CMD="timeout"
else
    log "錯誤: 找不到 timeout 命令 (macOS 請安裝 coreutils: brew install coreutils)"
    exit 1
fi

# 執行並監控
START_TIME=$(date +%s)

if "$TIMEOUT_CMD" "$TIMEOUT_SEC" "$@"; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    log "✅ 成功完成 (用時: ${DURATION}s)"
    exit 0
else
    EXIT_CODE=$?
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    if [[ $EXIT_CODE -eq 124 ]] || [[ $EXIT_CODE -eq 137 ]]; then
        log "⏱️ 超時終止 (${TIMEOUT_SEC}s)"
        echo "警告: 命令執行超過 ${TIMEOUT_SEC} 秒，已強制終止" >&2
    else
        log "❌ 失敗 (exit code: $EXIT_CODE, 用時: ${DURATION}s)"
    fi
    
    exit $EXIT_CODE
fi
