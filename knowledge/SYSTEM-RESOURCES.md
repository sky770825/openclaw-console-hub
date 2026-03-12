# OpenClaw 系統資源總覽

> NEUXA 用：所有可用的系統資源、API、資料庫、服務
> 更新：2026-03-02 | Server v2.4.1 | NEUXA v6.2

---

## Supabase 資料庫

專案 ID: vbejswywswaeyfasnwjq
URL: 環境變數 SUPABASE_URL
Key: 環境變數 SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
查詢方式：用 query_supabase action（Key 不出門，Server 內部處理）

### 資料表

| 表名 | 用途 |
|------|------|
| openclaw_tasks | 任務板（status: queued/ready/in_progress/done/failed） |
| openclaw_runs | 執行記錄 |
| openclaw_reviews | 審核/想法 |
| openclaw_automations | 自動化規則（cron + chain） |
| openclaw_evolution_log | 演化記錄 |
| openclaw_memory | AI 記憶庫 |
| openclaw_projects | 專案管理 |
| openclaw_project_phases | 專案階段 |
| openclaw_audit_logs | 稽核日誌 |
| xiaocai_ideas | 小蔡發想 |
| fadp_members | FADP 聯盟成員 |
| fadp_attack_events | 攻擊事件 |
| fadp_blocklist | 封鎖名單 |

> schedules/shifts/attendance/employees 在loc_yangmeibiz_food_truck的 Supabase 實例，不在這裡。查法見 cookbook/23。

### 查詢方式（用 action，不用 SQL）
```json
{"action":"query_supabase","table":"openclaw_tasks","select":"*","filters":[{"column":"status","op":"eq","value":"ready"}],"limit":10}
```

---

## n8n 自動化

本地：http://localhost:5678
雲端：https://andy825lay.zeabur.app
API Key：環境變數 N8N_API_KEY

### 透過 Server 代理

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/n8n/health | 檢查 n8n 連線 |
| GET | /api/n8n/workflows | 工作流列表 |
| POST | /api/n8n/trigger-webhook | 觸發 Webhook |

---

## OpenClaw Server API

Base URL: http://localhost:3011
API Key: 環境變數 OPENCLAW_API_KEY
認證方式: Header `Authorization: Bearer <key>`

### 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/health | 系統健康 |
| GET | /api/openclaw/tasks | 任務列表 |
| POST | /api/openclaw/tasks?allowStub=1 | 建立任務 |
| PATCH | /api/openclaw/tasks/:id | 更新任務 |
| DELETE | /api/openclaw/tasks/:id | 刪除任務 |
| GET | /api/openclaw/auto-executor/status | AutoExecutor 狀態 |
| POST | /api/openclaw/auto-executor/start | 啟動 AutoExecutor |
| POST | /api/openclaw/auto-executor/stop | 停止 AutoExecutor |
| GET | /api/federation/status | FADP 聯盟狀態 |
| POST | /api/proxy/fetch | 安全 API 代理（Key 自動注入） |
| POST | /api/proxy/supabase | Supabase 查詢代理 |
| GET | /api/proxy/supabase/tables | 可查詢的表清單 |

---

## 部署資訊

| 服務 | 位置 | Port | 狀態 |
|------|------|------|------|
| OpenClaw Server | 本地 launchd | 3011 | KeepAlive 自動重啟 |
| n8n | 本地 + Zeabur | 5678 | 運行中 |
| Ollama | 本地 | 11434 | **已停用**（全走雲端 API） |
| Supabase | Cloud | - | 運行中 |
| 前端 | Express 靜態服務 dist/ | 3011 | 合併在 Server |

### AutoExecutor 並發設定

- **並發槽位**：2（同時執行 2 個任務）
- **排序策略**：Fast Lane（優先級高 + 等待時間長的先跑）
- **限速**：maxTasksPerMinute = 3

---

## 檔案位置

| 用途 | 路徑 |
|------|------|
| Server 原始碼 | /Users/caijunchang/openclaw任務面版設計/server/src/ |
| Telegram 模組 | /Users/caijunchang/openclaw任務面版設計/server/src/telegram/ |
| 前端原始碼 | /Users/caijunchang/openclaw任務面版設計/src/ |
| cookbook 手冊（29本）| ~/.openclaw/workspace/cookbook/ |
| knowledge 知識庫 | /Users/caijunchang/openclaw任務面版設計/knowledge/ |
| docs 文件 | /Users/caijunchang/openclaw任務面版設計/docs/ |
| 腳本庫 | /Users/caijunchang/openclaw任務面版設計/scripts/ |
| .env 環境變數 | /Users/caijunchang/openclaw任務面版設計/server/.env（禁止讀取）|
