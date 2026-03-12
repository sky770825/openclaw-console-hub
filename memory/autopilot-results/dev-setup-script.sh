#!/bin/bash
# =============================================================================
# 開發環境一鍵設定腳本 (ClawFlow Dev Environment Setup)
# 用途: 新機器快速還原開發環境
# 支援: macOS (Apple Silicon/Intel)
# 作者: Autopilot Agent
# 建立日期: 2026-02-12
# =============================================================================

set -e  # 遇到錯誤立即退出

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置變數
CLAWFLOW_DIR="$HOME/.openclaw"
CONFIG_DIR="$CLAWFLOW_DIR/config"
WORKSPACE_DIR="$CLAWFLOW_DIR/workspace"
SCRIPTS_DIR="$CLAWFLOW_DIR/scripts"
NODE_VERSION="22"  # LTS版本

# 記錄函數
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

# =============================================================================
# 前置檢查
# =============================================================================

check_prerequisites() {
    log_info "檢查系統環境..."
    
    # 檢查作業系統
    if [[ "$OSTYPE" != "darwin"* ]]; then
        log_error "此腳本僅支援 macOS"
        exit 1
    fi
    
    # 檢查是否為 Apple Silicon
    if [[ $(uname -m) == "arm64" ]]; then
        log_info "偵測到 Apple Silicon (M系列)"
        IS_ARM64=true
    else
        log_info "偵測到 Intel Mac"
        IS_ARM64=false
    fi
    
    # 檢查 Homebrew
    if ! command -v brew &> /dev/null; then
        log_warn "未安裝 Homebrew，將自動安裝..."
        install_homebrew
    else
        log_success "Homebrew 已安裝"
    fi
    
    log_success "前置檢查通過"
}

# =============================================================================
# 安裝 Homebrew
# =============================================================================

install_homebrew() {
    log_info "安裝 Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # 將 Homebrew 加入 PATH
    if [[ $IS_ARM64 == true ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    else
        echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/usr/local/bin/brew shellenv)"
    fi
    
    log_success "Homebrew 安裝完成"
}

# =============================================================================
# 安裝基礎工具
# =============================================================================

install_base_tools() {
    log_info "安裝基礎開發工具..."
    
    # 更新 Homebrew
    brew update
    
    # 安裝基礎工具
    local tools=(
        "git"           # 版本控制
        "curl"          # 網路請求
        "wget"          # 檔案下載
        "jq"            # JSON 處理
        "tree"          # 目錄結構
        "htop"          # 系統監控
        "ripgrep"       # 快速搜尋
        "fd"            # 快速檔案查找
        "fzf"           # 模糊搜尋
        "bat"           # 語法高亮 cat
        "exa"           # 現代版 ls
        "tmux"          # 終端多工
        "vim"           # 編輯器
        "moreutils"     # timeout 等工具
    )
    
    for tool in "${tools[@]}"; do
        if ! command -v $tool &> /dev/null; then
            log_info "安裝 $tool..."
            brew install $tool
        else
            log_success "$tool 已安裝"
        fi
    done
    
    log_success "基礎工具安裝完成"
}

# =============================================================================
# 安裝 Node.js
# =============================================================================

install_nodejs() {
    log_info "安裝 Node.js 環境..."
    
    # 安裝 nvm
    if [ ! -d "$HOME/.nvm" ]; then
        log_info "安裝 nvm..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    fi
    
    # 載入 nvm
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # 安裝 Node.js
    if ! nvm ls $NODE_VERSION &> /dev/null; then
        log_info "安裝 Node.js $NODE_VERSION..."
        nvm install $NODE_VERSION
        nvm use $NODE_VERSION
        nvm alias default $NODE_VERSION
    else
        log_success "Node.js $NODE_VERSION 已安裝"
        nvm use $NODE_VERSION
    fi
    
    # 安裝全域套件
    log_info "安裝全域 npm 套件..."
    npm install -g pm2 typescript ts-node pnpm yarn
    
    log_success "Node.js 環境設定完成"
}

# =============================================================================
# 安裝 Ollama
# =============================================================================

install_ollama() {
    log_info "安裝 Ollama..."
    
    if ! command -v ollama &> /dev/null; then
        log_info "下載並安裝 Ollama..."
        curl -fsSL https://ollama.com/install.sh | sh
        log_success "Ollama 安裝完成"
        
        log_info "啟動 Ollama 服務..."
        brew services start ollama
    else
        log_success "Ollama 已安裝"
    fi
    
    log_info "拉取預設模型..."
    ollama pull deepseek-r1:8b || log_warn "模型拉取可能需較長時間"
    
    log_success "Ollama 設定完成"
}

# =============================================================================
# 安裝 OpenClaw
# =============================================================================

install_openclaw() {
    log_info "安裝 OpenClaw..."
    
    if command -v openclaw &> /dev/null; then
        log_success "OpenClaw 已安裝"
        return
    fi
    
    log_info "安裝 OpenClaw CLI..."
    npm install -g @openclaw/cli
    
    log_success "OpenClaw 安裝完成"
}

# =============================================================================
# 建立目錄結構
# =============================================================================

setup_directory_structure() {
    log_info "建立 ClawFlow 目錄結構..."
    
    mkdir -p "$CONFIG_DIR"
    mkdir -p "$WORKSPACE_DIR"
    mkdir -p "$SCRIPTS_DIR"
    mkdir -p "$WORKSPACE_DIR/memory"
    mkdir -p "$WORKSPACE_DIR/docs"
    mkdir -p "$WORKSPACE_DIR/scripts"
    mkdir -p "$WORKSPACE_DIR/skills"
    
    log_success "目錄結構建立完成"
}

# =============================================================================
# 設定環境變數
# =============================================================================

setup_env_variables() {
    log_info "設定環境變數..."
    
    # 建立預設的 env 檔案（不含敏感資訊，只建立範本）
    
    # Telegram Bot 設定範本
    if [ ! -f "$CONFIG_DIR/telegram.env" ]; then
        cat > "$CONFIG_DIR/telegram.env" << 'EOF'
# Telegram Bot 配置
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
OLLAMA_MODEL=deepseek-r1:8b
EOF
        log_success "建立 telegram.env 範本"
    fi
    
    # Anthropic API 設定範本
    if [ ! -f "$CONFIG_DIR/anthropic.env" ]; then
        cat > "$CONFIG_DIR/anthropic.env" << 'EOF'
# Anthropic API 配置
ANTHROPIC_API_KEY=your_api_key_here
EOF
        log_success "建立 anthropic.env 範本"
    fi
    
    # Supabase 設定範本
    if [ ! -f "$CONFIG_DIR/supabase.env" ]; then
        cat > "$CONFIG_DIR/supabase.env" << 'EOF'
# Supabase 配置
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
EOF
        log_success "建立 supabase.env 範本"
    fi
    
    # Moltbook 設定範本
    if [ ! -f "$CONFIG_DIR/moltbook.env" ]; then
        cat > "$CONFIG_DIR/moltbook.env" << 'EOF'
# Moltbook API 配置
MOLTBOOK_API_KEY=your_api_key_here
EOF
        log_success "建立 moltbook.env 範本"
    fi
    
    # 更新 .zshrc
    if ! grep -q "CLAWFLOW_DIR" ~/.zshrc; then
        log_info "更新 .zshrc..."
        cat >> ~/.zshrc << EOF

# =============================================================================
# ClawFlow 環境設定
# =============================================================================
export CLAWFLOW_DIR="\$HOME/.openclaw"
export PATH="\$CLAWFLOW_DIR/scripts:\$PATH"

# 載入環境變數（如果存在）
for env_file in \$CLAWFLOW_DIR/config/*.env; do
    [ -f "\$env_file" ] && source "\$env_file"
done

# Ollama 設定
export OLLAMA_HOST="http://localhost:11434"

# OpenClaw 設定
export OPENCLAW_WORKSPACE="\$CLAWFLOW_DIR/workspace"
EOF
        log_success "已更新 .zshrc"
    fi
    
    log_success "環境變數設定完成"
}

# =============================================================================
# 建立輔助腳本
# =============================================================================

create_helper_scripts() {
    log_info "建立輔助腳本..."
    
    # 環境變數統一管理腳本
    cat > "$SCRIPTS_DIR/env-manager.sh" << 'EOF'
#!/bin/bash
# 環境變數統一管理腳本

ENV_DIR="$HOME/.openclaw/config"

list_env() {
    echo "=== 已配置的環境變數檔案 ==="
    for f in "$ENV_DIR"/*.env; do
        [ -f "$f" ] && echo "  - $(basename $f)"
    done
}

edit_env() {
    local name=$1
    local file="$ENV_DIR/$name.env"
    if [ -f "$file" ]; then
        ${EDITOR:-vim} "$file"
    else
        echo "檔案不存在: $file"
        echo "可用的檔案:"
        list_env
    fi
}

reload_env() {
    for f in "$ENV_DIR"/*.env; do
        [ -f "$f" ] && source "$f"
    done
    echo "環境變數已重新載入"
}

case $1 in
    list) list_env ;;
    edit) edit_env $2 ;;
    reload) reload_env ;;
    *) echo "用法: env-manager.sh [list|edit <name>|reload]" ;;
esac
EOF
    chmod +x "$SCRIPTS_DIR/env-manager.sh"
    
    # 快速備份腳本
    cat > "$SCRIPTS_DIR/backup-clawflow.sh" << 'EOF'
#!/bin/bash
# ClawFlow 設定備份腳本

BACKUP_DIR="$HOME/Desktop/clawflow-backup-$(date +%Y%m%d-%H%M%S)"
CLAWFLOW_DIR="$HOME/.openclaw"

echo "建立備份: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# 備份配置
cp -R "$CLAWFLOW_DIR/config" "$BACKUP_DIR/"

# 備份記憶
cp -R "$CLAWFLOW_DIR/workspace/memory" "$BACKUP_DIR/" 2>/dev/null || true

# 備份重要檔案
cp "$CLAWFLOW_DIR/workspace/MEMORY.md" "$BACKUP_DIR/" 2>/dev/null || true
cp "$CLAWFLOW_DIR/workspace/NOW.md" "$BACKUP_DIR/" 2>/dev/null || true

# 建立壓縮檔
tar -czf "$BACKUP_DIR.tar.gz" -C "$(dirname $BACKUP_DIR)" "$(basename $BACKUP_DIR)"
rm -rf "$BACKUP_DIR"

echo "備份完成: $BACKUP_DIR.tar.gz"
EOF
    chmod +x "$SCRIPTS_DIR/backup-clawflow.sh"
    
    log_success "輔助腳本建立完成"
}

# =============================================================================
# 主執行流程
# =============================================================================

main() {
    echo -e "${GREEN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║         ClawFlow 開發環境一鍵設定腳本 v1.0                 ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    log_info "開始安裝流程..."
    
    # 執行各階段
    check_prerequisites
    install_base_tools
    install_nodejs
    install_ollama
    install_openclaw
    setup_directory_structure
    setup_env_variables
    create_helper_scripts
    
    echo -e "${GREEN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║              開發環境設定完成！                            ║"
    echo "╠════════════════════════════════════════════════════════════╣"
    echo "║  請執行以下命令完成設定:                                   ║"
    echo "║    source ~/.zshrc                                         ║"
    echo "║                                                            ║"
    echo "║  接著編輯以下檔案填入您的 API Keys:                        ║"
    echo "║    ~/.openclaw/config/telegram.env                         ║"
    echo "║    ~/.openclaw/config/anthropic.env                        ║"
    echo "║                                                            ║"
    echo "║  常用命令:                                                 ║"
    echo "║    env-manager.sh list     - 列出環境變數檔案             ║"
    echo "║    env-manager.sh reload   - 重新載入環境變數             ║"
    echo "║    backup-clawflow.sh      - 備份設定                     ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# 執行主程式
main "$@"
