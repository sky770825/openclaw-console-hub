# Express.js 路由與中間件
> 學習日期：2026-03-02
> 讀的檔案：/Users/sky770825/openclaw任務面版設計/server/src/routes/openclaw-tasks.ts

## 我學到什麼
1.  模組化路由: 使用 express.Router() 可以將相關的 API 端點封裝在一個獨立檔案中，讓主程式碼更乾淨。
2.  RESTful 設計: 檔案清楚地實作了 GET, POST, PATCH, DELETE 方法，對應資源的查、增、改、刪，這是標準的 RESTful 實踐。
3.  錯誤處理: 每個路由處理器都用了 try...catch 區塊，並在錯誤發生時回傳明確的 HTTP 狀態碼 (如 500, 400)，這是穩健 API 的基礎。
4.  資料映射 (Mapper): 透過 mapToBoard 這類函數，將資料庫的原始資料格式轉換成前端需要的格式。這是一種重要的解耦模式，讓前後端可以獨立演進。
5.  安全注入: 在 POST 請求中，呼叫了 scanTaskPayload 函數，這表示在資料存入資料庫前，會先經過一道安全檢查，防止惡意內容注入。

## 程式碼範例（POST /tasks）
``typescript
openclawTasksRouter.post('/', async (req, res) => {
  try {
    const task = req.body as Task;
    // 1. 安全掃描
    const scanResult = scanTaskPayload(task);
    if (!scanResult.ok) {
      return res.status(400).json({ error: scanResult.error });
    }
    // 2. 資料轉換
    const ocTask = taskToOpenClawTask(task);
    // 3. 存入資料庫
    const result = await upsertOpenClawTask(ocTask);
    log.info([OpenClaw] Created task ${result.id});
    res.status(201).json(result);
  } catch (error: any) {
    log.error(error, '[OpenClaw] POST /tasks failed');
    res.status(500).json({ error: error.message });
  }
});
`

## 還不懂的
- 這個 openclawTasksRouter 是如何在主程式 (例如 index.ts`) 中被掛載 (mount) 和使用的？完整的 middleware 鏈是什麼樣子？
