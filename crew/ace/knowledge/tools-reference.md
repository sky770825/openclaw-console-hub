# 阿策專屬 — 常用 Action 速查
> 你是阿策（🎯 策略師），不是小蔡，這是你的專屬知識庫

---

## 你最常用的 4 個 Action

### 1. `semantic_search` — 語義搜尋知識庫

在向量知識庫中搜尋相關資訊。用於策略制定前的情報收集。

```json
{
  "action": "semantic_search",
  "query": "任務排序方法",
  "category": "cookbook",
  "top_k": 5
}
```

**參數說明：**
| 參數 | 必填 | 說明 |
|------|------|------|
| query | 是 | 搜尋關鍵字，越具體越好 |
| category | 否 | 限定分類（cookbook / memory / code / skill） |
| top_k | 否 | 回傳筆數，預設 5 |

**使用場景：**
- 制定策略前，查 cookbook 看有沒有現成方案
- 分析問題時，搜尋過去的類似案例
- 確認系統現有能力，避免重複建設

**小技巧：**
- 搜不到時換同義詞（有 12 組同義詞映射）
- 中英混搜效果更好
- 門檻 35%，低於此的結果不可信

---

### 2. `read_file` — 讀取檔案

讀取任何本地檔案。用於查看代碼、設定、文件。

```json
{
  "action": "read_file",
  "path": "/Users/caijunchang/Downloads/openclaw-console-hub-main/server/src/index.ts"
}
```

**參數說明：**
| 參數 | 必填 | 說明 |
|------|------|------|
| path | 是 | 檔案的絕對路徑 |

**常用路徑速查：**
| 用途 | 路徑 |
|------|------|
| Server 主程式 | `~/Downloads/openclaw-console-hub-main/server/src/index.ts` |
| 小蔡大腦 | `~/.openclaw/workspace/AGENTS.md` |
| 小蔡記憶 | `~/.openclaw/workspace/MEMORY.md` |
| 任務面板 | `~/Downloads/openclaw-console-hub-main/server/src/taskboard.ts` |
| Bot 設定 | `~/Downloads/openclaw-console-hub-main/server/src/bot-polling.ts` |
| Cookbook 目錄 | `~/Downloads/openclaw-console-hub-main/cookbook/README.md` |
| 環境變數 | `~/Downloads/openclaw-console-hub-main/.env` |

**使用場景：**
- 分析代碼架構前讀關鍵檔案
- 檢查某個功能的實作細節
- 確認設定值

---

### 3. `query_supabase` — 查詢 Supabase 資料庫

查詢 Supabase PostgreSQL 資料庫。用於取得任務、資料、統計。

```json
{
  "action": "query_supabase",
  "table": "tasks",
  "select": "id, name, status, priority, owner",
  "filters": {
    "status": "pending",
    "owner": "小蔡"
  },
  "order": "priority.asc",
  "limit": 20
}
```

**參數說明：**
| 參數 | 必填 | 說明 |
|------|------|------|
| table | 是 | 資料表名稱 |
| select | 否 | 要取的欄位，預設 * |
| filters | 否 | 篩選條件（key-value） |
| order | 否 | 排序，格式 `欄位.asc` 或 `欄位.desc` |
| limit | 否 | 筆數上限 |

**常用資料表：**
| 表名 | 內容 |
|------|------|
| tasks | 任務清單 |
| knowledge_chunks | 向量知識庫 |
| fadp_members | 聯盟成員 |
| execution_logs | 執行紀錄 |

**使用場景：**
- 盤點現有任務狀態
- 統計分析（多少 pending、多少 done）
- 查歷史執行紀錄做決策參考

---

### 4. `ask_ai` — 呼叫 AI 子代理

呼叫 AI 模型做分析、摘要、推理。用於需要深度思考的策略分析。

```json
{
  "action": "ask_ai",
  "model": "flash",
  "prompt": "分析以下三個方案的優缺點，推薦最佳方案：\n方案A：...\n方案B：...\n方案C：...",
  "system": "你是技術架構顧問，請給出具體可執行的建議"
}
```

**參數說明：**
| 參數 | 必填 | 說明 |
|------|------|------|
| model | 否 | 模型選擇（見下方） |
| prompt | 是 | 提問內容 |
| system | 否 | 系統提示詞 |

**模型選擇策略（策略師專用）：**
| 場景 | 推薦模型 | 原因 |
|------|---------|------|
| 快速分析 | flash | 便宜快速，一般分析夠用 |
| 深度策略 | pro | 推理能力強，方案比較用 |
| 技術評估 | claude | 代碼理解最好 |
| 大量文件 | flash | 長 context 便宜 |

**使用場景：**
- 方案比較（給 2-3 個選項讓 AI 分析優缺點）
- 技術可行性評估
- 風險分析的第二意見
- 長文摘要（先讀大檔案，再丟給 AI 濃縮）

---

## 輔助 Action（偶爾會用）

### `web_search` — 網路搜尋
```json
{
  "action": "web_search",
  "query": "n8n webhook trigger best practices 2026"
}
```
用於：查技術文件、看最新 API 變更、搜解決方案

### `grep_project` — 全專案搜尋
```json
{
  "action": "grep_project",
  "pattern": "createTask",
  "path": "server/src",
  "file_pattern": "*.ts"
}
```
用於：找某個函數在哪裡用、追蹤代碼引用

### `find_symbol` — 找程式碼符號
```json
{
  "action": "find_symbol",
  "symbol": "TaskStatus",
  "type": "type"
}
```
用於：找 interface/type/class 定義

---

## Action 組合技（策略師常用流程）

### 流程 1：任務盤點
```
1. query_supabase（取所有 pending 任務）
2. semantic_search（查每個任務的背景知識）
3. ask_ai（讓 AI 幫忙排序）
```

### 流程 2：技術方案評估
```
1. read_file（讀現有代碼）
2. grep_project（查相關檔案）
3. web_search（查最佳實踐）
4. ask_ai（綜合分析，推薦方案）
```

### 流程 3：風險分析
```
1. read_file（讀改動的檔案）
2. semantic_search（查過去類似改動的問題）
3. ask_ai（評估風險等級和備案）
```
