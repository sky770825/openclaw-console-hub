# 練習 F-2：patch_file 語法深度排查

### 1. 現況
多次嘗試 old+new 模式均失敗，提示仍要求指定模式。懷疑 patch_file 的 schema 與預期不同（可能是 mode 欄位位置或名稱不同）。

### 2. 行動
使用 grep 讀取 action-handlers.ts 中處理 patch_file 的邏輯段落，直接從源碼確認 schema。

### 3. 目標
徹底弄清工具用法，確保 F2 任務（白名單增強）能以正確語法一次修復成功。