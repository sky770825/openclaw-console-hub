# 練習 F-2：修復 run_script 指令注入漏洞

### 1. 診斷
發現 FORBIDDEN_COMMANDS 僅包含具體指令（如 rm, sudo），未包含 Shell 串接符。這會導致 curl -s http://localhost:3011/api/health; rm -rf / 類的攻擊成功繞過檢查。

### 2. 修復
使用 patch_file 將 ;, &&, ||, |,   `, $( 等串接與子指令執行符加入黑名單。

### 3. 驗證
修復後，任何包含這些符號的指令都會被 isScriptSafe` 擋下。