# Live2D 任務面板實作規劃

## 1. 數據聯動設計
- **Task 狀態與 Live2D 動作映射**:
  - 任務領取: `interact`
  - 任務完成: `happy` / `celebrate`
  - 任務失敗/逾期: `sad`
  - 閒置狀態: `idle_loop`
- **API 響應**: 每個任務 API 回傳時攜帶 `live2d_trigger` 欄位，告知前端需觸發的動作 ID。

## 2. API 整合方案
- `GET /api/tasks`: 獲取任務列表及當前角色的情緒狀態。
- `POST /api/tasks/:id/interact`: 觸發任務互動，回傳即時的 Live2D 反饋。

## 3. UI/UX 增強
- 任務面板疊加在 Live2D 畫布側邊。
- 點擊任務時，角色會轉向用戶或做出指引動作。
