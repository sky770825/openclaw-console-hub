# SOP-11: n8n 運維流程

## metadata

```yaml
id: sop-11
name: n8n 運維流程
category: 運維
tags: [n8n, webhook, workflow, docker, telegram, 通知, 修復, 重啟, CR-4]
version: 1.0
created: 2026-02-16
trigger: n8n 掛了、webhook 沒回應、通知沒收到、要改 workflow
priority: P1
燈號: 🟢 檢查狀態 / 🟡 重啟服務 / 🔴 改密碼或刪 workflow
related_cr: CR-4
```

---

## 服務架構

```
n8n (localhost:5678)
  ├── postgres (pgvector:pg16) — n8n 內部資料庫
  ├── redis — 快取
  └── qdrant (localhost:6333) — 向量庫

OpenClaw → webhook → n8n → Telegram Bot → 主人手機
```

### 關鍵連接點

| 服務 | URL | 說明 |
|------|-----|------|
| n8n 管理面板 | `http://localhost:5678` | 登入改 workflow |
| n8n webhook 入口 | `http://localhost:5678/webhook/openclaw-memory` | OpenClaw 打這個 |
| 任務板 API（n8n 視角） | `http://host.docker.internal:3011` | n8n 去讀任務板 |
| Qdrant | `http://localhost:6333` | 向量搜尋 |

---

## 登入資訊

| 項目 | 值 | 設定檔位置 |
|------|-----|-----------|
| n8n 帳號 | `admin` | `~/.openclaw/secrets/n8n-production.env` |
| n8n 密碼 | 見 `N8N_BASIC_AUTH_PASSWORD` | `~/.openclaw/secrets/n8n-production.env` |
| n8n 備用密碼 | 見 `N8N_PASSWORD` | `~/n8n-production/.env` |
| Postgres 帳號 | `n8n` | `~/.openclaw/secrets/n8n-production.env` |
| Postgres 密碼 | 見 `POSTGRES_PASSWORD` | `~/.openclaw/secrets/n8n-production.env` |
| Telegram Bot Token | 見 `TELEGRAM_BOT_TOKEN` | `~/.openclaw/secrets/n8n-telegram.env` |
| Telegram Chat ID | `5819565005` | `~/.openclaw/secrets/n8n-telegram.env` |

**查看密碼命令：**
```bash
cat ~/.openclaw/secrets/n8n-production.env
cat ~/n8n-production/.env
cat ~/.openclaw/secrets/n8n-telegram.env
```

---

## 日常檢查

### 快速健康檢查

```bash
# 1. Docker 容器狀態
docker ps --filter "name=n8n" --format "table {{.Names}}\t{{.Status}}"

# 2. n8n API 回應
curl -s http://localhost:5678/healthz

# 3. webhook 測試
curl -s -X POST http://localhost:5678/webhook/openclaw-memory \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# 4. Telegram 通知測試
curl -s "https://api.telegram.org/bot$(cat ~/.openclaw/secrets/n8n-telegram.env | grep TELEGRAM_BOT_TOKEN | cut -d= -f2)/sendMessage" \
  -d "chat_id=5819565005&text=🔔 n8n 測試通知"
```

---

## 故障修復流程

### 情況 1: n8n 容器沒跑

```bash
# 檢查
docker ps -a --filter "name=n8n"

# 重啟（🟡 先跟主人說）
cd ~/n8n-production && docker compose up -d

# 確認
docker ps --filter "name=n8n"
curl -s http://localhost:5678/healthz
```

### 情況 2: webhook 沒回應（CR-4）

```bash
# 1. 確認 n8n 在跑
curl -s http://localhost:5678/healthz

# 2. 確認 workflow 是 active
# 登入 http://localhost:5678 → Workflows → 確認 webhook workflow 是開啟的

# 3. 測試 webhook
curl -v -X POST http://localhost:5678/webhook/openclaw-memory \
  -H "Content-Type: application/json" \
  -d '{"source": "test", "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'

# 4. 看 n8n 日誌
docker logs n8n-production-n8n-1 --tail 50
```

### 情況 3: Telegram 通知沒收到

```bash
# 1. 測試 bot 是否活著
curl -s "https://api.telegram.org/bot$(cat ~/.openclaw/secrets/n8n-telegram.env | grep TELEGRAM_BOT_TOKEN | cut -d= -f2)/getMe"

# 2. 直接發一則測試訊息
curl -s "https://api.telegram.org/bot$(cat ~/.openclaw/secrets/n8n-telegram.env | grep TELEGRAM_BOT_TOKEN | cut -d= -f2)/sendMessage" \
  -d "chat_id=5819565005&text=🔔 手動測試"

# 3. 如果 bot 沒回應 → Bot Token 可能過期 → 回報主人
```

### 情況 4: Postgres / Redis 掛了

```bash
# 檢查
docker ps --filter "name=n8n-production"

# 重啟整個 stack（🟡）
cd ~/n8n-production && docker compose restart

# 或只重啟特定服務
docker restart n8n-production-postgres-1
docker restart n8n-production-redis-1
```

---

## Workflow 檔案位置

| Workflow | 檔案 | 用途 |
|----------|------|------|
| AI Memory Agent | `n8n-workflows/openclaw-memory-agent.json` | RAG 記憶檢索 |
| Daily Wrap-up | `n8n-workflows/Daily-Wrap-up.no-llm.json` | 每日任務摘要 |
| Webhook→Telegram | `n8n-workflows/mvp-webhook-telegram.json` | 任務完成通知 |
| System Events | `n8n-workflows/system-event-notify.json` | 系統事件通知 |
| Control Panel | `n8n-workflows/dar-control-panel.json` | 控制面板 |

### 匯入 workflow

```bash
# 透過 n8n CLI
n8n import:workflow --input=n8n-workflows/{filename}.json

# 或登入 http://localhost:5678 → Settings → Import
```

---

## 回報格式

```
🔧 n8n 狀態報告

容器：{🟢 運行中 / 🔴 停止}
API：{🟢 回應正常 / 🔴 無回應}
Webhook：{🟢 正常 / 🔴 無回應}
Telegram：{🟢 可發送 / 🔴 失敗}
Active Workflows：{X} 個

問題：
- {問題描述}
已執行：
- {修復動作}
```

---

## 錯誤處理

| 狀況 | 處理方式 |
|------|----------|
| 所有容器都掛了 | `cd ~/n8n-production && docker compose up -d` 🟡 |
| n8n 啟動後馬上掛 | 看 `docker logs`，可能是 port 衝突或 DB 問題 |
| webhook URL 變了 | 檢查 n8n 設定，更新 `openclaw-n8n-bridge.json` |
| workflow 被停用 | 登入 n8n 面板重新啟用 |
| Telegram bot 被 block | 主人要在 Telegram 重新 /start bot |
