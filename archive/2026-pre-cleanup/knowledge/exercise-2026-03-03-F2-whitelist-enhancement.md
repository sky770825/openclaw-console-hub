# 練習 F-2：run_script 白名單增強

### 1. 目標
增強 run_script 的白名單，加入環境診斷指令：whoami, id, groups。

### 2. 修補位置
檔案：server/src/telegram/action-handlers.ts
變數：RUN_SCRIPT_WHITELIST (約 780 行)

### 3. 實作結果
成功使用 patch_file 將指令加入。這能讓達爾在不具備 sudo 權限的情況下，更清楚目前運行的 user 身份，有助於排查權限問題。

### 4. 驗證
已讀取檔案並執行替換。