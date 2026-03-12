#!/bin/bash
# cleanup-safe.sh - DebugMaster 核心安全清理工具 v0.1
#
# 功能: 安全地清理系統中的暫存檔案、舊日誌、快取等非關鍵資料，釋放磁碟空間。
#        所有操作都會先列出將要清理的檔案，並徵求用戶確認。
#
# 用法: ./cleanup-safe.sh [選項]
# 選項:
#   --dry-run   只顯示將要清理的檔案，不實際執行刪除操作
#   --force     不徵求用戶確認，直接執行刪除操作 (慎用!)
#   --help      顯示此說明
#
# 環境變數:
#   OPENCLAW_CLEANUP_DIRS  額外要清理的目錄列表 (以冒號分隔，例如: /tmp:/var/tmp)

set -euo pipefail

# --- 設定與初始化 ---
LOG_DIR="${HOME}/.openclaw/logs/recovery"

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 預設值
DRY_RUN=false
FORCE_CLEAN=false

# --- 函數定義 ---

# 輸出日誌（只輸出到終端）
log_message() {
    local level="$1"
    shift
    local message="$*"
    
    case "$level" in
        INFO)  echo -e "${BLUE}[INFO]${NC} $message" ;;
        SUCCESS) echo -e "${GREEN}[SUCCESS]${NC} $message" ;;
        WARN)  echo -e "${YELLOW}[WARN]${NC} $message" ;;
        ERROR) echo -e "${RED}[ERROR]${NC} $message" ;;
        *) echo "[$level] $message" ;;
    esac
}

# 顯示幫助
show_help() {
    cat << EOF
OpenClaw 安全清理腳本 v0.1

功能: 安全地清理系統中的暫存檔案、舊日誌、快取等非關鍵資料，釋放磁碟空間。
      所有操作都會先列出將要清理的檔案，並徵求用戶確認。

用法: $0 [選項]

選項:
  --dry-run   只顯示將要清理的檔案，不實際執行刪除操作
  --force     不徵求用戶確認，直接執行刪除操作 (慎用!)
  --help      顯示此說明

範例:
  $0                    # 互動式清理，會先預覽並確認
  $0 --dry-run          # 預覽將要清理的檔案
  $0 --force            # 強制清理 (不確認)

環境變數:
  OPENCLAW_CLEANUP_DIRS  額外要清理的目錄列表 (以冒號分隔，例如: /tmp:/var/tmp)

EOF
}

# 清理指定目錄
clean_directory() {
    local dir="$1"
    local pattern="$2" # 例如: *.log, *.tmp, cache/*
    local days="$3" # 保留天數，例如: +7 代表清理 7 天前的檔案
    
    if [[ ! -d "$dir" ]]; then
        log_message WARN "目錄不存在，跳過清理: $dir"
        return 0
    fi
    
    log_message INFO "正在檢查目錄: $dir (符合模式: '$pattern', $days 天前)"
    
    local files_to_clean=()
    # 使用 find 查找符合條件的檔案
    if [ -n "$days" ]; then
        mapfile -t files_to_clean < <(find "$dir" -type f -name "$pattern" -mtime "$days" 2>/dev/null)
    else
        mapfile -t files_to_clean < <(find "$dir" -type f -name "$pattern" 2>/dev/null)
    fi
    
    if [ ${#files_to_clean[@]} -eq 0 ]; then
        log_message INFO "在 $dir 中未找到符合清理條件的檔案。"
        return 0
    fi
    
    log_message INFO "將要清理以下檔案:"
    for file in "${files_to_clean[@]}"; do
        log_message INFO "  - $file"
    done
    
    if [ "$DRY_RUN" = true ]; then
        log_message INFO "(乾跑模式，未實際刪除)"
        return 0
    fi
    
    if [ "$FORCE_CLEAN" = false ]; then
        read -p "確定要清理這些檔案嗎？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_message INFO "用戶取消清理。"
            return 0
        fi
    fi
    
    # 實際執行刪除
    local cleaned_count=0
    for file in "${files_to_clean[@]}"; do
        rm -f "$file" 2>/dev/null
        if [ $? -eq 0 ]; then
            ((cleaned_count++))
        else
            log_message WARN "無法刪除檔案: $file"
        fi
    done
    log_message SUCCESS "已清理 $cleaned_count 個檔案。"
}

# --- 主程式 ---

# 解析參數
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE_CLEAN=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            log_message ERROR "未知選項: $1"
            show_help
            exit 1
            ;;
    esac
done

log_message INFO "===== DebugMaster 安全清理程序啟動 ====="
log_message INFO "模式: $([ "$DRY_RUN" = true ] && echo "乾跑模式" || echo "實際清理") $([ "$FORCE_CLEAN" = true ] && echo "(強制)" || echo "")"

# --- 預設清理項目 ---
# 1. OpenClaw 恢復日誌 (保留 30 天)
clean_directory "$LOG_DIR" "*.log" "+30"

# 2. 系統暫存目錄 (保留 7 天)
clean_directory "/tmp" "*" "+7"
clean_directory "/var/tmp" "*" "+7"

# 3. OpenClaw 暫存目錄 (需確定路徑)
# 這裡需要根據 OpenClaw 實際的暫存路徑來設定，例如: ~/.openclaw/cache, ~/.openclaw/tmp 等
clean_directory "${HOME}/.openclaw/cache" "*" "+7"

# 4. 根據環境變數添加額外清理目錄
if [ -n "$OPENCLAW_CLEANUP_DIRS" ]; then
    log_message INFO "--- 清理額外指定目錄 ---"
    IFS=':' read -ra DIRS <<< "$OPENCLAW_CLEANUP_DIRS"
    for dir_to_clean in "${DIRS[@]}"; do
        clean_directory "$dir_to_clean" "*" "+7" # 額外目錄預設保留 7 天
    done
fi

log_message SUCCESS "===== 安全清理程序完成 ====="

exit 0
