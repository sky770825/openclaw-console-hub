# 練習 F-2：擴充 run_script 白名單 (路徑校準版)

### 1. 診斷
先前失敗因路徑拼接重複。正確絕對路徑為 /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts。

### 2. 修復
在 ALLOWED_COMMANDS 中加入 'df', 'du' 以支援磁碟空間診斷。

### 3. 驗證
使用 patch_file 成功修改。