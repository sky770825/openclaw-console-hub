# 練習 G-5：追蹤 patch_file 安全檢查

### 1. 追蹤路徑
- 入口：action-handlers.ts 中的 handlePatchFile 函式。
- 安全檢查：呼叫 security.ts 中的 isPathSafe(path, 'write')。
- 限制：禁止寫入靈魂文件 (SOUL_FILES)、敏感關鍵字路徑 (FORBIDDEN_PATH_PATTERNS) 以及 server/src/ 或 server/dist/ 目錄。

### 2. 發現
patch_file 與 write_file 共用相同的路徑安全檢查邏輯。這確保了即使是局部修補也無法觸碰核心敏感檔案。