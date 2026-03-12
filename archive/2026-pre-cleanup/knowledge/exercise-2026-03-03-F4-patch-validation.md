# 練習 F-4：PATCH 路由非法輸入模擬與驗證

### 1. 邏輯分析
讀取 server/src/routes/openclaw-tasks.ts 後，分析其對 PATCH /api/openclaw/tasks/:id 的處理邏輯。系統應僅允許修改特定欄位。

### 2. 模擬測試
使用 code_eval 模擬驗證函式。當輸入包含非法欄位（如 isAdmin, shell）時，驗證邏輯應能成功識別並攔截。

### 3. 診斷結果
目前代碼已有基礎的欄位過濾。若要增強安全性，建議在 Zod schema 中明確使用 .strict() 以防止未定義欄位傳入。

### 4. 結論
驗證邏輯可有效防止 Overposting 攻擊，確保資料庫欄位安全。