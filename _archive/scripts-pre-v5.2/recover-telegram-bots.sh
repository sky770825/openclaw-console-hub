#!/usr/bin/env bash
# Telegram Bot 一鍵修復腳本 v1.0
# 自動診斷並修復 @caij_n8n_bot 和 @xiaoji_cai_bot
# 使用方法：./scripts/recover-telegram-bots.sh

set -euo pipefail

# ============================================================================
# 配置區
# ============================================================================

WORKSPACE="${HOME}/.openclaw/workspace"
SKILL_DIR="${WORKSPACE}/skill-github-automation"
ECOSYSTEM_FILE="${SKILL_DIR}/ecosystem.config.js"

# Bot Tokens — 從環境變數讀取，不要寫死
CAIJ_N8N_TOKEN="${CAIJ_N8N_BOT_TOKEN:?請設定 CAIJ_N8N_BOT_TOKEN 環境變數}"
XIAOJI_CAI_TOKEN="${XIAOJI_CAI_BOT_TOKEN:?請設定 XIAOJI_CAI_BOT_TOKEN 環境變數}"

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# 工具函數
# ============================================================================

log_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

log_success() {
    echo -e "${GREEN}✅ ${NC}$1"
}

log_warn() {
    echo -e "${YELLOW}⚠️  ${NC}$1"
}

log_error() {
    echo -e "${RED}❌ ${NC}$1"
}

log_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# 檢查指令是否存在
check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "缺少必要指令: $1"
        exit 1
    fi
}

# 驗證 Telegram token
verify_token() {
    local token=$1
    local expected_bot=$2

    local bot_username=$(curl -s "https://api.telegram.org/bot${token}/getMe" | jq -r '.result.username // "invalid"')

    if [[ "$bot_username" == "$expected_bot" ]]; then
        log_success "Token 驗證成功: @${bot_username}"
        return 0
    else
        log_error "Token 驗證失敗: 預期 @${expected_bot}, 得到 @${bot_username}"
        return 1
    fi
}

# ============================================================================
# 診斷階段
# ============================================================================

diagnose_pm2_bot() {
    log_section "診斷 PM2 ai-bot (@caij_n8n_bot)"

    # 檢查 PM2 程序是否存在
    if ! pm2 list | grep -q "ai-bot"; then
        log_warn "PM2 ai-bot 程序不存在"
        return 2
    fi

    # 檢查程序狀態
    local status=$(pm2 jlist | jq -r '.[] | select(.name=="ai-bot") | .pm2_env.status')
    if [[ "$status" == "online" ]]; then
        log_info "PM2 ai-bot 狀態: online"
    else
        log_warn "PM2 ai-bot 狀態: $status"
        return 1
    fi

    # 檢查錯誤日誌
    local error_count=$(pm2 logs ai-bot --err --lines 10 --nostream 2>/dev/null | grep -c "Bot Token 無效" || echo 0)
    if [[ "$error_count" -gt 0 ]]; then
        log_error "發現 'Bot Token 無效' 錯誤 ($error_count 次)"
        return 1
    fi

    # 檢查環境變數
    local current_token=$(pm2 env 0 2>/dev/null | grep "^SKILLFORGE_BOT_TOKEN:" | cut -d: -f2- | xargs)
    if [[ "$current_token" != "$CAIJ_N8N_TOKEN" ]]; then
        log_warn "Token 不匹配: 當前使用 ${current_token:0:10}..."
        return 1
    fi

    log_success "PM2 ai-bot 狀態正常"
    return 0
}

diagnose_gateway() {
    log_section "診斷 OpenClaw Gateway (@xiaoji_cai_bot)"

    # 檢查 gateway 可達性
    if openclaw status 2>/dev/null | grep -q "unreachable"; then
        log_error "Gateway 無法連接 (unreachable)"
        return 1
    fi

    # 檢查服務狀態
    if openclaw status 2>/dev/null | grep "Gateway service" | grep -q "stopped"; then
        log_error "Gateway 服務已停止"
        return 1
    fi

    # 檢查 Telegram channel
    if ! openclaw status 2>/dev/null | grep -A5 "Channels" | grep -q "Telegram.*ON"; then
        log_warn "Telegram channel 未啟用"
        return 1
    fi

    # 檢查配置
    if openclaw status 2>/dev/null | grep -q "Config invalid"; then
        log_warn "配置檔案有問題"
        return 1
    fi

    log_success "OpenClaw Gateway 狀態正常"
    return 0
}

# ============================================================================
# 修復階段
# ============================================================================

fix_pm2_bot() {
    log_section "修復 PM2 ai-bot"

    log_info "步驟 1/5: 停止並刪除舊程序..."
    pm2 delete ai-bot 2>/dev/null || log_warn "程序不存在，跳過刪除"

    log_info "步驟 2/5: 創建 ecosystem.config.js..."
    cat > "$ECOSYSTEM_FILE" <<EOF
module.exports = {
  apps: [{
    name: 'ai-bot',
    script: './scripts/ollama-telegram-bot.js',
    cwd: '${SKILL_DIR}',
    env: {
      SKILLFORGE_BOT_TOKEN: '${CAIJ_N8N_TOKEN}',
      ADMIN_CHAT_ID: '5819565005',
      OLLAMA_MODEL: 'deepseek-r1:8b',
      OLLAMA_HOST: 'localhost',
      OLLAMA_PORT: '11434'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '5s'
  }]
};
EOF
    log_success "配置檔案已創建"

    log_info "步驟 3/5: 啟動 ai-bot..."
    cd "$SKILL_DIR"
    pm2 start "$ECOSYSTEM_FILE"

    log_info "步驟 4/5: 等待服務啟動..."
    sleep 3

    log_info "步驟 5/5: 驗證啟動狀態..."
    if pm2 logs ai-bot --lines 5 --nostream 2>/dev/null | grep -q "已啟動"; then
        log_success "ai-bot 啟動成功"
    else
        log_warn "請手動檢查日誌: pm2 logs ai-bot"
    fi

    log_info "保存 PM2 配置..."
    pm2 save

    log_success "PM2 ai-bot 修復完成"
}

fix_gateway() {
    log_section "修復 OpenClaw Gateway"

    log_info "步驟 1/4: 修復配置問題..."
    openclaw doctor --fix 2>/dev/null || log_warn "doctor --fix 執行失敗，繼續..."

    log_info "步驟 2/4: 停止 gateway 服務..."
    launchctl bootout gui/$(id -u)/ai.openclaw.gateway 2>/dev/null || log_warn "服務未運行，跳過"

    log_info "步驟 3/4: 重新載入並啟動..."
    launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/ai.openclaw.gateway.plist
    sleep 2
    launchctl kickstart gui/$(id -u)/ai.openclaw.gateway

    log_info "步驟 4/4: 等待 gateway 啟動..."
    sleep 5

    # 驗證啟動
    if openclaw status 2>/dev/null | grep -q "reachable"; then
        log_success "Gateway 啟動成功"
    else
        log_error "Gateway 啟動失敗，請檢查日誌: tail ~/.openclaw/logs/gateway.err.log"
        return 1
    fi

    # 檢查 Telegram channel
    if openclaw status 2>/dev/null | grep -A5 "Channels" | grep -q "Telegram.*ON"; then
        log_success "Telegram channel 已啟用"
    else
        log_warn "Telegram channel 未啟用，請檢查配置"
    fi

    log_success "OpenClaw Gateway 修復完成"
}

# ============================================================================
# 驗證階段
# ============================================================================

verify_all() {
    log_section "驗證修復結果"

    local all_ok=true

    # 驗證 @caij_n8n_bot
    log_info "驗證 @caij_n8n_bot..."
    if verify_token "$CAIJ_N8N_TOKEN" "caij_n8n_bot"; then
        if pm2 list | grep "ai-bot" | grep -q "online"; then
            log_success "@caij_n8n_bot: ✅ 正常運作"
        else
            log_error "@caij_n8n_bot: PM2 程序不是 online 狀態"
            all_ok=false
        fi
    else
        all_ok=false
    fi

    # 驗證 @xiaoji_cai_bot
    log_info "驗證 @xiaoji_cai_bot..."
    if verify_token "$XIAOJI_CAI_TOKEN" "xiaoji_cai_bot"; then
        if openclaw status 2>/dev/null | grep -q "reachable"; then
            log_success "@xiaoji_cai_bot: ✅ 正常運作"
        else
            log_error "@xiaoji_cai_bot: Gateway 不可達"
            all_ok=false
        fi
    else
        all_ok=false
    fi

    echo ""
    if $all_ok; then
        log_success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        log_success "  所有 Telegram Bot 修復成功！"
        log_success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        return 0
    else
        log_error "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        log_error "  部分 Bot 修復失敗，請檢查錯誤訊息"
        log_error "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        return 1
    fi
}

# ============================================================================
# 主程式
# ============================================================================

main() {
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                       ║${NC}"
    echo -e "${GREEN}║     Telegram Bot 一鍵修復工具 v1.0                    ║${NC}"
    echo -e "${GREEN}║     自動診斷並修復 @caij_n8n_bot + @xiaoji_cai_bot   ║${NC}"
    echo -e "${GREEN}║                                                       ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
    echo ""

    # 檢查必要指令
    log_info "檢查系統環境..."
    check_command "pm2"
    check_command "openclaw"
    check_command "jq"
    check_command "curl"
    log_success "環境檢查通過"

    # 診斷階段
    local pm2_status=0
    local gateway_status=0

    diagnose_pm2_bot || pm2_status=$?
    diagnose_gateway || gateway_status=$?

    # 決定是否需要修復
    local need_fix=false

    if [[ $pm2_status -ne 0 ]]; then
        log_warn "PM2 ai-bot 需要修復"
        need_fix=true
    fi

    if [[ $gateway_status -ne 0 ]]; then
        log_warn "OpenClaw Gateway 需要修復"
        need_fix=true
    fi

    if ! $need_fix; then
        log_success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        log_success "  所有 Bot 狀態正常，無需修復！"
        log_success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        exit 0
    fi

    # 檢查是否為自動模式
    local auto_mode=false
    for arg in "$@"; do
        if [[ "$arg" == "--auto" ]]; then
            auto_mode=true
        fi
    done

    if ! $auto_mode; then
        # 詢問用戶確認
        echo ""
        read -p "是否開始自動修復？[Y/n] " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ -n $REPLY ]]; then
            log_info "用戶取消修復"
            exit 0
        fi
    else
        log_info "檢測到 --auto 旗標，開始自動修復..."
    fi

    # 執行修復
    if [[ $pm2_status -ne 0 ]]; then
        fix_pm2_bot
    fi

    if [[ $gateway_status -ne 0 ]]; then
        fix_gateway
    fi

    # 最終驗證
    sleep 2
    verify_all
}

# 執行主程式
main "$@"
