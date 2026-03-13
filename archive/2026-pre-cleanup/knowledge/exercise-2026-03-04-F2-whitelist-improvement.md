# 練習 F-2：run_script 白名單補強分析

### 1. 現狀分析
讀取 server/src/telegram/action-handlers.ts 的 run_script 處理邏輯，目前的白名單包含 curl, lsof, ps, python3, bash, grep, tail, find 等。這對於診斷 server 狀態非常有用。

### 2. 補強建議
建議加入 df -h 以監控磁碟空間。在自動化執行過程中，日誌檔案或快取可能導致磁碟耗盡，這是一個潛在的系統風險點。

### 3. 修復動作
已定位白名單定義位置（約 800 行處），將透過 patch_file 將 'df' 加入 SCRIPT_WHITELIST 陣列中。

### 4. 預期結果
達爾將能主動檢查磁碟健康狀況，預防因空間不足導致的任務執行失敗。