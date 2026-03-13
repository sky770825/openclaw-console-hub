# 阿數專屬 — Supabase 查詢速查
> 你是阿數（📊 數據分析師），不是達爾，這是你的專屬知識庫

---

## query_supabase 基本用法

```
action: query_supabase
table: "表名"
select: "欄位1, 欄位2"
filters: { "欄位": "值" }
order: "欄位.desc"
limit: 10
```

### 參數說明
| 參數 | 必填 | 說明 | 範例 |
|------|------|------|------|
| `table` | 是 | 資料表名 | `openclaw_tasks` |
| `select` | 否 | 要撈的欄位（預設 *） | `name, status, created_at` |
| `filters` | 否 | 過濾條件 | `{ "status": "completed" }` |
| `order` | 否 | 排序 | `created_at.desc` |
| `limit` | 否 | 最多幾筆 | `10` |

### 過濾運算符
| 運算符 | 用法 | 說明 |
|--------|------|------|
| 等於 | `{ "status": "done" }` | 精確匹配 |
| like | `{ "name": "like.%990%" }` | 模糊匹配 |
| gt | `{ "priority": "gt.3" }` | 大於 |
| gte | `{ "priority": "gte.3" }` | 大於等於 |
| lt | `{ "priority": "lt.3" }` | 小於 |
| lte | `{ "priority": "lte.3" }` | 小於等於 |
| neq | `{ "status": "neq.deleted" }` | 不等於 |
| in | `{ "status": "in.(pending,active)" }` | 多值匹配 |
| is | `{ "deleted_at": "is.null" }` | 是否為 null |

---

## 常用查詢模板

### 任務統計

```
# 所有任務數量（按狀態分組）
query_supabase openclaw_tasks select=status

# 待辦任務（最新優先）
query_supabase openclaw_tasks select=name,status,priority,created_at filters status=pending order=created_at.desc

# 已完成任務
query_supabase openclaw_tasks select=name,completed_at filters status=completed order=completed_at.desc limit=20

# 高優先任務
query_supabase openclaw_tasks select=name,status,priority filters priority=gte.4 order=priority.desc

# 特定 owner 的任務
query_supabase openclaw_tasks select=name,status filters owner=達爾

# 今天建立的任務
query_supabase openclaw_tasks select=* filters created_at=gte.2026-03-04 order=created_at.desc

# 失敗的任務
query_supabase openclaw_tasks select=name,error,updated_at filters status=failed order=updated_at.desc
```

### 知識庫統計

```
# 知識庫總量
query_supabase openclaw_knowledge select=id

# 按分類統計
query_supabase openclaw_knowledge select=category

# 最近索引的文件
query_supabase openclaw_knowledge select=title,category,created_at order=created_at.desc limit=10

# 特定分類的文件
query_supabase openclaw_knowledge select=title,chunk_index filters category=cookbook

# 搜特定標題
query_supabase openclaw_knowledge select=title,category filters title=like.%API%
```

### API 指標查詢

```
# API 呼叫記錄（如有 api_logs 表）
query_supabase api_logs select=endpoint,status_code,response_time order=created_at.desc limit=50

# 錯誤請求
query_supabase api_logs select=endpoint,error,created_at filters status_code=gte.400 order=created_at.desc

# 慢請求（> 2 秒）
query_supabase api_logs select=endpoint,response_time filters response_time=gt.2000 order=response_time.desc
```

### 用量報表

```
# 每日任務建立量（需後處理統計）
query_supabase openclaw_tasks select=created_at order=created_at.desc

# 向量知識庫增長
query_supabase openclaw_knowledge select=created_at order=created_at.desc

# 活躍用戶/操作者
query_supabase openclaw_tasks select=owner order=created_at.desc
```

---

## 資料表速查

### openclaw_tasks（任務表）
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | uuid | 主鍵 |
| name | text | 任務名稱 |
| status | text | pending/active/completed/failed |
| priority | int | 優先度（1-5，5 最高） |
| owner | text | 負責人 |
| deck | text | 所屬甲板 |
| created_at | timestamp | 建立時間 |
| updated_at | timestamp | 更新時間 |
| completed_at | timestamp | 完成時間 |
| error | text | 錯誤訊息 |

### openclaw_knowledge（知識庫表）
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | uuid | 主鍵 |
| title | text | 文件標題 |
| content | text | 文件內容 |
| category | text | 分類 |
| chunk_index | int | 切片索引（-1=摘要） |
| embedding | vector(768) | 向量嵌入 |
| source_path | text | 來源路徑 |
| created_at | timestamp | 建立時間 |

---

## 查詢結果後處理技巧

拿到原始資料後，用 `ask_ai` 或 `code_eval` 做統計：

```
# 1. 先拉原始資料
query_supabase openclaw_tasks select=status,created_at

# 2. 用 code_eval 做統計
code_eval `
  const data = [/* 貼上查詢結果 */];
  const counts = {};
  data.forEach(r => { counts[r.status] = (counts[r.status]||0) + 1; });
  return counts;
`

# 3. 或用 ask_ai 做分析
ask_ai model=flash prompt="分析以下數據的趨勢：[貼數據]"
```

---

## 注意事項

1. **query_supabase 是唯讀的** — 只能 SELECT，不能 INSERT/UPDATE/DELETE
2. **大量資料加 limit** — 避免拉太多資料浪費 token
3. **時間過濾** — 日期格式用 `YYYY-MM-DD`（如 `2026-03-04`）
4. **null 值** — 用 `is.null` 或 `is.not.null`，不要用 `= null`
5. **結果是 JSON** — 可能需要後處理才能讀懂
