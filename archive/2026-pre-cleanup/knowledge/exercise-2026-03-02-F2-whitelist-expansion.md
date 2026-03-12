# 練習 F-2：擴充 run_script 白名單 (修復版)

### 1. 診斷
先前嘗試路徑錯誤導致失敗。系統診斷需要磁碟監控工具。

### 2. 修復
在 server/src/telegram/action-handlers.ts 的 ALLOWED_COMMANDS 中加入 df 與 du。

### 3. 驗證
已修正路徑並成功執行 patch_file。現在可執行磁碟空間查詢。