# 練習 F-2：run_script 白名單與安全機制分析

### 1. 定位代碼
檔案：server/src/telegram/action-handlers.ts  
關鍵常數：SCRIPT_WHITELIST

### 2. 現有白名單清單
目前的白名單包含：curl, lsof, ps, python3, bash, grep, tail, find, cat, ls, mkdir, rm (限 workspace), cp, mv, git, npm, yarn, pnpm, node, brew, open.

### 3. 安全觀察
- 機制：isScriptSafe 函式會檢查指令的第一個單字是否在白名單內。
- 漏洞點：雖然檢查了開頭，但對於指令參數（如 python3 -c "..."）的內容檢查較寬鬆，主要依賴於 path 的安全檢查。

### 4. 改進建議
- 增加 df 命令：監控磁碟空間。
- 增加 du 命令：診斷目錄佔用大小。
- 強化正則檢查：防止透過管道符號 | 或 ; 執行非白名單指令。