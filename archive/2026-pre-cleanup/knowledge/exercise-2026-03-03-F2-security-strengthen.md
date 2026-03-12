# 練習 F-2：強化腳本安全檢查

### 1. 行動
分析 security.ts 中的 isScriptSafe 函式與 FORBIDDEN_COMMANDS。

### 2. 目標
發現 FORBIDDEN_COMMANDS 中缺少對 rm -rf 其他變體（如帶路徑的危險刪除）或特定敏感系統命令的攔截。打算在 FORBIDDEN_COMMANDS 中加入 wget 或 nc 等網路滲透工具關鍵字。

### 3. 進度
已讀取安全配置檔案，正在評估最佳注入點。