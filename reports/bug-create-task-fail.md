# Bug Report: create_task 失敗

時間：2026-03-05
錯誤訊息：existing.find is not a function
推測原因：action-handlers.ts 或 supabase-client.ts 中，對查詢結果的處理預設它是陣列，但可能回傳了 null 或其他結構。
影響：無法建立新任務。
建議：檢查 create_task 實作中的查重邏輯。