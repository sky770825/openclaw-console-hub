# LINE OA (Official Account) 串接指南

## 目標
將 NEUXA Lite 下載頁面與 LINE OA 串接，實現：
1. 用戶點擊「立即領取」→ 導向 LINE OA
2. LINE OA 自動發送下載連結
3. 收集用戶資料（可選）

---

## 步驟 1: 建立 LINE Official Account

### 1.1 前往 LINE Developers
- 網址: https://developers.line.biz/
- 登入你的 LINE 帳號

### 1.2 建立 Provider
1. 點擊「Create New Provider」
2. 名稱填: `NEUXA`
3. 點擊「Create」

### 1.3 建立 Channel (Messaging API)
1. 在 Provider 頁面點擊「Create a Messaging API channel」
2. 填寫基本資訊：
   - Channel name: `NEUXA Lite 下載`
   - Channel description: `NEUXA Lite 一鍵安裝與技術支援`
   - Category: `IT / Technology`
   - Subcategory: `Software`
3. 點擊「Create」

### 1.4 取得重要憑證
建立完成後，在「Basic settings」頁面複製：
- **Channel ID** (例如: `1234567890`)
- **Channel Secret** (例如: `abc123def456...`)

在「Messaging API」頁面：
- **Channel access token (long-lived)** → 點擊「Issue」產生

---

## 步驟 2: 設定 Webhook (n8n)

### 2.1 在 n8n 建立 LINE Webhook Workflow

```json
{
  "name": "LINE OA - NEUXA Lite Download",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "line-webhook"
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "channelAccessToken": "={{ $env.LINE_CHANNEL_TOKEN }}",
        "text": "🎉 歡迎使用 NEUXA Lite!\n\n這是您的一鍵安裝連結:\n\n🍎 Mac/Linux:\ncurl -fsSL https://dazzling-lollipop-5e6eb6.netlify.app/install | bash\n\n🪟 Windows:\nirm https://dazzling-lollipop-5e6eb6.netlify.app/install.ps1 | iex\n\n💡 安裝說明:\nhttps://dazzling-lollipop-5e6eb6.netlify.app/download.html\n\n有任何問題請隨時問我！"
      },
      "name": "Send Welcome Message",
      "type": "n8n-nodes-base.line",
      "typeVersion": 1,
      "position": [450, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Send Welcome Message",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

### 2.2 設定環境變數

在 n8n 的 Docker Compose 中加入：

```yaml
environment:
  - LINE_CHANNEL_TOKEN=你的_Channel_Access_Token
```

### 2.3 取得 Webhook URL

啟動 n8n workflow 後，Webhook 節點會顯示：
```
https://你的-n8n-網址/webhook/line-webhook
```

### 2.4 在 LINE Developer 設定 Webhook

1. 前往 LINE Developers → 你的 Channel → Messaging API
2. 找到「Webhook URL」
3. 貼上 n8n 的 webhook URL
4. 開啟「Use webhook」
5. 點擊「Verify」驗證

---

## 步驟 3: 修改下載頁面導向 LINE

### 3.1 更新 index.html 的按鈕連結

把這行：
```html
<a href="download.html" class="btn btn-primary">立即領取 NEUXA Lite</a>
```

改成：
```html
<a href="https://line.me/R/ti/p/@你的_LINE_OA_ID" class="btn btn-primary">立即領取 NEUXA Lite</a>
```

### 3.2 取得 LINE OA ID

在 LINE Developers → 你的 Channel → Messaging API → "Your user ID" 或 "Basic Information" 中的 **QR code** 下方的 ID。

或者使用 **LINE Add Friend URL**：
```
https://line.me/R/ti/p/@740ihcar
```

（你已經有這個了！）

---

## 步驟 4: 進階功能（可選）

### 4.1 收集用戶資料

在 n8n workflow 中加入:
1. 在「Send Welcome Message」後加入「Wait」節點（等 5 秒）
2. 加入「LINE Send Message」發送問卷連結
3. 用 Google Sheets 或 Supabase 儲存回覆

### 4.2 自動回覆常見問題

加入「IF」節點判斷用戶訊息：
- 包含「安裝」→ 發送安裝教學
- 包含「Windows」→ 發送 Windows 專屬指令
- 包含「Mac」→ 發送 Mac 專屬指令

### 4.3 人工客服轉接

加入「Switch」節點：
- 關鍵字包含「人工」→ 發通知給你（Telegram/Email）
- 其他 → 自動回覆

---

## 測試流程

1. 用手機掃描 LINE OA QR Code 加入好友
2. 發送任意訊息（例如「hi」）
3. 應該收到自動回覆（下載連結）
4. 點擊網站「立即領取」按鈕
5. 應該跳轉到 LINE OA

---

## 故障排除

| 問題 | 解法 |
|------|------|
| Webhook 驗證失敗 | 確認 n8n 網址是 https 且公開可訪問 |
| 收不到自動回覆 | 檢查 Channel Access Token 是否正確 |
| LINE 顯示 "404" | 確認 LINE OA ID 正確，有包含 @ |

---

## 下一步

需要我幫你:
1. 在 n8n 建立這個 workflow？
2. 建立更複雜的自動回覆邏輯？
3. 串接資料庫儲存用戶資料？