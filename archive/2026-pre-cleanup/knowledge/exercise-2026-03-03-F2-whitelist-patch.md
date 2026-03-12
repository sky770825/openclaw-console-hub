# 練習 F-2：腳本白名單增強與 Patch 實作

### 1. 診斷與目標
閱讀 server/src/telegram/action-handlers.ts 中的 run_script 白名單，發現缺少常用的系統診斷指令 uptime, df, free。目標是透過 patch_file 安全地擴充白名單。

### 2. 修補內容
- 原白名單：['curl', 'ls', 'grep', 'cat', 'tail', 'head', 'ps', 'lsof', 'python3', 'bash', 'sh'] 
- 修補後：新增 uptime (查負載), df (查磁碟), free (查記憶體)。

### 3. 驗證方式
執行 patch_file 後，理論上未來執行這些指令將不再被安全過濾器攔截。

### 4. 結論
透過精準 Patch 擴展了指揮官的診斷武器庫，同時保持了系統安全性。