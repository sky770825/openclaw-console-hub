---
tags: [LINE, OA, Messaging-API, webhook, 關鍵字回覆, 聊天機器人, Flex-Message, n8n]
date: 2026-03-05
category: cookbook
---

# 15 — LINE OA 技術設定指南

> 給技術人員（老蔡）看的完整指南：幫客戶設定 LINE Official Account + n8n 自動回覆
> 最後更新：2026-03-05

---

## 目錄

1. [LINE Official Account 申請](#1-line-official-account-申請)
2. [LINE Developers Console 設定](#2-line-developers-console-設定)
3. [n8n Webhook 設定](#3-n8n-webhook-設定)
4. [關鍵字自動回覆設定](#4-關鍵字自動回覆設定)
5. [AI 智能回覆（進階）](#5-ai-智能回覆進階)
6. [Flex Message 卡片](#6-flex-message-卡片)
7. [Rich Menu 設定](#7-rich-menu-設定)
8. [推播訊息](#8-推播訊息)
9. [常見問題排除](#9-常見問題排除)
10. [快速部署 Checklist](#10-快速部署-checklist)

---

## 1. LINE Official Account 申請

### 1.1 申請網址

前往 **LINE Official Account Manager**：
```
https://manager.line.biz/
```

點擊「免費開設帳號」，用客戶的 LINE 帳號登入（或幫客戶建一個專用帳號）。

### 1.2 填寫資料

- **帳號名稱**：客戶的店名 / 品牌名（之後可改）
- **業種**：選最接近的分類（例如「餐飲」「零售」「美容」）
- **公司/店鋪名稱**：填正式名稱
- **地區**：台灣

完成後會直接進入 LINE Official Account Manager 後台。

### 1.3 免費版 vs 付費版差異（2026 年台灣方案）

| 項目 | 免費（Communication） | 輕用量 | 中用量 | 高用量 |
|------|----------------------|--------|--------|--------|
| 月費 | NT$0 | NT$800 | NT$4,000 | NT$10,000 |
| 免費訊息則數 | 200 則/月 | 3,000 則/月 | 6,000 則/月 | 15,000 則/月 |
| 加購訊息 | 不可 | 可（每則約 NT$0.15 起） | 可 | 可 |
| Messaging API | 可用 | 可用 | 可用 | 可用 |
| 群發推播 | 可用 | 可用 | 可用 | 可用 |

> **注意**：LINE 的計費方式在 2023 年改版過，「免費訊息」只算**推播（Push/Multicast/Broadcast）**，用戶主動發訊息後的**回覆（Reply）不計費**。這很重要——透過 Webhook + Reply API 回覆是免費的。

### 1.4 建議客戶選哪個

- **剛起步 / 試水溫**：先用免費版。每月 200 則推播夠用，回覆不限量。
- **有固定客群（200~3000 人/月需推播）**：輕用量 NT$800。
- **餐廳 / 零售有定期促銷**：中用量 NT$4,000。
- **大量推播需求**：高用量或依需求計算。

**重點提醒客戶**：回覆（Reply）不花錢，所以自動回覆系統完全不影響額度。只有你主動推訊息給客戶（Push）才算則數。

---

## 2. LINE Developers Console 設定

### 2.1 建立 Provider

1. 前往 **LINE Developers Console**：
   ```
   https://developers.line.biz/console/
   ```
2. 用同一個 LINE 帳號登入
3. 點擊左側「Providers」→「Create」
4. **Provider name**：填客戶公司名（例如 `蔡家餐飲有限公司`）
5. 點「Create」完成

> Provider 是一個容器，底下可以放多個 Channel。一個客戶建一個 Provider。

### 2.2 建立 Messaging API Channel

1. 在剛建好的 Provider 裡，點「Create a new channel」
2. 選「Messaging API」
3. 填寫：
   - **Channel name**：和 LINE OA 帳號名稱一樣
   - **Channel description**：簡單描述（例如「客戶自動回覆服務」）
   - **Category / Subcategory**：選最接近的
   - **Email address**：客戶的聯繫信箱
4. 勾選同意條款，點「Create」

> **如果客戶已有 LINE OA**：在 LINE Official Account Manager 的「設定」→「Messaging API」點「啟用 Messaging API」，會自動在 LINE Developers Console 建立 Channel，不需要手動建。

### 2.3 取得三個重要值

進入剛建好的 Channel，分別取得以下資訊：

#### Channel ID
- 在「Basic settings」分頁
- 找到「Channel ID」欄位
- 格式：一串數字，例如 `1234567890`

#### Channel Secret
- 在「Basic settings」分頁
- 找到「Channel secret」欄位
- 格式：32 字元 hex 字串，例如 `a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4`
- 用於 Webhook 簽章驗證

#### Channel Access Token（長期）
- 在「Messaging API」分頁
- 拉到最下方「Channel access token (long-lived)」
- 點「Issue」產生 Token
- 格式：很長的一串 Base64 字串
- **這個 Token 不會過期**，但可以 Reissue（舊的會立即失效）

> **安全提醒**：Channel Secret 和 Access Token 要妥善保管。不要放在前端程式碼裡。

### 2.4 設定 Webhook URL

1. 在「Messaging API」分頁
2. 找到「Webhook settings」區塊
3. 點「Edit」
4. 填入 Webhook URL：
   ```
   https://sky770825.zeabur.app/webhook/{自訂路徑}
   ```
   例如：
   ```
   https://sky770825.zeabur.app/webhook/line-customer-abc
   ```
5. 點「Update」儲存
6. 點「Verify」測試連線 — 應該要看到「Success」

> **URL 格式說明**：n8n 的 Webhook URL 是你在 n8n 裡建立 Webhook 節點時產生的。先去 n8n 建好（見第 3 節），再回來貼 URL。

### 2.5 開啟 Webhook、關閉自動回覆

在「Messaging API」分頁：

1. **Use webhook**：打開（ON）
2. **回到 LINE Official Account Manager**（https://manager.line.biz/）
3. 進入帳號 → 左側選「設定」→「回應設定」
4. **回應模式**：選「Bot」（不是「聊天」）
5. **自動回應訊息**：關閉（OFF）
6. **Webhook**：開啟（ON）

> **為什麼要關閉自動回應？** 因為我們要讓所有訊息都走 n8n 的 Webhook，由我們自己的邏輯處理。如果 LINE 內建的自動回覆沒關，用戶會收到兩則回覆（LINE 內建一則 + 我們的一則）。

### 2.6 取得加入好友 QR Code

1. 在 LINE Official Account Manager → 左側「加入好友」→「加入好友工具」
2. 可以下載：
   - **QR Code 圖片**（印在名片、海報、店面）
   - **加入好友按鈕**（放在網站）
   - **加入好友連結**：`https://line.me/R/ti/p/@xxxxx`
3. 也可以在 LINE Developers Console 的 Messaging API 分頁看到 **Bot basic ID**（@開頭的 ID）

把 QR Code 和連結交給客戶，讓客戶放到店面、名片、社群。

---

## 3. n8n Webhook 設定

### 3.1 建立新 Workflow

1. 開啟 n8n：`https://sky770825.zeabur.app`
2. 點右上角「+」建立新 Workflow
3. 命名：`LINE OA - {客戶名稱}`（例如 `LINE OA - 蔡家小吃`）

### 3.2 新增 Webhook 節點

1. 點畫布中的「+」加入節點
2. 搜尋「Webhook」
3. 設定：
   - **HTTP Method**：`POST`
   - **Path**：自訂路徑，例如 `line-customer-abc`
     - 產生的完整 URL 會是 `https://sky770825.zeabur.app/webhook/line-customer-abc`
   - **Authentication**：None（LINE 用 X-Line-Signature 自己做驗證）
   - **Response Mode**：`Immediately`（必須馬上回 200，否則 LINE 會 timeout）
   - **Response Code**：`200`

> **重要**：Response Mode 必須設為 Immediately，讓 n8n 先回 200 給 LINE，再繼續處理後續邏輯。LINE 的 Webhook 要求 1 秒內回應，超過會重試。

### 3.3 取得 Webhook URL

- 點 Webhook 節點 → 上方會顯示 **Production URL**
- 格式：`https://sky770825.zeabur.app/webhook/line-customer-abc`
- **Test URL** 和 **Production URL** 不同，部署時要用 Production URL

### 3.4 貼回 LINE Developers Console

1. 複製 Production URL
2. 回到 LINE Developers Console → Messaging API → Webhook settings → Edit
3. 貼上 URL
4. 點「Update」→「Verify」

### 3.5 驗證 Webhook 連線

驗證流程：

1. 在 LINE Developers Console 點「Verify」
   - 成功：顯示「Success」
   - 失敗：檢查 n8n Workflow 有沒有啟動（右上角 Active 開關要打開）

2. 用手機加入好友，傳一則訊息
3. 回到 n8n，點 Webhook 節點，檢查 Execution 有沒有收到資料
4. 收到的 JSON 結構長這樣：

```json
{
  "destination": "U1234567890abcdef",
  "events": [
    {
      "type": "message",
      "message": {
        "type": "text",
        "id": "468XXXXX",
        "text": "你好"
      },
      "source": {
        "type": "user",
        "userId": "Uxxxxxxxxxxxxxxx"
      },
      "replyToken": "xxxxxxxxxxxxxxxxxxxxxxxxx",
      "timestamp": 1709640000000
    }
  ]
}
```

> **關鍵欄位**：
> - `events[0].message.text` — 用戶傳的文字
> - `events[0].source.userId` — 用戶 ID（用於 Push 推播）
> - `events[0].replyToken` — 回覆 Token（用於 Reply，30 秒內有效）

---

## 4. 關鍵字自動回覆設定

### 4.1 n8n Workflow 架構

完整的自動回覆 Workflow 結構如下：

```
[Webhook] → [IF: 有 events] → [Set: 取出訊息] → [Switch: 比對關鍵字] → [HTTP Request: Reply]
```

### 4.2 Set 節點 — 提取訊息資料

在 Webhook 後加一個 Set 節點，取出關鍵資料：

- **Name**: `提取訊息`
- **設定以下欄位**：
  - `messageText` = `{{ $json.body.events[0].message.text }}`
  - `replyToken` = `{{ $json.body.events[0].replyToken }}`
  - `userId` = `{{ $json.body.events[0].source.userId }}`
  - `messageType` = `{{ $json.body.events[0].message.type }}`
  - `eventType` = `{{ $json.body.events[0].type }}`

### 4.3 Switch 節點 — 關鍵字比對

新增 Switch 節點，針對 `messageText` 做比對：

- **Mode**: Rules
- **Data Type**: String
- **Value**: `{{ $json.messageText }}`

設定以下 Output Rules：

| Output | 條件 | 值 |
|--------|------|-----|
| Output 0 | Contains | `營業時間` |
| Output 1 | Contains | `地址` |
| Output 2 | Contains | `預約` |
| Output 3 | Contains | `客服` |
| Output 4 | Fallback（Default） | 其他所有訊息 |

> **技巧**：用 Contains 而非 Equal，這樣「請問你們營業時間？」也能匹配。

### 4.4 各關鍵字回覆範例

每個 Switch Output 接一個 HTTP Request 節點，呼叫 LINE Reply API。

#### HTTP Request 節點基本設定

所有回覆共用的設定：

- **Method**: POST
- **URL**: `https://api.line.me/v2/bot/message/reply`
- **Authentication**: None（改用 Header）
- **Headers**:
  ```
  Content-Type: application/json
  Authorization: Bearer {客戶的 Channel Access Token}
  ```

> **Token 管理**：用 n8n 的 Credentials 功能存 Token，不要直接寫死在節點裡。建立一個 Header Auth credential，Name 填 `Authorization`，Value 填 `Bearer {token}`。

#### Output 0 — 營業時間

Body（JSON）：
```json
{
  "replyToken": "{{ $('提取訊息').item.json.replyToken }}",
  "messages": [
    {
      "type": "text",
      "text": "我們的營業時間如下：\n\n週一至週五：11:00 - 21:00\n週六日：10:00 - 22:00\n\n國定假日照常營業\n\n如需預約，請輸入「預約」"
    }
  ]
}
```

#### Output 1 — 地址

Body（JSON）：
```json
{
  "replyToken": "{{ $('提取訊息').item.json.replyToken }}",
  "messages": [
    {
      "type": "text",
      "text": "我們的地址：\n\n台北市信義區信義路五段 7 號\n（近捷運台北 101 站 4 號出口）\n\n Google Maps：https://maps.google.com/?q=25.0330,121.5654"
    },
    {
      "type": "location",
      "title": "蔡家小吃",
      "address": "台北市信義區信義路五段 7 號",
      "latitude": 25.0330,
      "longitude": 121.5654
    }
  ]
}
```

> **注意**：LINE Reply API 一次最多回 5 則訊息。上面同時回了文字 + 地圖，佔 2 則。

#### Output 2 — 預約

Body（JSON）：
```json
{
  "replyToken": "{{ $('提取訊息').item.json.replyToken }}",
  "messages": [
    {
      "type": "text",
      "text": "歡迎預約！\n\n請點擊以下連結填寫預約表單：\nhttps://forms.gle/xxxxx\n\n或直接告訴我：\n- 預約日期\n- 預約時間\n- 用餐人數\n- 聯繫電話\n\n我們會盡快為您確認！"
    }
  ]
}
```

#### Output 3 — 客服（轉真人）

Body（JSON）：
```json
{
  "replyToken": "{{ $('提取訊息').item.json.replyToken }}",
  "messages": [
    {
      "type": "text",
      "text": "感謝您的訊息，正在為您轉接真人客服。\n\n客服時間：週一至週五 09:00-18:00\n\n若非客服時間，請留下您的問題，我們會在上班後第一時間回覆您。\n\n也可以撥打客服專線：02-1234-5678"
    }
  ]
}
```

> **進階做法**：Output 3 除了回覆用戶，還可以同時用另一個 HTTP Request 節點把訊息推送到客戶的 Telegram / Email，通知客戶有人需要真人客服。

#### Output 4 — 其他（AI 自動回覆 / 預設回覆）

簡單版 — 固定文字：
```json
{
  "replyToken": "{{ $('提取訊息').item.json.replyToken }}",
  "messages": [
    {
      "type": "text",
      "text": "感謝您的訊息！\n\n以下是常見問題快速入口：\n\n輸入「營業時間」查詢營業時間\n輸入「地址」查看店家位置\n輸入「預約」進行預約\n輸入「客服」聯繫真人客服\n\n如有其他問題，我們的客服人員會盡快回覆您！"
    }
  ]
}
```

進階版接 AI — 見第 5 節。

---

## 5. AI 智能回覆（進階）

### 5.1 接 Gemini 2.5 Flash

在 n8n 裡使用 HTTP Request 節點呼叫 Gemini API，免費額度非常充裕。

Workflow 架構：
```
[Switch: Default] → [HTTP Request: Gemini] → [Set: 取出回覆] → [HTTP Request: LINE Reply]
```

#### Gemini HTTP Request 節點設定

- **Method**: POST
- **URL**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}`
- **Headers**:
  ```
  Content-Type: application/json
  ```
- **Body (JSON)**:

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "{{ $('提取訊息').item.json.messageText }}"
        }
      ]
    }
  ],
  "systemInstruction": {
    "parts": [
      {
        "text": "你是「蔡家小吃」的 LINE 客服助理。請用親切、專業的口吻回答客戶問題。\n\n店家資訊：\n- 店名：蔡家小吃\n- 地址：台北市信義區信義路五段 7 號\n- 營業時間：週一至週五 11:00-21:00，週六日 10:00-22:00\n- 電話：02-1234-5678\n- 招牌菜：紅燒牛肉麵、蔥油餅、珍珠奶茶\n- 價格區間：NT$80-250\n- 可接受預約（4人以上建議先預約）\n- 有提供外帶和外送（UberEats、foodpanda）\n\n注意事項：\n1. 回覆要簡短（200字以內），LINE 上太長沒人看\n2. 適當使用表情符號增加親和力\n3. 不知道的事情不要亂說，引導客戶聯繫真人客服\n4. 不要提及你是 AI，以「小編」自稱\n5. 回覆使用繁體中文"
      }
    ]
  },
  "generationConfig": {
    "maxOutputTokens": 500,
    "temperature": 0.7
  }
}
```

#### Set 節點 — 取出 Gemini 回覆

取出 Gemini 的回覆文字：
- `aiReply` = `{{ $json.candidates[0].content.parts[0].text }}`

#### 截斷長度

LINE 單則文字訊息上限 5000 字元。為了閱讀體驗，建議限制在 200-300 字：

在 Set 節點加一個欄位：
- `replyText` = `{{ $json.aiReply.substring(0, 500) }}`

### 5.2 System Prompt 設計重點

給客戶寫 System Prompt 時，必須包含以下資訊：

```
1. 角色設定（你是 XXX 的客服助理）
2. 店家基本資訊（地址、電話、營業時間）
3. 產品/服務資訊（菜單、價格、特色）
4. 回覆規則：
   - 簡短（LINE 訊息 200 字內為佳）
   - 親切用語
   - 不知道就引導轉真人
   - 不說自己是 AI
5. 禁止事項（不提競爭對手、不亂報價格等）
```

### 5.3 對話歷史 — 用 Google Sheets 存

要讓 AI 記得上下文，需要存對話歷史。用 Google Sheets 最簡單：

1. 建一個 Google Sheets，欄位：`userId | role | message | timestamp`
2. 每次收到訊息：
   - 先用 Google Sheets 節點（Search / Lookup）查該 userId 最近 10 筆對話
   - 把歷史對話塞進 Gemini 的 contents 陣列
   - 用戶訊息加一筆 `role=user`
   - AI 回覆後加一筆 `role=model`

Gemini 的 contents 格式（含歷史）：
```json
{
  "contents": [
    { "role": "user", "parts": [{ "text": "你們有什麼推薦的？" }] },
    { "role": "model", "parts": [{ "text": "我們的招牌是紅燒牛肉麵..." }] },
    { "role": "user", "parts": [{ "text": "那牛肉麵多少錢？" }] }
  ]
}
```

> **省 Token 技巧**：只保留最近 5-10 輪對話，超過就丟掉舊的。每天凌晨用排程清理 30 天前的紀錄。

### 5.4 回覆長度限制

LINE 的限制：
- 單則文字訊息：**5,000 字元**
- 單次 Reply：**最多 5 則訊息**
- Flex Message altText：**400 字元**

建議在 AI 回覆後做截斷：
```
{{ $json.aiReply.length > 500 ? $json.aiReply.substring(0, 497) + "..." : $json.aiReply }}
```

---

## 6. Flex Message 卡片

### 6.1 可用的模板函式（flex-templates.ts）

系統已經內建 12 種 Flex Message 模板，位於 `openclaw-main/src/line/flex-templates.ts`：

| # | 函式名稱 | 用途 | 適用場景 |
|---|---------|------|---------|
| 1 | `createInfoCard` | 資訊卡片（標題+內文+頁尾） | 商品介紹、公告 |
| 2 | `createListCard` | 列表卡片（標題+多項目） | 菜單、服務列表 |
| 3 | `createImageCard` | 圖片卡片（圖+標題+內文） | 商品展示 |
| 4 | `createActionCard` | 動作卡片（標題+按鈕） | CTA、導購 |
| 5 | `createCarousel` | 輪播卡片（多張滑動） | 多商品展示 |
| 6 | `createNotificationBubble` | 通知氣泡（info/success/warning/error） | 訂單狀態通知 |
| 7 | `createReceiptCard` | 收據卡片（項目+金額+合計） | 訂單確認、收據 |
| 8 | `createEventCard` | 活動卡片（日期+時間+地點） | 預約確認 |
| 9 | `createAgendaCard` | 議程卡片（多活動時間軸） | 每日行程 |
| 10 | `createMediaPlayerCard` | 媒體播放卡片 | 音樂/影片控制 |
| 11 | `createAppleTvRemoteCard` | Apple TV 遙控器 | IoT 控制 |
| 12 | `createDeviceControlCard` | 裝置控制卡片 | 智能家居 |

輔助函式：
- `toFlexMessage(altText, contents)` — 把 FlexContainer 包成 FlexMessage
- `createCarousel(bubbles[])` — 把多張 Bubble 包成 Carousel（最多 12 張）

### 6.2 在 n8n 裡用的 JSON 格式

n8n 的 HTTP Request 節點只需要純 JSON，以下是最常用的三個模板的完整 Body。

#### 商品卡片（Info Card 風格）

```json
{
  "replyToken": "{{ $json.replyToken }}",
  "messages": [
    {
      "type": "flex",
      "altText": "蔡家小吃 - 紅燒牛肉麵",
      "contents": {
        "type": "bubble",
        "size": "mega",
        "hero": {
          "type": "image",
          "url": "https://example.com/beef-noodle.jpg",
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
              "text": "紅燒牛肉麵",
              "weight": "bold",
              "size": "xl",
              "color": "#111111"
            },
            {
              "type": "text",
              "text": "嚴選澳洲牛腱，慢燉 8 小時，搭配手工拉麵",
              "size": "md",
              "color": "#666666",
              "wrap": true,
              "margin": "md"
            },
            {
              "type": "text",
              "text": "NT$ 180",
              "size": "xl",
              "weight": "bold",
              "color": "#06C755",
              "margin": "lg"
            }
          ],
          "paddingAll": "xl"
        },
        "footer": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "button",
              "action": {
                "type": "uri",
                "label": "立即訂購",
                "uri": "https://example.com/order"
              },
              "style": "primary",
              "color": "#06C755"
            },
            {
              "type": "button",
              "action": {
                "type": "message",
                "label": "查看完整菜單",
                "text": "菜單"
              },
              "style": "secondary",
              "margin": "sm"
            }
          ],
          "paddingAll": "lg"
        }
      }
    }
  ]
}
```

#### 預約確認卡片（Receipt Card 風格）

```json
{
  "replyToken": "{{ $json.replyToken }}",
  "messages": [
    {
      "type": "flex",
      "altText": "預約確認通知",
      "contents": {
        "type": "bubble",
        "size": "mega",
        "body": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "box",
              "layout": "horizontal",
              "contents": [
                {
                  "type": "box",
                  "layout": "vertical",
                  "contents": [],
                  "width": "4px",
                  "backgroundColor": "#06C755",
                  "cornerRadius": "2px"
                },
                {
                  "type": "text",
                  "text": "預約確認",
                  "weight": "bold",
                  "size": "xl",
                  "color": "#111111",
                  "margin": "lg",
                  "flex": 1
                }
              ]
            },
            {
              "type": "separator",
              "margin": "xl",
              "color": "#EEEEEE"
            },
            {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "box",
                  "layout": "horizontal",
                  "contents": [
                    { "type": "text", "text": "日期", "size": "sm", "color": "#666666", "flex": 2 },
                    { "type": "text", "text": "2026/03/10（二）", "size": "sm", "color": "#333333", "flex": 3, "align": "end" }
                  ],
                  "paddingAll": "md"
                },
                {
                  "type": "box",
                  "layout": "horizontal",
                  "contents": [
                    { "type": "text", "text": "時間", "size": "sm", "color": "#666666", "flex": 2 },
                    { "type": "text", "text": "18:30", "size": "sm", "color": "#333333", "flex": 3, "align": "end" }
                  ],
                  "paddingAll": "md",
                  "backgroundColor": "#FAFAFA"
                },
                {
                  "type": "box",
                  "layout": "horizontal",
                  "contents": [
                    { "type": "text", "text": "人數", "size": "sm", "color": "#666666", "flex": 2 },
                    { "type": "text", "text": "4 位", "size": "sm", "color": "#333333", "flex": 3, "align": "end" }
                  ],
                  "paddingAll": "md"
                },
                {
                  "type": "box",
                  "layout": "horizontal",
                  "contents": [
                    { "type": "text", "text": "姓名", "size": "sm", "color": "#666666", "flex": 2 },
                    { "type": "text", "text": "蔡先生", "size": "sm", "color": "#333333", "flex": 3, "align": "end" }
                  ],
                  "paddingAll": "md",
                  "backgroundColor": "#FAFAFA"
                }
              ],
              "margin": "xl",
              "cornerRadius": "md",
              "borderWidth": "light",
              "borderColor": "#EEEEEE"
            },
            {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "text",
                  "text": "如需修改或取消預約，請輸入「客服」",
                  "size": "xs",
                  "color": "#888888",
                  "wrap": true,
                  "align": "center"
                }
              ],
              "margin": "xl",
              "paddingAll": "md",
              "backgroundColor": "#F0FDF4",
              "cornerRadius": "lg"
            }
          ],
          "paddingAll": "xl",
          "backgroundColor": "#FFFFFF"
        }
      }
    }
  ]
}
```

#### 多商品輪播卡片（Carousel）

```json
{
  "replyToken": "{{ $json.replyToken }}",
  "messages": [
    {
      "type": "flex",
      "altText": "本週推薦菜色",
      "contents": {
        "type": "carousel",
        "contents": [
          {
            "type": "bubble",
            "hero": {
              "type": "image",
              "url": "https://example.com/dish1.jpg",
              "size": "full",
              "aspectRatio": "20:13",
              "aspectMode": "cover"
            },
            "body": {
              "type": "box",
              "layout": "vertical",
              "contents": [
                { "type": "text", "text": "紅燒牛肉麵", "weight": "bold", "size": "lg" },
                { "type": "text", "text": "NT$ 180", "color": "#06C755", "weight": "bold", "margin": "sm" }
              ],
              "paddingAll": "lg"
            },
            "footer": {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "button",
                  "action": { "type": "message", "label": "我要點這個", "text": "我要紅燒牛肉麵" },
                  "style": "primary",
                  "color": "#06C755"
                }
              ],
              "paddingAll": "md"
            }
          },
          {
            "type": "bubble",
            "hero": {
              "type": "image",
              "url": "https://example.com/dish2.jpg",
              "size": "full",
              "aspectRatio": "20:13",
              "aspectMode": "cover"
            },
            "body": {
              "type": "box",
              "layout": "vertical",
              "contents": [
                { "type": "text", "text": "蔥油餅", "weight": "bold", "size": "lg" },
                { "type": "text", "text": "NT$ 50", "color": "#06C755", "weight": "bold", "margin": "sm" }
              ],
              "paddingAll": "lg"
            },
            "footer": {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "button",
                  "action": { "type": "message", "label": "我要點這個", "text": "我要蔥油餅" },
                  "style": "primary",
                  "color": "#06C755"
                }
              ],
              "paddingAll": "md"
            }
          }
        ]
      }
    }
  ]
}
```

### 6.3 Flex Message 設計工具

LINE 提供視覺化編輯器，可以即時預覽 Flex Message：

```
https://developers.line.biz/flex-simulator/
```

設計好後複製 JSON，直接貼到 n8n 的 HTTP Request Body。

### 6.4 Flex Message 限制

- Bubble 最多 **12 個**放進一個 Carousel
- 單個 Bubble 的 JSON 大小上限 **30KB**
- altText 上限 **400 字元**
- 按鈕數量 — Footer 最多放 **4 個按鈕**
- 圖片 URL 必須是 **HTTPS**

---

## 7. Rich Menu 設定

### 7.1 什麼是 Rich Menu

Rich Menu 是 LINE 聊天室底部的選單圖片，用戶點擊不同區域可以觸發不同動作。就是聊天室下方那個常駐的圖片選單。

### 7.2 在 LINE Official Account Manager 設定（最簡單）

1. 登入 https://manager.line.biz/
2. 選帳號 → 左側「聊天室相關」→「圖文選單」
3. 點「建立」
4. 設定：
   - **標題**：圖文選單的管理名稱（用戶看不到）
   - **使用期間**：設定選單生效的時間範圍
   - **選單列文字**：用戶看到的選單按鈕文字（例如「查看選單」），上限 14 個字
   - **預設顯示**：是否預設展開選單

### 7.3 圖片尺寸

兩種尺寸：

| 尺寸 | 像素 | 說明 |
|------|------|------|
| 大圖 | 2500 x 1686 px | 佔聊天室約 2/3 高度，適合 6 格選單 |
| 小圖 | 2500 x 843 px | 佔聊天室約 1/3 高度，適合 3 格選單 |

圖片要求：
- 格式：JPEG 或 PNG
- 檔案大小：**1MB 以下**
- 寬度固定 **2500px**

> **製圖建議**：用 Canva 或 Figma 製作。建議每格加上文字標示，讓用戶知道按哪裡有什麼功能。

### 7.4 區域設定（最多 6 格）

大圖（2500 x 1686）的 6 格標準布局：

```
+----------+----------+----------+
|          |          |          |
|  區域 1  |  區域 2  |  區域 3  |
|          |          |          |
+----------+----------+----------+
|          |          |          |
|  區域 4  |  區域 5  |  區域 6  |
|          |          |          |
+----------+----------+----------+
```

每格對應的座標（API 設定用）：

| 區域 | x | y | width | height |
|------|---|---|-------|--------|
| 1 | 0 | 0 | 833 | 843 |
| 2 | 833 | 0 | 833 | 843 |
| 3 | 1666 | 0 | 834 | 843 |
| 4 | 0 | 843 | 833 | 843 |
| 5 | 833 | 843 | 833 | 843 |
| 6 | 1666 | 843 | 834 | 843 |

小圖（2500 x 843）的 3 格標準布局：

| 區域 | x | y | width | height |
|------|---|---|-------|--------|
| 1 | 0 | 0 | 833 | 843 |
| 2 | 833 | 0 | 833 | 843 |
| 3 | 1666 | 0 | 834 | 843 |

### 7.5 點擊動作

每個區域可以設定一種動作：

| 動作類型 | 說明 | 使用場景 |
|---------|------|---------|
| **URI** | 開啟網頁連結 | 官網、預約表單、社群 |
| **文字** | 自動輸入文字送出（會觸發 Webhook） | 觸發自動回覆關鍵字 |
| **Postback** | 送出隱藏資料（用戶不會看到） | 進階流程控制 |

常見客戶 Rich Menu 配置範例：

| 位置 | 圖示文字 | 動作類型 | 動作內容 |
|------|---------|---------|---------|
| 左上 | 營業時間 | 文字 | `營業時間` |
| 中上 | 菜單 | URI | `https://example.com/menu` |
| 右上 | 預約 | 文字 | `預約` |
| 左下 | 地址導航 | URI | `https://maps.google.com/...` |
| 中下 | 最新活動 | URI | `https://example.com/events` |
| 右下 | 聯繫客服 | 文字 | `客服` |

### 7.6 用 API 設定 Rich Menu（進階）

如果要用 API 批次設定（例如多客戶部署），可以用系統內建的 `rich-menu.ts`：

```bash
# 用 curl 建立 Rich Menu
curl -X POST https://api.line.me/v2/bot/richmenu \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {CHANNEL_ACCESS_TOKEN}" \
  -d '{
    "size": { "width": 2500, "height": 843 },
    "selected": false,
    "name": "客戶選單",
    "chatBarText": "查看選單",
    "areas": [
      {
        "bounds": { "x": 0, "y": 0, "width": 833, "height": 843 },
        "action": { "type": "message", "label": "營業時間", "text": "營業時間" }
      },
      {
        "bounds": { "x": 833, "y": 0, "width": 833, "height": 843 },
        "action": { "type": "uri", "label": "菜單", "uri": "https://example.com/menu" }
      },
      {
        "bounds": { "x": 1666, "y": 0, "width": 834, "height": 843 },
        "action": { "type": "message", "label": "客服", "text": "客服" }
      }
    ]
  }'
```

建立後會回傳 `richMenuId`，接著上傳圖片並設為預設：

```bash
# 上傳圖片
curl -X POST https://api-data.line.me/v2/bot/richmenu/{richMenuId}/content \
  -H "Authorization: Bearer {CHANNEL_ACCESS_TOKEN}" \
  -H "Content-Type: image/png" \
  --data-binary @rich-menu-image.png

# 設為預設 Rich Menu（所有用戶都看得到）
curl -X POST https://api.line.me/v2/bot/user/all/richmenu/{richMenuId} \
  -H "Authorization: Bearer {CHANNEL_ACCESS_TOKEN}"
```

---

## 8. 推播訊息

### 8.1 Push Message（單人推播）

推播給單一用戶（需要 userId）：

```bash
curl -X POST https://api.line.me/v2/bot/message/push \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {CHANNEL_ACCESS_TOKEN}" \
  -d '{
    "to": "U1234567890abcdef...",
    "messages": [
      {
        "type": "text",
        "text": "親愛的蔡先生，提醒您明天 18:30 的預約。期待您的光臨！"
      }
    ]
  }'
```

### 8.2 Multicast（群發推播）

推播給多個用戶（最多 500 個 userId）：

```bash
curl -X POST https://api.line.me/v2/bot/message/multicast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {CHANNEL_ACCESS_TOKEN}" \
  -d '{
    "to": [
      "U1234567890abcdef...",
      "U0987654321fedcba..."
    ],
    "messages": [
      {
        "type": "text",
        "text": "本週特惠！紅燒牛肉麵第二碗半價，限週五至週日！"
      }
    ]
  }'
```

### 8.3 Broadcast（全員推播）

推播給所有好友（不需要 userId，但最消耗額度）：

```bash
curl -X POST https://api.line.me/v2/bot/message/broadcast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {CHANNEL_ACCESS_TOKEN}" \
  -d '{
    "messages": [
      {
        "type": "text",
        "text": "蔡家小吃公告：春節期間 (1/27-2/2) 休息，2/3 起恢復營業。祝大家新年快樂！"
      }
    ]
  }'
```

### 8.4 免費額度與計費

| 方案 | 免費推播則數/月 |
|------|----------------|
| 免費版 | 200 則 |
| 輕用量 NT$800 | 3,000 則 |
| 中用量 NT$4,000 | 6,000 則 |
| 高用量 NT$10,000 | 15,000 則 |

**計算方式**：
- 推播 1 則訊息給 100 人 = 用掉 **100 則**額度
- Reply（回覆用戶主動訊息）= **不計費**
- Push / Multicast / Broadcast = **計費**

### 8.5 省額度技巧

1. **善用 Reply 不計費**：盡量引導用戶主動傳訊息（透過 Rich Menu），用 Reply API 回覆，完全免費

2. **Narrowcast 取代 Broadcast**：用 Narrowcast API 做分眾推播，只推給符合條件的用戶，減少浪費
   ```
   POST https://api.line.me/v2/bot/message/narrowcast
   ```

3. **善用 Rich Menu**：把常用功能放在 Rich Menu，用戶自己點就觸發回覆，不需要主動推播

4. **合併訊息**：一次 Push 可以送 5 則訊息，但只算 1 次推播額度。把相關資訊合併在一次推播裡

5. **用 Flex Message**：一張 Flex Message 可以包含大量資訊（圖片+文字+按鈕），比發多則純文字更省額度

6. **追蹤推播效果**：用 `GET https://api.line.me/v2/bot/insight/message/delivery` 查看推播觸達率，砍掉無效推播

---

## 9. 常見問題排除

### 9.1 Webhook 收不到訊息

**症狀**：用戶傳了訊息，n8n 的 Webhook 沒有觸發

**檢查清單**：

1. **n8n Workflow 有沒有啟動？**
   - 右上角 Active 開關要是 ON（綠色）
   - 沒啟動的 Workflow 不會接收 Production Webhook

2. **用的是 Production URL 還是 Test URL？**
   - LINE Developers Console 要貼 **Production URL**
   - Test URL 只在 n8n 裡手動測試時用

3. **LINE 的 Webhook 有打開嗎？**
   - LINE Developers Console → Messaging API → Use webhook → 要是 ON
   - LINE Official Account Manager → 設定 → 回應設定 → Webhook → 要是 ON

4. **自動回覆有關嗎？**
   - LINE Official Account Manager → 設定 → 回應設定 → 自動回應訊息 → 要是 OFF
   - 沒關的話 LINE 會自己處理訊息，不轉發給 Webhook

5. **Webhook Verify 有通過嗎？**
   - LINE Developers Console → Messaging API → Webhook settings → 點 Verify
   - 如果失敗，看 n8n 的 Log 有沒有收到 Verify 請求

6. **Zeabur 服務有在跑嗎？**
   - 檢查 https://sky770825.zeabur.app 有沒有回應
   - Zeabur 免費方案有冷啟動延遲（見 9.4）

### 9.2 回覆失敗

**症狀**：Webhook 有收到訊息，但用戶沒收到回覆

**常見原因**：

1. **Channel Access Token 過期或錯誤**
   - 到 LINE Developers Console 重新 Issue 一個 Token
   - 更新 n8n 裡的 Token

2. **replyToken 過期**
   - replyToken 只有 **30 秒** 有效期
   - 如果 n8n 處理太久（例如等 AI 回覆），Token 就過期了
   - 解法：先用 Reply 回一則「處理中...」，再用 Push 送正式回覆

3. **JSON 格式錯誤**
   - LINE API 對 JSON 格式很嚴格
   - 常見錯：多餘的逗號、缺少引號、type 打錯
   - 用 LINE 的 API 回傳的錯誤訊息來 debug：
     ```json
     {
       "message": "The request body has 1 error(s)",
       "details": [
         {
           "message": "May not be empty",
           "property": "messages[0].text"
         }
       ]
     }
     ```

4. **Reply API 回傳 400**
   - 檢查 replyToken 是否正確傳遞
   - 檢查 messages 陣列是否為空
   - 檢查 messages 是否超過 5 則

### 9.3 LINE API 錯誤碼速查

| HTTP Status | 原因 | 解法 |
|-------------|------|------|
| 400 | Request Body 格式錯 | 檢查 JSON，用 Flex Simulator 驗證 |
| 401 | Token 無效 | 重新 Issue Channel Access Token |
| 403 | 沒有權限 | 確認 Channel 類型是 Messaging API |
| 408 | replyToken 過期 | 30 秒內要回覆，改用 Push |
| 429 | 請求太多（限流） | 降低頻率，見 9.5 |
| 500 | LINE 內部錯誤 | 重試，通常是暫時性 |

### 9.4 延遲問題 — Zeabur 冷啟動

**症狀**：第一則訊息要等很久才有回覆（10-30 秒），之後就正常

**原因**：Zeabur 免費/基礎方案會在無流量時休眠服務（cold start），第一次請求需要喚醒

**解法**：

1. **設定 Keep-alive**：用 n8n 的 Cron 節點每 5 分鐘 ping 一次自己
   ```
   [Cron: 每5分鐘] → [HTTP Request: GET https://sky770825.zeabur.app/webhook-test/health]
   ```

2. **升級 Zeabur 方案**：付費方案不會休眠

3. **用 Cloudflare Workers 做中間層**：接收 LINE Webhook、馬上回 200、再轉發給 n8n（但增加了複雜度）

### 9.5 429 Too Many Requests — 限流處理

LINE Messaging API 的限流：

| API | 限制 |
|-----|------|
| Reply | 不限 |
| Push | 依方案，免費版每分鐘最多 60 次 |
| Multicast | 每分鐘最多 60 次 |
| Broadcast | 每分鐘最多 60 次 |

**處理方式**：

1. 在 n8n 裡加 Wait 節點做延遲：
   - 批次推播時，每 60 筆暫停 1 分鐘

2. 用 Multicast 合併推播：
   - 一次 Multicast 最多 500 人，只算 1 次 API 呼叫

3. 做重試機制：
   - 在 HTTP Request 節點設定 **Retry on Fail**，延遲 2 秒後重試，最多 3 次

---

## 10. 快速部署 Checklist

交付客戶前，逐項確認：

### 帳號設定

- [ ] LINE Official Account 已申請
- [ ] Messaging API 已啟用
- [ ] Channel ID 已記錄
- [ ] Channel Secret 已記錄
- [ ] Channel Access Token（Long-lived）已產生並記錄
- [ ] 回應模式設為「Bot」
- [ ] 自動回應訊息已關閉（OFF）
- [ ] Webhook 已開啟（ON）

### Webhook 連線

- [ ] n8n Workflow 已建立並命名
- [ ] Webhook 節點已設定（POST、Immediately）
- [ ] Webhook Production URL 已複製
- [ ] URL 已貼到 LINE Developers Console
- [ ] Verify 測試通過（Success）
- [ ] n8n Workflow 已啟動（Active ON）
- [ ] 手機實測傳訊息，n8n 有收到

### 自動回覆

- [ ] Switch 節點已設定關鍵字比對
- [ ] 「營業時間」回覆正確
- [ ] 「地址」回覆正確（含地圖）
- [ ] 「預約」回覆正確（含表單連結）
- [ ] 「客服」回覆正確（含通知機制）
- [ ] 預設回覆（非關鍵字）正確
- [ ] 每則回覆都有正確的 replyToken 傳遞
- [ ] 手機實測所有關鍵字，確認回覆正確

### AI 智能回覆（如有）

- [ ] Gemini API Key 已設定
- [ ] System Prompt 已寫好（含客戶資訊）
- [ ] 回覆長度已限制（500 字以內）
- [ ] 對話歷史已設定存儲（Google Sheets）
- [ ] 測試 AI 回覆品質（問 5 個以上不同問題）
- [ ] 確認 AI 不會亂說不知道的事

### 視覺元素

- [ ] Rich Menu 圖片已製作（正確尺寸）
- [ ] Rich Menu 已上傳並設為預設
- [ ] Rich Menu 每個區域動作已測試
- [ ] Flex Message 已在 Flex Simulator 預覽正確
- [ ] 加入好友 QR Code 已產生並交給客戶

### 安全與維護

- [ ] Channel Secret 和 Token 存在安全位置（n8n Credentials，不是寫死）
- [ ] 客戶知道如何查看 LINE OA 後台的統計數據
- [ ] 已告知客戶推播額度和計費方式
- [ ] 已設定錯誤通知（n8n Error Trigger → Telegram/Email）
- [ ] 已記錄本次設定的所有帳號資訊到客戶檔案

### 交付文件

- [ ] 交給客戶：QR Code + 加入好友連結
- [ ] 交給客戶：關鍵字清單（讓客戶知道支援哪些關鍵字）
- [ ] 交給客戶：推播教學（如果客戶需要自己推播）
- [ ] 內部記錄：客戶 Channel ID / Workflow ID / 設定摘要

---

## 附錄 A — LINE API 快速參考

### 常用 API Endpoint

| 用途 | Method | URL |
|------|--------|-----|
| 回覆訊息 | POST | `https://api.line.me/v2/bot/message/reply` |
| 推播（單人） | POST | `https://api.line.me/v2/bot/message/push` |
| 群發推播 | POST | `https://api.line.me/v2/bot/message/multicast` |
| 全員推播 | POST | `https://api.line.me/v2/bot/message/broadcast` |
| 取得用戶資料 | GET | `https://api.line.me/v2/bot/profile/{userId}` |
| 建立 Rich Menu | POST | `https://api.line.me/v2/bot/richmenu` |
| 上傳 Rich Menu 圖片 | POST | `https://api-data.line.me/v2/bot/richmenu/{id}/content` |
| 設定預設 Rich Menu | POST | `https://api.line.me/v2/bot/user/all/richmenu/{id}` |
| 查看推播使用量 | GET | `https://api.line.me/v2/bot/message/quota/consumption` |
| 查看好友數 | GET | `https://api.line.me/v2/bot/insight/followers` |

### 所有 API 共用的 Header

```
Content-Type: application/json
Authorization: Bearer {CHANNEL_ACCESS_TOKEN}
```

### 訊息類型速查

| 類型 | type 值 | 必要欄位 |
|------|---------|---------|
| 文字 | `text` | `text` |
| 圖片 | `image` | `originalContentUrl`, `previewImageUrl` |
| 影片 | `video` | `originalContentUrl`, `previewImageUrl` |
| 音訊 | `audio` | `originalContentUrl`, `duration` |
| 位置 | `location` | `title`, `address`, `latitude`, `longitude` |
| 貼圖 | `sticker` | `packageId`, `stickerId` |
| Flex | `flex` | `altText`, `contents` |

---

## 附錄 B — n8n Workflow 匯出範本

如果要快速複製設定給新客戶，可以在 n8n 裡匯出 Workflow JSON：

1. 開啟已建好的 Workflow
2. 左上角選單 → Download
3. 存成 JSON 檔案
4. 建立新客戶的 Workflow 時，Import 這個 JSON
5. 修改：
   - Webhook Path（每個客戶不同）
   - Channel Access Token（每個客戶不同）
   - 回覆內容（營業時間、地址等）
   - System Prompt（客戶資訊）

這樣每個新客戶 15 分鐘就能部署完成。
