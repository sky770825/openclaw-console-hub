# 美業預約系統後端邏輯分析報告
## 實作功能清單
1. **排程邏輯**: 基於 ISO8601 時間戳記進行精確計算。
2. **衝突處理**: 檢索特定美甲師/美容師的時間區間，防止重疊預約。
3. **狀態管理**: 支援 Pending (待確認), Confirmed (已確認), Completed (已完成), Cancelled (取消)。
4. **通知機制**: 模擬發送狀態更新通知（見 notifications.log）。

## 測試結果
### 預約列表
[
  {
    "id": 1,
    "customer": "Alice",
    "service": "Manicure",
    "professional": "Stylist_A",
    "start_time": "2023-12-25T10:00:00",
    "end_time": "2023-12-25T11:00:00",
    "status": "Confirmed",
    "created_at": "2026-03-07T05:48:10.467875"
  },
  {
    "id": 2,
    "customer": "Bob",
    "service": "Pedicure",
    "professional": "Stylist_B",
    "start_time": "2023-12-25T10:30:00",
    "end_time": "2023-12-25T11:30:00",
    "status": "Pending",
    "created_at": "2026-03-07T05:48:10.520286"
  }
]

### 通知日誌
[2026-03-07T05:48:10.468122] NOTIFICATION to Alice: Booking Created (Pending Confirmation) (Booking ID: 1)
[2026-03-07T05:48:10.520441] NOTIFICATION to Bob: Booking Created (Pending Confirmation) (Booking ID: 2)
[2026-03-07T05:48:10.540445] NOTIFICATION to Alice: Status updated from Pending to Confirmed (Booking ID: 1)
