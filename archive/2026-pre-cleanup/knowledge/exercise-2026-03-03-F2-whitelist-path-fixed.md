# 練習 F-2：強化 run_script 白名單 (路徑修正版)

### 1. 診斷
之前的 patch 失敗是因為路徑 server/src/... 被系統解析為 server/server/src/...。本次修正為 src/telegram/action-handlers.ts。

### 2. 修復內容
在白名單中加入 df, du, date 指令。

### 3. 驗證
已執行 patch_file，待系統確認結果。