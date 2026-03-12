# 練習 E-5：簡易任務狀態機實作

### 1. 邏輯設計
定義狀態數組 ['pending', 'ready', 'running', 'done']。轉換函式 transition 檢查目標狀態是否為當前狀態的下一個索引。

### 2. 驗證結果
- pending -> ready: 成功
- ready -> running: 成功
- ready -> done: 失敗 (拋出 Invalid transition 錯誤)

### 3. 反思
這模擬了 Auto-Executor 的嚴格狀態流。在實際系統中，應確保狀態轉換是不可逆且按序的，防止任務被重複撿取或跳過執行。