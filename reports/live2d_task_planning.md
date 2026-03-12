# Live2D 任務面板實作規劃報告

## 數據聯動 (Data Linkage)
- **狀態同步**: 前端透過 `GET /api/tasks` 獲取實時狀態。
- **動作觸發**: 當 `POST /api/tasks/:id/complete` 被調用時，後端返回 `live2dTrigger` 欄位，前端 SDK 捕獲此標識並切換 Live2D 模型動作。

## UI/UX 設計
- **懸浮面板**: 採用毛玻璃效果面板，置於模型右側。
- **動態反饋**: 任務完成後，模型播放特定 Expression (表情) 並伴隨粒子效果。

## API 整合清單
- `GET /api/tasks`: 獲取任務列表。
- `POST /api/tasks/:id/complete`: 提交任務進度。
