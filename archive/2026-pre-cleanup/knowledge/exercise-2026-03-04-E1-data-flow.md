# 練習 E-1：建立任務資料流追蹤 (POST /api/openclaw/tasks)

### 1. 目標
追蹤任務從 API 請求到寫入 Supabase 的完整路徑。

### 2. 起點：路由層
在 server/src/routes/openclaw-tasks.ts 中，POST / 負責接收任務數據。它會呼叫 upsertOpenClawTask 函式。

### 3. 中間層：映射與處理
數據在傳遞給資料庫前，可能經過 openclawMapper.ts 進行欄位轉換（例如 name 轉為 title）。

### 4. 終點：資料庫層
最後由 server/src/openclawSupabase.ts 中的 upsertOpenClawTask 利用 Supabase SDK 執行 insert 或 upsert 操作。

### 5. 結論
資料流：Express Request -> Route Handler -> openclawSupabase.ts -> Supabase API。