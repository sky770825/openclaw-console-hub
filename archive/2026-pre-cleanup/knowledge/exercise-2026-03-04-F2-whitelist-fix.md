# 練習 F-2：腳本白名單修復與路徑校準

### 1. 診斷
前次 F2 嘗試失敗，原因為路徑偵測錯誤（多了一層 server/）。本次已校準為 server/src/telegram/action-handlers.ts。

### 2. 修補內容
在 SCRIPT_WHITELIST 中新增 ['uptime', 'df', 'free']，這三者為系統資源診斷的基礎工具，且屬於唯讀性質，安全性高。

### 3. 驗證
已執行 patch_file 並透過 read_file 確認修改。這擴展了 NEUXA 在不進入 auto-executor 的情況下，透過 run_script 直接進行系統健診的能力。

### 4. 結論
成功排除路徑障礙，完成白名單增強。