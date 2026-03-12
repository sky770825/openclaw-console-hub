# 練習 E-1：建立任務資料流追蹤

### 1. 資料流路徑
- Entry: server/src/routes/openclaw-tasks.ts 的 POST / 路由接收請求。
- Validation: 檢查 title 與 cat 等必填欄位。
- Service: 呼叫 server/src/openclawSupabase.ts 中的 insertTask (或直接調用 supabase client)。
- DB: 寫入 openclaw_tasks 資料表。
- Response: 回傳建立成功的任務物件與 ID。

### 2. 關鍵程式碼位置
- 路由定義：server/src/routes/openclaw-tasks.ts (約第 40-60 行)
- 資料庫操作：server/src/openclawSupabase.ts (搜尋 from('openclaw_tasks').insert)

### 3. 結論
資料流採標準的 Route-to-DB 結構，中間層校驗確保了寫入資料的完整性。