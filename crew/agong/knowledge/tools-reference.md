# 阿工專屬 — 常用 Action 速查
> 你是阿工（🔧 工程師），不是達爾，這是你的專屬知識庫

---

## analyze_code — 分析代碼結構

**用途**：分析 TypeScript/JavaScript 檔案的結構、依賴、export

```json
{"action":"analyze_code","path":"server/src/index.ts"}
```

**範例**：
```json
{"action":"analyze_code","path":"server/src/routes/auto-executor.ts"}
{"action":"analyze_code","path":"server/src/telegram/bot-polling.ts"}
{"action":"analyze_code","path":"server/src/openclawSupabase.ts"}
```

**什麼時候用**：
- 接到不熟悉的檔案，想快速了解結構
- 想看一個模組 export 了什麼
- 想了解依賴關係

---

## grep_project — 搜尋代碼關鍵字

**用途**：在專案目錄中精確搜尋文字/正則

```json
{"action":"grep_project","pattern":"關鍵字","path":"搜尋範圍"}
```

**範例**：
```json
{"action":"grep_project","pattern":"ECONNREFUSED","path":"server/src/"}
{"action":"grep_project","pattern":"app\\.use.*auth","path":"server/src/index.ts"}
{"action":"grep_project","pattern":"supabase\\.from\\('openclaw_tasks'\\)","path":"server/src/"}
{"action":"grep_project","pattern":"TODO|FIXME|HACK","path":"server/src/"}
```

**什麼時候用**：
- 找錯誤訊息出自哪裡
- 找某個函數在哪些地方被呼叫
- 找 TODO / FIXME
- 追蹤特定變數/字串

**注意**：
- pattern 支援正則表達式
- path 建議限定範圍（`server/src/`），不要搜整個系統

---

## find_symbol — 找函數/類定義

**用途**：精確找到函數、class、interface 的定義位置

```json
{"action":"find_symbol","symbol":"函數名","path":"server/src/"}
```

**範例**：
```json
{"action":"find_symbol","symbol":"authMiddleware","path":"server/src/"}
{"action":"find_symbol","symbol":"executeTask","path":"server/src/"}
{"action":"find_symbol","symbol":"semanticSearch","path":"server/src/"}
```

**什麼時候用**：
- 知道函數名但不知道在哪個檔案
- 想跳到定義看實作細節
- 分析 bug 時追蹤函數定義

---

## patch_file — 修改代碼

**用途**：對檔案做精確的文字替換修改

```json
{"action":"patch_file","path":"檔案路徑","patches":[{"find":"舊代碼","replace":"新代碼"}]}
```

**範例**：
```json
{
  "action": "patch_file",
  "path": "server/src/index.ts",
  "patches": [
    {
      "find": "res.status(500).send('error')",
      "replace": "res.status(500).json({ error: 'Internal server error', timestamp: Date.now() })"
    }
  ]
}
```

**注意**：
- `find` 必須完全匹配檔案中的文字（包括空格、換行）
- 一次可以多個 patch
- 修改前先用 `read_file` 確認要改的內容
- 修改後要驗證（TypeScript 編譯、功能測試）
- **重大改動通知達爾 push**

---

## read_file — 讀取檔案

**用途**：讀取任何本地檔案的內容

```json
{"action":"read_file","path":"~/完整路徑/檔案名"}
```

**範例**：
```json
{"action":"read_file","path":"~/Downloads/openclaw-console-hub-main/server/src/index.ts"}
{"action":"read_file","path":"~/.openclaw/automation/logs/taskboard.log"}
{"action":"read_file","path":"~/Downloads/openclaw-console-hub-main/server/package.json"}
```

**注意**：
- 路徑用 `~` 開頭
- 讀目錄用 `list_dir`，不能用 read_file！
- 大檔案可能被截斷

---

## code_eval — 執行代碼片段

**用途**：在安全的 VM 沙盒中執行 JavaScript 代碼

```json
{"action":"code_eval","code":"console.log(1 + 1)"}
```

**範例**：
```json
{"action":"code_eval","code":"const result = JSON.parse('{\"a\":1}'); console.log(result.a);"}
{"action":"code_eval","code":"const re = /api\\/(\\w+)/; console.log('api/tasks'.match(re));"}
{"action":"code_eval","code":"console.log(new Date().toISOString());"}
```

**什麼時候用**：
- 驗證正則表達式是否正確
- 測試 JSON 解析邏輯
- 驗證算法或邏輯
- 快速計算

**注意**：
- 只能跑純 JavaScript（沒有 Node.js 模組）
- 不能存取檔案系統或網路
- 適合驗證小段邏輯

---

## 其他常用 action

### semantic_search — 搜知識庫
```json
{"action":"semantic_search","query":"搜尋關鍵字"}
```
- 每次排查 bug 也先搜一下知識庫，可能有人遇過一樣的問題

### analyze_symbol — 深度分析函數（TS AST）
```json
{"action":"analyze_symbol","symbol":"函數名","path":"server/src/某檔案.ts"}
```
- 比 find_symbol 更深入，會分析參數、回傳型別、引用關係

### run_script — 執行腳本
```json
{"action":"run_script","script":"npx tsc --noEmit 2>&1 | head -20"}
{"action":"run_script","script":"curl -s http://localhost:3011/api/health"}
{"action":"run_script","script":"tail -50 ~/.openclaw/automation/logs/taskboard.log"}
```

### write_file — 寫檔案
```json
{"action":"write_file","path":"~/.openclaw/workspace/crew/agong/debug-notes.md","content":"# Debug 紀錄\n..."}
```

### query_supabase — 查 Supabase
```json
{"action":"query_supabase","table":"openclaw_tasks","select":"id,name,status","filters":{"status":"error"},"limit":10}
```

### create_task — 建立後續任務
```json
{"action":"create_task","name":"修復 XXX bug","priority":1,"owner":"阿工","description":"root cause: ..."}
```

### list_dir — 列出目錄
```json
{"action":"list_dir","path":"~/Downloads/openclaw-console-hub-main/server/src/routes/"}
```

---

## 阿工的 Action 使用順序（排查 Bug 時）

```
1. run_script (tail log)    ← 看 log 找錯誤
2. grep_project             ← 搜錯誤訊息在哪
3. find_symbol              ← 找到相關函數定義
4. read_file                ← 讀完整代碼
5. analyze_code             ← 了解檔案結構
6. code_eval                ← 驗證修復邏輯
7. patch_file               ← 修改代碼
8. run_script (tsc/build)   ← 編譯驗證
9. run_script (curl test)   ← 功能測試
```

## 阿工的 Action 使用順序（代碼審查時）

```
1. read_file                ← 讀要審查的代碼
2. analyze_code             ← 了解結構
3. grep_project             ← 搜尋相關引用
4. find_symbol              ← 追蹤函數定義
5. semantic_search          ← 看有沒有相關的規範文件
6. write_file               ← 寫審查報告
```
