# OpenClaw 任務面版 — 完整盤點報告

> **盤點日期**: 2026-02-16
> **盤點人**: L2 Claude Code (Opus 4.6)
> **狀態**: 僅供老蔡參考，尚未派工

---

## 一、已有的功能（已實作）

### 前端 UI（11 個頁面）

| # | 頁面 | 路徑 | 功能 |
|---|------|------|------|
| 1 | Dashboard | `/` | KPI 卡片、週趨勢圖、AutoExecutor/Autopilot 控制、緊急停止、預算追蹤 |
| 2 | Task Kanban | `/tasks` | 6 欄看板（Draft→Ready→Running→Review→Done/Blocked） |
| 3 | Task List | `/tasks/list` | 表格檢視、搜尋過濾、批次操作 |
| 4 | Task Detail | `/tasks/:id` | 完整表單（名稱、優先級、風險、排程、接受標準、交付物、執行命令） |
| 5 | Runs | `/runs` | 執行歷史、步驟時間軸、錯誤追蹤、重跑按鈕 |
| 6 | Logs | `/logs` | 即時日誌串流、等級過濾、搜尋、匯出 TXT/JSON |
| 7 | Alerts | `/alerts` | 告警管理（open/acked/snoozed）、嚴重度分類 |
| 8 | Review Center | `/review` | 想法/提案審核、批准/拒絕、一鍵建任務/專案 |
| 9 | Projects | `/projects` | 專案卡片、進度追蹤、階段里程碑、標籤 |
| 10 | Domains | `/domains` | 領域分類查詢、關鍵字搜尋 |
| 11 | Settings | `/settings` | 功能開關、API Key 管理、通知設定、角色權限 |

### 後端 API（50+ 端點）

| 類別 | 端點數 | 說明 |
|------|--------|------|
| 任務 CRUD | 8 | GET/POST/PATCH/DELETE + 進度更新 |
| 執行記錄 | 4 | 列表、詳情、觸發、重跑 |
| 告警 | 2 | 列表、狀態更新 |
| Review | 5 | CRUD + 關聯任務 |
| 自動化 | 4 | CRUD + 觸發 |
| 專案 | 4 | CRUD |
| AutoExecutor | 3 | 狀態/啟動/停止 |
| Autopilot | 4 | 狀態/日誌/啟動/停止 |
| Auto Task Generator | 4 | 狀態/啟動/停止/立即執行 |
| n8n 整合 | 3 | 健康檢查/列表/觸發 webhook |
| Telegram | 2 | 測試/強制測試 |
| 系統 | 8 | 健康檢查、功能開關、網域、排程、索引器 |
| Session | 5 | Agent 協作、命令、中斷/恢復 |

### 中介層 & 安全

- API Key 三級認證（read/write/admin）
- Zod 請求驗證（所有端點）
- Helmet 安全標頭
- Rate limiting
- CORS
- WebSocket 即時推送框架
- 審計日誌

### 自動化引擎

- **Anti-Stuck**：超時監控（5分鐘）+ 自動重試（2次）+ 模型降級（Gemini→Claude→Kimi→Ollama）
- **Agent Selector**：根據任務類型/風險/複雜度自動分配 Agent
- **Workflow Engine**：依賴關係圖 + 拓撲排序（偵測循環依賴）
- **Task Compliance Gate**：品質閘門（Ready 狀態 12 項必填欄位檢查）
- **Feature Flags**：10+ 功能開關，不用改 code 就能開關功能
- **Emergency Stop**：AbortController + SIGTERM/SIGKILL 雙保險

### 外部整合

- **Supabase**：12 張資料表 + Row Level Security
- **n8n**：5 個 workflow 範本（排程/webhook/結果接收/Telegram 路由/告警監控）
- **Telegram Bot**：通知 + 控制（/start, /stop, /codex-triage）
- **Ollama**：本地模型整合
- **GitHub Actions**：CI/CD 自動部署

### Python 監控系統

- `ollama_bot2.py`（47KB）— Telegram 控制機器人
- `monitoring_engine.py` — 健康檢查引擎（Gateway/SeekDB/Ollama/磁碟/負載）
- `control_scripts.py` — 系統操作腳本（啟停/清理/恢復）

### Bash 自動化（30+ 腳本）

- `gateway-recover.sh` — Gateway 自動恢復
- `auto-project-backup.sh` — 自動備份（90天保留）
- `emergency-stop.sh` — 緊急停止
- `nightly-memory-sync.sh` — 夜間記憶同步
- 更多...

---

## 二、需要補上的功能

### 🔴 高優先（核心缺失）

| # | 項目 | 說明 | 誰做 |
|---|------|------|------|
| 1 | **登入/註冊 UI** | 有 API Key 認證但沒有登入畫面，目前誰開網頁都能進 | Cursor（UI）+ L2（認證邏輯） |
| 2 | **真正的任務執行引擎** | executor-agents.ts 是模擬的，沒有真正跑 shell/呼叫 agent API | L2 Claude Code |
| 3 | **本地持久化** | Server 重啟資料全丟，需要 SQLite 或 JSON 檔案備援 | L2 Claude Code |

### 🟡 中優先（體驗改善）

| # | 項目 | 說明 | 誰做 |
|---|------|------|------|
| 4 | **WebSocket 完整串接** | 後端有 WS，前端有 hook，但實際即時推送沒有完整串通 | L2 Claude Code |
| 5 | **Kanban 拖拉功能** | 看板 UI 在但拖拉改狀態的邏輯不完整 | Cursor（dnd-kit 整合） |
| 6 | **Cron 排程引擎** | 任務有 schedule 欄位但後端沒有 cron scheduler 實際觸發 | L2 Claude Code |
| 7 | **Logs 持久化** | 日誌只在記憶體，重啟就丟 | L2 Claude Code |
| 8 | **測試覆蓋** | 只有 2 個測試檔，關鍵流程沒覆蓋 | Cursor（寫測試）+ L2（規劃） |

### 🟢 低優先（錦上添花）

| # | 項目 | 說明 | 誰做 |
|---|------|------|------|
| 9 | 通知設定持久化 | Settings 有 Email/LINE/Slack UI 但後端沒存 | Cursor |
| 10 | 任務範本庫 UI | 有模板邏輯沒有 UI「範本市集」 | Cursor |
| 11 | 匯出/匯入 | 沒有全站備份還原功能 | L2 Claude Code |
| 12 | 使用者角色管理 | Settings 有角色顯示但不能增刪改 | Cursor（UI）+ L2（邏輯） |
| 13 | 手機版 Kanban 優化 | 有 responsive hook 但 Kanban 手機上不好用 | Cursor |
| 14 | 國際化 i18n | 中英文混雜，沒有語言切換 | Cursor |

---

## 三、技術棧總覽

| 類別 | 技術 |
|------|------|
| 前端 | Vite + React 18 + TypeScript |
| UI 庫 | shadcn/ui + Tailwind CSS + Radix UI |
| 狀態管理 | React Query (@tanstack) + Context + localStorage |
| 後端 | Express.js + Node.js + TypeScript |
| 資料庫 | Supabase (PostgreSQL) + 記憶體備援 |
| 驗證 | Zod |
| 即時推送 | WebSocket (ws) |
| 監控 | Python (monitoring_engine.py) |
| Telegram Bot | Python (ollama_bot2.py) |
| 工作流 | n8n (Zeabur) |
| CI/CD | GitHub Actions → Vercel |
| 部署 | Vercel / Railway / Docker |

---

## 四、資料庫結構（Supabase 12 張表）

| 表名 | 用途 |
|------|------|
| `openclaw_tasks` | 任務主表 |
| `openclaw_runs` | 執行記錄 |
| `openclaw_reviews` | 審核項目 |
| `openclaw_automations` | 自動化鏈 |
| `openclaw_projects` | 專案管理 |
| `openclaw_project_phases` | 專案階段/里程碑 |
| `openclaw_evolution_log` | 演化日誌（最近 100 筆） |
| `openclaw_audit_logs` | 審計軌跡 |
| `openclaw_sessions` | Agent 協作 session |
| `openclaw_commands` | 命令記錄 |
| `openclaw_interrupts` | 人機中斷請求 |
| `openclaw_ui_actions` | UI 按鈕映射 |

---

*此報告由 L2 Claude Code 自動產出，老蔡決定何時派工。*
