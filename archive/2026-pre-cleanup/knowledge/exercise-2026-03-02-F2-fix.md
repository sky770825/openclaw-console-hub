# 練習 F2：增強 run_script 白名單 (最終修正版)

- 診斷：前幾次失敗是因為路徑 server/src/... 在 server/ 執行環境下會變成 server/server/src/...。
- 修正：將路徑校準為 src/telegram/action-handlers.ts。
- 內容：成功將 df 與 du 指令加入 SAFE_SCRIPT_PATTERNS。
- 意義：賦予 NEUXA 監控伺服器硬碟健康度的能力。