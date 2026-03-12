# 練習 A-3：run_script 白名單分類表 (校準版)

根據 server/src/telegram/action-handlers.ts 的 isScriptSafe 邏輯與實際測試：

### 1. 網路與診斷 (Allowed)
- curl -s, ping -c, nslookup, host (主要用於存取 localhost API 或外部連線測試)

### 2. 系統狀態 (Allowed)
- uptime, df -h, free, ps aux, lsof -i (用於排查 port 佔用)

### 3. 檔案操作 (Allowed)
- ls, grep, cat, head, tail, find, wc, stat (限讀取類指令)

### 4. 程式執行 (Allowed)
- python3 -c (僅限單行邏輯), node -v (版本檢查)

### 5. 禁止清單 (Forbidden)
- sed, awk (不在預設白名單，需改用 read_file + write_file)
- sudo, rm -rf, > (重導向), | (管線符號在某些實作中受限)
- 任何包含 .env, key, token 字眼的指令

### 6. 執行限制
- Timeout: 30s
- CWD: /Users/caijunchang/openclaw任務面版設計/