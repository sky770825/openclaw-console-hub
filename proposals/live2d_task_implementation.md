# Live2D 任務面板實作規劃

## 1. 數據聯動 (Data Linkage)
- **State Management**: 使用任務狀態 (Pending, In-Progress, Completed) 驅動 Live2D 模型動作。
- **Trigger Mapping**: 
  - 任務完成 -> 觸發 "Success/Celebrate" 動作。
  - 任務超時 -> 觸發 "Sad/Idle" 動作。
  - 鼠標懸停任務 -> 觸發 "Look At/Interest" 動作。

## 2. API 整合
- **GET /api/tasks**: 獲取當前任務列表及對應的 Live2D 動作標籤。
- **POST /api/tasks/:id/action**: 執行任務動作並回傳 Live2D 反饋指令。

## 3. UI/UX 設計
- 採用半透明毛玻璃效果。
- 任務列表置於 Live2D 角色右側或下方。
- 互動式進度條。
