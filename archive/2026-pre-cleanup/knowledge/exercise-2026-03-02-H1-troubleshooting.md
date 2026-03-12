# 練習 H-1：問題排查實戰報告

### 1. 日誌分析
讀取最近 200 行 taskboard.log。主要 ERROR 為 find_symbol 調用路徑或參數問題。其餘邏輯如 query_supabase 與 run_script 均正常執行。

### 2. 根因定位
錯誤源於對 find_symbol 的不當調用，該工具在 Symbol 長度不足或檔案路徑不正確時會拋出異常。這在自動化心跳中被捕獲，但不影響核心業務流。

### 3. 修復建議
應優化 find_symbol 的前端調用校驗，確保傳入的 symbol 具備搜尋價值，並在 action-handlers.ts 中增加更優雅的錯誤攔截。