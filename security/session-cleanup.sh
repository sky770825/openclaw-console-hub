#!/usr/bin/env bash
# ============================================================================
# OpenClaw Session History Cleanup Tool
# 安全清理 session 歷史，先歸檔再清理，絕不直接刪除
# ============================================================================
set -euo pipefail

# --- 配置 ---
OPENCLAW_HOME="${HOME}/.openclaw"
SESSIONS_DIR="${OPENCLAW_HOME}/agent-bus/sessions"
MESSAGES_DIR="${OPENCLAW_HOME}/agent-bus/messages"
COMPLETED_DIR="${MESSAGES_DIR}/completed"
ARCHIVE_DIR="${MESSAGES_DIR}/archive"
MEMORY_DIR="${OPENCLAW_HOME}/memory"
LOGS_DIR="${OPENCLAW_HOME}/logs"
LOG_FILE="${LOGS_DIR}/session-cleanup.jsonl"
SANDBOX_DIR="${OPENCLAW_HOME}/sandboxes"

RETENTION_DAYS="${CLEANUP_RETENTION_DAYS:-7}"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
DATE_TAG="$(date +%Y%m%d-%H%M%S)"
DRY_RUN=false

# --- 顏色輸出 ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# --- 用法 ---
usage() {
    echo "用法: $0 [選項]"
    echo ""
    echo "選項:"
    echo "  --list          列出所有 session 及大小"
    echo "  --clean         執行清理（歸檔超過 ${RETENTION_DAYS} 天的已完成 session）"
    echo "  --dry-run       模擬清理，不實際執行"
    echo "  --stats         顯示空間統計"
    echo "  --days N        設定保留天數（預設 ${RETENTION_DAYS}）"
    echo "  --help          顯示此說明"
    echo ""
    echo "環境變數:"
    echo "  CLEANUP_RETENTION_DAYS   保留天數（預設 7）"
}

# --- 日誌記錄 ---
log_json() {
    local action="$1"
    local details="$2"
    local status="${3:-ok}"
    mkdir -p "${LOGS_DIR}"
    printf '{"timestamp":"%s","action":"%s","status":"%s","details":%s}\n' \
        "${TIMESTAMP}" "${action}" "${status}" "${details}" >> "${LOG_FILE}"
}

# --- 取得目錄大小（bytes） ---
get_size_bytes() {
    local dir="$1"
    if [ -d "$dir" ]; then
        du -sk "$dir" 2>/dev/null | awk '{print $1 * 1024}'
    else
        echo 0
    fi
}

# --- 取得目錄大小（人類可讀） ---
get_size_human() {
    local dir="$1"
    if [ -d "$dir" ]; then
        du -sh "$dir" 2>/dev/null | awk '{print $1}'
    else
        echo "0B"
    fi
}

# --- 列出所有 session 相關資料及大小 ---
cmd_list() {
    echo -e "${CYAN}=== OpenClaw Session 清單 ===${NC}"
    echo ""

    echo -e "${YELLOW}[Sessions 目錄]${NC} ${SESSIONS_DIR}"
    if [ -d "${SESSIONS_DIR}" ]; then
        local count
        count=$(find "${SESSIONS_DIR}" -maxdepth 1 -type f 2>/dev/null | wc -l | tr -d ' ')
        echo "  檔案數量: ${count}"
        echo "  總大小:   $(get_size_human "${SESSIONS_DIR}")"
        if [ "${count}" -gt 0 ]; then
            echo "  內容:"
            find "${SESSIONS_DIR}" -maxdepth 1 -type f -exec ls -lh {} \; 2>/dev/null | awk '{printf "    %-10s %s\n", $5, $NF}'
        fi
    else
        echo "  (目錄不存在)"
    fi
    echo ""

    echo -e "${YELLOW}[已完成訊息]${NC} ${COMPLETED_DIR}"
    if [ -d "${COMPLETED_DIR}" ]; then
        local count
        count=$(find "${COMPLETED_DIR}" -maxdepth 1 -type f 2>/dev/null | wc -l | tr -d ' ')
        echo "  檔案數量: ${count}"
        echo "  總大小:   $(get_size_human "${COMPLETED_DIR}")"
        if [ "${count}" -gt 0 ]; then
            echo "  內容:"
            find "${COMPLETED_DIR}" -maxdepth 1 -type f -exec ls -lh {} \; 2>/dev/null | \
                while read -r line; do
                    fname=$(echo "$line" | awk '{print $NF}')
                    fsize=$(echo "$line" | awk '{print $5}')
                    fdate=$(echo "$line" | awk '{print $6, $7, $8}')
                    printf "    %-10s %-20s %s\n" "$fsize" "$fdate" "$(basename "$fname")"
                done
        fi
    else
        echo "  (目錄不存在)"
    fi
    echo ""

    echo -e "${YELLOW}[歸檔目錄]${NC} ${ARCHIVE_DIR}"
    if [ -d "${ARCHIVE_DIR}" ]; then
        local count
        count=$(find "${ARCHIVE_DIR}" -maxdepth 1 -type f 2>/dev/null | wc -l | tr -d ' ')
        echo "  檔案數量: ${count}"
        echo "  總大小:   $(get_size_human "${ARCHIVE_DIR}")"
    else
        echo "  (目錄不存在或空)"
    fi
    echo ""

    echo -e "${YELLOW}[記憶資料庫]${NC} ${MEMORY_DIR}"
    if [ -d "${MEMORY_DIR}" ]; then
        echo "  總大小:   $(get_size_human "${MEMORY_DIR}")"
        find "${MEMORY_DIR}" -maxdepth 1 -type f ! -name ".*" -exec ls -lh {} \; 2>/dev/null | \
            awk '{printf "    %-10s %s\n", $5, $NF}'
    fi
    echo ""

    echo -e "${YELLOW}[Sandbox 備份]${NC} ${SANDBOX_DIR}"
    if [ -d "${SANDBOX_DIR}" ]; then
        echo "  總大小:   $(get_size_human "${SANDBOX_DIR}")"
        for d in "${SANDBOX_DIR}"/*/; do
            [ -d "$d" ] && printf "    %-10s %s\n" "$(get_size_human "$d")" "$(basename "$d")"
        done
    fi
    echo ""

    echo -e "${YELLOW}[待處理/處理中訊息]${NC}"
    for subdir in pending processing; do
        local sdir="${MESSAGES_DIR}/${subdir}"
        if [ -d "$sdir" ]; then
            local cnt
            cnt=$(find "$sdir" -maxdepth 1 -type f 2>/dev/null | wc -l | tr -d ' ')
            echo "  ${subdir}: ${cnt} 個檔案 ($(get_size_human "$sdir"))"
        fi
    done
}

# --- 空間統計 ---
cmd_stats() {
    echo -e "${CYAN}=== 空間使用統計 ===${NC}"
    echo ""
    printf "%-35s %s\n" "區域" "大小"
    printf "%-35s %s\n" "---" "---"
    printf "%-35s %s\n" "Sessions" "$(get_size_human "${SESSIONS_DIR}")"
    printf "%-35s %s\n" "Messages (completed)" "$(get_size_human "${COMPLETED_DIR}")"
    printf "%-35s %s\n" "Messages (archive)" "$(get_size_human "${ARCHIVE_DIR}")"
    printf "%-35s %s\n" "Messages (pending)" "$(get_size_human "${MESSAGES_DIR}/pending")"
    printf "%-35s %s\n" "Messages (processing)" "$(get_size_human "${MESSAGES_DIR}/processing")"
    printf "%-35s %s\n" "Memory DB" "$(get_size_human "${MEMORY_DIR}")"
    printf "%-35s %s\n" "Sandboxes" "$(get_size_human "${SANDBOX_DIR}")"
    printf "%-35s %s\n" "Logs" "$(get_size_human "${LOGS_DIR}")"
    echo ""
    printf "%-35s %s\n" "OpenClaw 總計" "$(get_size_human "${OPENCLAW_HOME}")"
}

# --- 清理主邏輯 ---
cmd_clean() {
    echo -e "${CYAN}=== Session 清理作業 ===${NC}"
    echo -e "保留天數: ${RETENTION_DAYS}"
    echo -e "模擬模式: ${DRY_RUN}"
    echo ""

    # 記錄清理前大小
    local before_completed before_sessions before_total
    before_completed=$(get_size_bytes "${COMPLETED_DIR}")
    before_sessions=$(get_size_bytes "${SESSIONS_DIR}")
    before_total=$(get_size_bytes "${OPENCLAW_HOME}")

    local archived_count=0
    local archived_files=""

    # --- 步驟 1：歸檔超過 N 天的已完成訊息 ---
    echo -e "${YELLOW}[步驟 1] 歸檔超過 ${RETENTION_DAYS} 天的已完成訊息...${NC}"

    if [ -d "${COMPLETED_DIR}" ]; then
        mkdir -p "${ARCHIVE_DIR}"

        # macOS find 使用 -mtime +N
        while IFS= read -r file; do
            [ -z "$file" ] && continue
            local basename_file
            basename_file="$(basename "$file")"

            if [ "${DRY_RUN}" = true ]; then
                echo -e "  ${YELLOW}[模擬]${NC} 將歸檔: ${basename_file}"
            else
                # 先複製到歸檔目錄，確認成功後才從 completed 移除
                cp -p "$file" "${ARCHIVE_DIR}/${basename_file}"
                if [ -f "${ARCHIVE_DIR}/${basename_file}" ]; then
                    mv "$file" "${ARCHIVE_DIR}/.${basename_file}.bak" 2>/dev/null || true
                    # 確認歸檔成功後刪除備份
                    rm -f "${ARCHIVE_DIR}/.${basename_file}.bak" 2>/dev/null || true
                    echo -e "  ${GREEN}[歸檔]${NC} ${basename_file}"
                    archived_count=$((archived_count + 1))
                    archived_files="${archived_files}${basename_file},"
                else
                    echo -e "  ${RED}[失敗]${NC} 歸檔失敗: ${basename_file}"
                fi
            fi
        done < <(find "${COMPLETED_DIR}" -maxdepth 1 -type f -name "*.json" -mtime "+${RETENTION_DAYS}" 2>/dev/null)
    fi

    echo "  歸檔了 ${archived_count} 個檔案"
    echo ""

    # --- 步驟 2：壓縮歸檔目錄中的舊檔案 ---
    echo -e "${YELLOW}[步驟 2] 壓縮歸檔目錄...${NC}"

    local archive_file_count
    archive_file_count=$(find "${ARCHIVE_DIR}" -maxdepth 1 -name "*.json" -type f 2>/dev/null | wc -l | tr -d ' ')

    if [ "${archive_file_count}" -gt 0 ]; then
        local tar_name="session-archive-${DATE_TAG}.tar.gz"
        local tar_path="${ARCHIVE_DIR}/${tar_name}"

        if [ "${DRY_RUN}" = true ]; then
            echo -e "  ${YELLOW}[模擬]${NC} 將壓縮 ${archive_file_count} 個 JSON 為 ${tar_name}"
        else
            # 壓縮歸檔中的 JSON 檔案
            (cd "${ARCHIVE_DIR}" && tar czf "${tar_name}" *.json 2>/dev/null)
            if [ -f "${tar_path}" ]; then
                # 驗證壓縮檔完整性
                if tar tzf "${tar_path}" > /dev/null 2>&1; then
                    # 壓縮成功，移除原始 JSON
                    (cd "${ARCHIVE_DIR}" && rm -f *.json)
                    echo -e "  ${GREEN}[壓縮]${NC} ${archive_file_count} 個檔案 -> ${tar_name}"
                else
                    echo -e "  ${RED}[失敗]${NC} 壓縮檔驗證失敗，保留原始檔案"
                    rm -f "${tar_path}"
                fi
            fi
        fi
    else
        echo "  歸檔目錄無需壓縮"
    fi
    echo ""

    # --- 步驟 3：清理過期 session 檔案 ---
    echo -e "${YELLOW}[步驟 3] 清理過期 session 檔案...${NC}"

    local session_cleaned=0
    if [ -d "${SESSIONS_DIR}" ]; then
        while IFS= read -r file; do
            [ -z "$file" ] && continue
            local basename_file
            basename_file="$(basename "$file")"

            if [ "${DRY_RUN}" = true ]; then
                echo -e "  ${YELLOW}[模擬]${NC} 將歸檔 session: ${basename_file}"
            else
                # session 檔案也是先歸檔再移除
                mkdir -p "${ARCHIVE_DIR}/sessions"
                cp -p "$file" "${ARCHIVE_DIR}/sessions/${basename_file}"
                if [ -f "${ARCHIVE_DIR}/sessions/${basename_file}" ]; then
                    rm "$file"
                    echo -e "  ${GREEN}[清理]${NC} session: ${basename_file}"
                    session_cleaned=$((session_cleaned + 1))
                fi
            fi
        done < <(find "${SESSIONS_DIR}" -maxdepth 1 -type f -mtime "+${RETENTION_DAYS}" 2>/dev/null)
    fi

    echo "  清理了 ${session_cleaned} 個 session 檔案"
    echo ""

    # --- 統計清理後大小 ---
    local after_completed after_sessions after_total
    after_completed=$(get_size_bytes "${COMPLETED_DIR}")
    after_sessions=$(get_size_bytes "${SESSIONS_DIR}")
    after_total=$(get_size_bytes "${OPENCLAW_HOME}")

    local saved_bytes=$((before_total - after_total))
    local saved_human
    if [ ${saved_bytes} -gt 1048576 ]; then
        saved_human="$((saved_bytes / 1048576)) MB"
    elif [ ${saved_bytes} -gt 1024 ]; then
        saved_human="$((saved_bytes / 1024)) KB"
    else
        saved_human="${saved_bytes} B"
    fi

    echo -e "${CYAN}=== 清理結果 ===${NC}"
    echo ""
    printf "%-25s %-15s %-15s\n" "區域" "清理前" "清理後"
    printf "%-25s %-15s %-15s\n" "---" "---" "---"
    printf "%-25s %-15s %-15s\n" "Completed Messages" "$(echo "$before_completed" | awk '{printf "%.1f KB", $1/1024}')" "$(echo "$after_completed" | awk '{printf "%.1f KB", $1/1024}')"
    printf "%-25s %-15s %-15s\n" "Sessions" "$(echo "$before_sessions" | awk '{printf "%.1f KB", $1/1024}')" "$(echo "$after_sessions" | awk '{printf "%.1f KB", $1/1024}')"
    echo ""
    echo -e "${GREEN}節省空間: ${saved_human}${NC}"
    echo -e "歸檔訊息: ${archived_count} 個"
    echo -e "清理 Session: ${session_cleaned} 個"

    # --- 寫入日誌 ---
    if [ "${DRY_RUN}" = false ]; then
        log_json "session-cleanup" "$(printf '{"retention_days":%d,"archived_messages":%d,"cleaned_sessions":%d,"before_bytes":%d,"after_bytes":%d,"saved_bytes":%d,"archived_files":"%s"}' \
            "${RETENTION_DAYS}" "${archived_count}" "${session_cleaned}" "${before_total}" "${after_total}" "${saved_bytes}" "${archived_files}")"
        echo ""
        echo -e "${GREEN}日誌已記錄至: ${LOG_FILE}${NC}"
    else
        echo ""
        echo -e "${YELLOW}[模擬模式] 未實際執行任何操作${NC}"
    fi
}

# --- 解析參數 ---
ACTION=""
while [ $# -gt 0 ]; do
    case "$1" in
        --list)    ACTION="list" ;;
        --clean)   ACTION="clean" ;;
        --dry-run) DRY_RUN=true ;;
        --stats)   ACTION="stats" ;;
        --days)    shift; RETENTION_DAYS="$1" ;;
        --help|-h) usage; exit 0 ;;
        *)
            echo "未知選項: $1"
            usage
            exit 1
            ;;
    esac
    shift
done

if [ -z "${ACTION}" ]; then
    usage
    exit 0
fi

case "${ACTION}" in
    list)  cmd_list ;;
    clean) cmd_clean ;;
    stats) cmd_stats ;;
esac
