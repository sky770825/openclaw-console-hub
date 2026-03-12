# 阿秘專屬 — 常用 Action 速查
> 你是阿秘（📋 秘書），不是小蔡，這是你的專屬知識庫

---

## 你最常用的 5 個 Action

### 1. `semantic_search` — 語義搜尋知識庫

用於快速查找系統中的相關資訊，是做日報和摘要的基礎。

```json
{
  "action": "semantic_search",
  "query": "今天的任務完成狀況",
  "category": "memory",
  "top_k": 10
}
```

**參數說明：**
| 參數 | 必填 | 說明 |
|------|------|------|
| query | 是 | 搜尋關鍵字，自然語言即可 |
| category | 否 | 限定分類：memory / cookbook / code / skill |
| top_k | 否 | 回傳筆數，預設 5，日報時建議 10 |

**阿秘常用搜尋：**
```json
// 找任務相關
{"action": "semantic_search", "query": "pending 任務", "category": "memory"}

// 找 cookbook 參考
{"action": "semantic_search", "query": "日報格式", "category": "cookbook"}

// 找歷史記錄
{"action": "semantic_search", "query": "上次修復的 bug"}
```

**小技巧：**
- 搜不到就換說法（有 12 組同義詞映射）
- 信心分數低於 35% 的結果不可信
- 先搜大範圍，再用 category 縮小

---

### 2. `read_file` — 讀取檔案

讀取本地檔案。日報所需的大部分資料都要靠讀檔取得。

```json
{
  "action": "read_file",
  "path": "/Users/caijunchang/.openclaw/automation/logs/taskboard.log"
}
```

**阿秘常讀的檔案：**
| 用途 | 路徑 |
|------|------|
| Server log | `~/.openclaw/automation/logs/taskboard.log` |
| 版本號 | `~/Downloads/openclaw-console-hub-main/package.json` |
| 小蔡記憶 | `~/.claude/projects/.../memory/MEMORY.md` |
| 阿秘記憶 | `~/.openclaw/workspace/crew/ami/MEMORY.md` |
| 阿秘筆記 | `~/.openclaw/workspace/crew/ami/notes.md` |
| 小蔡大腦 | `~/.openclaw/workspace/AGENTS.md` |
| 心跳狀態 | `~/.openclaw/workspace/HEARTBEAT.md` |
| 醒來狀態 | `~/.openclaw/workspace/WAKE_STATUS.md` |

**使用場景：**
- 每日日報開始時讀 log 和任務狀態
- 記憶整理時讀 MEMORY.md
- 確認系統狀態時讀 HEARTBEAT.md

---

### 3. `write_file` — 寫入檔案

寫入或更新檔案。用於產出日報、更新記憶、做筆記。

```json
{
  "action": "write_file",
  "path": "/Users/caijunchang/.openclaw/workspace/crew/ami/notes/日報_2026-03-04.md",
  "content": "# OpenClaw 日報 — 2026-03-04\n\n## 摘要\n..."
}
```

**參數說明：**
| 參數 | 必填 | 說明 |
|------|------|------|
| path | 是 | 檔案絕對路徑 |
| content | 是 | 檔案內容（完整覆寫） |

**阿秘常寫的檔案：**
| 用途 | 路徑 |
|------|------|
| 日報 | `~/.openclaw/workspace/crew/ami/notes/日報_YYYY-MM-DD.md` |
| 週報 | `~/.openclaw/workspace/crew/ami/notes/週報_WXX.md` |
| 阿秘記憶 | `~/.openclaw/workspace/crew/ami/MEMORY.md` |
| 阿秘筆記 | `~/.openclaw/workspace/crew/ami/notes.md` |

**注意事項：**
- write_file 是完整覆寫，不是 append
- 寫之前先 `read_file` 確認現有內容
- 重要檔案寫入前先備份（讀出來暫存）
- **不要寫 AGENTS.md / SOUL.md**（安全底線）

---

### 4. `query_supabase` — 查詢資料庫

從 Supabase 取得結構化數據。日報的任務統計主要靠這個。

```json
{
  "action": "query_supabase",
  "table": "tasks",
  "select": "id, name, status, priority, owner, created_at, updated_at",
  "filters": { "status": "pending" },
  "order": "priority.asc",
  "limit": 50
}
```

**參數說明：**
| 參數 | 必填 | 說明 |
|------|------|------|
| table | 是 | 資料表名稱 |
| select | 否 | 欄位（預設 *） |
| filters | 否 | 篩選條件 |
| order | 否 | 排序（`欄位.asc` 或 `.desc`） |
| limit | 否 | 筆數上限 |

**阿秘常用查詢：**

```json
// 今日更新的任務
{
  "action": "query_supabase",
  "table": "tasks",
  "select": "name, status, owner, updated_at",
  "filters": { "updated_at": "gte.2026-03-04T00:00:00" },
  "order": "updated_at.desc"
}

// 所有 pending 任務（排優先）
{
  "action": "query_supabase",
  "table": "tasks",
  "select": "name, priority, owner",
  "filters": { "status": "pending" },
  "order": "priority.asc"
}

// 任務數量統計（分狀態）
{
  "action": "query_supabase",
  "table": "tasks",
  "select": "status, count",
  "group_by": "status"
}

// 向量庫 chunk 數量
{
  "action": "query_supabase",
  "table": "knowledge_chunks",
  "select": "count"
}
```

---

### 5. `ask_ai` — 呼叫 AI 子代理

用 AI 做摘要、分析、格式轉換。阿秘做長文摘要的核心工具。

```json
{
  "action": "ask_ai",
  "model": "flash",
  "prompt": "請將以下 server log 摘要成 5 個要點：\n\n[log 內容]",
  "system": "你是系統日誌分析專家，只提取異常和重要事件，忽略正常運行記錄"
}
```

**參數說明：**
| 參數 | 必填 | 說明 |
|------|------|------|
| model | 否 | flash（預設，快便宜） / pro（深度分析） / claude（最準） |
| prompt | 是 | 提問內容 |
| system | 否 | 系統提示詞（指定角色和風格） |

**阿秘常用 prompt 模板：**

```json
// Log 分析
{
  "model": "flash",
  "prompt": "分析以下 server log，找出：1.錯誤 2.警告 3.異常模式\n\n[log]",
  "system": "只列出需要關注的問題，正常記錄不要提"
}

// 長文摘要
{
  "model": "flash",
  "prompt": "將以下內容摘要為 3-5 個要點，每點不超過 2 句：\n\n[長文]",
  "system": "保持技術準確性，不添加原文沒有的內容"
}

// 格式轉換
{
  "model": "flash",
  "prompt": "將以下雜亂的筆記整理成結構化的 markdown 表格：\n\n[筆記]",
  "system": "保留所有資訊，只改格式"
}
```

**模型選擇（阿秘專用）：**
| 場景 | 選 | 原因 |
|------|-----|------|
| 日常摘要 | flash | 便宜、夠用 |
| 重要報告 | pro | 品質更好 |
| 超長文件 | flash | 長 context 省 token |
| 精確分析 | claude | 最準但最貴 |

---

## Action 組合技（阿秘常用流程）

### 流程 1：每日日報
```
1. query_supabase（取今日任務變動）
2. read_file（讀 server log 最後 50 行）
3. read_file（讀版本號）
4. ask_ai（用 flash 摘要 log）
5. write_file（產出日報到 notes/）
```

### 流程 2：記憶整理
```
1. read_file（讀 MEMORY.md）
2. read_file（讀 notes.md）
3. ask_ai（讓 AI 找出過時/重複的記憶）
4. write_file（更新 MEMORY.md）
5. write_file（更新 notes.md 索引）
```

### 流程 3：老蔡回報
```
1. query_supabase（取最新狀態）
2. semantic_search（搜相關背景）
3. ask_ai（產生精簡報告）
4. 交給小蔡發通知
```

### 流程 4：長文件摘要
```
1. read_file（讀原始文件）
2. ask_ai（第一遍粗摘要）
3. ask_ai（第二遍精煉）
4. write_file（儲存摘要結果）
```
