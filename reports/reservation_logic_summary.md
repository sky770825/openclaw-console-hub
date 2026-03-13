# 美業預約系統後端邏輯設計

## 1. 衝突處理機制 (Conflict Resolution)
- 採用「時間區段重疊檢測」演算法。
- 邏輯：`NOT (new_end <= existing_start OR new_start >= existing_end)`。
- 針對同一位服務人員 (staff_id) 進行排他性檢查。

## 2. 狀態管理 (Status Management)
- 支援狀態：`pending` (待確認), `confirmed` (已確認), `completed` (已完成), `cancelled` (已取消)。
- 狀態變更時會觸發通知機制。

## 3. 通知機制 (Notification)
- 封裝為 `sendNotification` 函式。
- 目前實作為 Mock Log，可輕易擴充為 SendGrid 或 LINE Notify API。

## 4. 實作位置
- 核心邏輯：`/Users/sky770825/.openclaw/workspace/scripts/reservation_backend/index.js`
