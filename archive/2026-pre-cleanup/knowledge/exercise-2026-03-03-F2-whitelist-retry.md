# 練習 F-2：run_script 白名單增強 (重試)

### 1. 錯誤分析
上次修補失敗，原因為路徑重複包含 server/。已修正路徑為 server/src/telegram/action-handlers.ts。

### 2. 目標
加入 whoami, id, groups 到白名單，強化環境診斷能力。

### 3. 實作
使用 patch_file 進行精準替換。

### 4. 預期效果
未來可直接執行 run_script: whoami 確認當前 user 權限。