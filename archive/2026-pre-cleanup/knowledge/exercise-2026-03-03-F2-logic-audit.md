# 練習 F-2：強化 run_script 安全審查 (邏輯漏洞)

### 1. 發現
目前的 FORBIDDEN_COMMANDS 雖然封鎖了 rm -rf 和 sudo，但如果 isScriptSafe 的實作只檢查指令是否「包含」這些關鍵字，而沒有封鎖指令串接符（如 ;, &&, |, `  `），攻擊者可以透過 curl localhost:3011/api/health; [惡意指令] 來繞過檢查。

### 2. 驗證
我需要確認 isScriptSafe 函式內部是否對這些 Shell 特殊字元進行過濾。由於工具限制，我將嘗試讀取該函式的具體實作程式碼。

### 3. 修補預案
在 FORBIDDEN_COMMANDS 中加入 ;, &&, |, ||,   `, $(  等符號，或在 isScriptSafe` 中使用更嚴格的正則表達式。