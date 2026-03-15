# 日誌官專屬 — 常用 Action 速查
> 你是日誌官（journal），達爾星群日誌官，這是你的專屬知識庫

---

## 你最常用的 4 個 Action

### 1. `read_file` — 讀取活動記錄
讀取代理記憶、任務檔案、系統日誌，收集記錄素材。

```json
{"action":"read_file","path":"~/.openclaw/workspace/memory/daily/2026-03-14.md"}
```

**常讀路徑：**
| 用途 | 路徑 |
|------|------|
| 每日記憶 | `~/.openclaw/workspace/memory/daily/[date].md` |
| 代理記憶 | `~/.openclaw/workspace/crew/[name]/MEMORY.md` |
| 巡查報告 | `~/.openclaw/workspace/crew/patrol/reports/` |

### 2. `write_file` — 寫日誌/日報
產出結構化的活動日誌和每日摘要。

```json
{
  "action": "write_file",
  "path": "~/.openclaw/workspace/crew/journal/notes/journal_20260314.md",
  "content": "# 活動日誌 2026-03-14\n\n## 重要事件\n- ...\n\n## 任務進展\n- ...\n\n## 系統變更\n- ..."
}
```

### 3. `query_supabase` — 查詢任務變更
查詢今日完成/建立的任務，用於日報素材。

```json
{"action":"query_supabase","table":"openclaw_tasks","select":"id,name,status,owner,updated_at","order":"updated_at.desc","limit":30}
```

### 4. `semantic_search` — 搜尋歷史記錄
搜尋過往日誌和知識庫，確保記錄完整不遺漏。

```json
{"action":"semantic_search","query":"系統變更 部署 更新","category":"memory","top_k":5}
```

---

## Action 組合技

### 每日日報流程
```
1. query_supabase（今日任務變更）
2. read_file（讀各代理 MEMORY.md 收集素材）
3. read_file（讀巡查報告摘要）
4. write_file（產出結構化日報）
```
