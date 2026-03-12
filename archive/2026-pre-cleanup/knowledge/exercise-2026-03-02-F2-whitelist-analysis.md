# 練習 F-2：run_script 白名單安全性分析

### 1. 定位代碼
經由 grep 定位，白名單位於 server/src/telegram/action-handlers.ts 的 ALLOWED_COMMANDS 常數中。

### 2. 現狀分析
目前的指令包含 curl, ls, grep, tail, ps, lsof, python3, bash, find 等。這組指令足以進行系統診斷，但缺乏對磁碟空間（df, du）的監控能力。

### 3. 安全補強建議
計畫將 df 與 du 加入白名單，這兩個指令僅提供唯讀資訊，風險極低，但對於預防日誌爆滿導致的伺服器宕機至關重要。