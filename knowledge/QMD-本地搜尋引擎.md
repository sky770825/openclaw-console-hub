# QMD - 本地 Markdown 搜尋引擎

> **版本**: v1.0
> **建立日期**: 2026-02-16
> **用途**: 達爾和所有 Agent 搜尋知識庫的工具

---

## 是什麼

QMD (Query Markup Documents) 是一個完全本地的 Markdown 搜尋引擎，結合：
- **BM25 關鍵字搜尋** — 精確匹配（如搜「SOP-07」）
- **向量語義搜尋** — 模糊匹配（如搜「怎麼處理 Git 衝突」）
- **LLM Reranking** — 用 LLM 重新排序結果

不花錢、不用網路、跑在本機 SQLite 上。

---

## 安裝狀態

```yaml
安裝方式: npm install -g @tobilu/qmd
執行指令: qmd-run（wrapper，解決 Node 25 相容問題）
wrapper 位置: /opt/homebrew/bin/qmd-run
資料庫位置: ~/.cache/qmd/index.sqlite
Embedding 模型: embeddinggemma（QMD 內建，本地 GGUF）
```

---

## 已建立的 Collections

| Collection | 路徑 | 檔案數 | 用途 |
|-----------|------|--------|------|
| sop | `~/.openclaw/workspace/sop-知識庫/` | 19 | SOP 規範 |
| instruction | `~/.openclaw/workspace/dar-指令集/` | 12 | 達爾指令集 |
| knowledge | `~/.openclaw/workspace/knowledge/` | 54 | 知識文件 |
| docs | （原有） | 48 | 文件 |
| memory | （原有） | 137 | 記憶檔案 |

---

## 常用指令

### 搜尋（三種模式）

```bash
# BM25 關鍵字搜尋（最快，精確匹配）
qmd-run search "程式碼品質通病" -c sop

# 向量語義搜尋（理解意圖）
qmd-run vsearch "怎麼處理程式碼品質問題" -c sop

# 混合搜尋 + Reranking（最準，但最慢）
qmd-run query "程式碼品質怎麼改善"
```

### 管理

```bash
# 查看狀態
qmd-run status

# 更新索引（檔案有變動時）
qmd-run update

# 重新產生 embeddings
qmd-run embed

# 列出 collection 內的檔案
qmd-run ls sop
```

### 取得文件

```bash
# 用路徑取
qmd-run get "qmd://sop/SOP-07-Git衝突處理.md"

# 用 docid 取（搜尋結果會顯示 #xxxxx）
qmd-run get "#2fdb92"
```

### 搜尋選項

```bash
-n 5           # 回傳幾筆（預設 5）
-c sop         # 限定 collection
--json         # JSON 格式輸出（給程式用）
--full         # 顯示完整文件
--min-score 0.5  # 最低分數門檻
```

---

## MCP Server 模式

QMD 內建 MCP server，可以讓 Claude Code 直接使用：

```bash
# 啟動 MCP server（stdio）
qmd-run mcp

# 啟動 MCP server（HTTP，背景）
qmd-run mcp --http --daemon

# 停止
qmd-run mcp stop
```

MCP 提供的 tools：
- `qmd_search` — BM25 搜尋
- `qmd_vector_search` — 向量搜尋
- `qmd_deep_search` — 混合搜尋 + reranking
- `qmd_get` — 取得文件
- `qmd_multi_get` — 批次取得文件
- `qmd_status` — 索引狀態

---

## 搜尋策略建議

| 場景 | 用哪個 | 為什麼 |
|------|--------|--------|
| 知道確切關鍵字 | `search`（BM25） | 快、準 |
| 模糊搜尋、自然語言問句 | `vsearch` | 語義理解 |
| 重要查詢、要最準的結果 | `query` | 三層合一 |
| 搜 SOP 規範 | 加 `-c sop` | 縮小範圍 |
| 搜指令集 | 加 `-c instruction` | 縮小範圍 |

---

## 與 Qdrant 的關係

目前系統有兩套搜尋：

| 比較 | Qdrant + bge-m3 | QMD |
|------|-----------------|-----|
| 搜尋方式 | 純向量 | BM25 + 向量 + Reranking |
| 中文精確度 | 90% Top-1 | 70% Top-1（語義），89%（關鍵字） |
| 依賴 | Docker (Qdrant) + Ollama (bge-m3) | SQLite 本地檔案 |
| Embedding 模型 | bge-m3 (1024維) | embeddinggemma (內建) |
| 適合 | 語義搜尋 | 關鍵字 + 語義混合 |

**建議並用**：先用 QMD BM25 試精確匹配，沒命中再用 Qdrant 向量搜尋。

---

## 更新索引的時機

| 時機 | 操作 |
|------|------|
| 新增/修改 SOP | `qmd-run update && qmd-run embed` |
| 新增 collection | `qmd-run collection add <path> --name <name>` |
| 定期維護 | `qmd-run update --pull && qmd-run embed` |
