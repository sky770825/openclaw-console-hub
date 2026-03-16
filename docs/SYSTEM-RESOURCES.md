# OpenClaw 系統資源總覽

> NEUXA 用：所有可用的系統資源、API、資料庫、服務

---

## Supabase 資料庫

專案 ID: vbejswywswaeyfasnwjq
URL: 環境變數 SUPABASE_URL
Key: 環境變數 SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY

### 資料表

| 表名 | 用途 |
|------|------|
| openclaw_tasks | 任務板（status: queued/in_progress/done） |
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

### 常用查詢

查任務：SELECT  FROM openclaw_tasks WHERE status = 'queued' ORDER BY created_at
查記憶：SELECT  FROM openclaw_memory ORDER BY created_at DESC LIMIT 10
查執行：SELECT * FROM openclaw_runs WHERE status = 'error' ORDER BY created_at DESC

---

## n8n 自動化

n8n URL: https://andy825lay.zeabur.app
API: 環境變數 N8N_API_URL / N8N_API_KEY
Webhook: 環境變數 N8N_WEBHOOK_URL

### 後端 API

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/n8n/health | 檢查 n8n 連線 |
| GET | /api/n8n/workflows | 工作流列表 |
| POST | /api/n8n/trigger-webhook | 觸發 Webhook |

### 工作流設計

1. 排程執行任務 — Schedule Trigger 每 5 分鐘 → POST /api/openclaw/auto-executor/start
2. Telegram 指令 — Webhook 接收 → 處理指令 → 回覆
3. 任務完成通知 — 任務 done → Telegram 通知老蔡

---

## OpenClaw Server API

Base URL: http://localhost:3011
API Key: 環境變數 VITE_OPENCLAW_API_KEY

### 核心端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/health | 系統健康 |
| GET | /api/openclaw/tasks | 任務列表 |
| POST | /api/openclaw/tasks | 建立任務 |
| GET | /api/openclaw/auto-executor/status | AutoExecutor 狀態 |
| POST | /api/openclaw/auto-executor/start | 啟動 AutoExecutor 輪詢 |
| POST | /api/openclaw/auto-executor/stop | 停止 AutoExecutor 輪詢 |
| GET | /api/federation/status | FADP 聯盟狀態 |
| POST | /api/openclaw/deputy/on | 開啟副手模式 |

---

## 部署資訊

| 服務 | 平台 | 狀態 |
|------|------|------|
| OpenClaw Server | 本地 localhost:3011 | 運行中 |
| n8n | Zeabur (andy825lay.zeabur.app) | 運行中 |
| Supabase | Supabase Cloud | 運行中 |
| 前端 | Express 靜態服務 dist/ | 運行中 |

---

## 檔案位置

| 用途 | 路徑 |
|------|------|
| Server 原始碼 | /Users/caijunchang/openclaw任務面版設計/server/src/ |
| 前端原始碼 | /Users/caijunchang/openclaw任務面版設計/src/ |
| Supabase DDL | /Users/caijunchang/openclaw任務面版設計/docs/supabase-openclaw-migration.sql |
| n8n 工作流設計 | /Users/caijunchang/openclaw任務面版設計/docs/N8N-WORKFLOW-DESIGN.md |
| n8n 串接文件 | /Users/caijunchang/openclaw任務面版設計/docs/N8N-INTEGRATION.md |
| cookbook 實戰手冊 | /Users/caijunchang/openclaw任務面版設計/cookbook/ (12本) |
| knowledge 知識庫 | /Users/caijunchang/openclaw任務面版設計/knowledge/ |
| docs 操作文件 | /Users/caijunchang/openclaw任務面版設計/docs/ |
| .env 環境變數 | /Users/caijunchang/openclaw任務面版設計/server/.env |
