# 練習 F-2：run_script 白名單增強 (Schema 修正版)

### 1. 診斷
發現 patch_file 錯誤提示要求「指定模式」。推測 operation 物件中的欄位應為 mode 而非 type。

### 2. 實作
路徑：src/telegram/action-handlers.ts
模式：mode: "old+new"
目標：加入 whoami, id, groups 到白名單。

### 3. 備案
同時執行 grep 確認行號，若 mode 仍失敗，下次將改用 from_line/to_line。