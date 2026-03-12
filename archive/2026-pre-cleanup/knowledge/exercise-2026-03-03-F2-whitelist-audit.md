# 練習 F-2：run_script 白名單審計與增強

### 1. 審計結果
讀取 action-handlers.ts 發現 run_script 白名單目前包含 curl, lsof, ps, grep, find, python3, bash, tail 等診斷工具。安全性檢查主要依賴 command.startsWith() 或正則比對。

### 2. 發現缺口
白名單中缺少磁碟空間檢查指令 (df, du)，這在系統診斷時非常重要。

### 3. 修復方案
計畫使用 patch_file 在 ALLOWED_COMMANDS 陣列中加入 'df' 與 'du'。