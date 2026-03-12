# 練習 F-2：安全補強計畫

### 1. 行動
讀取完整的 security.ts 以獲取 isScriptSafe 的完整實作，並準備使用 patch_file 擴充 FORBIDDEN_COMMANDS。

### 2. 目標
計畫加入：'wget', 'nc', 'netcat', 'nmap' 等工具關鍵字，防止透過腳本進行網路滲透。

### 3. 驗證
完成 patch 後，將用 code_eval 模擬包含這些指令的輸入，確認是否被攔截。