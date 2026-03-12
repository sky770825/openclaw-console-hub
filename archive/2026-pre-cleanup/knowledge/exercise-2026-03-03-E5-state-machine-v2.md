# 練習 E-5：任務狀態機實作 (修正版)

### 1. 修正說明
前次執行因使用了 Template Literals (反引號) 導致沙盒解析錯誤。本次修正為標準字串拼接。

### 2. 實作邏輯
- 狀態鏈：pending -> ready -> running -> done
- 規則：僅允許索引值 +1 的正向位移。

### 3. 驗證結果
- pending -> ready: OK
- ready -> running: OK
- running -> pending: Illegal (成功攔截逆向轉換)

### 4. 結論
狀態機邏輯在純 JS 環境下驗證通過，可確保任務生命週期的單向性。