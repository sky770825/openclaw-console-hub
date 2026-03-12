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
