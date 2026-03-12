# 練習 F-2：run_script 白名單安全性補強分析

### 1. 現狀觀察
讀取 server/src/telegram/action-handlers.ts。目前白名單包含 curl, lsof, ps, tail, grep, find, python3 等診斷工具。安全性檢查主要依賴於指令開頭的字串比對。

### 2. 補強點識別
- 參數注入：雖然指令開頭被限制，但後續參數（如 curl 的 URL 或 python3 -c 的內容）仍有被利用的空間。
- 敏感路徑屏蔽：應確保指令不能讀取 .env 或 key 相關路徑，即使是使用 grep 或 tail。

### 3. 模擬測試
預計使用 code_eval 測試非法參數組合，驗證現有 SafeRunScript 邏輯的攔截能力。

### 4. 改善建議
建議引入正則表達式更精確地過濾參數，並在執行前檢查指令是否包含敏感關鍵字或路徑。