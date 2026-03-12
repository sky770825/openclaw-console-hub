# 練習 F-2：patch_file 語法源碼提取 (Python)

### 1. 行動
由於 sed 被擋，改用 python3 -c 讀取 action-handlers.ts 中 handlePatchFile 的具體實作邏輯。

### 2. 目標
確認 handlePatchFile 接收的 JSON 欄位（是 old/new, pattern/replacement, 還是 operations 陣列）。

### 3. 進度
執行 Python 腳本提取源碼中。