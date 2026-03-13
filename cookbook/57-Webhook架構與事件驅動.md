---
tags: [webhook, event-driven, queue, BullMQ, Redis, n8n, real-time, SSE]
date: 2026-03-05
category: cookbook
---

# 57 — Webhook 架構與事件驅動

> 完整的 Webhook 接收/發送、事件驅動架構、任務佇列、即時推播手冊。
> 所有代碼可直接用於 Node.js/Express 專案，TypeScript 撰寫。
> 最後更新：2026-03-05

---

## 目錄

1. [Webhook 接收端設計](#1-webhook-接收端設計)
2. [Webhook 簽章驗證](#2-webhook-簽章驗證)
3. [冪等性設計](#3-冪等性設計)
4. [重試機制](#4-重試機制)
5. [事件驅動架構 — Event Emitter](#5-事件驅動架構--event-emitter)
6. [事件驅動架構 — Message Queue](#6-事件驅動架構--message-queue)
7. [BullMQ + Redis 任務佇列](#7-bullmq--redis-任務佇列)
8. [Server-Sent Events (SSE) 即時推播](#8-server-sent-events-sse-即時推播)
9. [WebSocket 雙向通訊](#9-websocket-雙向通訊)
10. [n8n Webhook 節點進階用法](#10-n8n-webhook-節點進階用法)
11. [Webhook 安全 — HMAC / IP 白名單 / Rate Limit](#11-webhook-安全--hmac--ip-白名單--rate-limit)
12. [錯誤處理與 Dead Letter Queue](#12-錯誤處理與-dead-letter-queue)
13. [完整範例：Webhook → Queue → SSE 全鏈路](#13-完整範例webhook--queue--sse-全鏈路)

---

## 1. Webhook 接收端設計

### 基本原則

- **快速回應 200**：收到 Webhook 後立即回 200，不要在 handler 裡做重活
- **非同步處理**：把實際工作丟到佇列或背景 worker
- **冪等性**：同一個 event 收到多次，結果相同
- **簽章驗證**：永遠驗證來源的 HMAC 簽章
- **記錄原始 payload**：先存 raw body，再解析處理

### 基礎 Webhook 接收器

```typescript
// src/webhook/receiver.ts
import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

interface WebhookEvent {
  id: string;
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

interface WebhookPayload {
  events: WebhookEvent[];
}

// 保留 raw body 供簽章驗證
const rawBodyMiddleware = express.json({
  verify: (req: Request, _res: Response, buf: Buffer) => {
    (req as any).rawBody = buf;
  },
  limit: '5mb',
});

// Webhook 接收 router
const webhookRouter = express.Router();

// 掛載 raw body 中間件
webhookRouter.use(rawBodyMiddleware);

// 通用 Webhook 端點
webhookRouter.post('/webhook/:source', async (req: Request, res: Response) => {
  const { source } = req.params;
  const rawBody = (req as any).rawBody as Buffer;
  const signature = req.headers['x-webhook-signature'] as string;

  // 1. 立即回 200（不要讓發送端等）
  res.status(200).json({ received: true });

  // 2. 背景處理
  try {
    const payload = req.body as WebhookPayload;

    // 記錄原始 payload（debug 用）
    console.log(`[Webhook] source=${source} events=${payload.events?.length || 0}`);

    // 3. 丟到佇列處理（見 Section 7）
    for (const event of payload.events || []) {
      await enqueueWebhookEvent(source, event, rawBody.toString());
    }
  } catch (err) {
    // 已經回 200 了，這裡只記 log，不影響 response
    console.error(`[Webhook] 處理失敗: ${err}`);
  }
});

// 佇列推送（佔位，Section 7 會完整實作）
async function enqueueWebhookEvent(
  source: string,
  event: WebhookEvent,
  rawPayload: string
): Promise<void> {
  // 暫時同步處理，後面換成 BullMQ
  console.log(`[Queue] enqueue: source=${source} type=${event.type} id=${event.id}`);
}

export { webhookRouter };
```

### Webhook 來源註冊管理

```typescript
// src/webhook/registry.ts

interface WebhookSource {
  name: string;
  secret: string;
  signatureHeader: string;
  signatureAlgorithm: 'sha256' | 'sha1';
  signaturePrefix: string;  // 例如 "sha256=" 或 ""
  ipWhitelist?: string[];
  enabled: boolean;
  createdAt: Date;
}

class WebhookRegistry {
  private sources: Map<string, WebhookSource> = new Map();

  register(source: WebhookSource): void {
    this.sources.set(source.name, source);
    console.log(`[Registry] 註冊 Webhook 來源: ${source.name}`);
  }

  get(name: string): WebhookSource | undefined {
    return this.sources.get(name);
  }

  isEnabled(name: string): boolean {
    return this.sources.get(name)?.enabled ?? false;
  }

  listAll(): WebhookSource[] {
    return Array.from(this.sources.values());
  }

  remove(name: string): boolean {
    return this.sources.delete(name);
  }
}

// 全域 singleton
export const webhookRegistry = new WebhookRegistry();

// 預設來源註冊
webhookRegistry.register({
  name: 'github',
  secret: process.env.GITHUB_WEBHOOK_SECRET || '',
  signatureHeader: 'x-hub-signature-256',
  signatureAlgorithm: 'sha256',
  signaturePrefix: 'sha256=',
  enabled: true,
  createdAt: new Date(),
});

webhookRegistry.register({
  name: 'stripe',
  secret: process.env.STRIPE_WEBHOOK_SECRET || '',
  signatureHeader: 'stripe-signature',
  signatureAlgorithm: 'sha256',
  signaturePrefix: '',
  enabled: true,
  createdAt: new Date(),
});

webhookRegistry.register({
  name: 'line',
  secret: process.env.LINE_CHANNEL_SECRET || '',
  signatureHeader: 'x-line-signature',
  signatureAlgorithm: 'sha256',
  signaturePrefix: '',
  enabled: true,
  createdAt: new Date(),
});
```

---

## 2. Webhook 簽章驗證

### 通用 HMAC 驗證中間件

```typescript
// src/webhook/verify-signature.ts
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { webhookRegistry } from './registry';

/**
 * 通用簽章驗證中間件
 * 支援 GitHub / Stripe / LINE / 自訂來源
 */
export function verifyWebhookSignature(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const source = req.params.source;
  const config = webhookRegistry.get(source);

  if (!config) {
    res.status(404).json({ error: `Unknown webhook source: ${source}` });
    return;
  }

  if (!config.enabled) {
    res.status(403).json({ error: `Webhook source disabled: ${source}` });
    return;
  }

  const rawBody = (req as any).rawBody as Buffer;
  if (!rawBody) {
    res.status(400).json({ error: 'Missing raw body for signature verification' });
    return;
  }

  const receivedSignature = req.headers[config.signatureHeader] as string;
  if (!receivedSignature) {
    res.status(401).json({ error: `Missing signature header: ${config.signatureHeader}` });
    return;
  }

  // 計算預期簽章
  const hmac = crypto.createHmac(config.signatureAlgorithm, config.secret);
  hmac.update(rawBody);
  const expectedSignature = config.signaturePrefix + hmac.digest('hex');

  // 使用 timingSafeEqual 防止計時攻擊
  const isValid = safeCompare(receivedSignature, expectedSignature);

  if (!isValid) {
    console.warn(`[Webhook] 簽章驗證失敗: source=${source}`);
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  next();
}

/**
 * 安全比較（防止計時攻擊）
 */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // 長度不同時仍然做比較，避免洩漏長度資訊
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(a); // 故意用 a 的長度
    crypto.timingSafeEqual(bufA, bufB);
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Stripe 專用簽章驗證
 * Stripe 簽章格式：t=timestamp,v1=signature
 */
export function verifyStripeSignature(
  rawBody: Buffer,
  signatureHeader: string,
  secret: string,
  toleranceSeconds: number = 300
): boolean {
  const elements = signatureHeader.split(',');
  const timestamp = elements
    .find(e => e.startsWith('t='))
    ?.substring(2);
  const signatures = elements
    .filter(e => e.startsWith('v1='))
    .map(e => e.substring(3));

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  // 檢查 timestamp 容忍範圍（防重放攻擊）
  const ts = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > toleranceSeconds) {
    console.warn(`[Stripe] 簽章時間戳超出容忍範圍: diff=${now - ts}s`);
    return false;
  }

  // 計算簽章：HMAC-SHA256(timestamp + "." + rawBody)
  const signedPayload = `${timestamp}.${rawBody.toString()}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return signatures.some(sig => safeCompare(sig, expectedSignature));
}

/**
 * LINE 專用簽章驗證
 * LINE 用 Base64 編碼的 HMAC-SHA256
 */
export function verifyLineSignature(
  rawBody: Buffer,
  signature: string,
  channelSecret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', channelSecret)
    .update(rawBody)
    .digest('base64');

  return safeCompare(signature, expectedSignature);
}
```

---

## 3. 冪等性設計

### 冪等性 Key 存儲

```typescript
// src/webhook/idempotency.ts
import crypto from 'crypto';

interface IdempotencyRecord {
  key: string;
  result: unknown;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * 冪等性管理器
 * 確保同一個 Webhook event 不會被重複處理
 */
class IdempotencyStore {
  // 生產環境用 Redis，這裡用 Map 示範
  private store: Map<string, IdempotencyRecord> = new Map();
  private defaultTTL = 24 * 60 * 60 * 1000; // 24 小時

  /**
   * 產生冪等性 key
   * 優先用 event 自帶的 ID，否則用 payload hash
   */
  generateKey(source: string, eventId?: string, payload?: string): string {
    if (eventId) {
      return `idem:${source}:${eventId}`;
    }
    // 沒有 eventId 就用 payload hash
    const hash = crypto.createHash('sha256').update(payload || '').digest('hex').slice(0, 16);
    return `idem:${source}:${hash}`;
  }

  /**
   * 檢查是否已處理過
   * 返回 null 表示沒處理過，否則返回之前的結果
   */
  async check(key: string): Promise<unknown | null> {
    const record = this.store.get(key);
    if (!record) return null;

    // 檢查是否過期
    if (record.expiresAt < new Date()) {
      this.store.delete(key);
      return null;
    }

    return record.result;
  }

  /**
   * 記錄處理結果
   */
  async set(key: string, result: unknown, ttlMs?: number): Promise<void> {
    const now = new Date();
    this.store.set(key, {
      key,
      result,
      createdAt: now,
      expiresAt: new Date(now.getTime() + (ttlMs || this.defaultTTL)),
    });
  }

  /**
   * 定期清理過期記錄
   */
  cleanup(): void {
    const now = new Date();
    let cleaned = 0;
    for (const [key, record] of this.store) {
      if (record.expiresAt < now) {
        this.store.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`[Idempotency] 清理 ${cleaned} 筆過期記錄`);
    }
  }
}

export const idempotencyStore = new IdempotencyStore();

// 每小時清理一次
setInterval(() => idempotencyStore.cleanup(), 60 * 60 * 1000);
```

### Redis 版冪等性存儲（生產環境）

```typescript
// src/webhook/idempotency-redis.ts
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export class RedisIdempotencyStore {
  private prefix = 'idem:';
  private defaultTTL = 86400; // 24 小時（秒）

  async check(key: string): Promise<unknown | null> {
    const value = await redis.get(this.prefix + key);
    if (!value) return null;
    return JSON.parse(value);
  }

  async set(key: string, result: unknown, ttlSeconds?: number): Promise<void> {
    await redis.set(
      this.prefix + key,
      JSON.stringify(result),
      'EX',
      ttlSeconds || this.defaultTTL
    );
  }

  /**
   * 原子性「檢查並鎖定」
   * 用 SET NX 確保只有一個 worker 處理
   */
  async acquireLock(key: string, ttlSeconds: number = 300): Promise<boolean> {
    const lockKey = `lock:${this.prefix}${key}`;
    const result = await redis.set(lockKey, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async releaseLock(key: string): Promise<void> {
    await redis.del(`lock:${this.prefix}${key}`);
  }
}

export const redisIdempotency = new RedisIdempotencyStore();
```

### 冪等性中間件

```typescript
// src/webhook/idempotency-middleware.ts
import { Request, Response, NextFunction } from 'express';
import { idempotencyStore } from './idempotency';

/**
 * 冪等性中間件
 * 如果 event 已處理過，直接回傳之前的結果
 */
export function idempotencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const source = req.params.source;
  const eventId = req.headers['x-event-id'] as string
    || req.body?.events?.[0]?.id
    || req.body?.id;

  const rawBody = (req as any).rawBody?.toString();
  const key = idempotencyStore.generateKey(source, eventId, rawBody);

  // 把 key 掛到 req 上，handler 完成後可以存結果
  (req as any).idempotencyKey = key;

  idempotencyStore.check(key).then(existingResult => {
    if (existingResult !== null) {
      console.log(`[Idempotency] 重複事件，跳過: key=${key}`);
      res.status(200).json({ received: true, duplicate: true });
      return;
    }
    next();
  }).catch(err => {
    console.error(`[Idempotency] 檢查失敗: ${err}`);
    next(); // 查不到就當作沒處理過，繼續
  });
}
```

---

## 4. 重試機制

### Webhook 發送端重試

```typescript
// src/webhook/sender.ts
import axios, { AxiosError } from 'axios';
import crypto from 'crypto';

interface WebhookDelivery {
  id: string;
  url: string;
  payload: Record<string, unknown>;
  secret: string;
  maxRetries: number;
  retryCount: number;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  status: 'pending' | 'delivered' | 'failed' | 'exhausted';
  statusCode?: number;
  error?: string;
}

/**
 * Webhook 發送器（含指數退避重試）
 */
class WebhookSender {
  private retryDelays = [1000, 5000, 30000, 120000, 600000];
  // 1秒、5秒、30秒、2分鐘、10分鐘

  /**
   * 發送 Webhook
   */
  async send(delivery: WebhookDelivery): Promise<boolean> {
    const body = JSON.stringify(delivery.payload);

    // 計算 HMAC 簽章
    const signature = crypto
      .createHmac('sha256', delivery.secret)
      .update(body)
      .digest('hex');

    try {
      const response = await axios.post(delivery.url, delivery.payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Id': delivery.id,
          'X-Webhook-Timestamp': new Date().toISOString(),
          'X-Webhook-Retry': String(delivery.retryCount),
        },
        timeout: 30000, // 30 秒超時
        validateStatus: (status) => status >= 200 && status < 300,
      });

      delivery.status = 'delivered';
      delivery.statusCode = response.status;
      delivery.lastAttemptAt = new Date();
      console.log(`[Webhook] 發送成功: id=${delivery.id} status=${response.status}`);
      return true;

    } catch (err) {
      const axiosErr = err as AxiosError;
      delivery.retryCount++;
      delivery.lastAttemptAt = new Date();
      delivery.statusCode = axiosErr.response?.status;
      delivery.error = axiosErr.message;

      if (delivery.retryCount >= delivery.maxRetries) {
        delivery.status = 'exhausted';
        console.error(`[Webhook] 重試耗盡: id=${delivery.id} retries=${delivery.retryCount}`);
        return false;
      }

      // 計算下次重試時間（指數退避）
      const delayIndex = Math.min(delivery.retryCount - 1, this.retryDelays.length - 1);
      const delay = this.retryDelays[delayIndex];
      // 加入 jitter（+-20%）避免雷擊效應
      const jitter = delay * 0.2 * (Math.random() * 2 - 1);
      const actualDelay = delay + jitter;

      delivery.nextRetryAt = new Date(Date.now() + actualDelay);
      delivery.status = 'pending';

      console.warn(
        `[Webhook] 發送失敗，排入重試: id=${delivery.id} ` +
        `retry=${delivery.retryCount}/${delivery.maxRetries} ` +
        `nextRetry=${actualDelay.toFixed(0)}ms`
      );

      // 排程重試
      setTimeout(() => this.send(delivery), actualDelay);
      return false;
    }
  }

  /**
   * 批次發送（同一事件發送給多個訂閱者）
   */
  async broadcast(
    urls: string[],
    payload: Record<string, unknown>,
    secret: string,
    maxRetries: number = 5
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    const promises = urls.map(async (url) => {
      const delivery: WebhookDelivery = {
        id: crypto.randomUUID(),
        url,
        payload,
        secret,
        maxRetries,
        retryCount: 0,
        status: 'pending',
      };
      const success = await this.send(delivery);
      results.set(url, success);
    });

    await Promise.allSettled(promises);
    return results;
  }
}

export const webhookSender = new WebhookSender();
```

---

## 5. 事件驅動架構 — Event Emitter

### 類型安全的 Event Bus

```typescript
// src/events/event-bus.ts

type EventMap = {
  'task:created': { taskId: string; name: string; owner: string };
  'task:updated': { taskId: string; changes: Record<string, unknown> };
  'task:completed': { taskId: string; completedBy: string; duration: number };
  'task:failed': { taskId: string; error: string; retryable: boolean };
  'webhook:received': { source: string; eventType: string; payload: unknown };
  'webhook:processed': { source: string; eventId: string; result: unknown };
  'user:login': { userId: string; ip: string; userAgent: string };
  'system:error': { code: string; message: string; stack?: string };
  'system:health': { status: 'ok' | 'degraded' | 'down'; details: Record<string, unknown> };
};

type EventName = keyof EventMap;
type EventHandler<T extends EventName> = (data: EventMap[T]) => void | Promise<void>;

/**
 * 類型安全的事件匯流排
 * 支援同步/非同步 handler、優先順序、一次性監聽
 */
class TypedEventBus {
  private handlers: Map<string, Array<{ handler: Function; priority: number; once: boolean }>> = new Map();
  private deadLetterHandlers: Array<(event: string, data: unknown, error: Error) => void> = [];

  /**
   * 監聽事件
   */
  on<T extends EventName>(
    event: T,
    handler: EventHandler<T>,
    priority: number = 0
  ): () => void {
    this.addHandler(event, handler, priority, false);
    // 回傳取消監聽的函式
    return () => this.off(event, handler);
  }

  /**
   * 一次性監聽
   */
  once<T extends EventName>(
    event: T,
    handler: EventHandler<T>,
    priority: number = 0
  ): void {
    this.addHandler(event, handler, priority, true);
  }

  /**
   * 取消監聽
   */
  off<T extends EventName>(event: T, handler: EventHandler<T>): void {
    const list = this.handlers.get(event);
    if (!list) return;
    const idx = list.findIndex(h => h.handler === handler);
    if (idx !== -1) list.splice(idx, 1);
  }

  /**
   * 發送事件
   */
  async emit<T extends EventName>(event: T, data: EventMap[T]): Promise<void> {
    const list = this.handlers.get(event);
    if (!list || list.length === 0) {
      console.debug(`[EventBus] 無 handler: ${event}`);
      return;
    }

    // 按優先順序排序（數字大的先跑）
    const sorted = [...list].sort((a, b) => b.priority - a.priority);

    // 收集要移除的一次性 handler
    const toRemove: Function[] = [];

    for (const entry of sorted) {
      try {
        const result = entry.handler(data);
        if (result instanceof Promise) {
          await result;
        }
        if (entry.once) {
          toRemove.push(entry.handler);
        }
      } catch (err) {
        console.error(`[EventBus] handler 失敗: event=${event}`, err);
        // 通知 dead letter handler
        for (const dlh of this.deadLetterHandlers) {
          try {
            dlh(event, data, err as Error);
          } catch { /* ignore */ }
        }
      }
    }

    // 移除一次性 handler
    for (const fn of toRemove) {
      this.off(event, fn as any);
    }
  }

  /**
   * 註冊 Dead Letter Handler（處理失敗的事件）
   */
  onDeadLetter(handler: (event: string, data: unknown, error: Error) => void): void {
    this.deadLetterHandlers.push(handler);
  }

  /**
   * 列出所有已註冊的事件
   */
  listEvents(): string[] {
    return Array.from(this.handlers.keys());
  }

  private addHandler(event: string, handler: Function, priority: number, once: boolean): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push({ handler, priority, once });
  }
}

// 全域 singleton
export const eventBus = new TypedEventBus();
```

### 使用範例

```typescript
// src/events/handlers.ts
import { eventBus } from './event-bus';

// 任務建立 → 通知 + 記錄
eventBus.on('task:created', async (data) => {
  console.log(`[Handler] 任務建立: ${data.name} by ${data.owner}`);
  // 發 Telegram 通知
  await sendTelegramNotification(`新任務: ${data.name}`);
}, 10); // 優先順序 10（先跑）

eventBus.on('task:created', async (data) => {
  // 寫入資料庫 audit log
  await insertAuditLog('task_created', data);
}, 5); // 優先順序 5（後跑）

// 任務完成 → 觸發後續
eventBus.on('task:completed', async (data) => {
  console.log(`[Handler] 任務完成: ${data.taskId} 耗時 ${data.duration}ms`);
});

// 系統錯誤 → 告警
eventBus.on('system:error', async (data) => {
  console.error(`[Alert] 系統錯誤: ${data.code} - ${data.message}`);
  await sendTelegramAlert(`系統錯誤: ${data.code}\n${data.message}`);
});

// Dead Letter 處理
eventBus.onDeadLetter((event, data, error) => {
  console.error(`[DeadLetter] event=${event} error=${error.message}`);
});

// 佔位函式
async function sendTelegramNotification(msg: string) {
  console.log(`[Telegram] ${msg}`);
}
async function sendTelegramAlert(msg: string) {
  console.error(`[TelegramAlert] ${msg}`);
}
async function insertAuditLog(action: string, data: unknown) {
  console.log(`[AuditLog] ${action}`, data);
}
```

---

## 6. 事件驅動架構 — Message Queue

### 訊息佇列抽象層

```typescript
// src/queue/queue-interface.ts

export interface QueueMessage<T = unknown> {
  id: string;
  topic: string;
  data: T;
  metadata: {
    producer: string;
    timestamp: number;
    retryCount: number;
    maxRetries: number;
    priority?: number;
  };
}

export interface QueueConsumerOptions {
  concurrency?: number;
  batchSize?: number;
  pollIntervalMs?: number;
  visibilityTimeoutMs?: number;
}

export interface IMessageQueue {
  /**
   * 發布訊息到指定 topic
   */
  publish<T>(topic: string, data: T, options?: {
    priority?: number;
    delayMs?: number;
    maxRetries?: number;
  }): Promise<string>;

  /**
   * 訂閱 topic，收到訊息時呼叫 handler
   */
  subscribe<T>(
    topic: string,
    handler: (message: QueueMessage<T>) => Promise<void>,
    options?: QueueConsumerOptions
  ): Promise<void>;

  /**
   * 確認訊息已處理完成
   */
  ack(messageId: string): Promise<void>;

  /**
   * 拒絕訊息（重新排入佇列或進 DLQ）
   */
  nack(messageId: string, requeue?: boolean): Promise<void>;
}
```

### 記憶體版 Message Queue（開發用）

```typescript
// src/queue/in-memory-queue.ts
import crypto from 'crypto';
import { IMessageQueue, QueueMessage, QueueConsumerOptions } from './queue-interface';

export class InMemoryQueue implements IMessageQueue {
  private queues: Map<string, QueueMessage[]> = new Map();
  private dlq: Map<string, QueueMessage[]> = new Map();
  private handlers: Map<string, (msg: QueueMessage) => Promise<void>> = new Map();
  private processing: Set<string> = new Set();

  async publish<T>(topic: string, data: T, options?: {
    priority?: number;
    delayMs?: number;
    maxRetries?: number;
  }): Promise<string> {
    const id = crypto.randomUUID();
    const message: QueueMessage<T> = {
      id,
      topic,
      data,
      metadata: {
        producer: 'local',
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: options?.maxRetries ?? 3,
        priority: options?.priority,
      },
    };

    if (!this.queues.has(topic)) {
      this.queues.set(topic, []);
    }

    if (options?.delayMs) {
      setTimeout(() => {
        this.queues.get(topic)!.push(message);
        this.processNext(topic);
      }, options.delayMs);
    } else {
      this.queues.get(topic)!.push(message);
      this.processNext(topic);
    }

    return id;
  }

  async subscribe<T>(
    topic: string,
    handler: (message: QueueMessage<T>) => Promise<void>,
    _options?: QueueConsumerOptions
  ): Promise<void> {
    this.handlers.set(topic, handler as any);
    if (!this.queues.has(topic)) {
      this.queues.set(topic, []);
    }
    console.log(`[InMemoryQueue] 訂閱 topic: ${topic}`);
  }

  async ack(messageId: string): Promise<void> {
    this.processing.delete(messageId);
  }

  async nack(messageId: string, requeue: boolean = true): Promise<void> {
    this.processing.delete(messageId);
    // 簡化處理：不重新排入
    if (!requeue) {
      console.log(`[InMemoryQueue] 訊息進 DLQ: ${messageId}`);
    }
  }

  private async processNext(topic: string): Promise<void> {
    const queue = this.queues.get(topic);
    const handler = this.handlers.get(topic);
    if (!queue || !handler || queue.length === 0) return;

    const message = queue.shift()!;
    if (this.processing.has(message.id)) return;
    this.processing.add(message.id);

    try {
      await handler(message);
      await this.ack(message.id);
    } catch (err) {
      message.metadata.retryCount++;
      if (message.metadata.retryCount < message.metadata.maxRetries) {
        queue.push(message);
        console.warn(`[InMemoryQueue] 重試: ${message.id} (${message.metadata.retryCount}/${message.metadata.maxRetries})`);
      } else {
        // 進 DLQ
        if (!this.dlq.has(topic)) this.dlq.set(topic, []);
        this.dlq.get(topic)!.push(message);
        console.error(`[InMemoryQueue] 進 DLQ: ${message.id}`);
      }
      this.processing.delete(message.id);
    }
  }

  getDLQ(topic: string): QueueMessage[] {
    return this.dlq.get(topic) || [];
  }
}
```

---

## 7. BullMQ + Redis 任務佇列

### 安裝

```bash
npm install bullmq ioredis
```

### BullMQ Queue 封裝

```typescript
// src/queue/bull-queue.ts
import { Queue, Worker, Job, QueueEvents, FlowProducer } from 'bullmq';
import { Redis } from 'ioredis';

// Redis 連線
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // BullMQ 要求
});

// ---- Queue 定義 ----

// Webhook 事件處理佇列
export const webhookQueue = new Queue('webhook-events', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000, // 初始 2 秒，之後 4s、8s、16s、32s
    },
    removeOnComplete: {
      age: 24 * 3600,  // 完成後保留 24 小時
      count: 1000,      // 最多保留 1000 筆
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // 失敗保留 7 天（debug 用）
    },
  },
});

// 通知發送佇列
export const notificationQueue = new Queue('notifications', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 5000 },
    removeOnComplete: { age: 3600 },
  },
});

// 排程任務佇列
export const scheduledQueue = new Queue('scheduled-tasks', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: { age: 3600 },
  },
});

// ---- 推入任務 ----

interface WebhookJobData {
  source: string;
  eventType: string;
  eventId: string;
  payload: unknown;
  rawPayload: string;
  receivedAt: string;
}

/**
 * 推送 Webhook 事件到佇列
 */
export async function enqueueWebhookEvent(
  source: string,
  event: { id: string; type: string; data: unknown },
  rawPayload: string
): Promise<string> {
  const jobData: WebhookJobData = {
    source,
    eventType: event.type,
    eventId: event.id,
    payload: event.data,
    rawPayload,
    receivedAt: new Date().toISOString(),
  };

  const job = await webhookQueue.add(
    `${source}:${event.type}`,  // job name
    jobData,
    {
      jobId: `${source}-${event.id}`, // 用 eventId 當 jobId 保證冪等
      priority: getPriority(source, event.type),
    }
  );

  console.log(`[BullMQ] 排入佇列: jobId=${job.id} source=${source} type=${event.type}`);
  return job.id!;
}

/**
 * 優先順序規則
 */
function getPriority(source: string, eventType: string): number {
  // 數字越小優先順序越高
  if (source === 'stripe' && eventType.startsWith('payment')) return 1;
  if (source === 'github' && eventType === 'push') return 2;
  if (eventType.includes('error') || eventType.includes('fail')) return 3;
  return 5; // 預設
}

/**
 * 排程延遲任務
 */
export async function scheduleTask(
  name: string,
  data: Record<string, unknown>,
  delayMs: number
): Promise<string> {
  const job = await scheduledQueue.add(name, data, {
    delay: delayMs,
  });
  console.log(`[BullMQ] 排程任務: ${name} 延遲 ${delayMs}ms`);
  return job.id!;
}

/**
 * 排程重複任務（Cron）
 */
export async function scheduleRecurring(
  name: string,
  data: Record<string, unknown>,
  cron: string
): Promise<void> {
  await scheduledQueue.add(name, data, {
    repeat: { pattern: cron },
  });
  console.log(`[BullMQ] 重複任務: ${name} cron=${cron}`);
}
```

### BullMQ Worker 處理器

```typescript
// src/queue/bull-worker.ts
import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { eventBus } from '../events/event-bus';

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// ---- Webhook Worker ----

const webhookWorker = new Worker(
  'webhook-events',
  async (job: Job) => {
    const { source, eventType, eventId, payload } = job.data;
    console.log(`[Worker] 處理 Webhook: source=${source} type=${eventType} id=${eventId}`);

    // 根據來源分派處理
    switch (source) {
      case 'github':
        await handleGitHubEvent(eventType, payload);
        break;
      case 'stripe':
        await handleStripeEvent(eventType, payload);
        break;
      case 'line':
        await handleLINEEvent(eventType, payload);
        break;
      default:
        await handleGenericEvent(source, eventType, payload);
    }

    // 發出已處理事件
    await eventBus.emit('webhook:processed', { source, eventId, result: { success: true } });

    return { processed: true, source, eventType };
  },
  {
    connection: redisConnection,
    concurrency: 5,          // 同時處理 5 個任務
    limiter: {
      max: 100,              // 每分鐘最多 100 個
      duration: 60000,
    },
  }
);

// Worker 事件監聽
webhookWorker.on('completed', (job) => {
  console.log(`[Worker] 完成: ${job.id}`);
});

webhookWorker.on('failed', (job, err) => {
  console.error(`[Worker] 失敗: ${job?.id} error=${err.message} attempts=${job?.attemptsMade}`);
});

webhookWorker.on('error', (err) => {
  console.error(`[Worker] 系統錯誤:`, err);
});

// ---- 事件處理函式 ----

async function handleGitHubEvent(type: string, payload: any): Promise<void> {
  switch (type) {
    case 'push':
      console.log(`[GitHub] Push: ${payload.repository?.full_name} ref=${payload.ref}`);
      // 觸發 CI/CD、通知等
      break;
    case 'pull_request':
      console.log(`[GitHub] PR: ${payload.action} #${payload.number}`);
      break;
    case 'issues':
      console.log(`[GitHub] Issue: ${payload.action} #${payload.issue?.number}`);
      break;
    default:
      console.log(`[GitHub] 未處理事件: ${type}`);
  }
}

async function handleStripeEvent(type: string, payload: any): Promise<void> {
  switch (type) {
    case 'payment_intent.succeeded':
      console.log(`[Stripe] 付款成功: ${payload.id} amount=${payload.amount}`);
      // 更新訂單狀態、發送收據
      break;
    case 'payment_intent.payment_failed':
      console.log(`[Stripe] 付款失敗: ${payload.id}`);
      // 通知使用者
      break;
    case 'customer.subscription.updated':
      console.log(`[Stripe] 訂閱更新: ${payload.id}`);
      break;
    default:
      console.log(`[Stripe] 未處理事件: ${type}`);
  }
}

async function handleLINEEvent(type: string, payload: any): Promise<void> {
  switch (type) {
    case 'message':
      console.log(`[LINE] 訊息: userId=${payload.source?.userId} text=${payload.message?.text}`);
      break;
    case 'follow':
      console.log(`[LINE] 新追蹤: userId=${payload.source?.userId}`);
      break;
    case 'unfollow':
      console.log(`[LINE] 取消追蹤: userId=${payload.source?.userId}`);
      break;
    default:
      console.log(`[LINE] 未處理事件: ${type}`);
  }
}

async function handleGenericEvent(source: string, type: string, payload: any): Promise<void> {
  console.log(`[Generic] source=${source} type=${type}`, JSON.stringify(payload).slice(0, 200));
}

// ---- Notification Worker ----

const notificationWorker = new Worker(
  'notifications',
  async (job: Job) => {
    const { channel, recipient, message } = job.data;
    console.log(`[Notification] 發送: channel=${channel} to=${recipient}`);

    switch (channel) {
      case 'telegram':
        // 呼叫 Telegram Bot API
        break;
      case 'email':
        // 呼叫 SMTP / SendGrid
        break;
      case 'line':
        // 呼叫 LINE Push API
        break;
    }

    return { sent: true };
  },
  {
    connection: redisConnection,
    concurrency: 10,
  }
);

// ---- Scheduled Worker ----

const scheduledWorker = new Worker(
  'scheduled-tasks',
  async (job: Job) => {
    console.log(`[Scheduled] 執行: ${job.name}`, job.data);
    // 根據 job.name 分派不同邏輯
    return { executed: true };
  },
  {
    connection: redisConnection,
    concurrency: 3,
  }
);

export { webhookWorker, notificationWorker, scheduledWorker };
```

### BullMQ Dashboard（Bull Board）

```typescript
// src/queue/bull-dashboard.ts
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { webhookQueue, notificationQueue, scheduledQueue } from './bull-queue';

/**
 * 建立 BullMQ 監控面板
 * 掛載到 Express app 的 /admin/queues 路徑
 */
export function setupBullDashboard() {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [
      new BullMQAdapter(webhookQueue),
      new BullMQAdapter(notificationQueue),
      new BullMQAdapter(scheduledQueue),
    ],
    serverAdapter,
  });

  return serverAdapter.getRouter();
}
```

```typescript
// 在 Express app 掛載
import express from 'express';
import { setupBullDashboard } from './queue/bull-dashboard';

const app = express();

// Bull Board UI（加 admin 認證）
app.use('/admin/queues', requireAdmin, setupBullDashboard());

function requireAdmin(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (authHeader === `Bearer ${process.env.ADMIN_API_KEY}`) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
```

---

## 8. Server-Sent Events (SSE) 即時推播

### SSE 基礎概念

| 特性 | SSE | WebSocket |
|------|-----|-----------|
| 方向 | 伺服器 → 客戶端（單向） | 雙向 |
| 協定 | HTTP/1.1+ | ws:// / wss:// |
| 自動重連 | 瀏覽器內建 | 需自己實作 |
| 適用場景 | 即時通知、進度更新、股價 | 聊天室、遊戲、協作編輯 |
| 複雜度 | 低 | 中高 |

### SSE Server 實作

```typescript
// src/sse/sse-manager.ts
import { Request, Response } from 'express';
import crypto from 'crypto';

interface SSEClient {
  id: string;
  res: Response;
  channels: Set<string>;
  userId?: string;
  connectedAt: Date;
  lastEventId: number;
}

/**
 * SSE 連線管理器
 * 支援頻道訂閱、客戶端管理、心跳
 */
class SSEManager {
  private clients: Map<string, SSEClient> = new Map();
  private eventCounter = 0;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // 每 30 秒送心跳，保持連線
    this.heartbeatInterval = setInterval(() => {
      this.broadcast('heartbeat', { timestamp: Date.now() }, ':heartbeat');
    }, 30000);
  }

  /**
   * 處理新的 SSE 連線
   */
  handleConnection(req: Request, res: Response): string {
    const clientId = crypto.randomUUID();
    const channels = (req.query.channels as string)?.split(',') || ['default'];
    const userId = (req as any).userId; // 從 auth middleware 拿

    // 設定 SSE 標準 headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Nginx 用，關閉 proxy buffering
      'Access-Control-Allow-Origin': '*',
    });

    // 送初始連線確認
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId, channels })}\n\n`);

    // 註冊客戶端
    const client: SSEClient = {
      id: clientId,
      res,
      channels: new Set(channels),
      userId,
      connectedAt: new Date(),
      lastEventId: 0,
    };
    this.clients.set(clientId, client);

    console.log(`[SSE] 新連線: ${clientId} channels=[${channels}] total=${this.clients.size}`);

    // 處理 Last-Event-ID（自動重連時重播遺漏事件）
    const lastEventId = req.headers['last-event-id'];
    if (lastEventId) {
      this.replayEvents(clientId, parseInt(lastEventId as string, 10));
    }

    // 處理斷線
    req.on('close', () => {
      this.clients.delete(clientId);
      console.log(`[SSE] 斷線: ${clientId} total=${this.clients.size}`);
    });

    return clientId;
  }

  /**
   * 發送事件到指定頻道
   */
  send(channel: string, eventType: string, data: unknown): void {
    this.eventCounter++;
    const payload = this.formatSSE(eventType, data, this.eventCounter);

    let sentCount = 0;
    for (const client of this.clients.values()) {
      if (client.channels.has(channel) || client.channels.has('*')) {
        try {
          client.res.write(payload);
          client.lastEventId = this.eventCounter;
          sentCount++;
        } catch (err) {
          // 寫入失敗，移除客戶端
          this.clients.delete(client.id);
        }
      }
    }

    console.log(`[SSE] 發送: channel=${channel} type=${eventType} clients=${sentCount}`);
  }

  /**
   * 廣播給所有連線
   */
  broadcast(eventType: string, data: unknown, comment?: string): void {
    this.eventCounter++;
    const payload = this.formatSSE(eventType, data, this.eventCounter, comment);

    for (const client of this.clients.values()) {
      try {
        client.res.write(payload);
        client.lastEventId = this.eventCounter;
      } catch {
        this.clients.delete(client.id);
      }
    }
  }

  /**
   * 發送給特定使用者
   */
  sendToUser(userId: string, eventType: string, data: unknown): void {
    this.eventCounter++;
    const payload = this.formatSSE(eventType, data, this.eventCounter);

    for (const client of this.clients.values()) {
      if (client.userId === userId) {
        try {
          client.res.write(payload);
          client.lastEventId = this.eventCounter;
        } catch {
          this.clients.delete(client.id);
        }
      }
    }
  }

  /**
   * SSE 格式化
   */
  private formatSSE(event: string, data: unknown, id: number, comment?: string): string {
    let output = '';
    if (comment) output += `: ${comment}\n`;
    output += `id: ${id}\n`;
    output += `event: ${event}\n`;
    output += `data: ${JSON.stringify(data)}\n\n`;
    return output;
  }

  /**
   * 重播遺漏事件（簡化版，生產環境應該用 Redis Stream）
   */
  private replayEvents(_clientId: string, _fromEventId: number): void {
    // 實際實作需要事件持久化存儲
    console.log(`[SSE] 重播請求: from=${_fromEventId}`);
  }

  /**
   * 取得連線統計
   */
  getStats(): { totalClients: number; channelStats: Record<string, number> } {
    const channelStats: Record<string, number> = {};
    for (const client of this.clients.values()) {
      for (const ch of client.channels) {
        channelStats[ch] = (channelStats[ch] || 0) + 1;
      }
    }
    return { totalClients: this.clients.size, channelStats };
  }

  /**
   * 關閉所有連線
   */
  close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    for (const client of this.clients.values()) {
      client.res.end();
    }
    this.clients.clear();
  }
}

export const sseManager = new SSEManager();
```

### SSE Express 路由

```typescript
// src/sse/sse-routes.ts
import { Router, Request, Response } from 'express';
import { sseManager } from './sse-manager';

const sseRouter = Router();

// SSE 連線端點
sseRouter.get('/events', (req: Request, res: Response) => {
  sseManager.handleConnection(req, res);
});

// 發送事件 API（內部或 admin 用）
sseRouter.post('/events/send', (req: Request, res: Response) => {
  const { channel, eventType, data } = req.body;
  sseManager.send(channel || 'default', eventType || 'message', data);
  res.json({ sent: true });
});

// SSE 狀態
sseRouter.get('/events/stats', (_req: Request, res: Response) => {
  res.json(sseManager.getStats());
});

export { sseRouter };
```

### 前端 SSE 客戶端

```typescript
// src/client/sse-client.ts

interface SSEClientOptions {
  url: string;
  channels?: string[];
  onMessage?: (event: string, data: unknown) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  reconnectDelay?: number;
  maxRetries?: number;
}

/**
 * SSE 前端客戶端
 * 自動重連、事件分派、斷線偵測
 */
class SSEClient {
  private eventSource: EventSource | null = null;
  private options: SSEClientOptions;
  private retryCount = 0;
  private handlers: Map<string, Array<(data: unknown) => void>> = new Map();

  constructor(options: SSEClientOptions) {
    this.options = {
      reconnectDelay: 3000,
      maxRetries: 10,
      ...options,
    };
  }

  /**
   * 建立連線
   */
  connect(): void {
    const params = new URLSearchParams();
    if (this.options.channels?.length) {
      params.set('channels', this.options.channels.join(','));
    }

    const url = `${this.options.url}?${params.toString()}`;
    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      console.log('[SSE] 連線成功');
      this.retryCount = 0;
      this.options.onOpen?.();
    };

    this.eventSource.onerror = (err) => {
      console.error('[SSE] 連線錯誤', err);
      this.options.onError?.(err);

      if (this.retryCount < (this.options.maxRetries || 10)) {
        this.retryCount++;
        console.log(`[SSE] 重連中... (${this.retryCount}/${this.options.maxRetries})`);
      } else {
        console.error('[SSE] 超過最大重試次數，停止重連');
        this.disconnect();
      }
    };

    // 監聽通用 message 事件
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.options.onMessage?.('message', data);
        this.dispatch('message', data);
      } catch (err) {
        console.error('[SSE] 解析訊息失敗', err);
      }
    };

    // 監聽自訂事件
    this.eventSource.addEventListener('connected', (event: any) => {
      const data = JSON.parse(event.data);
      console.log('[SSE] 收到連線確認:', data);
      this.dispatch('connected', data);
    });

    this.eventSource.addEventListener('task:updated', (event: any) => {
      const data = JSON.parse(event.data);
      this.dispatch('task:updated', data);
    });

    this.eventSource.addEventListener('notification', (event: any) => {
      const data = JSON.parse(event.data);
      this.dispatch('notification', data);
    });
  }

  /**
   * 監聽特定事件類型
   */
  on(event: string, handler: (data: unknown) => void): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);

      // 動態添加 EventSource 監聽器
      this.eventSource?.addEventListener(event, (e: any) => {
        try {
          const data = JSON.parse(e.data);
          this.dispatch(event, data);
        } catch { /* ignore */ }
      });
    }
    this.handlers.get(event)!.push(handler);

    // 回傳取消函式
    return () => {
      const list = this.handlers.get(event);
      if (list) {
        const idx = list.indexOf(handler);
        if (idx !== -1) list.splice(idx, 1);
      }
    };
  }

  /**
   * 斷線
   */
  disconnect(): void {
    this.eventSource?.close();
    this.eventSource = null;
    console.log('[SSE] 已斷線');
  }

  private dispatch(event: string, data: unknown): void {
    const list = this.handlers.get(event);
    if (list) {
      for (const handler of list) {
        try {
          handler(data);
        } catch (err) {
          console.error(`[SSE] handler 錯誤: event=${event}`, err);
        }
      }
    }
    this.options.onMessage?.(event, data);
  }
}

export { SSEClient };

// 使用範例
/*
const sse = new SSEClient({
  url: 'http://localhost:3011/api/events',
  channels: ['tasks', 'notifications'],
  onMessage: (event, data) => {
    console.log('收到事件:', event, data);
  },
});

sse.connect();

// 監聽特定事件
const unsub = sse.on('task:updated', (data) => {
  console.log('任務更新:', data);
  // 更新 UI
});

// 取消監聽
unsub();
*/
```

---

## 9. WebSocket 雙向通訊

### 安裝

```bash
npm install ws
npm install -D @types/ws
```

### WebSocket Server

```typescript
// src/ws/websocket-server.ts
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { Server as HttpServer } from 'http';
import crypto from 'crypto';

interface WSClient {
  id: string;
  ws: WebSocket;
  userId?: string;
  rooms: Set<string>;
  isAlive: boolean;
  connectedAt: Date;
  metadata: Record<string, unknown>;
}

interface WSMessage {
  type: string;
  room?: string;
  data: unknown;
  requestId?: string;
}

type MessageHandler = (client: WSClient, data: unknown) => Promise<unknown>;

/**
 * WebSocket 伺服器
 * 支援房間、認證、心跳偵測、訊息路由
 */
class WSManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WSClient> = new Map();
  private rooms: Map<string, Set<string>> = new Map();
  private messageHandlers: Map<string, MessageHandler> = new Map();
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * 初始化 WebSocket 伺服器
   */
  init(httpServer: HttpServer, path: string = '/ws'): void {
    this.wss = new WebSocketServer({
      server: httpServer,
      path,
      verifyClient: (info, cb) => {
        // 認證檢查
        const token = new URL(info.req.url || '', 'http://localhost').searchParams.get('token');
        if (!token) {
          cb(false, 401, 'Unauthorized');
          return;
        }
        // 驗證 token（這裡簡化處理）
        cb(true);
      },
    });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    // 心跳偵測：每 30 秒 ping 一次
    this.pingInterval = setInterval(() => {
      for (const client of this.clients.values()) {
        if (!client.isAlive) {
          console.log(`[WS] 心跳失敗，斷開: ${client.id}`);
          client.ws.terminate();
          this.removeClient(client.id);
          continue;
        }
        client.isAlive = false;
        client.ws.ping();
      }
    }, 30000);

    console.log(`[WS] WebSocket 伺服器啟動: path=${path}`);
  }

  /**
   * 處理新連線
   */
  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const clientId = crypto.randomUUID();
    const url = new URL(req.url || '', 'http://localhost');
    const userId = url.searchParams.get('userId') || undefined;

    const client: WSClient = {
      id: clientId,
      ws,
      userId,
      rooms: new Set(),
      isAlive: true,
      connectedAt: new Date(),
      metadata: {},
    };

    this.clients.set(clientId, client);
    console.log(`[WS] 新連線: ${clientId} userId=${userId} total=${this.clients.size}`);

    // 送歡迎訊息
    this.sendToClient(clientId, {
      type: 'connected',
      data: { clientId, timestamp: Date.now() },
    });

    // Pong 回應
    ws.on('pong', () => {
      client.isAlive = true;
    });

    // 訊息處理
    ws.on('message', async (raw: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(raw.toString());
        await this.handleMessage(client, message);
      } catch (err) {
        this.sendToClient(clientId, {
          type: 'error',
          data: { message: 'Invalid message format' },
        });
      }
    });

    // 斷線處理
    ws.on('close', (code, reason) => {
      console.log(`[WS] 斷線: ${clientId} code=${code} reason=${reason}`);
      this.removeClient(clientId);
    });

    ws.on('error', (err) => {
      console.error(`[WS] 錯誤: ${clientId}`, err.message);
    });
  }

  /**
   * 訊息路由
   */
  private async handleMessage(client: WSClient, message: WSMessage): Promise<void> {
    const { type, data, requestId } = message;

    // 內建指令
    switch (type) {
      case 'join':
        this.joinRoom(client.id, data as string);
        return;
      case 'leave':
        this.leaveRoom(client.id, data as string);
        return;
      case 'ping':
        this.sendToClient(client.id, { type: 'pong', data: { timestamp: Date.now() } });
        return;
    }

    // 自訂 handler
    const handler = this.messageHandlers.get(type);
    if (handler) {
      try {
        const result = await handler(client, data);
        if (requestId) {
          // 請求-回應模式
          this.sendToClient(client.id, {
            type: `${type}:response`,
            data: result,
            requestId,
          });
        }
      } catch (err: any) {
        this.sendToClient(client.id, {
          type: 'error',
          data: { message: err.message, originalType: type },
          requestId,
        });
      }
    } else {
      console.warn(`[WS] 未知訊息類型: ${type}`);
    }
  }

  /**
   * 註冊訊息處理器
   */
  handle(type: string, handler: MessageHandler): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * 發送給特定客戶端
   */
  sendToClient(clientId: string, message: Omit<WSMessage, 'room'>): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  /**
   * 發送給房間所有人
   */
  sendToRoom(room: string, message: WSMessage, excludeClientId?: string): void {
    const members = this.rooms.get(room);
    if (!members) return;

    const payload = JSON.stringify({ ...message, room });
    for (const clientId of members) {
      if (clientId === excludeClientId) continue;
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }

  /**
   * 廣播給所有人
   */
  broadcast(message: WSMessage, excludeClientId?: string): void {
    const payload = JSON.stringify(message);
    for (const [id, client] of this.clients) {
      if (id === excludeClientId) continue;
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }

  /**
   * 加入房間
   */
  joinRoom(clientId: string, room: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.rooms.add(room);
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)!.add(clientId);

    console.log(`[WS] ${clientId} 加入房間: ${room}`);
    this.sendToClient(clientId, { type: 'room:joined', data: { room } });
  }

  /**
   * 離開房間
   */
  leaveRoom(clientId: string, room: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.rooms.delete(room);
    this.rooms.get(room)?.delete(clientId);

    // 清空的房間刪除
    if (this.rooms.get(room)?.size === 0) {
      this.rooms.delete(room);
    }

    this.sendToClient(clientId, { type: 'room:left', data: { room } });
  }

  /**
   * 移除客戶端
   */
  private removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // 從所有房間移除
    for (const room of client.rooms) {
      this.rooms.get(room)?.delete(clientId);
      if (this.rooms.get(room)?.size === 0) {
        this.rooms.delete(room);
      }
    }

    this.clients.delete(clientId);
  }

  /**
   * 取得統計
   */
  getStats(): Record<string, unknown> {
    return {
      totalClients: this.clients.size,
      totalRooms: this.rooms.size,
      rooms: Object.fromEntries(
        Array.from(this.rooms.entries()).map(([name, members]) => [name, members.size])
      ),
    };
  }

  /**
   * 關閉
   */
  close(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    for (const client of this.clients.values()) {
      client.ws.close(1001, 'Server shutting down');
    }
    this.wss?.close();
  }
}

export const wsManager = new WSManager();
```

### WebSocket 使用範例

```typescript
// src/ws/ws-handlers.ts
import { wsManager } from './websocket-server';

// 註冊訊息處理器
wsManager.handle('chat:send', async (client, data: any) => {
  const { room, message } = data;

  // 廣播到房間（排除自己）
  wsManager.sendToRoom(room, {
    type: 'chat:message',
    room,
    data: {
      from: client.userId || client.id,
      message,
      timestamp: Date.now(),
    },
  }, client.id);

  return { sent: true };
});

wsManager.handle('task:subscribe', async (client, data: any) => {
  const { taskId } = data;
  wsManager.joinRoom(client.id, `task:${taskId}`);
  return { subscribed: true, taskId };
});

wsManager.handle('cursor:move', async (client, data: any) => {
  // 協作游標（即時文檔編輯場景）
  const { room, position } = data;
  wsManager.sendToRoom(room, {
    type: 'cursor:update',
    room,
    data: { userId: client.userId, position },
  }, client.id);
});
```

### 在 Express 中掛載

```typescript
// src/app.ts
import http from 'http';
import express from 'express';
import { wsManager } from './ws/websocket-server';
import './ws/ws-handlers'; // 載入 handler 註冊

const app = express();
const server = http.createServer(app);

// 初始化 WebSocket
wsManager.init(server, '/ws');

// WS 狀態 API
app.get('/api/ws/stats', (_req, res) => {
  res.json(wsManager.getStats());
});

server.listen(3011, () => {
  console.log('Server running on port 3011');
});
```

---

## 10. n8n Webhook 節點進階用法

### Webhook 節點設定重點

```
節點類型：Webhook（n8n-nodes-base.webhook）
用途：接收外部 HTTP 請求，觸發 workflow
```

### 常見設定

| 設定 | 說明 | 建議 |
|------|------|------|
| HTTP Method | GET / POST / PUT / DELETE | 通常用 POST |
| Path | Webhook URL 路徑 | 用有意義的名稱如 `line-webhook` |
| Authentication | None / Basic / Header | 加 Header Auth |
| Response Mode | Immediately / Last Node | 需快速回 200 用 Immediately |
| Response Code | HTTP 回應碼 | 200 |
| Response Data | 自訂回應內容 | `{ "received": true }` |

### Webhook + 簽章驗證（Code 節點）

```javascript
// n8n Code 節點 — 驗證 Webhook 簽章
const crypto = require('crypto');

const items = $input.all();
const webhookData = items[0].json;

// 取得 headers（n8n 的 Webhook 節點會把 headers 放在 $input.first().json.headers）
const signature = webhookData.headers['x-webhook-signature'];
const rawBody = JSON.stringify(webhookData.body);
const secret = $env.WEBHOOK_SECRET;

if (!signature || !secret) {
  throw new Error('Missing signature or secret');
}

// 計算預期簽章
const expected = 'sha256=' + crypto
  .createHmac('sha256', secret)
  .update(rawBody)
  .digest('hex');

// 比較
if (signature !== expected) {
  throw new Error('Invalid webhook signature');
}

// 驗證通過，傳遞 body
return [{ json: webhookData.body }];
```

### Webhook + 冪等性檢查（Code 節點）

```javascript
// n8n Code 節點 — 冪等性檢查（搭配 Supabase）
const eventId = $input.first().json.body?.id || $input.first().json.body?.events?.[0]?.id;

if (!eventId) {
  // 沒有 event ID，直接處理
  return $input.all();
}

// 查詢 Supabase 是否已處理過
const supabaseUrl = $env.SUPABASE_URL;
const supabaseKey = $env.SUPABASE_KEY;

const checkResponse = await fetch(
  `${supabaseUrl}/rest/v1/webhook_events?event_id=eq.${eventId}&select=id`,
  {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
  }
);

const existing = await checkResponse.json();

if (existing.length > 0) {
  // 已處理過，跳過
  return [];
}

// 記錄此事件
await fetch(`${supabaseUrl}/rest/v1/webhook_events`, {
  method: 'POST',
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    event_id: eventId,
    source: 'webhook',
    processed_at: new Date().toISOString(),
  }),
});

return $input.all();
```

### Webhook Respond 節點（自訂回應）

```
用 "Respond to Webhook" 節點可以在 workflow 執行完畢後回傳自訂內容。

流程：Webhook (Response Mode: Last Node)
  → 處理邏輯
  → Respond to Webhook

Respond to Webhook 設定：
- Response Body: 自訂 JSON
- Response Code: 200
- Response Headers: 可加自訂 header
```

### n8n Webhook 進階：分流處理

```
[Webhook] → [Switch: 依 event type 分流]
  ├─ payment.success → [處理付款成功]
  ├─ payment.failed → [處理付款失敗]
  ├─ user.created → [新會員流程]
  └─ default → [記錄未知事件]
```

### n8n 呼叫外部 Webhook（HTTP Request 節點）

```typescript
// 透過 OpenClaw API 觸發 n8n Webhook
// 假設 n8n 有一個 path 為 "task-done" 的 Webhook workflow

async function triggerN8nWebhook(
  taskName: string,
  status: string,
  note: string
): Promise<void> {
  const n8nUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678';

  const response = await fetch(`${n8nUrl}/webhook/task-done`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      taskName,
      status,
      note,
      timestamp: new Date().toISOString(),
      source: 'openclaw-server',
    }),
  });

  if (!response.ok) {
    console.error(`[n8n] Webhook 觸發失敗: ${response.status} ${response.statusText}`);
  }
}
```

---

## 11. Webhook 安全 — HMAC / IP 白名單 / Rate Limit

### HMAC 簽章驗證（完整流程）

```typescript
// src/webhook/security.ts
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * HMAC 簽章產生（發送端用）
 */
export function generateHMAC(
  payload: string,
  secret: string,
  algorithm: string = 'sha256'
): string {
  return crypto.createHmac(algorithm, secret).update(payload).digest('hex');
}

/**
 * HMAC 簽章驗證（接收端用）
 * 支援多種平台格式
 */
export function createHMACVerifier(config: {
  secret: string;
  headerName: string;
  algorithm?: string;
  prefix?: string;
  encoding?: 'hex' | 'base64';
}): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    const rawBody = (req as any).rawBody as Buffer;
    const received = req.headers[config.headerName.toLowerCase()] as string;

    if (!rawBody || !received) {
      res.status(401).json({ error: 'Missing body or signature' });
      return;
    }

    const hmac = crypto.createHmac(config.algorithm || 'sha256', config.secret);
    hmac.update(rawBody);
    const expected = (config.prefix || '') + hmac.digest(config.encoding || 'hex');

    if (!safeTimingCompare(received, expected)) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    next();
  };
}

function safeTimingCompare(a: string, b: string): boolean {
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
```

### IP 白名單

```typescript
// src/webhook/ip-whitelist.ts
import { Request, Response, NextFunction } from 'express';
import { isIP } from 'net';

interface IPWhitelistConfig {
  allowedIPs: string[];         // 精確 IP
  allowedCIDRs: string[];       // CIDR 範圍
  trustProxy: boolean;          // 是否信任 proxy 的 X-Forwarded-For
  bypassInDevelopment: boolean; // 開發環境跳過檢查
}

/**
 * 已知服務的 IP 範圍
 */
export const KNOWN_IP_RANGES: Record<string, string[]> = {
  github: [
    '192.30.252.0/22',
    '185.199.108.0/22',
    '140.82.112.0/20',
    '143.55.64.0/20',
  ],
  stripe: [
    // Stripe 建議用簽章驗證，不靠 IP
  ],
  line: [
    // LINE Platform IPs（需定期更新）
  ],
};

/**
 * IP 白名單中間件
 */
export function ipWhitelist(config: IPWhitelistConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 開發環境跳過
    if (config.bypassInDevelopment && process.env.NODE_ENV === 'development') {
      next();
      return;
    }

    const clientIP = getClientIP(req, config.trustProxy);

    // 檢查精確 IP
    if (config.allowedIPs.includes(clientIP)) {
      next();
      return;
    }

    // 檢查 CIDR 範圍
    for (const cidr of config.allowedCIDRs) {
      if (isIPInCIDR(clientIP, cidr)) {
        next();
        return;
      }
    }

    console.warn(`[IPWhitelist] 拒絕: ${clientIP}`);
    res.status(403).json({ error: 'IP not allowed' });
  };
}

/**
 * 取得客戶端 IP
 */
function getClientIP(req: Request, trustProxy: boolean): string {
  if (trustProxy) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      // 第一個是真實 IP
      return (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim();
    }
    const realIP = req.headers['x-real-ip'] as string;
    if (realIP) return realIP;
  }
  return req.socket.remoteAddress || '';
}

/**
 * 檢查 IP 是否在 CIDR 範圍內
 */
function isIPInCIDR(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split('/');
  const mask = ~(2 ** (32 - parseInt(bits)) - 1);
  const ipNum = ipToNumber(ip);
  const rangeNum = ipToNumber(range);
  return (ipNum & mask) === (rangeNum & mask);
}

function ipToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
}
```

### Rate Limiting（滑動窗口）

```typescript
// src/webhook/rate-limiter.ts
import { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number;       // 時間窗口（毫秒）
  maxRequests: number;    // 窗口內最大請求數
  keyGenerator?: (req: Request) => string;  // 限速 key 產生器
  message?: string;
  statusCode?: number;
  headers?: boolean;      // 是否回傳限速 headers
}

interface RateLimitEntry {
  timestamps: number[];
}

/**
 * 滑動窗口限速器
 * 比固定窗口更精確，沒有邊界突發問題
 */
class SlidingWindowRateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    // 每分鐘清理過期記錄
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  check(key: string, windowMs: number, maxRequests: number): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
  } {
    const now = Date.now();
    const windowStart = now - windowMs;

    let entry = this.store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.store.set(key, entry);
    }

    // 移除窗口外的記錄
    entry.timestamps = entry.timestamps.filter(t => t > windowStart);

    const remaining = Math.max(0, maxRequests - entry.timestamps.length);
    const allowed = entry.timestamps.length < maxRequests;

    if (allowed) {
      entry.timestamps.push(now);
    }

    // 計算重置時間（最早的記錄過期時）
    const resetAt = entry.timestamps.length > 0
      ? entry.timestamps[0] + windowMs
      : now + windowMs;

    return { allowed, remaining, resetAt };
  }

  private cleanup(): void {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 分鐘沒活動就清掉
    for (const [key, entry] of this.store) {
      if (entry.timestamps.length === 0 ||
          entry.timestamps[entry.timestamps.length - 1] < now - maxAge) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}

const limiter = new SlidingWindowRateLimiter();

/**
 * Rate Limit 中間件
 */
export function rateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (req) => req.ip || 'unknown',
    message = 'Too many requests, please try again later',
    statusCode = 429,
    headers = true,
  } = config;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const result = limiter.check(key, windowMs, maxRequests);

    if (headers) {
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));
    }

    if (!result.allowed) {
      res.setHeader('Retry-After', Math.ceil((result.resetAt - Date.now()) / 1000));
      res.status(statusCode).json({
        error: message,
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
      });
      return;
    }

    next();
  };
}

/**
 * 預設限速配置
 */
export const webhookRateLimit = rateLimit({
  windowMs: 60 * 1000,   // 1 分鐘
  maxRequests: 100,       // 每分鐘 100 次
  keyGenerator: (req) => `webhook:${req.params.source || 'default'}:${req.ip}`,
  headers: true,
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 60,
  keyGenerator: (req) => `api:${req.headers.authorization || req.ip}`,
});

export const strictRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Rate limit exceeded for sensitive endpoint',
});
```

### Redis 版 Rate Limiter（生產環境）

```typescript
// src/webhook/rate-limiter-redis.ts
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * Redis 滑動窗口限速（Sorted Set 實作）
 * 適合多實例部署
 */
export async function redisRateLimit(
  key: string,
  windowMs: number,
  maxRequests: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowStart = now - windowMs;
  const redisKey = `rl:${key}`;

  // 使用 pipeline 減少 RTT
  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(redisKey, '-inf', windowStart); // 清除過期
  pipeline.zcard(redisKey);                                  // 計數
  pipeline.zadd(redisKey, now, `${now}:${Math.random()}`);   // 新增
  pipeline.pexpire(redisKey, windowMs);                      // 設定過期

  const results = await pipeline.exec();
  const currentCount = (results?.[1]?.[1] as number) || 0;

  const allowed = currentCount < maxRequests;
  const remaining = Math.max(0, maxRequests - currentCount - 1);

  if (!allowed) {
    // 超過限制，移除剛加的記錄
    await redis.zremrangebyscore(redisKey, now, now);
  }

  return {
    allowed,
    remaining,
    resetAt: now + windowMs,
  };
}
```

---

## 12. 錯誤處理與 Dead Letter Queue

### DLQ 設計原則

```
正常佇列 → Worker 處理
  ├─ 成功 → 標記完成
  └─ 失敗 → 重試 N 次
      ├─ 重試成功 → 標記完成
      └─ 重試耗盡 → Dead Letter Queue (DLQ)
          └─ 人工介入 / 自動恢復 / 告警
```

### BullMQ Dead Letter Queue 完整實作

```typescript
// src/queue/dead-letter-queue.ts
import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { eventBus } from '../events/event-bus';

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Dead Letter Queue
export const dlq = new Queue('dead-letter-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: false,  // DLQ 不自動刪除
  },
});

interface DLQEntry {
  originalQueue: string;
  originalJobId: string;
  originalJobName: string;
  originalData: unknown;
  failedReason: string;
  stackTrace?: string;
  attemptsMade: number;
  failedAt: string;
  metadata: Record<string, unknown>;
}

/**
 * 將失敗任務移到 DLQ
 */
export async function moveToDLQ(
  job: Job,
  error: Error,
  queueName: string
): Promise<void> {
  const entry: DLQEntry = {
    originalQueue: queueName,
    originalJobId: job.id || '',
    originalJobName: job.name,
    originalData: job.data,
    failedReason: error.message,
    stackTrace: error.stack,
    attemptsMade: job.attemptsMade,
    failedAt: new Date().toISOString(),
    metadata: {
      processedOn: job.processedOn,
      timestamp: job.timestamp,
    },
  };

  await dlq.add(`dlq:${queueName}:${job.name}`, entry, {
    jobId: `dlq-${job.id}-${Date.now()}`,
  });

  // 發出告警
  await eventBus.emit('system:error', {
    code: 'DLQ_ENTRY',
    message: `任務進入 DLQ: queue=${queueName} job=${job.name} reason=${error.message}`,
    stack: error.stack,
  });

  console.error(
    `[DLQ] 任務進入死信佇列: queue=${queueName} job=${job.id} ` +
    `name=${job.name} reason=${error.message}`
  );
}

/**
 * DLQ 監控 Worker
 * 嘗試自動恢復可恢復的任務
 */
const dlqWorker = new Worker(
  'dead-letter-queue',
  async (job: Job<DLQEntry>) => {
    const entry = job.data;
    console.log(`[DLQ Worker] 檢查: ${entry.originalQueue}:${entry.originalJobName}`);

    // 判斷是否可自動恢復
    if (isRecoverable(entry)) {
      console.log(`[DLQ Worker] 嘗試恢復: ${entry.originalJobId}`);
      await retryFromDLQ(entry);
      return { recovered: true };
    }

    // 不可恢復，保留在 DLQ 等人工處理
    console.log(`[DLQ Worker] 不可恢復，需人工處理: ${entry.originalJobId}`);
    return { recovered: false, requiresManualIntervention: true };
  },
  {
    connection: redisConnection,
    concurrency: 1,
    limiter: {
      max: 5,
      duration: 60000, // 每分鐘最多處理 5 個 DLQ 任務
    },
  }
);

/**
 * 判斷任務是否可自動恢復
 */
function isRecoverable(entry: DLQEntry): boolean {
  const recoverableErrors = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'rate limit',
    'timeout',
    '502',
    '503',
    '504',
  ];

  return recoverableErrors.some(pattern =>
    entry.failedReason.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * 從 DLQ 重新排入原始佇列
 */
async function retryFromDLQ(entry: DLQEntry): Promise<void> {
  // 根據原始佇列名稱找到對應的 Queue 實例
  const targetQueue = new Queue(entry.originalQueue, { connection: redisConnection });

  await targetQueue.add(entry.originalJobName, entry.originalData, {
    attempts: 3, // 給 3 次新的機會
    backoff: {
      type: 'exponential',
      delay: 10000, // 從 10 秒開始
    },
    jobId: `retry-${entry.originalJobId}-${Date.now()}`,
  });

  console.log(`[DLQ] 重新排入: queue=${entry.originalQueue} job=${entry.originalJobName}`);
}

// ---- DLQ 管理 API ----

/**
 * 列出 DLQ 中的任務
 */
export async function listDLQ(options: {
  limit?: number;
  offset?: number;
  queue?: string;
}): Promise<{ total: number; items: Job[] }> {
  const { limit = 20, offset = 0 } = options;

  const waiting = await dlq.getWaiting(offset, offset + limit - 1);
  const completed = await dlq.getCompleted(offset, offset + limit - 1);
  const all = [...waiting, ...completed];

  // 可選過濾
  const filtered = options.queue
    ? all.filter(j => (j.data as DLQEntry).originalQueue === options.queue)
    : all;

  return {
    total: filtered.length,
    items: filtered.slice(0, limit),
  };
}

/**
 * 手動重試 DLQ 中的任務
 */
export async function retryDLQJob(jobId: string): Promise<boolean> {
  const job = await dlq.getJob(jobId);
  if (!job) return false;

  const entry = job.data as DLQEntry;
  await retryFromDLQ(entry);
  await job.remove();
  return true;
}

/**
 * 清除 DLQ
 */
export async function purgeDLQ(): Promise<number> {
  const jobs = await dlq.getWaiting(0, -1);
  for (const job of jobs) {
    await job.remove();
  }
  console.log(`[DLQ] 清除 ${jobs.length} 筆`);
  return jobs.length;
}
```

### DLQ 管理 Express 路由

```typescript
// src/queue/dlq-routes.ts
import { Router, Request, Response } from 'express';
import { listDLQ, retryDLQJob, purgeDLQ } from './dead-letter-queue';

const dlqRouter = Router();

// 列出 DLQ 任務
dlqRouter.get('/dlq', async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;
  const queue = req.query.queue as string;

  const result = await listDLQ({ limit, offset, queue });
  res.json(result);
});

// 重試特定任務
dlqRouter.post('/dlq/:jobId/retry', async (req: Request, res: Response) => {
  const success = await retryDLQJob(req.params.jobId);
  if (success) {
    res.json({ retried: true });
  } else {
    res.status(404).json({ error: 'Job not found in DLQ' });
  }
});

// 批次重試
dlqRouter.post('/dlq/retry-all', async (req: Request, res: Response) => {
  const { items } = await listDLQ({ limit: 100 });
  let retried = 0;

  for (const job of items) {
    const success = await retryDLQJob(job.id!);
    if (success) retried++;
  }

  res.json({ retried, total: items.length });
});

// 清除 DLQ
dlqRouter.delete('/dlq', async (_req: Request, res: Response) => {
  const count = await purgeDLQ();
  res.json({ purged: count });
});

export { dlqRouter };
```

### 全域錯誤處理整合

```typescript
// src/queue/error-handler.ts
import { Job } from 'bullmq';
import { moveToDLQ } from './dead-letter-queue';

/**
 * 為 BullMQ Worker 加上全域 failed 事件處理
 * 當重試次數耗盡時自動進 DLQ
 */
export function attachDLQHandler(worker: any, queueName: string): void {
  worker.on('failed', async (job: Job | undefined, error: Error) => {
    if (!job) return;

    // 檢查是否已達最大重試次數
    const maxAttempts = job.opts?.attempts || 1;
    if (job.attemptsMade >= maxAttempts) {
      await moveToDLQ(job, error, queueName);
    }
  });
}

// 用法：
// import { webhookWorker } from './bull-worker';
// import { attachDLQHandler } from './error-handler';
// attachDLQHandler(webhookWorker, 'webhook-events');
```

---

## 13. 完整範例：Webhook → Queue → SSE 全鏈路

### 全鏈路流程圖

```
外部服務 (GitHub/Stripe/LINE)
  │
  ▼
[Express Webhook Endpoint]
  ├─ 驗簽章
  ├─ 冪等性檢查
  ├─ 立即回 200
  │
  ▼
[BullMQ Queue]
  │
  ▼
[Worker 處理]
  ├─ 成功 → EventBus emit → SSE 推播到前端
  └─ 失敗 → 重試 → DLQ → 告警
```

### 完整整合代碼

```typescript
// src/app-full-example.ts
import express from 'express';
import http from 'http';
import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import crypto from 'crypto';

// ---- 初始化 ----

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3011;

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Raw body 保留（簽章驗證用）
app.use(express.json({
  verify: (req: any, _res, buf) => { req.rawBody = buf; },
  limit: '5mb',
}));

// ---- SSE 管理 ----

interface SSEClient {
  id: string;
  res: express.Response;
  channels: Set<string>;
}

const sseClients = new Map<string, SSEClient>();
let sseEventId = 0;

// SSE 連線端點
app.get('/api/events', (req, res) => {
  const clientId = crypto.randomUUID();
  const channels = new Set((req.query.channels as string)?.split(',') || ['default']);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  res.write(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`);

  sseClients.set(clientId, { id: clientId, res, channels });
  console.log(`[SSE] 連線: ${clientId} total=${sseClients.size}`);

  req.on('close', () => {
    sseClients.delete(clientId);
    console.log(`[SSE] 斷線: ${clientId} total=${sseClients.size}`);
  });
});

function sseSend(channel: string, event: string, data: unknown): void {
  sseEventId++;
  const payload = `id: ${sseEventId}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  for (const client of sseClients.values()) {
    if (client.channels.has(channel) || client.channels.has('*')) {
      try { client.res.write(payload); } catch { sseClients.delete(client.id); }
    }
  }
}

// 心跳
setInterval(() => {
  for (const client of sseClients.values()) {
    try { client.res.write(`: heartbeat\n\n`); } catch { sseClients.delete(client.id); }
  }
}, 30000);

// ---- BullMQ Queue ----

const webhookQueue = new Queue('webhook-processing', {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 86400, count: 1000 },
    removeOnFail: { age: 604800 },
  },
});

const dlqQueue = new Queue('dead-letter', { connection: redis });

// ---- 冪等性 ----

const processedEvents = new Map<string, { result: unknown; expiresAt: number }>();

function isProcessed(key: string): boolean {
  const entry = processedEvents.get(key);
  if (!entry) return false;
  if (entry.expiresAt < Date.now()) {
    processedEvents.delete(key);
    return false;
  }
  return true;
}

function markProcessed(key: string, result: unknown): void {
  processedEvents.set(key, {
    result,
    expiresAt: Date.now() + 24 * 3600 * 1000,
  });
}

// ---- 限速 ----

const rateLimitBuckets = new Map<string, number[]>();

function checkRateLimit(key: string, windowMs: number, max: number): boolean {
  const now = Date.now();
  const timestamps = rateLimitBuckets.get(key) || [];
  const valid = timestamps.filter(t => t > now - windowMs);
  rateLimitBuckets.set(key, valid);

  if (valid.length >= max) return false;
  valid.push(now);
  return true;
}

// ---- 簽章驗證 ----

const webhookSecrets: Record<string, string> = {
  github: process.env.GITHUB_WEBHOOK_SECRET || 'dev-secret',
  stripe: process.env.STRIPE_WEBHOOK_SECRET || 'dev-secret',
  line: process.env.LINE_CHANNEL_SECRET || 'dev-secret',
  custom: process.env.CUSTOM_WEBHOOK_SECRET || 'dev-secret',
};

function verifySignature(source: string, rawBody: Buffer, signature: string): boolean {
  const secret = webhookSecrets[source];
  if (!secret) return false;

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  // 處理不同平台的前綴格式
  const cleanSignature = signature.replace(/^sha256=/, '');

  try {
    return crypto.timingSafeEqual(Buffer.from(cleanSignature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ---- Webhook 端點 ----

app.post('/api/webhook/:source', (req, res) => {
  const { source } = req.params;
  const rawBody = (req as any).rawBody as Buffer;

  // 1. 限速
  const rateLimitKey = `webhook:${source}:${req.ip}`;
  if (!checkRateLimit(rateLimitKey, 60000, 100)) {
    res.status(429).json({ error: 'Rate limit exceeded' });
    return;
  }

  // 2. 簽章驗證（開發環境可跳過）
  if (process.env.NODE_ENV === 'production') {
    const sigHeader = req.headers['x-webhook-signature']
      || req.headers['x-hub-signature-256']
      || req.headers['x-line-signature'];

    if (!sigHeader || !verifySignature(source, rawBody, sigHeader as string)) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }
  }

  // 3. 冪等性檢查
  const eventId = req.body?.id || req.body?.events?.[0]?.id || crypto.randomUUID();
  const idempotencyKey = `${source}:${eventId}`;

  if (isProcessed(idempotencyKey)) {
    res.status(200).json({ received: true, duplicate: true });
    return;
  }

  // 4. 立即回 200
  res.status(200).json({ received: true, eventId });

  // 5. 非同步丟到佇列
  webhookQueue.add(
    `${source}:event`,
    {
      source,
      eventId,
      payload: req.body,
      receivedAt: new Date().toISOString(),
      clientIP: req.ip,
    },
    { jobId: idempotencyKey }
  ).catch(err => {
    console.error(`[Webhook] 排入佇列失敗: ${err.message}`);
  });
});

// ---- Worker ----

const webhookWorker = new Worker(
  'webhook-processing',
  async (job: Job) => {
    const { source, eventId, payload } = job.data;
    console.log(`[Worker] 處理: source=${source} eventId=${eventId} attempt=${job.attemptsMade + 1}`);

    // 處理邏輯（根據 source 分派）
    let result: Record<string, unknown>;

    switch (source) {
      case 'github':
        result = await processGitHub(payload);
        break;
      case 'stripe':
        result = await processStripe(payload);
        break;
      case 'line':
        result = await processLINE(payload);
        break;
      default:
        result = { processed: true, source, eventId };
    }

    // 標記已處理（冪等性）
    markProcessed(`${source}:${eventId}`, result);

    // 推播到前端
    sseSend('webhooks', 'webhook:processed', {
      source,
      eventId,
      result,
      processedAt: new Date().toISOString(),
    });

    return result;
  },
  {
    connection: redis,
    concurrency: 5,
    limiter: { max: 50, duration: 60000 },
  }
);

// Worker 事件
webhookWorker.on('completed', (job) => {
  console.log(`[Worker] 完成: ${job.id}`);
});

webhookWorker.on('failed', async (job, error) => {
  if (!job) return;

  console.error(`[Worker] 失敗: ${job.id} attempt=${job.attemptsMade} error=${error.message}`);

  // 重試耗盡 → DLQ
  if (job.attemptsMade >= (job.opts?.attempts || 5)) {
    await dlqQueue.add('dead-letter', {
      originalQueue: 'webhook-processing',
      originalJobId: job.id,
      originalData: job.data,
      failedReason: error.message,
      failedAt: new Date().toISOString(),
      attemptsMade: job.attemptsMade,
    });

    // SSE 告警
    sseSend('system', 'alert', {
      type: 'dlq_entry',
      message: `任務進入死信佇列: ${job.data.source}:${job.data.eventId}`,
      error: error.message,
    });

    console.error(`[DLQ] 進入死信佇列: ${job.id}`);
  }
});

// ---- 處理函式 ----

async function processGitHub(payload: any): Promise<Record<string, unknown>> {
  const action = payload.action || 'unknown';
  console.log(`[GitHub] 處理: action=${action}`);
  return { processor: 'github', action, processed: true };
}

async function processStripe(payload: any): Promise<Record<string, unknown>> {
  const type = payload.type || 'unknown';
  console.log(`[Stripe] 處理: type=${type}`);
  return { processor: 'stripe', type, processed: true };
}

async function processLINE(payload: any): Promise<Record<string, unknown>> {
  const events = payload.events || [];
  console.log(`[LINE] 處理: events=${events.length}`);
  return { processor: 'line', eventCount: events.length, processed: true };
}

// ---- 管理 API ----

// 佇列狀態
app.get('/api/queue/stats', async (_req, res) => {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    webhookQueue.getWaitingCount(),
    webhookQueue.getActiveCount(),
    webhookQueue.getCompletedCount(),
    webhookQueue.getFailedCount(),
    webhookQueue.getDelayedCount(),
  ]);

  res.json({ waiting, active, completed, failed, delayed, sseClients: sseClients.size });
});

// DLQ 列表
app.get('/api/queue/dlq', async (req, res) => {
  const jobs = await dlqQueue.getWaiting(0, 19);
  res.json({
    count: jobs.length,
    items: jobs.map(j => ({
      id: j.id,
      data: j.data,
      timestamp: j.timestamp,
    })),
  });
});

// DLQ 重試
app.post('/api/queue/dlq/:jobId/retry', async (req, res) => {
  const job = await dlqQueue.getJob(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  const entry = job.data;
  await webhookQueue.add('retry', entry.originalData, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });
  await job.remove();

  res.json({ retried: true });
});

// 健康檢查
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    redis: redis.status === 'ready' ? 'connected' : redis.status,
    queues: { webhook: 'active' },
    sseClients: sseClients.size,
  });
});

// ---- 啟動 ----

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`  Webhook: POST /api/webhook/:source`);
  console.log(`  SSE:     GET  /api/events?channels=webhooks,system`);
  console.log(`  Stats:   GET  /api/queue/stats`);
  console.log(`  DLQ:     GET  /api/queue/dlq`);
  console.log(`  Health:  GET  /api/health`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Server] 收到 SIGTERM，開始優雅關閉...');

  // 關閉 SSE 連線
  for (const client of sseClients.values()) {
    client.res.end();
  }

  // 關閉 Worker（等待進行中的任務完成）
  await webhookWorker.close();

  // 關閉佇列
  await webhookQueue.close();
  await dlqQueue.close();

  // 關閉 Redis
  redis.disconnect();

  // 關閉 HTTP server
  server.close(() => {
    console.log('[Server] 已關閉');
    process.exit(0);
  });

  // 強制退出保底
  setTimeout(() => {
    console.error('[Server] 強制退出');
    process.exit(1);
  }, 10000);
});
```

---

## 快速參考

### 安裝依賴

```bash
npm install express bullmq ioredis ws axios
npm install -D @types/express @types/ws typescript
# 可選：Bull Board 監控面板
npm install @bull-board/api @bull-board/api @bull-board/express
```

### 環境變數

```env
REDIS_URL=redis://localhost:6379
GITHUB_WEBHOOK_SECRET=your-github-secret
STRIPE_WEBHOOK_SECRET=whsec_your-stripe-secret
LINE_CHANNEL_SECRET=your-line-secret
CUSTOM_WEBHOOK_SECRET=your-custom-secret
ADMIN_API_KEY=your-admin-key
```

### 常見問題

| 問題 | 原因 | 解法 |
|------|------|------|
| Webhook 簽章驗證失敗 | body 被 middleware 修改過 | 確保用 raw body，掛 `verify` callback |
| 同一事件被處理兩次 | 沒做冪等性 | 用 event ID 去重，存 Redis/DB |
| Worker 處理太慢 | concurrency 設太低 | 調高 concurrency，或拆分到多個 Worker |
| SSE 連線頻繁斷開 | Nginx/CDN proxy 超時 | 加心跳、設定 proxy timeout |
| Redis 記憶體暴漲 | removeOnComplete 沒設 | 設定 age/count 限制 |
| Rate Limit 被繞過 | 沒擋 X-Forwarded-For 偽造 | 在信任的 proxy 層處理，或不信任 |

### 延伸閱讀

- [cookbook/23-n8n-Workflow模板.md](23-n8n-Workflow模板.md) — n8n 基礎用法
- [cookbook/03-資安與防護.md](03-資安與防護.md) — 安全加固
- [cookbook/40-第三方API串接大全.md](40-第三方API串接大全.md) — 第三方 API 整合
- [cookbook/04-自動化執行.md](04-自動化執行.md) — 自動化任務管理
