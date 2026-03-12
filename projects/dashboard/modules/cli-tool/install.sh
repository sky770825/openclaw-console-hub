#!/usr/bin/env bash
# OpenClaw CLI 安裝腳本
# 使用方法: curl -fsSL ... | bash

set -euo pipefail

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 安裝路徑
INSTALL_DIR="${HOME}/.config/oc/cli"
BIN_DIR="${HOME}/.local/bin"

# ============================================
# 輔助函數
# ============================================
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}" >&2
}

# ============================================
# 檢查依賴
# ============================================
check_dependencies() {
    info "檢查依賴..."
    
    # 檢查 bash
    if ! command -v bash >/dev/null 2>&1; then
        error "需要 Bash"
        exit 1
    fi
    
    # 檢查 openclaw (選擇性)
    if ! command -v openclaw >/dev/null 2>&1; then
        warn "openclaw 未安裝，部分功能可能無法使用"
    fi
    
    success "依賴檢查完成"
}

# ============================================
# 建立目錄結構
# ============================================
setup_directories() {
    info "建立目錄結構..."
    
    mkdir -p "$INSTALL_DIR"
    mkdir -p "$INSTALL_DIR"/{bin,lib/commands,lib/utils,completions,docs}
    mkdir -p "${HOME}/.config/oc"
    mkdir -p "$BIN_DIR"
    
    success "目錄建立完成"
}

# ============================================
# 安裝檔案
# ============================================
install_files() {
    info "安裝檔案..."
    
    # 取得腳本所在目錄
    local source_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    
    # 複製主程式
    if [[ -f "${source_dir}/bin/oc" ]]; then
        cp "${source_dir}/bin/oc" "$INSTALL_DIR/bin/"
        chmod +x "$INSTALL_DIR/bin/oc"
    fi
    
    # 複製函式庫
    if [[ -d "${source_dir}/lib" ]]; then
        cp -r "${source_dir}/lib/"* "$INSTALL_DIR/lib/"
    fi
    
    # 複製文件
    if [[ -f "${source_dir}/README.md" ]]; then
        cp "${source_dir}/README.md" "$INSTALL_DIR/"
    fi
    
    # 複製自動補全腳本
    if [[ -d "${source_dir}/completions" ]]; then
        cp -r "${source_dir}/completions/"* "$INSTALL_DIR/completions/"
    fi
    
    success "檔案安裝完成"
}

# ============================================
# 建立符號連結
# ============================================
create_symlinks() {
    info "建立符號連結..."
    
    # 建立 oc 指令連結
    if [[ -f "$INSTALL_DIR/bin/oc" ]]; then
        ln -sf "$INSTALL_DIR/bin/oc" "$BIN_DIR/oc"
        success "已建立連結: $BIN_DIR/oc"
    fi
}

# ============================================
# 設定自動補全
# ============================================
setup_completion() {
    info "設定自動補全..."
    
    local shell_rc=""
    
    # 偵測 Shell
    if [[ -n "${ZSH_VERSION:-}" ]] || [[ "${SHELL##*/}" == "zsh" ]]; then
        shell_rc="${HOME}/.zshrc"
        
        # 建立 zsh 補全目錄
        mkdir -p "${HOME}/.zsh/completions"
        
        if [[ -f "$INSTALL_DIR/completions/oc.zsh" ]]; then
            cp "$INSTALL_DIR/completions/oc.zsh" "${HOME}/.zsh/completions/_oc"
        fi
        
        # 加入 fpath (如果尚未加入)
        if ! grep -q "${HOME}/.zsh/completions" "$shell_rc" 2>/dev/null; then
            echo "fpath+=${HOME}/.zsh/completions" >> "$shell_rc"
        fi
        
    elif [[ -n "${BASH_VERSION:-}" ]] || [[ "${SHELL##*/}" == "bash" ]]; then
        shell_rc="${HOME}/.bashrc"
        
        if [[ -f "$INSTALL_DIR/completions/oc.bash" ]]; then
            if ! grep -q "oc completion" "$shell_rc" 2>/dev/null; then
                echo "source $INSTALL_DIR/completions/oc.bash" >> "$shell_rc"
            fi
        fi
        
    elif [[ "${SHELL##*/}" == "fish" ]]; then
        local fish_dir="${HOME}/.config/fish/completions"
        mkdir -p "$fish_dir"
        
        if [[ -f "$INSTALL_DIR/completions/oc.fish" ]]; then
            cp "$INSTALL_DIR/completions/oc.fish" "$fish_dir/oc.fish"
        fi
    fi
    
    if [[ -n "$shell_rc" ]]; then
        success "自動補全設定完成"
        info "請執行 'source $shell_rc' 或重新開啟終端機"
    fi
}

# ============================================
# 設定 PATH
# ============================================
setup_path() {
    info "設定 PATH..."
    
    local shell_rc=""
    
    case "${SHELL##*/}" in
        zsh) shell_rc="${HOME}/.zshrc" ;;
        bash) shell_rc="${HOME}/.bashrc" ;;
        *) shell_rc="${HOME}/.profile" ;;
    esac
    
    # 檢查 PATH 是否已包含
    if [[ ":${PATH}:" != *":${BIN_DIR}:"* ]]; then
        echo "" >> "$shell_rc"
        echo "# OpenClaw CLI" >> "$shell_rc"
        echo "export PATH=\"${BIN_DIR}:\$PATH\"" >> "$shell_rc"
        success "已更新 PATH"
    else
        info "PATH 已包含 $BIN_DIR"
    fi
}

# ============================================
# 建立預設設定
# ============================================
setup_config() {
    info "設定初始配置..."
    
    local config_file="${HOME}/.config/oc/config.yml"
    
    if [[ ! -f "$config_file" ]]; then
        cat > "$config_file" << 'EOF'
# OpenClaw CLI 設定檔
version: "1.0"

webui:
  host: "localhost"
  port: 3000
  auto_open: true

models:
  default: "kimi/kimi-k2.5"
  fallback: "gpt-4o"

display:
  colors: true
  emoji: true
  verbose: false
EOF
        success "已建立預設設定檔"
    fi
}

# ============================================
# 顯示安裝結果
# ============================================
show_result() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║     OpenClaw CLI 安裝完成！ 🎉           ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
    echo ""
    echo "安裝路徑: $INSTALL_DIR"
    echo "設定檔: ${HOME}/.config/oc/config.yml"
    echo ""
    echo "快速開始:"
    echo "  oc --help          顯示使用說明"
    echo "  oc dashboard       啟動 Web UI"
    echo "  oc status          查看系統狀態"
    echo "  oc doctor          系統診斷"
    echo ""
    echo "提示: 重新開啟終端機或使用 'source ~/.bashrc' (或 ~/.zshrc)"
}

# ============================================
# 解除安裝
# ============================================
uninstall() {
    info "解除安裝 OpenClaw CLI..."
    
    # 移除檔案
    rm -rf "$INSTALL_DIR"
    rm -f "$BIN_DIR/oc"
    
    # 移除設定 (選擇性)
    read -p "是否移除設定檔? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "${HOME}/.config/oc"
    fi
    
    success "解除安裝完成"
}

# ============================================
# 主程式
# ============================================
main() {
    # 解析參數
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --uninstall)
                uninstall
                exit 0
                ;;
            --force)
                # 強制重新安裝
                rm -rf "$INSTALL_DIR"
                shift
                ;;
            --help)
                echo "OpenClaw CLI 安裝腳本"
                echo ""
                echo "用法:"
                echo "  ./install.sh           安裝"
                echo "  ./install.sh --force   強制重新安裝"
                echo "  ./install.sh --uninstall  解除安裝"
                exit 0
                ;;
            *)
                error "未知選項: $1"
                exit 1
                ;;
        esac
    done
    
    echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     OpenClaw CLI 安裝程式                ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
    echo ""
    
    check_dependencies
    setup_directories
    install_files
    create_symlinks
    setup_config
    setup_path
    setup_completion
    
    show_result
}

main "$@"
