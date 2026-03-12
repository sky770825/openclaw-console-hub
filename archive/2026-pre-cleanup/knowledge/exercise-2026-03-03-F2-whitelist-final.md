# 練習 F-2：強化 run_script 白名單 (最終修復)

### 1. 診斷
之前的 patch 失敗是因為路徑重複拼接 (server/server/src/...)。本次修正為 server/src/telegram/action-handlers.ts。

### 2. 修復內容
在 action-handlers.ts 的 run_script 白名單中加入 df, du, date 指令，強化系統診斷能力。

### 3. 驗證步驟
- read_file 確認變數內容。
- patch_file 執行替換。
- 產出此報告並索引。