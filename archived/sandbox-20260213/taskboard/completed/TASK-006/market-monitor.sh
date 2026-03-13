#!/bin/bash
# 市場需求監控系統 - Market Demand Monitor
# 監控主人三項業務的市場趨勢與競品動態

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$SCRIPT_DIR/data"
LOG_DIR="$SCRIPT_DIR/logs"
CONFIG_FILE="$SCRIPT_DIR/config/watchlist.json"
REPORT_DIR="$SCRIPT_DIR/reports"

# 確保目錄存在
mkdir -p "$DATA_DIR" "$LOG_DIR" "$REPORT_DIR"

# 顏色設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日誌函數
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_DIR/monitor.log"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_DIR/error.log"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_DIR/monitor.log"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_DIR/monitor.log"
}

# 初始化設定
init_config() {
    log "初始化市場監控設定..."
    
    cat > "$CONFIG_FILE" << 'EOF'
{
  "businesses": [
    {
      "name": "住商不動產",
      "category": "real_estate",
      "keywords": ["台北買房", "台中房地產", "高雄房屋", "房仲推薦", "置產", "首購族"],
      "competitors": ["信義房屋", "永慶房屋", "台灣房屋", "中信房屋"],
      "platforms": ["591", "樂屋網", "好房網"]
    },
    {
      "name": "飲料店",
      "category": "beverage",
      "keywords": ["手搖飲", "珍珠奶茶", "手作茶飲", "鮮果茶", "台灣茶", "飲料加盟"],
      "competitors": ["清心福全", "CoCo都可", "50嵐", "迷客夏", "大苑子", "麻古茶坊"],
      "platforms": ["Foodpanda", "UberEats", "LINE熱點"]
    },
    {
      "name": "普特斯防霾紗窗",
      "category": "window_screen",
      "keywords": ["防霾紗窗", "防塵紗窗", "紗窗推薦", "空氣清淨", "PM2.5防護", "換紗窗"],
      "competitors": ["3M防霾", "普特斯", "其他防霾紗窗品牌"],
      "platforms": ["蝦皮", "PChome", "momo購物網", "Mobile01"]
    }
  ],
  "trend_sources": [
    {"name": "Google Trends", "enabled": true},
    {"name": "蝦皮熱搜", "enabled": true},
    {"name": "PTT八卦版", "enabled": true},
    {"name": "Dcard", "enabled": true},
    {"name": "Mobile01", "enabled": true}
  ],
  "alert_thresholds": {
    "mention_spike": 50,
    "competitor_activity": 10,
    "sentiment_drop": -0.3
  }
}
EOF
    success "設定檔已建立: $CONFIG_FILE"
}

# 取得 Google Trends 資料 (模擬)
fetch_google_trends() {
    local keyword="$1"
    log "查詢 Google Trends: $keyword"
    # 實際實作需要使用 Google Trends API 或 pyTrends
    echo "{\"keyword\": \"$keyword\", \"trend\": \"stable\", \"score\": 75}"
}

# 取得蝦皮熱搜 (模擬)
fetch_shopee_trends() {
    local category="$1"
    log "查詢蝦皮熱搜: $category"
    # 實際實作需要爬蟲
    echo "{\"category\": \"$category\", \"hot_items\": [], \"trending_keywords\": []}"
}

# 分析社群討論 (模擬)
analyze_social_mentions() {
    local keyword="$1"
    log "分析社群討論: $keyword"
    # 實際實作需要 PTT/Dcard API 或爬蟲
    echo "{\"keyword\": \"$keyword\", \"mentions\": 0, \"sentiment\": 0.0}"
}

# 執行完整監控
run_monitor() {
    log "開始市場需求監控..."
    
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local report_file="$REPORT_DIR/report_${timestamp}.json"
    
    # 讀取設定
    if [[ ! -f "$CONFIG_FILE" ]]; then
        init_config
    fi
    
    # 開始產生報告
    echo "{" > "$report_file"
    echo "  \"generated_at\": \"$(date -Iseconds)\"," >> "$report_file"
    echo "  \"businesses\": [" >> "$report_file"
    
    local first=true
    # 使用 jq 解析設定檔
    while IFS= read -r business; do
        local name=$(echo "$business" | jq -r '.name')
        local category=$(echo "$business" | jq -r '.category')
        
        if [[ "$first" == "true" ]]; then
            first=false
        else
            echo "," >> "$report_file"
        fi
        
        log "監控業務: $name"
        
        echo "    {" >> "$report_file"
        echo "      \"name\": \"$name\"," >> "$report_file"
        echo "      \"category\": \"$category\"," >> "$report_file"
        echo "      \"keywords_data\": []," >> "$report_file"
        echo "      \"alerts\": []" >> "$report_file"
        echo -n "    }" >> "$report_file"
        
    done < <(jq -c '.businesses[]' "$CONFIG_FILE")
    
    echo "" >> "$report_file"
    echo "  ]," >> "$report_file"
    echo "  \"summary\": {\"status\": \"completed\", \"total_checked\": 3}" >> "$report_file"
    echo "}" >> "$report_file"
    
    success "監控報告已生成: $report_file"
}

# 顯示最新報告
show_latest_report() {
    local latest=$(ls -t "$REPORT_DIR"/report_*.json 2>/dev/null | head -1)
    if [[ -n "$latest" ]]; then
        echo "最新報告: $latest"
        cat "$latest" | jq . 2>/dev/null || cat "$latest"
    else
        warning "尚無報告，請先執行監控"
    fi
}

# 顯示儀表板
dashboard() {
    clear
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}          ${GREEN}市場需求監控儀表板${NC}                          ${BLUE}║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo
    
    if [[ ! -f "$CONFIG_FILE" ]]; then
        warning "尚未初始化，請執行: $0 init"
        return
    fi
    
    echo -e "${YELLOW}監控業務:${NC}"
    jq -r '.businesses[] | "  📊 \(.name) - \(.category)"' "$CONFIG_FILE"
    echo
    
    echo -e "${YELLOW}最近報告:${NC}"
    ls -lt "$REPORT_DIR"/report_*.json 2>/dev/null | head -5 | awk '{print "  📄 " $9 " (" $6 " " $7 " " $8 ")"}'
    echo
    
    echo -e "${YELLOW}快速指令:${NC}"
    echo "  $0 monitor  - 執行監控"
    echo "  $0 report   - 顯示最新報告"
    echo "  $0 init     - 初始化設定"
}

# 使用說明
usage() {
    echo "市場需求監控系統 v1.0"
    echo
    echo "用法: $0 [指令]"
    echo
    echo "指令:"
    echo "  init       初始化設定檔"
    echo "  monitor    執行市場監控"
    echo "  report     顯示最新報告"
    echo "  dashboard  顯示監控儀表板"
    echo "  status     檢查系統狀態"
    echo "  help       顯示此說明"
    echo
    echo "範例:"
    echo "  $0 init"
    echo "  $0 monitor"
    echo "  $0 dashboard"
}

# 檢查系統狀態
check_status() {
    echo -e "${BLUE}系統狀態檢查${NC}"
    echo
    
    # 檢查必要指令
    local deps=("jq" "curl" "date")
    for dep in "${deps[@]}"; do
        if command -v "$dep" &> /dev/null; then
            echo -e "  ✅ $dep"
        else
            echo -e "  ❌ $dep (未安裝)"
        fi
    done
    echo
    
    # 檢查目錄
    echo "目錄狀態:"
    for dir in "$DATA_DIR" "$LOG_DIR" "$REPORT_DIR"; do
        if [[ -d "$dir" ]]; then
            echo -e "  ✅ $dir"
        else
            echo -e "  ❌ $dir (不存在)"
        fi
    done
    echo
    
    # 檢查報告數量
    local report_count=$(ls "$REPORT_DIR"/report_*.json 2>/dev/null | wc -l)
    echo "報告數量: $report_count"
}

# 主程式
case "${1:-dashboard}" in
    init)
        init_config
        ;;
    monitor)
        run_monitor
        ;;
    report)
        show_latest_report
        ;;
    dashboard)
        dashboard
        ;;
    status)
        check_status
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        error "未知指令: $1"
        usage
        exit 1
        ;;
esac
