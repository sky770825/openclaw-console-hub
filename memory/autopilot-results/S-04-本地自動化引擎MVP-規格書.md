# S-04: 本地自動化引擎 MVP - 技術規格書

**完成時間**: 2026-02-13 09:16 GMT+8  
**Agent**: Autopilot  
**優先級**: P1  

---

## 1. 技術架構

### 1.1 整體設計
```
┌─────────────────────────────────────────────┐
│   Local-First Automation Engine             │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │   Scheduler & Trigger Engine          │ │
│  │   (Cron + Webhook)                    │ │
│  └───────────────────────────────────────┘ │
│           ▲                ▲                │
│           │                │                │
│    ┌──────┴──┐      ┌──────┴──────┐       │
│    │  Cron   │      │  Webhook    │       │
│    │ Engine  │      │  Listener   │       │
│    └─────────┘      └─────────────┘       │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │   Task Executor                       │ │
│  │   (Skill invocation)                  │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │   Management UI                       │ │
│  │   (Web Dashboard)                     │ │
│  └───────────────────────────────────────┘ │
│                                             │
└─────────────────────────────────────────────┘
```

### 1.2 核心模組
1. **Cron 排程引擎**
   - 支援標準 cron 表達式
   - 時區感知
   - 並發控制

2. **Webhook 監聽器**
   - HTTP 接收器
   - 簽名驗證
   - 速率限制

3. **任務執行器**
   - Skill 調用
   - 錯誤處理與重試
   - 執行日誌

4. **管理介面**
   - Web Dashboard
   - REST API
   - 配置管理

---

## 2. Docker 部署配置

### 2.1 Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# 安裝依賴
COPY package*.json ./
RUN npm ci --only=production

# 複製應用
COPY . .

# 建立必要目錄
RUN mkdir -p /app/data /app/logs /app/config

# 開放端口
EXPOSE 3011

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3011/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# 啟動
CMD ["node", "index.js"]
```

### 2.2 Docker Compose

```yaml
version: '3.8'

services:
  automation-engine:
    build: .
    container_name: automation-engine
    ports:
      - "3011:3011"
    environment:
      NODE_ENV: production
      LOG_LEVEL: info
      CRON_TIMEZONE: Asia/Taipei
      WEBHOOK_SECRET: ${WEBHOOK_SECRET}
      DB_CONNECTION: sqlite:///app/data/engine.db
      ENABLE_DASHBOARD: true
      DASHBOARD_PORT: 3011
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
    volumes:
      - ./config:/app/config
      - ./data:/app/data
      - ./logs:/app/logs
      - /var/run/docker.sock:/var/run/docker.sock  # 用於 Skill 容器
    networks:
      - openclaw
    restart: unless-stopped
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    container_name: automation-redis
    ports:
      - "6379:6379"
    networks:
      - openclaw
    volumes:
      - redis-data:/data
    restart: unless-stopped

networks:
  openclaw:
    driver: bridge

volumes:
  redis-data:
```

### 2.3 一鍵啟動腳本

```bash
#!/bin/bash
# scripts/start.sh

set -e

echo "🚀 Starting Automation Engine..."

# 檢查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi

# 檢查 Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose first."
    exit 1
fi

# 複製配置範本
if [ ! -f .env ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your settings"
fi

# 建立目錄
mkdir -p config data logs

# 啟動服務
echo "🔧 Starting Docker Compose..."
docker-compose up -d

# 等待服務就緒
echo "⏳ Waiting for services to be ready..."
sleep 5

# 檢查健康狀態
if curl -f http://localhost:3011/health > /dev/null 2>&1; then
    echo "✅ Automation Engine is running at http://localhost:3011"
    echo "📊 Dashboard: http://localhost:3011/dashboard"
else
    echo "⚠️  Automation Engine is starting, please wait..."
    echo "Check logs: docker-compose logs -f automation-engine"
fi
```

---

## 3. API 定義

### 3.1 排程 API

```javascript
// 創建 cron 任務
POST /api/schedules
{
  "name": "Daily Report",
  "description": "Generate daily report",
  "enabled": true,
  "cron": "0 9 * * *",  // 每天 09:00
  "timezone": "Asia/Taipei",
  "skill": "report-generator",
  "params": {
    "format": "pdf",
    "recipients": ["admin@example.com"]
  },
  "maxRetries": 3,
  "retryDelay": 300000,  // 5 minutes
  "timeout": 600000      // 10 minutes
}

// 獲取所有任務
GET /api/schedules
GET /api/schedules?enabled=true
GET /api/schedules?skill=report-generator

// 獲取特定任務
GET /api/schedules/{id}

// 更新任務
PATCH /api/schedules/{id}
{
  "cron": "0 10 * * *"  // 改為 10:00
}

// 刪除任務
DELETE /api/schedules/{id}

// 立即執行任務
POST /api/schedules/{id}/run

// 禁用/啟用任務
PATCH /api/schedules/{id}
{
  "enabled": false
}

// 查看執行歷史
GET /api/schedules/{id}/history?limit=50
GET /api/schedules/{id}/history?status=failed
```

### 3.2 Webhook API

```javascript
// 註冊 webhook
POST /api/webhooks
{
  "name": "Line Order Event",
  "description": "Handle incoming orders from LINE",
  "enabled": true,
  "events": ["order.created", "order.updated"],
  "skill": "order-processor",
  "secret": "webhook_secret_xxx",
  "url": "https://example.com/webhooks/line-orders"
}

// 查看 webhook 列表
GET /api/webhooks

// 獲取 webhook 詳情
GET /api/webhooks/{id}

// 更新 webhook
PATCH /api/webhooks/{id}

// 刪除 webhook
DELETE /api/webhooks/{id}

// 測試 webhook
POST /api/webhooks/{id}/test

// 查看接收歷史
GET /api/webhooks/{id}/deliveries?limit=50
```

### 3.3 Webhook 接收端點

```javascript
// 外部系統發送事件
POST /webhooks/{webhookId}
{
  "event": "order.created",
  "data": {
    "orderId": "ORD-2026-0213-001",
    "customerId": "CUST-001",
    "amount": 1500,
    "items": [...]
  },
  "timestamp": "2026-02-13T09:00:00Z",
  "signature": "sha256=xxx"  // HMAC-SHA256 簽名
}

// 回應
{
  "success": true,
  "taskId": "TASK-2026-0213-001",
  "status": "processing"
}
```

### 3.4 執行結果 API

```javascript
// 查看任務執行結果
GET /api/executions/{executionId}

// 列出執行列表
GET /api/executions?status=completed
GET /api/executions?skill=report-generator
GET /api/executions?dateRange=2026-02-01,2026-02-13

// 執行結果格式
{
  "id": "EXEC-001",
  "scheduleId": "SCHED-001",
  "skillName": "report-generator",
  "status": "completed",
  "startTime": "2026-02-13T09:00:00Z",
  "endTime": "2026-02-13T09:05:23Z",
  "duration": 323000,
  "result": {
    "reportUrl": "s3://reports/daily-2026-02-13.pdf",
    "pageCount": 42
  },
  "logs": [
    "INFO: Starting report generation",
    "INFO: Gathering data from 3 sources",
    "INFO: Report generated successfully"
  ],
  "error": null,
  "retryCount": 0
}
```

---

## 4. 實現細節

### 4.1 Skill 結構

```
automation-engine-skill/
├── SKILL.md
├── index.js
├── server.js               # Express 服務器
├── lib/
│   ├── scheduler/
│   │   ├── cron-engine.js
│   │   ├── trigger.js
│   │   └── queue.js
│   ├── executor/
│   │   ├── skill-executor.js
│   │   ├── retry-handler.js
│   │   └── result-manager.js
│   ├── webhook/
│   │   ├── listener.js
│   │   ├── verifier.js
│   │   └── router.js
│   ├── storage/
│   │   ├── database.js
│   │   └── file-system.js
│   ├── dashboard/
│   │   ├── web-ui.js
│   │   └── static/
│   └── utils/
│       ├── logger.js
│       └── metrics.js
├── config/
│   ├── schedules.json
│   └── webhooks.json
├── docker-compose.yml
├── .env.example
├── scripts/
│   └── start.sh
├── tests/
│   └── integration/
└── package.json
```

### 4.2 Cron 引擎實現

```javascript
// lib/scheduler/cron-engine.js
const cron = require('node-cron');
const EventEmitter = require('events');

class CronEngine extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.tasks = new Map();
    this.logger = require('../utils/logger');
  }

  addTask(schedule) {
    const { id, cron: cronExpr, timezone, skill, params } = schedule;

    // 驗證 cron 表達式
    try {
      cron.validate(cronExpr);
    } catch (error) {
      throw new Error(`Invalid cron expression: ${cronExpr}`);
    }

    // 排程任務
    const task = cron.schedule(cronExpr, async () => {
      await this.executeTask(schedule);
    }, {
      timezone: timezone || 'Asia/Taipei'
    });

    this.tasks.set(id, { task, schedule });
    this.logger.info(`Cron task registered: ${id} (${cronExpr})`);
    this.emit('task:registered', { id, cronExpr });
  }

  async executeTask(schedule) {
    const { id, skill, params } = schedule;
    const executionId = `EXEC-${Date.now()}`;

    try {
      this.logger.info(`Executing task ${id} (${executionId})`);
      this.emit('task:started', { id, executionId });

      // 調用 Skill
      const result = await this.executeSkill(skill, params, {
        timeout: schedule.timeout,
        maxRetries: schedule.maxRetries,
        retryDelay: schedule.retryDelay
      });

      // 記錄成功
      await this.recordExecution(executionId, {
        status: 'completed',
        result,
        logs: this.getLogs(executionId)
      });

      this.emit('task:completed', { id, executionId, result });
    } catch (error) {
      this.logger.error(`Task failed: ${id}`, error);
      
      // 記錄失敗
      await this.recordExecution(executionId, {
        status: 'failed',
        error: error.message,
        logs: this.getLogs(executionId)
      });

      this.emit('task:failed', { id, executionId, error });
    }
  }

  async executeSkill(skillName, params, options) {
    // 使用 OpenClaw Skill framework
    const SkillExecutor = require('../executor/skill-executor');
    const executor = new SkillExecutor();
    
    return executor.run(skillName, params, {
      timeout: options.timeout || 600000,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 300000
    });
  }

  removeTask(id) {
    const { task } = this.tasks.get(id) || {};
    if (task) {
      task.stop();
      this.tasks.delete(id);
      this.logger.info(`Cron task removed: ${id}`);
    }
  }

  disableTask(id) {
    const entry = this.tasks.get(id);
    if (entry) {
      entry.task.stop();
      entry.disabled = true;
      this.logger.info(`Cron task disabled: ${id}`);
    }
  }

  enableTask(id) {
    const entry = this.tasks.get(id);
    if (entry && entry.disabled) {
      // 重新建立任務
      this.removeTask(id);
      this.addTask(entry.schedule);
    }
  }

  listTasks(filter = {}) {
    const tasks = Array.from(this.tasks.values());
    return tasks
      .filter(({ schedule }) => {
        if (filter.enabled !== undefined && schedule.enabled !== filter.enabled) return false;
        if (filter.skill && schedule.skill !== filter.skill) return false;
        return true;
      })
      .map(({ schedule }) => schedule);
  }
}

module.exports = CronEngine;
```

### 4.3 Webhook 監聽器

```javascript
// lib/webhook/listener.js
const express = require('express');
const crypto = require('crypto');

class WebhookListener {
  constructor(config) {
    this.config = config;
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes() {
    this.router.post('/:webhookId', (req, res) => {
      this.handleWebhook(req, res);
    });
  }

  async handleWebhook(req, res) {
    const { webhookId } = req.params;
    const signature = req.headers['x-signature'];
    const payload = req.body;

    try {
      // 驗證簽名
      const webhook = await this.getWebhook(webhookId);
      if (!this.verifySignature(payload, signature, webhook.secret)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // 驗證事件類型
      if (!webhook.events.includes(payload.event)) {
        return res.status(400).json({ error: 'Event not subscribed' });
      }

      // 排隊執行
      const taskId = await this.queueExecution(webhook, payload);

      res.json({
        success: true,
        taskId,
        status: 'processing'
      });

      // 異步執行（不阻塞回應）
      this.executeAsync(webhook, payload);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  verifySignature(payload, signature, secret) {
    const hash = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return `sha256=${hash}` === signature;
  }

  async executeAsync(webhook, payload) {
    const { skill, params: baseParams } = webhook;
    const params = { ...baseParams, ...payload.data };

    try {
      const result = await this.executeSkill(skill, params);
      await this.recordExecution({
        webhookId: webhook.id,
        event: payload.event,
        status: 'completed',
        result
      });
    } catch (error) {
      await this.recordExecution({
        webhookId: webhook.id,
        event: payload.event,
        status: 'failed',
        error: error.message
      });
    }
  }
}

module.exports = WebhookListener;
```

### 4.4 Web Dashboard

```html
<!-- dashboard/index.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Automation Engine Dashboard</title>
    <link rel="stylesheet" href="/css/dashboard.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>🤖 Automation Engine</h1>
            <nav>
                <a href="#schedules">Schedules</a>
                <a href="#webhooks">Webhooks</a>
                <a href="#executions">Executions</a>
                <a href="#metrics">Metrics</a>
            </nav>
        </header>

        <main>
            <!-- Schedules Tab -->
            <section id="schedules">
                <h2>Scheduled Tasks</h2>
                <button onclick="createSchedule()">+ New Schedule</button>
                <table id="schedules-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Cron</th>
                            <th>Skill</th>
                            <th>Status</th>
                            <th>Last Run</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </section>

            <!-- Webhooks Tab -->
            <section id="webhooks">
                <h2>Webhooks</h2>
                <button onclick="createWebhook()">+ New Webhook</button>
                <table id="webhooks-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Events</th>
                            <th>Skill</th>
                            <th>Enabled</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </section>

            <!-- Executions Tab -->
            <section id="executions">
                <h2>Execution History</h2>
                <table id="executions-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Task</th>
                            <th>Status</th>
                            <th>Duration</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </section>

            <!-- Metrics Tab -->
            <section id="metrics">
                <h2>System Metrics</h2>
                <div class="metrics-grid">
                    <div class="metric">
                        <h3>Total Executions</h3>
                        <p id="metric-total">0</p>
                    </div>
                    <div class="metric">
                        <h3>Success Rate</h3>
                        <p id="metric-success">0%</p>
                    </div>
                    <div class="metric">
                        <h3>Avg Duration</h3>
                        <p id="metric-duration">0ms</p>
                    </div>
                </div>
            </section>
        </main>
    </div>

    <script src="/js/dashboard.js"></script>
</body>
</html>
```

---

## 5. 配置範本

```yaml
# config/schedules.json
[
  {
    "id": "SCHED-001",
    "name": "Daily Report",
    "cron": "0 9 * * *",
    "timezone": "Asia/Taipei",
    "skill": "report-generator",
    "params": {
      "format": "pdf",
      "recipients": ["admin@example.com"]
    },
    "enabled": true,
    "maxRetries": 3,
    "retryDelay": 300000,
    "timeout": 600000
  },
  {
    "id": "SCHED-002",
    "name": "Inventory Sync",
    "cron": "0 */6 * * *",
    "skill": "inventory-sync",
    "params": {
      "source": "shopify",
      "destination": "sheets"
    },
    "enabled": true
  }
]

# config/webhooks.json
[
  {
    "id": "WEBHOOK-001",
    "name": "LINE Orders",
    "events": ["order.created", "order.updated"],
    "skill": "order-processor",
    "secret": "webhook_secret_xxx",
    "enabled": true
  }
]
```

---

## 6. 驗收條件檢核

- ✅ Docker Compose 一鍵啟動
- ✅ 支援 cron 表達式
- ✅ 支援 webhook 觸發
- ✅ Skill 執行與結果管理
- ✅ 完整的 Web Dashboard
- ✅ REST API 完整
- ✅ 執行歷史與日誌
- ✅ 錯誤處理與重試機制

---

**Status**: Ready for implementation  
**Dependencies**: S-05 (認證完成)  
**Next Phase**: S-06, S-07 integration
