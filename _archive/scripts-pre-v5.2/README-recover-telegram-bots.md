# Telegram Bot 一鍵修復工具

> **版本**：v1.0
> **建立時間**：2026-02-16
> **適用對象**：@caij_n8n_bot + @xiaoji_cai_bot

---

## 🚀 快速使用

```bash
# 一鍵修復（推薦）
~/.openclaw/workspace/scripts/recover-telegram-bots.sh

# 或使用相對路徑
cd ~/.openclaw/workspace
./scripts/recover-telegram-bots.sh
```

---

## 📋 功能特性

### 1. **智能診斷**
自動檢測以下問題：
- ✅ PM2 ai-bot 程序狀態
- ✅ PM2 環境變數 token 是否正確
- ✅ OpenClaw gateway 可達性
- ✅ Gateway 服務運行狀態
- ✅ Telegram channel 啟用狀態
- ✅ 配置檔案有效性

### 2. **自動修復**
根據診斷結果執行對應修復：

**PM2 ai-bot**：
1. 刪除舊程序
2. 創建 ecosystem.config.js
3. 啟動新程序
4. 驗證啟動狀態
5. 保存 PM2 配置

**OpenClaw Gateway**：
1. 修復配置問題（doctor --fix）
2. 停止舊服務
3. 重新載入 LaunchAgent
4. 啟動 gateway
5. 驗證 Telegram channel

### 3. **完整驗證**
- ✅ 驗證 Telegram token 有效性
- ✅ 確認 bot 名稱正確
- ✅ 檢查程序運行狀態
- ✅ 最終健康檢查

---

## 📖 使用場景

### 場景 1：Bot 無回應
```bash
# 症狀
用戶：給 @xiaoji_cai_bot 發訊息
結果：沒有回覆

# 解決方案
./scripts/recover-telegram-bots.sh
```

### 場景 2：PM2 ai-bot 錯誤
```bash
# 症狀
pm2 logs ai-bot --err
# 輸出：❌ Bot Token 無效

# 解決方案
./scripts/recover-telegram-bots.sh
```

### 場景 3：Gateway 停止
```bash
# 症狀
openclaw status
# 輸出：Gateway: unreachable

# 解決方案
./scripts/recover-telegram-bots.sh
```

### 場景 4：系統重啟後
```bash
# 定期檢查（建議加入 cron）
# 每 30 分鐘檢查一次
*/30 * * * * ~/.openclaw/workspace/scripts/recover-telegram-bots.sh --auto
```

---

## 🎨 輸出示例

### 正常狀態（無需修復）
```
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║     Telegram Bot 一鍵修復工具 v1.0                    ║
║     自動診斷並修復 @caij_n8n_bot + @xiaoji_cai_bot   ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝

ℹ 檢查系統環境...
✅ 環境檢查通過

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  診斷 PM2 ai-bot (@caij_n8n_bot)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ PM2 ai-bot 狀態: online
✅ PM2 ai-bot 狀態正常

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  診斷 OpenClaw Gateway (@xiaoji_cai_bot)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ OpenClaw Gateway 狀態正常

✅ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅   所有 Bot 狀態正常，無需修復！
✅ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 需要修復
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  診斷 PM2 ai-bot (@caij_n8n_bot)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ 發現 'Bot Token 無效' 錯誤 (5 次)

⚠️  PM2 ai-bot 需要修復

是否開始自動修復？[Y/n] y

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  修復 PM2 ai-bot
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ 步驟 1/5: 停止並刪除舊程序...
ℹ 步驟 2/5: 創建 ecosystem.config.js...
✅ 配置檔案已創建
ℹ 步驟 3/5: 啟動 ai-bot...
ℹ 步驟 4/5: 等待服務啟動...
ℹ 步驟 5/5: 驗證啟動狀態...
✅ ai-bot 啟動成功
✅ PM2 ai-bot 修復完成

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  驗證修復結果
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ 驗證 @caij_n8n_bot...
✅ Token 驗證成功: @caij_n8n_bot
✅ @caij_n8n_bot: ✅ 正常運作

✅ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅   所有 Telegram Bot 修復成功！
✅ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🔧 進階選項

### 環境變數
```bash
# 自訂 token（不建議）
export CAIJ_N8N_TOKEN="your-token-here"
export XIAOJI_CAI_TOKEN="your-token-here"
./scripts/recover-telegram-bots.sh
```

### 跳過確認（自動化場景）
```bash
# 修改腳本，將這行：
read -p "是否開始自動修復？[Y/n] " -n 1 -r

# 改為：
REPLY="y"
```

---

## 📊 診斷邏輯

### PM2 ai-bot 診斷返回值
- `0` - 狀態正常
- `1` - 需要修復（token 錯誤、錯誤日誌存在等）
- `2` - 程序不存在

### Gateway 診斷返回值
- `0` - 狀態正常
- `1` - 需要修復（unreachable、服務停止、channel 未啟用等）

---

## ⚠️ 注意事項

### 1. 必要環境
- ✅ PM2 已安裝並運行
- ✅ OpenClaw CLI 已安裝
- ✅ jq（JSON 處理工具）
- ✅ curl（網路請求）

### 2. 權限要求
- ✅ 可以執行 `pm2` 指令
- ✅ 可以執行 `openclaw` 指令
- ✅ 可以操作 `launchctl`（macOS LaunchAgent）

### 3. Token 安全
- ⚠️ 腳本中包含明文 token
- 🔒 建議：將腳本權限設為 `700`（僅擁有者可讀寫執行）
- 🔒 不要將腳本提交到公開的 git repository

```bash
chmod 700 ~/.openclaw/workspace/scripts/recover-telegram-bots.sh
```

---

## 🐛 故障排查

### 問題：腳本執行失敗
```bash
# 檢查執行權限
ls -la ~/.openclaw/workspace/scripts/recover-telegram-bots.sh

# 如果沒有執行權限
chmod +x ~/.openclaw/workspace/scripts/recover-telegram-bots.sh
```

### 問題：找不到 jq 指令
```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq
```

### 問題：PM2 修復失敗
```bash
# 手動檢查
pm2 list
pm2 logs ai-bot --err

# 清理並重試
pm2 delete ai-bot
pm2 kill
pm2 resurrect
./scripts/recover-telegram-bots.sh
```

### 問題：Gateway 修復失敗
```bash
# 查看詳細錯誤
tail -50 ~/.openclaw/logs/gateway.err.log

# 手動重啟
launchctl bootout gui/$(id -u)/ai.openclaw.gateway
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/ai.openclaw.gateway.plist
launchctl kickstart gui/$(id -u)/ai.openclaw.gateway
```

---

## 📚 相關文檔

- [修復流程詳細文檔](../memory/TELEGRAM-BOT-RECOVERY-2026-02-16.md)
- [OpenClaw 修復摘要](../memory/2026-02-14-openclaw-recovery.md)
- [PM2 Ecosystem 配置](../skill-github-automation/ecosystem.config.js)

---

## 🔄 更新日誌

### v1.0 (2026-02-16)
- ✅ 初始版本
- ✅ 支援 PM2 ai-bot 診斷與修復
- ✅ 支援 OpenClaw gateway 診斷與修復
- ✅ 彩色輸出與進度提示
- ✅ Token 驗證功能
- ✅ 最終健康檢查

---

**維護者**：達爾（Claude）
**最後更新**：2026-02-16
