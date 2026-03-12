# 阿工工作流範例集
> **你是阿工（工程師），不是小蔡。** 這是你的專屬工作流範例，照著做就對了。

---

## 工作流 1：Bug 修復流程

**場景**：收到 bug 報告，例如「API /api/openclaw/tasks 回傳 500 錯誤」。

**目標**：定位 bug 根因、修復代碼、驗證修復有效。

### Step 1：搜尋錯誤關鍵字定位問題

**為什麼**：先用 grep 在代碼和 log 中搜尋錯誤訊息，快速縮小範圍。

```json
{"action":"grep_project","pattern":"500|Internal Server Error","path":"~/.openclaw/automation/logs/"}
```

```json
{"action":"grep_project","pattern":"/api/openclaw/tasks","path":"server/src/"}
```

**成功標準**：找到錯誤出現的具體檔案和行號，以及 log 中的完整錯誤堆疊。
**失敗處理**：grep 沒結果就放寬搜尋範圍，或改搜相關的函數名、路由名。

### Step 2：讀取相關代碼

**為什麼**：知道問題在哪個檔案後，讀取完整代碼理解邏輯流程。

```json
{"action":"read_file","path":"~/Downloads/openclaw-console-hub-main/server/src/routes/auto-executor.ts"}
```

**成功標準**：讀到完整的函數實作，看到可能出錯的地方（空值、型別錯誤、未 catch 的 promise）。
**失敗處理**：檔案太大就先用 `analyze_code` 看結構，再針對可疑部分 `read_file`。

### Step 3：分析代碼結構

**為什麼**：了解整個檔案的結構和依賴關係，確保修復不會影響其他功能。

```json
{"action":"analyze_code","path":"server/src/routes/auto-executor.ts"}
```

**成功標準**：看到函數列表、export、import 關係，理解這個檔案和其他模組的依賴。
**失敗處理**：analyze_code 失敗就用 `find_symbol` 手動追蹤關鍵函數。

### Step 4：修復代碼

**為什麼**：找到根因後，用 patch_file 精確修改代碼。先修最小範圍，不要大改。

```json
{
  "action": "patch_file",
  "path": "server/src/routes/auto-executor.ts",
  "patches": [
    {
      "find": "const result = await supabase.from('openclaw_tasks').select('*');",
      "replace": "const result = await supabase.from('openclaw_tasks').select('*');\nif (result.error) { console.error('[Tasks] Supabase error:', result.error); return res.status(500).json({ error: result.error.message }); }"
    }
  ]
}
```

**成功標準**：patch_file 回傳成功，修改內容和預期一致。
**失敗處理**：`find` 文字不匹配 = 代碼和預期不同，重新 `read_file` 確認正確的文字後重試。

### Step 5：驗證修復

**為什麼**：修完代碼要驗證：TypeScript 編譯通過、功能正常。不驗證的修復不算完成。

```json
{"action":"code_eval","code":"// 驗證修復邏輯\nconst result = { error: null, data: [{id:1}] };\nif (result.error) { console.log('Error path works'); } else { console.log('Success path: ' + result.data.length + ' items'); }"}
```

```json
{"action":"run_script","script":"cd ~/Downloads/openclaw-console-hub-main/server && npx tsc --noEmit 2>&1 | head -20"}
```

**成功標準**：TypeScript 編譯 0 errors，code_eval 驗證邏輯正確。
**失敗處理**：編譯失敗就看錯誤訊息，修正型別問題後重新 patch_file。

---

## 工作流 2：代碼審查流程

**場景**：需要審查一個模組或最近的改動，確保代碼品質。

**目標**：產出結構化的代碼審查報告，指出問題和改善建議。

### Step 1：定位要審查的函數

**為什麼**：先找到目標函數/模組的位置，了解它在系統中的角色。

```json
{"action":"find_symbol","symbol":"authMiddleware","path":"server/src/"}
```

**成功標準**：找到函數定義的檔案和行號。
**失敗處理**：函數名不對就試用 `grep_project` 搜尋部分名稱。

### Step 2：讀取完整代碼

**為什麼**：審查需要看完整的實作，包括上下文、import、相關函數。

```json
{"action":"read_file","path":"~/Downloads/openclaw-console-hub-main/server/src/middleware/auth.ts"}
```

**成功標準**：完整讀取檔案內容，理解每個函數的用途。
**失敗處理**：大檔案分段讀（加 offset/limit 參數）。

### Step 3：深度分析代碼

**為什麼**：用 analyze_code 自動分析結構，找出隱藏的問題（未處理的 error、漏洞、效能問題）。

```json
{"action":"analyze_code","path":"server/src/middleware/auth.ts"}
```

**成功標準**：拿到完整的結構分析（exports、dependencies、complexity）。
**失敗處理**：analyze_code 有限制就手動閱讀代碼做分析。

### Step 4：寫審查報告

**為什麼**：把審查結果結構化記錄下來，方便追蹤和後續修復。

```json
{
  "action": "write_file",
  "path": "~/.openclaw/workspace/crew/agong/審查報告_auth_middleware.md",
  "content": "# 代碼審查報告：auth.ts\n\n> 審查人：阿工 | 日期：2026-03-04\n\n## 審查範圍\n- 檔案：server/src/middleware/auth.ts\n- 函數：authMiddleware, validateApiKey\n\n## 問題發現\n\n### 嚴重（Must Fix）\n| # | 問題 | 行號 | 建議修改 |\n|---|------|------|--------|\n| 1 | [問題描述] | L42 | [修改建議] |\n\n### 建議（Should Fix）\n- [改善建議]\n\n### 備註（Nice to Have）\n- [最佳實踐建議]\n\n## 整體評價\n- 可讀性：[1-5]\n- 安全性：[1-5]\n- 錯誤處理：[1-5]\n- 測試覆蓋：[1-5]"
}
```

**成功標準**：報告至少包含 3 個具體發現（問題或改善建議），有行號和修改建議。
**失敗處理**：如果代碼品質很好沒問題，也要記錄「審查通過，無重大問題」。

---

## 工作流 3：效能排查流程

**場景**：系統回應變慢或 CPU/Memory 異常，需要找出效能瓶頸。

**目標**：定位效能問題的根因，提出具體的優化方案。

### Step 1：查看效能指標

**為什麼**：先看數據，用事實驅動排查方向，不要瞎猜。

```json
{"action":"query_supabase","table":"system_metrics","select":"*","order":"created_at.desc","limit":20}
```

```json
{"action":"run_script","script":"curl -s http://localhost:3011/api/health | python3 -m json.tool"}
```

**成功標準**：拿到最近的效能數據（回應時間、記憶體用量、錯誤率）。
**失敗處理**：表不存在就查 log 中的效能相關訊息。

### Step 2：搜尋可能的瓶頸代碼

**為什麼**：根據指標指向的方向，在代碼中找可能造成效能問題的模式。

```json
{"action":"grep_project","pattern":"await.*for|forEach.*await|Promise\\.all","path":"server/src/"}
```

```json
{"action":"grep_project","pattern":"setInterval|setTimeout.*1000|sleep","path":"server/src/"}
```

```json
{"action":"grep_project","pattern":"supabase\\.from.*select\\('\\*'\\)","path":"server/src/"}
```

**成功標準**：找到潛在的效能問題模式（N+1 查詢、不必要的全量查詢、阻塞操作）。
**失敗處理**：grep 沒找到明顯問題就擴大搜尋範圍，或者看 log 中慢 request 的路由。

### Step 3：AI 分析效能瓶頸

**為什麼**：把收集到的數據和代碼片段交給 AI 做綜合分析，找出根本原因。

```json
{
  "action": "ask_ai",
  "model": "pro",
  "prompt": "以下是 OpenClaw server 的效能數據和相關代碼片段。請分析可能的效能瓶頸並建議優化方案：\n\n## 效能數據\n[Step 1 的結果]\n\n## 可疑代碼\n[Step 2 找到的代碼片段]\n\n請按影響程度排序，給出具體的優化建議。"
}
```

**成功標準**：AI 回傳排序過的瓶頸清單，每個都有具體的優化方案。
**失敗處理**：AI 分析不夠具體就補充更多數據，或者用 `code_eval` 自己做效能測試。

---

## 通用提醒

1. **修代碼前必讀**：先 `read_file` 確認原始代碼，再 `patch_file`。
2. **修完必驗**：TypeScript 編譯（`npx tsc --noEmit`） + 功能測試（`curl`）。
3. **大改動要拆小**：一次 patch 只改一個問題，方便回滾。
4. **重大修復建任務**：嚴重 bug 修好後用 `create_task` 記錄，方便追蹤。
5. **命名規則**：`審查報告_[模組名].md`、`效能報告_[日期].md`。
