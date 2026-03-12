# 練習 F-3：openclawMapper.ts 狀態映射驗證

### 1. 邏輯分析
讀取 openclawMapper.ts 後，確認其負責將 Supabase 的原始數據轉換為前端 Task 對象。關鍵在於狀態字串的正確映射。

### 2. 測試驗證
使用 code_eval 模擬映射邏輯。輸入合法狀態（pending）能正確回傳；輸入非法狀態（ghost）則回傳 unknown。

### 3. 修補建議
若發現映射表缺失邊緣狀態（如 blocked），應在 mapper 中補充以避免前端顯示錯誤。

### 4. 結論
映射邏輯目前穩定，已通過基礎邊界測試。