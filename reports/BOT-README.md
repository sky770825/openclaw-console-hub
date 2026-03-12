# SkillForge 客服機器人使用指南

## 🤖 兩種客服機器人

### 1. 本地測試版 `support-bot.js`
用於測試和開發，在終端機互動

```bash
# 互動模式
node scripts/support-bot.js

# 測試模式（預設問題）
node scripts/support-bot.js --test

# 單一問題
node scripts/support-bot.js "怎麼購買？"
```

### 2. Telegram 機器人 `telegram-bot.js`
實際部署在 Telegram，自動回覆客戶

---

## 📱 Telegram 機器人部署步驟

### Step 1: 創建 Bot
1. 在 Telegram 搜尋 @BotFather
2. 發送 `/newbot`
3. 輸入名稱（例如：SkillForge助手）
4. 輸入用戶名（例如：skillforge_support_bot）
5. **保存 Bot Token**（看起來像：`123456789:ABCdefGHIjklMNOpqrsTUVwxyz`）

### Step 2: 設定環境變數
```bash
# 在 ~/.zshrc 或 ~/.bash_profile 加入
export SKILLFORGE_BOT_TOKEN="你的_Bot_Token"
export ADMIN_CHAT_ID="你的_Telegram_ID"  # 選填，用於接收轉人工通知

# 重新載入設定
source ~/.zshrc
```

### Step 3: 啟動機器人
```bash
cd skill-github-automation
node scripts/telegram-bot.js
```

### Step 4: 測試
1. 在 Telegram 搜尋你的機器人
2. 發送訊息「怎麼購買？」
3. 機器人會自動回覆購買流程

---

## 🎯 機器人能回答的問題

### ✅ 自動回答
- **購買相關**：怎麼買、付款方式、USDT地址、多久收到License
- **產品功能**：有什麼功能、支援什麼、版本差異
- **推薦分潤**：推薦碼怎麼用、有什麼好處、分潤多少
- **技術支援**：安裝環境、Token申請、怎麼使用
- **授權問題**：License會不會過期、可以轉讓嗎
- **聯繫方式**：客服怎麼聯繫

### 📨 轉人工處理
- 無法識別的問題會自動轉給 @gousmaaa
- 管理員會收到通知

---

## 📊 查看統計

機器人每分鐘會顯示統計：
```
📊 客服統計
   總訊息: 150
   自動回覆: 120 (80.0%)
   轉人工: 30 (20.0%)
```

---

## 🔧 客製化知識庫

編輯 `scripts/telegram-bot.js` 的 `KNOWLEDGE_BASE`：

```javascript
const KNOWLEDGE_BASE = {
  purchase: {
    keywords: ['購買', '付款', ...],  // 關鍵字列表
    responses: ['回覆內容1', '回覆內容2']  // 隨機選擇
  }
};
```

---

## 🚀 常駐運行（進階）

使用 `pm2` 讓機器人背景運行：

```bash
# 安裝 pm2
npm install -g pm2

# 啟動機器人
pm2 start scripts/telegram-bot.js --name skillforge-bot

# 查看狀態
pm2 status

# 查看日誌
pm2 logs skillforge-bot

# 重啟
pm2 restart skillforge-bot

# 開機自動啟動
pm2 startup
pm2 save
```

---

## ⚠️ 注意事項

1. **不要公開 Bot Token** - 這是機器人的密碼
2. **定期檢查日誌** - 確保機器人正常運行
3. **更新知識庫** - 根據客戶常見問題持續優化
4. **設定管理員** - 建議設定 ADMIN_CHAT_ID 接收轉人工通知

---

## 💡 使用場景

| 場景 | 建議方案 |
|------|---------|
| 測試知識庫 | 本地 support-bot.js |
| 正式客服 | Telegram telegram-bot.js |
| 多平台 | 未來可擴展 Discord/Slack |

---

**需要幫助？** 聯繫 @gousmaaa