---
tags: [n8n, workflow, automation, 自動化, webhook, 工作流, LINE, AI-客服]
date: 2026-03-05
category: cookbook
---

# 16 — n8n Workflow 模板（接案用）

> 8 套可直接複製建立的 n8n Workflow，涵蓋 LINE OA、AI 客服、表單通知、監控、報告等常見接案場景。
> 每個模板包含：適用場景、完整節點清單、關鍵設定、可貼上的 Code 節點 JSON、常見調整項目。

---

## 變數說明（全文通用）

| 變數 | 說明 | 取得方式 |
|------|------|---------|
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API 的 Channel Access Token | LINE Developers Console → Channel → Messaging API |
| `LINE_CHANNEL_SECRET` | LINE Channel Secret（驗簽用） | LINE Developers Console → Channel → Basic |
| `GOOGLE_GEMINI_API_KEY` | Google AI Studio API Key | https://aistudio.google.com/apikey |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token | @BotFather |
| `TELEGRAM_CHAT_ID` | Telegram 群組/個人 Chat ID | @userinfobot |
| `SUPABASE_URL` | Supabase 專案 URL | Supabase Dashboard → Settings → API |
| `SUPABASE_KEY` | Supabase service_role key | Supabase Dashboard → Settings → API |

> 在 n8n 中，以上值建議用 **Credentials** 或 **Environment Variables** 管理，不要寫死在節點裡。

---

## 1. LINE OA 關鍵字自動回覆

### 適用場景
- 客戶的 LINE 官方帳號需要自動回覆常見問題（營業時間、地址、價目表等）
- 不需要 AI，純關鍵字比對，快速、零成本
- 適合：餐廳、診所、美容院、小型店家

### 完整節點清單

```
[Webhook] → [Code: 解析 LINE Event] → [Switch: 關鍵字比對] → [HTTP Request: LINE Reply]
```

| # | 節點名稱 | 類型 | 用途 |
|---|---------|------|------|
| 1 | LINE Webhook | Webhook | 接收 LINE Platform 的 POST |
| 2 | Parse LINE Event | Code | 解析 LINE event，取出 replyToken、text |
| 3 | Keyword Router | Switch | 比對關鍵字，分流到不同回覆 |
| 4 | Reply - 營業時間 | HTTP Request | 呼叫 LINE Reply API 回覆營業時間 |
| 5 | Reply - 地址 | HTTP Request | 呼叫 LINE Reply API 回覆地址 |
| 6 | Reply - 預設回覆 | HTTP Request | 沒命中任何關鍵字的預設回覆 |

### 每個節點的關鍵設定

#### 節點 1：LINE Webhook

```
類型：Webhook
HTTP Method：POST
Path：line-webhook（n8n 會產生 URL，貼到 LINE Developers Console → Webhook URL）
Response Mode：Immediately（LINE 要求 1 秒內回 200）
```

#### 節點 2：Parse LINE Event（Code 節點）

```javascript
// n8n Code 節點 — 解析 LINE Webhook Event
const body = $input.first().json.body;

// LINE 會送 events 陣列，通常只有一個
const event = body.events[0];

// 非文字訊息直接跳過
if (!event || event.type !== 'message' || event.message.type !== 'text') {
  return [{ json: { skip: true } }];
}

return [{
  json: {
    replyToken: event.replyToken,
    userId: event.source.userId,
    text: event.message.text.trim(),
    textLower: event.message.text.trim().toLowerCase(),
    timestamp: event.timestamp
  }
}];
```

#### 節點 3：Keyword Router（Switch 節點）

```
類型：Switch
Mode：Rules
Data Type：String
Value：{{ $json.textLower }}

規則：
  Output 0：Contains → "營業時間" 或 "幾點開"
  Output 1：Contains → "地址" 或 "怎麼去" 或 "在哪"
  Output 2：Contains → "菜單" 或 "價格" 或 "價目"
  Fallthrough（預設）：走 Output 3
```

> Switch 節點可以設多個 Rule，每個 Rule 就是一組關鍵字。

#### 節點 4/5/6：HTTP Request（LINE Reply API）

```
類型：HTTP Request
Method：POST
URL：https://api.line.me/v2/bot/message/reply
Headers：
  Content-Type：application/json
  Authorization：Bearer {{ $credentials.lineChannelAccessToken }}
Body (JSON)：
```

```json
{
  "replyToken": "{{ $('Parse LINE Event').item.json.replyToken }}",
  "messages": [
    {
      "type": "text",
      "text": "營業時間：週一到週五 10:00-21:00，週六日 11:00-22:00"
    }
  ]
}
```

> 每個 Reply 節點只改 `messages[0].text` 的內容即可。

### 可貼上的 Code 節點 — LINE 回覆函式

```javascript
// 通用 LINE Reply 函式 — 可放在 Code 節點中直接用
// 輸入：replyToken, replyText
const replyToken = $input.first().json.replyToken;
const replyText = $input.first().json.matchedReply || "您好，請問有什麼可以幫您的？";

const response = await this.helpers.httpRequest({
  method: 'POST',
  url: 'https://api.line.me/v2/bot/message/reply',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${$env.LINE_CHANNEL_ACCESS_TOKEN}`
  },
  body: {
    replyToken: replyToken,
    messages: [{ type: 'text', text: replyText }]
  }
});

return [{ json: { success: true, response } }];
```

### 關鍵字新增方法

**方法一：Switch 節點加規則**
1. 打開 Keyword Router（Switch 節點）
2. 點 "Add Rule"
3. 設定 Value = `{{ $json.textLower }}`，Condition = `Contains`，Value 2 = `新關鍵字`
4. 從新 Output 連一條線到對應的 Reply 節點

**方法二：用 Code 節點做字典式比對（推薦，方便維護）**

把 Switch 節點換成 Code 節點：

```javascript
// 關鍵字字典 — 客戶自己也能改
const keywords = {
  "營業時間": "營業時間：週一到週五 10:00-21:00",
  "幾點開": "營業時間：週一到週五 10:00-21:00",
  "地址": "地址：台北市信義區信義路五段 7 號",
  "怎麼去": "地址：台北市信義區信義路五段 7 號\n捷運：信義安和站 4 號出口步行 5 分鐘",
  "菜單": "菜單請看：https://example.com/menu",
  "訂位": "訂位請撥：02-1234-5678",
  "停車": "地下停車場 B1-B3，每小時 40 元"
};

const text = $input.first().json.text;
const textLower = $input.first().json.textLower;

// 模糊比對：只要訊息包含關鍵字就命中
let matchedReply = null;
for (const [keyword, reply] of Object.entries(keywords)) {
  if (textLower.includes(keyword)) {
    matchedReply = reply;
    break;
  }
}

return [{
  json: {
    ...$input.first().json,
    matchedReply: matchedReply || "您好！很抱歉無法理解您的問題，請撥打客服電話 02-1234-5678。",
    isMatched: !!matchedReply
  }
}];
```

### 常見調整項目

| 項目 | 說明 |
|------|------|
| Webhook URL | LINE Developers Console → Messaging API → Webhook URL，貼上 n8n 產生的 URL |
| 回覆格式 | LINE 支援 text / image / flex message / template，改 `messages` 陣列內容即可 |
| 多關鍵字命中 | 上方字典版是 first match，改成陣列可支援多命中 |
| 圖片回覆 | `{ "type": "image", "originalContentUrl": "...", "previewImageUrl": "..." }` |
| Flex Message | 用 LINE Flex Message Simulator 設計，把 JSON 貼進 messages 陣列 |

---

## 2. LINE OA + AI 智能客服

### 適用場景
- 客戶需要 AI 回答客製化問題（商品諮詢、售後服務等）
- 關鍵字命中的直接秒回（省 AI 成本），沒命中的才丟給 AI
- 對話歷史存 Google Sheets，老闆可以看客服紀錄
- 適合：電商、SaaS、顧問公司、教育機構

### 完整節點清單

```
[Webhook] → [Code: 解析] → [Code: 關鍵字比對] → [IF: 是否命中]
  → 是：[HTTP Request: LINE Reply 直接回覆]
  → 否：[Code: 讀取歷史] → [HTTP Request: Gemini AI] → [Code: 整理回覆] → [HTTP Request: LINE Reply]
                                                                              ↓
                                                                   [Google Sheets: 存對話]
```

| # | 節點名稱 | 類型 | 用途 |
|---|---------|------|------|
| 1 | LINE Webhook | Webhook | 接收 LINE POST |
| 2 | Parse Event | Code | 解析 event |
| 3 | Keyword Check | Code | 關鍵字比對 |
| 4 | Is Matched? | IF | 判斷是否命中關鍵字 |
| 5 | Direct Reply | HTTP Request | 命中時直接回覆 |
| 6 | Load History | Code | 從 Google Sheets 載入最近對話 |
| 7 | Gemini AI | HTTP Request | 呼叫 Gemini API |
| 8 | Format Reply | Code | 整理 AI 回覆 |
| 9 | AI Reply | HTTP Request | LINE Reply API |
| 10 | Save Chat | Google Sheets | 存對話紀錄 |

### 每個節點的關鍵設定

#### 節點 3：Keyword Check（Code 節點）

```javascript
const keywords = {
  "退貨": "退貨規定：購買 7 天內可退貨，請保持商品完整包裝。退貨流程：LINE 回覆「退貨申請」+ 訂單編號。",
  "運費": "滿 $1,000 免運費，未滿加收 $60 運費。離島加收 $100。",
  "付款": "支持信用卡、ATM 轉帳、LINE Pay、貨到付款。",
  "客服電話": "客服專線：02-1234-5678（週一到週五 9:00-18:00）"
};

const text = $input.first().json.text;
let matchedReply = null;

for (const [kw, reply] of Object.entries(keywords)) {
  if (text.includes(kw)) {
    matchedReply = reply;
    break;
  }
}

return [{
  json: {
    ...$input.first().json,
    matchedReply,
    isMatched: !!matchedReply
  }
}];
```

#### 節點 4：IF 節點

```
Condition：{{ $json.isMatched }} equals true
```

#### 節點 6：Load History（Code 節點 — 從 Google Sheets 讀最近 5 筆）

```javascript
// 先用 Google Sheets 節點讀取，或用 HTTP Request 讀 Sheets API
// 這裡示範用 n8n 內建 Google Sheets node 的輸出
const userId = $input.first().json.userId;

// 如果用 Google Sheets node 接在前面，篩選該用戶的紀錄
const allRows = $input.all().map(item => item.json);
const userHistory = allRows
  .filter(row => row.userId === userId)
  .slice(-5) // 最近 5 筆
  .map(row => `${row.role}: ${row.message}`)
  .join('\n');

return [{
  json: {
    ...$input.first().json,
    chatHistory: userHistory || '（無歷史對話）'
  }
}];
```

#### 節點 7：Gemini AI（HTTP Request）

```
Method：POST
URL：https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={{ $env.GOOGLE_GEMINI_API_KEY }}
Headers：
  Content-Type：application/json
Body (JSON)：
```

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "你是一位專業的客服人員，代表「XX 公司」回答客戶問題。\n\n公司資訊：\n- 主要業務：販售 3C 產品\n- 營業時間：週一到週五 9:00-18:00\n- 退貨政策：7 天鑑賞期\n- 官網：https://example.com\n\n規則：\n1. 回覆要簡潔，不超過 100 字\n2. 不確定的事情不要亂答，請客戶聯繫真人客服\n3. 語氣親切但專業\n4. 不要回答與公司業務無關的問題\n\n歷史對話：\n{{ $json.chatHistory }}\n\n客戶問題：\n{{ $json.text }}"
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.3,
    "maxOutputTokens": 200
  }
}
```

#### AI Agent System Prompt 範例（可依客戶產業調整）

```
# 餐廳客服版
你是「XX 餐廳」的 LINE 客服助理。
- 菜單：https://example.com/menu
- 訂位電話：02-1234-5678
- 營業時間：11:00-21:00（週二公休）
- 不接受外帶預訂，僅限內用
- 回答要簡短友善，不超過 80 字
- 無法回答的問題請客戶打電話

# 診所客服版
你是「XX 診所」的 LINE 客服助理。
- 看診時間：週一到週五 9:00-12:00、14:00-18:00，週六 9:00-12:00
- 掛號方式：LINE 預約或現場掛號
- 嚴禁提供醫療建議或診斷
- 所有醫療問題一律回覆：「建議您親臨看診，由醫師為您評估。」

# 電商客服版
你是「XX 購物」的客服機器人。
- 免運門檻：滿 1000 元
- 退換貨：7 天內，保持原包裝
- 付款方式：信用卡 / ATM / 超商取貨付款
- 無法查詢訂單狀態，請客戶到官網「我的訂單」查看
- 回答不超過 100 字
```

#### 節點 8：Format Reply（Code 節點）

```javascript
const geminiResponse = $input.first().json;
const candidates = geminiResponse.candidates;
let aiReply = '抱歉，目前無法回覆您的問題，請聯繫客服。';

if (candidates && candidates.length > 0) {
  const parts = candidates[0].content.parts;
  if (parts && parts.length > 0) {
    aiReply = parts[0].text;
  }
}

// 截斷過長回覆（LINE 單則上限 5000 字）
if (aiReply.length > 500) {
  aiReply = aiReply.substring(0, 497) + '...';
}

return [{
  json: {
    replyToken: $('Parse Event').item.json.replyToken,
    userId: $('Parse Event').item.json.userId,
    userMessage: $('Parse Event').item.json.text,
    aiReply: aiReply
  }
}];
```

#### 節點 10：Save Chat（Google Sheets）

```
操作：Append Row
Spreadsheet ID：你的 Google Sheets ID
Sheet：Sheet1
欄位對應：
  A (timestamp)：{{ $now.format('yyyy-MM-dd HH:mm:ss') }}
  B (userId)：{{ $json.userId }}
  C (role)：user
  D (message)：{{ $json.userMessage }}

第二個 Append Row（存 AI 回覆）：
  A (timestamp)：{{ $now.format('yyyy-MM-dd HH:mm:ss') }}
  B (userId)：{{ $json.userId }}
  C (role)：assistant
  D (message)：{{ $json.aiReply }}
```

### 常見調整項目

| 項目 | 說明 |
|------|------|
| AI 模型 | 換成 `gemini-2.5-flash` 更強；用 `gemini-2.0-flash-lite` 更便宜 |
| temperature | 0.1 = 嚴謹客服，0.5 = 活潑風格，0.7+ = 創意回覆 |
| 對話歷史長度 | slice(-5) 改成 slice(-10) 保留更多上下文，但 token 成本增加 |
| Google Sheets | 可改用 Supabase / Airtable / Notion 存對話 |
| 多語言 | System Prompt 加上「使用與客戶相同的語言回覆」 |
| 圖片訊息 | LINE image message 需另外處理，可用 Gemini Vision 辨識 |

---

## 3. 網站表單通知

### 適用場景
- 客戶網站的 Contact Form / 預約表單 / 詢價表單送出後，即時通知老闆
- 通知管道：LINE / Telegram / Email，可同時發多管道
- 適合：企業官網、Landing Page、活動報名頁

### 完整節點清單

```
[Webhook] → [Code: 整理資料] → [LINE Push] + [Telegram] + [Email]（三條平行）
```

| # | 節點名稱 | 類型 | 用途 |
|---|---------|------|------|
| 1 | Form Webhook | Webhook | 接收表單 POST |
| 2 | Format Data | Code | 整理欄位、格式化訊息 |
| 3 | LINE Push | HTTP Request | LINE Push Message 通知老闆 |
| 4 | Telegram Notify | HTTP Request | Telegram 通知 |
| 5 | Email Notify | Send Email | Email 通知（可選） |

### 每個節點的關鍵設定

#### 節點 1：Form Webhook

```
類型：Webhook
HTTP Method：POST
Path：contact-form
Response Mode：Immediately
Response Code：200
Response Data：{ "status": "ok" }
```

> 前端表單的 action 設成這個 Webhook URL。

#### 節點 2：Format Data（Code 節點）

```javascript
// 整理表單資料，產生通知文字
const data = $input.first().json.body;

const name = data.name || '未填';
const phone = data.phone || '未填';
const email = data.email || '未填';
const message = data.message || '未填';
const source = data.source || '官網表單';
const time = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

// LINE 用的純文字格式
const lineText = `📩 新${source}通知\n\n` +
  `姓名：${name}\n` +
  `電話：${phone}\n` +
  `Email：${email}\n` +
  `內容：${message}\n` +
  `時間：${time}`;

// Telegram 用的 Markdown 格式
const telegramText = `*新${source}通知*\n\n` +
  `*姓名*：${name}\n` +
  `*電話*：${phone}\n` +
  `*Email*：${email}\n` +
  `*內容*：${message}\n` +
  `*時間*：${time}`;

// Email 用的 HTML 格式
const emailHtml = `<h2>新${source}通知</h2>
<table border="1" cellpadding="8" style="border-collapse:collapse;">
  <tr><td><b>姓名</b></td><td>${name}</td></tr>
  <tr><td><b>電話</b></td><td>${phone}</td></tr>
  <tr><td><b>Email</b></td><td>${email}</td></tr>
  <tr><td><b>內容</b></td><td>${message}</td></tr>
  <tr><td><b>時間</b></td><td>${time}</td></tr>
</table>`;

return [{
  json: {
    name, phone, email, message, source, time,
    lineText,
    telegramText,
    emailHtml
  }
}];
```

#### 節點 3：LINE Push Message

```
Method：POST
URL：https://api.line.me/v2/bot/message/push
Headers：
  Content-Type：application/json
  Authorization：Bearer {{ $env.LINE_CHANNEL_ACCESS_TOKEN }}
Body：
```

```json
{
  "to": "老闆的 LINE userId",
  "messages": [
    {
      "type": "text",
      "text": "{{ $json.lineText }}"
    }
  ]
}
```

> **注意**：Push Message 是主動推播，需要 LINE 官方帳號是付費方案才有額度（免費方案每月 200 則）。

#### 節點 4：Telegram Notify

```
Method：POST
URL：https://api.telegram.org/bot{{ $env.TELEGRAM_BOT_TOKEN }}/sendMessage
Headers：
  Content-Type：application/json
Body：
```

```json
{
  "chat_id": "{{ $env.TELEGRAM_CHAT_ID }}",
  "text": "{{ $json.telegramText }}",
  "parse_mode": "Markdown"
}
```

#### 節點 5：Email Notify（n8n 內建 Send Email 節點）

```
To：boss@example.com
Subject：新表單通知 — {{ $json.name }}
HTML Body：{{ $json.emailHtml }}
```

### 前端表單串接範例

```html
<form id="contactForm">
  <input name="name" placeholder="姓名" required>
  <input name="phone" placeholder="電話">
  <input name="email" placeholder="Email" type="email">
  <textarea name="message" placeholder="留言內容"></textarea>
  <input type="hidden" name="source" value="官網聯絡表單">
  <button type="submit">送出</button>
</form>

<script>
document.getElementById('contactForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = Object.fromEntries(new FormData(e.target));
  const res = await fetch('https://你的n8n網址/webhook/contact-form', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });
  if (res.ok) alert('已送出，我們會盡快回覆您！');
});
</script>
```

### 常見調整項目

| 項目 | 說明 |
|------|------|
| CORS | n8n Webhook 預設允許跨域，若有問題在 Webhook 節點設 Response Headers |
| 防機器人 | 加 reCAPTCHA，在 Code 節點驗證 token |
| 表單欄位 | 改 Format Data 裡的 `data.xxx` 對應 |
| 多人通知 | LINE Push 改成群組 ID，或加多個 HTTP Request 節點 |
| 存資料庫 | 並行加一個 Supabase Insert 節點 |

---

## 4. 客戶網站異常監控

### 適用場景
- 接案後幫客戶監控網站是否正常運作
- 網站掛了第一時間收到通知，不用等客戶打電話來罵
- 可監控多個網站，用同一個 workflow
- 適合：維護合約、月費客戶、自己的作品集網站

### 完整節點清單

```
[Schedule Trigger] → [Code: 網站清單] → [Split In Batches] → [HTTP Request: Ping]
  → [IF: status != 200] → [Code: 組通知] → [LINE Push] + [Telegram]
```

| # | 節點名稱 | 類型 | 用途 |
|---|---------|------|------|
| 1 | Every 5 Min | Schedule Trigger | 每 5 分鐘觸發 |
| 2 | Site List | Code | 定義要監控的網站清單 |
| 3 | Loop Sites | Split In Batches | 逐一檢查每個網站 |
| 4 | Ping Site | HTTP Request | 發 GET 請求檢查 |
| 5 | Is Down? | IF | 判斷回應是否異常 |
| 6 | Alert Message | Code | 組合告警訊息 |
| 7 | LINE Alert | HTTP Request | LINE 推播告警 |
| 8 | TG Alert | HTTP Request | Telegram 告警 |

### 每個節點的關鍵設定

#### 節點 1：Schedule Trigger

```
Rule：Every 5 minutes
```

> 可改成每 1 分鐘（高優先級客戶）或每 15 分鐘（節省資源）。

#### 節點 2：Site List（Code 節點）

```javascript
// 監控網站清單 — 新增客戶就在這裡加一行
const sites = [
  { name: "客戶A官網", url: "https://clienta.com", owner: "王先生" },
  { name: "客戶B電商", url: "https://shop.clientb.com", owner: "李小姐" },
  { name: "客戶C部落格", url: "https://blog.clientc.com", owner: "張先生" },
  { name: "自己的作品集", url: "https://myportfolio.com", owner: "自己" },
];

return sites.map(site => ({ json: site }));
```

#### 節點 3：Split In Batches

```
Batch Size：1（一次檢查一個網站）
```

#### 節點 4：Ping Site（HTTP Request）

```
Method：GET
URL：{{ $json.url }}
Options：
  Timeout：10000（10 秒逾時）
  Ignore SSL Issues：true（有些客戶沒裝好 SSL）

重要：勾選「Continue On Fail」→ true
（網站掛了會 error，不能讓整個 workflow 停掉）
```

#### 節點 5：Is Down?（IF 節點）

```
Conditions（任一成立 = 異常）：
  條件 1：{{ $json.statusCode }} is not equal to 200
  條件 2：{{ $json.error }} is not empty

邏輯：OR（任一條件成立就視為異常）
```

#### 節點 6：Alert Message（Code 節點）

```javascript
const site = $('Loop Sites').item.json;
const pingResult = $input.first().json;
const time = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

const statusCode = pingResult.statusCode || 'N/A';
const errorMsg = pingResult.error || pingResult.message || '未知錯誤';

const alertText = `🚨 網站異常告警\n\n` +
  `網站：${site.name}\n` +
  `網址：${site.url}\n` +
  `負責人：${site.owner}\n` +
  `狀態碼：${statusCode}\n` +
  `錯誤：${errorMsg}\n` +
  `偵測時間：${time}\n\n` +
  `請立即檢查！`;

return [{ json: { alertText, siteName: site.name, siteUrl: site.url } }];
```

#### 節點 7/8：LINE / Telegram Alert

與模板 3 的通知節點相同，把 text 改成 `{{ $json.alertText }}`。

### 進階：避免重複告警

在 Alert Message 節點前加一個 Code 節點做「告警去重」：

```javascript
// 用 n8n Static Data 記錄已告警的網站
const staticData = $getWorkflowStaticData('global');
const siteUrl = $input.first().json.url;
const now = Date.now();

// 30 分鐘內同一網站不重複告警
const lastAlert = staticData[siteUrl] || 0;
if (now - lastAlert < 30 * 60 * 1000) {
  return []; // 跳過，不發告警
}

// 記錄這次告警時間
staticData[siteUrl] = now;

return [$input.first()];
```

### 常見調整項目

| 項目 | 說明 |
|------|------|
| 檢查頻率 | Schedule Trigger 改時間間隔 |
| 新增網站 | 在 Site List 的 `sites` 陣列加一行 |
| 檢查內容 | HTTP Request 可改成 POST，或檢查特定 API endpoint |
| 回覆內容檢查 | 除了 status code，也可以檢查 body 是否包含關鍵字（確認內容正確） |
| SSL 到期 | 另開一個 workflow 用 Code 節點檢查 SSL 憑證到期日 |
| 恢復通知 | 加一個 branch：status == 200 且之前是異常 → 發「已恢復」通知 |

---

## 5. 定期報告

### 適用場景
- 每天/每週自動產生報告寄給老闆或客戶
- 資料來源：Google Sheets（手動填的數據、LINE Bot 統計、網站流量）
- 適合：LINE Bot 使用統計、電商銷售日報、行銷活動成效

### 完整節點清單

```
[Schedule Trigger] → [Google Sheets: 讀數據] → [Code: 整理報表] → [LINE Push] + [Email]
```

| # | 節點名稱 | 類型 | 用途 |
|---|---------|------|------|
| 1 | Daily 9AM | Schedule Trigger | 每天早上 9 點觸發 |
| 2 | Read Stats | Google Sheets | 讀取統計數據 |
| 3 | Build Report | Code | 整理成報表文字 |
| 4 | LINE Report | HTTP Request | 推播給老闆 |
| 5 | Email Report | Send Email | 寄給客戶 |

### 每個節點的關鍵設定

#### 節點 1：Schedule Trigger

```
每日報告：
  Rule：Every Day at 09:00
  Timezone：Asia/Taipei

每週報告：
  Rule：Every Monday at 09:00
  Timezone：Asia/Taipei
```

#### 節點 2：Google Sheets

```
操作：Read Rows
Spreadsheet ID：你的 Sheets ID
Sheet：統計資料
Range：A:F（依欄位數調整）
```

#### 節點 3：Build Report（Code 節點）

```javascript
// 整理日報 / 週報
const rows = $input.all().map(item => item.json);
const today = new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' });

// 範例：LINE Bot 使用統計
// 假設 Sheets 欄位：日期 | 訊息數 | 新用戶 | AI回覆數 | 關鍵字命中數
const todayData = rows[rows.length - 1]; // 最新一筆

// 過去 7 天
const last7 = rows.slice(-7);
const totalMessages = last7.reduce((sum, r) => sum + (parseInt(r['訊息數']) || 0), 0);
const totalNewUsers = last7.reduce((sum, r) => sum + (parseInt(r['新用戶']) || 0), 0);
const avgMessages = Math.round(totalMessages / last7.length);

const lineReport = `📊 LINE Bot 日報（${today}）\n\n` +
  `【今日數據】\n` +
  `・訊息數：${todayData['訊息數'] || 0}\n` +
  `・新用戶：${todayData['新用戶'] || 0}\n` +
  `・AI 回覆：${todayData['AI回覆數'] || 0}\n` +
  `・關鍵字命中：${todayData['關鍵字命中數'] || 0}\n\n` +
  `【近 7 天】\n` +
  `・總訊息：${totalMessages}\n` +
  `・新用戶：${totalNewUsers}\n` +
  `・日均訊息：${avgMessages}\n\n` +
  `自動報告 by n8n`;

const emailReport = `<h2>LINE Bot 日報 - ${today}</h2>
<h3>今日數據</h3>
<table border="1" cellpadding="8" style="border-collapse:collapse;">
  <tr><td>訊息數</td><td>${todayData['訊息數'] || 0}</td></tr>
  <tr><td>新用戶</td><td>${todayData['新用戶'] || 0}</td></tr>
  <tr><td>AI 回覆</td><td>${todayData['AI回覆數'] || 0}</td></tr>
  <tr><td>關鍵字命中</td><td>${todayData['關鍵字命中數'] || 0}</td></tr>
</table>
<h3>近 7 天趨勢</h3>
<table border="1" cellpadding="8" style="border-collapse:collapse;">
  <tr><th>日期</th><th>訊息</th><th>新用戶</th></tr>
  ${last7.map(r => `<tr><td>${r['日期']}</td><td>${r['訊息數']}</td><td>${r['新用戶']}</td></tr>`).join('\n')}
</table>
<p><small>自動報告 by n8n</small></p>`;

return [{
  json: { lineReport, emailReport, today }
}];
```

#### 節點 4/5：通知節點

LINE Push 和 Email 的設定與前面模板相同，text 用 `{{ $json.lineReport }}`，HTML 用 `{{ $json.emailReport }}`。

### 常見調整項目

| 項目 | 說明 |
|------|------|
| 數據來源 | 可改成 Supabase query / API 呼叫 / Airtable |
| 報告頻率 | Schedule Trigger 改 cron |
| 圖表 | 用 QuickChart.io API 產生圖表圖片，LINE 用 Image Message 發送 |
| 多份報告 | 不同客戶不同 Sheets，用多個 branch 分發 |
| 匯出 PDF | 用 Code 節點產生 HTML，再用 HTTP Request 呼叫 html-to-pdf API |

---

## 6. 會員註冊歡迎信

### 適用場景
- 新會員註冊後自動發歡迎訊息（LINE + Email）
- 可附帶新會員優惠券、使用教學連結
- 適合：電商、SaaS 平台、會員制網站

### 完整節點清單

```
[Webhook / Supabase Trigger] → [Code: 整理資料] → [LINE Push 歡迎卡片] + [Email 確認信]
```

| # | 節點名稱 | 類型 | 用途 |
|---|---------|------|------|
| 1 | New User Trigger | Webhook 或 Supabase Trigger | 新用戶觸發 |
| 2 | Format Welcome | Code | 產生歡迎訊息 |
| 3 | LINE Welcome | HTTP Request | LINE Push 歡迎訊息 |
| 4 | Email Welcome | Send Email | 確認信 |

### 每個節點的關鍵設定

#### 節點 1a：Webhook 版（通用）

```
Method：POST
Path：new-user
```

後端在 user 建立成功後呼叫：

```javascript
// 後端範例（Express.js）
await fetch('https://你的n8n/webhook/new-user', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: user.id,
    name: user.name,
    email: user.email,
    lineUserId: user.lineUserId, // 如果有綁 LINE
    registeredAt: new Date().toISOString()
  })
});
```

#### 節點 1b：Supabase Trigger 版（替代方案）

如果用 Supabase，可以用 Database Trigger 或 Supabase Webhook：

```
Supabase Dashboard → Database → Webhooks → Create
Table：users
Events：INSERT
URL：你的 n8n Webhook URL
```

#### 節點 2：Format Welcome（Code 節點）

```javascript
const user = $input.first().json.body || $input.first().json;
const name = user.name || '新朋友';

// LINE Flex Message — 歡迎卡片
const flexMessage = {
  type: "flex",
  altText: `歡迎加入！${name}`,
  contents: {
    type: "bubble",
    hero: {
      type: "image",
      url: "https://example.com/welcome-banner.jpg",
      size: "full",
      aspectRatio: "20:13"
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `歡迎加入！${name}`,
          weight: "bold",
          size: "xl"
        },
        {
          type: "text",
          text: "感謝您的註冊！這裡有您的專屬新會員好禮：",
          size: "sm",
          color: "#666666",
          margin: "md",
          wrap: true
        },
        {
          type: "text",
          text: "🎁 首購 9 折優惠碼：WELCOME10",
          size: "md",
          color: "#e74c3c",
          margin: "lg",
          weight: "bold"
        }
      ]
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          action: {
            type: "uri",
            label: "立即逛逛",
            uri: "https://example.com/shop"
          },
          style: "primary"
        }
      ]
    }
  }
};

// Email HTML
const emailHtml = `
<div style="max-width:600px;margin:0 auto;font-family:sans-serif;">
  <img src="https://example.com/welcome-banner.jpg" style="width:100%;">
  <h1>歡迎加入，${name}！</h1>
  <p>感謝您的註冊。以下是您的專屬好禮：</p>
  <div style="background:#f0f0f0;padding:20px;text-align:center;margin:20px 0;">
    <p style="font-size:18px;color:#e74c3c;font-weight:bold;">首購 9 折優惠碼</p>
    <p style="font-size:24px;font-weight:bold;letter-spacing:3px;">WELCOME10</p>
  </div>
  <a href="https://example.com/shop" style="display:block;background:#4CAF50;color:white;text-align:center;padding:15px;text-decoration:none;border-radius:5px;">立即逛逛</a>
</div>`;

return [{
  json: {
    lineUserId: user.lineUserId,
    email: user.email,
    name: name,
    flexMessage: JSON.stringify(flexMessage),
    emailHtml
  }
}];
```

#### 節點 3：LINE Welcome（HTTP Request）

```
Method：POST
URL：https://api.line.me/v2/bot/message/push
Headers：
  Content-Type：application/json
  Authorization：Bearer {{ $env.LINE_CHANNEL_ACCESS_TOKEN }}
Body：
```

```json
{
  "to": "{{ $json.lineUserId }}",
  "messages": [{{ $json.flexMessage }}]
}
```

#### 節點 4：Email Welcome

```
To：{{ $json.email }}
Subject：歡迎加入！{{ $json.name }}，這是您的專屬好禮
HTML Body：{{ $json.emailHtml }}
```

### 常見調整項目

| 項目 | 說明 |
|------|------|
| Flex Message 設計 | 用 LINE Flex Message Simulator 視覺化設計 |
| 優惠碼 | 可串 Coupon API 動態產生唯一優惠碼 |
| 分眾歡迎 | 根據註冊來源（LINE / Web / App）發不同內容 |
| 延遲發送 | 加 Wait 節點，註冊 1 小時後再發教學訊息 |
| 追蹤開信 | Email 加入 tracking pixel |

---

## 7. 訂單/付款通知

### 適用場景
- 金流（綠界 ECPay / 藍新 NewebPay / LINE Pay）付款完成回調
- 更新訂單狀態 + 通知客戶 + 通知老闆
- 適合：電商網站、訂閱制服務、活動報名收費

### 完整節點清單

```
[Webhook: 金流回調] → [Code: 驗簽 + 解析] → [IF: 付款成功?]
  → 是：[Supabase: 更新訂單] → [Code: 組訊息] → [LINE Push 客戶] + [LINE Push 老闆]
  → 否：[Code: 記錄失敗] → [Supabase: 更新訂單為失敗]
```

| # | 節點名稱 | 類型 | 用途 |
|---|---------|------|------|
| 1 | Payment Callback | Webhook | 接收金流回調 POST |
| 2 | Verify & Parse | Code | 驗證簽名、解析資料 |
| 3 | Is Paid? | IF | 判斷付款是否成功 |
| 4 | Update Order | HTTP Request (Supabase) | 更新訂單狀態 |
| 5 | Build Messages | Code | 產生通知訊息 |
| 6 | Notify Customer | HTTP Request | LINE 通知客戶 |
| 7 | Notify Boss | HTTP Request | LINE 通知老闆 |

### 每個節點的關鍵設定

#### 節點 1：Payment Callback Webhook

```
Method：POST
Path：payment-callback
Response Mode：Last Node（金流需要收到特定回應）
```

#### 節點 2：Verify & Parse（Code 節點 — 以綠界 ECPay 為例）

```javascript
const crypto = require('crypto');
const data = $input.first().json.body;

// 綠界 ECPay 驗簽
const hashKey = $env.ECPAY_HASH_KEY;     // 在 n8n 環境變數設定
const hashIV = $env.ECPAY_HASH_IV;

// 1. 組合檢查碼
function generateCheckMacValue(params) {
  // 依照參數名稱排序
  const sorted = Object.keys(params)
    .filter(k => k !== 'CheckMacValue')
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');

  let raw = `HashKey=${hashKey}&${sorted}&HashIV=${hashIV}`;
  raw = encodeURIComponent(raw).toLowerCase();

  // 特殊字元轉換（綠界規格）
  raw = raw.replace(/%2d/g, '-').replace(/%5f/g, '_')
           .replace(/%2e/g, '.').replace(/%21/g, '!')
           .replace(/%2a/g, '*').replace(/%28/g, '(')
           .replace(/%29/g, ')');

  return crypto.createHash('sha256').update(raw).digest('hex').toUpperCase();
}

const expectedMac = generateCheckMacValue(data);
const isValid = expectedMac === data.CheckMacValue;

const isPaid = isValid && data.RtnCode === '1'; // 綠界：1=付款成功

return [{
  json: {
    isValid,
    isPaid,
    orderId: data.MerchantTradeNo,
    amount: data.TradeAmt,
    paymentMethod: data.PaymentType,
    tradeNo: data.TradeNo,
    tradeDate: data.TradeDate,
    rawData: data
  }
}];
```

> 藍新 NewebPay 和 LINE Pay 的驗簽邏輯不同，需替換 `generateCheckMacValue` 函式。

#### 節點 3：Is Paid?（IF）

```
Condition：{{ $json.isPaid }} equals true
```

#### 節點 4：Update Order（Supabase HTTP Request）

```
Method：PATCH
URL：{{ $env.SUPABASE_URL }}/rest/v1/orders?order_id=eq.{{ $json.orderId }}
Headers：
  apikey：{{ $env.SUPABASE_KEY }}
  Authorization：Bearer {{ $env.SUPABASE_KEY }}
  Content-Type：application/json
  Prefer：return=representation
Body：
```

```json
{
  "status": "paid",
  "paid_at": "{{ $now.toISO() }}",
  "payment_method": "{{ $json.paymentMethod }}",
  "trade_no": "{{ $json.tradeNo }}"
}
```

#### 節點 5：Build Messages（Code 節點）

```javascript
const order = $input.first().json;

// 通知客戶
const customerMsg = `✅ 付款成功！\n\n` +
  `訂單編號：${order.orderId}\n` +
  `金額：$${order.amount}\n` +
  `付款方式：${order.paymentMethod}\n\n` +
  `我們會盡快為您出貨，感謝您的購買！`;

// 通知老闆
const bossMsg = `💰 新訂單付款完成\n\n` +
  `訂單：${order.orderId}\n` +
  `金額：$${order.amount}\n` +
  `付款：${order.paymentMethod}\n` +
  `交易號：${order.tradeNo}\n` +
  `時間：${order.tradeDate}`;

return [{
  json: {
    ...order,
    customerMsg,
    bossMsg,
    // 從訂單資料庫取客戶的 LINE userId（需要前面 Supabase 節點回傳）
    customerLineId: order.customer_line_id || ''
  }
}];
```

#### 節點 6/7：LINE Push（客戶 + 老闆）

兩個 HTTP Request 節點，分別 push 給客戶和老闆，`to` 和 `text` 不同。

### 金流回調設定備忘

| 金流 | 回調設定位置 | 必要回應 |
|------|-------------|---------|
| 綠界 ECPay | 廠商後台 → 交易設定 → Server 端回傳付款結果網址 | 回應 `1|OK` |
| 藍新 NewebPay | 商店管理 → 交易設定 → 支付通知網址 | 回應空白即可 |
| LINE Pay | LINE Pay Console → Payment Setting → Confirm URL | JSON `{ "returnCode": "0000" }` |

### 常見調整項目

| 項目 | 說明 |
|------|------|
| 金流平台 | 替換驗簽邏輯（每家不同） |
| 資料庫 | Supabase 可換 MySQL / PostgreSQL / Airtable |
| 出貨通知 | 在老闆通知後加一個「一鍵出貨」按鈕（LINE Flex Message + 另一個 Webhook） |
| 退款 | 另建一個 workflow 處理退款回調 |
| 發票 | 付款成功後呼叫電子發票 API（如綠界發票 API）自動開立 |

---

## 8. 預約系統

### 適用場景
- LINE 用戶傳「預約」觸發預約流程
- 檢查 Google Calendar 空檔，有空就建立事件，沒空回覆替代時段
- 適合：診所、美容院、顧問諮詢、攝影工作室

### 完整節點清單

```
[LINE Webhook] → [Code: 解析預約] → [Google Calendar: 查空檔]
  → [IF: 有空?]
    → 有：[Google Calendar: 建立] → [HTTP Request: 確認回覆]
    → 沒：[Code: 找替代時段] → [HTTP Request: 回覆替代]
```

| # | 節點名稱 | 類型 | 用途 |
|---|---------|------|------|
| 1 | LINE Webhook | Webhook | 接收 LINE 訊息 |
| 2 | Parse Booking | Code | 解析預約意圖、日期時間 |
| 3 | Check Calendar | Google Calendar | 查詢該時段是否有空 |
| 4 | Has Slot? | IF | 判斷是否有空 |
| 5 | Create Event | Google Calendar | 建立預約事件 |
| 6 | Reply Confirmed | HTTP Request | LINE 回覆預約成功 |
| 7 | Find Alternatives | Code | 找替代時段 |
| 8 | Reply Alternatives | HTTP Request | LINE 回覆替代時段 |

### 每個節點的關鍵設定

#### 節點 2：Parse Booking（Code 節點）

```javascript
const body = $input.first().json.body;
const event = body.events[0];

if (!event || event.type !== 'message' || event.message.type !== 'text') {
  return [{ json: { skip: true } }];
}

const text = event.message.text.trim();
const replyToken = event.replyToken;
const userId = event.source.userId;

// 簡易日期時間解析
// 支援格式：「預約 3/15 14:00」「預約 明天下午2點」
let bookingDate = null;
let bookingTime = null;

// 格式1：預約 MM/DD HH:MM
const match1 = text.match(/預約\s*(\d{1,2})[\/\-](\d{1,2})\s*(\d{1,2}):?(\d{2})?/);
if (match1) {
  const year = new Date().getFullYear();
  const month = parseInt(match1[1]) - 1;
  const day = parseInt(match1[2]);
  const hour = parseInt(match1[3]);
  const minute = parseInt(match1[4] || '0');
  bookingDate = new Date(year, month, day, hour, minute);
}

// 格式2：「預約 明天 下午2點」
if (!bookingDate && text.includes('明天')) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const hourMatch = text.match(/(\d{1,2})\s*[點時]/);
  if (hourMatch) {
    let hour = parseInt(hourMatch[1]);
    if (text.includes('下午') && hour < 12) hour += 12;
    tomorrow.setHours(hour, 0, 0, 0);
    bookingDate = tomorrow;
  }
}

// 預設服務時長（分鐘）
const duration = 60;

return [{
  json: {
    replyToken,
    userId,
    text,
    bookingDate: bookingDate ? bookingDate.toISOString() : null,
    bookingEndDate: bookingDate
      ? new Date(bookingDate.getTime() + duration * 60000).toISOString()
      : null,
    duration,
    hasParsedDate: !!bookingDate
  }
}];
```

#### 日期解析失敗的處理

在 Parse Booking 後加一個 IF 節點：

```
Condition：{{ $json.hasParsedDate }} equals true

False 分支 → HTTP Request 回覆：
  "請輸入想預約的日期和時間，例如：\n預約 3/15 14:00\n預約 明天下午2點"
```

#### 節點 3：Check Calendar（Google Calendar 節點）

```
操作：Get Many Events
Calendar ID：primary（或指定日曆 ID）
Time Min：{{ $json.bookingDate }}
Time Max：{{ $json.bookingEndDate }}
```

#### 節點 4：Has Slot?（IF）

```
Condition：{{ $json.items.length }} equals 0
（沒有事件 = 有空檔）
```

> 注意：Google Calendar API 回傳的 items 如果是空陣列，代表那個時段沒有事件，即有空。

#### 節點 5：Create Event（Google Calendar 節點）

```
操作：Create Event
Calendar ID：primary
Title：LINE 預約 — {{ $('Parse Booking').item.json.userId }}
Start：{{ $('Parse Booking').item.json.bookingDate }}
End：{{ $('Parse Booking').item.json.bookingEndDate }}
Description：LINE 用戶預約\nUser ID: {{ $('Parse Booking').item.json.userId }}
```

#### 節點 6：Reply Confirmed（HTTP Request）

```
Method：POST
URL：https://api.line.me/v2/bot/message/reply
Body：
```

```json
{
  "replyToken": "{{ $('Parse Booking').item.json.replyToken }}",
  "messages": [
    {
      "type": "text",
      "text": "✅ 預約成功！\n\n日期：{{ $('Parse Booking').item.json.bookingDate }}\n時長：{{ $('Parse Booking').item.json.duration }} 分鐘\n\n如需取消或更改，請回覆「取消預約」。"
    }
  ]
}
```

#### 節點 7：Find Alternatives（Code 節點）

```javascript
// 找出最近 3 天的空檔
// 這裡簡化：回覆固定的替代時段
// 完整版需要查詢 Google Calendar 多個時段

const requestedDate = new Date($('Parse Booking').item.json.bookingDate);
const alternatives = [];

// 同一天的其他時段
const sameDaySlots = [9, 10, 11, 14, 15, 16, 17];
for (const hour of sameDaySlots) {
  const slot = new Date(requestedDate);
  slot.setHours(hour, 0, 0, 0);
  if (slot > new Date() && slot.getHours() !== requestedDate.getHours()) {
    alternatives.push(slot.toLocaleString('zh-TW', {
      timeZone: 'Asia/Taipei',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }));
  }
  if (alternatives.length >= 3) break;
}

// 隔天同時段
const nextDay = new Date(requestedDate);
nextDay.setDate(nextDay.getDate() + 1);
alternatives.push(nextDay.toLocaleString('zh-TW', {
  timeZone: 'Asia/Taipei',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
}));

const altText = alternatives.map((t, i) => `${i + 1}. ${t}`).join('\n');

return [{
  json: {
    replyToken: $('Parse Booking').item.json.replyToken,
    alternativesText: `抱歉，您選擇的時段已被預約。\n\n以下時段仍有空位：\n${altText}\n\n請回覆「預約 日期 時間」重新預約。`
  }
}];
```

#### 節點 8：Reply Alternatives（HTTP Request）

```
Method：POST
URL：https://api.line.me/v2/bot/message/reply
Body：
```

```json
{
  "replyToken": "{{ $json.replyToken }}",
  "messages": [
    {
      "type": "text",
      "text": "{{ $json.alternativesText }}"
    }
  ]
}
```

### 進階功能

#### 用 Flex Message 做預約按鈕（取代文字輸入）

```javascript
// 產生時段選擇的 Flex Message
const flexMessage = {
  type: "flex",
  altText: "請選擇預約時段",
  contents: {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: "請選擇預約時段", weight: "bold", size: "lg" },
        {
          type: "box",
          layout: "vertical",
          margin: "lg",
          contents: [
            { type: "button", action: { type: "message", label: "明天 10:00", text: "預約 明天 10:00" }, style: "secondary", margin: "sm" },
            { type: "button", action: { type: "message", label: "明天 14:00", text: "預約 明天 14:00" }, style: "secondary", margin: "sm" },
            { type: "button", action: { type: "message", label: "明天 16:00", text: "預約 明天 16:00" }, style: "secondary", margin: "sm" },
          ]
        }
      ]
    }
  }
};
```

### 常見調整項目

| 項目 | 說明 |
|------|------|
| 營業時間 | 在 Parse Booking 加判斷，非營業時間直接回覆 |
| 服務類型 | 加 Switch 節點，不同服務不同時長（剪髮 30 分鐘、染髮 120 分鐘） |
| 多日曆 | 不同服務人員用不同 Google Calendar |
| 預約提醒 | 另建 workflow：Schedule Trigger 每天檢查明天的預約 → LINE Push 提醒 |
| 取消預約 | 監聽「取消預約」關鍵字 → 刪除 Google Calendar 事件 → 回覆確認 |
| 候補 | 滿了就加入候補名單（存 Google Sheets），有人取消時自動通知 |

---

## 附錄 A：LINE Messaging API 常用端點

| 端點 | Method | 用途 |
|------|--------|------|
| `/v2/bot/message/reply` | POST | 回覆訊息（需 replyToken，免費） |
| `/v2/bot/message/push` | POST | 主動推播（需 userId，計額度） |
| `/v2/bot/message/multicast` | POST | 群發推播（多個 userId） |
| `/v2/bot/message/broadcast` | POST | 全體推播 |
| `/v2/bot/profile/{userId}` | GET | 取得用戶資料（顯示名稱、大頭照） |
| `/v2/bot/richmenu` | POST | 建立圖文選單 |

### Reply vs Push

| | Reply | Push |
|---|-------|------|
| 需要 | replyToken | userId |
| 費用 | 免費 | 計入每月推播額度 |
| 時效 | replyToken 只有效 1 分鐘 | 隨時可發 |
| 場景 | 回應用戶訊息 | 主動通知（訂單、提醒等） |

---

## 附錄 B：n8n 建立 Workflow 注意事項

### Webhook 設定

1. n8n 分「Test URL」和「Production URL」兩組
2. 開發測試用 Test URL，正式上線後切 Production URL
3. Production URL 需要 workflow 設為 Active 才生效
4. 如果 n8n 在 Zeabur / Railway 等平台，URL 是 `https://你的域名/webhook/路徑`

### Credentials 管理

1. LINE Channel Access Token → n8n Credentials → 建立 HTTP Header Auth
2. Google API → n8n Credentials → 建立 Google OAuth2
3. Supabase → n8n Credentials → 建立 HTTP Header Auth（apikey）
4. 不要把 token 寫死在節點裡，用 `$env.XXX` 或 Credentials

### 錯誤處理

1. 每個重要節點開啟 `Continue On Fail`，避免一個節點掛掉整個 workflow 停
2. 加 Error Trigger workflow，異常時通知自己
3. LINE replyToken 只有效 1 分鐘，超過就會失敗
4. 外部 API 呼叫加上 Retry（n8n Settings → Retry On Fail）

### 效能考量

1. Schedule Trigger 不要設太密（每分鐘 = 每天 1440 次）
2. Split In Batches 處理大量資料時加 Wait 節點避免 rate limit
3. AI API 呼叫有成本，優先用關鍵字比對，漏接的才丟 AI

---

## 附錄 C：接案報價參考

| Workflow 類型 | 建議工時 | 報價範圍（TWD） |
|---------------|---------|----------------|
| 關鍵字自動回覆 | 2-4 hr | $3,000 - $8,000 |
| AI 智能客服 | 4-8 hr | $8,000 - $20,000 |
| 表單通知 | 1-2 hr | $2,000 - $5,000 |
| 網站監控 | 2-3 hr | $3,000 - $8,000（含月費） |
| 定期報告 | 2-4 hr | $3,000 - $10,000 |
| 歡迎信 | 2-3 hr | $3,000 - $8,000 |
| 訂單通知 | 4-8 hr | $8,000 - $20,000 |
| 預約系統 | 8-16 hr | $15,000 - $40,000 |

> 以上為純 n8n workflow 建置費用，不含 LINE OA 月費、AI API 成本、主機費用。
> 月維護費建議另收 $1,000 - $3,000/月（含監控、關鍵字更新、故障排除）。
