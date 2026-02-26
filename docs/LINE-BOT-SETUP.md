# LINE 詢問機器人 — 設定說明文件

> 任務：P3 LINE 詢問機器人 — 設定說明文件
> 位置：/Users/caijunchang/Downloads/openclaw-console-hub-main/docs/LINE-BOT-SETUP.md

這份文件旨在引導您設定 LINE 官方帳號 (LINE Official Account, OA) 的自動回應功能，以便潛在客戶能快速詢問 990 服務的相關資訊。這是業務推廣的關鍵工具，能幫助您不間斷地服務客戶。

---

## 1. LINE 官方帳號申請與基本設定

### 1.1 申請 LINE 官方帳號

1. 前往 [LINE Business Center](https://manager.line.biz/)，點擊「免費開設帳號」。
2. 依照指示填寫公司或個人資料，完成申請。
3. 取得「Channel ID」和「Channel Access Token」，這些將用於後續的 Webhook 設定。

### 1.2 基本設定

1. **歡迎訊息設定**：設定新朋友加入時發送的歡迎訊息，引導客戶進入詢問流程。
2. **自動回應模式**：將訊息模式設定為「聊天機器人」，確保 Webhook 能正常接收訊息。

---

## 2. Webhook 設定到 OpenClaw Server

將 LINE OA 的訊息轉發到您的 OpenClaw Server 進行處理，實現智能回應。

### 2.1 準備 OpenClaw Server URL

確保您的 OpenClaw Server 已部署並可透過公開 URL 訪問（例如：`https://your-openclaw-server.com` 或 ngrok 轉發的 URL）。

### 2.2 設定 LINE Developers Console

1. 登入 [LINE Developers Console](https://developers.line.biz/)。
2. 選擇您的 LINE OA 頻道。
3. 進入「Messaging API」分頁。
4. 在「Webhook settings」區塊，點擊「Edit」。
5. **Webhook URL**：填寫您的 OpenClaw Server 的 LINE Webhook 接收端點，例如：
   `https://your-openclaw-server.com/api/line/webhook`
6. **啟用 Webhook**：將「Use webhook」開關打開。
7. **Verify**：點擊「Verify」按鈕，確認 OpenClaw Server 能正確接收 Webhook 請求。

---

## 3. 自動回應模板（客戶詢問 990 服務時）

以下是一些建議的自動回應模板，用於客戶詢問 990 服務時使用。您可以將這些模板配置在 OpenClaw Server 的自動回應邏輯中，或直接在 LINE OA 後台設定關鍵字回應（限簡易情況）。

### 模板 1：初次詢問 990 服務

**觸發關鍵字**：`990服務`, `我想了解990`, `990費用`

**回應內容**：

```
您好！感謝您對 NEUXA 990 服務感興趣。990 是一套為中小型企業量身打造的 AI 賦能解決方案，幫助您輕鬆實現數位轉型。

我們提供：
✅ **精準行銷**：AI 分析客戶數據，制定高效行銷策略。
✅ **智能客服**：24/7 自動回應，提升客戶滿意度。
✅ **自動化營運**：簡化日常工作，讓您專注核心業務。

請問您對哪個部分最感興趣呢？

您可以點擊以下選項了解更多：
[了解定價] [預約諮詢] [成功案例]
```

### 模板 2：詢問定價

**觸發關鍵字**：`定價`, `費用`, `多少錢`

**回應內容**：

```
NEUXA 990 服務提供彈性方案，以滿足不同企業需求。我們的定價透明且高性價比，旨在幫助您以最低成本獲得最大效益。

• **基礎版**：適合剛起步的微型企業。
• **專業版**：功能齊全，適合快速成長的企業。
• **旗艦版**：定制化服務，滿足特殊需求。

您可以訪問我們的官網定價頁面獲取最新資訊：
[前往定價頁面](https://your-990-service.com/pricing)

或直接輸入「諮詢」，我們將安排專人為您詳細解說！
```

### 模板 3：預約諮詢

**觸發關鍵字**：`預約`, `諮詢`, `聯繫`

**回應內容**：

```
好的，很高興能為您提供專屬諮詢服務！

請點擊以下連結，選擇您方便的時間：
[預約諮詢連結](https://your-900-service.com/booking)

或留下您的姓名和聯繫方式，我們將盡快與您聯繫。
```

---

## 後續維護

- 定期檢查 LINE OA 後台與 OpenClaw Server 的連線狀態。
- 根據客戶反饋和業務需求，更新自動回應模板。
- 監控 Webhook 日誌，確保訊息無遺漏。

這將確保您的 LINE 詢問機器人始終保持高效運作，成為您業務的最佳助手。
