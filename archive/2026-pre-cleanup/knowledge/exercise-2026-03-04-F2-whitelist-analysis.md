# 練習 F-2：run_script 白名單機制分析

### 1. 目標
讀取 action-handlers.ts 中的 run_script 白名單，評估安全強度並尋找補強點。

### 2. 診斷過程
- 使用 grep 定位 ALLOWED_COMMANDS 變數。
- 預期發現：白名單包含系統診斷工具（curl, ps, lsof）與開發工具（python3, node, grep）。
- 補強建議：目前白名單可能缺少 whoami 或 uptime 等無害但有助於環境確認的指令，或需要更嚴格的參數過濾（如阻止管道符號 |）。

### 3. 下一步
待 grep 回傳確切行號後，將使用 patch_file 實作補強。