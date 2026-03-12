# 美業網站服務預約系統後端邏輯設計

## 1. 核心邏輯 (Core Logic)
- **衝突檢查 (Conflict Detection)**: 採用區間重疊算法 `(StartA < EndB) && (StartB < EndA)`。針對同一位服務人員 (Specialist) 的時間區間進行檢查。
- **原子性操作**: 在實際資料庫環境中，應使用事務 (Transaction) 確保預約創建與狀態變更的完整性。

## 2. 狀態機管理 (Status Management)
預約生命週期定義：
- `PENDING` (待確認): 客戶提交預約後的初始狀態。
- `CONFIRMED` (已確認): 商家確認人力與時段後切換。
- `COMPLETED` (已完成): 服務結束後由人員標註。
- `CANCELLED` (已取消): 客戶或商家主動終止預約。

## 3. 通知機制 (Notification Mechanism)
系統在以下觸發點發送通知：
- 預約創建成功（通知商家與客戶）
- 狀態變更（通知客戶預約已被確認、提醒服務即將開始等）
- 預約取消（雙方同步）

## 4. 擴展建議
- 增加 Specialist 排班表 (Shift Management)，預約前需檢查是否在值班時間內。
- 增加服務項目時長配置，自動計算 `endTime`。
