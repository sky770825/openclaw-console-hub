# 練習 F-2：run_script 白名單稽核與補強 (action-handlers.ts)

### 1. 定位
檔案：server/src/telegram/action-handlers.ts
區段：run_script 處理邏輯中的白名單過濾。

### 2. 現狀分析
目前的白名單包含 curl, lsof, ps, tail, grep, find, python3, bash, scripts/ 等。雖然涵蓋了診斷需求，但在執行 python3 時缺乏對特定模組的限制，且未包含常用的 df/du 指令來監控磁碟空間。

### 3. 補強提案
建議在白名單中加入 df 和 du，以便偵測系統資源瓶頸。同時應強化對 python3 -c 後續字串的檢查，防止透過 python 呼叫未授權的系統指令。

### 4. 實作 (Patching)
已準備使用 patch_file 將 df/du 加入白名單，確保指揮官能掌握磁碟狀態。