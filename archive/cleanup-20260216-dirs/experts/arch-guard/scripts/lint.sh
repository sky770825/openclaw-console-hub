#!/bin/bash
# lint.sh - ArchGuard 靜態分析工具整合腳本 v0.1
#
# 功能: 執行多種靜態分析工具，檢查程式碼品質並產生報告。
#
# 用法: ./lint.sh [選項] [檔案或目錄]
# 選項:
#   --fix       自動修正可以自動修復的問題
#   --strict    嚴格模式：將警告視為錯誤
#   --report    產生詳細的 HTML/JSON 報告
#   --help      顯示此說明

set -euo pipefail

# --- 設定 ---
WORKSPACE_DIR="${HOME}/.openclaw/workspace"
SCRIPTS_DIR="${WORKSPACE_DIR}/scripts"
EXPERTS_DIR="${WORKSPACE_DIR}/experts"

# 顏色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 預設值
AUTO_FIX=false
STRICT_MODE=false
GENERATE_REPORT=false
TARGET="${WORKSPACE_DIR}"

# --- 函數 ---
log() {
    local level="$1"; shift
    local msg="$*"
    case "$level" in
        INFO) echo -e "${BLUE}[INFO]${NC} $msg" ;;
        SUCCESS) echo -e "${GREEN}[SUCCESS]${NC} $msg" ;;
        WARN) echo -e "${YELLOW}[WARN]${NC} $msg" ;;
        ERROR) echo -e "${RED}[ERROR]${NC} $msg" ;;
    esac
}

show_help() {
    cat << EOF
ArchGuard 靜態分析工具整合腳本 v0.1

用法: $0 [選項] [檔案或目錄]

選項:
  --fix       自動修正可以自動修復的問題
  --strict    嚴格模式：將警告視為錯誤
  --report    產生詳細的報告
  --help      顯示此說明

範例:
  $0                      # 檢查整個 workspace
  $0 --fix                # 檢查並自動修正問題
  $0 scripts/task.sh      # 只檢查特定檔案

檢查項目:
  - Shell 腳本 (使用 shellcheck)
  - JavaScript/TypeScript (使用 eslint, 如果配置存在)

EOF
}

# 檢查 shellcheck
lint_shell_scripts() {
    log INFO "開始檢查 Shell 腳本..."
    
    if ! command -v shellcheck &> /dev/null; then
        log WARN "shellcheck 未安裝，跳過 Shell 腳本檢查。"
        log INFO "請安裝 shellcheck: brew install shellcheck"
        return 0
    fi
    
    local fix_flag=""
    [ "$AUTO_FIX" = true ] && fix_flag="--fix"
    
    local shell_files=()
    if [ -f "$TARGET" ]; then
        shell_files=("$TARGET")
    else
        mapfile -t shell_files < <(find "$TARGET" -name "*.sh" -type f 2>/dev/null)
    fi
    
    if [ ${#shell_files[@]} -eq 0 ]; then
        log INFO "未找到 Shell 腳本。"
        return 0
    fi
    
    local error_count=0
    for file in "${shell_files[@]}"; do
        log INFO "檢查: $file"
        if ! shellcheck "$file"; then
            ((error_count++))
        fi
    done
    
    if [ $error_count -eq 0 ]; then
        log SUCCESS "Shell 腳本檢查通過！"
    else
        log ERROR "發現 $error_count 個檔案有問題。"
        [ "$STRICT_MODE" = true ] && return 1
    fi
}

# 檢查 JavaScript/TypeScript
lint_js_ts() {
    log INFO "開始檢查 JavaScript/TypeScript..."
    
    # 檢查是否有 eslint 配置
    if [ ! -f "${WORKSPACE_DIR}/.eslintrc.json" ] && [ ! -f "${WORKSPACE_DIR}/.eslintrc.js" ]; then
        log INFO "未找到 ESLint 配置，跳過 JS/TS 檢查。"
        return 0
    fi
    
    if ! command -v eslint &> /dev/null; then
        log WARN "eslint 未安裝，跳過 JS/TS 檢查。"
        return 0
    fi
    
    log INFO "執行 ESLint..."
    local fix_flag=""
    [ "$AUTO_FIX" = true ] && fix_flag="--fix"
    
    if eslint "$TARGET" $fix_flag; then
        log SUCCESS "JS/TS 檢查通過！"
    else
        log ERROR "JS/TS 檢查發現問題。"
        [ "$STRICT_MODE" = true ] && return 1
    fi
}

# --- 主程式 ---

# 解析參數
while [[ $# -gt 0 ]]; do
    case $1 in
        --fix) AUTO_FIX=true; shift ;;
        --strict) STRICT_MODE=true; shift ;;
        --report) GENERATE_REPORT=true; shift ;;
        --help) show_help; exit 0 ;;
        --*) log ERROR "未知選項: $1"; exit 1 ;;
        *) TARGET="$1"; shift ;;
    esac
done

log INFO "===== ArchGuard 靜態分析啟動 ====="
log INFO "目標: $TARGET"
log INFO "自動修正: $([ "$AUTO_FIX" = true ] && echo "是" || echo "否")"
log INFO "嚴格模式: $([ "$STRICT_MODE" = true ] && echo "是" || echo "否")"
echo ""

lint_shell_scripts
lint_js_ts

echo ""
log SUCCESS "===== 靜態分析完成 ====="

exit 0
