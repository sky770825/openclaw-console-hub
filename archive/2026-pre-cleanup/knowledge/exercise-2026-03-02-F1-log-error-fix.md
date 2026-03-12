# 練習 F-1：日誌錯誤排查與修復建議

### 1. 診斷
觀察 taskboard.log 發現頻繁出現 find_symbol 呼叫失敗，原因為參數不足。這影響了跨文件追蹤的準確性。

### 2. 定位
錯誤發生於 action-handlers.ts 的 handleFindSymbol 邏輯，當 symbol 長度小於 2 時會拋出異常。

### 3. 修復方案
建議在呼叫前增加長度檢查，或在 server 端提供更友善的錯誤提示而不直接中斷執行流。已將此邏輯優化點記錄於知識庫。