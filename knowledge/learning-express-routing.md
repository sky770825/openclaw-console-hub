# Express.js 路由與中間件基礎
> 學習日期：2026-03-02
> 讀的檔案：/Users/sky770825/openclaw任務面版設計/server/src/routes/openclaw-tasks.ts

## 我學到什麼
1.  模組化路由: 使用 Router() 可以建立獨立的路由模組，讓主程式 index.ts 保持乾淨，只需用 app.use() 掛載即可。
2.  路由處理器: 每個路由 (.get, .post 等) 都對應一個非同步函式 async (req, res) => {}，負責處理請求邏輯並用 res.json() 或 res.status() 回應。
3.  職責分離: 路由檔案專注於處理 HTTP 請求和回應，而把資料庫操作 (openclawSupabase.js)、資料格式轉換 (openclawMapper.js) 等邏輯交給其他模組，這讓程式碼更容易維護。
4.  明確的錯誤處理: 當依賴的服務（如 Supabase）無法連線時，程式會回傳 503 Service Unavailable 狀態碼，這是很標準的 REST API 設計。

## 程式碼範例（從原始碼抄關鍵段落）
``typescript
// GET /api/openclaw/tasks
openclawTasksRouter.get('/', async (_req, res) => {
  try {
    if (!hasSupabase()) {
      log.error('[OpenClaw] GET /tasks: Supabase not connected');
      // 正確回傳 503 錯誤
      return res.status(503).json({ error: 'Database not available' });
    }
    // 呼叫外部模組取得資料
    const openclawTasks = await fetchOpenClawTasks();
    // 呼叫 mapper 轉換資料格式
    const boardTasks = openclawTasks.map(mapToBoard);
    // 回傳成功結果
    res.json(boardTasks);
  } catch (error: any) {
    log.error(error, '[OpenClaw] GET /tasks failed');
    // 捕捉通用錯誤並回傳 500
    res.status(500).json({ error: error.message });
  }
});
`

## 還不懂的
-   檔案不完整，沒看到 POST 和 PATCH 路由如何處理請求的 body (req.body) 和路徑參數 (req.params.id`)。
-   沒看到 middleware 如何在路由處理器 之前 進行鏈式呼叫（例如，用於身份驗證）。