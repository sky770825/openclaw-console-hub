# Google Business Profile (GBP) API 調研報告

## 1. 配額限制 (Quota Limits)
- **默認配額**：Google Business Profile API 的配額通常基於專案級別。
- **限制細節**：
    - `Queries per day`: 默認情況下，大多數讀取操作（如獲取評論）有足夠的配額供中小型應用使用（通常是每 100 秒 1,000 次請求）。
    - `Write operations`: 回覆評論等寫入操作有更嚴格的限制。
- **風險評估**：對於 n8n 的定期抓取任務，需設置合理的 Cron 間隔（如每 1 小時一次），避免觸發 Rate Limit。

## 2. 審核流程 (Review Process)
- **API 存取權限**：GBP API **不是** 默認開啟的。必須通過 [Google Business Profile API 申請表單](https://developers.google.com/my-business/content/prereqs#request-access) 申請存取權限。
- **審核時間**：通常需要 1-2 週。
- **驗證要求**：需要提供 GCP Project ID，且該 Project 必須與公司實體關聯。
- **風險點**：如果審核未通過，則無法使用官方 API，需考慮替代方案（如網頁爬蟲，但風險較高）。

## 3. 技術串接可行性 (Technical Feasibility)
- **驗證機制**：使用 OAuth 2.0 (Authorization Code Flow)。
- **n8n 整合**：
    - 方法 A：使用 n8n 內建的 "Google Business Profile" 節點（需提供 Client ID/Secret）。
    - 方法 B：使用 "HTTP Request" 節點直接呼叫 REST API (Endpoint: `https://mybusiness.googleapis.com/v1/accounts/{accountId}/locations/{locationId}/reviews`)。
- **權限範圍 (Scopes)**：需要 `https://www.googleapis.com/auth/business.manage`。

## 4. 潛在風險評估 (Potential Risks)
1. **認證過期**：OAuth Refresh Token 可能因密碼更改或 7 天未活動（在測試模式下）而失效。
2. **位置權限**：抓取評論需要 API 帳號對該商家的 Location 有 "Owner" 或 "Manager" 權限。
3. **API 版本演進**：Google 經常更新 My Business API 版本，需關注版本廢棄通知。

## 5. 專案現狀分析 (Existing Codebase)
### 現有專案分析結果
- 掃描目錄: /Users/caijunchang/openclaw任務面版設計
-  中未發現明顯的 Google 專用 SDK，可能需手動安裝或使用純 REST 請求。
