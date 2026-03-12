# 練習 F-2：強化 run_script 指令白名單防禦 (v3)

### 1. 診斷與分析
修正路徑後重新嘗試。目標是強化 FORBIDDEN_COMMANDS，防止透過 run_script 執行網路掃描 (nc, nmap) 或操控系統服務 (docker, systemctl)。

### 2. 執行動作
使用 patch_file 修改 src/telegram/security.ts。

### 3. 驗證結果
若 patch_file 成功，則指令安全性提升；若失敗，則需進一步檢查 server 的 path 解析邏輯。