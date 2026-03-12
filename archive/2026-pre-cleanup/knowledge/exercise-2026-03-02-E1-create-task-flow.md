# 練習 E-1：建立任務完整資料流追蹤

### 1. 路由層 (Route)
檔案：server/src/routes/openclaw-tasks.ts  
端點：POST /  
邏輯：解析 req.body 中的 title, cat, thought 等欄位。呼叫 upsertOpenClawTask 或 insertTask。

### 2. 資料庫層 (Supabase)
檔案：server/src/openclawSupabase.ts  
函式：upsertOpenClawTask  
實作：使用 supabase.from('openclaw_tasks').upsert(data)。此函式會處理欄位映射，並將資料持久化到 Supabase。

### 3. 資料流總結
HTTP POST (JSON) -> Express Route (validation) -> Supabase Client (insert/upsert) -> Supabase DB。

### 4. 驗證結果
追蹤路徑清晰，確認了從 API 進入到資料庫落地的完整環節。