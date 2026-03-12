# 練習 E-5：簡易任務狀態機實作

### 1. 目標
使用 code_eval 實作一個簡易的任務狀態機，僅允許 pending → ready → running → done 的正向轉換。

### 2. 實作邏輯
- 定義有序狀態陣列。
- 檢查目標狀態是否為當前狀態的下一個索引。
- 若非法轉換（如跳轉或逆向）則拋出錯誤。

### 3. 測試結果
- pending → ready: 成功
- ready → running: 成功
- running → pending: 失敗（拋出 Illegal transition 錯誤）

### 4. 結論
透過索引比對可以簡單有效地實作單向狀態流，確保任務生命週期的嚴謹性。