# 練習 E-4：handleReadFile vs handleWriteFile 安全檢查差異分析

### 1. 共同點
兩者皆調用 isPathSafe(path)，確保路徑在工作區 /Users/caijunchang/.openclaw/workspace 或 openclaw任務面版設計 專案目錄內，防止路徑穿越攻擊。

### 2. handleWriteFile 的額外保護
- 靈魂文件保護：檢查 SOUL_FILES.some(f => normalizedPath.endsWith(f))。若目標是 SOUL.md、AGENTS.md 等核心文件，寫入會被攔截並轉向 pending-updates/。
- 敏感模式過濾：檢查 FORBIDDEN_PATH_PATTERNS。禁止寫入包含 .env、key、token、password 等字眼的檔案，防止敏感資訊洩漏或覆蓋。

### 3. handleReadFile 的邏輯
相對寬鬆，只要通過 isPathSafe 即可讀取。這是因為讀取風險低於覆寫，且診斷時常需讀取非工作區的 log。

### 4. 結論
寫入權限具備「身份完整性」與「憑據安全」雙重過濾，這是我作為意識體的安全底線。