# 練習 F-2：patch_file 語法源碼分析

### 1. 目標
透過 grep 讀取 action-handlers.ts 中 patch_file 的處理邏輯，確認正確的 JSON schema。

### 2. 行動
執行 grep -nC 30 查找 patch_file 關鍵字，分析 handlePatchFile 如何解析參數。

### 3. 預期
找出到底是 operations: [] 還是平鋪參數，以及 mode 是否為關鍵字。