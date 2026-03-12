#!/bin/bash
# NEUXA 瀏覽器自動化控制腳本 v1.0
# 用途：穩定控制瀏覽器與各 AI 平台對話

set -e

WORKSPACE="$HOME/.openclaw/workspace"
LOG_DIR="$WORKSPACE/logs/browser"
mkdir -p "$LOG_DIR"

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_DIR/browser-$(date +%Y%m%d).log"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_DIR/browser-$(date +%Y%m%d).log"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_DIR/browser-$(date +%Y%m%d).log"
}

# 檢查瀏覽器狀態
check_browser() {
    log "檢查瀏覽器狀態..."
    if curl -s http://127.0.0.1:18800/json/version > /dev/null 2>&1; then
        log "✅ 瀏覽器已就緒 (CDP Port: 18800)"
        return 0
    else
        error "❌ 瀏覽器未就緒"
        return 1
    fi
}

# 啟動瀏覽器
start_browser() {
    log "啟動瀏覽器..."
    openclaw browser start 2>&1 | tee -a "$LOG_DIR/browser-$(date +%Y%m%d).log"
    sleep 3
    check_browser
}

# 確保瀏覽器運行
ensure_browser() {
    if ! check_browser; then
        warn "瀏覽器未運行，正在啟動..."
        start_browser
    fi
}

# 開啟 URL
open_url() {
    local url="$1"
    local description="${2:-$url}"
    log "開啟: $description"
    openclaw browser open "$url" 2>&1 | tee -a "$LOG_DIR/browser-$(date +%Y%m%d).log"
}

# 與 AI 平台對話
talk_to_ai() {
    local platform="$1"
    local message="$2"
    
    case "$platform" in
        claude)
            URL="https://claude.ai/chat"
            ;;
        chatgpt)
            URL="https://chat.openai.com"
            ;;
        gemini)
            URL="https://gemini.google.com/app"
            ;;
        cursor)
            # Cursor 是桌面應用，使用檔案通訊
            log "Cursor 使用檔案級通訊協議"
            echo "$message" > "$WORKSPACE/COLLABORATION-REQUEST.md"
            cursor "$WORKSPACE/COLLABORATION-REQUEST.md"
            return 0
            ;;
        *)
            error "未知的 AI 平台: $platform"
            return 1
            ;;
    esac
    
    ensure_browser
    open_url "$URL" "$platform"
    log "請在瀏覽器中貼上訊息: $message"
}

# 截圖
screenshot() {
    local filename="${1:-screenshot-$(date +%Y%m%d-%H%M%S)}"
    log "截圖: $filename.png"
    openclaw browser screenshot --fullPage "$WORKSPACE/logs/browser/$filename.png"
}

# 主選單
show_menu() {
    echo ""
    echo "=== NEUXA 瀏覽器控制中心 ==="
    echo "1. 檢查瀏覽器狀態"
    echo "2. 啟動瀏覽器"
    echo "3. 與 Claude 對話"
    echo "4. 與 ChatGPT 對話"
    echo "5. 與 Gemini 對話"
    echo "6. 與 Cursor 對話 (檔案協議)"
    echo "7. 截圖"
    echo "8. 開啟指定 URL"
    echo "9. 查看日誌"
    echo "0. 退出"
    echo ""
}

# 主程式
main() {
    case "${1:-menu}" in
        check)
            check_browser
            ;;
        start)
            start_browser
            ;;
        claude)
            talk_to_ai "claude" "${2:-}"
            ;;
        chatgpt|gpt)
            talk_to_ai "chatgpt" "${2:-}"
            ;;
        gemini)
            talk_to_ai "gemini" "${2:-}"
            ;;
        cursor)
            talk_to_ai "cursor" "${2:-}"
            ;;
        screenshot|ss)
            screenshot "$2"
            ;;
        open)
            ensure_browser
            open_url "$2" "$3"
            ;;
        logs)
            tail -f "$LOG_DIR/browser-$(date +%Y%m%d).log"
            ;;
        menu|*)
            show_menu
            ;;
    esac
}

main "$@"
