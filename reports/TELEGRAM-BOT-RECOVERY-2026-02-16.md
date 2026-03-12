# Telegram Bot 修復流程 | 2026-02-16

> **修復時間**：2026-02-16 13:30-14:00
> **修復者**：小蔡（Claude）
> **狀態**：✅ 完全修復

---

## 📋 問題摘要

**症狀**：兩個 Telegram bot 完全無回應
1. @caij_n8n_bot - Ollama 客服機器人（PM2 ai-bot）
2. @xiaoji_cai_bot - OpenClaw gateway 主控 bot

**影響**：
- 用戶無法透過 Telegram 與小蔡互動
- AI 客服功能中斷
- 緊急通知無法送達

---

## 🔍 根本原因分析

### Bot 1: @caij_n8n_bot（PM2 ai-bot）

**問題**：
- PM2 環境變數使用了**錯誤的 token**
- 舊 token: `8357557172:AAGZAT0S65QQm7Cn-2zOB6D6gOfQ-miujFM`
- 正確 token: `8357299731:AAHrBnVCEGjGy6b0g-3JhBArMnM9kt__Ncg`

**錯誤日誌**：
```
❌ Bot Token 無效
```

**原因**：
- PM2 程序啟動時繼承了系統環境變數中的舊 token
- 重啟 PM2 時使用 `--update-env` 沒有覆蓋舊環境變數
- 缺少 ecosystem.config.js 配置檔案，無法持久化設定

---

### Bot 2: @xiaoji_cai_bot（OpenClaw Gateway）

**問題**：
- Gateway 服務完全停止運行
- 配置檔案存在無效 key（`defaultOptions`）

**錯誤訊息**：
```
Gateway: unreachable (connect ECONNREFUSED 127.0.0.1:18789)
Gateway service: stopped (state active)
Channels: (空的)
```

**原因**：
- Gateway LaunchAgent 啟動後立即退出
- 配置驗證失敗導致 gateway 無法啟動
- Telegram channel 未啟動

---

## 🛠️ 修復流程

### 階段 1：修復 PM2 ai-bot (@caij_n8n_bot)

#### Step 1：檢查當前狀態
```bash
# 查看 PM2 程序列表
pm2 list

# 檢查 ai-bot 環境變數
pm2 env 0

# 查看錯誤日誌
pm2 logs ai-bot --err --lines 20 --nostream
```

**發現**：`SKILLFORGE_BOT_TOKEN` 使用舊 token

---

#### Step 2：刪除舊程序
```bash
cd /Users/caijunchang/.openclaw/workspace/skill-github-automation
pm2 delete ai-bot
```

---

#### Step 3：使用正確 token 重新啟動
```bash
SKILLFORGE_BOT_TOKEN="8357299731:AAHrBnVCEGjGy6b0g-3JhBArMnM9kt__Ncg" \
pm2 start scripts/ollama-telegram-bot.js --name ai-bot
```

**驗證啟動**：
```bash
sleep 2 && pm2 logs ai-bot --lines 10 --nostream
```

**成功標誌**：
```
🤖 Ollama 客服機器人 @caij_n8n_bot 已啟動！
🧠 使用模型: deepseek-r1:8b
📡 等待訊息...
```

---

#### Step 4：創建持久化配置
```bash
# 創建 ecosystem.config.js
cat > ecosystem.config.js <<'EOF'
module.exports = {
  apps: [{
    name: 'ai-bot',
    script: './scripts/ollama-telegram-bot.js',
    cwd: '/Users/caijunchang/.openclaw/workspace/skill-github-automation',
    env: {
      SKILLFORGE_BOT_TOKEN: '8357299731:AAHrBnVCEGjGy6b0g-3JhBArMnM9kt__Ncg',
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

# 保存 PM2 配置
pm2 save
```

---

#### Step 5：驗證重啟後配置有效
```bash
pm2 restart ai-bot
sleep 2 && pm2 logs ai-bot --lines 10 --nostream
```

**成功**：重啟後依然能正常啟動，無 "Token 無效" 錯誤

---

### 階段 2：修復 OpenClaw Gateway (@xiaoji_cai_bot)

#### Step 1：檢查 gateway 狀態
```bash
openclaw status
```

**發現**：
- Gateway: unreachable (ECONNREFUSED)
- Gateway service: stopped
- Channels: 空的

---

#### Step 2：修復配置問題
```bash
# 執行自動修復
openclaw doctor --fix
```

**移除的無效 key**：
- `models.providers.google.models[0].defaultOptions`
- `models.providers.google.models[1].defaultOptions`

---

#### Step 3：重新載入 LaunchAgent
```bash
# 完全卸載
launchctl bootout gui/$(id -u)/ai.openclaw.gateway

# 重新載入
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/ai.openclaw.gateway.plist

# 啟動服務
launchctl kickstart gui/$(id -u)/ai.openclaw.gateway
```

---

#### Step 4：驗證 gateway 啟動
```bash
sleep 3 && openclaw status
```

**成功標誌**：
```
Gateway: reachable 28ms
Gateway service: running (pid 50574)
Telegram: ON
```

---

#### Step 5：驗證 bot 身份
```bash
# 查看配置中的 token
jq -r '.channels.telegram.botToken' ~/.openclaw/openclaw.json

# 驗證 bot 名稱
curl -s "https://api.telegram.org/bot<TOKEN>/getMe" | jq -r '.result.username'
```

**結果**：`xiaoji_cai_bot` ✅

---

#### Step 6：檢查日誌
```bash
tail -30 ~/.openclaw/logs/gateway.log | grep -i telegram
```

**成功標誌**：
```
[telegram] [default] starting provider (@xiaoji_cai_bot)
```

---

## ✅ 修復結果

### Bot 狀態總覽

| Bot | 用途 | 狀態 | Token | 程序 |
|-----|------|------|-------|------|
| @caij_n8n_bot | Ollama 客服機器人 | ✅ 正常 | 8357299731:... | PM2 ai-bot |
| @xiaoji_cai_bot | OpenClaw 主控 | ✅ 正常 | 8056783828:... | OpenClaw gateway |
| @ollama168bot | 任務板通知 | ✅ 正常 | (另一個 token) | Dashboard server |

---

### 驗證測試

**@caij_n8n_bot 測試**：
```
用戶：你有
Bot：🤖 AI 回覆成功
```

**@xiaoji_cai_bot 測試**：
```
用戶：(發送訊息)
Bot：(正常回覆) ✅
```

---

## 📚 重要知識點

### 1. PM2 環境變數管理

**錯誤做法**：
```bash
# ❌ 環境變數會被系統變數覆蓋
pm2 restart ai-bot --update-env
```

**正確做法**：
```bash
# ✅ 使用 ecosystem.config.js 明確定義
pm2 start ecosystem.config.js
pm2 save
```

---

### 2. Telegram Bot Token 衝突

⚠️ **重要規則**：
- 同一個 token **不能**被多個程序同時使用 `getUpdates` 輪詢
- 否則會產生 **409 Conflict** 錯誤

**當前架構**（避免衝突）：
```
@caij_n8n_bot    → PM2 ai-bot（獨立 token）
@xiaoji_cai_bot  → OpenClaw gateway（獨立 token）
@ollama168bot    → Dashboard server（獨立 token）
```

---

### 3. OpenClaw Gateway 服務管理

**LaunchAgent 位置**：
```
~/Library/LaunchAgents/ai.openclaw.gateway.plist
```

**常用指令**：
```bash
# 查看狀態
openclaw status

# 啟動服務
openclaw gateway start

# 停止服務
openclaw gateway stop

# 手動重啟（當 start 失敗時）
launchctl bootout gui/$(id -u)/ai.openclaw.gateway
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/ai.openclaw.gateway.plist
launchctl kickstart gui/$(id -u)/ai.openclaw.gateway
```

**日誌位置**：
```
stdout: ~/.openclaw/logs/gateway.log
stderr: ~/.openclaw/logs/gateway.err.log
```

---

## 🔧 故障排查速查表

### 問題：PM2 bot 顯示 "Token 無效"

**診斷**：
```bash
pm2 env <id>  # 查看環境變數
```

**修復**：
1. 刪除舊程序：`pm2 delete <name>`
2. 使用正確環境變數啟動
3. 創建 ecosystem.config.js
4. `pm2 save` 持久化

---

### 問題：Gateway unreachable

**診斷**：
```bash
openclaw status  # 查看 gateway 狀態
tail -50 ~/.openclaw/logs/gateway.err.log  # 查看錯誤
```

**修復**：
1. 檢查配置：`openclaw doctor --fix`
2. 重啟服務：手動 launchctl 操作
3. 驗證：`openclaw status`

---

### 問題：Telegram channel 未啟動

**診斷**：
```bash
openclaw status  # 查看 Channels 區塊
```

**修復**：
1. 確認 `~/.openclaw/openclaw.json` 中 `channels.telegram.enabled = true`
2. 重啟 gateway
3. 檢查日誌：`grep telegram ~/.openclaw/logs/gateway.log`

---

## 📊 時間軸

| 時間 | 事件 |
|------|------|
| 13:30 | 🔴 用戶回報 @xiaoji_cai_bot 無回應 |
| 13:32 | 🔍 發現 PM2 ai-bot 使用錯誤 token |
| 13:35 | ✅ 修復 @caij_n8n_bot（PM2 ai-bot） |
| 13:40 | 🔍 發現 gateway 服務停止 |
| 13:45 | 🔧 修復配置 + 重啟 gateway |
| 13:50 | ✅ @xiaoji_cai_bot 恢復正常 |
| 13:55 | 📝 創建此修復文檔 |
| 14:00 | ✅ 驗證兩個 bot 均正常運作 |

**總耗時**：約 30 分鐘

---

## 🎯 預防措施

### 1. 配置管理
- ✅ 所有 PM2 程序使用 `ecosystem.config.js`
- ✅ 環境變數明確定義，不依賴系統繼承
- ✅ 執行 `pm2 save` 持久化配置

### 2. 服務監控
```bash
# 定期檢查（建議加入 cron）
*/15 * * * * openclaw status --quiet | grep -q "unreachable" && echo "Gateway down!" | /path/to/notify.sh
*/15 * * * * pm2 list | grep -q "errored" && echo "PM2 service down!" | /path/to/notify.sh
```

### 3. 文檔維護
- ✅ 維護最新的 bot 架構圖（見下方）
- ✅ 記錄所有 token 對應的 bot 名稱
- ✅ 更新故障排查流程

---

## 🗺️ 系統架構圖

```
小蔡 Telegram 生態系統
│
├── @caij_n8n_bot（Ollama 客服機器人）
│   ├── 程序：PM2 ai-bot
│   ├── 位置：~/.openclaw/workspace/skill-github-automation/scripts/ollama-telegram-bot.js
│   ├── 配置：ecosystem.config.js
│   ├── Token：8357299731:AAHrBnVCEGjGy6b0g-3JhBArMnM9kt__Ncg
│   ├── 模型：deepseek-r1:8b（本地 Ollama）
│   └── 用途：SkillForge 產品客服
│
├── @xiaoji_cai_bot（小蔡主控）
│   ├── 程序：OpenClaw gateway
│   ├── 服務：LaunchAgent (ai.openclaw.gateway)
│   ├── 配置：~/.openclaw/openclaw.json
│   ├── Token：8056783828:AAHJ4S5aIfcFbA9DlYsWGTSngUX7lhZ7xnY
│   ├── 模型：kimi-k2.5（預設）+ 多模型 fallback
│   └── 用途：個人助理 + 工作流程自動化
│
└── @ollama168bot（任務板通知）
    ├── 程序：Dashboard server (port 3011)
    ├── 位置：openclaw任務面版設計/server/
    ├── 配置：server/.env
    ├── Token：(另一個獨立 token)
    └── 用途：任務狀態通知
```

---

## 📝 待辦事項

- [ ] 建立自動化健康檢查腳本
- [ ] 將修復流程整合到 `scripts/recover-telegram-bots.sh`
- [ ] 更新 BOOTSTRAP.md 加入故障排查章節
- [ ] 考慮使用 webhook 模式取代 polling（減少衝突風險）

---

## 🤝 相關文檔

- [OpenClaw 修復摘要 | 2026-02-14](./2026-02-14-openclaw-recovery.md)
- [技術安全更新 | 2026-02-15](../TECH-SECURITY-UPDATE-2026-02-15.md)
- [智能記憶系統 Quick Start](../QUICK-START-智能召回.md)

---

**建立時間**：2026-02-16 14:00
**維護者**：小蔡（Claude）
**版本**：v1.0
