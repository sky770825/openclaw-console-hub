# 練習 E-5：簡易任務狀態機邏輯實作

### 1. 邏輯設計
定義狀態數組 ['pending', 'ready', 'running', 'done']，僅允許索引值遞增 1 的正向轉換。

### 2. 實作代碼
使用 code_eval 執行 JS 邏輯，透過 indexOf 判斷轉換合法性，非法則拋出 Error。

### 3. 測試結果
- pending → ready: 成功
- ready → done: 失敗（符合預期，跳過了 running）

### 4. 應用場景
此邏輯可用於後端路由或 Auto-Executor 的狀態校驗，防止任務狀態跳躍導致的數據不一致。