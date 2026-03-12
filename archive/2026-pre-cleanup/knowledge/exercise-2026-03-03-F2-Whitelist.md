# 練習 F2：強化 run_script 白名單

## 1. 現狀分析
讀取 server/src/telegram/action-handlers.ts 後發現 run_script 依賴 isScriptSafe 進行檢查。

## 2. 強化建議
目前的白名單可能缺少系統資源監控指令。建議加入 df -h (磁碟空間) 與 uptime (系統負載) 以利診斷。

## 3. 實作計畫
使用 patch_file 修改 server/src/telegram/security.ts (假設定義在該處) 或直接在 handler 加強判斷。