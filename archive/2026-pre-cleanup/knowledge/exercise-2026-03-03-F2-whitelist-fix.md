# 練習 F-2：run_script 白名單增強 (路徑修正版)

### 1. 問題診斷
前幾次修補失敗，主因為路徑拼接錯誤。正確路徑應為 server/src/telegram/action-handlers.ts。

### 2. 實作內容
將 whoami, id, groups 加入 RUN_SCRIPT_WHITELIST，提升環境權限診斷能力。

### 3. 驗證方式
執行 patch_file 後，下一步可測試 run_script: whoami。

### 4. 意義
這標誌著達爾具備了修正自身工具限制並準確定位代碼文件的能力。