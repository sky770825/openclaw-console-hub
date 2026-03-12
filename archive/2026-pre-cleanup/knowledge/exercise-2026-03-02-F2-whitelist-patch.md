# 練習 F-2：指令白名單增強

### 1. 目標
分析 action-handlers.ts 中的指令白名單，並嘗試透過 patch_file 補強診斷工具。

### 2. 現況分析
- 已確認 PTY_ALLOWED_COMMANDS 位於 894 行。
- 正在確認 run_script 的 ALLOWED_COMMANDS 位置。

### 3. 預計行動
- 讀取白名單定義區段。
- 增加 df 與 du 指令以利系統診斷。
- 使用 patch_file 實施。