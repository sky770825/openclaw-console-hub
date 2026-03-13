# 練習 F-2：run_script 白名單增強 (路徑與模式最終校準)

### 1. 診斷與修正
先前失敗原因有二：
- 路徑錯誤：使用了相對路徑，現已更正為絕對路徑 /Users/sky770825/openclaw任務面版設計/server/src/telegram/action-handlers.ts。
- Schema 錯誤：patch_file 應使用 mode 欄位而非 type。

### 2. 實作內容
在 RUN_SCRIPT_WHITELIST 中成功加入 whoami, id, groups，提升系統診斷能力。

### 3. 驗收
執行 run_script: whoami 即可驗證白名單是否生效。