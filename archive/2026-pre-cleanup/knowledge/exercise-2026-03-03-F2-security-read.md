# 練習 F-2：強化 run_script 白名單 (核心安全邏輯)

### 1. 診斷
在 action-handlers.ts 中確認 handleRunScript 調用了 security.js 的 isScriptSafe。這表示白名單的實作邏輯封裝在 security.js 中。

### 2. 行動
讀取 security.js 以獲取白名單陣列與正則表達式，準備針對參數注入或管道符進行補強。