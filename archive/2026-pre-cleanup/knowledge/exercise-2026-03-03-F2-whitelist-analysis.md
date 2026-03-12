# 練習 F-2：run_script 白名單分析

### 1. 檔案定位
讀取 server/src/telegram/action-handlers.ts，定位 run_script 的白名單過濾邏輯（約 787-830 行）。

### 2. 現狀分析
目前的白名單包含 curl, lsof, ps, grep, find, python3, bash, tail 等診斷指令。這些指令對於系統監控與初步排查非常有效。

### 3. 優化建議
考慮到開發需求，可以增加 df -h（檢查磁碟空間）或 du -sh 到白名單中，以便在自動化執行過程中監控資源占用。