#!/bin/bash
# OpenClaw Master-Slave 切換控制器
# 這個腳本在從節點（Windows/WSL）上運行
# 負責偵測主節點（Mac）是否在線，決定是否啟動 OpenClaw

set -euo pipefail

# 設定
MASTER_IP="${MASTER_IP:-192.168.1.100}"  # Mac 的 IP，需要修改
MASTER_CHECK_PORT="${MASTER_CHECK_PORT:-18789}"  # OpenClaw Gateway port
CHECK_INTERVAL=30  # 每 30 秒檢查一次
STANDBY_FILE="/tmp/openclaw-standby"

# 顏色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "[$(date '+%H:%M:%S')] $1"
}

check_master_online() {
    # 檢查主節點（Mac）是否在線
    # 方法：ping + 檢查 OpenClaw port
    
    # 先 ping
    if ! ping -c 1 -W 2 "$MASTER_IP" &>/dev/null; then
        return 1  # 離線
    fi
    
    # 再檢查 OpenClaw 是否在運作（可選，如果 Mac 開機但沒開 OpenClaw）
    # timeout 2 bash -c "cat < /dev/null > /dev/tcp/$MASTER_IP/$MASTER_CHECK_PORT" 2>/dev/null || true
    
    return 0  # 在線
}

start_openclaw() {
    log "${GREEN}🚀 主節點離線，啟動 OpenClaw（從節點模式）${NC}"
    rm -f "$STANDBY_FILE"
    
    # 啟動 OpenClaw
    cd ~/.openclaw/workspace
    exec openclaw "$@"
}

standby_mode() {
    log "${YELLOW}😴 主節點在線，進入待命模式${NC}"
    touch "$STANDBY_FILE"
    
    # 待命迴圈：持續檢查主節點，如果離線就接管
    while true; do
        sleep $CHECK_INTERVAL
        
        if ! check_master_online; then
            log "${YELLOW}⚠️  主節點離線，準備接管...${NC}"
            sleep 5  # 等待一下確保不是瞬斷
            
            if ! check_master_online; then
                log "${GREEN}✅ 確認主節點離線，啟動 OpenClaw${NC}"
                start_openclaw "$@"
                return
            fi
        fi
        
        log "${BLUE}💤 主節點仍在線，繼續待命...${NC}"
    done
}

show_status() {
    if [[ -f "$STANDBY_FILE" ]]; then
        echo -e "${YELLOW}狀態：待命模式${NC}"
        echo "主節點（Mac）在線，本機不處理訊息"
    else
        echo -e "${GREEN}狀態：運作模式${NC}"
        echo "主節點離線或本機已接管"
    fi
    
    echo ""
    echo "主節點 IP: $MASTER_IP"
    
    if check_master_online; then
        echo "主節點狀態: ${GREEN}在線${NC}"
    else
        echo "主節點狀態: ${RED}離線${NC}"
    fi
}

# 主程式
case "${1:-}" in
    "status")
        show_status
        ;;
    "force-start")
        log "${YELLOW}強制啟動 OpenClaw（忽略主節點狀態）${NC}"
        start_openclaw "${@:2}"
        ;;
    *)
        # 預設：檢查主節點，決定啟動或待命
        log "🔍 檢查主節點（Mac）狀態..."
        
        if check_master_online; then
            standby_mode "$@"
        else
            start_openclaw "$@"
        fi
        ;;
esac
