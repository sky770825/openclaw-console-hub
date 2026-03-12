#!/bin/bash

# 市場需求監控系統執行腳本
# 用法：./run_monitoring.sh [mode]
# mode: full (完整監控), quick (快速監控), report-only (僅生成報告)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

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

# 建立數據目錄
mkdir -p data/raw data/processed data/reports

# 執行監控
MODE=${1:-"full"}

case $MODE in
    full)
        log_info "執行完整監控模式"
        python3 scripts/main_monitor.py
        log_success "完整監控已完成"
        ;;
    quick)
        log_info "執行快速監控模式"
        python3 scripts/crawler/trends_collector.py
        log_success "快速監控已完成"
        ;;
    report-only)
        log_info "僅生成報告"
        python3 scripts/dashboard/report_generator.py
        log_success "報告已生成"
        ;;
    *)
        log_error "未知的模式：$MODE"
        echo "用法：$0 [full|quick|report-only]"
        exit 1
        ;;
esac

log_info "監控結果已儲存到 data/reports/ 目錄"

# 顯示統計
if [ -f "data/reports/monitoring_summary.json" ]; then
    log_info "監控摘要："
    cat data/reports/monitoring_summary.json | python3 -m json.tool
fi

log_success "所有任務完成！"
