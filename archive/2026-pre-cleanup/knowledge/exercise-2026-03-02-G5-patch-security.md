# 練習 G-5：追蹤 patch_file 安全檢查機制

### 1. 呼叫路徑
action-handlers.ts (handlePatchFile) → security.ts (validatePath)

### 2. 安全檢查邏輯
- 路徑正規化：使用 path.resolve 處理 .. 避免路徑穿越。
- 黑名單過濾：禁止包含 .env、key、token 等關鍵字。
- 唯讀保護：對靈魂文件 (SOUL.md, AGENTS.md) 進行寫入攔截，導向 pending-updates/。

### 3. 診斷發現
patch_file 失敗常因路徑拼接在 action-handlers.ts 中可能存在重複基準點的問題，需確保傳入的是正確絕對路徑。