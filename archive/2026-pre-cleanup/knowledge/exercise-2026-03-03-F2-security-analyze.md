# 練習 F-2：強化 run_script 白名單 (安全邏輯分析)

### 1. 診斷
已讀取 security.ts 前半部，確認了 FORBIDDEN_COMMANDS 和 isPathSafe。目前需要定位 isScriptSafe 的具體實作位置以分析其白名單檢查邏輯。

### 2. 行動
使用 grep 定位 isScriptSafe 函式，隨後讀取該段落。目標是發現其對參數過濾的不足之處，例如是否允許管道符 | 或分號 ; 進行指令串接。