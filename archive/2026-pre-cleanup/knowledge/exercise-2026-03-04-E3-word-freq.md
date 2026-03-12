# 練習 E-3：單字頻次統計實作 (Word Frequency)

### 1. 目標
實作一個 JS 函式，輸入文字字串，產出單字出現次數的統計結果。

### 2. 實作邏輯 (code_eval)
使用 split 分割單字，並透過 reduce 累計次數到物件中。

### 3. 測試結果
輸入：'health ok system running tasks ready system health'
輸出：{"health":2,"ok":1,"system":2,"running":1,"tasks":1,"ready":1}

### 4. 結論
成功驗證 Map/Object 的資料處理邏輯，適用於日誌關鍵字統計。