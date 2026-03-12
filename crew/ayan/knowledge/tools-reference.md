# 阿研專屬 — 常用 Action 速查
> 你是阿研（🔬 研究員），不是小蔡，這是你的專屬知識庫

---

## semantic_search — 搜知識庫（每次第一步！）

**用途**：在 6000+ 向量 chunks 中搜尋相關知識

```json
{"action":"semantic_search","query":"自然語言描述你要找什麼"}
```

**範例**：
```json
{"action":"semantic_search","query":"Express server 中間件設定"}
{"action":"semantic_search","query":"Supabase pgvector 向量搜尋用法"}
{"action":"semantic_search","query":"Telegram bot polling 設定"}
```

**注意**：
- query 用自然語言，不是關鍵字堆砌
- 搜不到就換同義詞（中英文都試）
- 門檻 35%，太低的結果會被過濾

---

## web_search — 外部網路搜尋

**用途**：知識庫沒有時，去外部搜尋

```json
{"action":"web_search","query":"具體搜尋詞"}
```

**範例**：
```json
{"action":"web_search","query":"express.js helmet security middleware 2026"}
{"action":"web_search","query":"supabase edge function deploy guide site:supabase.com"}
{"action":"web_search","query":"react useMemo vs useCallback performance"}
```

**注意**：
- 搜尋詞要具體，加年份、加 site: 限定
- 先 semantic_search，沒結果才用這個
- 每次任務最多用 2-3 次，別濫用

---

## web_browse — 瀏覽特定網頁

**用途**：web_search 找到好結果後，深入閱讀

```json
{"action":"web_browse","url":"https://具體網址"}
```

**範例**：
```json
{"action":"web_browse","url":"https://docs.zeabur.com/deploy/express"}
{"action":"web_browse","url":"https://github.com/user/repo/blob/main/README.md"}
```

**注意**：
- 只在 web_search 找到有價值結果時才用
- 不要盲目瀏覽
- 一些網站可能被擋（需要登入的、付費牆的）

---

## read_file — 讀取檔案

**用途**：讀取本地檔案內容

```json
{"action":"read_file","path":"~/完整路徑/檔案名"}
```

**範例**：
```json
{"action":"read_file","path":"~/.openclaw/automation/logs/taskboard.log"}
{"action":"read_file","path":"~/.openclaw/workspace/cookbook/API-端點.md"}
{"action":"read_file","path":"~/.openclaw/workspace/crew/ayan/MEMORY.md"}
```

**注意**：
- 路徑用 `~` 開頭（home 目錄）
- 讀目錄要用 `list_dir`，不能用 read_file！
- 大檔案可能被截斷

---

## index_file — 新資料入庫

**用途**：把檔案內容加入向量知識庫

```json
{"action":"index_file","path":"~/檔案路徑","category":"分類"}
```

**範例**：
```json
{"action":"index_file","path":"~/.openclaw/workspace/crew/ayan/研究報告.md","category":"research"}
{"action":"index_file","path":"~/.openclaw/workspace/cookbook/新手冊.md","category":"cookbook"}
```

**Category 選項**：
| category | 用途 |
|----------|------|
| `research` | 研究報告 |
| `cookbook` | 操作手冊 |
| `code` | 代碼文件 |
| `knowledge` | 一般知識 |
| `troubleshooting` | 故障排查 |

**注意**：
- 檔案建議 < 800 字元效果最好
- 相同路徑重複 index 會更新
- index 後等 30 秒再搜尋測試

---

## grep_project — 搜尋代碼/文件關鍵字

**用途**：在專案目錄中精確搜尋關鍵字

```json
{"action":"grep_project","pattern":"關鍵字","path":"搜尋目錄"}
```

**範例**：
```json
{"action":"grep_project","pattern":"semantic_search","path":"server/src/"}
{"action":"grep_project","pattern":"ECONNREFUSED","path":"~/.openclaw/automation/logs/"}
{"action":"grep_project","pattern":"TODO","path":"server/src/"}
```

**注意**：
- pattern 支援正則表達式
- path 限定搜尋範圍，不要搜整個系統
- 適合找特定錯誤訊息、函數名、變數名

---

## 其他常用 action

### list_dir — 列出目錄內容
```json
{"action":"list_dir","path":"~/.openclaw/workspace/cookbook/"}
```

### write_file — 寫檔案
```json
{"action":"write_file","path":"~/.openclaw/workspace/crew/ayan/筆記.md","content":"# 標題\n內容"}
```

### query_supabase — 查 Supabase 資料庫
```json
{"action":"query_supabase","table":"openclaw_tasks","select":"*","limit":10}
```

### run_script — 執行腳本
```json
{"action":"run_script","script":"tail -50 ~/.openclaw/automation/logs/taskboard.log"}
```

### ask_ai — 需要深度分析時
```json
{"action":"ask_ai","model":"flash","prompt":"分析以下內容：..."}
```
- `flash`：日常快速分析
- `pro`：複雜問題、架構分析

### create_task — 建立後續任務
```json
{"action":"create_task","name":"任務名稱","priority":2,"owner":"阿研"}
```

---

## 阿研的 Action 使用順序

```
1. semantic_search  ← 永遠先搜知識庫
2. read_file        ← 讀取搜到的相關檔案
3. grep_project     ← 需要精確找代碼/log
4. web_search       ← 內部沒有才搜外部
5. web_browse       ← 搜到好結果才深入
6. write_file       ← 整理結果寫筆記
7. index_file       ← 有價值的結果入庫
```
