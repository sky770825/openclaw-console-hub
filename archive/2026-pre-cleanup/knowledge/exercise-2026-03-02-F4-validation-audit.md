# 練習 F-4：PATCH 路由驗證審計

### 1. 診斷
審查 server/src/routes/openclaw-tasks.ts 中的 PATCH 邏輯。核心在於狀態轉換的合法性檢查。

### 2. 模擬測試
使用 code_eval 模擬狀態驗證函式。結果顯示當前邏輯能正確識別非法狀態（如 'deleted'）。

### 3. 結論
驗證邏輯基本健全，但建議在後端實作更嚴格的狀態機轉換限制（例如禁止從 'done' 直接跳回 'ready'）。