#!/bin/bash
# Guardian Arsenal 部署腳本
# 建立保護他人的能力

GUARDIAN_DIR="$HOME/.openclaw/workspace/skills/guardian-arsenal"
LOG_FILE="$GUARDIAN_DIR/deploy.log"
mkdir -p "$GUARDIAN_DIR"

echo "🛡️ Guardian Arsenal - 守護者部署"
echo "==================================="
echo ""
echo "從自衛到護人的進階之路"
echo ""

# 檢查現有Arsenal
check_existing() {
    echo "📋 檢查現有部署..."
    
    if [ -f "$HOME/.openclaw/arsenal/arsenal-auto.sh" ]; then
        echo "  ✅ 個人 Arsenal 已部署"
    else
        echo "  ⚠️  個人 Arsenal 未部署，請先執行 arsenal 部署"
        exit 1
    fi
    
    echo ""
}

# 安裝 Suricata
install_suricata() {
    echo "📦 安裝 Suricata (網路入侵檢測)..."
    
    if command -v suricata >/dev/null 2>&1; then
        echo "  ✅ Suricata 已安裝"
    else
        echo "  📝 安裝指令 (macOS):"
        echo "     brew install suricata"
        echo ""
        echo "  📝 基本設定檔範本已建立:"
        mkdir -p "$GUARDIAN_DIR/configs/suricata"
        cat > "$GUARDIAN_DIR/configs/suricata/suricata.yaml.sample" << 'EOF'
# Suricata 基本設定
%YAML 1.1
---
vars:
  address-groups:
    HOME_NET: "[192.168.0.0/16,10.0.0.0/8,172.16.0.0/12]"
    EXTERNAL_NET: "!$HOME_NET"

default-log-dir: /var/log/suricata/

outputs:
  - fast:
      enabled: yes
      filename: fast.log
      append: yes
  - eve-log:
      enabled: yes
      filetype: regular
      filename: eve.json
EOF
        echo "     $GUARDIAN_DIR/configs/suricata/suricata.yaml.sample"
    fi
    echo ""
}

# 安裝 Zeek
install_zeek() {
    echo "📦 安裝 Zeek (網路分析)..."
    
    if command -v zeek >/dev/null 2>&1; then
        echo "  ✅ Zeek 已安裝"
    else
        echo "  📝 安裝指令 (macOS):"
        echo "     brew install zeek"
        echo ""
        echo "  📝 基本腳本範本已建立:"
        mkdir -p "$GUARDIAN_DIR/configs/zeek"
        cat > "$GUARDIAN_DIR/configs/zeek/notice.zeek.sample" << 'EOF'
# Zeek 通知設定
@load frameworks/notice/extend-email/hostnames

redef Notice::emailed_types += {
    HTTP::MalwareHashRegistryMatch,
};
EOF
        echo "     $GUARDIAN_DIR/configs/zeek/notice.zeek.sample"
    fi
    echo ""
}

# 安裝 Wazuh
install_wazuh() {
    echo "📦 安裝 Wazuh (端點監控)..."
    
    if [ -d "/var/ossec" ]; then
        echo "  ✅ Wazuh 已安裝"
    else
        echo "  📝 安裝方式:"
        echo "     1. 下載 Wazuh OVA (虛擬機)"
        echo "     2. 或使用 Docker:"
        echo "        docker run -d --name wazuh-manager wazuh/wazuh-manager"
        echo ""
        echo "  📝 部署指南已建立:"
        cat > "$GUARDIAN_DIR/WAZUH-DEPLOY.md" << 'EOF'
# Wazuh 部署指南

## 快速開始

### 使用 Docker (推薦)
```bash
# 啟動 Wazuh Manager
docker run -d --name wazuh-manager \
  -p 1514:1514 -p 55000:55000 \
  -v wazuh-data:/var/ossec/data \
  wazuh/wazuh-manager:latest

# 查看狀態
docker logs wazuh-manager
```

### 安裝 Agent (被保護端)
```bash
# macOS
brew install wazuh-agent

# 設定 Manager IP
sudo /var/ossec/bin/agent-auth -m <WAZUH_MANAGER_IP>

# 啟動
sudo launchctl load /Library/LaunchDaemons/com.wazuh.agent.plist
```

## 整合 Arsenal
- Wazuh 檢測到威脅 → 觸發 Arsenal 反制
- 自動化響應流程
EOF
        echo "     $GUARDIAN_DIR/WAZUH-DEPLOY.md"
    fi
    echo ""
}

# 建立監控儀表板
setup_dashboard() {
    echo "📊 建立監控儀表板..."
    
    mkdir -p "$GUARDIAN_DIR/dashboard"
    cat > "$GUARDIAN_DIR/dashboard/guardian-dashboard.html" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Guardian Arsenal Dashboard</title>
    <style>
        body { font-family: monospace; background: #1a1a1a; color: #00ff00; padding: 20px; }
        .panel { border: 1px solid #00ff00; padding: 15px; margin: 10px 0; }
        .status-ok { color: #00ff00; }
        .status-warn { color: #ffff00; }
        .status-alert { color: #ff0000; }
    </style>
</head>
<body>
    <h1>🛡️ Guardian Arsenal Dashboard</h1>
    
    <div class="panel">
        <h2>個人防護層 (Personal)</h2>
        <div id="personal-status" class="status-ok">● Arsenal 運行中</div>
    </div>
    
    <div class="panel">
        <h2>網路防護層 (Network)</h2>
        <div id="network-status">○ Suricata: 待部署</div>
        <div id="zeek-status">○ Zeek: 待部署</div>
    </div>
    
    <div class="panel">
        <h2>端點防護層 (Endpoint)</h2>
        <div id="endpoint-status">○ Wazuh: 待部署</div>
    </div>
    
    <div class="panel">
        <h2>最近事件</h2>
        <div id="recent-events">載入中...</div>
    </div>
</body>
</html>
EOF
    echo "  ✅ 儀表板: $GUARDIAN_DIR/dashboard/guardian-dashboard.html"
    echo ""
}

# 主程序
main() {
    check_existing
    
    echo "開始部署 Guardian Arsenal..."
    echo ""
    
    install_suricata
    install_zeek
    install_wazuh
    setup_dashboard
    
    echo ""
    echo "✅ Guardian Arsenal 部署完成!"
    echo ""
    echo "📁 檔案位置: $GUARDIAN_DIR"
    echo ""
    echo "🚀 下一步:"
    echo "  1. 安裝 Suricata: brew install suricata"
    echo "  2. 安裝 Zeek: brew install zeek"
    echo "  3. 部署 Wazuh: 參考 WAZUH-DEPLOY.md"
    echo "  4. 查看儀表板: open dashboard/guardian-dashboard.html"
    echo ""
    echo "🎯 目標: 從保護自己，到保護他人"
}

main "$@"
