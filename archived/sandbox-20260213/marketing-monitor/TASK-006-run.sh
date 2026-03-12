#!/bin/bash

# 市場監控系統執行腳本
# Market Monitoring System Execution Script

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日誌函數
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 檢查 Python
if ! command -v python3 &> /dev/null; then
    log_error "Python3 未安裝"
    exit 1
fi

log_info "開始執行市場需求監控系統"
log_info "執行時間：$(date '+%Y-%m-%d %H:%M:%S')"

# 建立必要目錄
mkdir -p data/raw data/processed data/reports

# 執行模式
MODE=${1:-"full"}

case $MODE in
    full)
        log_info "執行完整監控模式"
        python3 TASK-006-main.py --mode full
        log_success "完整監控已完成"
        ;;
    quick)
        log_info "執行快速監控模式（僅數據收集）"
        python3 TASK-006-main.py --mode quick
        log_success "快速監控已完成"
        ;;
    report)
        log_info "執行報告生成模式"
        python3 TASK-006-main.py --mode report
        log_success "報告已生成"
        ;;
    *)
        log_error "未知的模式：$MODE"
        echo "用法：$0 [full|quick|report]"
        echo ""
        echo "模式說明："
        echo "  full   - 完整監控（收集→分析→警示→報告）"
        echo "  quick  - 快速監控（僅收集）"
        echo "  report - 報告模式（僅分析和報告）"
        exit 1
        ;;
esac

log_info "監控結果已儲存到 data/reports/ 目錄"

# 顯示報告
if ls data/reports/*.json &> /dev/null; then
    log_info "最近報告："
    ls -lt data/reports/*.json | head -3 | awk '{print "   " $NF}'
fi

log_success "執行完成！"
