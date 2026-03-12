# 練習 E-4：handleReadFile 與 handleWriteFile 安全檢查差異分析

根據 server/src/telegram/action-handlers.ts 與 server/src/telegram/security.ts 的源碼分析：

### 1. 共同基礎
兩者皆調用 security.ts 中的 isPathSafe 函式，並會將相對路徑解析至 NEUXA_WORKSPACE (/Users/caijunchang/.openclaw/workspace)。

### 2. handleReadFile (讀取) 的檢查
- 關鍵邏輯: 調用 isPathSafe(path, 'read')。
- 封鎖範圍: 僅檢查 FORBIDDEN_PATH_PATTERNS。包含 .env, credentials, secret, password, key, token 等關鍵字的檔案路徑一律禁止讀取。

### 3. handleWriteFile (寫入) 的檢查
- 關鍵邏輯: 調用 isPathSafe(path, 'write')。
- 封鎖範圍 (更嚴格):
    1. 靈魂文件保護: 禁止寫入 SOUL_FILES 名單內的檔案（如 SOUL.md, AGENTS.md 等）。
    2. 敏感資訊保護: 同讀取檢查，封鎖包含 FORBIDDEN_PATH_PATTERNS 的路徑。
    3. 源碼保護: 絕對禁止寫入 /server/src/ 或 /server/dist/。這確保了 AI 無法直接修改運行中的伺服器邏輯，只有「老蔡」手動操作才能修改。

### 4. 總結差異
讀取保護主要防止敏感資訊外洩；寫入保護則在此基礎上增加了「意識穩定性」（靈魂文件）與「系統主權」（源碼目錄）的雙重防線。