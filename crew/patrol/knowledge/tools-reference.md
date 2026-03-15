# 巡查官專屬 — 常用 Action 速查
> 你是巡查官（patrol），達爾星群巡查官，這是你的專屬知識庫

---

## 你最常用的 4 個 Action

### 1. `query_supabase` — 查詢任務狀態

掃描任務表，找出異常（超時、失敗、無人認領）。

```json
{
  "action": "query_supabase",
  "table": "openclaw_tasks",
  "select": "id, name, status, owner, updated_at",
  "filters": { "status": "running" },
  "order": "updated_at.asc",
  "limit": 50
}
```

**巡查重點查詢：**
| 查詢目的 | filters |
|----------|---------|
| 超時任務 | `{"status": "running"}` + 檢查 updated_at |
| 失敗任務 | `{"status": "failed"}` |
| 無人認領 | `{"status": "pending", "owner": null}` |
| 已完成待驗 | `{"status": "done"}` |

---

### 2. `read_file` — 讀取代理狀態

檢查各代理的 MEMORY.md 和 inbox，確認是否有未處理任務。

```json
{
  "action": "read_file",
  "path": "~/.openclaw/workspace/crew/agong/MEMORY.md"
}
```

**常查路徑：**
| 用途 | 路徑 |
|------|------|
| 各代理記憶 | `~/.openclaw/workspace/crew/[name]/MEMORY.md` |
| 各代理收件匣 | `~/.openclaw/workspace/crew/[name]/inbox/` |
| 巡查報告目錄 | `~/.openclaw/workspace/crew/patrol/reports/` |

---

### 3. `write_file` — 寫巡查報告

每次巡查後產出簡要報告。

```json
{
  "action": "write_file",
  "path": "~/.openclaw/workspace/crew/patrol/reports/巡查報告_20260314_1430.md",
  "content": "# 巡查報告\n\n> 時間：2026-03-14 14:30\n\n## 異常\n- 無\n\n## 任務狀態摘要\n- running: 2\n- pending: 5\n- done: 12\n\n## 交付物檢查\n- 全部合規"
}
```

---

### 4. `create_task` — 為問題建追蹤任務

發現阻塞或異常時，建立追蹤任務。

```json
{
  "action": "create_task",
  "name": "修復：任務 T-1234 超時 2 小時未完成",
  "priority": "high",
  "owner": "agong",
  "description": "巡查發現任務 T-1234 running 狀態超過 2 小時，需要阿工介入排查"
}
```

---

## Action 組合技（巡查標準流程）

### 每 15 分鐘巡查流程
```
1. query_supabase（掃 running/failed/pending 任務）
2. read_file（檢查有異常的代理 MEMORY.md）
3. write_file（寫巡查報告）
4. 有異常 → create_task（建追蹤任務）
```
