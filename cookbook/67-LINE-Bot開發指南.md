---
tags: [LINE, Bot, Messaging-API, Webhook, Flex-Message, LIFF, Rich-Menu, Quick-Reply]
date: 2026-03-07
category: cookbook
---

# 67 — LINE Bot 開發指南

> 適用對象：後端工程師、全端工程師、接案開發者
> 與 22-LINE-OA設定指南 的差異：22 號偏 OA 後台設定，本篇專注 Bot 程式開發
> 最後更新：2026-03-07

---

## 目錄

1. [LINE Bot vs LINE OA 差異](#1-line-bot-vs-line-oa-差異)
2. [Channel 設定與 Token 取得](#2-channel-設定與-token-取得)
3. [Webhook 接收與回覆流程](#3-webhook-接收與回覆流程)
4. [訊息類型總覽](#4-訊息類型總覽)
5. [Flex Message 設計](#5-flex-message-設計)
6. [Quick Reply 與 Rich Menu](#6-quick-reply-與-rich-menu)
7. [LIFF 整合](#7-liff-整合)
8. [常見情境實作](#8-常見情境實作)
9. [部署與上線 Checklist](#9-部署與上線-checklist)
10. [除錯與常見問題](#10-除錯與常見問題)

---

## 1. LINE Bot vs LINE OA 差異

| 項目 | LINE OA（官方帳號後台） | LINE Bot（程式開發） |
|------|------------------------|---------------------|
| 設定位置 | LINE Official Account Manager | LINE Developers Console |
| 回覆方式 | 關鍵字回覆 / 手動回覆 | 程式邏輯判斷回覆 |
| 彈性 | 低，只能設固定回覆 | 高，可串資料庫、AI、API |
| 需要伺服器 | 不需要 | 需要（接 Webhook） |
| 適合場景 | 簡單自動回覆、推播 | 會員系統、預約、查詢、客服 Bot |
| 費用 | 推播要錢，回覆免費 | 同左（Messaging API 共用計費） |

**關鍵概念**：一個 LINE OA 帳號可以同時開啟 Messaging API（變成 Bot），兩者不衝突。開啟後，OA 後台的自動回覆會被停用，改由你的 Webhook 程式處理。

---

## 2. Channel 設定與 Token 取得

### 2.1 前往 LINE Developers Console

```
https://developers.line.biz/console/
```

用 LINE 帳號登入 → 選擇或建立 Provider → 建立 **Messaging API Channel**。

### 2.2 必要設定

| 設定項 | 說明 |
|--------|------|
| Channel name | Bot 名稱（會顯示在聊天室） |
| Channel description | 描述（用戶加好友時看到） |
| Category / Subcategory | 選最接近的業種 |
| Email | 聯絡 email |

### 2.3 取得 Token 與 Secret

建立完成後，在 Channel 頁面取得：

```
Channel ID:          1234567890
Channel Secret:      abcdef1234567890abcdef1234567890
Channel Access Token: 長長一串（點 Issue 產生）
```

> **安全提醒**：Channel Secret 和 Access Token 務必放 `.env`，不可 commit 到 git。

### 2.4 環境變數設定

```bash
# .env
LINE_CHANNEL_ID=1234567890
LINE_CHANNEL_SECRET=abcdef1234567890abcdef1234567890
LINE_CHANNEL_ACCESS_TOKEN=你的長token
LINE_WEBHOOK_URL=https://your-domain.com/webhook/line
```

---

## 3. Webhook 接收與回覆流程

### 3.1 流程圖

```
用戶發訊息
   ↓
LINE Platform
   ↓ POST /webhook/line
你的伺服器（驗證簽章 → 解析事件 → 回覆）
   ↓ Reply API
LINE Platform → 用戶收到回覆
```

### 3.2 Webhook URL 設定

在 LINE Developers Console → Messaging API → Webhook URL 填入你的 HTTPS endpoint。

```
https://your-domain.com/webhook/line
```

> 必須是 HTTPS，本地開發可用 ngrok：`ngrok http 3000`

### 3.3 Node.js + Express Webhook Handler

```javascript
// line-webhook.js
const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const app = express();

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

// LINE 需要 raw body 來驗證簽章
app.use('/webhook/line', express.raw({ type: 'application/json' }));

// 驗證 LINE 簽章
function validateSignature(body, signature) {
  const hash = crypto
    .createHmac('SHA256', LINE_CHANNEL_SECRET)
    .update(body)
    .digest('base64');
  return hash === signature;
}

// 回覆訊息
async function replyMessage(replyToken, messages) {
  await axios.post('https://api.line.me/v2/bot/message/reply', {
    replyToken,
    messages: Array.isArray(messages) ? messages : [messages]
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
    }
  });
}

// Webhook endpoint
app.post('/webhook/line', async (req, res) => {
  const signature = req.headers['x-line-signature'];

  if (!validateSignature(req.body, signature)) {
    return res.status(403).send('Invalid signature');
  }

  const body = JSON.parse(req.body);
  const events = body.events;

  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userText = event.message.text;
      const userId = event.source.userId;

      // 簡單回覆範例
      await replyMessage(event.replyToken, {
        type: 'text',
        text: `你說了：${userText}`
      });
    }

    if (event.type === 'follow') {
      // 用戶加好友
      await replyMessage(event.replyToken, {
        type: 'text',
        text: '歡迎加入！請輸入「會員綁定」開始使用。'
      });
    }
  }

  res.status(200).send('OK');
});

app.listen(3000, () => console.log('LINE Bot running on port 3000'));
```

### 3.4 使用官方 SDK（推薦）

```bash
npm install @line/bot-sdk
```

```javascript
const line = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken,
});

// Express middleware 自動驗證簽章
app.post('/webhook/line',
  line.middleware(config),
  async (req, res) => {
    const events = req.body.events;
    await Promise.all(events.map(handleEvent));
    res.status(200).end();
  }
);

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return;

  return client.replyMessage({
    replyToken: event.replyToken,
    messages: [{ type: 'text', text: `Echo: ${event.message.text}` }]
  });
}
```

---

## 4. 訊息類型總覽

### 4.1 基本類型

| 類型 | type 值 | 說明 |
|------|---------|------|
| 文字 | `text` | 純文字，最多 5000 字 |
| 圖片 | `image` | 需提供 originalContentUrl + previewImageUrl |
| 影片 | `video` | 需提供影片 URL + 預覽圖 |
| 音訊 | `audio` | 需提供音訊 URL + duration |
| 位置 | `location` | 經緯度 + 地址 |
| 貼圖 | `sticker` | packageId + stickerId |
| Flex | `flex` | 自定義卡片（見下節） |

### 4.2 圖片訊息範例

```json
{
  "type": "image",
  "originalContentUrl": "https://example.com/image.jpg",
  "previewImageUrl": "https://example.com/image-preview.jpg"
}
```

> 圖片必須是 HTTPS、JPEG/PNG、原圖最大 10MB、預覽圖最大 1MB。

### 4.3 一次回覆多則訊息

Reply API 最多一次送 **5 則訊息**：

```javascript
await replyMessage(replyToken, [
  { type: 'text', text: '查詢結果如下：' },
  { type: 'image', originalContentUrl: '...', previewImageUrl: '...' },
  { type: 'text', text: '需要其他協助嗎？' }
]);
```

---

## 5. Flex Message 設計

### 5.1 什麼是 Flex Message

Flex Message 是 LINE 獨有的卡片訊息格式，可以自由排版，像寫 HTML 一樣組合元件。

### 5.2 設計工具

```
Flex Message Simulator：
https://developers.line.biz/flex-message-simulator/
```

在 Simulator 拖拉設計 → 匯出 JSON → 直接貼進程式碼。

### 5.3 基本結構

```
Flex Message
  └── Container（bubble 或 carousel）
       └── Block（header / hero / body / footer）
            └── Component（box / text / image / button / separator）
```

### 5.4 產品卡片範例

```json
{
  "type": "flex",
  "altText": "產品資訊",
  "contents": {
    "type": "bubble",
    "hero": {
      "type": "image",
      "url": "https://example.com/product.jpg",
      "size": "full",
      "aspectRatio": "20:13",
      "aspectMode": "cover"
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "text",
          "text": "精品手沖咖啡",
          "weight": "bold",
          "size": "xl"
        },
        {
          "type": "text",
          "text": "NT$ 180",
          "size": "lg",
          "color": "#e74c3c",
          "margin": "md"
        },
        {
          "type": "text",
          "text": "嚴選衣索比亞耶加雪菲，花香果酸，回甘持久。",
          "size": "sm",
          "color": "#666666",
          "margin": "md",
          "wrap": true
        }
      ]
    },
    "footer": {
      "type": "box",
      "layout": "horizontal",
      "spacing": "sm",
      "contents": [
        {
          "type": "button",
          "style": "primary",
          "action": {
            "type": "uri",
            "label": "立即訂購",
            "uri": "https://example.com/order"
          }
        },
        {
          "type": "button",
          "style": "secondary",
          "action": {
            "type": "message",
            "label": "更多商品",
            "text": "查看菜單"
          }
        }
      ]
    }
  }
}
```

### 5.5 Carousel（輪播多張卡片）

```json
{
  "type": "flex",
  "altText": "商品列表",
  "contents": {
    "type": "carousel",
    "contents": [
      { "type": "bubble", "body": { "...": "第一張卡片" } },
      { "type": "bubble", "body": { "...": "第二張卡片" } },
      { "type": "bubble", "body": { "...": "第三張卡片" } }
    ]
  }
}
```

> Carousel 最多 **12 張** bubble。

---

## 6. Quick Reply 與 Rich Menu

### 6.1 Quick Reply

訊息底部出現的快速按鈕列，用戶點擊後自動發送指定文字。

```json
{
  "type": "text",
  "text": "請選擇服務：",
  "quickReply": {
    "items": [
      {
        "type": "action",
        "action": { "type": "message", "label": "預約諮詢", "text": "我要預約" }
      },
      {
        "type": "action",
        "action": { "type": "message", "label": "查詢進度", "text": "查詢進度" }
      },
      {
        "type": "action",
        "action": { "type": "uri", "label": "官方網站", "uri": "https://example.com" }
      },
      {
        "type": "action",
        "action": {
          "type": "datetimepicker",
          "label": "選擇日期",
          "data": "action=selectDate",
          "mode": "date"
        }
      }
    ]
  }
}
```

> Quick Reply 最多 **13 個** action。點擊後按鈕列消失。

### 6.2 Rich Menu

Rich Menu 是聊天室底部的固定選單圖片，可分區設定不同動作。

```javascript
// 建立 Rich Menu（用 API）
const richMenu = {
  size: { width: 2500, height: 1686 },
  selected: true,
  name: "主選單",
  chatBarText: "開啟選單",
  areas: [
    {
      bounds: { x: 0, y: 0, width: 833, height: 843 },
      action: { type: "message", text: "預約服務" }
    },
    {
      bounds: { x: 833, y: 0, width: 834, height: 843 },
      action: { type: "message", text: "查詢紀錄" }
    },
    {
      bounds: { x: 1667, y: 0, width: 833, height: 843 },
      action: { type: "uri", uri: "https://example.com" }
    }
  ]
};

// 1. 建立 Rich Menu
const res = await axios.post('https://api.line.me/v2/bot/richmenu', richMenu, {
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }
});
const richMenuId = res.data.richMenuId;

// 2. 上傳圖片（2500x1686 或 2500x843）
await axios.post(
  `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
  imageBuffer,
  { headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'image/png' } }
);

// 3. 設為預設
await axios.post(
  `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
  {},
  { headers: { Authorization: `Bearer ${TOKEN}` } }
);
```

---

## 7. LIFF 整合

### 7.1 什麼是 LIFF

LIFF（LINE Front-end Framework）讓你在 LINE 內開啟網頁應用程式，可以取得用戶 LINE 資訊（userId、displayName、pictureUrl），實現會員綁定、表單填寫等功能。

### 7.2 建立 LIFF App

LINE Developers Console → 你的 Channel → LIFF → Add：

| 設定 | 說明 |
|------|------|
| Size | Full / Tall / Compact（全螢幕/大半/小半） |
| Endpoint URL | 你的網頁 URL（HTTPS） |
| Scope | profile, openid, email（看需求勾選） |

建立後取得 **LIFF ID**（如 `1234567890-abcdefgh`）。

### 7.3 LIFF 網頁開發

```html
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>會員綁定</title>
  <script charset="utf-8" src="https://static.line-scdn.net/liff/edge/versions/2.22.0/sdk.js"></script>
</head>
<body>
  <div id="app">
    <h2>會員綁定</h2>
    <p id="userName">載入中...</p>
    <input type="tel" id="phone" placeholder="請輸入手機號碼">
    <button onclick="bindMember()">確認綁定</button>
  </div>

  <script>
    const LIFF_ID = '1234567890-abcdefgh';

    async function initLiff() {
      await liff.init({ liffId: LIFF_ID });

      if (!liff.isLoggedIn()) {
        liff.login();
        return;
      }

      const profile = await liff.getProfile();
      document.getElementById('userName').textContent =
        `${profile.displayName}，請綁定您的手機號碼：`;

      // profile 包含：
      // profile.userId       — LINE userId（唯一識別）
      // profile.displayName  — 顯示名稱
      // profile.pictureUrl   — 大頭貼 URL
      // profile.statusMessage — 狀態消息
    }

    async function bindMember() {
      const profile = await liff.getProfile();
      const phone = document.getElementById('phone').value;

      const res = await fetch('https://your-api.com/api/member/bind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId: profile.userId,
          displayName: profile.displayName,
          phone: phone
        })
      });

      if (res.ok) {
        // 綁定成功，發訊息回聊天室
        if (liff.isInClient()) {
          liff.sendMessages([{
            type: 'text',
            text: `會員綁定完成！手機：${phone}`
          }]);
        }
        liff.closeWindow();
      } else {
        alert('綁定失敗，請稍後再試');
      }
    }

    initLiff();
  </script>
</body>
</html>
```

### 7.4 LIFF URL 格式

```
https://liff.line.me/{LIFF_ID}
```

可以放在 Rich Menu、Flex Message 按鈕、或直接傳給用戶。

---

## 8. 常見情境實作

### 8.1 會員綁定流程

```
用戶加好友 → Bot 歡迎訊息 + Quick Reply「綁定會員」
   ↓
用戶點擊 → Bot 回 LIFF 連結
   ↓
LIFF 頁面取得 LINE userId → 用戶輸入手機 → API 寫入資料庫
   ↓
綁定完成 → Bot 推播確認訊息
```

### 8.2 預約查詢

```javascript
// Webhook handler 中
if (userText === '查詢預約') {
  const userId = event.source.userId;
  const bookings = await db.query(
    'SELECT * FROM bookings WHERE line_user_id = $1 AND date >= NOW() ORDER BY date',
    [userId]
  );

  if (bookings.length === 0) {
    return replyMessage(replyToken, { type: 'text', text: '目前沒有預約紀錄。' });
  }

  // 用 Flex Message 顯示預約列表
  const bubbles = bookings.map(b => ({
    type: 'bubble',
    body: {
      type: 'box', layout: 'vertical',
      contents: [
        { type: 'text', text: b.service_name, weight: 'bold', size: 'lg' },
        { type: 'text', text: `日期：${b.date}`, size: 'sm', margin: 'md' },
        { type: 'text', text: `時段：${b.time_slot}`, size: 'sm' },
        { type: 'text', text: `狀態：${b.status}`, size: 'sm', color: '#27ae60' }
      ]
    }
  }));

  return replyMessage(replyToken, {
    type: 'flex', altText: '你的預約紀錄',
    contents: { type: 'carousel', contents: bubbles }
  });
}
```

### 8.3 推播通知

```javascript
// Push Message（主動推給用戶，會計費）
await axios.post('https://api.line.me/v2/bot/message/push', {
  to: userId,
  messages: [{ type: 'text', text: '提醒：您明天 14:00 有一個預約。' }]
}, {
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }
});

// Multicast（推給多人，最多 500 人）
await axios.post('https://api.line.me/v2/bot/message/multicast', {
  to: [userId1, userId2, userId3],
  messages: [{ type: 'text', text: '本週特價活動開跑！' }]
}, {
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }
});
```

### 8.4 客服自動回覆 + 轉真人

```javascript
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return;
  const text = event.message.text;

  // 關鍵字比對
  const faq = {
    '營業時間': '我們的營業時間為週一到週五 09:00-18:00，週末休息。',
    '地址': '台北市信義區松仁路 100 號',
    '價目表': null  // 用 Flex Message
  };

  for (const [keyword, answer] of Object.entries(faq)) {
    if (text.includes(keyword)) {
      if (answer) {
        return client.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: 'text', text: answer }]
        });
      }
    }
  }

  // 未匹配到 → 轉真人
  return client.replyMessage({
    replyToken: event.replyToken,
    messages: [{
      type: 'text',
      text: '感謝您的訊息，客服人員會盡快回覆您！',
      quickReply: {
        items: [
          { type: 'action', action: { type: 'message', label: '常見問題', text: '常見問題' } }
        ]
      }
    }]
  });
}
```

---

## 9. 部署與上線 Checklist

```
[ ] Channel Access Token 已產生並放入 .env
[ ] Webhook URL 已設定（HTTPS）
[ ] Webhook Verification 通過（LINE Console 的 Verify 按鈕）
[ ] 自動回覆關閉（Use webhooks = Enabled）
[ ] 加入好友的歡迎訊息已測試
[ ] Rich Menu 圖片已上傳並設為預設
[ ] LIFF App 已建立並測試
[ ] 回覆訊息邏輯已測試（文字 / Flex / Quick Reply）
[ ] 推播訊息功能已測試
[ ] 錯誤處理完善（replyToken 過期、API 失敗）
[ ] 日誌記錄完善（記錄 userId、事件類型、回覆結果）
```

---

## 10. 除錯與常見問題

| 問題 | 原因 | 解法 |
|------|------|------|
| Webhook 回 400 | 簽章驗證失敗 | 確認 Channel Secret 正確、raw body 未被 parse |
| replyToken 無效 | Token 過期（只能用一次，30 秒內） | 確認沒有重複 reply、處理速度夠快 |
| 圖片不顯示 | 非 HTTPS 或格式不支援 | 確認 URL 是 HTTPS + JPEG/PNG |
| LIFF 白畫面 | Endpoint URL 未更新 | LINE Console 更新 LIFF Endpoint |
| Rich Menu 不出現 | 未設為預設或未上傳圖片 | 確認 3 步驟都做完 |
| 推播失敗 429 | 超過速率限制 | 免費版 100,000 req/min，降速或升級 |

### 速率限制

| API | 限制 |
|-----|------|
| Reply | 無限制（回覆不計費） |
| Push | 依方案月免費額度 |
| API 呼叫 | 100,000 次/分鐘 |

### 測試技巧

```bash
# 用 curl 模擬 LINE Webhook（測試用，不含簽章驗證）
curl -X POST http://localhost:3000/webhook/line \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{
      "type": "message",
      "replyToken": "test-token",
      "source": { "userId": "U1234", "type": "user" },
      "message": { "type": "text", "text": "測試訊息" }
    }]
  }'
```

---

> **延伸閱讀**：22-LINE-OA設定指南.md（OA 後台設定）、24-通訊平台串接指南.md（其他平台比較）、57-Webhook架構與事件驅動.md（Webhook 深入）
