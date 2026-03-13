# 練習 F-2：run_script 白名單增強 (路徑終極修正)

### 1. 問題核心
發現 patch_file 工具的基準路徑已在 server/ 下，導致先前傳入 server/src/... 時會出現重複路徑。已修正為 src/telegram/action-handlers.ts。

### 2. 實作
精準替換 RUN_SCRIPT_WHITELIST，加入 whoami, id, groups。

### 3. 驗收
若 patch 成功，代表達爾對工具路徑解析邏輯有了更深層的理解。