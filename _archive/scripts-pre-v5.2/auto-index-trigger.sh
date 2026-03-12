#!/usr/bin/env bash
# 自動索引觸發器 - 供 Autopilot 使用
# 檢查是否需要重新索引，如果需要則觸發索引任務

set -euo pipefail

WORKSPACE="${HOME}/.openclaw/workspace"
MEMORY_DIR="${WORKSPACE}/memory"
INDEX_LOG="${WORKSPACE}/.auto-skill/index-log.txt"
QDRANT_URL="http://localhost:6333"
COLLECTION="memory_smart_chunks"

# 顏色輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

log_success() {
    echo -e "${GREEN}✅ ${NC}$1"
}

log_warn() {
    echo -e "${YELLOW}⚠️  ${NC}$1"
}

# ============================================================================
# 檢查是否需要索引
# ============================================================================

check_need_indexing() {
    log_info "檢查是否需要重新索引..."

    # 1. 檢查上次索引時間
    if [[ -f "$INDEX_LOG" ]]; then
        LAST_INDEX=$(cat "$INDEX_LOG" | grep "^last_index_time:" | cut -d: -f2- | xargs)
        LAST_INDEX_TS=$(date -j -f "%Y-%m-%d %H:%M:%S" "$LAST_INDEX" "+%s" 2>/dev/null || echo 0)
    else
        LAST_INDEX_TS=0
    fi

    NOW_TS=$(date +%s)
    TIME_DIFF=$((NOW_TS - LAST_INDEX_TS))
    HOURS_SINCE=$((TIME_DIFF / 3600))

    log_info "距離上次索引：${HOURS_SINCE} 小時"

    # 2. 檢查是否有新檔案
    NEW_FILES=$(find "$MEMORY_DIR" -name "*.md" -mmin -60 | wc -l | xargs)
    log_info "最近 1 小時新增/修改檔案：${NEW_FILES} 個"

    # 3. 檢查當前索引數量
    CURRENT_COUNT=$(curl -s "${QDRANT_URL}/collections/${COLLECTION}" | jq -r '.result.points_count // 0')
    log_info "當前索引 chunks：${CURRENT_COUNT} 個"

    # 決策邏輯
    if [[ $HOURS_SINCE -ge 24 ]]; then
        log_warn "距離上次索引已超過 24 小時"
        return 0  # 需要索引
    fi

    if [[ $NEW_FILES -gt 0 ]] && [[ $HOURS_SINCE -ge 1 ]]; then
        log_warn "有新檔案且距離上次索引 > 1 小時"
        return 0  # 需要索引
    fi

    log_success "目前不需要重新索引"
    return 1  # 不需要索引
}

# ============================================================================
# Telegram 通知
# ============================================================================

send_telegram_notification() {
    local MESSAGE=$1
    local BOT_TOKEN="${TELEGRAM_CONTROL_BOT_TOKEN:?請設定 TELEGRAM_CONTROL_BOT_TOKEN}"
    local CHAT_ID="${TELEGRAM_CHAT_ID:-5819565005}"

    # 發送通知
    curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
        -d "chat_id=${CHAT_ID}" \
        -d "text=${MESSAGE}" \
        -d "parse_mode=Markdown" > /dev/null 2>&1
}

# ============================================================================
# 執行索引
# ============================================================================

run_indexing() {
    log_info "開始執行向量索引..."

    # 記錄開始時間
    START_TIME=$(date +%s)

    # 執行索引腳本
    if "${WORKSPACE}/scripts/smart-chunk-indexer.sh" > /tmp/indexing.log 2>&1; then
        log_success "索引執行成功"

        # 提取結果
        TOTAL_FILES=$(grep "總共.*個記憶檔案" /tmp/indexing.log | grep -o '[0-9]*' || echo "0")
        TOTAL_CHUNKS=$(grep "總 chunks:" /tmp/indexing.log | grep -o '[0-9]*' || echo "0")
        DURATION=$(($(date +%s) - START_TIME))

        # 更新日誌（供腳本檢查用）
        mkdir -p "$(dirname "$INDEX_LOG")"
        cat > "$INDEX_LOG" <<EOF
last_index_time: $(date "+%Y-%m-%d %H:%M:%S")
last_index_files: ${TOTAL_FILES}
last_index_chunks: ${TOTAL_CHUNKS}
last_index_duration: ${DURATION} seconds
EOF

        # 寫入記憶日誌（供小蔡查詢）
        MEMORY_LOG="${WORKSPACE}/memory/autopilot-results/indexing-history.md"
        mkdir -p "$(dirname "$MEMORY_LOG")"

        # 如果檔案不存在，創建標題
        if [[ ! -f "$MEMORY_LOG" ]]; then
            cat > "$MEMORY_LOG" <<'HEADER'
# 向量索引歷史記錄

> 自動維護 - 由 Autopilot 更新

## 最近索引

HEADER
        fi

        # 追加記錄（最新的在前）
        TMP_FILE=$(mktemp)
        cat > "$TMP_FILE" <<RECORD

### $(date "+%Y-%m-%d %H:%M:%S")
- 📊 檔案：${TOTAL_FILES} 個
- 📦 Chunks：${TOTAL_CHUNKS} 個
- ⏱️  耗時：${DURATION} 秒
- ✅ 狀態：成功
RECORD

        # 插入到「## 最近索引」後面
        awk '/## 最近索引/ {print; system("cat '"$TMP_FILE"'"); next} 1' "$MEMORY_LOG" > "${MEMORY_LOG}.tmp"
        mv "${MEMORY_LOG}.tmp" "$MEMORY_LOG"
        rm "$TMP_FILE"

        log_success "索引完成：${TOTAL_FILES} 檔案 → ${TOTAL_CHUNKS} chunks"

        # 發送 Telegram 通知（而非輸出給小蔡）
        NOTIFICATION="🧠 *向量索引更新完成*

📊 檔案：${TOTAL_FILES} 個
📦 Chunks：${TOTAL_CHUNKS} 個
⏱️ 耗時：${DURATION} 秒

✅ 智能召回已更新"

        send_telegram_notification "$NOTIFICATION"
        log_success "已發送 Telegram 通知給 @gousmaaa"

        # 結構化輸出（供小蔡記憶）
        if [[ "$SILENT_MODE" == "true" ]]; then
            # Autopilot 模式：輸出簡潔但有資訊的摘要
            echo "✅ 索引完成 | 檔案:${TOTAL_FILES} | Chunks:${TOTAL_CHUNKS} | 耗時:${DURATION}s"
        else
            # 手動模式：完整輸出
            echo "✅ 完成"
        fi

        return 0
    else
        log_warn "索引執行失敗"

        # 失敗時也通知
        NOTIFICATION="⚠️ *向量索引更新失敗*

請檢查日誌：/tmp/indexing.log"

        send_telegram_notification "$NOTIFICATION"

        return 1
    fi
}

# ============================================================================
# 主程式
# ============================================================================

main() {
    # 靜默模式標記（供 Autopilot 使用）
    SILENT_MODE=${1:-false}

    if [[ "$SILENT_MODE" != "true" ]]; then
        echo "🔍 自動索引觸發器 v1.0"
        echo "============================================================"
    fi

    if check_need_indexing; then
        [[ "$SILENT_MODE" != "true" ]] && echo ""
        run_indexing
    else
        # 跳過時不發送通知（避免過多訊息）
        if [[ "$SILENT_MODE" != "true" ]]; then
            echo ""
            echo "ℹ️  本次無需索引，跳過"
            echo "📊 當前狀態："
            echo "   - 索引數量：$(curl -s "${QDRANT_URL}/collections/${COLLECTION}" | jq -r '.result.points_count // 0') chunks"
            echo "   - 上次索引：$(cat "$INDEX_LOG" 2>/dev/null | grep "last_index_time:" | cut -d: -f2- || echo "無記錄")"
        else
            # Autopilot 靜默模式：僅輸出簡短狀態
            echo "跳過（無需索引）"
        fi
    fi
}

main "$@"
