#!/usr/bin/env bash
# Configuration Management

# ============================================
# 初始化設定目錄
# ============================================
init_config() {
    # 建立設定目錄
    if [[ ! -d "$CONFIG_DIR" ]]; then
        mkdir -p "$CONFIG_DIR"
    fi
    
    # 建立預設設定檔
    if [[ ! -f "$CONFIG_FILE" ]]; then
        create_default_config
    fi
}

# ============================================
# 建立預設設定
# ============================================
create_default_config() {
    cat > "$CONFIG_FILE" << 'EOF'
# OpenClaw CLI 設定檔
# 位置: ~/.config/oc/config.yml
version: "1.0"

# Web UI 設定
webui:
  host: "localhost"
  port: 3000
  auto_open: true
  path: "projects/dashboard/modules/web-ui"

# Gateway 設定
gateway:
  host: "localhost"
  port: 8080

# 預設模型
models:
  default: "kimi/kimi-k2.5"
  fallback: "gpt-4o"
  cache_ttl: 3600

# Agent 設定
agents:
  coder:
    model: "cursor"
    timeout: 300
    max_tokens: 4000
  analyst:
    model: "kimi/kimi-k2.5"
    timeout: 120
  research:
    model: "grok/grok-4.1"
    timeout: 180

# 任務設定
tasks:
  default_limit: 20
  show_completed: true
  auto_refresh: false

# 顯示設定
display:
  colors: true
  emoji: true
  verbose: false
  table_style: "simple"

# 日誌設定
logging:
  level: "info"
  max_size: "10MB"
  max_files: 5
EOF
    success "已建立預設設定檔: $CONFIG_FILE"
}

# ============================================
# 讀取 YAML 設定值 (簡易版本)
# ============================================
config_get() {
    local key="$1"
    local default="${2:-}"
    
    if [[ ! -f "$CONFIG_FILE" ]]; then
        echo "$default"
        return
    fi
    
    # 簡易 YAML 解析
    local value
    value=$(grep -E "^${key}:" "$CONFIG_FILE" 2>/dev/null | head -1 | sed -E 's/^[^:]+:[[:space:]]*//' | tr -d '"' || echo "")
    
    echo "${value:-$default}"
}

# ============================================
# 編輯設定檔
# ============================================
edit_config() {
    local editor="${EDITOR:-nano}"
    
    if cmd_exists "$editor"; then
        "$editor" "$CONFIG_FILE"
    elif cmd_exists "nano"; then
        nano "$CONFIG_FILE"
    elif cmd_exists "vim"; then
        vim "$CONFIG_FILE"
    else
        error "找不到合適的編輯器"
        exit 1
    fi
}
