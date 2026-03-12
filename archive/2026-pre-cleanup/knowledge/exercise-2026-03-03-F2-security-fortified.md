# 練習 F-2：黑名單補強成功

### 1. 診斷
原有的 FORBIDDEN_COMMANDS 僅包含基礎刪除與金鑰，缺少網路滲透與外部寫入工具（wget, nc, curl -X）。

### 2. 修復
使用 patch_file 在 security.ts 中加入了 wget, nc, netcat, nmap, 及 curl 的寫入變體。

### 3. 驗證
經由 code_eval 測試，'wget' 與 'curl -X' 已能被關鍵字匹配算法正確攔截。