#!/usr/bin/env bash
# OpenClaw 安全審計修復腳本
# 會修改 ~/.openclaw/openclaw.json：加入 plugins.allow、ollama 工具限制、更長 Gateway token
# 執行前請先備份：cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.bak.$(date +%Y%m%d)

set -e
CONFIG="${OPENCLAW_CONFIG:-$HOME/.openclaw/openclaw.json}"
BACKUP="${CONFIG}.bak.$(date +%Y%m%d-%H%M%S)"

if [[ ! -f "$CONFIG" ]]; then
  echo "錯誤：找不到 $CONFIG"
  exit 1
fi

# 產生 32 字元 hex token（若未提供）
NEW_TOKEN="${OPENCLAW_NEW_GATEWAY_TOKEN:-$(openssl rand -hex 16 2>/dev/null || echo '8c4f2a9e1b7d3f6e0a5c8b9d2e1f4a7b')}"

echo "使用設定檔: $CONFIG"
echo "備份至: $BACKUP"
cp "$CONFIG" "$BACKUP"

# 使用 node 做 JSON 編輯，避免手動 sed 破壞格式
CONFIG_PATH="$CONFIG" NEW_TOKEN="$NEW_TOKEN" node -e "
const fs = require('fs');
const path = process.env.CONFIG_PATH;
const newToken = process.env.NEW_TOKEN;

let data = JSON.parse(fs.readFileSync(path, 'utf8'));

// 1. plugins.allow
if (!data.plugins) data.plugins = {};
if (!data.plugins.allow) {
  data.plugins.allow = [
    'google-antigravity-auth',
    'openguardrails-for-openclaw',
    'telegram',
    'whatsapp'
  ];
  console.log('已加入 plugins.allow');
}

// 2. tools.byProvider.ollama.deny
if (!data.tools) data.tools = {};
if (!data.tools.byProvider) data.tools.byProvider = {};
if (!data.tools.byProvider.ollama) {
  data.tools.byProvider.ollama = { deny: ['web_search', 'web_fetch', 'browser'] };
  console.log('已加入 tools.byProvider.ollama.deny');
}

// 3. gateway.auth.token
if (data.gateway && data.gateway.auth && data.gateway.auth.token !== newToken) {
  data.gateway.auth.token = newToken;
  console.log('已更新 gateway.auth.token 為 32 字元 hex');
}

fs.writeFileSync(path, JSON.stringify(data, null, 2));
"

echo "完成。請重啟 OpenClaw Gateway 使設定生效。"
echo "若你有使用 OPENCLAW_GATEWAY_TOKEN 環境變數，請改為: $NEW_TOKEN"
