---
tags: [cron, scheduling, automation, node-cron, n8n, launchd, backup, monitoring]
date: 2026-03-05
category: cookbook
---

# 56 -- 排程自動化與 Cron 任務

> 從 Node.js 排程、macOS launchd、n8n Cron 觸發器到定時備份、健康檢查、報告生成、資料庫清理、SSL 續約、監控告警的完整實戰手冊

---

## 目錄

1. [Node.js 排程（node-cron / Agenda / BullMQ）](#一nodejs-排程node-cron--agenda--bullmq)
2. [macOS launchd 排程設定](#二macos-launchd-排程設定)
3. [n8n Cron 觸發器](#三n8n-cron-觸發器)
4. [定時備份腳本](#四定時備份腳本)
5. [定時健康檢查](#五定時健康檢查)
6. [定時報告生成與發送](#六定時報告生成與發送)
7. [資料庫定時清理](#七資料庫定時清理)
8. [SSL 憑證自動續約](#八ssl-憑證自動續約)
9. [監控告警自動化](#九監控告警自動化)
10. [常見問題與排錯](#十常見問題與排錯)

---

## 一、Node.js 排程（node-cron / Agenda / BullMQ）

### 1.1 node-cron -- 輕量排程

最簡單的 in-process 排程，適合單機小專案。

**安裝**

```bash
npm install node-cron
npm install -D @types/node-cron
```

**Cron 語法速查表**

```
 ┌──────────── 秒（0-59，可選）
 │ ┌────────── 分（0-59）
 │ │ ┌──────── 時（0-23）
 │ │ │ ┌────── 日（1-31）
 │ │ │ │ ┌──── 月（1-12）
 │ │ │ │ │ ┌── 星期（0-7，0 和 7 都是週日）
 │ │ │ │ │ │
 * * * * * *

常用範例：
  */5 * * * *       每 5 分鐘
  0 * * * *         每小時整點
  0 0 * * *         每天午夜
  0 9 * * 1-5       週一到週五早上 9 點
  0 0 1 * *         每月 1 號午夜
  0 0 * * 0         每週日午夜
  30 4 1,15 * *     每月 1 號和 15 號凌晨 4:30
```

**基礎用法**

```typescript
// src/scheduler/cron-jobs.ts
import cron from 'node-cron';
import { logger } from '../utils/logger';

// 驗證 cron 表達式
const expression = '*/5 * * * *';
if (!cron.validate(expression)) {
  throw new Error(`Invalid cron expression: ${expression}`);
}

// 每 5 分鐘執行健康檢查
const healthCheckJob = cron.schedule('*/5 * * * *', async () => {
  const start = Date.now();
  try {
    logger.info('[CRON] Health check started');
    await performHealthCheck();
    logger.info(`[CRON] Health check completed in ${Date.now() - start}ms`);
  } catch (err) {
    logger.error('[CRON] Health check failed:', err);
  }
}, {
  scheduled: true,
  timezone: 'Asia/Taipei',
});

// 每天凌晨 2 點清理過期資料
const cleanupJob = cron.schedule('0 2 * * *', async () => {
  try {
    logger.info('[CRON] Daily cleanup started');
    const deleted = await cleanupExpiredData();
    logger.info(`[CRON] Daily cleanup: removed ${deleted} records`);
  } catch (err) {
    logger.error('[CRON] Daily cleanup failed:', err);
  }
}, {
  scheduled: true,
  timezone: 'Asia/Taipei',
});

// 每週一早上 9 點發送週報
const weeklyReportJob = cron.schedule('0 9 * * 1', async () => {
  try {
    logger.info('[CRON] Weekly report generation started');
    await generateAndSendWeeklyReport();
    logger.info('[CRON] Weekly report sent');
  } catch (err) {
    logger.error('[CRON] Weekly report failed:', err);
  }
}, {
  scheduled: true,
  timezone: 'Asia/Taipei',
});

// 停止排程
export function stopAllJobs(): void {
  healthCheckJob.stop();
  cleanupJob.stop();
  weeklyReportJob.stop();
  logger.info('[CRON] All jobs stopped');
}

// Graceful shutdown
process.on('SIGTERM', () => {
  stopAllJobs();
  process.exit(0);
});

process.on('SIGINT', () => {
  stopAllJobs();
  process.exit(0);
});
```

**完整排程管理器**

```typescript
// src/scheduler/scheduler-manager.ts
import cron, { ScheduledTask } from 'node-cron';
import { logger } from '../utils/logger';

interface JobDefinition {
  name: string;
  expression: string;
  handler: () => Promise<void>;
  timezone?: string;
  enabled?: boolean;
  retries?: number;
  retryDelayMs?: number;
}

interface JobStats {
  lastRun: Date | null;
  lastDuration: number;
  runCount: number;
  errorCount: number;
  lastError: string | null;
  isRunning: boolean;
}

class SchedulerManager {
  private jobs: Map<string, ScheduledTask> = new Map();
  private stats: Map<string, JobStats> = new Map();
  private definitions: Map<string, JobDefinition> = new Map();

  register(def: JobDefinition): void {
    if (!cron.validate(def.expression)) {
      throw new Error(`Invalid cron expression for job "${def.name}": ${def.expression}`);
    }
    if (this.jobs.has(def.name)) {
      throw new Error(`Job "${def.name}" already registered`);
    }

    this.definitions.set(def.name, def);
    this.stats.set(def.name, {
      lastRun: null,
      lastDuration: 0,
      runCount: 0,
      errorCount: 0,
      lastError: null,
      isRunning: false,
    });

    const task = cron.schedule(
      def.expression,
      async () => {
        await this.executeJob(def.name);
      },
      {
        scheduled: def.enabled !== false,
        timezone: def.timezone || 'Asia/Taipei',
      }
    );

    this.jobs.set(def.name, task);
    logger.info(`[Scheduler] Registered job: ${def.name} (${def.expression})`);
  }

  private async executeJob(name: string): Promise<void> {
    const def = this.definitions.get(name);
    const stat = this.stats.get(name);
    if (!def || !stat) return;

    if (stat.isRunning) {
      logger.warn(`[Scheduler] Job "${name}" is already running, skipping`);
      return;
    }

    stat.isRunning = true;
    const start = Date.now();
    const maxRetries = def.retries ?? 0;
    const retryDelay = def.retryDelayMs ?? 3000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          logger.info(`[Scheduler] Retrying job "${name}" (attempt ${attempt + 1}/${maxRetries + 1})`);
          await this.sleep(retryDelay * attempt);
        }
        await def.handler();
        stat.lastRun = new Date();
        stat.lastDuration = Date.now() - start;
        stat.runCount++;
        stat.lastError = null;
        stat.isRunning = false;
        logger.info(`[Scheduler] Job "${name}" completed in ${stat.lastDuration}ms`);
        return;
      } catch (err: any) {
        if (attempt === maxRetries) {
          stat.errorCount++;
          stat.lastError = err.message || String(err);
          stat.isRunning = false;
          logger.error(`[Scheduler] Job "${name}" failed after ${maxRetries + 1} attempts:`, err);
        }
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  start(name: string): void {
    const task = this.jobs.get(name);
    if (task) {
      task.start();
      logger.info(`[Scheduler] Started job: ${name}`);
    }
  }

  stop(name: string): void {
    const task = this.jobs.get(name);
    if (task) {
      task.stop();
      logger.info(`[Scheduler] Stopped job: ${name}`);
    }
  }

  stopAll(): void {
    for (const [name, task] of this.jobs) {
      task.stop();
    }
    logger.info('[Scheduler] All jobs stopped');
  }

  getStats(): Record<string, JobStats> {
    const result: Record<string, JobStats> = {};
    for (const [name, stat] of this.stats) {
      result[name] = { ...stat };
    }
    return result;
  }

  getJobStatus(name: string): JobStats | null {
    return this.stats.get(name) || null;
  }

  /** 手動觸發指定 job（不影響排程） */
  async triggerNow(name: string): Promise<void> {
    await this.executeJob(name);
  }
}

export const scheduler = new SchedulerManager();
```

**使用範例**

```typescript
// src/scheduler/register-jobs.ts
import { scheduler } from './scheduler-manager';
import { performHealthCheck } from '../services/health';
import { cleanupExpiredData } from '../services/cleanup';
import { generateDailyReport } from '../services/reports';

export function registerAllJobs(): void {
  scheduler.register({
    name: 'health-check',
    expression: '*/5 * * * *',
    handler: performHealthCheck,
    retries: 2,
    retryDelayMs: 5000,
  });

  scheduler.register({
    name: 'daily-cleanup',
    expression: '0 2 * * *',
    handler: cleanupExpiredData,
    retries: 1,
  });

  scheduler.register({
    name: 'daily-report',
    expression: '0 8 * * *',
    handler: generateDailyReport,
    retries: 3,
    retryDelayMs: 10000,
  });

  scheduler.register({
    name: 'weekly-digest',
    expression: '0 9 * * 1',
    handler: async () => {
      // 週一早上發送摘要
      const report = await fetch('http://localhost:3011/api/reports/weekly');
      const data = await report.json();
      await sendToTelegram(data.summary);
    },
    retries: 2,
  });
}

// API 端點：查看排程狀態
// GET /api/scheduler/status
export function getSchedulerStatus() {
  return scheduler.getStats();
}
```

### 1.2 Agenda -- MongoDB 支撐的持久化排程

適合需要持久化、分散式、可延遲的任務排程。

**安裝**

```bash
npm install agenda
npm install -D @types/agenda
```

**設定與使用**

```typescript
// src/scheduler/agenda-setup.ts
import Agenda, { Job } from 'agenda';
import { logger } from '../utils/logger';

const mongoConnectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/openclaw';

const agenda = new Agenda({
  db: {
    address: mongoConnectionString,
    collection: 'scheduled_jobs',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  processEvery: '30 seconds',
  maxConcurrency: 5,
  defaultConcurrency: 1,
  lockLimit: 10,
  defaultLockLifetime: 10 * 60 * 1000, // 10 分鐘
});

// 定義 Job
agenda.define('send-daily-report', { priority: 'high', concurrency: 1 }, async (job: Job) => {
  const { recipient, reportType } = job.attrs.data as {
    recipient: string;
    reportType: string;
  };
  logger.info(`[Agenda] Generating ${reportType} report for ${recipient}`);

  try {
    const report = await generateReport(reportType);
    await sendReport(recipient, report);
    logger.info(`[Agenda] Report sent to ${recipient}`);
  } catch (err) {
    logger.error(`[Agenda] Report failed for ${recipient}:`, err);
    throw err; // Agenda 會自動重試
  }
});

agenda.define('cleanup-old-logs', { priority: 'low', concurrency: 1 }, async (job: Job) => {
  const { daysToKeep } = job.attrs.data as { daysToKeep: number };
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  logger.info(`[Agenda] Cleaning logs older than ${cutoffDate.toISOString()}`);
  const count = await deleteOldLogs(cutoffDate);
  logger.info(`[Agenda] Deleted ${count} old log entries`);
});

agenda.define('check-ssl-expiry', { priority: 'high' }, async (job: Job) => {
  const { domains } = job.attrs.data as { domains: string[] };
  for (const domain of domains) {
    const daysLeft = await checkSSLExpiry(domain);
    if (daysLeft < 30) {
      await sendAlert(`SSL certificate for ${domain} expires in ${daysLeft} days!`);
    }
    if (daysLeft < 7) {
      await renewSSLCertificate(domain);
    }
  }
});

// 事件監聽
agenda.on('start', (job: Job) => {
  logger.info(`[Agenda] Job "${job.attrs.name}" started (ID: ${job.attrs._id})`);
});

agenda.on('complete', (job: Job) => {
  logger.info(`[Agenda] Job "${job.attrs.name}" completed`);
});

agenda.on('fail', (err: Error, job: Job) => {
  logger.error(`[Agenda] Job "${job.attrs.name}" failed:`, err.message);
});

// 啟動
export async function startAgenda(): Promise<void> {
  await agenda.start();
  logger.info('[Agenda] Scheduler started');

  // 排定周期任務
  await agenda.every('0 8 * * *', 'send-daily-report', {
    recipient: 'admin@openclaw.io',
    reportType: 'daily',
  });

  await agenda.every('0 3 * * *', 'cleanup-old-logs', {
    daysToKeep: 30,
  });

  await agenda.every('0 6 * * *', 'check-ssl-expiry', {
    domains: ['openclaw.io', 'api.openclaw.io'],
  });

  // 排定一次性延遲任務
  await agenda.schedule('in 2 hours', 'send-daily-report', {
    recipient: 'vip@openclaw.io',
    reportType: 'custom',
  });
}

// 停止
export async function stopAgenda(): Promise<void> {
  await agenda.stop();
  logger.info('[Agenda] Scheduler stopped');
}

// Graceful shutdown
async function gracefulShutdown(): Promise<void> {
  await agenda.stop();
  process.exit(0);
}
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export { agenda };
```

### 1.3 BullMQ -- Redis 支撐的高效能佇列

適合高吞吐、需要優先級、延遲、重試的生產環境。

**安裝**

```bash
npm install bullmq ioredis
npm install -D @types/ioredis
```

**佇列設定**

```typescript
// src/scheduler/bullmq-setup.ts
import { Queue, Worker, QueueScheduler, Job } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '../utils/logger';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// === 佇列定義 ===

// 定時任務佇列
export const scheduledQueue = new Queue('scheduled-tasks', {
  connection,
  defaultJobOptions: {
    removeOnComplete: { count: 100 },   // 保留最近 100 個完成的
    removeOnFail: { count: 500 },       // 保留最近 500 個失敗的
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

// 排程器（必要，驅動延遲和重複任務）
const queueScheduler = new QueueScheduler('scheduled-tasks', { connection });

// === Worker 處理器 ===

const worker = new Worker(
  'scheduled-tasks',
  async (job: Job) => {
    const { taskType, payload } = job.data;
    logger.info(`[BullMQ] Processing job ${job.id}: ${taskType}`);

    switch (taskType) {
      case 'health-check':
        return await performHealthCheck(payload);

      case 'backup':
        return await performBackup(payload);

      case 'report':
        return await generateReport(payload);

      case 'cleanup':
        return await performCleanup(payload);

      case 'ssl-check':
        return await checkSSLCertificates(payload);

      case 'notify':
        return await sendNotification(payload);

      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }
  },
  {
    connection,
    concurrency: 3,
    limiter: {
      max: 10,
      duration: 60000, // 每分鐘最多 10 個
    },
  }
);

// === 事件監聽 ===

worker.on('completed', (job: Job) => {
  logger.info(`[BullMQ] Job ${job.id} (${job.data.taskType}) completed`);
});

worker.on('failed', (job: Job | undefined, err: Error) => {
  logger.error(`[BullMQ] Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err: Error) => {
  logger.error('[BullMQ] Worker error:', err);
});

// === 排定重複任務 ===

export async function setupRepeatableJobs(): Promise<void> {
  // 清除舊的重複任務
  const existingRepeatables = await scheduledQueue.getRepeatableJobs();
  for (const job of existingRepeatables) {
    await scheduledQueue.removeRepeatableByKey(job.key);
  }

  // 每 5 分鐘健康檢查
  await scheduledQueue.add(
    'health-check',
    { taskType: 'health-check', payload: { endpoints: ['http://localhost:3011/api/health'] } },
    {
      repeat: { pattern: '*/5 * * * *' },
      priority: 1,
    }
  );

  // 每天凌晨 3 點備份
  await scheduledQueue.add(
    'daily-backup',
    { taskType: 'backup', payload: { type: 'full', destination: '/backups' } },
    {
      repeat: { pattern: '0 3 * * *', tz: 'Asia/Taipei' },
      priority: 2,
    }
  );

  // 每天早上 8 點日報
  await scheduledQueue.add(
    'daily-report',
    { taskType: 'report', payload: { type: 'daily', recipients: ['admin@openclaw.io'] } },
    {
      repeat: { pattern: '0 8 * * *', tz: 'Asia/Taipei' },
      priority: 3,
    }
  );

  // 每週日凌晨 4 點清理
  await scheduledQueue.add(
    'weekly-cleanup',
    { taskType: 'cleanup', payload: { daysToKeep: 30 } },
    {
      repeat: { pattern: '0 4 * * 0', tz: 'Asia/Taipei' },
      priority: 5,
    }
  );

  logger.info('[BullMQ] All repeatable jobs scheduled');
}

// === 排定一次性延遲任務 ===

export async function scheduleDelayedTask(
  taskType: string,
  payload: Record<string, any>,
  delayMs: number
): Promise<string> {
  const job = await scheduledQueue.add(
    taskType,
    { taskType, payload },
    { delay: delayMs }
  );
  logger.info(`[BullMQ] Delayed job ${job.id} scheduled (${delayMs}ms delay)`);
  return job.id!;
}

// === Graceful shutdown ===

export async function shutdownBullMQ(): Promise<void> {
  await worker.close();
  await queueScheduler.close();
  await scheduledQueue.close();
  await connection.quit();
  logger.info('[BullMQ] All connections closed');
}
```

### 1.4 三種方案比較

| 特性 | node-cron | Agenda | BullMQ |
|------|-----------|--------|--------|
| 持久化 | 無（記憶體） | MongoDB | Redis |
| 分散式 | 不支援 | 支援 | 支援 |
| 重試機制 | 需自己寫 | 內建 | 內建（指數退避） |
| 優先級 | 無 | 有（high/normal/low） | 有（數字） |
| 延遲任務 | 不支援 | 支援 | 支援 |
| UI 管理介面 | 無 | agendash | bull-board |
| 適用場景 | 單機小專案 | 中型持久化排程 | 高吞吐生產環境 |
| 依賴 | 無 | MongoDB | Redis |
| 複雜度 | 低 | 中 | 高 |

---

## 二、macOS launchd 排程設定

### 2.1 基礎概念

macOS 的 launchd 等同 Linux 的 systemd + cron。分為：
- **LaunchDaemons**（`/Library/LaunchDaemons/`）-- 系統級，開機就跑
- **LaunchAgents**（`~/Library/LaunchAgents/`）-- 使用者級，登入後跑

### 2.2 plist 設定檔範本

**每 5 分鐘執行健康檢查**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.openclaw.health-check</string>

    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>/Users/caijunchang/openclaw任務面版設計/scripts/health-check.sh</string>
    </array>

    <!-- 每 300 秒（5 分鐘）執行一次 -->
    <key>StartInterval</key>
    <integer>300</integer>

    <key>StandardOutPath</key>
    <string>/Users/caijunchang/.openclaw/automation/logs/health-check.log</string>

    <key>StandardErrorPath</key>
    <string>/Users/caijunchang/.openclaw/automation/logs/health-check-error.log</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
    </dict>

    <!-- 失敗後自動重啟 -->
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>

    <key>ThrottleInterval</key>
    <integer>60</integer>
</dict>
</plist>
```

**每天午夜執行備份**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.openclaw.daily-backup</string>

    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>/Users/caijunchang/openclaw任務面版設計/scripts/daily-backup.sh</string>
    </array>

    <!-- 每天 00:30 執行 -->
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>0</integer>
        <key>Minute</key>
        <integer>30</integer>
    </dict>

    <key>StandardOutPath</key>
    <string>/Users/caijunchang/.openclaw/automation/logs/daily-backup.log</string>

    <key>StandardErrorPath</key>
    <string>/Users/caijunchang/.openclaw/automation/logs/daily-backup-error.log</string>

    <key>WorkingDirectory</key>
    <string>/Users/caijunchang/openclaw任務面版設計</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
        <key>HOME</key>
        <string>/Users/caijunchang</string>
    </dict>
</dict>
</plist>
```

**常駐 server（KeepAlive）**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.openclaw.taskboard</string>

    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/node</string>
        <string>dist/index.js</string>
    </array>

    <key>WorkingDirectory</key>
    <string>/Users/caijunchang/openclaw任務面版設計/server</string>

    <!-- 永遠保持運行 -->
    <key>KeepAlive</key>
    <true/>

    <key>RunAtLoad</key>
    <true/>

    <key>StandardOutPath</key>
    <string>/Users/caijunchang/.openclaw/automation/logs/taskboard.log</string>

    <key>StandardErrorPath</key>
    <string>/Users/caijunchang/.openclaw/automation/logs/taskboard-error.log</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key>
        <string>production</string>
        <key>PORT</key>
        <string>3011</string>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    </dict>

    <!-- 崩潰後等 10 秒再重啟 -->
    <key>ThrottleInterval</key>
    <integer>10</integer>

    <!-- 軟限制：不讓單一 process 吃太多資源 -->
    <key>SoftResourceLimits</key>
    <dict>
        <key>NumberOfFiles</key>
        <integer>4096</integer>
    </dict>
</dict>
</plist>
```

### 2.3 launchctl 操作指令

```bash
# 載入排程（首次或修改 plist 後）
launchctl load ~/Library/LaunchAgents/com.openclaw.health-check.plist

# 卸載排程
launchctl unload ~/Library/LaunchAgents/com.openclaw.health-check.plist

# 啟動
launchctl start com.openclaw.health-check

# 停止
launchctl stop com.openclaw.health-check

# 查看狀態（0 = 正常退出，非 0 = 異常）
launchctl list | grep openclaw

# 查看完整資訊
launchctl print gui/$(id -u)/com.openclaw.taskboard

# 重新載入（修改 plist 後）
launchctl unload ~/Library/LaunchAgents/com.openclaw.health-check.plist
launchctl load ~/Library/LaunchAgents/com.openclaw.health-check.plist

# 查看 log
tail -f ~/.openclaw/automation/logs/health-check.log
```

### 2.4 自動安裝 launchd 排程的腳本

```bash
#!/bin/bash
# scripts/install-launchd-jobs.sh
# 一鍵安裝所有 launchd 排程

set -euo pipefail

PLIST_DIR="$HOME/Library/LaunchAgents"
LOG_DIR="$HOME/.openclaw/automation/logs"
SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"

# 確保目錄存在
mkdir -p "$PLIST_DIR" "$LOG_DIR"

echo "=== 安裝 OpenClaw launchd 排程 ==="

# 排程清單：Label | 腳本路徑 | 觸發方式
JOBS=(
  "com.openclaw.health-check|${SCRIPTS_DIR}/health-check.sh|interval:300"
  "com.openclaw.daily-backup|${SCRIPTS_DIR}/daily-backup.sh|calendar:0:30"
  "com.openclaw.weekly-report|${SCRIPTS_DIR}/weekly-report.sh|calendar:9:0:1"
  "com.openclaw.log-cleanup|${SCRIPTS_DIR}/cleanup-logs.sh|calendar:3:0"
)

for entry in "${JOBS[@]}"; do
  IFS='|' read -r LABEL SCRIPT TRIGGER <<< "$entry"
  PLIST_FILE="${PLIST_DIR}/${LABEL}.plist"

  echo "  Installing: ${LABEL}"

  # 先卸載舊的（如果存在）
  launchctl unload "$PLIST_FILE" 2>/dev/null || true

  # 產生 plist
  cat > "$PLIST_FILE" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>${SCRIPT}</string>
    </array>
PLIST_EOF

  # 根據觸發方式加入不同設定
  case "$TRIGGER" in
    interval:*)
      SECONDS="${TRIGGER#interval:}"
      cat >> "$PLIST_FILE" <<INNER_EOF
    <key>StartInterval</key>
    <integer>${SECONDS}</integer>
INNER_EOF
      ;;
    calendar:*)
      # 格式 calendar:Hour:Minute 或 calendar:Hour:Minute:Weekday
      IFS=':' read -r _ HOUR MINUTE WEEKDAY <<< "$TRIGGER"
      cat >> "$PLIST_FILE" <<INNER_EOF
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>${HOUR}</integer>
        <key>Minute</key>
        <integer>${MINUTE}</integer>
INNER_EOF
      if [ -n "${WEEKDAY:-}" ]; then
        cat >> "$PLIST_FILE" <<INNER_EOF
        <key>Weekday</key>
        <integer>${WEEKDAY}</integer>
INNER_EOF
      fi
      cat >> "$PLIST_FILE" <<INNER_EOF
    </dict>
INNER_EOF
      ;;
  esac

  # 加入通用設定
  cat >> "$PLIST_FILE" <<INNER_EOF
    <key>StandardOutPath</key>
    <string>${LOG_DIR}/${LABEL}.log</string>
    <key>StandardErrorPath</key>
    <string>${LOG_DIR}/${LABEL}-error.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
        <key>HOME</key>
        <string>${HOME}</string>
    </dict>
</dict>
</plist>
INNER_EOF

  # 載入
  launchctl load "$PLIST_FILE"
  echo "    Loaded: ${PLIST_FILE}"
done

echo ""
echo "=== 完成！已安裝 ${#JOBS[@]} 個排程 ==="
echo "查看狀態：launchctl list | grep openclaw"
echo "查看 log：ls -la ${LOG_DIR}/"
```

---

## 三、n8n Cron 觸發器

### 3.1 n8n Schedule Trigger 設定

n8n 的 Schedule Trigger 節點支援 Cron 表達式和間隔兩種模式。

**透過 MCP 建立 Cron Workflow**

```typescript
// 使用 n8n MCP 建立定時 workflow
// Schedule Trigger + HTTP Request + Telegram 通知

const cronWorkflow = {
  name: "Daily Health Check & Report",
  nodes: [
    {
      id: "trigger-1",
      name: "Schedule Trigger",
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1.2,
      position: [250, 300],
      parameters: {
        rule: {
          interval: [
            {
              field: "cronExpression",
              expression: "0 8 * * *"  // 每天早上 8 點
            }
          ]
        }
      }
    },
    {
      id: "http-1",
      name: "Health Check",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [470, 300],
      parameters: {
        method: "GET",
        url: "http://localhost:3011/api/health",
        options: {
          timeout: 10000
        }
      }
    },
    {
      id: "if-1",
      name: "Check Status",
      type: "n8n-nodes-base.if",
      typeVersion: 2,
      position: [690, 300],
      parameters: {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: "",
            typeValidation: "strict"
          },
          conditions: [
            {
              id: "condition-1",
              leftValue: "={{ $json.status }}",
              rightValue: "ok",
              operator: {
                type: "string",
                operation: "equals"
              }
            }
          ],
          combinator: "and"
        }
      }
    },
    {
      id: "telegram-ok",
      name: "Report OK",
      type: "n8n-nodes-base.telegram",
      typeVersion: 1.2,
      position: [910, 200],
      parameters: {
        chatId: "YOUR_CHAT_ID",
        text: "=Health Check OK at {{ $now.format('yyyy-MM-dd HH:mm') }}\nUptime: {{ $json.uptime }}s\nVersion: {{ $json.version }}",
        additionalFields: {}
      }
    },
    {
      id: "telegram-fail",
      name: "Alert Failure",
      type: "n8n-nodes-base.telegram",
      typeVersion: 1.2,
      position: [910, 400],
      parameters: {
        chatId: "YOUR_CHAT_ID",
        text: "=ALERT: Health Check FAILED at {{ $now.format('yyyy-MM-dd HH:mm') }}\nError: {{ $json.error }}",
        additionalFields: {}
      }
    }
  ],
  connections: {
    "Schedule Trigger": {
      main: [[{ node: "Health Check", type: "main", index: 0 }]]
    },
    "Health Check": {
      main: [[{ node: "Check Status", type: "main", index: 0 }]]
    },
    "Check Status": {
      main: [
        [{ node: "Report OK", type: "main", index: 0 }],
        [{ node: "Alert Failure", type: "main", index: 0 }]
      ]
    }
  }
};
```

### 3.2 常用 n8n Cron 場景

| 場景 | Cron 表達式 | 說明 |
|------|-------------|------|
| 每分鐘檢查 | `* * * * *` | API 可用性監控 |
| 每 5 分鐘 | `*/5 * * * *` | 健康檢查 |
| 每小時 | `0 * * * *` | 資料同步 |
| 每天早上 8 點 | `0 8 * * *` | 日報生成 |
| 每天凌晨 2 點 | `0 2 * * *` | 資料庫清理 |
| 每天凌晨 3 點 | `0 3 * * *` | 備份 |
| 每週一早上 9 點 | `0 9 * * 1` | 週報 |
| 每月 1 號 | `0 0 1 * *` | 月報 / 帳單 |
| 工作日 9-18 點每小時 | `0 9-18 * * 1-5` | 業務時段監控 |

### 3.3 透過 API 觸發 n8n Workflow

```bash
# 觸發帶 webhook 的 workflow
curl -X POST "http://localhost:3011/api/n8n/webhook/daily-report" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer oc-oAw9leGU04IAbcS4WN3FC1SH3vq5OdPxrVJCR16iIUMPsep1" \
  -d '{
    "type": "manual-trigger",
    "timestamp": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"
  }'
```

---

## 四、定時備份腳本

### 4.1 全站備份腳本（Shell）

```bash
#!/bin/bash
# scripts/daily-backup.sh
# 每日全站備份：代碼 + 資料庫 + 設定檔

set -euo pipefail

# === 設定 ===
BACKUP_ROOT="/Users/caijunchang/.openclaw/backups"
PROJECT_DIR="/Users/caijunchang/openclaw任務面版設計"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_ROOT}/${DATE}"
LOG_FILE="${BACKUP_ROOT}/backup.log"
KEEP_DAYS=30
SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_KEY="${SUPABASE_KEY:-}"

# 載入環境變數
if [ -f "${PROJECT_DIR}/server/.env" ]; then
  source "${PROJECT_DIR}/server/.env"
fi

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# === 開始備份 ===
log "=== Daily backup started ==="
mkdir -p "$BACKUP_DIR"

# 1. 代碼備份（排除 node_modules、dist、.git）
log "Step 1: Backing up source code..."
tar -czf "${BACKUP_DIR}/source-code.tar.gz" \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.git' \
  --exclude='.cache' \
  --exclude='*.log' \
  -C "$(dirname "$PROJECT_DIR")" \
  "$(basename "$PROJECT_DIR")" 2>/dev/null

SOURCE_SIZE=$(du -sh "${BACKUP_DIR}/source-code.tar.gz" | cut -f1)
log "  Source code: ${SOURCE_SIZE}"

# 2. 設定檔備份
log "Step 2: Backing up config files..."
mkdir -p "${BACKUP_DIR}/configs"
cp -f "${PROJECT_DIR}/server/.env" "${BACKUP_DIR}/configs/.env" 2>/dev/null || true
cp -f "${PROJECT_DIR}/package.json" "${BACKUP_DIR}/configs/package.json" 2>/dev/null || true
cp -f "${PROJECT_DIR}/server/package.json" "${BACKUP_DIR}/configs/server-package.json" 2>/dev/null || true

# launchd plist 備份
for plist in ~/Library/LaunchAgents/com.openclaw.*.plist; do
  [ -f "$plist" ] && cp -f "$plist" "${BACKUP_DIR}/configs/" 2>/dev/null || true
done

tar -czf "${BACKUP_DIR}/configs.tar.gz" -C "$BACKUP_DIR" configs
rm -rf "${BACKUP_DIR}/configs"
log "  Config files backed up"

# 3. OpenClaw workspace 備份
log "Step 3: Backing up workspace..."
if [ -d "$HOME/.openclaw" ]; then
  tar -czf "${BACKUP_DIR}/openclaw-workspace.tar.gz" \
    --exclude='backups' \
    --exclude='*.log' \
    --exclude='automation/logs' \
    -C "$HOME" \
    ".openclaw" 2>/dev/null

  WS_SIZE=$(du -sh "${BACKUP_DIR}/openclaw-workspace.tar.gz" | cut -f1)
  log "  Workspace: ${WS_SIZE}"
fi

# 4. Supabase 資料匯出（如果有設定）
log "Step 4: Exporting Supabase data..."
if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_KEY" ]; then
  TABLES=("tasks" "knowledge_chunks" "sessions" "system_config")
  mkdir -p "${BACKUP_DIR}/supabase"

  for table in "${TABLES[@]}"; do
    curl -s "${SUPABASE_URL}/rest/v1/${table}?select=*" \
      -H "apikey: ${SUPABASE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_KEY}" \
      > "${BACKUP_DIR}/supabase/${table}.json" 2>/dev/null || true
    log "  Exported: ${table}"
  done

  tar -czf "${BACKUP_DIR}/supabase-data.tar.gz" -C "$BACKUP_DIR" supabase
  rm -rf "${BACKUP_DIR}/supabase"
else
  log "  Supabase not configured, skipping"
fi

# 5. 計算備份總大小
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
log "Step 5: Backup complete. Total size: ${TOTAL_SIZE}"

# 6. 清理舊備份（保留 N 天）
log "Step 6: Cleaning old backups (keeping ${KEEP_DAYS} days)..."
DELETED=0
find "$BACKUP_ROOT" -maxdepth 1 -type d -mtime +${KEEP_DAYS} | while read -r old_dir; do
  if [ "$old_dir" != "$BACKUP_ROOT" ]; then
    rm -rf "$old_dir"
    DELETED=$((DELETED + 1))
    log "  Deleted: $(basename "$old_dir")"
  fi
done
log "  Cleaned up old backups"

# 7. 產生備份摘要
cat > "${BACKUP_DIR}/manifest.json" <<EOF
{
  "date": "${DATE}",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "totalSize": "${TOTAL_SIZE}",
  "files": [
    "source-code.tar.gz",
    "configs.tar.gz",
    "openclaw-workspace.tar.gz",
    "supabase-data.tar.gz"
  ],
  "keepDays": ${KEEP_DAYS},
  "host": "$(hostname)"
}
EOF

log "=== Backup completed: ${BACKUP_DIR} ==="
log "Total size: ${TOTAL_SIZE}"
echo ""
```

### 4.2 Node.js 備份服務

```typescript
// src/services/backup-service.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

interface BackupResult {
  success: boolean;
  path: string;
  size: string;
  duration: number;
  manifest: BackupManifest;
}

interface BackupManifest {
  date: string;
  files: string[];
  totalSize: string;
  host: string;
}

const BACKUP_ROOT = path.join(process.env.HOME || '/tmp', '.openclaw/backups');
const MAX_BACKUPS = 30;

export async function performFullBackup(): Promise<BackupResult> {
  const start = Date.now();
  const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(BACKUP_ROOT, date);

  await fs.mkdir(backupDir, { recursive: true });
  logger.info(`[Backup] Starting full backup to ${backupDir}`);

  const files: string[] = [];

  // 1. Source code
  try {
    const sourceFile = path.join(backupDir, 'source-code.tar.gz');
    await execAsync(
      `tar -czf "${sourceFile}" --exclude='node_modules' --exclude='dist' --exclude='.git' -C "/Users/caijunchang/Downloads" "openclaw-console-hub-main"`,
      { timeout: 120000 }
    );
    files.push('source-code.tar.gz');
    logger.info('[Backup] Source code backed up');
  } catch (err) {
    logger.error('[Backup] Source code backup failed:', err);
  }

  // 2. Config files
  try {
    const configDir = path.join(backupDir, 'configs');
    await fs.mkdir(configDir, { recursive: true });

    const configFiles = [
      { src: '/Users/caijunchang/openclaw任務面版設計/server/.env', dst: 'server.env' },
      { src: '/Users/caijunchang/openclaw任務面版設計/package.json', dst: 'package.json' },
    ];

    for (const cf of configFiles) {
      try {
        await fs.copyFile(cf.src, path.join(configDir, cf.dst));
      } catch { /* skip missing */ }
    }

    await execAsync(`tar -czf "${path.join(backupDir, 'configs.tar.gz')}" -C "${backupDir}" configs`);
    await fs.rm(configDir, { recursive: true });
    files.push('configs.tar.gz');
    logger.info('[Backup] Configs backed up');
  } catch (err) {
    logger.error('[Backup] Config backup failed:', err);
  }

  // 3. 清理舊備份
  await cleanOldBackups();

  // 4. 產生 manifest
  const { stdout: sizeOutput } = await execAsync(`du -sh "${backupDir}" | cut -f1`);
  const totalSize = sizeOutput.trim();

  const manifest: BackupManifest = {
    date,
    files,
    totalSize,
    host: (await execAsync('hostname')).stdout.trim(),
  };

  await fs.writeFile(
    path.join(backupDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  const duration = Date.now() - start;
  logger.info(`[Backup] Full backup completed in ${duration}ms (${totalSize})`);

  return {
    success: true,
    path: backupDir,
    size: totalSize,
    duration,
    manifest,
  };
}

async function cleanOldBackups(): Promise<void> {
  try {
    const entries = await fs.readdir(BACKUP_ROOT, { withFileTypes: true });
    const dirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
      .reverse();

    if (dirs.length > MAX_BACKUPS) {
      const toDelete = dirs.slice(MAX_BACKUPS);
      for (const dir of toDelete) {
        await fs.rm(path.join(BACKUP_ROOT, dir), { recursive: true });
        logger.info(`[Backup] Cleaned old backup: ${dir}`);
      }
    }
  } catch (err) {
    logger.warn('[Backup] Failed to clean old backups:', err);
  }
}

// 列出所有備份
export async function listBackups(): Promise<BackupManifest[]> {
  const manifests: BackupManifest[] = [];
  try {
    const entries = await fs.readdir(BACKUP_ROOT, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        try {
          const manifestPath = path.join(BACKUP_ROOT, entry.name, 'manifest.json');
          const content = await fs.readFile(manifestPath, 'utf-8');
          manifests.push(JSON.parse(content));
        } catch { /* skip */ }
      }
    }
  } catch { /* empty */ }
  return manifests.sort((a, b) => b.date.localeCompare(a.date));
}
```

---

## 五、定時健康檢查

### 5.1 健康檢查腳本（Shell）

```bash
#!/bin/bash
# scripts/health-check.sh
# 多層健康檢查：HTTP / 端口 / 磁碟 / 記憶體 / 程序

set -euo pipefail

LOG_FILE="$HOME/.openclaw/automation/logs/health-check.log"
ALERT_SCRIPT="$HOME/openclaw任務面版設計/scripts/notify-laocai.sh"
SERVER_URL="http://localhost:3011"
DISK_THRESHOLD=90  # 磁碟使用率告警門檻（%）
MEM_THRESHOLD=90   # 記憶體使用率告警門檻（%）

mkdir -p "$(dirname "$LOG_FILE")"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

alert() {
  log "ALERT: $1"
  if [ -f "$ALERT_SCRIPT" ]; then
    bash "$ALERT_SCRIPT" "Health Alert" "error" "$1" 2>/dev/null || true
  fi
}

ISSUES=0

# 1. HTTP 健康檢查
log "--- Health Check Start ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${SERVER_URL}/api/health" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  log "HTTP: OK (${HTTP_CODE})"
else
  alert "Server HTTP check failed (status: ${HTTP_CODE})"
  ISSUES=$((ISSUES + 1))
fi

# 2. 端口檢查
if lsof -i :3011 -sTCP:LISTEN > /dev/null 2>&1; then
  log "Port 3011: LISTENING"
else
  alert "Port 3011 is not listening!"
  ISSUES=$((ISSUES + 1))
fi

# 3. 程序檢查
TASKBOARD_PID=$(pgrep -f "dist/index.js" 2>/dev/null || echo "")
if [ -n "$TASKBOARD_PID" ]; then
  log "Process: Running (PID: ${TASKBOARD_PID})"
else
  alert "Taskboard process not found!"
  ISSUES=$((ISSUES + 1))
fi

# 4. 磁碟使用率
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_USAGE" -ge "$DISK_THRESHOLD" ]; then
  alert "Disk usage at ${DISK_USAGE}% (threshold: ${DISK_THRESHOLD}%)"
  ISSUES=$((ISSUES + 1))
else
  log "Disk: ${DISK_USAGE}% used"
fi

# 5. 記憶體使用率（macOS）
MEM_PRESSURE=$(memory_pressure 2>/dev/null | grep "System-wide memory free percentage" | awk '{print $NF}' | tr -d '%' || echo "0")
MEM_USED=$((100 - MEM_PRESSURE))
if [ "$MEM_USED" -ge "$MEM_THRESHOLD" ]; then
  alert "Memory usage at ${MEM_USED}% (threshold: ${MEM_THRESHOLD}%)"
  ISSUES=$((ISSUES + 1))
else
  log "Memory: ${MEM_USED}% used"
fi

# 6. Log 大小檢查（避免磁碟爆掉）
for logfile in "$HOME"/.openclaw/automation/logs/*.log; do
  if [ -f "$logfile" ]; then
    SIZE_MB=$(du -m "$logfile" | cut -f1)
    if [ "$SIZE_MB" -gt 100 ]; then
      log "WARNING: ${logfile} is ${SIZE_MB}MB, rotating..."
      mv "$logfile" "${logfile}.$(date +%Y%m%d)"
      gzip "${logfile}.$(date +%Y%m%d)" 2>/dev/null || true
    fi
  fi
done

# 7. 摘要
if [ $ISSUES -eq 0 ]; then
  log "Health Check: ALL CLEAR"
else
  log "Health Check: ${ISSUES} issue(s) found"
fi
log "--- Health Check End ---"
```

### 5.2 Node.js 健康檢查服務

```typescript
// src/services/health-check-service.ts
import { logger } from '../utils/logger';
import os from 'os';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: CheckItem[];
  summary: string;
}

interface CheckItem {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  value?: number | string;
  threshold?: number | string;
}

export async function performHealthCheck(): Promise<HealthCheckResult> {
  const checks: CheckItem[] = [];
  const startTime = Date.now();

  // 1. Server 自身
  checks.push({
    name: 'server',
    status: 'pass',
    message: 'Server is running',
    value: `PID ${process.pid}`,
  });

  // 2. 記憶體
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const heapPercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
  checks.push({
    name: 'memory',
    status: heapPercent > 90 ? 'fail' : heapPercent > 70 ? 'warn' : 'pass',
    message: `Heap: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapPercent}%)`,
    value: heapPercent,
    threshold: 90,
  });

  // 3. 系統負載
  const loadAvg = os.loadavg();
  const cpuCount = os.cpus().length;
  const loadRatio = loadAvg[0] / cpuCount;
  checks.push({
    name: 'cpu-load',
    status: loadRatio > 2 ? 'fail' : loadRatio > 1 ? 'warn' : 'pass',
    message: `Load: ${loadAvg[0].toFixed(2)} / ${loadAvg[1].toFixed(2)} / ${loadAvg[2].toFixed(2)} (${cpuCount} CPUs)`,
    value: loadAvg[0],
    threshold: cpuCount * 2,
  });

  // 4. 系統記憶體
  const totalMemGB = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
  const freeMemGB = (os.freemem() / 1024 / 1024 / 1024).toFixed(1);
  const sysMemPercent = Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);
  checks.push({
    name: 'system-memory',
    status: sysMemPercent > 95 ? 'fail' : sysMemPercent > 85 ? 'warn' : 'pass',
    message: `System: ${freeMemGB}GB free / ${totalMemGB}GB total (${sysMemPercent}% used)`,
    value: sysMemPercent,
    threshold: 95,
  });

  // 5. Uptime
  const uptimeHours = (process.uptime() / 3600).toFixed(1);
  checks.push({
    name: 'uptime',
    status: 'pass',
    message: `Server uptime: ${uptimeHours} hours`,
    value: uptimeHours,
  });

  // 6. Event loop delay（近似）
  const loopStart = Date.now();
  await new Promise((resolve) => setImmediate(resolve));
  const loopDelay = Date.now() - loopStart;
  checks.push({
    name: 'event-loop',
    status: loopDelay > 100 ? 'fail' : loopDelay > 50 ? 'warn' : 'pass',
    message: `Event loop delay: ${loopDelay}ms`,
    value: loopDelay,
    threshold: 100,
  });

  // 7. 外部服務（Supabase）
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    if (supabaseUrl) {
      const res = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        headers: { apikey: process.env.SUPABASE_KEY || '' },
        signal: AbortSignal.timeout(5000),
      });
      checks.push({
        name: 'supabase',
        status: res.ok ? 'pass' : 'warn',
        message: `Supabase: ${res.status}`,
      });
    }
  } catch (err: any) {
    checks.push({
      name: 'supabase',
      status: 'fail',
      message: `Supabase: ${err.message}`,
    });
  }

  // 彙總
  const failCount = checks.filter((c) => c.status === 'fail').length;
  const warnCount = checks.filter((c) => c.status === 'warn').length;
  const overallStatus: HealthCheckResult['status'] =
    failCount > 0 ? 'unhealthy' : warnCount > 0 ? 'degraded' : 'healthy';

  const result: HealthCheckResult = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
    summary: `${checks.length} checks: ${checks.length - failCount - warnCount} pass, ${warnCount} warn, ${failCount} fail`,
  };

  if (failCount > 0) {
    logger.warn(`[HealthCheck] ${result.summary}`);
  } else {
    logger.info(`[HealthCheck] ${result.summary}`);
  }

  return result;
}

// Express route handler
export function healthCheckRoute(req: any, res: any) {
  performHealthCheck()
    .then((result) => {
      const statusCode = result.status === 'unhealthy' ? 503 : 200;
      res.status(statusCode).json(result);
    })
    .catch((err) => {
      res.status(500).json({ status: 'error', message: err.message });
    });
}
```

---

## 六、定時報告生成與發送

### 6.1 日報 / 週報生成器

```typescript
// src/services/report-generator.ts
import { logger } from '../utils/logger';

interface ReportData {
  period: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  taskStats: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
    avgDuration: number;
  };
  systemStats: {
    uptime: number;
    avgResponseTime: number;
    errorRate: number;
    requestCount: number;
  };
  highlights: string[];
  warnings: string[];
}

export async function generateDailyReport(): Promise<string> {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const data = await collectReportData('daily', yesterday, now);
  const markdown = formatReport(data);

  // 發送到 Telegram
  await sendReportToTelegram(markdown);

  // 儲存到本地
  const reportPath = `${process.env.HOME}/.openclaw/reports/daily-${now.toISOString().slice(0, 10)}.md`;
  const fs = await import('fs/promises');
  await fs.mkdir(`${process.env.HOME}/.openclaw/reports`, { recursive: true });
  await fs.writeFile(reportPath, markdown);

  logger.info(`[Report] Daily report saved to ${reportPath}`);
  return markdown;
}

export async function generateWeeklyReport(): Promise<string> {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const data = await collectReportData('weekly', weekAgo, now);
  const markdown = formatReport(data);

  await sendReportToTelegram(markdown);

  const reportPath = `${process.env.HOME}/.openclaw/reports/weekly-${now.toISOString().slice(0, 10)}.md`;
  const fs = await import('fs/promises');
  await fs.mkdir(`${process.env.HOME}/.openclaw/reports`, { recursive: true });
  await fs.writeFile(reportPath, markdown);

  logger.info(`[Report] Weekly report saved to ${reportPath}`);
  return markdown;
}

async function collectReportData(
  period: 'daily' | 'weekly' | 'monthly',
  startDate: Date,
  endDate: Date
): Promise<ReportData> {
  // 從 API 收集任務統計
  let taskStats = { total: 0, completed: 0, failed: 0, pending: 0, avgDuration: 0 };
  try {
    const apiUrl = process.env.VITE_API_BASE_URL || 'http://localhost:3011';
    const apiKey = process.env.VITE_OPENCLAW_API_KEY || '';

    const res = await fetch(`${apiUrl}/api/openclaw/tasks`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const tasks = await res.json();
      const tasksArray = Array.isArray(tasks) ? tasks : tasks.tasks || [];
      taskStats.total = tasksArray.length;
      taskStats.completed = tasksArray.filter((t: any) => t.status === 'done').length;
      taskStats.failed = tasksArray.filter((t: any) => t.status === 'failed').length;
      taskStats.pending = tasksArray.filter((t: any) => t.status === 'pending' || t.status === 'ready').length;
    }
  } catch (err) {
    logger.warn('[Report] Failed to collect task stats:', err);
  }

  // 系統統計
  const systemStats = {
    uptime: process.uptime(),
    avgResponseTime: 0,
    errorRate: 0,
    requestCount: 0,
  };

  // 分析重點 & 告警
  const highlights: string[] = [];
  const warnings: string[] = [];

  if (taskStats.completed > 0) {
    highlights.push(`Completed ${taskStats.completed} tasks`);
  }
  if (taskStats.failed > 0) {
    warnings.push(`${taskStats.failed} tasks failed`);
  }
  if (systemStats.uptime > 86400) {
    highlights.push(`Server uptime: ${(systemStats.uptime / 86400).toFixed(1)} days`);
  }

  return {
    period,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    taskStats,
    systemStats,
    highlights,
    warnings,
  };
}

function formatReport(data: ReportData): string {
  const periodLabel = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
  }[data.period];

  const uptimeStr = (data.systemStats.uptime / 3600).toFixed(1);

  let report = `# OpenClaw ${periodLabel} Report\n\n`;
  report += `**Period**: ${data.startDate.slice(0, 10)} ~ ${data.endDate.slice(0, 10)}\n`;
  report += `**Generated**: ${new Date().toISOString()}\n\n`;

  report += `## Task Summary\n\n`;
  report += `| Metric | Value |\n`;
  report += `|--------|-------|\n`;
  report += `| Total Tasks | ${data.taskStats.total} |\n`;
  report += `| Completed | ${data.taskStats.completed} |\n`;
  report += `| Failed | ${data.taskStats.failed} |\n`;
  report += `| Pending | ${data.taskStats.pending} |\n\n`;

  report += `## System\n\n`;
  report += `- Uptime: ${uptimeStr} hours\n`;
  report += `- Requests: ${data.systemStats.requestCount}\n\n`;

  if (data.highlights.length > 0) {
    report += `## Highlights\n\n`;
    for (const h of data.highlights) {
      report += `- ${h}\n`;
    }
    report += '\n';
  }

  if (data.warnings.length > 0) {
    report += `## Warnings\n\n`;
    for (const w of data.warnings) {
      report += `- ${w}\n`;
    }
    report += '\n';
  }

  return report;
}

async function sendReportToTelegram(markdown: string): Promise<void> {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    // 截取前 4000 字元（Telegram 限制）
    const truncated = markdown.length > 4000 ? markdown.slice(0, 3997) + '...' : markdown;

    await execAsync(
      `bash /Users/caijunchang/openclaw任務面版設計/scripts/notify-laocai.sh "Report" "done" "${truncated.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
      { timeout: 30000 }
    );
  } catch (err) {
    logger.warn('[Report] Failed to send to Telegram:', err);
  }
}
```

### 6.2 報告排程整合

```typescript
// src/scheduler/report-scheduler.ts
import cron from 'node-cron';
import { generateDailyReport, generateWeeklyReport } from '../services/report-generator';
import { logger } from '../utils/logger';

export function setupReportScheduler(): void {
  // 每天早上 8 點發送日報
  cron.schedule('0 8 * * *', async () => {
    try {
      logger.info('[ReportScheduler] Generating daily report...');
      await generateDailyReport();
      logger.info('[ReportScheduler] Daily report sent');
    } catch (err) {
      logger.error('[ReportScheduler] Daily report failed:', err);
    }
  }, { timezone: 'Asia/Taipei' });

  // 每週一早上 9 點發送週報
  cron.schedule('0 9 * * 1', async () => {
    try {
      logger.info('[ReportScheduler] Generating weekly report...');
      await generateWeeklyReport();
      logger.info('[ReportScheduler] Weekly report sent');
    } catch (err) {
      logger.error('[ReportScheduler] Weekly report failed:', err);
    }
  }, { timezone: 'Asia/Taipei' });

  logger.info('[ReportScheduler] Report schedules registered');
}
```

---

## 七、資料庫定時清理

### 7.1 Supabase / PostgreSQL 清理

```typescript
// src/services/db-cleanup-service.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

const supabase: SupabaseClient = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || ''
);

interface CleanupResult {
  table: string;
  deletedCount: number;
  error?: string;
}

interface CleanupConfig {
  table: string;
  dateColumn: string;
  retentionDays: number;
  condition?: string;         // 額外過濾條件
  batchSize?: number;         // 分批刪除
}

const CLEANUP_CONFIGS: CleanupConfig[] = [
  {
    table: 'execution_logs',
    dateColumn: 'created_at',
    retentionDays: 30,
    batchSize: 1000,
  },
  {
    table: 'sessions',
    dateColumn: 'last_active',
    retentionDays: 7,
    condition: 'status=expired',
  },
  {
    table: 'knowledge_chunks',
    dateColumn: 'updated_at',
    retentionDays: 90,
    condition: 'source=temp',
  },
  {
    table: 'task_history',
    dateColumn: 'completed_at',
    retentionDays: 60,
  },
  {
    table: 'api_logs',
    dateColumn: 'timestamp',
    retentionDays: 14,
    batchSize: 5000,
  },
];

export async function cleanupExpiredData(): Promise<CleanupResult[]> {
  const results: CleanupResult[] = [];
  logger.info('[Cleanup] Starting database cleanup...');

  for (const config of CLEANUP_CONFIGS) {
    try {
      const result = await cleanupTable(config);
      results.push(result);
    } catch (err: any) {
      results.push({
        table: config.table,
        deletedCount: 0,
        error: err.message,
      });
      logger.error(`[Cleanup] Failed to clean ${config.table}:`, err);
    }
  }

  const totalDeleted = results.reduce((sum, r) => sum + r.deletedCount, 0);
  logger.info(`[Cleanup] Completed. Total deleted: ${totalDeleted} records`);

  return results;
}

async function cleanupTable(config: CleanupConfig): Promise<CleanupResult> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays);
  const cutoffISO = cutoffDate.toISOString();

  logger.info(`[Cleanup] Cleaning ${config.table}: records before ${cutoffISO}`);

  let query = supabase
    .from(config.table)
    .delete()
    .lt(config.dateColumn, cutoffISO);

  // 額外條件
  if (config.condition) {
    const [col, val] = config.condition.split('=');
    query = query.eq(col, val);
  }

  // 分批刪除
  if (config.batchSize) {
    query = query.limit(config.batchSize);
  }

  const { data, error, count } = await query.select('id');

  if (error) {
    throw new Error(`Supabase error: ${error.message}`);
  }

  const deletedCount = data?.length ?? count ?? 0;
  logger.info(`[Cleanup] ${config.table}: deleted ${deletedCount} records`);

  return { table: config.table, deletedCount };
}

// 清理孤立檔案（沒有對應 DB 記錄的備份檔）
export async function cleanupOrphanedFiles(): Promise<number> {
  const fs = await import('fs/promises');
  const path = await import('path');

  const uploadsDir = '/Users/caijunchang/.openclaw/uploads';
  let cleaned = 0;

  try {
    const files = await fs.readdir(uploadsDir);
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 天

    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      const stat = await fs.stat(filePath);

      if (now - stat.mtimeMs > maxAge) {
        await fs.unlink(filePath);
        cleaned++;
      }
    }

    logger.info(`[Cleanup] Cleaned ${cleaned} orphaned files`);
  } catch (err) {
    logger.warn('[Cleanup] Orphaned file cleanup failed:', err);
  }

  return cleaned;
}

// 資料庫 VACUUM（PostgreSQL 特有，釋放已刪除空間）
export async function vacuumDatabase(): Promise<void> {
  try {
    // 透過 Supabase RPC 或直接 SQL
    const { error } = await supabase.rpc('vacuum_analyze', {});
    if (error) throw error;
    logger.info('[Cleanup] VACUUM ANALYZE completed');
  } catch (err) {
    logger.warn('[Cleanup] VACUUM not available via Supabase REST, use direct connection');
  }
}
```

### 7.2 清理排程

```typescript
// src/scheduler/cleanup-scheduler.ts
import cron from 'node-cron';
import { cleanupExpiredData, cleanupOrphanedFiles } from '../services/db-cleanup-service';
import { logger } from '../utils/logger';

export function setupCleanupScheduler(): void {
  // 每天凌晨 2 點清理過期資料
  cron.schedule('0 2 * * *', async () => {
    logger.info('[CleanupScheduler] Daily cleanup started');
    const results = await cleanupExpiredData();
    const total = results.reduce((s, r) => s + r.deletedCount, 0);
    logger.info(`[CleanupScheduler] Daily cleanup done: ${total} records removed`);
  }, { timezone: 'Asia/Taipei' });

  // 每週日凌晨 4 點清理孤立檔案
  cron.schedule('0 4 * * 0', async () => {
    logger.info('[CleanupScheduler] Orphaned file cleanup started');
    const count = await cleanupOrphanedFiles();
    logger.info(`[CleanupScheduler] Cleaned ${count} orphaned files`);
  }, { timezone: 'Asia/Taipei' });

  logger.info('[CleanupScheduler] Cleanup schedules registered');
}
```

### 7.3 Log Rotation 腳本

```bash
#!/bin/bash
# scripts/cleanup-logs.sh
# 清理和壓縮舊 log 檔案

set -euo pipefail

LOG_DIRS=(
  "$HOME/.openclaw/automation/logs"
  "$HOME/openclaw任務面版設計/server/logs"
)

MAX_SIZE_MB=50
MAX_AGE_DAYS=30
COMPRESSED_MAX_AGE=90

echo "[$(date)] Log cleanup started"

for LOG_DIR in "${LOG_DIRS[@]}"; do
  [ ! -d "$LOG_DIR" ] && continue
  echo "  Processing: $LOG_DIR"

  # 1. 輪替大檔案
  find "$LOG_DIR" -name "*.log" -size +${MAX_SIZE_MB}M 2>/dev/null | while read -r logfile; do
    ROTATED="${logfile}.$(date +%Y%m%d%H%M%S)"
    echo "    Rotating: $(basename "$logfile") ($(du -h "$logfile" | cut -f1))"
    cp "$logfile" "$ROTATED"
    : > "$logfile"   # 清空原檔（不刪除，以免程式找不到）
    gzip "$ROTATED"
  done

  # 2. 壓縮超過 N 天的 .log 檔
  find "$LOG_DIR" -name "*.log.*" -not -name "*.gz" -mtime +${MAX_AGE_DAYS} 2>/dev/null | while read -r oldlog; do
    echo "    Compressing: $(basename "$oldlog")"
    gzip "$oldlog"
  done

  # 3. 刪除超過 N 天的壓縮檔
  find "$LOG_DIR" -name "*.gz" -mtime +${COMPRESSED_MAX_AGE} 2>/dev/null | while read -r gzfile; do
    echo "    Deleting: $(basename "$gzfile")"
    rm -f "$gzfile"
  done
done

echo "[$(date)] Log cleanup completed"
```

---

## 八、SSL 憑證自動續約

### 8.1 SSL 到期檢查服務

```typescript
// src/services/ssl-checker.ts
import tls from 'tls';
import { logger } from '../utils/logger';

interface SSLCheckResult {
  domain: string;
  valid: boolean;
  issuer: string;
  subject: string;
  validFrom: string;
  validTo: string;
  daysRemaining: number;
  needsRenewal: boolean;
  error?: string;
}

const RENEWAL_THRESHOLD_DAYS = 30;
const URGENT_THRESHOLD_DAYS = 7;

export async function checkSSLCertificate(domain: string, port = 443): Promise<SSLCheckResult> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      {
        host: domain,
        port,
        servername: domain,
        timeout: 10000,
        rejectUnauthorized: false,
      },
      () => {
        const cert = socket.getPeerCertificate();
        socket.destroy();

        if (!cert || !cert.valid_to) {
          resolve({
            domain,
            valid: false,
            issuer: '',
            subject: '',
            validFrom: '',
            validTo: '',
            daysRemaining: 0,
            needsRenewal: true,
            error: 'No certificate found',
          });
          return;
        }

        const validTo = new Date(cert.valid_to);
        const validFrom = new Date(cert.valid_from);
        const now = new Date();
        const daysRemaining = Math.floor((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        resolve({
          domain,
          valid: daysRemaining > 0,
          issuer: typeof cert.issuer === 'object' ? cert.issuer.O || cert.issuer.CN || '' : String(cert.issuer),
          subject: typeof cert.subject === 'object' ? cert.subject.CN || '' : String(cert.subject),
          validFrom: validFrom.toISOString(),
          validTo: validTo.toISOString(),
          daysRemaining,
          needsRenewal: daysRemaining < RENEWAL_THRESHOLD_DAYS,
        });
      }
    );

    socket.on('error', (err) => {
      socket.destroy();
      resolve({
        domain,
        valid: false,
        issuer: '',
        subject: '',
        validFrom: '',
        validTo: '',
        daysRemaining: 0,
        needsRenewal: true,
        error: err.message,
      });
    });

    socket.setTimeout(10000, () => {
      socket.destroy();
      resolve({
        domain,
        valid: false,
        issuer: '',
        subject: '',
        validFrom: '',
        validTo: '',
        daysRemaining: 0,
        needsRenewal: true,
        error: 'Connection timeout',
      });
    });
  });
}

export async function checkAllDomains(domains: string[]): Promise<SSLCheckResult[]> {
  const results: SSLCheckResult[] = [];

  for (const domain of domains) {
    const result = await checkSSLCertificate(domain);
    results.push(result);

    if (result.needsRenewal) {
      const urgency = result.daysRemaining < URGENT_THRESHOLD_DAYS ? 'URGENT' : 'WARNING';
      logger.warn(
        `[SSL] ${urgency}: ${domain} expires in ${result.daysRemaining} days (${result.validTo})`
      );

      // 發送告警
      await sendSSLAlert(domain, result);
    } else {
      logger.info(`[SSL] ${domain}: OK (${result.daysRemaining} days remaining)`);
    }
  }

  return results;
}

async function sendSSLAlert(domain: string, result: SSLCheckResult): Promise<void> {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const message = `SSL Alert: ${domain} expires in ${result.daysRemaining} days`;
    await execAsync(
      `bash /Users/caijunchang/openclaw任務面版設計/scripts/notify-laocai.sh "SSL Alert" "error" "${message}"`,
      { timeout: 30000 }
    );
  } catch (err) {
    logger.error('[SSL] Failed to send alert:', err);
  }
}
```

### 8.2 自動續約腳本（Let's Encrypt / Certbot）

```bash
#!/bin/bash
# scripts/renew-ssl.sh
# 自動檢查並續約 SSL 憑證（Let's Encrypt + Certbot）

set -euo pipefail

DOMAINS=("openclaw.io" "api.openclaw.io")
ALERT_SCRIPT="$HOME/openclaw任務面版設計/scripts/notify-laocai.sh"
LOG_FILE="$HOME/.openclaw/automation/logs/ssl-renew.log"
THRESHOLD_DAYS=30

mkdir -p "$(dirname "$LOG_FILE")"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

alert() {
  log "ALERT: $1"
  [ -f "$ALERT_SCRIPT" ] && bash "$ALERT_SCRIPT" "SSL Renewal" "error" "$1" 2>/dev/null || true
}

log "=== SSL Renewal Check ==="

for domain in "${DOMAINS[@]}"; do
  log "Checking: ${domain}"

  # 取得憑證到期日
  EXPIRY_DATE=$(echo | openssl s_client -servername "$domain" -connect "${domain}:443" 2>/dev/null \
    | openssl x509 -noout -enddate 2>/dev/null \
    | cut -d= -f2 || echo "")

  if [ -z "$EXPIRY_DATE" ]; then
    alert "${domain}: Cannot retrieve certificate info"
    continue
  fi

  # 計算剩餘天數
  EXPIRY_EPOCH=$(date -j -f "%b %d %H:%M:%S %Y %Z" "$EXPIRY_DATE" "+%s" 2>/dev/null || date -d "$EXPIRY_DATE" "+%s" 2>/dev/null || echo "0")
  NOW_EPOCH=$(date "+%s")
  DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

  log "  ${domain}: expires ${EXPIRY_DATE} (${DAYS_LEFT} days left)"

  if [ "$DAYS_LEFT" -lt "$THRESHOLD_DAYS" ]; then
    log "  ${domain}: needs renewal!"

    # 嘗試 certbot renew
    if command -v certbot &>/dev/null; then
      log "  Running certbot renew for ${domain}..."
      if sudo certbot renew --cert-name "$domain" --non-interactive 2>&1 | tee -a "$LOG_FILE"; then
        log "  ${domain}: renewal SUCCESS"
        bash "$ALERT_SCRIPT" "SSL Renewed" "done" "${domain} certificate renewed successfully" 2>/dev/null || true
      else
        alert "${domain}: certbot renew FAILED"
      fi
    else
      alert "${domain}: certbot not installed, cannot auto-renew"
    fi
  else
    log "  ${domain}: OK, no renewal needed"
  fi
done

log "=== SSL Check Complete ==="
```

### 8.3 SSL 排程（每天檢查）

```typescript
// src/scheduler/ssl-scheduler.ts
import cron from 'node-cron';
import { checkAllDomains } from '../services/ssl-checker';
import { logger } from '../utils/logger';

const MONITORED_DOMAINS = [
  'openclaw.io',
  'api.openclaw.io',
  'sky770825.zeabur.app',
];

export function setupSSLScheduler(): void {
  // 每天早上 6 點檢查 SSL
  cron.schedule('0 6 * * *', async () => {
    logger.info('[SSLScheduler] Checking SSL certificates...');
    try {
      const results = await checkAllDomains(MONITORED_DOMAINS);
      const expiring = results.filter((r) => r.needsRenewal);

      if (expiring.length > 0) {
        logger.warn(
          `[SSLScheduler] ${expiring.length} certificate(s) need renewal: ${expiring.map((r) => r.domain).join(', ')}`
        );
      } else {
        logger.info('[SSLScheduler] All certificates are valid');
      }
    } catch (err) {
      logger.error('[SSLScheduler] SSL check failed:', err);
    }
  }, { timezone: 'Asia/Taipei' });

  logger.info('[SSLScheduler] SSL monitoring registered');
}
```

---

## 九、監控告警自動化

### 9.1 監控告警系統

```typescript
// src/services/alert-service.ts
import { logger } from '../utils/logger';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

type AlertLevel = 'info' | 'warning' | 'critical';

interface AlertRule {
  name: string;
  check: () => Promise<{ triggered: boolean; message: string; value?: number }>;
  level: AlertLevel;
  cooldownMinutes: number;  // 告警冷卻時間，避免重複發
}

interface AlertState {
  lastAlerted: Date | null;
  consecutiveFailures: number;
  acknowledged: boolean;
}

class AlertManager {
  private rules: AlertRule[] = [];
  private states: Map<string, AlertState> = new Map();

  addRule(rule: AlertRule): void {
    this.rules.push(rule);
    this.states.set(rule.name, {
      lastAlerted: null,
      consecutiveFailures: 0,
      acknowledged: false,
    });
  }

  async checkAll(): Promise<void> {
    for (const rule of this.rules) {
      try {
        const result = await rule.check();
        const state = this.states.get(rule.name)!;

        if (result.triggered) {
          state.consecutiveFailures++;

          // 檢查冷卻時間
          const now = new Date();
          const cooldownMs = rule.cooldownMinutes * 60 * 1000;
          const canAlert =
            !state.lastAlerted || now.getTime() - state.lastAlerted.getTime() > cooldownMs;

          if (canAlert && !state.acknowledged) {
            await this.sendAlert(rule.level, rule.name, result.message, result.value);
            state.lastAlerted = now;
          }
        } else {
          // 恢復正常
          if (state.consecutiveFailures > 0) {
            logger.info(`[Alert] ${rule.name} recovered after ${state.consecutiveFailures} failures`);
            await this.sendRecovery(rule.name);
          }
          state.consecutiveFailures = 0;
          state.acknowledged = false;
        }
      } catch (err: any) {
        logger.error(`[Alert] Check failed for ${rule.name}:`, err.message);
      }
    }
  }

  private async sendAlert(level: AlertLevel, name: string, message: string, value?: number): Promise<void> {
    const emoji = { info: 'INFO', warning: 'WARN', critical: 'CRIT' }[level];
    const fullMessage = `[${emoji}] ${name}: ${message}${value !== undefined ? ` (value: ${value})` : ''}`;

    logger.warn(`[Alert] ${fullMessage}`);

    // Telegram 通知
    try {
      const escaped = fullMessage.replace(/"/g, '\\"');
      await execAsync(
        `bash /Users/caijunchang/openclaw任務面版設計/scripts/notify-laocai.sh "Monitor Alert" "error" "${escaped}"`,
        { timeout: 30000 }
      );
    } catch (err) {
      logger.error('[Alert] Failed to send Telegram notification:', err);
    }
  }

  private async sendRecovery(name: string): Promise<void> {
    const message = `[RECOVERED] ${name} is back to normal`;
    logger.info(`[Alert] ${message}`);

    try {
      await execAsync(
        `bash /Users/caijunchang/openclaw任務面版設計/scripts/notify-laocai.sh "Monitor Recovery" "done" "${name} recovered"`,
        { timeout: 30000 }
      );
    } catch { /* silent */ }
  }

  acknowledge(ruleName: string): boolean {
    const state = this.states.get(ruleName);
    if (state) {
      state.acknowledged = true;
      return true;
    }
    return false;
  }

  getStatus(): Record<string, AlertState> {
    const result: Record<string, AlertState> = {};
    for (const [name, state] of this.states) {
      result[name] = { ...state };
    }
    return result;
  }
}

// === 建立全域 AlertManager ===

export const alertManager = new AlertManager();

// === 預設告警規則 ===

export function registerDefaultAlertRules(): void {
  // 1. Server 回應時間
  alertManager.addRule({
    name: 'server-response-time',
    level: 'warning',
    cooldownMinutes: 15,
    check: async () => {
      const start = Date.now();
      try {
        const res = await fetch('http://localhost:3011/api/health', {
          signal: AbortSignal.timeout(10000),
        });
        const elapsed = Date.now() - start;
        return {
          triggered: elapsed > 5000,
          message: `Response time: ${elapsed}ms`,
          value: elapsed,
        };
      } catch {
        return { triggered: true, message: 'Server unreachable' };
      }
    },
  });

  // 2. 記憶體使用率
  alertManager.addRule({
    name: 'memory-usage',
    level: 'warning',
    cooldownMinutes: 30,
    check: async () => {
      const usage = process.memoryUsage();
      const heapPercent = Math.round((usage.heapUsed / usage.heapTotal) * 100);
      return {
        triggered: heapPercent > 85,
        message: `Heap usage: ${heapPercent}%`,
        value: heapPercent,
      };
    },
  });

  // 3. 磁碟使用率
  alertManager.addRule({
    name: 'disk-usage',
    level: 'critical',
    cooldownMinutes: 60,
    check: async () => {
      try {
        const { stdout } = await execAsync("df -h / | awk 'NR==2 {print $5}' | tr -d '%'");
        const usage = parseInt(stdout.trim(), 10);
        return {
          triggered: usage > 90,
          message: `Disk usage: ${usage}%`,
          value: usage,
        };
      } catch {
        return { triggered: false, message: 'Unable to check disk' };
      }
    },
  });

  // 4. 程序存活檢查
  alertManager.addRule({
    name: 'process-alive',
    level: 'critical',
    cooldownMinutes: 5,
    check: async () => {
      try {
        const { stdout } = await execAsync('pgrep -f "dist/index.js" || echo ""');
        const alive = stdout.trim().length > 0;
        return {
          triggered: !alive,
          message: alive ? 'Process running' : 'Process not found!',
        };
      } catch {
        return { triggered: true, message: 'Cannot check process' };
      }
    },
  });

  // 5. Log 大小監控
  alertManager.addRule({
    name: 'log-size',
    level: 'warning',
    cooldownMinutes: 120,
    check: async () => {
      try {
        const { stdout } = await execAsync(
          `du -sm $HOME/.openclaw/automation/logs/ 2>/dev/null | cut -f1`
        );
        const sizeMB = parseInt(stdout.trim(), 10) || 0;
        return {
          triggered: sizeMB > 500,
          message: `Log directory: ${sizeMB}MB`,
          value: sizeMB,
        };
      } catch {
        return { triggered: false, message: 'Unable to check logs' };
      }
    },
  });

  // 6. 任務佇列積壓
  alertManager.addRule({
    name: 'task-queue-backlog',
    level: 'warning',
    cooldownMinutes: 30,
    check: async () => {
      try {
        const res = await fetch('http://localhost:3011/api/openclaw/tasks', {
          headers: {
            Authorization: `Bearer ${process.env.VITE_OPENCLAW_API_KEY || ''}`,
          },
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) return { triggered: false, message: 'API unavailable' };

        const data = await res.json();
        const tasks = Array.isArray(data) ? data : data.tasks || [];
        const pendingCount = tasks.filter(
          (t: any) => t.status === 'pending' || t.status === 'ready'
        ).length;

        return {
          triggered: pendingCount > 50,
          message: `${pendingCount} tasks pending`,
          value: pendingCount,
        };
      } catch {
        return { triggered: false, message: 'Cannot check tasks' };
      }
    },
  });

  logger.info('[AlertManager] 6 default alert rules registered');
}
```

### 9.2 監控排程

```typescript
// src/scheduler/monitor-scheduler.ts
import cron from 'node-cron';
import { alertManager, registerDefaultAlertRules } from '../services/alert-service';
import { logger } from '../utils/logger';

export function setupMonitorScheduler(): void {
  // 註冊預設告警規則
  registerDefaultAlertRules();

  // 每 5 分鐘檢查所有告警規則
  cron.schedule('*/5 * * * *', async () => {
    try {
      await alertManager.checkAll();
    } catch (err) {
      logger.error('[MonitorScheduler] Alert check failed:', err);
    }
  }, { timezone: 'Asia/Taipei' });

  logger.info('[MonitorScheduler] Monitoring schedules registered');
}
```

### 9.3 監控 Dashboard API

```typescript
// src/routes/monitor-api.ts
import { Router, Request, Response } from 'express';
import { alertManager } from '../services/alert-service';
import { performHealthCheck } from '../services/health-check-service';
import { listBackups } from '../services/backup-service';
import { scheduler } from '../scheduler/scheduler-manager';

const router = Router();

// GET /api/monitor/status -- 完整監控狀態
router.get('/status', async (req: Request, res: Response) => {
  try {
    const [health, alerts, schedulerStats, backups] = await Promise.all([
      performHealthCheck(),
      Promise.resolve(alertManager.getStatus()),
      Promise.resolve(scheduler.getStats()),
      listBackups().catch(() => []),
    ]);

    res.json({
      timestamp: new Date().toISOString(),
      health,
      alerts,
      scheduler: schedulerStats,
      latestBackup: backups[0] || null,
      backupCount: backups.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/monitor/alerts/:name/acknowledge -- 確認告警
router.post('/alerts/:name/acknowledge', (req: Request, res: Response) => {
  const { name } = req.params;
  const success = alertManager.acknowledge(name);
  res.json({ acknowledged: success, rule: name });
});

// POST /api/monitor/trigger/:jobName -- 手動觸發排程
router.post('/trigger/:jobName', async (req: Request, res: Response) => {
  const { jobName } = req.params;
  try {
    await scheduler.triggerNow(jobName);
    res.json({ triggered: true, job: jobName });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
```

---

## 十、常見問題與排錯

### 10.1 node-cron 不觸發

| 問題 | 原因 | 解法 |
|------|------|------|
| Job 完全不執行 | Cron 表達式無效 | 用 `cron.validate()` 先驗證 |
| 時間不對 | 時區問題 | 設定 `timezone: 'Asia/Taipei'` |
| 同一 Job 重疊執行 | 上一次還沒跑完 | 加 `isRunning` 鎖（見 SchedulerManager） |
| process 結束後就沒了 | node-cron 是 in-process | 用 PM2 / launchd 保活 |

### 10.2 launchd 不觸發

```bash
# 診斷步驟

# 1. 確認 plist 已載入
launchctl list | grep com.openclaw

# 2. 查看 exit status（0=成功，非0=失敗）
launchctl list com.openclaw.health-check
# 輸出格式：PID  Status  Label

# 3. 查看 log
tail -20 ~/.openclaw/automation/logs/health-check.log
tail -20 ~/.openclaw/automation/logs/health-check-error.log

# 4. 常見錯誤
# 78 = 找不到執行檔 → 確認 ProgramArguments 路徑正確
# 126 = 權限不足 → chmod +x script.sh
# 127 = command not found → 設定 EnvironmentVariables PATH

# 5. 重新載入
launchctl unload ~/Library/LaunchAgents/com.openclaw.health-check.plist
launchctl load ~/Library/LaunchAgents/com.openclaw.health-check.plist

# 6. 手動測試腳本
bash /Users/caijunchang/openclaw任務面版設計/scripts/health-check.sh
```

### 10.3 BullMQ 常見問題

```typescript
// 問題：Redis 斷線重連
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times: number) {
    const delay = Math.min(times * 200, 5000);
    console.log(`Redis retry #${times}, delay: ${delay}ms`);
    return delay;
  },
  reconnectOnError(err: Error) {
    const targetErrors = ['READONLY', 'ECONNRESET'];
    return targetErrors.some((e) => err.message.includes(e));
  },
});

// 問題：重複任務沒有去重
// 解法：用 jobId 去重
await scheduledQueue.add(
  'daily-backup',
  { taskType: 'backup' },
  {
    repeat: { pattern: '0 3 * * *' },
    jobId: 'daily-backup-unique',  // 加上唯一 ID
  }
);

// 問題：Worker 卡住
// 解法：設定 lockDuration + stalledInterval
const worker = new Worker('queue', processor, {
  connection,
  lockDuration: 60000,        // 60 秒鎖定
  stalledInterval: 30000,     // 30 秒檢查一次卡住的 job
  maxStalledCount: 2,         // 卡住 2 次標為 failed
});
```

### 10.4 排程最佳實務

```
1. 永遠加 try/catch    -- 排程 handler 的未捕獲異常會導致靜默失敗
2. 加執行時間 log      -- 記錄每次執行的開始/結束/耗時
3. 加重疊鎖            -- 防止上一次還沒跑完又觸發
4. 加告警               -- 失敗超過 N 次要通知
5. 設定合理的 timeout   -- 避免卡死佔住資源
6. 用冪等操作           -- 同一個 job 跑兩次結果要一樣
7. 分開業務時段         -- 備份和清理放凌晨，報告放工作時間
8. 有 graceful shutdown -- SIGTERM 來了要正確停止排程
9. 有監控 dashboard    -- 要能看到所有排程的狀態和歷史
10. 定期回顧            -- 每月檢查一次哪些排程還有用
```

### 10.5 完整啟動整合

```typescript
// src/index.ts（server 主入口整合排程）
import express from 'express';
import { registerAllJobs } from './scheduler/register-jobs';
import { setupReportScheduler } from './scheduler/report-scheduler';
import { setupCleanupScheduler } from './scheduler/cleanup-scheduler';
import { setupSSLScheduler } from './scheduler/ssl-scheduler';
import { setupMonitorScheduler } from './scheduler/monitor-scheduler';
import monitorRouter from './routes/monitor-api';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT || 3011;

// ... 其他 middleware 和路由 ...

// 監控 API
app.use('/api/monitor', monitorRouter);

// 啟動所有排程
function initializeSchedulers(): void {
  logger.info('[Init] Registering scheduled jobs...');
  registerAllJobs();
  setupReportScheduler();
  setupCleanupScheduler();
  setupSSLScheduler();
  setupMonitorScheduler();
  logger.info('[Init] All schedulers initialized');
}

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  initializeSchedulers();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('[Shutdown] SIGTERM received, stopping schedulers...');
  // 各排程模組的 stopAll() 會由 process event 觸發
  process.exit(0);
});
```

---

## 附錄：排程時間速查表

| 場景 | Cron 表達式 | 說明 |
|------|-------------|------|
| 每 30 秒 | `*/30 * * * * *` | 需 6 位 cron（node-cron 支援） |
| 每分鐘 | `* * * * *` | 高頻監控 |
| 每 5 分鐘 | `*/5 * * * *` | 健康檢查 |
| 每 15 分鐘 | `*/15 * * * *` | 心跳 |
| 每 30 分鐘 | `*/30 * * * *` | 資料同步 |
| 每小時 | `0 * * * *` | 小時報告 |
| 每 2 小時 | `0 */2 * * *` | 中頻任務 |
| 每天午夜 | `0 0 * * *` | 日切 |
| 每天凌晨 2 點 | `0 2 * * *` | 清理 |
| 每天凌晨 3 點 | `0 3 * * *` | 備份 |
| 每天早上 8 點 | `0 8 * * *` | 日報 |
| 每天晚上 11 點 | `0 23 * * *` | 夜間任務 |
| 週一到週五 9 點 | `0 9 * * 1-5` | 工作日 |
| 每週日凌晨 | `0 0 * * 0` | 週末維護 |
| 每週一 9 點 | `0 9 * * 1` | 週報 |
| 每月 1 號 | `0 0 1 * *` | 月報 |
| 每月 1 號和 15 號 | `0 0 1,15 * *` | 半月 |
| 每季第一天 | `0 0 1 1,4,7,10 *` | 季報 |
| 每年 1 月 1 日 | `0 0 1 1 *` | 年度 |
