# 練習 F-2：run_script 白名單強化分析

### 1. 現狀分析
讀取 action-handlers.ts 後，發現 run_script 的白名單包含 curl, grep, tail, ps, lsof 等診斷工具。

### 2. 強化建議
目前缺少對 df -h (磁碟空間檢查) 或 uptime (系統負載直接查看) 的明確支持。雖然可以透過其他方式獲取，但加入這些常用診斷指令能提升巡檢效率。

### 3. Patch 方案
在 isScriptSafe 的 regex 或白名單陣列中加入 ^uptime$ 與 ^df -h.*$。

### 4. 驗證
由於禁止修改系統檔案，此處以報告形式提交，待統帥核准後執行。