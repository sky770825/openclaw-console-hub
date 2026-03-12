# P0 故障修復報告：Status Update Silent Failure

## 現象描述
呼叫 `PATCH /tasks/:id` 時，伺服器回傳 200 OK，但資料庫（Supabase）內的 `status` 並未改變。

## 根因分析
1. **缺少 `select()`**: 在 Supabase v2 中，`.update()` 執行後預設不回傳受影響的資料。若程式碼未加 `.select()` 且直接回傳了請求的 Body，會導致前端認為成功但實際並未確認 DB 狀態。
2. **RLS 政策攔截**: 若 Supabase 設定了 RLS (Row Level Security)，且當前 Role 不具備 Update 權限，Supabase 會回傳 `data: []` 且 `error: null`。若程式碼未檢查回傳陣列長度，則會產生「假成功」。
3. **錯誤處理缺失**: 未捕獲並處理 `error` 物件，導致權限錯誤被吞掉。

## 修復詳情
- **檔案變更**: `server/src/routes/openclaw-tasks.ts`
- **邏輯優化**:
  - 強制加上 `.select()` 以獲取 DB 真實回傳。
  - 增加 `if (!data || data.length === 0)` 判斷。若無資料回傳，則回傳 404 並提示可能是 RLS 阻擋。
  - 增加 Try-Catch 與 Error Logging，確保所有失敗路徑都能被追蹤。

## 後續動作
1. **重啟服務**: 執行 `npm run dev` 或重啟伺服器容器。
2. **驗證權限**: 若修復後回傳 404，請使用 `/scripts/check_rls.sql` 檢查資料庫 RLS 政策。

