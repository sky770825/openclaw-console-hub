#!/bin/bash
# OpenClaw System Recovery Center - Dashboard Integration
# 用途：輸出備份狀態供 dashboard-monitor 顯示
set -e

OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
BACKUP_DIR="$OPENCLAW_HOME/backups"

# 顏色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# 取得最新備份資訊
get_latest_backup() {
    if [[ -f "$BACKUP_DIR/manifest-latest.json" ]]; then
        local timestamp=$(jq -r '.timestamp' "$BACKUP_DIR/manifest-latest.json" 2>/dev/null)
        local size=$(jq -r '.size_bytes' "$BACKUP_DIR/manifest-latest.json" 2>/dev/null | numfmt --to=iec 2>/dev/null || echo "?")
        local type=$(jq -r '.type' "$BACKUP_DIR/manifest-latest.json" 2>/dev/null)
        echo "$timestamp|$size|$type"
    else
        echo "無備份|-|-"
    fi
}

# 取得統計資訊
get_stats() {
    local daily_count=$(find "$BACKUP_DIR/daily" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
    local baseline_count=$(find "$BACKUP_DIR/baselines" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
    local incremental_count=$(find "$BACKUP_DIR/incremental" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
    
    echo "$daily_count|$baseline_count|$incremental_count"
}

# 顯示狀態面板
show_dashboard() {
    local latest=$(get_latest_backup)
    local latest_time=$(echo "$latest" | cut -d'|' -f1 | cut -d'T' -f1)
    local latest_size=$(echo "$latest" | cut -d'|' -f2)
    local latest_type=$(echo "$latest" | cut -d'|' -f3)
    
    local stats=$(get_stats)
    local daily_count=$(echo "$stats" | cut -d'|' -f1)
    local baseline_count=$(echo "$stats" | cut -d'|' -f2)
    local incremental_count=$(echo "$stats" | cut -d'|' -f3)
    
    # 健康狀態
    local health=$("$OPENCLAW_HOME/workspace/scripts/recovery/health-check.sh" 2>/dev/null)
    local health_status=$(echo "$health" | grep -o "✅\|⚠️\|❌" || echo "❓")
    
    echo ""
    echo -e "${BLUE}┌─────────────────────────────────────────┐${NC}"
    echo -e "${BLUE}│${NC} 🏥 系統恢復中心                          ${BLUE}│${NC}"
    echo -e "${BLUE}├─────────────────────────────────────────┤${NC}"
    echo -e "${BLUE}│${NC} 健康狀態: $health_status                              ${BLUE}│${NC}"
    echo -e "${BLUE}│${NC} 最新備份: ${latest_time:0:10} ($latest_size)        ${BLUE}│${NC}"
    echo -e "${BLUE}│${NC} 備份統計: ${daily_count}日/${baseline_count}基/${incremental_count}增          ${BLUE}│${NC}"
    echo -e "${BLUE}└─────────────────────────────────────────┘${NC}"
    echo ""
}

# 顯示詳細資訊
show_detailed() {
    echo ""
    echo "📦 備份儲存詳情"
    echo "────────────────────────────────────"
    
    # 磁碟使用
    local backup_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
    echo "備份總大小: $backup_size"
    
    # 最新備份詳情
    if [[ -f "$BACKUP_DIR/manifest-latest.json" ]]; then
        echo ""
        echo "最新備份:"
        jq -r '"  時間: \(.timestamp)"' "$BACKUP_DIR/manifest-latest.json" 2>/dev/null
        jq -r '"  類型: \(.type)"' "$BACKUP_DIR/manifest-latest.json" 2>/dev/null
        jq -r '"  大小: \(.size_bytes) bytes"' "$BACKUP_DIR/manifest-latest.json" 2>/dev/null | numfmt --to=iec 2>/dev/null || true
        jq -r '"  檔案: \(.files_count) 個"' "$BACKUP_DIR/manifest-latest.json" 2>/dev/null
    fi
    
    echo ""
}

# 主入口
case "${1:-}" in
    --panel|-p)
        show_dashboard
        ;;
    --detailed|-d)
        show_detailed
        ;;
    --json|-j)
        # 輸出 JSON 供程式使用
        latest=$(get_latest_backup)
        stats=$(get_stats)
        cat <<EOF
{
  "latest_backup": {
    "timestamp": "$(echo "$latest" | cut -d'|' -f1)",
    "size": "$(echo "$latest" | cut -d'|' -f2)",
    "type": "$(echo "$latest" | cut -d'|' -f3)"
  },
  "stats": {
    "daily": $(echo "$stats" | cut -d'|' -f1),
    "baselines": $(echo "$stats" | cut -d'|' -f2),
    "incremental": $(echo "$stats" | cut -d'|' -f3)
  }
}
EOF
        ;;
    *)
        show_dashboard
        ;;
esac
