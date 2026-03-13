#!/bin/bash
# OpenClaw System Recovery Center - Recovery Script (桌面版)
# 用途：系統恢復（獨立運作，零依賴）

set -euo pipefail

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# 路徑設定
OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
WORKSPACE="${OPENCLAW_WORKSPACE:-$OPENCLAW_HOME/workspace}"

# 桌面備份目錄
BACKUP_DIR="$HOME/Desktop/達爾/系統備份"

# 日誌函數
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 顯示標題
show_header() {
    clear 2>/dev/null || true
    echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}     🔧 ${BOLD}OpenClaw 系統恢復中心${NC}          ${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
    echo ""
}

# 顯示選單
show_menu() {
    show_header
    local latest=$(ls -t "$BACKUP_DIR" 2>/dev/null | grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' | head -1)
    [[ -z "$latest" ]] && latest="無備份"
    
    echo "  📂 備份位置: ~/Desktop/達爾/系統備份/"
    echo "  📅 最新備份: $latest"
    echo ""
    echo "  1) 🔍 健康檢查（診斷問題）"
    echo "  2) ⏪ 恢復到最近備份"
    echo "  3) 📋 查看備份列表"
    echo "  4) 🏷️  恢復到基線"
    echo "  5) ⚙️  僅恢復 Config"
    echo "  6) 🔄 重啟 OpenClaw"
    echo "  0) 👋 離開"
    echo ""
}

# 健康檢查
do_health_check() {
    show_header
    echo -e "${BOLD}🔍 系統健康檢查${NC}"
    echo "────────────────────────────────────"
    echo ""
    
    local issues=0
    
    # 1. openclaw.json 檢查
    if [[ -f "$OPENCLAW_HOME/openclaw.json" ]]; then
        if jq . "$OPENCLAW_HOME/openclaw.json" >/dev/null 2>&1; then
            echo -e "  ✅ openclaw.json        正常"
        else
            echo -e "  ${RED}❌ openclaw.json        JSON 語法錯誤${NC}"
            issues=$((issues + 1))
        fi
    else
        echo -e "  ${RED}❌ openclaw.json        不存在${NC}"
        issues=$((issues + 1))
    fi
    
    # 2. Config 檢查
    if [[ -d "$OPENCLAW_HOME/config" ]]; then
        local config_count=$(find "$OPENCLAW_HOME/config" -type f 2>/dev/null | wc -l)
        echo -e "  ✅ config/              正常 ($config_count 個檔案)"
    else
        echo -e "  ${YELLOW}⚠️  config/              不存在${NC}"
    fi
    
    # 3. 備份檢查
    if [[ -d "$BACKUP_DIR" ]] && [[ "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]]; then
        local backup_count=$(ls "$BACKUP_DIR" | wc -l)
        echo -e "  ✅ 桌面備份             $backup_count 個備份"
    else
        echo -e "  ${YELLOW}⚠️  桌面備份             無備份${NC}"
    fi
    
    # 4. Node.js 檢查
    if command -v node &>/dev/null; then
        local node_version=$(node --version 2>/dev/null)
        echo -e "  ✅ Node.js              $node_version"
    else
        echo -e "  ${RED}❌ Node.js              未安裝${NC}"
        issues=$((issues + 1))
    fi
    
    echo ""
    echo "────────────────────────────────────"
    if [[ "$issues" -eq 0 ]]; then
        echo -e "${GREEN}🎉 系統健康，未發現問題${NC}"
    else
        echo -e "${YELLOW}⚠️  發現 $issues 個問題，建議執行恢復${NC}"
    fi
    echo ""
    read -p "按 Enter 繼續..."
}

# 列出備份
do_list_backups() {
    show_header
    echo -e "${BOLD}📦 備份列表${NC}"
    echo "位置: ~/Desktop/達爾/系統備份/"
    echo ""
    
    if [[ ! -d "$BACKUP_DIR" ]] || [[ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]]; then
        echo "  尚無備份"
        read -p "按 Enter 繼續..."
        return
    fi
    
    local i=1
    for d in "$BACKUP_DIR"/*/; do
        [[ -d "$d" ]] || continue
        local name=$(basename "$d")
        local size=$(du -sh "$d" 2>/dev/null | cut -f1)
        echo "  $i) $name ($size)"
        i=$((i + 1))
    done
    
    echo ""
    read -p "按 Enter 繼續..."
}

# 執行恢復
do_restore() {
    local backup_name="$1"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    if [[ ! -d "$backup_path" ]]; then
        log_error "找不到備份: $backup_name"
        return 1
    fi
    
    if [[ ! -f "$backup_path/backup.tar.gz" ]]; then
        log_error "找不到備份檔案"
        return 1
    fi
    
    echo ""
    echo -e "${YELLOW}⚠️  即將恢復備份: $backup_name${NC}"
    echo ""
    read -p "確認恢復? (yes/no): " confirm
    
    if [[ "$confirm" != "yes" ]]; then
        log_info "已取消"
        return 0
    fi
    
    log_info "開始恢復..."
    
    # 解壓並恢復
    local temp_dir=$(mktemp -d)
    tar xzf "$backup_path/backup.tar.gz" -C "$temp_dir" 2>/dev/null
    
    # 恢復各個組件
    [[ -d "$temp_dir/config" ]] && cp -r "$temp_dir/config"/* "$OPENCLAW_HOME/config/" 2>/dev/null
    [[ -f "$temp_dir/openclaw.json" ]] && cp "$temp_dir/openclaw.json" "$OPENCLAW_HOME/" 2>/dev/null
    [[ -d "$temp_dir/memory" ]] && cp -r "$temp_dir/memory"/* "$OPENCLAW_HOME/memory/" 2>/dev/null
    [[ -d "$temp_dir/scripts" ]] && cp -r "$temp_dir/scripts"/* "$WORKSPACE/scripts/" 2>/dev/null
    
    rm -rf "$temp_dir"
    
    log_success "恢復完成！"
    echo ""
    read -p "是否立即重啟 OpenClaw? (y/N): " restart
    if [[ "$restart" == "y" || "$restart" == "Y" ]]; then
        do_restart_openclaw
    fi
}

# 恢復到最新
do_restore_latest() {
    local latest=$(ls -t "$BACKUP_DIR" 2>/dev/null | grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' | head -1)
    
    if [[ -z "$latest" ]]; then
        log_error "找不到任何備份"
        read -p "按 Enter 繼續..."
        return
    fi
    
    do_restore "$latest"
}

# 重啟 OpenClaw
do_restart_openclaw() {
    show_header
    log_info "正在重啟 OpenClaw..."
    
    if command -v openclaw &>/dev/null; then
        openclaw gateway restart 2>/dev/null || {
            log_warning "restart 失敗，嘗試 stop + start..."
            openclaw gateway stop 2>/dev/null || true
            sleep 2
            openclaw gateway start 2>/dev/null || true
        }
        log_success "重啟指令已發送"
    else
        log_error "找不到 openclaw 指令"
    fi
    
    read -p "按 Enter 繼續..."
}

# 互動式主選單
interactive_menu() {
    while true; do
        show_menu
        read -p "請選擇操作 (0-6): " choice
        
        case "$choice" in
            1) do_health_check ;;
            2) do_restore_latest ;;
            3) do_list_backups ;;
            4) 
                show_header
                echo "可用基線:"
                for d in "$BACKUP_DIR"/基線-*/; do
                    [[ -d "$d" ]] || continue
                    echo "  • $(basename "$d" | sed 's/基線-//')"
                done
                read -p "輸入基線名稱 (或按 Enter 取消): " baseline_name
                [[ -n "$baseline_name" ]] && do_restore "基線-$baseline_name"
                ;;
            5) log_info "功能開發中..."; read -p "按 Enter 繼續..." ;;
            6) do_restart_openclaw ;;
            0) 
                echo ""
                log_info "再見！"
                exit 0
                ;;
            *)
                log_error "無效選擇"
                sleep 1
                ;;
        esac
    done
}

# 使用說明
show_help() {
    cat <<EOF
OpenClaw 恢復腳本 (桌面版)

用法:
  $(basename "$0") [command]

命令:
  menu       互動式選單（預設）
  check      健康檢查
  list       列出備份
  restore    恢復最新備份
  help       顯示說明

備份位置: ~/Desktop/達爾/系統備份/

互動式選單可直接執行無參數。
EOF
}

# 主入口
case "${1:-menu}" in
    menu)
        interactive_menu
        ;;
    check)
        do_health_check
        ;;
    list)
        do_list_backups
        ;;
    restore)
        do_restore_latest
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "未知命令: $1"
        show_help
        exit 1
        ;;
esac
