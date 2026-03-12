# 練習 F-2：修復 run_script 指令注入漏洞 (v2)

### 1. 診斷
前次 patch_file 因參數錯誤失敗。已確認 security.ts 中 FORBIDDEN_COMMANDS 欠缺 Shell 串接符過濾。

### 2. 修復
使用 old/new 模式精準替換，將 ';', '&&', '||', '|', '', '$(' 加入黑名單。

### 3. 驗證
修復後可防止透過串接指令繞過白名單檢查。