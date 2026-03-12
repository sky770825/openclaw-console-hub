# 練習 F-2：run_script 白名單安全分析 (v2)

### 1. 目標
透過讀取原始碼，精確掌握 run_script 的 ALLOWED_COMMANDS 與參數檢查邏輯。

### 2. 原始碼觀察
正在讀取 server/src/telegram/action-handlers.ts。我將定位 handleRunScript 函數，檢查它如何解析命令字串，以及是否允許管道符號 (|) 或重定向 (> <)。

### 3. 潛在風險
如果白名單只檢查開頭單字（如 grep），則 grep 完之後接 ; rm -rf / 可能會造成注入攻擊。

### 4. 下一步
根據讀取到的程式碼邏輯，評估是否需要使用 patch_file 強化正則表達式過濾。