# 美業網站數據追蹤與分析整合方案 (P1-任務3)

## 1. 關鍵績效指標 (KPI) 定義
為了衡量美業網站的商業成功，定義以下核心指標：
- **預約轉化率 (Appointment Conversion Rate)**: 完成預約的人數 / 總訪問人數。
- **服務瀏覽深度 (Service View Depth)**: 瀏覽超過 3 個服務項目的用戶比例。
- **新舊客比例 (New vs. Returning Customers)**: 衡量品牌忠誠度與獲客成本。
- **表單流失率 (Form Drop-off Rate)**: 開始填寫預約表單但未提交的用戶比例。
- **點擊熱圖關鍵點 (CTA Click-through Rate)**: 「立即預約」、「查看價格」按鈕的點擊率。

## 2. 數據採集點規劃 (Tracking Plan)
| 事件名稱 (Event) | 觸發時機 (Trigger) | 採集參數 (Properties) |
| :--- | :--- | :--- |
| `page_view` | 頁面加載完成 | page_title, page_path, user_id |
| `click_cta` | 點擊主要按鈕 (預約/註冊) | button_name, section_id |
| `view_item` | 進入服務詳情頁 | service_id, service_category, price |
| `begin_checkout` | 開始填寫預約表單 | service_id, time_slot |
| `purchase` | 完成預約提交 | booking_id, value, currency, service_name |
| `search` | 使用站內搜尋功能 | search_term, results_count |

## 3. GA4 與 Amplitude 整合方案研究

### Google Analytics 4 (GA4) - 流量與歸因分析
- **優勢**: 強大的流量來源追蹤、Google Ads 整合。
- **實作**: 使用 GTAG 進行基礎部署，並透過 `dataLayer.push` 發送自定義事件。
- **目標**: 追蹤 SEO 成效與廣告轉化。

### Amplitude - 用戶行為深度分析
- **優勢**:漏斗分析 (Funnel)、留存分析 (Retention)、用戶路徑圖。
- **實作**: 使用 `@amplitude/analytics-browser` SDK。
- **目標**: 優化產品體驗，找出導致用戶流失的具體步驟。

## 4. 實作邏輯建議 (Pseudo-code)
建議建立一個統一的 `TrackingProvider` 層，封裝不同工具的發送邏輯，避免業務代碼與第三方 SDK 耦合。

