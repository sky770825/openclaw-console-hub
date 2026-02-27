# 01 — API 端點完整手冊

> 所有 OpenClaw Server API 的路由、參數、回傳格式
> 基礎：http://localhost:3011 + Bearer Token

---

## 認證

所有 `/api/*` 端點（除了 `/api/health`）都需要：
```
Authorization: Bearer oc-oAw9leGU04IAbcS4WN3FC1SH3vq5OdPxrVJCR16iIUMPsep1
```

以下範例中的 `$TOKEN` 代表上面那串。

---

## 一、任務板（最常用）

### GET /api/openclaw/tasks — 取所有任務
```bash
curl -s http://localhost:3011/api/openclaw/tasks -H "Authorization: Bearer $TOKEN"
```
回傳：Task[] 陣列，按 updated_at 降序

### POST /api/openclaw/tasks?allowStub=1 — 建新任務
```bash
curl -X POST "http://localhost:3011/api/openclaw/tasks?allowStub=1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "任務名稱",
    "cat": "feature",
    "status": "ready",
    "auto": true,
    "thought": "任務描述"
  }'
```
**cat 可填**：`feature`、`bugfix`、`learn`、`improve`
**status 可填**：`queued`（排隊）、`ready`（auto-executor 撿）、`in_progress`、`done`

### PATCH /api/openclaw/tasks/:id — 更新任務
```bash
curl -X PATCH "http://localhost:3011/api/openclaw/tasks/TASK_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status": "done", "result": "完成了", "progress": 100}'
```

### DELETE /api/openclaw/tasks/:id — 刪除任務
```bash
curl -X DELETE "http://localhost:3011/api/openclaw/tasks/TASK_ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 二、執行記錄

### GET /api/openclaw/runs — 查執行記錄
```bash
# 最近 20 筆
curl -s "http://localhost:3011/api/openclaw/runs?limit=20" -H "Authorization: Bearer $TOKEN"

# 查某任務的記錄
curl -s "http://localhost:3011/api/openclaw/runs?taskId=TASK_ID" -H "Authorization: Bearer $TOKEN"
```

### GET /api/openclaw/runs/:id — 查單筆執行
```bash
curl -s "http://localhost:3011/api/openclaw/runs/RUN_ID" -H "Authorization: Bearer $TOKEN"
```

---

## 三、審核/想法

### GET /api/openclaw/reviews — 查所有審核
```bash
curl -s http://localhost:3011/api/openclaw/reviews -H "Authorization: Bearer $TOKEN"
```

### POST /api/openclaw/reviews — 建新審核
```bash
curl -X POST http://localhost:3011/api/openclaw/reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "建議標題",
    "type": "feature",
    "desc": "說明",
    "src": "NEUXA",
    "pri": "medium",
    "status": "pending"
  }'
```
**type 可填**：`tool`、`issue`、`skill`、`learn`、`feature`
**pri 可填**：`low`、`medium`、`high`、`critical`

### PATCH /api/openclaw/reviews/:id — 更新審核
```bash
curl -X PATCH "http://localhost:3011/api/openclaw/reviews/REVIEW_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status": "approved", "reasoning": "核准原因"}'
```

### DELETE /api/openclaw/reviews/:id — 刪除審核
```bash
curl -X DELETE "http://localhost:3011/api/openclaw/reviews/REVIEW_ID" -H "Authorization: Bearer $TOKEN"
```

---

## 四、記憶庫

### GET /api/openclaw/memory — 查記憶
```bash
# 查最近 20 筆
curl -s "http://localhost:3011/api/openclaw/memory?limit=20" -H "Authorization: Bearer $TOKEN"

# 按類型篩選
curl -s "http://localhost:3011/api/openclaw/memory?type=pattern&limit=10" -H "Authorization: Bearer $TOKEN"

# 按來源篩選
curl -s "http://localhost:3011/api/openclaw/memory?source=neuxa" -H "Authorization: Bearer $TOKEN"
```

### GET /api/openclaw/memory/search — 搜尋記憶
```bash
curl -s "http://localhost:3011/api/openclaw/memory/search?q=安全掃描" -H "Authorization: Bearer $TOKEN"
```

### POST /api/openclaw/memory — 存記憶
```bash
curl -X POST http://localhost:3011/api/openclaw/memory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "id": "mem-unique-id",
    "type": "insight",
    "source": "neuxa",
    "title": "記憶標題",
    "content": "記憶內容",
    "tags": ["tag1", "tag2"],
    "importance": 7
  }'
```
**type 可填**：`note`、`pattern`、`insight`、`decision`、`error`
**importance**：1-10（10 最重要）

### POST /api/openclaw/memory/batch — 批次存記憶
```bash
curl -X POST http://localhost:3011/api/openclaw/memory/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"memories": [{"id":"m1","type":"note","source":"neuxa","title":"標題","content":"內容"}]}'
```

### DELETE /api/openclaw/memory/:id — 刪記憶
```bash
curl -X DELETE "http://localhost:3011/api/openclaw/memory/MEM_ID" -H "Authorization: Bearer $TOKEN"
```

---

## 五、Auto-Executor

### GET /api/openclaw/auto-executor/status — 查狀態
```bash
curl -s http://localhost:3011/api/openclaw/auto-executor/status -H "Authorization: Bearer $TOKEN"
```
回傳：`{ isRunning, pollIntervalMs, maxTasksPerMinute, lastPollAt, dispatchMode, recentExecutions }`

### POST /api/openclaw/auto-executor/start — 啟動
```bash
curl -X POST http://localhost:3011/api/openclaw/auto-executor/start -H "Authorization: Bearer $TOKEN"
```

### POST /api/openclaw/auto-executor/stop — 停止
```bash
curl -X POST http://localhost:3011/api/openclaw/auto-executor/stop -H "Authorization: Bearer $TOKEN"
```

### POST /api/openclaw/dispatch/toggle — 切換 dispatch 模式
```bash
curl -X POST http://localhost:3011/api/openclaw/dispatch/toggle \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"enabled": true}'
```

---

## 六、FADP 聯盟

### GET /api/federation/status — 聯盟狀態
```bash
curl -s http://localhost:3011/api/federation/status -H "Authorization: Bearer $TOKEN"
```

### GET /api/federation/members — 成員列表
```bash
curl -s http://localhost:3011/api/federation/members -H "Authorization: Bearer $TOKEN"
```

### POST /api/federation/handshake/init — 發起握手
```bash
curl -X POST http://localhost:3011/api/federation/handshake/init \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"endpointUrl": "https://partner.example.com", "label": "夥伴名稱"}'
```

### POST /api/federation/attack/broadcast — 廣播攻擊事件
```bash
curl -X POST http://localhost:3011/api/federation/attack/broadcast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "attackType": "task_injection",
    "severity": "high",
    "description": "偵測到可疑任務注入",
    "ttl": 3
  }'
```

### GET /api/federation/blocklist — 封鎖名單
```bash
curl -s http://localhost:3011/api/federation/blocklist -H "Authorization: Bearer $TOKEN"
```

---

## 七、專案管理

### GET /api/openclaw/projects — 查所有專案
```bash
curl -s http://localhost:3011/api/openclaw/projects -H "Authorization: Bearer $TOKEN"
```

### POST /api/openclaw/projects — 建新專案
```bash
curl -X POST http://localhost:3011/api/openclaw/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "id": "proj-aegis",
    "title": "神盾掃描器 v0.2",
    "description": "完善 aegis scanner",
    "status": "in_progress",
    "progress": 60,
    "phases": [
      {"id":"ph1","name":"規則擴充","done":true},
      {"id":"ph2","name":"CLI 參數","done":false}
    ]
  }'
```

---

## 八、系統/雜項

### GET /api/health — 健康檢查（不用認證）
```bash
curl -s http://localhost:3011/api/health
```

### GET /api/stats — 系統統計
```bash
curl -s http://localhost:3011/api/stats -H "Authorization: Bearer $TOKEN"
```

### GET /api/security/status — 安全狀態
```bash
curl -s http://localhost:3011/api/security/status -H "Authorization: Bearer $TOKEN"
```

### GET /api/openclaw/automations — 自動化規則
```bash
curl -s http://localhost:3011/api/openclaw/automations -H "Authorization: Bearer $TOKEN"
```

### GET /api/openclaw/evolution-log — 演化記錄
```bash
curl -s http://localhost:3011/api/openclaw/evolution-log -H "Authorization: Bearer $TOKEN"
```

### GET /api/openclaw/audit-logs — 稽核日誌
```bash
curl -s http://localhost:3011/api/openclaw/audit-logs -H "Authorization: Bearer $TOKEN"
```

---

## 九、Insights（洞察）

### GET /api/openclaw/insights — 查洞察
```bash
curl -s http://localhost:3011/api/openclaw/insights -H "Authorization: Bearer $TOKEN"
```

### POST /api/openclaw/insights — 新增洞察
```bash
curl -X POST http://localhost:3011/api/openclaw/insights \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title": "觀察標題", "content": "觀察內容", "type": "pattern"}'
```

---

## 十、n8n 工作流

### GET /api/n8n/health — n8n 健康檢查
```bash
curl -s http://localhost:3011/api/n8n/health -H "Authorization: Bearer $TOKEN"
```

### GET /api/n8n/workflows — 查 n8n 工作流
```bash
curl -s http://localhost:3011/api/n8n/workflows -H "Authorization: Bearer $TOKEN"
```

---

**找不到？Ctrl+F 搜關鍵字。**
