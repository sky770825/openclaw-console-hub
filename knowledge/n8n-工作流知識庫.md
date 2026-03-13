# n8n 工作流知識庫 — OpenClaw 整合手冊

> 更新日期：2026-03-01
> n8n URL：http://localhost:5678（本地）
> 所有 workflow JSON 存放於：`~/.openclaw/workspace/n8n-workflows/`

---

## 一、已部署的工作流清單

| # | 工作流名稱 | 檔案 | 觸發方式 | 功能 |
|---|-----------|------|---------|------|
| 1 | CR-9 解鎖 Telegram 通知 | cr9-unlock-telegram.json | Webhook POST | 當 CR-9 解鎖事件發生時，發送 Telegram 通知 |
| 2 | 達爾控制面板 | dar-control-panel.json | Webhook POST | 達爾的集中控制中心，管理任務分派、狀態查詢、系統控制 |
| 3 | 記憶代理人 | openclaw-memory-agent.json | Webhook POST | 自動記憶管理 — 儲存、檢索、更新知識到記憶庫 |
| 4 | MVP Webhook Telegram | mvp-webhook-telegram.json | Webhook POST | 最基礎的 webhook → Telegram 轉發 |
| 5 | 系統事件通知 | system-event-notify.json | Webhook POST | 系統事件（任務完成、錯誤、警報）→ Telegram 通知 |
| 6 | OpenClaw → Notion 時間線 | openclaw-to-notion.json | Webhook POST | 將 OpenClaw 事件同步到 Notion 時間線 |
| 7 | 每日收工報告 | Daily-Wrap-up.no-llm.json | Cron 定時 | 每日自動生成收工報告（無 LLM 版） |

---

## 二、Webhook API 端點

### 2.1 任務完成通知（最常用）

```bash
# 通知主人任務已完成
curl -X POST http://localhost:3011/api/n8n/webhook/task-done \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer oc-oAw9leGU04IAbcS4WN3FC1SH3vq5OdPxrVJCR16iIUMPsep1" \
  -d '{"taskName":"任務名稱","status":"done","note":"備註"}'
```

### 2.2 系統事件通知

```bash
# 發送系統事件
curl -X POST http://localhost:3011/api/n8n/webhook/system-event \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer oc-oAw9leGU04IAbcS4WN3FC1SH3vq5OdPxrVJCR16iIUMPsep1" \
  -d '{"event":"error","source":"auto-executor","message":"任務執行失敗","severity":"high"}'
```

### 2.3 CR-9 解鎖通知

```bash
# CR-9 解鎖事件
curl -X POST http://localhost:3011/api/n8n/webhook/cr9-unlock \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer oc-oAw9leGU04IAbcS4WN3FC1SH3vq5OdPxrVJCR16iIUMPsep1" \
  -d '{"unlockCode":"xxx","operator":"達爾","timestamp":"2026-03-01T12:00:00Z"}'
```

### 2.4 記憶代理人

```bash
# 存入新記憶
curl -X POST http://localhost:3011/api/n8n/webhook/memory-agent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer oc-oAw9leGU04IAbcS4WN3FC1SH3vq5OdPxrVJCR16iIUMPsep1" \
  -d '{"action":"store","key":"重要資訊","content":"要記住的內容"}'
```

---

## 三、n8n 與 OpenClaw 整合架構

```
NEUXA (Telegram Bot)
    ↓ action: proxy_fetch / run_script
OpenClaw Server (port 3011)
    ↓ /api/n8n/webhook/*
n8n (port 5678)
    ↓ workflow 執行
Telegram / Notion / 其他服務
```

### 整合方式
1. **Server 代理**：所有 n8n webhook 呼叫都經過 OpenClaw Server 的 `/api/n8n/` 路由代理
2. **認證**：使用 OpenClaw API Key（Bearer token）認證
3. **Telegram**：透過 n8n 的 Telegram node 發送訊息給主人

---

## 四、操作指南

### 4.1 查詢所有 workflow

```bash
curl -s http://localhost:3011/api/n8n/workflows \
  -H "Authorization: Bearer oc-oAw9leGU04IAbcS4WN3FC1SH3vq5OdPxrVJCR16iIUMPsep1" | python3 -c "
import json,sys; d=json.load(sys.stdin)
for w in d.get('workflows', []): print(w['id'], w['active'], w['name'])
"
```

### 4.2 啟用/停用 workflow

```bash
# 啟用
curl -X PATCH http://localhost:3011/api/n8n/workflows/{id}/activate \
  -H "Authorization: Bearer oc-oAw9leGU04IAbcS4WN3FC1SH3vq5OdPxrVJCR16iIUMPsep1"

# 停用
curl -X PATCH http://localhost:3011/api/n8n/workflows/{id}/deactivate \
  -H "Authorization: Bearer oc-oAw9leGU04IAbcS4WN3FC1SH3vq5OdPxrVJCR16iIUMPsep1"
```

### 4.3 通知主人的標準流程（一行搞定）

```bash
bash /Users/sky770825/openclaw任務面版設計/scripts/notify-laocai.sh "任務名稱" "done" "備註"
```

這個腳本會同時：
- 推送 Telegram 通知給主人
- 觸發 n8n 後續流程（如果配置了的話）

---

## 五、故障排查

### 5.1 n8n 無法連線

```bash
# 檢查 n8n 是否在運行
docker ps | grep n8n
# 或
curl -s http://localhost:5678/healthz
```

### 5.2 Webhook 回傳 401

- 檢查 Authorization header 是否正確
- 確認 API Key 值：`oc-oAw9leGU04IAbcS4WN3FC1SH3vq5OdPxrVJCR16iIUMPsep1`

### 5.3 Workflow 不觸發

1. 確認 workflow 是 active 狀態
2. 確認 webhook path 正確
3. 查看 n8n 執行紀錄：http://localhost:5678/executions
4. 查看 OpenClaw server log：`tail -100 ~/.openclaw/automation/logs/taskboard.log`

### 5.4 Telegram 訊息發不出去

1. 檢查 Telegram Bot Token 是否有效
2. 確認 bot 是否已加入群組
3. 檢查 n8n Telegram node 的設定

---

## 六、新增 Workflow 的步驟

1. 在 n8n UI（http://localhost:5678）建立 workflow
2. 匯出 JSON 存到 `~/.openclaw/workspace/n8n-workflows/`
3. 如需 webhook，在 OpenClaw Server 的 n8n 路由加入代理
4. 更新本文件的「已部署工作流清單」
5. 重建向量索引：`python3 scripts/vectorize-knowledge.py --rebuild`
