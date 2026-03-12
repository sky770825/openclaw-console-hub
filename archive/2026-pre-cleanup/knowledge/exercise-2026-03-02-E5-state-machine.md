# 練習 E-5：任務狀態機邏輯驗證

### 1. 邏輯設計
狀態路徑：pending → ready → running → done。僅允許正向單步轉換。

### 2. Code_eval 測試結果
- pending -> ready: ✅ OK
- ready -> running: ✅ OK
- running -> pending: ❌ Invalid (捕獲非法逆向轉換)

### 3. 實作建議
目前的 auto-executor 應在執行失敗時將狀態轉為 failed 而非 pending，以避免無限迴圈。此測試驗證了狀態機攔截非法轉換的必要性。