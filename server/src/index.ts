/**
 * OpenClaw 後端 API
 * 實作 docs/API-INTEGRATION.md 規格，供中控台接上後「立即執行」打此服務
 * OpenClaw v4 板：/api/openclaw/* 寫入 Supabase
 */
import './preload-dotenv.js';
import { createLogger } from './logger.js';
import { startTelegramStopPoll, triggerHeartbeat } from './telegram/index.js';
import path from 'path';
import fs from 'fs';
import { spawn, execSync } from 'child_process';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { tasks, runs, alerts, memReviews } from './store.js';
import { runSeed } from './seed.js';
import type { Task, Run, Alert } from './types.js';
import {
  fetchOpenClawTasks,
  fetchOpenClawTaskById,
  upsertOpenClawTask,
  fetchOpenClawReviews,
  upsertOpenClawReview,
  fetchOpenClawAutomations,
  upsertOpenClawAutomation,
  fetchOpenClawEvolutionLog,
  fetchOpenClawRuns,
  fetchOpenClawRunById,
  insertOpenClawRun,
  updateOpenClawRun,
  fetchOpenClawAuditLogs,
  type OpenClawTask,
} from './openclawSupabase.js';
import { hasSupabase, supabase } from './supabase.js';
import {
  openClawTaskToTask,
  taskToOpenClawTask,
  openClawReviewToAlert,
  evolutionLogToRun,
  evolutionLogToLogEntry,
  openClawRunToRun,
} from './openclawMapper.js';
import { validateBody, validateParams, validateQuery } from './middlewares/validate.js';
import { authMiddleware } from './middlewares/auth.js';
import { auditMiddleware } from './middlewares/audit.js';
import {
  createTaskSchema,
  updateTaskSchema,
  runTaskSchema,
  updateAlertSchema,
  idParamSchema,
  taskFilterQuerySchema,
} from './validation/schemas.js';
import tasksRouter from './routes/tasks.js';
import projectsRouter from './routes/projects.js';
import memoryRouter from './routes/memory.js';
import openclawTasksRouter from './routes/openclaw-tasks.js';
import openclawReviewsRouter from './routes/openclaw-reviews.js';
import openclawDataRouter from './routes/openclaw-data.js';
import insightsRouter from './routes/insights.js';
import federationRouter from './routes/federation.js';
import {
  federationBlockerMiddleware,
  loadBlocklistFromSupabase,
} from './middlewares/federationBlocker.js';
// === 新增：postMessage 防火牆中介層 (P1 任務) ===
import { postMessageFirewall } from './middlewares/firewall.js';
import autoExecutorRouter, {
  autoExecutorState,
  activeTaskIds,
  startAutoExecutor,
  stopAutoExecutor,
  loadAutoExecutorDiskState,
  saveAutoExecutorDiskState,
  startDispatchDigestTimer,
} from './routes/auto-executor.js';
// === 新增：房源文案 API 路由 (P3 任務) ===
import propertyApiRouter from './routes/property-api.js';
import { proxyRouter } from './routes/proxy.js';
import {
  hasN8n,
  listWorkflows,
  triggerWebhook,
  healthCheck as n8nHealthCheck,
} from './n8nClient.js';

// === 新增：Agent 選擇器和執行器 ===
import {
  AgentSelector,
  AgentExecutor,
  agentSelector,
  agentExecutor,
  type AgentExecutionResult,
} from './executor-agents.js';
import { getPromptGuardStats, getPromptGuardRules } from './promptGuard.js';

// === 新增：工作流程引擎 ===
import {
  WorkflowEngine,
  BatchWorkflowExecutor,
  createWorkflowEngine,
  createBatchExecutor,
  type WorkflowGraph,
} from './workflow-engine.js';

// === 新增：防卡關機制 ===
import {
  AntiStuckManager,
  antiStuckManager,
  withRetry,
  withTimeout,
  DEFAULT_CONFIG,
} from './anti-stuck.js';

// === 新增：Telegram 通知 ===
import {
  sendTelegramMessage,
  sendTelegramMessageToChat,
  isTelegramConfigured,
  notifyTaskTimeout,
  notifyTaskRetry,
  notifyModelFallback,
  notifyTaskFailure,
  notifyTaskSuccess,
  notifyWorkflowStart,
  notifyWorkflowComplete,
  notifyRedAlert,
  notifyProposal,
} from './utils/telegram.js';

// === 新增：WebSocket 即時推播 ===
import { wsManager } from './websocket.js';
import http from 'http';
import {
  validateTaskForGate,
  ensureProjectSkeleton,
  ensureRunWorkspace,
  buildRunPath,
  normalizeProjectPath,
  parseProjectAndModule,
} from './taskCompliance.js';
import { fileURLToPath } from 'url';
import { DOMAINS, applyDomainTagging } from './domains.js';
import { loadFeatures, patchFeatures, saveFeatures, type FeatureFlags } from './features.js';

runSeed();

const log = createLogger('server');

const app = express();

// If you deploy behind a reverse proxy (Caddy/Nginx/Cloudflare), set OPENCLAW_TRUST_PROXY=true
// so req.ip + rate limiting use the real client IP.
if (process.env.OPENCLAW_TRUST_PROXY === 'true') {
  // Express accepts boolean/number; 1 means trust first proxy hop.
  app.set('trust proxy', 1);
}

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };
type AgentCapability = 'read' | 'write' | 'execute' | 'interrupt';
type AgentDecision = 'approve' | 'reject' | 'modify';

interface SharedMessage {
  id: string;
  role: 'user' | 'supervisor' | 'cursor' | 'codex' | 'openclaw' | 'system';
  agent?: string;
  content: string;
  timestamp: string;
  metadata?: {
    command?: JsonObject;
    artifacts?: string[];
  };
}

interface SharedState {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  messages: SharedMessage[];
  context: {
    workingDir: string;
    files: string[];
    variables: Record<string, JsonValue>;
  };
  execution: {
    currentAgent: string | null;
    status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
    taskStack: string[];
    completedTasks: string[];
  };
  pendingHuman?: {
    interruptId: string;
    reason: string;
    options: string[];
    deadline: string;
    details?: JsonObject;
  };
}

const agentCapabilities: Record<string, AgentCapability[]> = {
  cursor_agent: ['read', 'write', 'execute', 'interrupt'],
  codex_agent: ['read', 'write', 'execute', 'interrupt'],
  openclaw: ['read', 'write', 'execute', 'interrupt'],
  supervisor: ['read', 'write', 'execute', 'interrupt'],
  human: ['read', 'write', 'execute', 'interrupt'],
};

const memorySessions = new Map<string, SharedState>();
const memoryInterrupts = new Map<string, { sessionId: string; fromAgent: string; reason: string; details?: JsonObject; options: string[]; timeoutMinutes: number; decision?: AgentDecision; feedback?: string; resolvedAt?: string }>();

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function ensureAgentAllowed(agentId: string, capability: AgentCapability): boolean {
  const caps = agentCapabilities[agentId] ?? [];
  return caps.includes(capability);
}

function safeJsonObject(v: unknown): JsonObject {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return {};
  return v as JsonObject;
}

function createDefaultSharedState(sessionId: string): SharedState {
  const now = nowIso();
  return {
    sessionId,
    createdAt: now,
    updatedAt: now,
    messages: [],
    context: {
      workingDir: process.cwd(),
      files: [],
      variables: {},
    },
    execution: {
      currentAgent: null,
      status: 'idle',
      taskStack: [],
      completedTasks: [],
    },
  };
}

async function getSharedState(sessionId: string): Promise<SharedState> {
  if (hasSupabase() && supabase) {
    const { data } = await supabase
      .from('openclaw_sessions')
      .select('shared_state')
      .eq('id', sessionId)
      .maybeSingle();
    if (data?.shared_state) {
      return data.shared_state as SharedState;
    }
  }
  const existing = memorySessions.get(sessionId);
  if (existing) return existing;
  const created = createDefaultSharedState(sessionId);
  memorySessions.set(sessionId, created);
  return created;
}

async function saveSharedState(session: SharedState, status: 'active' | 'paused' | 'completed' | 'failed' = 'active'): Promise<void> {
  if (hasSupabase() && supabase) {
    await supabase.from('openclaw_sessions').upsert({
      id: session.sessionId,
      shared_state: session as unknown as JsonObject,
      status,
      updated_at: nowIso(),
    });
    return;
  }
  memorySessions.set(session.sessionId, session);
}

async function appendCommandLog(sessionId: string, fromAgent: string, command: JsonObject): Promise<void> {
  if (hasSupabase() && supabase) {
    await supabase.from('openclaw_commands').insert({
      session_id: sessionId,
      from_agent: fromAgent,
      command,
    });
  }
}

const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const OPENCLAW_API_KEY = process.env.OPENCLAW_API_KEY?.trim();
const OPENCLAW_ENFORCE_WRITE_AUTH =
  process.env.OPENCLAW_ENFORCE_WRITE_AUTH !== 'false';
const OPENCLAW_ENFORCE_READ_AUTH =
  process.env.OPENCLAW_ENFORCE_READ_AUTH === 'true';
const OPENCLAW_READ_KEY = process.env.OPENCLAW_READ_KEY?.trim();
const OPENCLAW_WRITE_KEY = process.env.OPENCLAW_WRITE_KEY?.trim();
const OPENCLAW_ADMIN_KEY = process.env.OPENCLAW_ADMIN_KEY?.trim();

const n8nAllowlist = new Set<string>();
const allowlistEnv = process.env.N8N_WEBHOOK_ALLOWLIST;
if (allowlistEnv) {
  for (const host of allowlistEnv.split(',')) {
    const h = host.trim().toLowerCase();
    if (h) n8nAllowlist.add(h);
  }
}
for (const source of [process.env.N8N_API_URL, process.env.N8N_WEBHOOK_RUN_NEXT]) {
  if (!source) continue;
  try {
    const u = new URL(source);
    if (u.hostname) n8nAllowlist.add(u.hostname.toLowerCase());
  } catch {
    // ignore invalid configured URL
  }
}

function readApiKeyFromRequest(req: express.Request): string | null {
  const headerKey = req.header('x-api-key')?.trim();
  if (headerKey) return headerKey;
  const auth = req.header('authorization')?.trim();
  if (!auth) return null;
  const match = auth.match(/^bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

type AccessLevel = 'read' | 'write' | 'admin' | 'none';

const readKeySet = new Set<string>();
const writeKeySet = new Set<string>();
const adminKeySet = new Set<string>();

for (const key of [OPENCLAW_API_KEY, OPENCLAW_READ_KEY]) {
  if (key) readKeySet.add(key);
}
for (const key of [OPENCLAW_API_KEY, OPENCLAW_WRITE_KEY]) {
  if (key) {
    writeKeySet.add(key);
    readKeySet.add(key);
  }
}
for (const key of [OPENCLAW_API_KEY, OPENCLAW_ADMIN_KEY]) {
  if (key) {
    adminKeySet.add(key);
    writeKeySet.add(key);
    readKeySet.add(key);
  }
}

function requiredAccessLevel(req: express.Request): AccessLevel {
  const path = req.path;
  const method = req.method.toUpperCase();
  // PATCH /api/features 需 admin；GET 允許 read（或 none，依 OPENCLAW_ENFORCE_READ_AUTH）
  if (path === '/features' && method === 'PATCH') return 'admin';
  if (path.startsWith('/admin/')) return 'admin';
  if (
    path === '/openclaw/restart-gateway' ||
    path === '/n8n/trigger-webhook' ||
    path === '/emergency/stop-all' ||
    path === '/telegram/force-test'
  ) {
    return 'admin';
  }
  if (OPENCLAW_ENFORCE_WRITE_AUTH && WRITE_METHODS.has(method)) {
    return 'write';
  }
  if (OPENCLAW_ENFORCE_READ_AUTH) {
    return 'read';
  }
  return 'none';
}

function hasConfiguredKeys(level: Exclude<AccessLevel, 'none'>): boolean {
  if (level === 'read') return readKeySet.size > 0;
  if (level === 'write') return writeKeySet.size > 0;
  return adminKeySet.size > 0;
}

function isAuthorized(level: Exclude<AccessLevel, 'none'>, provided: string): boolean {
  if (level === 'read') return readKeySet.has(provided);
  if (level === 'write') return writeKeySet.has(provided);
  return adminKeySet.has(provided);
}

function isPrivateIPv4(host: string): boolean {
  const parts = host.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return false;
  }
  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  return false;
}

function isBlockedWebhookHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  if (!normalized) return true;
  if (n8nAllowlist.has(normalized)) return false;
  if (normalized === 'localhost' || normalized.endsWith('.local')) return true;
  if (normalized === '::1') return true;
  if (isPrivateIPv4(normalized)) return true;
  return false;
}

function validateWebhookUrl(rawUrl: unknown): { ok: true; value: string } | { ok: false; message: string } {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { ok: false, message: 'webhookUrl 格式錯誤' };
  }
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, message: 'webhookUrl 不是合法 URL' };
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, message: 'webhookUrl 只支援 http/https' };
  }
  if (isBlockedWebhookHost(parsed.hostname)) {
    return {
      ok: false,
      message: 'webhookUrl 主機未在允許清單，請設定 N8N_WEBHOOK_ALLOWLIST',
    };
  }
  return { ok: true, value: parsed.toString() };
}

// CORS 設定：必須在 helmet / rateLimit 之前，確保 preflight 與 429 回應都帶 CORS header
function readAllowedOriginsEnv(): string[] {
  const raw = process.env.ALLOWED_ORIGINS?.trim();
  if (!raw) return [];
  const out: string[] = [];
  for (const part of raw.split(',')) {
    const s = part.trim();
    if (!s) continue;
    try {
      out.push(new URL(s).origin);
    } catch {
      // Ignore invalid origins (common mistake: pasting full URL paths).
    }
  }
  return out;
}

const allowedOrigins = Array.from(new Set([
  'http://localhost:3000',
  'http://localhost:3009',
  'http://localhost:3011',
  'http://localhost:5173', // Vite 預設開發端口
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3009',
  'http://127.0.0.1:3011',
  'http://127.0.0.1:5173',
  ...readAllowedOriginsEnv(),
]));
app.use(cors({
  origin: (origin, callback) => {
    // 允許無 origin 的請求（如 curl、Postman）
    if (!origin) return callback(null, true);
    return callback(null, allowedOrigins.includes(origin));
  },
  credentials: true,
}));

// 安全中介層
app.use(helmet());

// 限流設定：開發環境放寬，每個 IP 15 分鐘內最多 1000 個請求
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { message: '請求過於頻繁，請稍後再試' },
});
app.use(limiter);

app.use(express.json({ limit: '200kb' }));

// FADP 聯盟協防封鎖中介層（必須在 authMiddleware 之前，封鎖優先）
app.use(federationBlockerMiddleware);

// === 新增：postMessage 防火牆中介層 (P1 任務) ===
// 只允許 GATEWAY_CONFIG.allowedOutbound 清單內的事件通過
app.use(postMessageFirewall());

// 小蔡完成任務後呼叫此端點通知老蔡（localhost only，不需 API key）
app.post('/internal/notify', async (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || '';
  if (!clientIp.includes('127.0.0.1') && !clientIp.includes('::1') && !clientIp.includes('localhost')) {
    return res.status(403).json({ ok: false, message: 'localhost only' });
  }
  if (!isTelegramConfigured()) return res.status(503).json({ ok: false, message: 'Telegram 未設定' });
  const { message, parseMode } = req.body as { message?: string; parseMode?: string };
  if (!message) return res.status(400).json({ ok: false, message: '缺少 message' });
  try {
    await sendTelegramMessage(message, { parseMode: (parseMode as 'HTML' | 'Markdown') ?? 'HTML' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e) });
  }
});

// 使用新的认证中间件
app.use('/api', authMiddleware);
app.use('/api', auditMiddleware);

// 挂载路由模块
app.use('/api/tasks', tasksRouter);
app.use('/api/openclaw/projects', projectsRouter);
app.use('/api/openclaw', autoExecutorRouter);
app.use('/api/openclaw', memoryRouter);
app.use('/api/openclaw/tasks', openclawTasksRouter);
app.use('/api/openclaw/reviews', openclawReviewsRouter);
app.use('/api/openclaw', openclawDataRouter);
app.use('/api/openclaw/insights', insightsRouter);
// === 新增：房源文案 API 路由 (P3 任務) ===
app.use('/api/tools', propertyApiRouter);
// API Key 安全代理（proxy_fetch action + HTTP endpoint）
app.use('/api/proxy', proxyRouter);
// FADP 聯盟協防協議路由（/api/federation/*，部分端點不需 auth，內部使用 x-fadp-key）
app.use('/api/federation', federationRouter);

// Canonical local port for the taskboard API/server. Override via PORT env var.
const PORT = Number(process.env.PORT) || 3011;

// ---- Tasks ---- (部分已迁移到 routes/tasks.ts)
// 已迁移: GET /api/tasks, GET /api/tasks/:id

// ---- Domains (Task Tagging Spec) ----
// Frontend can use this to render consistent filters/badges.
app.get('/api/domains', (_req, res) => {
  res.json({ ok: true, domains: DOMAINS });
});

// ---- Feature Flags (UI governance) ----
let featureFlags: FeatureFlags = loadFeatures();

app.get('/api/features', (_req, res) => {
  res.json({ ok: true, features: featureFlags });
});

app.patch('/api/features', (req, res) => {
  // Admin-gated by requiredAccessLevel(): path '/features' is treated as admin.
  const body = (req.body ?? {}) as Partial<FeatureFlags>;
  featureFlags = patchFeatures(featureFlags, body);
  saveFeatures(featureFlags);
  res.json({ ok: true, features: featureFlags });
});

// 任務 audit / compliance 已遷移至 routes/tasks.ts（須在 /:id 之前註冊）

app.patch('/api/tasks/:id', validateBody(updateTaskSchema), async (req, res) => {
  const taskId = req.params.id;
  const body = req.body as Partial<
    Pick<
      Task,
      | 'name'
      | 'description'
      | 'status'
      | 'priority'
      | 'owner'
      | 'tags'
      | 'scheduleType'
      | 'scheduleExpr'
      | 'riskLevel'
      | 'rollbackPlan'
      | 'acceptanceCriteria'
      | 'evidenceLinks'
      | 'summary'
      | 'nextSteps'
      | 'projectPath'
      | 'runPath'
      | 'idempotencyKey'
      | 'deliverables'
      | 'runCommands'
      | 'modelPolicy'
      | 'allowPaid'
      | 'executionProvider'
      | 'agent'
      | 'modelConfig'
    >
  >;
  // 验证已由中间件处理,无需手动验证
  const now = new Date().toISOString();

  if (hasSupabase()) {
    const ocTasks = await fetchOpenClawTasks();
    const oc = ocTasks.find((x) => x.id === taskId);
    if (!oc) return res.status(404).json({ message: 'Task not found' });

    // 先從 Supabase 任務轉成主應用 Task，再套用本次更新欄位
    const currentTask = openClawTaskToTask(oc);
    let updatedTask: Task = {
      ...currentTask,
      ...body,
      ...(body.projectPath ? { projectPath: normalizeProjectPath(body.projectPath) } : {}),
      ...(body.runPath ? { runPath: normalizeProjectPath(body.runPath) } : {}),
      updatedAt: now,
    };

    // Domain tag governance: keep a single domain:* and infer one if missing.
    // (Non-blocking, but prevents tag drift + helps filtering.)
    const domainApplied = applyDomainTagging({
      name: updatedTask.name,
      description: updatedTask.description,
      tags: updatedTask.tags,
    });
    updatedTask = { ...updatedTask, tags: domainApplied.tags };

    // Gate: transition to ready 時做欄位強制
    if (body.status === 'ready') {
      const gate = validateTaskForGate(updatedTask, 'ready');
      if (!gate.ok) {
        return res.status(400).json({
          message: `Task cannot transition to ready; missing: ${gate.missing.join(', ')}`,
        });
      }
      // projectPath 有填才建 skeleton，沒填就跳過
      if (updatedTask.projectPath) {
        const ensured = ensureProjectSkeleton(updatedTask);
        if (!ensured.ok) {
          return res.status(400).json({ message: `Invalid projectPath: ${ensured.message}` });
        }
      }
    }

    // 將更新後的 Task 轉回 OpenClawTask，並寫回 Supabase
    const ocPayload = taskToOpenClawTask(updatedTask);
    const merged = { ...oc, ...ocPayload };
    const saved = await upsertOpenClawTask(merged);
    if (!saved) {
      return res.status(500).json({ message: 'Failed to update task' });
    }

    // 同步更新本地 in-memory tasks
    const localIdx = tasks.findIndex((t) => t.id === taskId);
    if (localIdx === -1) {
      tasks.push(updatedTask);
    } else {
      tasks[localIdx] = { ...tasks[localIdx], ...updatedTask };
    }

    return res.json(updatedTask);
  }

  const idx = tasks.findIndex((x) => x.id === taskId);
  if (idx === -1) return res.status(404).json({ message: 'Task not found' });

  const updatedLocal: Task = {
    ...tasks[idx],
    ...body,
    updatedAt: now,
  };
  {
    const domainApplied = applyDomainTagging({
      name: updatedLocal.name,
      description: updatedLocal.description,
      tags: updatedLocal.tags,
    });
    updatedLocal.tags = domainApplied.tags;
  }
  tasks[idx] = updatedLocal;
  res.json(updatedLocal);
});

// ---- Task Writeback (Batch A) ----
// 讓 Codex/Cursor/Ollama 寫回索引級欄位（summary/nextSteps/runPath 等），避免只堆「新任務」空卡
app.patch('/api/tasks/:id/progress', async (req, res) => {
  const taskId = req.params.id;
  const body = req.body as Partial<Pick<
    Task,
    'summary' | 'nextSteps' | 'evidenceLinks' | 'runPath' | 'idempotencyKey' | 'status'
  >> & {
    runId?: string;
    appendToDescription?: boolean;
  };

  const ocTasks = hasSupabase() ? await fetchOpenClawTasks().catch(() => []) : [];
  const oc = hasSupabase() ? ocTasks.find((x) => x.id === taskId) : undefined;
  const current = oc ? openClawTaskToTask(oc) : tasks.find((t) => t.id === taskId);
  if (!current) return res.status(404).json({ message: 'Task not found' });

  // Keep writebacks index-level only (avoid context blow-ups / huge cards).
  const clampText = (v: unknown, max: number): string | undefined => {
    if (typeof v !== 'string') return undefined;
    const s = v.trim();
    if (!s) return undefined;
    if (s.length <= max) return s;
    return s.slice(0, max).trimEnd() + '…';
  };
  const clampStringArray = (v: unknown, maxItems: number, maxLen: number): string[] | undefined => {
    if (!Array.isArray(v)) return undefined;
    const cleaned = v
      .map((x) => (typeof x === 'string' ? x.trim() : ''))
      .filter(Boolean)
      .slice(0, maxItems)
      .map((s) => (s.length <= maxLen ? s : s.slice(0, maxLen).trimEnd() + '…'));
    return cleaned.length > 0 ? cleaned : undefined;
  };

  const now = new Date().toISOString();
  const runId = body.runId?.trim();

  let runPath = body.runPath ? normalizeProjectPath(body.runPath) : current.runPath;
  let idempotencyKey = body.idempotencyKey ?? current.idempotencyKey;
  if (runId && current.projectPath) {
    const date = now.slice(0, 10);
    runPath = buildRunPath(current.projectPath, date, runId);
    idempotencyKey = `${current.id}:${runId}`;
  }
  if (runPath) ensureRunWorkspace(runPath);

  const summary = clampText(body.summary, 800) ?? current.summary;
  const nextSteps = clampStringArray(body.nextSteps, 12, 180) ?? current.nextSteps;
  const evidenceLinks = clampStringArray(body.evidenceLinks, 12, 500) ?? current.evidenceLinks;
  const safeStatus = clampText(body.status, 40) as Task['status'] | undefined;

  const updated: Task = {
    ...current,
    ...body,
    ...(summary !== undefined ? { summary } : {}),
    ...(nextSteps !== undefined ? { nextSteps } : {}),
    ...(evidenceLinks !== undefined ? { evidenceLinks } : {}),
    ...(safeStatus !== undefined ? { status: safeStatus } : {}),
    runPath,
    idempotencyKey,
    updatedAt: now,
  };

  // description 僅存索引級（避免 context 爆炸）
  if (body.appendToDescription) {
    const lines: string[] = [];
    if (updated.summary) lines.push(`summary: ${updated.summary}`);
    if (updated.nextSteps && updated.nextSteps.length > 0) {
      lines.push('nextSteps:');
      for (const s of updated.nextSteps) lines.push(`- ${s}`);
    }
    if (updated.runPath) lines.push(`runPath: ${updated.runPath}`);
    if (updated.idempotencyKey) lines.push(`idempotencyKey: ${updated.idempotencyKey}`);
    if (lines.length > 0) {
      updated.description = `${(updated.description ?? '').trim()}\n\n${lines.join('\n')}\n`.trim();
    }
  }

  if (hasSupabase() && oc) {
    const ocPayload = taskToOpenClawTask(updated);
    const merged = { ...oc, ...ocPayload };
    const saved = await upsertOpenClawTask(merged);
    if (!saved) return res.status(500).json({ message: 'Failed to writeback task' });
    return res.json(openClawTaskToTask(saved));
  }

  const idx = tasks.findIndex((t) => t.id === taskId);
  if (idx >= 0) tasks[idx] = updated;
  else tasks.unshift(updated);
  res.json(updated);
});

app.post('/api/tasks', validateBody(createTaskSchema), async (req, res) => {
  const body = req.body as Partial<Task> & { id?: string };
  const allowStub =
    (typeof req.query.allowStub === 'string' && req.query.allowStub === '1') ||
    (Array.isArray(req.query.allowStub) && req.query.allowStub[0] === '1');
  const nameTrimmed = typeof body.name === 'string' ? body.name.trim() : '';
  // Stop generating empty "新任務" cards by default.
  if (!nameTrimmed) {
    if (allowStub) {
      // Caller explicitly wants a stub; keep backward compatibility (but still non-blocking).
      return res.status(201).json({
        id: body.id ?? `t${Date.now()}`,
        name: '新任務',
        status: body.status ?? 'draft',
        message: 'stub task created (allowStub=1)',
      });
    }
    return res.status(204).send();
  }
  if (hasSupabase()) {
    const id = body.id ?? `t${Date.now()}`;
    const now = new Date().toISOString();
    const t: Task = {
      id,
      name: nameTrimmed,
      description: body.description?.trim() ?? '',
      status: body.status ?? 'draft',
      tags: body.tags ?? [],
      owner: body.owner ?? 'OpenClaw',
      priority: (body.priority as Task['priority']) ?? 3,
      scheduleType: body.scheduleType ?? 'manual',
      scheduleExpr: body.scheduleExpr,
      riskLevel: body.riskLevel,
      rollbackPlan: body.rollbackPlan,
      acceptanceCriteria: body.acceptanceCriteria,
      evidenceLinks: body.evidenceLinks,
      summary: body.summary,
      nextSteps: body.nextSteps,
      projectPath: body.projectPath ? normalizeProjectPath(body.projectPath) : undefined,
      runPath: body.runPath ? normalizeProjectPath(body.runPath) : undefined,
      idempotencyKey: body.idempotencyKey,
      deliverables: body.deliverables,
      runCommands: body.runCommands,
      modelPolicy: body.modelPolicy,
      modelConfig: body.modelConfig,
      agent: body.agent,
      allowPaid: body.allowPaid,
      executionProvider: body.executionProvider,
      createdAt: now,
      updatedAt: now,
    };

    {
      const domainApplied = applyDomainTagging({
        name: t.name,
        description: t.description,
        tags: t.tags,
      });
      t.tags = domainApplied.tags;
    }

    if (t.status === 'ready') {
      const gate = validateTaskForGate(t, 'ready');
      if (!gate.ok) {
        return res.status(400).json({
          message: `Task cannot be created as ready; missing: ${gate.missing.join(', ')}`,
        });
      }
      // 有明確的 projectPath（非預設值）才建 skeleton，否則跳過
      if (t.projectPath && t.projectPath !== 'projects/default/' && parseProjectAndModule(t.projectPath)) {
        const ensured = ensureProjectSkeleton(t);
        if (!ensured.ok) {
          return res.status(400).json({ message: `Invalid projectPath: ${ensured.message}` });
        }
      }
    }

    const oc = {
      ...taskToOpenClawTask(t),
      progress: 0,
      subs: [],
    };
    const created = await upsertOpenClawTask(oc);
    if (!created) return res.status(500).json({ message: 'Failed to create task' });
    return res.status(201).json(openClawTaskToTask(created));
  }
  const now = new Date().toISOString();
  const newTask: Task = {
    ...body,
    id: body.id ?? `task-${Date.now()}`,
    name: nameTrimmed,
    description: body.description?.trim() ?? '',
    status: body.status ?? 'draft',
    tags: body.tags ?? [],
    owner: body.owner ?? '',
    priority: (body.priority as Task['priority']) ?? 3,
    scheduleType: body.scheduleType ?? 'manual',
    createdAt: now,
    updatedAt: now,
  };
  {
    const domainApplied = applyDomainTagging({
      name: newTask.name,
      description: newTask.description,
      tags: newTask.tags,
    });
    newTask.tags = domainApplied.tags;
  }
  tasks.unshift(newTask);
  res.status(201).json(newTask);
});

// ---- Runs ----
app.get('/api/runs', async (req, res) => {
  if (hasSupabase()) {
    const taskId = (req.query.taskId as string) || undefined;
    const dbRuns = await fetchOpenClawRuns(100, taskId);
    if (dbRuns.length > 0) {
      return res.json(dbRuns.map(openClawRunToRun));
    }
    /* openclaw_runs 為空或表尚未建立時，fallback 到 evolution_log */
    const evLog = await fetchOpenClawEvolutionLog();
    const mapped = evLog.map((row, i) => evolutionLogToRun(row, i));
    const list = taskId ? mapped.filter((r) => r.taskId === taskId) : mapped;
    return res.json(list);
  }
  const taskId = req.query.taskId as string | undefined;
  const list = taskId
    ? runs.filter((r) => r.taskId === taskId)
    : [...runs];
  res.json(list);
});

app.get('/api/runs/:id', async (req, res) => {
  if (hasSupabase()) {
    const dbRun = await fetchOpenClawRunById(req.params.id);
    if (dbRun) return res.json(openClawRunToRun(dbRun));
    const evLog = await fetchOpenClawEvolutionLog();
    const row = evLog.find((r) => String(r.id) === req.params.id);
    if (!row) return res.status(404).json({ message: 'Run not found' });
    const idx = evLog.indexOf(row);
    return res.json(evolutionLogToRun(row, idx));
  }
  const r = runs.find((x) => x.id === req.params.id);
  if (!r) return res.status(404).json({ message: 'Run not found' });
  res.json(r);
});

function createRun(task: Task): Run {
  const now = new Date().toISOString();
  const timeoutMinutes = task.timeoutConfig?.timeoutMinutes || DEFAULT_CONFIG.timeoutMinutes;
  const timeoutAt = new Date(Date.now() + timeoutMinutes * 60 * 1000).toISOString();
  
  // 選擇 Agent
  const agentType = AgentSelector.selectAgent(task);
  
  const run: Run = {
    id: `R-${Date.now()}`,
    taskId: task.id,
    taskName: task.name,
    status: 'queued',
    startedAt: now,
    endedAt: null,
    durationMs: null,
    inputSummary: JSON.stringify({ 
      source: 'api', 
      taskId: task.id,
      agentType,
      timeoutMinutes,
    }),
    outputSummary: '',
    steps: [
      { 
        name: 'queued', 
        status: 'success', 
        startedAt: now, 
        endedAt: now,
        agentType,
      },
      {
        name: 'started',
        status: 'running',
        startedAt: now,
        message: `後端已接收，使用 ${agentType} Agent 執行中…`,
        agentType,
      },
    ],
    retryCount: 0,
    maxRetries: task.timeoutConfig?.maxRetries || DEFAULT_CONFIG.maxRetries,
    agentType,
    fallbackHistory: [],
    timeoutAt,
  };

  // Batch A: run_path/RESULT.md/ARTIFACTS 自動落地（索引級），避免只堆聊天紀錄
  if (task.projectPath) {
    const ensured = ensureProjectSkeleton(task);
    if (ensured.ok) {
      const date = now.slice(0, 10);
      const runPath = buildRunPath(task.projectPath, date, run.id);
      run.projectPath = task.projectPath;
      run.runPath = runPath;
      run.idempotencyKey = `${task.id}:${run.id}`;
      ensureRunWorkspace(runPath);
    }
  }
  return run;
}

/** 模擬執行：整合防卡關機制、Agent 選擇和 Telegram 通知 */
async function executeTaskWithAntiStuck(runId: string, task: Task): Promise<void> {
  const run = runs.find((r) => r.id === runId);
  if (!run) return;
  
  // 開始防卡關機制監控
  antiStuckManager.startMonitoring(run, task);
  
  const now = new Date().toISOString();
  run.status = 'running';
  run.steps[1] = {
    ...run.steps[1],
    status: 'running',
    message: `使用 ${run.agentType} Agent 執行中…`,
  };
  
  // WebSocket: 推送任務開始
  wsManager.broadcastProgress(runId, {
    status: 'running',
    step: 1,
    totalSteps: 3,
    message: `開始使用 ${run.agentType} Agent 執行任務`,
    detail: `任務: ${task.name}`,
  });
  wsManager.broadcastLog(runId, {
    level: 'info',
    message: `🚀 任務執行開始 - ${task.name}`,
  });
  
  if (hasSupabase()) {
    updateOpenClawRun(runId, { 
      status: 'running', 
      steps: run.steps,
    }).catch(() => {});
  }
  
  try {
    // 使用重試機制執行
    const executeWithRetry = withRetry(
      async () => {
        // 實際執行 Agent
        const result = await AgentExecutor.execute(task, run.agentType || 'openclaw');
        return result;
      },
      {
        maxRetries: run.maxRetries || DEFAULT_CONFIG.maxRetries,
        onRetry: async (attempt, error) => {
          log.info(`[Execute] Retry ${attempt} for run ${runId}: ${error.message}`);
          run.retryCount = attempt;
          run.status = 'retrying';
          
          // WebSocket: 推送重試訊息
          wsManager.broadcastProgress(runId, {
            status: 'retrying',
            step: 1,
            totalSteps: 3,
            message: `第 ${attempt} 次重試...`,
            detail: error.message,
          });
          wsManager.broadcastLog(runId, {
            level: 'warn',
            message: `⚠️ 執行失敗，進行第 ${attempt} 次重試: ${error.message}`,
          });
          
          // 發送重試通知
          await notifyTaskRetry(
            task.name,
            task.id,
            runId,
            attempt,
            run.maxRetries || DEFAULT_CONFIG.maxRetries,
            error.message
          );
          
          // 最後一次重試嘗試模型降級
          if (attempt === (run.maxRetries || DEFAULT_CONFIG.maxRetries)) {
            const fallbackStrategy = task.timeoutConfig?.fallbackStrategy || DEFAULT_CONFIG.fallbackStrategy;
            if (fallbackStrategy !== 'none') {
              await notifyModelFallback(task.name, task.id, runId, 'Claude', 'Gemini Flash');
              // WebSocket: 推送模型降級
              wsManager.broadcastLog(runId, {
                level: 'warn',
                message: `🔄 嘗試模型降級: Claude → Gemini Flash`,
              });
            }
          }
        },
      }
    );
    
    // 使用超時機制
    const timeoutMs = (task.timeoutConfig?.timeoutMinutes || DEFAULT_CONFIG.timeoutMinutes) * 60 * 1000;
    const executeWithTimeout = withTimeout(executeWithRetry, timeoutMs);
    
    const result = await executeWithTimeout();
    
    // 執行成功
    const end = new Date().toISOString();
    run.status = 'success';
    run.endedAt = end;
    run.durationMs = Math.round(
      new Date(end).getTime() - new Date(run.startedAt).getTime()
    );
    run.steps[1] = {
      ...run.steps[1],
      status: 'success',
      endedAt: end,
      message: result.output || '執行完成',
    };
    run.steps.push({
      name: 'done',
      status: 'success',
      startedAt: end,
      endedAt: end,
      message: `使用 ${run.agentType} Agent 執行成功`,
      agentType: run.agentType,
    });
    
    // WebSocket: 推送執行成功
    wsManager.broadcastProgress(runId, {
      status: 'success',
      step: 3,
      totalSteps: 3,
      message: '✅ 任務執行成功',
      detail: `耗時 ${(run.durationMs / 1000).toFixed(1)} 秒`,
    });
    wsManager.broadcastLog(runId, {
      level: 'success',
      message: `✅ 任務完成 - ${task.name} (${(run.durationMs / 1000).toFixed(1)}s)`,
    });
    wsManager.broadcastRunUpdate(runId, {
      status: 'success',
      endedAt: end,
      durationMs: run.durationMs,
      steps: run.steps,
    });
    
    // 停止監控
    antiStuckManager.stopMonitoring(runId);
    
    // 發送成功通知
    await notifyTaskSuccess(task.name, task.id, runId, run.durationMs);
    
    if (hasSupabase()) {
      await updateOpenClawRun(runId, {
        status: 'success',
        ended_at: end,
        duration_ms: run.durationMs,
        output_summary: result.output || '執行完成',
        steps: run.steps,
      });
    }
  } catch (error) {
    // 執行失敗
    const end = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    run.status = 'failed';
    run.endedAt = end;
    run.durationMs = Math.round(
      new Date(end).getTime() - new Date(run.startedAt).getTime()
    );
    run.error = {
      code: 'EXECUTION_FAILED',
      message: errorMessage,
      retryable: run.retryCount !== undefined && run.retryCount < (run.maxRetries || 0),
    };
    run.steps[1] = {
      ...run.steps[1],
      status: 'failed',
      endedAt: end,
      message: errorMessage,
    };
    
    // WebSocket: 推送執行失敗
    wsManager.broadcastProgress(runId, {
      status: 'failed',
      step: 2,
      totalSteps: 3,
      message: '❌ 任務執行失敗',
      detail: errorMessage,
    });
    wsManager.broadcastLog(runId, {
      level: 'error',
      message: `❌ 任務失敗 - ${task.name}: ${errorMessage}`,
    });
    wsManager.broadcastRunUpdate(runId, {
      status: 'failed',
      endedAt: end,
      durationMs: run.durationMs,
      error: run.error,
      steps: run.steps,
    });
    
    // 停止監控
    antiStuckManager.stopMonitoring(runId);
    
    // 發送失敗通知
    await notifyTaskFailure(task.name, task.id, runId, errorMessage, run.retryCount || 0);
    
    if (hasSupabase()) {
      await updateOpenClawRun(runId, {
        status: 'failed',
        ended_at: end,
        duration_ms: run.durationMs,
        output_summary: errorMessage,
        steps: run.steps,
      });
    }
  }
}

/** 向後相容：模擬執行函數 */
function simulateExecution(runId: string) {
  const run = runs.find((r) => r.id === runId);
  if (!run) return;
  
  const task = tasks.find((t) => t.id === run.taskId);
  if (!task) {
    // 回退到舊的模擬執行
    legacySimulateExecution(runId);
    return;
  }
  
  // 使用新的防卡關機制執行
  executeTaskWithAntiStuck(runId, task).catch(console.error);
}

/** 舊版模擬執行（向後相容） */
function legacySimulateExecution(runId: string) {
  const run = runs.find((r) => r.id === runId);
  if (!run) return;
  const now = new Date().toISOString();
  run.status = 'running';
  run.steps[1] = {
    ...run.steps[1],
    status: 'running',
    message: '後端模擬執行中…',
  };
  
  // WebSocket: 推送模擬執行開始
  wsManager.broadcastProgress(runId, {
    status: 'running',
    step: 1,
    totalSteps: 2,
    message: '後端模擬執行中…',
  });
  wsManager.broadcastLog(runId, {
    level: 'info',
    message: '🚀 模擬執行開始',
  });
  
  if (hasSupabase()) updateOpenClawRun(runId, { status: 'running', steps: run.steps }).catch(() => {});
  setTimeout(() => {
    const end = new Date().toISOString();
    run.status = 'success';
    run.endedAt = end;
    run.durationMs = Math.round(
      new Date(end).getTime() - new Date(run.startedAt).getTime()
    );
    run.steps[1] = {
      ...run.steps[1],
      status: 'success',
      endedAt: end,
      message: '模擬完成',
    };
    run.steps.push({
      name: 'done',
      status: 'success',
      startedAt: end,
      endedAt: end,
      message: 'OpenClaw 後端模擬執行成功',
    });
    
    // WebSocket: 推送模擬執行完成
    wsManager.broadcastProgress(runId, {
      status: 'success',
      step: 2,
      totalSteps: 2,
      message: '✅ 模擬執行完成',
      detail: `耗時 ${(run.durationMs / 1000).toFixed(1)} 秒`,
    });
    wsManager.broadcastLog(runId, {
      level: 'success',
      message: `✅ 模擬執行完成 (${(run.durationMs / 1000).toFixed(1)}s)`,
    });
    wsManager.broadcastRunUpdate(runId, {
      status: 'success',
      endedAt: end,
      durationMs: run.durationMs,
      steps: run.steps,
    });
    
    if (hasSupabase()) {
      updateOpenClawRun(runId, {
        status: 'success',
        ended_at: end,
        duration_ms: run.durationMs,
        output_summary: '模擬完成',
        steps: run.steps,
      }).catch(() => {});
    }
  }, 1500);
}

app.post('/api/tasks/:taskId/run', validateBody(runTaskSchema), async (req, res) => {
  const task = await getTaskForRun(req.params.taskId);
  if (!task)
    return res.status(404).json({ message: 'Task not found' });

  const gate = validateTaskForGate(task, 'ready');
  if (!gate.ok) {
    return res.status(400).json({
      message: `Task not runnable; missing: ${gate.missing.join(', ')}`,
    });
  }
  const run = createRun(task);
  runs.unshift(run);
  const now = run.startedAt;
  const idx = tasks.findIndex((t) => t.id === task.id);
  if (idx !== -1) {
    tasks[idx].lastRunStatus = 'queued';
    tasks[idx].lastRunAt = now;
    tasks[idx].updatedAt = now;
  }
  // 寫回本次 run 的索引級欄位（runPath/idempotencyKey），讓任務卡能對應到落地檔案
  if (hasSupabase()) {
    const ocTasks = await fetchOpenClawTasks().catch(() => []);
    const oc = ocTasks.find((x) => x.id === task.id);
    if (oc) {
      const current = openClawTaskToTask(oc);
      const updated: Task = {
        ...current,
        status: 'running',
        runPath: run.runPath,
        idempotencyKey: run.idempotencyKey,
        updatedAt: now,
      };
      const ocPayload = taskToOpenClawTask(updated);
      await upsertOpenClawTask({ ...oc, ...ocPayload }).catch(() => {});
    }
  }

  simulateExecution(run.id);
  res.status(201).json(run);
});

app.post('/api/runs/:id/rerun', async (req, res) => {
  const old = runs.find((r) => r.id === req.params.id);
  if (!old) return res.status(404).json({ message: 'Run not found' });
  const task = await getTaskForRun(old.taskId);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  const run = createRun(task);
  runs.unshift(run);
  const now = run.startedAt;
  const tidx = tasks.findIndex((t) => t.id === task.id);
  if (tidx !== -1) {
    tasks[tidx].lastRunStatus = 'queued';
    tasks[tidx].lastRunAt = now;
    tasks[tidx].updatedAt = now;
  }
  simulateExecution(run.id);
  res.status(201).json(run);
});

// ---- Alerts ----
app.get('/api/alerts', async (_req, res) => {
  if (hasSupabase()) {
    const reviews = await fetchOpenClawReviews();
    const mapped = reviews.map(openClawReviewToAlert);
    return res.json(mapped);
  }
  res.json(alerts);
});

app.patch('/api/alerts/:id', validateBody(updateAlertSchema), async (req, res) => {
  if (hasSupabase()) {
    const reviews = await fetchOpenClawReviews();
    const r = reviews.find((a) => a.id === req.params.id);
    if (!r) return res.status(404).json({ message: 'Alert not found' });
    const newStatus = req.body?.status === 'acked' ? 'approved' : req.body?.status === 'open' ? 'pending' : r.status;
    const updated = await upsertOpenClawReview({ ...r, status: newStatus });
    if (!updated) return res.status(500).json({ message: 'Failed to update alert' });
    return res.json(openClawReviewToAlert(updated));
  }
  const idx = alerts.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Alert not found' });
  alerts[idx] = { ...alerts[idx], ...req.body };
  res.json(alerts[idx]);
});

// ---- OpenClaw v4 板（Supabase 持久化）----
// 取得任務（供 run 等使用）：Supabase 或 in-memory fallback
async function getTaskForRun(taskId: string): Promise<Task | null> {
  if (hasSupabase()) {
    const ocTasks = await fetchOpenClawTasks();
    const oc = ocTasks.find((x) => x.id === taskId);
    if (oc) return openClawTaskToTask(oc);
  }
  return tasks.find((t) => t.id === taskId) ?? null;
}

function formatRunTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return iso;
  }
}

async function executeNextQueuedTask(): Promise<
  | { ok: true; run: Run; taskId: string }
  | { ok: false; status: number; message: string }
> {
  let list: { id: string; status: string }[] = [];
  const ocTasks = await fetchOpenClawTasks().catch(() => [] as OpenClawTask[]);
  if (ocTasks.length > 0) {
    list = ocTasks.map((t) => ({ id: t.id ?? '', status: t.status }));
  } else if (tasks.length > 0) {
    list = tasks.map((t) => ({
      id: t.id,
      status: t.status === 'running' ? 'in_progress' : t.status === 'done' ? 'done' : 'queued',
    }));
  }
  const candidates = list.filter((t) => t.status === 'queued' || t.status === 'ready');
  if (candidates.length === 0) {
    return { ok: false, status: 409, message: '沒有可執行的排隊任務' };
  }

  // 跳過不符合閉環規範的任務（避免跑到空卡 / 無落地）
  let task: Task | null = null;
  for (const c of candidates) {
    const fetched = await getTaskForRun(c.id);
    if (!fetched) continue;
    const gate = validateTaskForGate(fetched, 'ready');
    if (!gate.ok) continue;
    task = fetched;
    break;
  }
  if (!task) {
    return { ok: false, status: 409, message: '沒有符合規範的排隊任務可執行（可檢查任務卡是否缺少 projectPath、acceptanceCriteria 等欄位）' };
  }

  let run = createRun(task);
  if (hasSupabase()) {
    const inserted = await insertOpenClawRun({
      task_id: task.id,
      task_name: task.name,
      status: 'queued',
      started_at: run.startedAt,
      input_summary: typeof run.inputSummary === 'string' ? run.inputSummary : JSON.stringify(run.inputSummary ?? {}),
      steps: run.steps,
    });
    if (inserted?.id) run = { ...run, id: inserted.id };
  }
  runs.unshift(run);
  const now = run.startedAt;
  const idx = tasks.findIndex((t) => t.id === task.id);
  if (idx !== -1) {
    tasks[idx].lastRunStatus = 'queued';
    tasks[idx].lastRunAt = now;
    tasks[idx].updatedAt = now;
  }

  // 寫回 run 索引（runPath/idempotencyKey），讓任務卡可追到 RESULT.md
  if (hasSupabase()) {
    const ocTasks2 = await fetchOpenClawTasks().catch(() => []);
    const oc = ocTasks2.find((x) => x.id === task.id);
    if (oc) {
      const current = openClawTaskToTask(oc);
      const updated: Task = {
        ...current,
        status: 'running',
        runPath: run.runPath,
        idempotencyKey: run.idempotencyKey,
        updatedAt: now,
      };
      const ocPayload = taskToOpenClawTask(updated);
      await upsertOpenClawTask({ ...oc, ...ocPayload }).catch(() => {});
    }
  }

  simulateExecution(run.id);
  return { ok: true, run, taskId: task.id };
}

// OpenClaw 任務 CRUD 已遷移至 routes/openclaw-tasks.ts
// 以下保留需要 index.ts 本地函數（createRun/simulateExecution）的執行路由

// OpenClaw 執行任務（與 /api/tasks/:id/run 相同邏輯；有 Supabase 時寫入 openclaw_runs）
app.post('/api/openclaw/tasks/:id/run', async (req, res) => {
  const task = await getTaskForRun(req.params.id);
  if (!task)
    return res.status(404).json({ message: 'Task not found' });
  let run = createRun(task);
  if (hasSupabase()) {
    const inserted = await insertOpenClawRun({
      task_id: task.id,
      task_name: task.name,
      status: 'queued',
      started_at: run.startedAt,
      input_summary: typeof run.inputSummary === 'string' ? run.inputSummary : JSON.stringify(run.inputSummary ?? {}),
      steps: run.steps,
    });
    if (inserted?.id) run = { ...run, id: inserted.id };
  }
  runs.unshift(run);
  const now = run.startedAt;
  const idx = tasks.findIndex((t) => t.id === task.id);
  if (idx !== -1) {
    tasks[idx].lastRunStatus = 'queued';
    tasks[idx].lastRunAt = now;
    tasks[idx].updatedAt = now;
  }
  simulateExecution(run.id);
  res.status(201).json(run);
});

// 自動化：執行第一個 queued 任務（供 cron / n8n 呼叫）
app.post('/api/openclaw/run-next', async (_req, res) => {
  const result = await executeNextQueuedTask();
  if (!result.ok) return res.status(result.status).json({ ok: false, message: result.message });
  res.status(201).json({ run: result.run, taskId: result.taskId });
});

// OpenClaw reviews CRUD 已遷移至 routes/openclaw-reviews.ts

// ─── 紅色警戒 ─────────────────────────────────────────────

/** 小蔡觸發紅色警戒：建立警報 + block 任務 + Telegram 通知 */
app.post('/api/openclaw/red-alert', async (req, res) => {
  try {
    const { taskId, title, description, severity, category } = req.body as {
      taskId?: string;
      title?: string;
      description?: string;
      severity?: string;
      category?: string;
    };
    if (!taskId || !title || !description) {
      return res.status(400).json({ message: 'taskId, title, description 必填' });
    }
    const sev = severity === 'critical' ? 'critical' : 'high';
    const reviewId = `alert-${Date.now()}`;

    // 1. 建立警報紀錄（Supabase or in-memory）
    if (hasSupabase()) {
      await upsertOpenClawReview({
        id: reviewId,
        title: `🚨 ${title}`,
        desc: description,
        type: 'red_alert',
        pri: sev === 'critical' ? 'P1' : 'P2',
        status: 'pending',
        src: `task:${taskId}`,
        reasoning: `category: ${category || 'other'}`,
      });
    }
    // in-memory fallback
    alerts.push({
      id: reviewId,
      type: 'red_alert',
      severity: sev === 'critical' ? 'critical' : 'high',
      status: 'open',
      createdAt: new Date().toISOString(),
      message: `${title}: ${description}`,
      relatedTaskId: taskId,
    });

    // 2. 標記任務為 blocked（Supabase or in-memory）
    if (hasSupabase()) {
      const task = await fetchOpenClawTaskById(taskId);
      if (task) {
        await upsertOpenClawTask({ ...task, id: taskId, status: 'blocked' as never });
      }
    }
    const memTask = tasks.find((t) => t.id === taskId);
    if (memTask) memTask.status = 'blocked';

    // 3. Telegram 通知（帶解決按鈕）
    await notifyRedAlert(reviewId, taskId, title, description, sev);

    // 4. WebSocket 廣播
    wsManager.broadcast({ type: 'red_alert', data: { reviewId, taskId, title, severity: sev } });

    res.status(201).json({ ok: true, reviewId });
  } catch (e) {
    log.error('[RedAlert] trigger error:', e);
    res.status(500).json({ message: 'Failed to trigger red alert' });
  }
});

/** 老蔡解除紅色警戒：review approved + 任務恢復 queued */
app.post('/api/openclaw/red-alert/:reviewId/resolve', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { taskId } = req.body as { taskId?: string };
    if (!taskId) return res.status(400).json({ message: 'taskId 必填' });

    // 1. 更新警報為已解除（Supabase or in-memory）
    if (hasSupabase()) {
      const reviews = await fetchOpenClawReviews();
      const review = reviews.find((r) => r.id === reviewId);
      if (review) await upsertOpenClawReview({ ...review, status: 'approved' });
    }
    const memAlert = alerts.find((a) => a.id === reviewId);
    if (memAlert) memAlert.status = 'acked';

    // 2. 解鎖任務
    if (hasSupabase()) {
      const task = await fetchOpenClawTaskById(taskId);
      if (task) {
        await upsertOpenClawTask({ ...task, id: taskId, status: 'queued' as never });
      }
    }
    const memTask = tasks.find((t) => t.id === taskId);
    if (memTask) memTask.status = 'ready';

    // 3. WebSocket 廣播
    wsManager.broadcast({ type: 'alert_resolved', data: { reviewId, taskId } });

    res.json({ ok: true, message: 'Alert resolved, task unblocked' });
  } catch (e) {
    log.error('[RedAlert] resolve error:', e);
    res.status(500).json({ message: 'Failed to resolve alert' });
  }
});

// ─── /紅色警戒 ────────────────────────────────────────────

// ─── 發想提案 ─────────────────────────────────────────────

const PROPOSAL_CAT_EMOJI: Record<string, string> = {
  commercial: '💼', system: '⚙️', tool: '🔧', risk: '🛡️', creative: '💡',
};

/** 小蔡提案：建立提案 review + Telegram 通知老蔡 */
app.post('/api/openclaw/proposal', async (req, res) => {
  try {
    const { title, category, background, idea, goal, risk } = req.body as {
      title?: string;
      category?: string;
      background?: string;
      idea?: string;
      goal?: string;
      risk?: string;
    };
    if (!title || !category || !background || !idea) {
      return res.status(400).json({ message: 'title, category, background, idea 必填' });
    }
    const catEmoji = PROPOSAL_CAT_EMOJI[category] || '💡';
    const reviewId = `proposal-${Date.now()}`;
    const desc = [
      `【背景】${background}`,
      `【點子】${idea}`,
      goal ? `【目標】${goal}` : '',
      risk ? `【風險】${risk}` : '',
    ].filter(Boolean).join('\n');

    // 1. 建立提案紀錄（Supabase + in-memory fallback）
    const reviewData = {
      id: reviewId,
      title: `${catEmoji} ${title}`,
      desc,
      type: 'proposal',
      pri: 'medium',
      status: 'pending',
      src: `agent-proposal:${category}`,
      reasoning: idea,
    };
    let savedToSupabase = false;
    if (hasSupabase()) {
      const result = await upsertOpenClawReview(reviewData);
      savedToSupabase = !!result;
    }
    // in-memory fallback — 確保 GET /reviews 一定拿得到
    if (!savedToSupabase) {
      memReviews.push({
        id: reviewId,
        title: `${catEmoji} ${title}`,
        desc,
        type: 'proposal',
        pri: 'medium',
        status: 'pending',
        src: `agent-proposal:${category}`,
        reasoning: idea,
        created_at: new Date().toISOString(),
      });
    }

    // 2. Telegram 通知（帶審核按鈕）
    await notifyProposal(reviewId, title, category, background, goal || '', risk || '');

    // 3. WebSocket 廣播
    wsManager.broadcast({ type: 'new_proposal', data: { reviewId, title, category } });

    res.status(201).json({ ok: true, reviewId });
  } catch (e) {
    log.error('[Proposal] submit error:', e);
    res.status(500).json({ message: 'Failed to submit proposal' });
  }
});

/** 老蔡審核提案：批准 / 駁回 / 批准+轉任務 */
app.post('/api/openclaw/proposal/:reviewId/decide', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { decision, note } = req.body as { decision?: string; note?: string };
    if (!decision || !['approved', 'rejected', 'task'].includes(decision)) {
      return res.status(400).json({ message: 'decision 必填（approved / rejected / task）' });
    }

    const newStatus = decision === 'rejected' ? 'rejected' : 'approved';

    // 1. 更新 review 狀態（Supabase or in-memory）
    if (hasSupabase()) {
      const reviews = await fetchOpenClawReviews();
      const review = reviews.find((r) => r.id === reviewId);
      if (review) {
        await upsertOpenClawReview({
          ...review,
          status: newStatus,
          reasoning: note ? `${review.reasoning || ''}\n---\n老蔡：${note}` : review.reasoning,
        });
      }
    }
    const memAlert = alerts.find((a) => a.id === reviewId);
    if (memAlert) memAlert.status = newStatus === 'approved' ? 'acked' : 'snoozed';
    // 更新 in-memory reviews fallback
    const memRev = memReviews.find((r) => r.id === reviewId);
    if (memRev) {
      memRev.status = newStatus;
      if (note) memRev.reasoning = `${memRev.reasoning || ''}\n---\n老蔡：${note}`;
    }

    // 2. 如果是「批准+轉任務」，建立任務
    let taskId: string | null = null;
    if (decision === 'task') {
      // 先從 Supabase 找 review 資料
      let reviewTitle = '';
      let reviewDesc = '';
      if (hasSupabase()) {
        const reviews = await fetchOpenClawReviews();
        const review = reviews.find((r) => r.id === reviewId);
        if (review) {
          reviewTitle = review.title;
          reviewDesc = review.desc ?? '';
        }
      }
      // fallback: 從 in-memory reviews 找
      if (!reviewTitle && memRev) {
        reviewTitle = memRev.title;
        reviewDesc = memRev.desc ?? '';
      }
      // fallback: 從 in-memory alerts 找
      if (!reviewTitle && memAlert) {
        reviewTitle = memAlert.message.split(':')[0]?.trim() || reviewId;
        reviewDesc = memAlert.message;
      }
      if (reviewTitle) {
        const tId = `t${Date.now()}`;
        if (hasSupabase()) {
          await upsertOpenClawTask({
            id: tId,
            title: reviewTitle,
            name: reviewTitle,
            status: 'queued' as never,
            progress: 0,
            cat: 'feature',
            subs: [{ t: '實作', d: false }, { t: '驗證', d: false }],
            fromR: reviewId,
            thought: reviewDesc,
          } as never);
        }
        // in-memory fallback
        tasks.push({
          id: tId,
          name: reviewTitle,
          description: reviewDesc,
          status: 'ready',
          tags: ['feature'],
          projectPath: '',
          isAutoGenerated: false,
          updatedAt: new Date().toISOString(),
        } as never);
        taskId = tId;
      }
    }

    // 3. WebSocket 廣播
    wsManager.broadcast({
      type: 'proposal_decided',
      data: { reviewId, decision, taskId },
    });

    res.json({ ok: true, decision, taskId });
  } catch (e) {
    log.error('[Proposal] decide error:', e);
    res.status(500).json({ message: 'Failed to decide proposal' });
  }
});

// automations CRUD + evolution-log + ui-actions 已遷移至 routes/openclaw-data.ts
// 保留 automations/:id/run — 因依賴執行引擎（executeNextQueuedTask 等）

app.post('/api/openclaw/automations/:id/run', async (req, res) => {
  try {
    const list = await fetchOpenClawAutomations();
    const automation = list.find((a) => a.id === req.params.id);
    if (!automation) return res.status(404).json({ ok: false, message: 'Automation not found' });

    const nowIso = new Date().toISOString();
    const runLabel = formatRunTime(nowIso);
    const nextRuns = (Number(automation.runs) || 0) + 1;
    let nextHealth = Math.min(100, (Number(automation.health) || 100) + 1);
    let mode: 'webhook' | 'run-next' = 'run-next';
    let resultPayload: unknown = null;
    let runInfo: Run | null = null;
    let taskId: string | null = null;
    let createdRunId: string | null = null;

    const candidateUrl = req.body?.webhookUrl || process.env.N8N_WEBHOOK_RUN_NEXT;
    if (candidateUrl) {
      const checked = validateWebhookUrl(candidateUrl);
      if (!checked.ok) return res.status(400).json({ ok: false, message: checked.message });
      mode = 'webhook';
      try {
        resultPayload = await triggerWebhook(checked.value, {
          source: 'openclaw-automation',
          automationId: automation.id,
          automationName: automation.name,
          chain: automation.chain,
          data: req.body?.data ?? null,
        });
        // webhook 模式成功時，也寫入一筆 run trace（以 automation 為 task）
        if (hasSupabase()) {
          try {
            const row = await insertOpenClawRun({
              task_id: automation.id as string,
              task_name: automation.name as string,
              status: 'success',
              started_at: nowIso,
              input_summary: JSON.stringify({
                mode,
                automationId: automation.id,
                data: req.body?.data ?? null,
              }).slice(0, 4000),
              steps: [
                {
                  name: 'webhook',
                  status: 'success',
                  startedAt: nowIso,
                  endedAt: nowIso,
                  message: 'Webhook 呼叫成功',
                },
              ],
            });
            if (row?.id) createdRunId = row.id;
          } catch (e) {
            log.warn('[OpenClaw] insert automation run trace failed:', e);
          }
        }
      } catch (e) {
        // 基於錯誤訊息做最小分類：4xx / 5xx / network / unknown
        const msg = String(e);
        let errorType: '4xx' | '5xx' | 'network' | 'unknown' = 'unknown';
        const m = msg.match(/Webhook 觸發失敗\\s+(\\d{3})/);
        if (m) {
          const code = Number(m[1]);
          if (code >= 400 && code < 500) errorType = '4xx';
          else if (code >= 500 && code < 600) errorType = '5xx';
        } else if (/fetch failed|ECONN|ENOTFOUND|ETIMEDOUT/i.test(msg)) {
          errorType = 'network';
        }

        nextHealth = Math.max(0, (Number(automation.health) || 100) - 5);
        const failedAutomation = await upsertOpenClawAutomation({
          ...automation,
          runs: nextRuns,
          health: nextHealth,
          lastRun: runLabel,
        });
        // 失敗也寫一筆 run trace，標記為 failed
        if (hasSupabase()) {
          try {
            await insertOpenClawRun({
              task_id: automation.id as string,
              task_name: automation.name as string,
              status: 'failed',
              started_at: nowIso,
              input_summary: JSON.stringify({
                mode,
                automationId: automation.id,
                data: req.body?.data ?? null,
              }).slice(0, 4000),
              steps: [
                {
                  name: 'webhook',
                  status: 'failed',
                  startedAt: nowIso,
                  endedAt: nowIso,
                  message: msg,
                },
              ],
            });
          } catch (err) {
            log.warn('[OpenClaw] insert failed automation run trace failed:', err);
          }
        }
        return res.status(502).json({
          ok: false,
          mode,
          message: msg,
          errorType,
          automation: failedAutomation ?? { ...automation, runs: nextRuns, health: nextHealth, lastRun: runLabel },
        });
      }
    } else {
      const nextResult = await executeNextQueuedTask();
      if (!nextResult.ok) {
        return res.status(nextResult.status).json({ ok: false, mode, message: nextResult.message });
      }
      runInfo = nextResult.run;
      taskId = nextResult.taskId;
    }

    const updatedAutomation = await upsertOpenClawAutomation({
      ...automation,
      runs: nextRuns,
      health: nextHealth,
      lastRun: runLabel,
    });

    res.status(201).json({
      ok: true,
      mode,
      automation: updatedAutomation ?? { ...automation, runs: nextRuns, health: nextHealth, lastRun: runLabel },
      run: runInfo ?? (createdRunId ? { id: createdRunId } : undefined),
      taskId,
      result: resultPayload,
    });
  } catch (e) {
    res.status(500).json({ ok: false, message: 'Failed to run automation' });
  }
});

app.post('/api/openclaw/command', async (req, res) => {
  try {
    const body = req.body as {
      sessionId?: string;
      from?: string;
      command?: {
        update?: {
          messages?: Array<{ role?: string; agent?: string; content?: string; metadata?: JsonObject }>;
          artifacts?: {
            files?: string[];
            data?: JsonObject;
          };
          taskResult?: {
            status?: 'success' | 'failed' | 'needs_review';
            output?: string;
            error?: string | null;
          };
        };
        goto?: string;
      };
    };
    const sessionId = body.sessionId?.trim();
    const from = body.from?.trim();
    const command = body.command;
    if (!sessionId || !from || !command) {
      return res.status(400).json({ ok: false, message: 'sessionId/from/command 必填' });
    }
    if (!ensureAgentAllowed(from, 'write')) {
      return res.status(403).json({ ok: false, message: `Agent ${from} 沒有 write 權限` });
    }

    const session = await getSharedState(sessionId);
    const now = nowIso();
    const update = command.update ?? {};
    const messages = Array.isArray(update.messages) ? update.messages : [];
    const artifacts = update.artifacts ?? {};
    const taskResult = update.taskResult ?? {};

    const normalizedMessages: SharedMessage[] =
      messages.length > 0
        ? messages.map((m) => ({
            id: makeId('msg'),
            role: (m.role as SharedMessage['role']) || 'system',
            agent: m.agent,
            content: m.content ?? '',
            timestamp: now,
            metadata: m.metadata
              ? { command: safeJsonObject(m.metadata) }
              : undefined,
          }))
        : [{
            id: makeId('msg'),
            role: 'system',
            agent: from,
            content: 'Agent command received',
            timestamp: now,
            metadata: {
              command: safeJsonObject(command as unknown),
              artifacts: Array.isArray(artifacts.files) ? artifacts.files : [],
            },
          }];

    const nextFiles = new Set([...(session.context.files ?? []), ...((Array.isArray(artifacts.files) ? artifacts.files : []).filter(Boolean))]);
    const nextVariables = {
      ...(session.context.variables ?? {}),
      ...(safeJsonObject(artifacts.data)),
      lastTaskResult: safeJsonObject(taskResult),
      lastGoto: command.goto ?? 'supervisor',
    };

    const executionStatus: SharedState['execution']['status'] =
      taskResult.status === 'failed'
        ? 'failed'
        : taskResult.status === 'success'
          ? 'completed'
          : session.execution.status === 'paused'
            ? 'paused'
            : 'running';

    const updated: SharedState = {
      ...session,
      updatedAt: now,
      messages: [...session.messages, ...normalizedMessages],
      context: {
        ...session.context,
        files: [...nextFiles],
        variables: nextVariables,
      },
      execution: {
        ...session.execution,
        currentAgent: from,
        status: executionStatus,
      },
    };

    const goto = command.goto || 'supervisor';
    const next =
      goto === 'supervisor'
        ? {
            agent: 'supervisor',
            task: '等待 supervisor 派工',
            context: {
              previousAgent: from,
              artifacts: {
                files: Array.isArray(artifacts.files) ? artifacts.files : [],
                data: safeJsonObject(artifacts.data),
              },
            },
          }
        : {
            agent: goto,
            task: '依照 supervisor 指示繼續執行',
            context: {
              previousAgent: from,
              artifacts: {
                files: Array.isArray(artifacts.files) ? artifacts.files : [],
                data: safeJsonObject(artifacts.data),
              },
            },
          };

    await saveSharedState(updated, executionStatus === 'failed' ? 'failed' : executionStatus === 'paused' ? 'paused' : executionStatus === 'completed' ? 'completed' : 'active');
    await appendCommandLog(sessionId, from, safeJsonObject(command as unknown));

    res.json({ ok: true, next });
  } catch (e) {
    log.error('[OpenClaw] POST /api/openclaw/command error:', e);
    res.status(500).json({ ok: false, message: 'Failed to process command' });
  }
});

app.post('/api/openclaw/interrupt', async (req, res) => {
  try {
    const body = req.body as {
      sessionId?: string;
      from?: string;
      reason?: string;
      details?: JsonObject;
      options?: string[];
      timeoutMinutes?: number;
    };
    const sessionId = body.sessionId?.trim();
    const from = body.from?.trim();
    const reason = body.reason?.trim();
    const options = Array.isArray(body.options) && body.options.length > 0 ? body.options : ['approve', 'reject', 'modify'];
    const timeoutMinutes = Number.isFinite(body.timeoutMinutes) ? Math.max(1, Number(body.timeoutMinutes)) : 30;
    if (!sessionId || !from || !reason) {
      return res.status(400).json({ ok: false, message: 'sessionId/from/reason 必填' });
    }
    if (!ensureAgentAllowed(from, 'interrupt')) {
      return res.status(403).json({ ok: false, message: `Agent ${from} 沒有 interrupt 權限` });
    }

    const interruptId = makeId('int');
    const session = await getSharedState(sessionId);
    const now = nowIso();
    const deadline = new Date(Date.now() + timeoutMinutes * 60_000).toISOString();
    const updated: SharedState = {
      ...session,
      updatedAt: now,
      execution: {
        ...session.execution,
        status: 'paused',
      },
      pendingHuman: {
        interruptId,
        reason,
        options,
        deadline,
        details: safeJsonObject(body.details),
      },
      messages: [
        ...session.messages,
        {
          id: makeId('msg'),
          role: 'system',
          agent: from,
          content: `Interrupt requested: ${reason}`,
          timestamp: now,
          metadata: {
            artifacts: session.context.files,
          },
        },
      ],
    };

    await saveSharedState(updated, 'paused');
    await appendCommandLog(sessionId, from, {
      type: 'interrupt_request',
      interruptId,
      reason,
      options,
      timeoutMinutes,
    });

    if (hasSupabase() && supabase) {
      await supabase.from('openclaw_interrupts').insert({
        id: interruptId,
        session_id: sessionId,
        from_agent: from,
        reason,
        decision: null,
      });
    } else {
      memoryInterrupts.set(interruptId, {
        sessionId,
        fromAgent: from,
        reason,
        details: safeJsonObject(body.details),
        options,
        timeoutMinutes,
      });
    }

    res.status(201).json({ ok: true, interruptId, deadline, options });
  } catch (e) {
    log.error('[OpenClaw] POST /api/openclaw/interrupt error:', e);
    res.status(500).json({ ok: false, message: 'Failed to create interrupt' });
  }
});

app.post('/api/openclaw/resume', async (req, res) => {
  try {
    const body = req.body as {
      sessionId?: string;
      interruptId?: string;
      decision?: AgentDecision;
      feedback?: string;
    };
    const sessionId = body.sessionId?.trim();
    const interruptId = body.interruptId?.trim();
    const decision = body.decision;
    const feedback = body.feedback?.trim();
    if (!sessionId || !interruptId || !decision) {
      return res.status(400).json({ ok: false, message: 'sessionId/interruptId/decision 必填' });
    }
    if (!['approve', 'reject', 'modify'].includes(decision)) {
      return res.status(400).json({ ok: false, message: 'decision 僅允許 approve/reject/modify' });
    }

    const session = await getSharedState(sessionId);
    if (!session.pendingHuman || session.pendingHuman.interruptId !== interruptId) {
      return res.status(404).json({ ok: false, message: 'Interrupt not found in session' });
    }

    const now = nowIso();
    const status: SharedState['execution']['status'] = decision === 'reject' ? 'failed' : 'running';
    const updated: SharedState = {
      ...session,
      updatedAt: now,
      pendingHuman: undefined,
      execution: {
        ...session.execution,
        status,
      },
      messages: [
        ...session.messages,
        {
          id: makeId('msg'),
          role: 'system',
          agent: 'human',
          content: `Interrupt resolved: ${decision}${feedback ? ` (${feedback})` : ''}`,
          timestamp: now,
        },
      ],
    };

    await saveSharedState(updated, status === 'failed' ? 'failed' : 'active');
    await appendCommandLog(sessionId, 'human', {
      type: 'interrupt_resolved',
      interruptId,
      decision,
      feedback: feedback ?? null,
    });

    if (hasSupabase() && supabase) {
      await supabase
        .from('openclaw_interrupts')
        .update({
          decision,
          decided_by: 'human',
          resolved_at: now,
        })
        .eq('id', interruptId)
        .eq('session_id', sessionId);
    } else {
      const row = memoryInterrupts.get(interruptId);
      if (row) {
        row.decision = decision;
        row.feedback = feedback;
        row.resolvedAt = now;
      }
    }

    res.json({
      ok: true,
      next: {
        agent: 'supervisor',
        task: decision === 'approve' ? '繼續執行原任務' : decision === 'modify' ? '依 feedback 調整後再執行' : '任務終止，等待重新派工',
        context: {
          interruptId,
          decision,
          feedback: feedback ?? null,
        },
      },
    });
  } catch (e) {
    log.error('[OpenClaw] POST /api/openclaw/resume error:', e);
    res.status(500).json({ ok: false, message: 'Failed to resume session' });
  }
});

// ---- Agent Protocol 查詢端點 ----

// 取得單一 Session（SharedState + DB 狀態）
app.get('/api/openclaw/sessions/:id', async (req, res) => {
  try {
    const sessionId = req.params.id;
    // SharedState（記憶體 or Supabase shared_state）
    const state = await getSharedState(sessionId);

    // DB metadata（若有 Supabase）
    let meta: { status?: string; createdAt?: string; updatedAt?: string } | null = null;
    if (hasSupabase() && supabase) {
      const { data } = await supabase
        .from('openclaw_sessions')
        .select('status, created_at, updated_at')
        .eq('id', sessionId)
        .maybeSingle();
      if (data) {
        const row = data as unknown as Record<string, unknown>;
        meta = {
          status: typeof row.status === 'string' ? row.status : undefined,
          createdAt: typeof row.created_at === 'string' ? row.created_at : undefined,
          updatedAt: typeof row.updated_at === 'string' ? row.updated_at : undefined,
        };
      }
    }

    res.json({
      id: state.sessionId,
      status: meta?.status ?? 'active',
      sharedState: state,
      meta,
    });
  } catch (e) {
    log.error('[OpenClaw] GET /api/openclaw/sessions/:id error:', e);
    res.status(500).json({ ok: false, message: 'Failed to fetch session' });
  }
});

// 取得 Session 的 Command 日誌
app.get('/api/openclaw/sessions/:id/commands', async (req, res) => {
  try {
    const sessionId = req.params.id;
    if (hasSupabase() && supabase) {
      const { data, error } = await supabase
        .from('openclaw_commands')
        .select('id, session_id, from_agent, command, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) {
        log.error('[OpenClaw] fetch openclaw_commands error:', error.message);
        return res.status(500).json({ ok: false, message: 'Failed to fetch commands' });
      }
      return res.json(
        (data ?? []).map((row: unknown) => {
          const r = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
          return {
            id: String(r.id ?? ''),
            sessionId: String(r.session_id ?? ''),
            from: String(r.from_agent ?? ''),
            command: (r.command ?? {}) as JsonObject,
            createdAt: String(r.created_at ?? ''),
          };
        })
      );
    }
    // 無 Supabase 時僅回空陣列（Command 僅寫入 DB）
    return res.json([]);
  } catch (e) {
    log.error('[OpenClaw] GET /api/openclaw/sessions/:id/commands error:', e);
    res.status(500).json({ ok: false, message: 'Failed to fetch commands' });
  }
});

// 取得 Session 的 Interrupt 記錄
app.get('/api/openclaw/sessions/:id/interrupts', async (req, res) => {
  try {
    const sessionId = req.params.id;
    if (hasSupabase() && supabase) {
      const { data, error } = await supabase
        .from('openclaw_interrupts')
        .select('id, session_id, from_agent, reason, decision, decided_by, created_at, resolved_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) {
        log.error('[OpenClaw] fetch openclaw_interrupts error:', error.message);
        return res.status(500).json({ ok: false, message: 'Failed to fetch interrupts' });
      }
      return res.json(
        (data ?? []).map((row: unknown) => {
          const r = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
          return {
            id: String(r.id ?? ''),
            sessionId: String(r.session_id ?? ''),
            from: String(r.from_agent ?? ''),
            reason: String(r.reason ?? ''),
            decision: r.decision == null ? null : String(r.decision),
            decidedBy: r.decided_by == null ? null : String(r.decided_by),
            createdAt: String(r.created_at ?? ''),
            resolvedAt: r.resolved_at == null ? null : String(r.resolved_at),
          };
        })
      );
    }
    // fallback：使用記憶體中的中斷狀態
    const rows: Array<{
      id: string;
      sessionId: string;
      from: string;
      reason: string;
      decision?: AgentDecision;
      feedback?: string;
      createdAt: string;
      resolvedAt?: string;
    }> = [];
    for (const [id, row] of memoryInterrupts.entries()) {
      if (row.sessionId !== sessionId) continue;
      rows.push({
        id,
        sessionId: row.sessionId,
        from: row.fromAgent,
        reason: row.reason,
        decision: row.decision,
        feedback: row.feedback,
        createdAt: '', // 僅記憶體，不追蹤時間
        resolvedAt: row.resolvedAt,
      });
    }
    return res.json(rows);
  } catch (e) {
    log.error('[OpenClaw] GET /api/openclaw/sessions/:id/interrupts error:', e);
    res.status(500).json({ ok: false, message: 'Failed to fetch interrupts' });
  }
});

// ---- Board Config（中控板單一資料源，供多任務板同步）----
const BOARD_CONFIG = {
  apiEndpoints: [
    { name: '任務列表', method: 'GET', path: '/api/tasks', auth: 'user+', authDesc: '登入用戶或以上（JWT）', desc: '取得任務列表', rateLimit: '100/min', status: 'live', storage: 'Supabase · tasks' },
    { name: '建立任務', method: 'POST', path: '/api/tasks', auth: 'admin', authDesc: '管理員（JWT role=admin）', desc: '建立新任務', rateLimit: '30/min', status: 'live', storage: 'Supabase · tasks' },
    { name: '更新任務進度', method: 'PATCH', path: '/api/tasks/:id/progress', auth: 'agent', authDesc: 'OpenClaw Agent 專用（Bearer Token）', desc: 'Agent 回報任務進度、子任務完成狀態', rateLimit: '60/min', status: 'live', storage: 'Supabase · tasks' },
    { name: '審核列表', method: 'GET', path: '/api/reviews', auth: 'user+', authDesc: '登入用戶或以上（JWT）', desc: '取得待審核/已批准項目', rateLimit: '100/min', status: 'live', storage: 'Supabase · reviews' },
    { name: '批准審核', method: 'POST', path: '/api/reviews/:id/approve', auth: 'admin', authDesc: '管理員（JWT role=admin）', desc: '批准審核項目，寫入 reviews.status=approved', rateLimit: '20/min', status: 'live', storage: 'Supabase · reviews' },
    { name: '駁回審核', method: 'POST', path: '/api/reviews/:id/reject', auth: 'admin', authDesc: '管理員（JWT role=admin）', desc: '駁回審核項目，寫入 reviews.status=rejected', rateLimit: '20/min', status: 'live', storage: 'Supabase · reviews' },
    { name: 'OpenClaw Webhook', method: 'POST', path: '/api/webhook/openclaw', auth: 'api_key', authDesc: '請求需帶 X-API-Key 或 Authorization Bearer', desc: 'n8n 接收 Agent 結果後呼叫，寫入 tasks/reviews', rateLimit: '200/min', status: 'live', storage: 'Supabase · tasks, reviews' },
    { name: 'Telegram Webhook', method: 'POST', path: '/api/webhook/telegram', auth: 'tg_secret', authDesc: 'Header 驗證 Telegram Bot Webhook Secret（HMAC）', desc: '接收 Telegram 指令（/approve /reject 等）', rateLimit: '300/min', status: 'live', storage: 'Supabase · reviews（更新狀態）' },
    { name: '自動化列表', method: 'GET', path: '/api/automations', auth: 'user+', authDesc: '登入用戶或以上（JWT）', desc: '取得排程自動化清單（含 cron、啟用狀態）', rateLimit: '60/min', status: 'live', storage: 'Supabase · automations' },
    { name: '註冊 Plugin', method: 'POST', path: '/api/plugins/register', auth: 'admin', authDesc: '管理員（JWT role=admin）', desc: '註冊新 Plugin，寫入 plugins 表', rateLimit: '10/min', status: 'beta', storage: 'Supabase · plugins' },
  ] as const,
  securityLayers: [
    { id: 's1', name: 'Supabase Auth + JWT', status: 'active', detail: 'Email / Magic Link / OAuth 登入，JWT 自動附帶 role claim', icon: '🔐' },
    { id: 's2', name: 'RLS 資料庫層防護', status: 'active', detail: '每張表啟用 Row Level Security，依 user_role + auth.uid() 過濾', icon: '🛡️' },
    { id: 's3', name: 'RBAC 角色權限', status: 'active', detail: 'admin / user / agent 三層角色，透過 Custom Access Token Hook 注入 JWT', icon: '👤' },
    { id: 's4', name: 'API Rate Limiting', status: 'active', detail: 'Upstash Redis 速率限制，IP + User 雙維度，防止暴力攻擊', icon: '⏱️' },
    { id: 's5', name: 'Webhook 簽名驗證', status: 'active', detail: 'n8n / Telegram Webhook 使用 HMAC-SHA256 簽名驗證', icon: '✍️' },
    { id: 's6', name: 'CSP + CORS 防護', status: 'active', detail: '嚴格 Content-Security-Policy，僅允許白名單 Origin', icon: '🌐' },
    { id: 's7', name: 'Audit Log 稽核', status: 'active', detail: '所有管理操作寫入 audit_logs 表，含 IP / UA / 變更 diff', icon: '📝' },
    { id: 's8', name: '環境變數加密', status: 'active', detail: 'Vercel Encrypted Env + Supabase Vault 管理 secrets', icon: '🔒' },
  ] as const,
  rbacMatrix: [
    { resource: 'tasks', admin: 'CRUD', user: 'R', agent: 'RU' },
    { resource: 'reviews', admin: 'CRUD', user: 'R', agent: 'CR' },
    { resource: 'automations', admin: 'CRUD', user: 'R', agent: 'R' },
    { resource: 'evolution_log', admin: 'CRUD', user: 'R', agent: 'C' },
    { resource: 'plugins', admin: 'CRUD', user: 'R', agent: '—' },
    { resource: 'audit_logs', admin: 'R', user: '—', agent: '—' },
    { resource: 'user_settings', admin: 'CRUD', user: 'RU (own)', agent: '—' },
  ] as const,
  plugins: [
    { id: 'p1', name: 'GitHub Scanner', status: 'active', desc: '掃描 Repo issue / PR / CVE', icon: '🐙', calls: 1247 },
    { id: 'p2', name: 'Telegram Bridge', status: 'active', desc: '雙向指令 + 通知推送', icon: '✈️', calls: 892 },
    { id: 'p3', name: 'Sentry Monitor', status: 'active', desc: '錯誤追蹤 + 自動建立 review', icon: '🔴', calls: 156 },
    { id: 'p4', name: 'Notion Sync', status: 'inactive', desc: '同步任務到 Notion 看板', icon: '📓', calls: 0 },
    { id: 'p5', name: 'Slack Notifier', status: 'inactive', desc: '推送到 Slack Channel', icon: '💬', calls: 0 },
    { id: 'p6', name: 'Custom Tool (可擴充)', status: 'template', desc: '你的下一個 Plugin...', icon: '🧩', calls: 0 },
  ] as const,
  n8nFlowsFallback: [
    { id: 'n1', name: 'OpenClaw Agent → Supabase Sync', status: 'active', trigger: 'Webhook', nodes: 8, execs: 1247, lastExec: '2 min ago', desc: '接收 OpenClaw 任務結果，寫入 Supabase tasks/reviews 表，觸發 Telegram 通知' },
    { id: 'n2', name: 'Telegram → 審核指令路由', status: 'active', trigger: 'Telegram Trigger', nodes: 12, execs: 89, lastExec: '15 min ago', desc: '解析 /approve /reject /status 指令，更新 Supabase 審核狀態，回傳結果' },
    { id: 'n3', name: '排程自動化執行器', status: 'active', trigger: 'Cron', nodes: 6, execs: 432, lastExec: '08:00', desc: '依據 automations 表的 cron 設定，觸發對應的掃描/測試流程' },
    { id: 'n4', name: '告警推送 Pipeline', status: 'active', trigger: 'Supabase Realtime', nodes: 5, execs: 34, lastExec: '09:15', desc: '監聽 critical 等級審核項目，即時推送 Telegram + Email 告警' },
    { id: 'n5', name: 'API Rate Limiter', status: 'draft', trigger: 'Webhook', nodes: 4, execs: 0, lastExec: '—', desc: '對外部 API 呼叫進行速率限制，防止 token 超支' },
  ] as const,
};

app.get('/api/openclaw/board-config', async (_req, res) => {
  try {
    let n8nFlows: Array<{ id: string; name: string; status: string; trigger: string; nodes: number; execs: number; lastExec: string; desc: string }>;
    if (hasN8n()) {
      try {
        const workflows = await listWorkflows(false);
        n8nFlows = workflows.map((w, i) => ({
          id: w.id,
          name: w.name,
          status: w.active ? 'active' : 'draft',
          trigger: 'Webhook',
          nodes: 0,
          execs: 0,
          lastExec: w.updatedAt ? new Date(w.updatedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : '—',
          desc: '',
        }));
      } catch {
        n8nFlows = [...BOARD_CONFIG.n8nFlowsFallback];
      }
    } else {
      n8nFlows = [...BOARD_CONFIG.n8nFlowsFallback];
    }
    res.json({
      n8nFlows,
      apiEndpoints: BOARD_CONFIG.apiEndpoints,
      securityLayers: BOARD_CONFIG.securityLayers,
      rbacMatrix: BOARD_CONFIG.rbacMatrix,
      plugins: BOARD_CONFIG.plugins,
    });
  } catch (e) {
    log.error('[OpenClaw] GET /api/openclaw/board-config error:', e);
    res.status(500).json({ message: 'Failed to fetch board config' });
  }
});

app.get('/api/openclaw/board-health', async (_req, res) => {
  try {
    const timestamp = new Date().toISOString();
    const supabaseConnected = hasSupabase();
    const n8nConfigured = hasN8n();

    // Keep this endpoint fast + robust; avoid throwing if a downstream call fails.
    const safeLen = async <T>(fn: () => Promise<T[]>, fallback: number): Promise<number> => {
      try {
        const r = await fn();
        return Array.isArray(r) ? r.length : fallback;
      } catch {
        return fallback;
      }
    };

    const [taskCount, reviewCount, automationCount, runCount] = await Promise.all([
      supabaseConnected ? safeLen(() => fetchOpenClawTasks(), tasks.length) : Promise.resolve(tasks.length),
      supabaseConnected ? safeLen(() => fetchOpenClawReviews(), 0) : Promise.resolve(0),
      supabaseConnected ? safeLen(() => fetchOpenClawAutomations(), 0) : Promise.resolve(0),
      supabaseConnected ? safeLen(() => fetchOpenClawRuns(2000), runs.length) : Promise.resolve(runs.length),
    ]);

    const notes: string[] = [];
    if (!supabaseConnected) notes.push('Supabase 未啟用：目前使用本地 in-memory store（重啟會遺失）');
    if (!isTelegramConfigured()) notes.push('Telegram 未設定或不可用');

    res.json({
      ok: true,
      service: 'openclaw-server',
      timestamp,
      backend: {
        supabaseConnected,
        n8nConfigured,
      },
      counts: {
        tasks: taskCount,
        reviews: reviewCount,
        automations: automationCount,
        runs: runCount,
        alerts: alerts.length,
      },
      notes,
    });
  } catch (e) {
    log.error('[OpenClaw] GET /api/openclaw/board-health error:', e);
    res.status(500).json({ ok: false, message: 'Failed to fetch board health' });
  }
});

// ---- Shield Deck / Protection summary ----
// 供「護盾甲板」使用，回傳實際後端與安全設定狀態（避免只顯示假數據）。
app.get('/api/protection/summary', async (_req, res) => {
  try {
    const timestamp = new Date().toISOString();
    const supabaseConnected = hasSupabase();
    const n8nConfigured = hasN8n();

    // 從任務板抓任務，用於計算安全相關任務數量
    let totalTasks = tasks.length;
    let securityTagged = 0;
    let highRisk = 0;
    if (supabaseConnected) {
      try {
        const ocTasks = await fetchOpenClawTasks();
        const mapped = ocTasks.map(openClawTaskToTask);
        totalTasks = mapped.length;
        const securityKeywords = ['security', '安全', '防護', 'shield', '防火牆', 'firewall'];
        for (const t of mapped) {
          const tags = t.tags || [];
          const name = (t.name || '').toLowerCase();
          const desc = (t.description || '').toLowerCase();
          const isSecurityTagged =
            tags.some(tag =>
              securityKeywords.some(kw => tag.toLowerCase().includes(kw))
            ) ||
            securityKeywords.some(kw => name.includes(kw) || desc.includes(kw));
          if (isSecurityTagged) securityTagged += 1;
          if (t.riskLevel === 'high' || t.riskLevel === 'critical') highRisk += 1;
        }
      } catch (e) {
        log.warn('[Protection] fetch tasks failed, fallback to in-memory:', e);
        const securityKeywords = ['security', '安全', '防護', 'shield', '防火牆', 'firewall'];
        for (const t of tasks) {
          const tags = t.tags || [];
          const name = (t.name || '').toLowerCase();
          const desc = (t.description || '').toLowerCase();
          const isSecurityTagged =
            tags.some(tag =>
              securityKeywords.some(kw => tag.toLowerCase().includes(kw))
            ) ||
            securityKeywords.some(kw => name.includes(kw) || desc.includes(kw));
          if (isSecurityTagged) securityTagged += 1;
          if (t.riskLevel === 'high' || t.riskLevel === 'critical') highRisk += 1;
        }
      }
    }

    // 實際的安全設定檢查（不回傳敏感值，只回傳布林狀態）
    const apiKey = process.env.OPENCLAW_API_KEY || '';
    const adminKey = process.env.OPENCLAW_ADMIN_KEY || '';
    const dashboardUser = process.env.OPENCLAW_DASHBOARD_BASIC_USER || '';
    const dashboardPass = process.env.OPENCLAW_DASHBOARD_BASIC_PASS || '';
    const allowedOrigins = process.env.ALLOWED_ORIGINS || '';
    const enforceWriteAuth = process.env.OPENCLAW_ENFORCE_WRITE_AUTH === 'true';

    const apiKeyStrong =
      apiKey.length >= 24 &&
      !apiKey.startsWith('dev-key-') &&
      !apiKey.includes('123456');
    const adminKeyStrong = adminKey.length >= 24;
    const dashboardAuthConfigured = Boolean(dashboardUser && dashboardPass);
    const corsConfigured = Boolean(allowedOrigins);

    res.json({
      ok: true,
      timestamp,
      backend: {
        supabaseConnected,
        n8nConfigured,
      },
      configChecks: {
        apiKeyStrong,
        adminKeyStrong,
        dashboardAuthConfigured,
        corsConfigured,
        enforceWriteAuth,
      },
      taskCounts: {
        total: totalTasks,
        securityTagged,
        highRisk,
      },
    });
  } catch (e) {
    log.error('[Protection] GET /api/protection/summary error:', e);
    res.status(500).json({ ok: false, message: 'Failed to fetch protection summary' });
  }
});

// ==================== Defense Deck API ====================

// GET /api/defense/status — 防禦總覽（防火牆 + 統計）
app.get('/api/defense/status', async (_req, res) => {
  try {
    // 防火牆白名單規則（from env）
    const gatewayConfig = process.env.GATEWAY_CONFIG ? (() => {
      try { return JSON.parse(process.env.GATEWAY_CONFIG); } catch { return null; }
    })() : null;
    const allowedEvents: string[] = gatewayConfig?.allowedOutbound ?? [
      'message','ping','pong','heartbeat','status','task_update','notification',
    ];

    // firewall_logs 統計（今日）
    let blockedToday = 0;
    let recentLogs: Array<{ event_type: string; origin: string; severity: string; blocked_at: string }> = [];
    if (hasSupabase() && supabase) {
      const today = new Date(); today.setHours(0,0,0,0);
      const { data: logs } = await supabase
        .from('firewall_logs')
        .select('event_type, origin, severity, blocked_at')
        .gte('blocked_at', today.toISOString())
        .order('blocked_at', { ascending: false })
        .limit(50);
      recentLogs = (logs ?? []) as typeof recentLogs;
      blockedToday = recentLogs.length;
    }

    // auto-executor 中目前 running 的任務數（危險指標）
    let runningTasks = 0;
    if (hasSupabase() && supabase) {
      const { data: tasks } = await supabase.from('openclaw_tasks').select('id').eq('status','in_progress');
      runningTasks = (tasks ?? []).length;
    }

    res.json({
      ok: true,
      firewall: {
        enabled: true,
        allowedEvents,
        blockedToday,
        recentLogs: recentLogs.slice(0, 20),
      },
      executor: {
        isRunning: autoExecutorState.isRunning,
        dispatchMode: autoExecutorState.dispatchMode,
        runningTasks,
        totalExecutedToday: autoExecutorState.totalExecutedToday,
      },
    });
  } catch (e) {
    log.error('[Defense] GET /api/defense/status error:', e);
    res.status(500).json({ ok: false, message: 'Defense status fetch failed' });
  }
});

// GET /api/defense/firewall-logs — 防火牆日誌（最近 N 筆）
app.get('/api/defense/firewall-logs', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    if (!hasSupabase() || !supabase) {
      return res.json({ ok: true, logs: [], total: 0, note: 'Supabase not connected' });
    }
    const { data: logs, error } = await supabase
      .from('firewall_logs')
      .select('*')
      .order('blocked_at', { ascending: false })
      .limit(limit);
    if (error) {
      // firewall_logs 表可能尚未建立，回空陣列
      return res.json({ ok: true, logs: [], total: 0, note: error.message });
    }
    res.json({ ok: true, logs: logs ?? [], total: (logs ?? []).length });
  } catch (e) {
    log.error('[Defense] GET /api/defense/firewall-logs error:', e);
    res.status(500).json({ ok: false, message: 'Failed to fetch firewall logs' });
  }
});

// GET /api/defense/deputy — 副手(小蔡)即時狀態
app.get('/api/defense/deputy', (_req, res) => {
  try {
    const deputyState = (() => {
      try { return JSON.parse(fs.readFileSync(DEPUTY_STATE_FILE, 'utf8')); } catch { return null; }
    })();
    const deputyLast = (() => {
      try { return JSON.parse(fs.readFileSync(DEPUTY_LAST_FILE, 'utf8')); } catch { return null; }
    })();

    // 讀取 deputy log 最後 20 行
    let recentLog: string[] = [];
    try {
      const logDir = path.join(repoRootPath(), 'server', 'logs');
      const logFiles = fs.readdirSync(logDir).filter(f => f.startsWith('deputy')).sort().reverse();
      if (logFiles.length > 0) {
        const content = fs.readFileSync(path.join(logDir, logFiles[0]), 'utf8');
        recentLog = content.split('\n').filter(Boolean).slice(-20);
      }
    } catch { /* log dir may not exist */ }

    res.json({
      ok: true,
      mode: deputyState?.mode ?? 'off',
      enabled: deputyState?.enabled ?? false,
      lastRun: deputyLast?.startedAt ?? null,
      lastRunStatus: deputyLast?.status ?? null,
      lastRunDurationMs: deputyLast?.durationMs ?? null,
      recentLog,
      executor: {
        isRunning: autoExecutorState.isRunning,
        dispatchMode: autoExecutorState.dispatchMode,
        pendingReviews: autoExecutorState.pendingReviews.length,
        recentExecutions: autoExecutorState.recentExecutions.slice(-5),
      },
    });
  } catch (e) {
    log.error('[Defense] GET /api/defense/deputy error:', e);
    res.status(500).json({ ok: false, message: 'Failed to fetch deputy status' });
  }
});

// ---- Community contact / collaboration (L1/L2) ----
type CommunityApplicationStatus = 'pending' | 'approved' | 'rejected' | 'replied';

interface CommunityApplication {
  id: string;
  name: string;
  email?: string | null;
  channel?: string | null;
  topic?: string | null;
  message?: string | null;
  status: CommunityApplicationStatus;
  created_at: string;
}

const inMemoryApplications: CommunityApplication[] = [];

// L1: 基礎接觸 — 提交協作者 / 聯絡申請
app.post('/api/community/apply', async (req, res) => {
  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const message = String(body.message || '').trim();
    if (!name || !message) {
      return res.status(400).json({ ok: false, message: 'name 與 message 為必填' });
    }
    const email = body.email ? String(body.email).trim() : null;
    const channel = body.channel ? String(body.channel).trim() : null;
    const topic = body.topic ? String(body.topic).trim() : null;
    const id = `ca-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const appRow: CommunityApplication = {
      id,
      name,
      email,
      channel,
      topic,
      message,
      status: 'pending',
      created_at: now,
    };

    if (hasSupabase() && supabase) {
      try {
        await supabase.from('community_applications').insert({
          id: appRow.id,
          name: appRow.name,
          email: appRow.email,
          channel: appRow.channel,
          topic: appRow.topic,
          message: appRow.message,
          status: appRow.status,
          created_at: appRow.created_at,
        });
      } catch (e) {
        log.warn('[Community] insert community_applications failed, fallback to memory:', e);
        inMemoryApplications.unshift(appRow);
      }
    } else {
      inMemoryApplications.unshift(appRow);
    }

    // Telegram 通知（若已設定）
    if (isTelegramConfigured()) {
      const lines = [
        '🤝 <b>新基礎接觸申請</b>',
        '',
        `<b>名稱：</b>${name}`,
        email ? `<b>Email：</b>${email}` : '',
        channel ? `<b>來源：</b>${channel}` : '',
        topic ? `<b>主題：</b>${topic}` : '',
        '',
        `<b>訊息：</b>${message.slice(0, 500)}`,
      ].filter(Boolean);
      sendTelegramMessage(lines.join('\n'), { parseMode: 'HTML' }).catch((e) => {
        log.warn('[Community] telegram notify failed:', e);
      });
    }

    res.status(201).json({ ok: true, id, status: 'pending' });
  } catch (e) {
    log.error('[Community] POST /api/community/apply error:', e);
    res.status(500).json({ ok: false, message: 'Failed to submit application' });
  }
});

// L1: 基礎接觸 — 申請列表（給 CommunicationDeck 用）
app.get('/api/community/applications', async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10) || 20, 100);
    let rows: CommunityApplication[] = [];
    if (hasSupabase() && supabase) {
      try {
        const { data, error } = await supabase
          .from('community_applications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
        if (error) {
          log.warn('[Community] fetch applications from Supabase failed:', error.message);
        } else if (data) {
          rows = (data as any[]).map((r) => ({
            id: String(r.id),
            name: String(r.name ?? ''),
            email: r.email ? String(r.email) : null,
            channel: r.channel ? String(r.channel) : null,
            topic: r.topic ? String(r.topic) : null,
            message: r.message ? String(r.message) : null,
            status: (r.status as CommunityApplicationStatus) || 'pending',
            created_at: String(r.created_at ?? new Date().toISOString()),
          }));
        }
      } catch (e) {
        log.warn('[Community] fetch applications threw error, fallback to memory:', e);
      }
    }
    if (!rows.length) {
      rows = [...inMemoryApplications].slice(0, limit);
    }
    res.json({ ok: true, applications: rows });
  } catch (e) {
    log.error('[Community] GET /api/community/applications error:', e);
    res.status(500).json({ ok: false, message: 'Failed to fetch applications' });
  }
});

// L1: 基礎接觸 — 簡易統計
app.get('/api/community/contact-stats', async (_req, res) => {
  try {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    let rows: CommunityApplication[] = [];
    if (hasSupabase() && supabase) {
      try {
        const { data, error } = await supabase
          .from('community_applications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);
        if (error) {
          log.warn('[Community] fetch contact-stats from Supabase failed:', error.message);
        } else if (data) {
          rows = (data as any[]).map((r) => ({
            id: String(r.id),
            name: String(r.name ?? ''),
            email: r.email ? String(r.email) : null,
            channel: r.channel ? String(r.channel) : null,
            topic: r.topic ? String(r.topic) : null,
            message: r.message ? String(r.message) : null,
            status: (r.status as CommunityApplicationStatus) || 'pending',
            created_at: String(r.created_at ?? new Date().toISOString()),
          }));
        }
      } catch (e) {
        log.warn('[Community] fetch contact-stats threw error, fallback to memory:', e);
      }
    }
    if (!rows.length) {
      rows = [...inMemoryApplications];
    }
    let today = 0;
    let pending = 0;
    let approvedThisWeek = 0;
    for (const appRow of rows) {
      const d = new Date(appRow.created_at);
      const dayStr = appRow.created_at.slice(0, 10);
      if (dayStr === todayStr) today += 1;
      if (appRow.status === 'pending') pending += 1;
      if (appRow.status === 'approved' && d >= weekAgo) approvedThisWeek += 1;
    }
    res.json({
      ok: true,
      today,
      pending,
      approvedThisWeek,
    });
  } catch (e) {
    log.error('[Community] GET /api/community/contact-stats error:', e);
    res.status(500).json({ ok: false, message: 'Failed to fetch contact stats' });
  }
});

// ---- Wake Report（甦醒報告：前端錯誤累積觸發 → 後端存檔 → CLI 可讀取） ----
type WakeReport = {
  id: string;
  ts: string;
  level: 'wakeup' | 'escalate';
  totalErrors: number;
  errors: Array<{ ts: number; operation: string; error: string; taskId?: string }>;
  topOperations: Array<[string, number]>;
  preStrategy: string;
  newStrategy: string;
  resolved: boolean;
  resolvedAt?: string;
};

const wakeReports: WakeReport[] = [];

// POST — 前端甦醒時寫入
app.post('/api/openclaw/wake-report', async (req, res) => {
  try {
    const body = req.body || {};
    const report: WakeReport = {
      id: `wake-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      ts: new Date().toISOString(),
      level: body.level || 'wakeup',
      totalErrors: body.totalErrors || 0,
      errors: Array.isArray(body.errors) ? body.errors.slice(0, 20) : [],
      topOperations: Array.isArray(body.topOperations) ? body.topOperations : [],
      preStrategy: body.preStrategy || 'auto',
      newStrategy: body.newStrategy || 'standard',
      resolved: false,
    };
    wakeReports.unshift(report);
    // 最多保留 50 筆
    if (wakeReports.length > 50) wakeReports.length = 50;

    // 嘗試寫入 Supabase（如果可用）
    if (hasSupabase()) {
      try {
        await supabase!.from('openclaw_wake_reports').insert({
          id: report.id,
          created_at: report.ts,
          level: report.level,
          total_errors: report.totalErrors,
          errors: report.errors,
          top_operations: report.topOperations,
          pre_strategy: report.preStrategy,
          new_strategy: report.newStrategy,
          resolved: false,
        });
      } catch (dbErr) {
        log.warn('[OpenClaw] wake-report Supabase insert failed (in-memory OK):', dbErr);
      }
    }

    log.info(`[OpenClaw] 🚨 Wake Report received: ${report.level} — ${report.totalErrors} errors`);

    // ── 通知管道 ──

    // 1) Telegram 通知老蔡
    const topOpsText = report.topOperations
      .slice(0, 3)
      .map(([op, cnt]: [string, number]) => `${op}(${cnt}次)`)
      .join(', ');
    const recentText = report.errors
      .slice(-3)
      .map((e: { operation: string; error: string }) => `• ${e.operation} — ${String(e.error).slice(0, 60)}`)
      .join('\n');
    const tgMsg = [
      `🚨 <b>AI 甦醒警報</b> [${report.level}]`,
      ``,
      `累積錯誤：${report.totalErrors} 次`,
      `主要問題：${topOpsText || '未知'}`,
      `策略切換：${report.preStrategy} → ${report.newStrategy}`,
      ``,
      `最近錯誤：`,
      recentText || '（無詳細記錄）',
      ``,
      `💡 請開啟 Claude Code 處理，或到面板查看詳情`,
    ].join('\n');

    if (report.level === 'escalate') {
      notifyRedAlert(report.id, report.id, 'AI 甦醒警報', tgMsg, 'critical').catch(err =>
        log.warn('[OpenClaw] wake Telegram (escalate) failed:', err));
    } else {
      sendTelegramMessage(tgMsg, { parseMode: 'HTML' }).catch(err =>
        log.warn('[OpenClaw] wake Telegram failed:', err));
    }

    // 2) n8n webhook（如有設定 N8N_WEBHOOK_WAKE_REPORT 環境變數）
    if (process.env.N8N_WEBHOOK_WAKE_REPORT) {
      triggerWebhook(process.env.N8N_WEBHOOK_WAKE_REPORT, {
        source: 'openclaw-wake',
        ...report,
      }).catch(err => log.warn('[OpenClaw] wake n8n webhook failed:', err));
    }

    res.json({ ok: true, id: report.id });
  } catch (e) {
    log.error('[OpenClaw] POST /api/openclaw/wake-report error:', e);
    res.status(500).json({ ok: false, message: 'Failed to save wake report' });
  }
});

// GET — CLI / 外部讀取甦醒報告
app.get('/api/openclaw/wake-report', async (_req, res) => {
  try {
    // 優先從 Supabase 讀
    if (hasSupabase()) {
      try {
        const { data } = await supabase!.from('openclaw_wake_reports')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);
        if (data && data.length > 0) {
          res.json({ ok: true, source: 'supabase', reports: data });
          return;
        }
      } catch { /* fallback to in-memory */ }
    }
    res.json({ ok: true, source: 'memory', reports: wakeReports.slice(0, 20) });
  } catch (e) {
    log.error('[OpenClaw] GET /api/openclaw/wake-report error:', e);
    res.status(500).json({ ok: false, reports: [] });
  }
});

// PATCH — 標記已處理
app.patch('/api/openclaw/wake-report/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const report = wakeReports.find(r => r.id === id);
    if (report) {
      report.resolved = true;
      report.resolvedAt = new Date().toISOString();
    }
    if (hasSupabase()) {
      try {
        await supabase!.from('openclaw_wake_reports')
          .update({ resolved: true, resolved_at: new Date().toISOString() })
          .eq('id', id);
      } catch { /* ignore */ }
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false });
  }
});

// ---- Daily Report ----
app.get('/api/openclaw/daily-report', async (req, res) => {
  try {
    const sendTg = req.query.notify === '1';
    const today = new Date().toISOString().slice(0, 10);

    // 統計任務
    const allTasks = hasSupabase() ? await fetchOpenClawTasks() : [];
    const tasksByStatus: Record<string, number> = {};
    let completedToday = 0;
    let createdToday = 0;
    for (const t of allTasks) {
      const s = t.status || 'unknown';
      tasksByStatus[s] = (tasksByStatus[s] || 0) + 1;
      const tAny = t as unknown as Record<string, unknown>;
      if (tAny.updated_at && String(tAny.updated_at).startsWith(today) && t.status === 'done') completedToday++;
      if (tAny.created_at && String(tAny.created_at).startsWith(today)) createdToday++;
    }

    // 統計審核
    const allReviews = hasSupabase() ? await fetchOpenClawReviews() : [];
    let reviewsPending = 0;
    let reviewsApproved = 0;
    let reviewsRejected = 0;
    for (const r of allReviews) {
      if (r.status === 'pending') reviewsPending++;
      else if (r.status === 'approved') reviewsApproved++;
      else if (r.status === 'rejected') reviewsRejected++;
    }

    // 統計執行
    const { totalExecutedToday, lastExecutedAt } = autoExecutorState;

    // 甦醒報告
    const unresolvedWakes = wakeReports.filter(w => !w.resolved).length;

    const report = {
      date: today,
      tasks: {
        total: allTasks.length,
        byStatus: tasksByStatus,
        createdToday,
        completedToday,
      },
      reviews: {
        total: allReviews.length,
        pending: reviewsPending,
        approved: reviewsApproved,
        rejected: reviewsRejected,
      },
      execution: {
        totalExecutedToday,
        lastExecutedAt,
        dispatchMode: autoExecutorState.dispatchMode,
      },
      wakeReports: {
        unresolved: unresolvedWakes,
        total: wakeReports.length,
      },
      uptime: Math.floor(process.uptime()),
    };

    // 發 Telegram
    if (sendTg) {
      const tgText = [
        `📊 <b>每日報告</b> — ${today}`,
        ``,
        `<b>任務</b>：總 ${allTasks.length} | 今日新增 ${createdToday} | 今日完成 ${completedToday}`,
        `  排隊 ${tasksByStatus['queued'] || 0} · 進行中 ${tasksByStatus['in_progress'] || 0} · 完成 ${tasksByStatus['done'] || 0}`,
        ``,
        `<b>審核</b>：待審 ${reviewsPending} · 通過 ${reviewsApproved} · 駁回 ${reviewsRejected}`,
        ``,
        `<b>自動執行</b>：今日 ${totalExecutedToday} 次 | 派工${autoExecutorState.dispatchMode ? '開啟' : '關閉'}`,
        ``,
        `<b>甦醒</b>：未解決 ${unresolvedWakes} 個`,
        `<b>運行</b>：${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`,
      ].join('\n');
      sendTelegramMessage(tgText, { parseMode: 'HTML' }).catch(e =>
        log.warn('[DailyReport] Telegram send failed:', e));
    }

    res.json({ ok: true, report });
  } catch (e) {
    log.error('[OpenClaw] daily-report error:', e);
    res.status(500).json({ ok: false, message: 'Failed to generate daily report' });
  }
});

// ---- Deputy Mode (暫代模式) ----

const DEPUTY_STATE_FILE = path.join(import.meta.dirname ? path.resolve(import.meta.dirname, '../..') : process.cwd(), '.openclaw-deputy-mode.json');
const DEPUTY_LAST_FILE = path.join(import.meta.dirname ? path.resolve(import.meta.dirname, '../..') : process.cwd(), '.openclaw-deputy-last-run.json');

function readDeputyState(): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(DEPUTY_STATE_FILE, 'utf8'));
  } catch {
    return { enabled: false };
  }
}

function writeDeputyState(state: Record<string, unknown>): void {
  fs.writeFileSync(DEPUTY_STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

app.get('/api/openclaw/deputy/status', (_req, res) => {
  const state = readDeputyState();
  let lastRun: Record<string, unknown> = {};
  try {
    lastRun = JSON.parse(fs.readFileSync(DEPUTY_LAST_FILE, 'utf8'));
  } catch { /* no last run */ }
  res.json({ ok: true, ...state, lastRun });
});

app.post('/api/openclaw/deputy/toggle', async (req, res) => {
  try {
    const state = readDeputyState();
    const body = req.body || {};
    const newEnabled = typeof body.enabled === 'boolean' ? body.enabled : !state.enabled;

    const newState = {
      ...state,
      enabled: newEnabled,
      enabledAt: newEnabled ? new Date().toISOString() : (state.enabledAt || null),
      disabledAt: !newEnabled ? new Date().toISOString() : (state.disabledAt || null),
      enabledBy: body.source || 'api',
      maxTasksPerRun: body.maxTasksPerRun || state.maxTasksPerRun || 3,
      allowedTags: body.allowedTags || state.allowedTags || ['auto-ok'],
      excludeTags: body.excludeTags || state.excludeTags || [],
      // 委派模式：暫代期間可派工給小蔡
      delegateToXiaoji: body.delegateToXiaoji ?? state.delegateToXiaoji ?? true,
    };
    writeDeputyState(newState);

    let msg: string;
    if (newEnabled) {
      msg = '🤖 <b>暫代模式已開啟</b>\n\n' +
        'Claude Code 將在每次巡檢時自動執行可處理的任務。\n' +
        `規則：最多每輪 ${newState.maxTasksPerRun} 個任務、只處理 auto-ok 標記的任務。\n\n` +
        (newState.delegateToXiaoji ? '📋 小蔡：暫代期間你會收到任務指令，請依照指示執行。\n\n' : '') +
        '關閉：/deputy off';
    } else if (body.source === 'boss-return') {
      msg = '👑 <b>老蔡已接手</b>\n\n暫代模式已自動關閉。\n小蔡：老蔡回來了，指揮權交還。';
    } else {
      msg = '⏸ <b>暫代模式已關閉</b>\n\nClaude Code 不再自動執行任務，僅巡檢報告。';
    }
    sendTelegramMessage(msg, { parseMode: 'HTML' }).catch(() => {});

    res.json({ ok: true, enabled: newEnabled, message: newEnabled ? '暫代模式已開啟' : '暫代模式已關閉' });
  } catch (e) {
    log.error('[OpenClaw] deputy toggle error:', e);
    res.status(500).json({ ok: false, message: 'Failed to toggle deputy mode' });
  }
});

app.post('/api/openclaw/deputy/run-now', async (_req, res) => {
  try {
    const scriptPath = path.join(repoRootPath(), 'scripts', 'openclaw-deputy.sh');
    if (!fs.existsSync(scriptPath)) {
      res.status(404).json({ ok: false, message: 'deputy script not found' });
      return;
    }

    // Ensure deputy mode is on (auto-enable if triggering run-now)
    const state = readDeputyState();
    if (!state.enabled) {
      writeDeputyState({ ...state, enabled: true, enabledAt: new Date().toISOString(), enabledBy: 'run-now' });
    }

    const logDir = path.join(repoRootPath(), 'logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const logFile = path.join(logDir, `deputy-run-now-${ts}.log`);
    const fd = fs.openSync(logFile, 'w');

    const child = spawn('/bin/bash', [scriptPath], {
      cwd: repoRootPath(),
      detached: true,
      stdio: ['ignore', fd, fd],
      env: { ...process.env, PATH: '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin' },
    });
    child.unref();
    fs.closeSync(fd);

    sendTelegramMessage(`🚀 <b>暫代即時觸發</b>\n\n正在背景執行 deputy 腳本...\n📝 日誌：logs/deputy-run-now-${ts}.log`, { parseMode: 'HTML' }).catch(() => {});

    res.json({ ok: true, message: '暫代已觸發，背景執行中', pid: child.pid, logFile: `logs/deputy-run-now-${ts}.log` });
  } catch (e) {
    log.error('[OpenClaw] deputy run-now error:', e);
    res.status(500).json({ ok: false, message: `Failed to trigger deputy run: ${e instanceof Error ? e.message : String(e)}` });
  }
});

// ---- Task Indexer (Index-of-Index) ----
type TaskIndexRecord = {
  taskId: string;
  name: string;
  status: string;
  tags?: string[];
  updatedAt?: string;
  runPath?: string;
  summary?: string;
  nextSteps?: string[];
  evidenceLinks?: string[];
};

function resolveTaskIndexPaths(): { dir: string; jsonlPath: string; mdPath: string } {
  const dir =
    process.env.OPENCLAW_TASK_INDEX_DIR?.trim() ||
    path.resolve(repoRootPath(), 'runtime-checkpoints', 'task-index');
  const jsonlPath =
    process.env.OPENCLAW_TASK_INDEX_JSONL?.trim() ||
    path.resolve(dir, 'task-index.jsonl');
  const mdPath =
    process.env.OPENCLAW_TASK_INDEX_MD?.trim() ||
    path.resolve(dir, 'TASK-INDEX.md');
  return { dir, jsonlPath, mdPath };
}

function readJsonlRecords(filePath: string, limit: number): { total: number; records: TaskIndexRecord[] } {
  try {
    if (!fs.existsSync(filePath)) return { total: 0, records: [] };
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const total = lines.length;
    const picked = lines.slice(Math.max(0, total - limit));
    const records: TaskIndexRecord[] = [];
    for (const line of picked) {
      try {
        const j = JSON.parse(line) as unknown;
        if (!j || typeof j !== 'object') continue;
        const o = j as Record<string, unknown>;
        const taskId = String(o.taskId ?? '');
        if (!taskId) continue;
        records.push({
          taskId,
          name: String(o.name ?? ''),
          status: String(o.status ?? ''),
          tags: Array.isArray(o.tags) ? (o.tags as unknown[]).map((x) => String(x)).filter(Boolean) : undefined,
          updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : undefined,
          runPath: typeof o.runPath === 'string' ? o.runPath : undefined,
          summary: typeof o.summary === 'string' ? o.summary : undefined,
          nextSteps: Array.isArray(o.nextSteps) ? (o.nextSteps as unknown[]).map((x) => String(x)).filter(Boolean) : undefined,
          evidenceLinks: Array.isArray(o.evidenceLinks) ? (o.evidenceLinks as unknown[]).map((x) => String(x)).filter(Boolean) : undefined,
        });
      } catch {
        // ignore malformed line
      }
    }
    return { total, records };
  } catch {
    return { total: 0, records: [] };
  }
}

function buildTaskIndexMarkdown(records: TaskIndexRecord[]): string {
  const now = new Date().toISOString();
  const lines: string[] = [];
  lines.push(`# TASK INDEX`);
  lines.push('');
  lines.push(`generatedAt: ${now}`);
  lines.push(`count: ${records.length}`);
  lines.push('');
  lines.push('> This file is an index. Full details live in the taskboard DB and each run folder (RESULT.md + ARTIFACTS/).');
  lines.push('');
  for (const r of records) {
    const tags = (r.tags ?? []).slice(0, 6).join(', ');
    const status = r.status || '(unknown)';
    const name = r.name || '(no name)';
    lines.push(`- [${status}] ${r.taskId} ${name}${tags ? `  (tags: ${tags})` : ''}`);
    if (r.runPath) lines.push(`  - runPath: ${r.runPath}`);
    if (r.summary) lines.push(`  - summary: ${r.summary.replace(/\s+/g, ' ').slice(0, 200)}`);
  }
  lines.push('');
  return lines.join('\n');
}

app.get('/api/openclaw/indexer/status', (_req, res) => {
  const { dir, jsonlPath, mdPath } = resolveTaskIndexPaths();
  res.json({
    ok: true,
    dir,
    jsonlPath,
    mdPath,
    jsonlExists: fs.existsSync(jsonlPath),
    mdExists: fs.existsSync(mdPath),
  });
});

app.get('/api/openclaw/indexer/records', (req, res) => {
  const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 20));
  const { jsonlPath } = resolveTaskIndexPaths();
  const { total, records } = readJsonlRecords(jsonlPath, limit);
  res.json({ ok: true, total, records });
});

app.post('/api/openclaw/indexer/rebuild-md', async (_req, res) => {
  try {
    const { dir, jsonlPath, mdPath } = resolveTaskIndexPaths();
    fs.mkdirSync(dir, { recursive: true });

    const list = hasSupabase() ? (await fetchOpenClawTasks()).map(openClawTaskToTask) : tasks;
    const records: TaskIndexRecord[] = list.map((t) => ({
      taskId: t.id,
      name: t.name,
      status: t.status,
      tags: t.tags,
      updatedAt: t.updatedAt,
      runPath: t.runPath,
      summary: t.summary,
      nextSteps: t.nextSteps,
      evidenceLinks: t.evidenceLinks,
    }));

    // JSONL as a stable, append-friendly store.
    fs.writeFileSync(jsonlPath, records.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');

    // Markdown as a human-readable overview.
    fs.writeFileSync(mdPath, buildTaskIndexMarkdown(records), 'utf8');

    res.json({
      ok: true,
      count: records.length,
      mdPath,
      jsonlPath,
    });
  } catch (e) {
    log.error('[Indexer] rebuild-md error:', e);
    res.status(500).json({ ok: false, message: 'Failed to rebuild task index markdown' });
  }
});

// ---- Emergency Stop (ops) ----
// Dashboard button calls this to stop any autonomous loops immediately.
app.post('/api/emergency/stop-all', (_req, res) => {
  try {
    // Stop AutoExecutor loop.
    stopAutoExecutor();
    saveAutoExecutorDiskState({ enabled: false });

    res.json({
      ok: true,
      message: 'stopped',
      stopped: {
        autoExecutor: true,
      },
    });
  } catch (e) {
    log.error('[Emergency] stop-all failed:', e);
    res.status(500).json({ ok: false, message: 'stop-all failed' });
  }
});

// ---- Logs & Audit（與 OpenClaw 對接）----
app.get('/api/logs', async (_req, res) => {
  if (hasSupabase()) {
    const evLog = await fetchOpenClawEvolutionLog();
    const mapped = evLog.map((row, i) => evolutionLogToLogEntry(row, i));
    return res.json(mapped);
  }
  res.json([]);
});

app.get('/api/audit-logs', async (_req, res) => {
  if (hasSupabase()) {
    const rows = await fetchOpenClawAuditLogs();
    const mapped = rows.map((r) => ({
      id: r.id,
      timestamp: r.created_at ?? new Date().toISOString(),
      user: r.user_id ?? 'system',
      action: r.action,
      target: [r.resource, r.resource_id].filter(Boolean).join(' ') || '-',
      details: r.diff ? JSON.stringify(r.diff) : undefined,
    }));
    return res.json(mapped);
  }
  res.json([]);
});

// ---- Stats（儀表板用，與 OpenClaw 資料對接）----
const DAY_LABELS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
function isToday(iso: string): boolean {
  const d = new Date(iso);
  const today = new Date();
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
}
function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

app.get('/api/stats', async (_req, res) => {
  if (hasSupabase()) {
    const [ocTasks, evLog] = await Promise.all([
      fetchOpenClawTasks(),
      fetchOpenClawEvolutionLog(),
    ]);
    const runs = evLog.map((row, i) => evolutionLogToRun(row, i));
    const todayRuns = runs.filter((r) => isToday(r.startedAt)).length;
    const success = runs.filter((r) => r.status === 'success').length;
    const failed = runs.filter((r) => r.status === 'failed').length;
    const completed = success + failed;
    const successRate = completed > 0 ? Math.round((success / completed) * 1000) / 10 : 0;
    const withDuration = runs.filter((r) => r.durationMs != null && r.durationMs > 0);
    const avgDuration =
      withDuration.length > 0
        ? Math.round(withDuration.reduce((sum, r) => sum + (r.durationMs ?? 0), 0) / withDuration.length)
        : 0;
    const queueDepth = ocTasks.filter((t) => t.status === 'queued').length;
    const activeTasks = ocTasks.filter((t) => t.status === 'in_progress').length;
    const weeklyTrend: { day: string; success: number; failed: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayRuns = runs.filter((r) => dateKey(r.startedAt) === key);
      weeklyTrend.push({
        day: DAY_LABELS[d.getDay()],
        success: dayRuns.filter((r) => r.status === 'success').length,
        failed: dayRuns.filter((r) => r.status === 'failed').length,
      });
    }
    return res.json({
      todayRuns,
      successRate,
      failedRuns: failed,
      avgDuration,
      queueDepth,
      activeTasks,
      weeklyTrend,
    });
  }
  const todayRuns = runs.filter((r) => isToday(r.startedAt)).length;
  const success = runs.filter((r) => r.status === 'success').length;
  const failed = runs.filter((r) => r.status === 'failed').length;
  const completed = success + failed;
  const successRate = completed > 0 ? Math.round((success / completed) * 1000) / 10 : 0;
  const withDuration = runs.filter((r) => r.durationMs != null && r.durationMs > 0);
  const avgDuration =
    withDuration.length > 0
      ? Math.round(withDuration.reduce((sum, r) => sum + (r.durationMs ?? 0), 0) / withDuration.length)
      : 0;
  const queueDepth = runs.filter((r) => r.status === 'queued').length;
  const activeTasks = tasks.filter((t) => t.status === 'running').length;
  const weeklyTrend: { day: string; success: number; failed: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayRuns = runs.filter((r) => dateKey(r.startedAt) === key);
    weeklyTrend.push({
      day: DAY_LABELS[d.getDay()],
      success: dayRuns.filter((r) => r.status === 'success').length,
      failed: dayRuns.filter((r) => r.status === 'failed').length,
    });
  }
  res.json({
    todayRuns,
    successRate,
    failedRuns: failed,
    avgDuration,
    queueDepth,
    activeTasks,
    weeklyTrend,
  });
});

// ---- n8n（Zeabur）----
app.get('/api/n8n/health', async (_req, res) => {
  try {
    const result = await n8nHealthCheck();
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e) });
  }
});

app.get('/api/n8n/workflows', async (req, res) => {
  try {
    if (!hasN8n()) {
      return res.json({ ok: false, message: 'n8n 未設定', data: [] });
    }
    const activeOnly = req.query.active === 'true';
    const workflows = await listWorkflows(activeOnly);
    res.json({ ok: true, data: workflows });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e), data: [] });
  }
});

/** 觸發 n8n Webhook，body 需帶 webhookUrl 或使用 N8N_WEBHOOK_RUN_NEXT 預設 */
app.post('/api/n8n/trigger-webhook', async (req, res) => {
  try {
    const candidateUrl =
      req.body.webhookUrl ||
      process.env.N8N_WEBHOOK_RUN_NEXT;
    if (!candidateUrl) {
      return res.status(400).json({
        ok: false,
        message: '請提供 webhookUrl 或設定 N8N_WEBHOOK_RUN_NEXT',
      });
    }
    const checked = validateWebhookUrl(candidateUrl);
    if (!checked.ok) {
      return res.status(400).json({ ok: false, message: checked.message });
    }
    const result = await triggerWebhook(checked.value, req.body.data);
    res.json({ ok: true, result });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e) });
  }
});

// 重啟 OpenClaw Gateway（由看板點擊觸發）
// 優先使用 openclaw gateway restart（launchd/systemd）；若無服務則 fallback 至 pkill + spawn
app.post('/api/openclaw/restart-gateway', (_req, res) => {
  try {
    try {
      execSync('openclaw gateway restart', { stdio: 'ignore', timeout: 10000 });
      return res.json({ ok: true, message: 'Gateway 已透過 launchd/systemd 重啟' });
    } catch {
      /* 無安裝服務時 fallback */
    }
    try {
      execSync('pkill -f "openclaw gateway"', { stdio: 'ignore' });
    } catch {
      /* 無現有行程時忽略 */
    }
    setTimeout(() => {
      const child = spawn('openclaw', ['gateway', '--port', '18789', '--verbose'], {
        detached: true,
        stdio: 'ignore',
        env: { ...process.env, PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin' },
      });
      child.unref();
    }, 1500);
    res.json({ ok: true, message: 'Gateway 重啟指令已送出（背景啟動）' });
  } catch (e) {
    res.status(500).json({ ok: false, message: '重啟失敗', error: String(e) });
  }
});

// Projects → routes/projects.ts
// AutoExecutor + Dispatch → routes/auto-executor.ts


function repoRootPath(): string {
  // Works both in src and dist:
  // <repo>/server/src/index.ts OR <repo>/server/dist/index.js
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '..', '..');
}


// ==================== Maintenance: Reconcile（狀態校正）====================
app.post('/api/openclaw/maintenance/reconcile', async (_req, res) => {
  try {
    if (!hasSupabase()) {
      return res.status(503).json({ message: 'Supabase not connected' });
    }
    const ocTasks = await fetchOpenClawTasks();
    const dbRuns = await fetchOpenClawRuns(2000);
    // 找出所有 active run 的 task_id
    const activeRunTaskIds = new Set(
      (dbRuns ?? [])
        .filter((r: { status?: string }) => r.status === 'running' || r.status === 'in_progress')
        .map((r: { task_id?: string }) => r.task_id)
        .filter(Boolean)
    );
    let fixedToReady = 0;
    let fixedToDone = 0;
    let fixedToRunning = 0;
    const details: Array<{ taskId: string; from: string; to: string; reason: string }> = [];
    for (const t of ocTasks ?? []) {
      const st = t.status ?? '';
      const tId = t.id ?? '';
      if ((st === 'running' || st === 'in_progress') && !activeRunTaskIds.has(tId)) {
        // running 但沒有 active run → 改回 queued（中斷重試），不能假設已完成
        await upsertOpenClawTask({ id: tId, name: t.name, status: 'queued' });
        details.push({ taskId: tId, from: st, to: 'queued', reason: 'orphaned in_progress, reset for retry' });
        fixedToReady++;
      }
    }
    res.json({
      ok: true,
      scanned: (ocTasks ?? []).length,
      fixedToReady,
      fixedToDone,
      fixedToRunning,
      details,
    });
  } catch (e) {
    log.error('[Reconcile] error:', e);
    res.status(500).json({ message: 'Reconcile failed' });
  }
});

// ==================== System Schedules（系統排程）====================
// 讀取 OpenClaw 的 cron job 列表，唯讀顯示於任務板

interface SystemSchedule {
  id: string;
  name: string;
  enabled: boolean;
  scheduleKind: 'cron' | 'interval' | 'every';
  scheduleExpr?: string;
  everyMs?: number;
  timezone?: string;
  nextRunAt: string | null;
  lastRunAt?: string | null;
  lastStatus?: 'ok' | 'failed' | 'running' | null;
  description?: string;
  agentId: string;
  createdAt: string;
  updatedAt: string;
}

/** 取得 OpenClaw Cron Jobs 並轉換為系統排程格式 */
async function fetchOpenClawCronJobs(): Promise<SystemSchedule[]> {
  try {
    const result = execSync('openclaw cron list --json', {
      encoding: 'utf-8',
      timeout: 30000,
      env: { ...process.env, PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin' },
    });
    const parsed: unknown = JSON.parse(result);
    const asObj = (v: unknown): Record<string, unknown> =>
      v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
    const jobs: unknown[] = Array.isArray(asObj(parsed).jobs) ? (asObj(parsed).jobs as unknown[]) : [];

    return jobs.map((job: unknown): SystemSchedule => {
      const j = asObj(job);
      const schedule = asObj(j.schedule);
      let scheduleKind: 'cron' | 'interval' | 'every' = 'cron';
      let scheduleExpr: string | undefined;
      let everyMs: number | undefined;

      if (schedule.kind === 'every') {
        scheduleKind = 'every';
        everyMs = typeof schedule.everyMs === 'number' ? schedule.everyMs : undefined;
        scheduleExpr = everyMs ? `每 ${Math.round(everyMs / 1000 / 60)} 分鐘` : undefined;
      } else if (schedule.kind === 'cron' || schedule.expr) {
        scheduleKind = 'cron';
        scheduleExpr = typeof schedule.expr === 'string' ? schedule.expr : undefined;
      }

      // 從 payload 提取描述
      let description: string | undefined;
      const payload = asObj(j.payload);
      if (Object.keys(payload).length > 0) {
        if (payload.message) {
          description = String(payload.message);
        } else if (payload.text) {
          description = String(payload.text);
        } else if (payload.kind) {
          description = `類型: ${String(payload.kind)}`;
        }
      }

      const state = asObj(j.state);
      const nextRunAtMs = typeof state.nextRunAtMs === 'number' ? state.nextRunAtMs : null;
      const lastRunAtMs = typeof state.lastRunAtMs === 'number' ? state.lastRunAtMs : null;
      const lastStatusRaw = typeof state.lastStatus === 'string' ? state.lastStatus : null;
      const lastStatus: SystemSchedule['lastStatus'] =
        lastStatusRaw === 'ok' || lastStatusRaw === 'failed' || lastStatusRaw === 'running' ? lastStatusRaw : null;

      return {
        id: String(j.id ?? ''),
        name: String(j.name ?? ''),
        enabled: j.enabled == null ? true : Boolean(j.enabled),
        scheduleKind,
        scheduleExpr,
        everyMs,
        timezone: typeof schedule.tz === 'string' ? schedule.tz : undefined,
        nextRunAt: nextRunAtMs ? new Date(nextRunAtMs).toISOString() : null,
        lastRunAt: lastRunAtMs ? new Date(lastRunAtMs).toISOString() : null,
        lastStatus,
        description,
        agentId: typeof j.agentId === 'string' && j.agentId ? j.agentId : 'main',
        createdAt: typeof j.createdAtMs === 'number' ? new Date(j.createdAtMs).toISOString() : new Date().toISOString(),
        updatedAt: typeof j.updatedAtMs === 'number' ? new Date(j.updatedAtMs).toISOString() : new Date().toISOString(),
      };
    });
  } catch (error) {
    log.error('[SystemSchedules] 讀取 OpenClaw cron jobs 失敗:', error);
    // 如果無法執行 openclaw 命令，返回空陣列
    return [];
  }
}

app.get('/api/system-schedules', async (_req, res) => {
  try {
    const schedules = await fetchOpenClawCronJobs();
    res.json({
      ok: true,
      count: schedules.length,
      data: schedules,
    });
  } catch (e) {
    log.error('[OpenClaw] GET /api/system-schedules error:', e);
    res.status(500).json({ ok: false, message: 'Failed to fetch system schedules' });
  }
});

// 小蔡指揮 crew bots（內部調度，繞過 Forum bot→bot 限制）
// 先用小蔡 bot 發訊息到群組，再觸發 crew dispatch
app.post('/api/crew/dispatch', async (req, res) => {
  try {
    const { message, sender } = req.body || {};
    if (!message) return res.status(400).json({ ok: false, error: 'message required' });

    // 先發到 Telegram 群組（讓訊息出現在聊天室）
    const xiaocaiToken = process.env.TELEGRAM_XIAOCAI_BOT_TOKEN?.trim();
    const groupChatId = process.env.TELEGRAM_CREW_GROUP_CHAT_ID?.trim() || process.env.TELEGRAM_GROUP_CHAT_ID?.trim();
    if (xiaocaiToken && groupChatId) {
      await sendTelegramMessageToChat(Number(groupChatId), message, { token: xiaocaiToken, silent: true });
    }

    const { dispatchToCrewBots } = await import('./telegram/crew-bots/crew-poller.js');
    const dispatch = await dispatchToCrewBots(message, sender || '小蔡');
    res.json({ ok: true, dispatched: dispatch.totalReplied, replies: dispatch.replies, message: dispatch.totalReplied > 0 ? `${dispatch.totalReplied} 個 crew bot 已回覆` : '無匹配的 crew bot' });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ── Crew Bot 心跳開關 ──
app.get('/api/crew/heartbeat', async (_req, res) => {
  try {
    const { getHeartbeatStatus } = await import('./telegram/crew-bots/crew-patrol.js');
    res.json({ ok: true, ...getHeartbeatStatus() });
  } catch (e) { res.status(500).json({ ok: false, error: String(e) }); }
});

app.post('/api/crew/heartbeat/on', async (req, res) => {
  try {
    const intervalMin = (req.body as Record<string, unknown>)?.intervalMin as number | undefined;
    const { enableHeartbeat } = await import('./telegram/crew-bots/crew-patrol.js');
    const result = enableHeartbeat(intervalMin);
    res.json(result);
  } catch (e) { res.status(500).json({ ok: false, error: String(e) }); }
});

app.post('/api/crew/heartbeat/off', async (_req, res) => {
  try {
    const { disableHeartbeat } = await import('./telegram/crew-bots/crew-patrol.js');
    const result = disableHeartbeat();
    res.json(result);
  } catch (e) { res.status(500).json({ ok: false, error: String(e) }); }
});

// ── Crew Patrol — 手動觸發巡邏 ──
app.post('/api/crew/patrol', async (_req, res) => {
  try {
    const { triggerPatrolNow } = await import('./telegram/crew-bots/crew-patrol.js');
    triggerPatrolNow().catch(() => {});
    res.json({ ok: true, message: '巡邏已觸發（背景執行中）' });
  } catch (e) { res.status(500).json({ ok: false, error: String(e) }); }
});

// ── Crew Doctor — 星群健康檢查 ──
app.get('/api/crew/health', async (_req, res) => {
  try {
    const { getAllHealthStatus, diagnoseAll } = await import('./telegram/crew-bots/crew-doctor.js');
    const health = getAllHealthStatus();
    const issues = diagnoseAll();
    res.json({ ok: true, bots: health, issues });
  } catch (e) { res.status(500).json({ ok: false, error: String(e) }); }
});

app.post('/api/crew/health/checkup', async (_req, res) => {
  try {
    const { fullCheckup } = await import('./telegram/crew-bots/crew-doctor.js');
    const issues = await fullCheckup();
    res.json({ ok: true, issuesFound: issues.length, issues });
  } catch (e) { res.status(500).json({ ok: false, error: String(e) }); }
});

app.post('/api/crew/health/reset/:botId', async (req, res) => {
  try {
    const { resetHealth } = await import('./telegram/crew-bots/crew-doctor.js');
    resetHealth(req.params.botId);
    res.json({ ok: true, message: `${req.params.botId} 健康紀錄已重置` });
  } catch (e) { res.status(500).json({ ok: false, error: String(e) }); }
});

// ── Crew Inbox 協作 ──
app.get('/api/crew/inbox', async (_req, res) => {
  try {
    const { scanAllInboxes, getInboxStats } = await import('./telegram/crew-bots/crew-inbox.js');
    const inboxes = scanAllInboxes();
    const stats = getInboxStats();
    // 簡化回傳：只回傳摘要，不含完整內容
    const summary: Record<string, { total: number; files: Array<{ fileName: string; type: string; fromBot: string; priority: number }> }> = {};
    for (const [botId, items] of Object.entries(inboxes)) {
      summary[botId] = {
        total: items.length,
        files: items.map(f => ({ fileName: f.fileName, type: f.type, fromBot: f.fromBot, priority: f.priority })),
      };
    }
    res.json({ ok: true, inboxes: summary, stats });
  } catch (e) { res.status(500).json({ ok: false, error: String(e) }); }
});

// ── Agent Flow — 即時代理狀態 ──
app.get('/api/agents/status', async (_req, res) => {
  try {
    const { CREW_BOTS } = await import('./telegram/crew-bots/crew-config.js');
    const { getHeartbeatStatus } = await import('./telegram/crew-bots/crew-patrol.js');
    const heartbeat = getHeartbeatStatus();

    // 小蔡（指揮官）
    const xiaocaiStatus = {
      id: 'xiaocai',
      name: '小蔡',
      role: '指揮官',
      emoji: '🧠',
      model: 'gemini-flash',
      domain: 'command' as const,
      status: 'online' as const,
      lastActive: new Date().toISOString(),
    };

    // 6 crew bots
    const crewStatuses = CREW_BOTS.map(bot => ({
      id: bot.id,
      name: bot.name,
      role: bot.role,
      emoji: bot.emoji,
      model: bot.model,
      domain: bot.domain,
      status: bot.token ? 'online' as const : 'offline' as const,
      lastActive: null as string | null,
    }));

    res.json({
      ok: true,
      agents: [xiaocaiStatus, ...crewStatuses],
      heartbeat,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post('/api/telegram/test', async (_req, res) => {
  if (!isTelegramConfigured()) {
    return res.status(503).json({ ok: false, message: 'Telegram 未設定。請在 .env 設定 TELEGRAM_BOT_TOKEN 與 TELEGRAM_CHAT_ID 後重啟。' });
  }
  try {
    await sendTelegramMessage('🔔 <b>OpenClaw 測試訊息</b>\n\n若你收到這則，代表後端 Telegram 通知已正常。', { parseMode: 'HTML' });
    res.json({ ok: true, message: '已發送測試訊息至 Telegram，請檢查對話。' });
  } catch (e) {
    log.error('[Telegram] test send error:', e);
    res.status(500).json({ ok: false, message: String(e) });
  }
});

// Telegram 強制測試（帶時間戳/隨機碼 + 回傳 message_id，方便你在 Telegram 端搜尋/對照）
// - 只走通知 bot（TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID）
// - 若你「看不到訊息」，但這邊回 ok=true 且有 message_id，代表訊息已送達 Telegram，只是你端沒看到該 chat/thread
// NOTE: This endpoint is admin-gated via requiredAccessLevel() to prevent abuse.
app.post('/api/telegram/force-test', async (_req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) {
    return res.status(503).json({ ok: false, message: 'Telegram 未設定。請設定 TELEGRAM_BOT_TOKEN 與 TELEGRAM_CHAT_ID 後重啟。' });
  }

  const now = new Date();
  const ts =
    `${now.getFullYear()}-` +
    `${String(now.getMonth() + 1).padStart(2, '0')}-` +
    `${String(now.getDate()).padStart(2, '0')} ` +
    `${String(now.getHours()).padStart(2, '0')}:` +
    `${String(now.getMinutes()).padStart(2, '0')}:` +
    `${String(now.getSeconds()).padStart(2, '0')}`;
  const nonce = Math.random().toString(16).slice(2, 10);

  const text =
    `🧪 <b>OpenClaw FORCE TEST</b>\n\n` +
    `<b>time:</b> <code>${ts}</code>\n` +
    `<b>nonce:</b> <code>${nonce}</code>\n\n` +
    `若你看不到這則，但 API 回 ok=true，通常是 Telegram 客戶端/帳號/封存/ thread 視角問題。`;

  try {
    const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        // 強制提醒（不要靜音），避免你「有送但沒注意到」
        disable_notification: false,
      }),
    });
    const payload: unknown = await resp.json().catch(() => null);
    const pobj = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
    const ok = !!pobj && pobj.ok === true;
    if (!resp.ok || !ok) {
      return res.status(502).json({
        ok: false,
        message: 'Telegram sendMessage failed',
        status: resp.status,
        description: pobj?.description ?? null,
        error_code: pobj?.error_code ?? null,
      });
    }
    const result = pobj?.result && typeof pobj.result === 'object' ? (pobj.result as Record<string, unknown>) : null;
    const chat = result?.chat && typeof result.chat === 'object' ? (result.chat as Record<string, unknown>) : null;
    return res.json({
      ok: true,
      chat_id: chat?.id ?? null,
      message_id: result?.message_id ?? null,
      time: ts,
      nonce,
    });
  } catch (e) {
    log.error('[Telegram] force-test send error:', e);
    return res.status(500).json({ ok: false, message: String(e) });
  }
});

// ─── Activity Log ───
app.get('/api/openclaw/activity-log', (req, res) => {
  const lines = Math.min(Number(req.query.lines) || 20, 100);
  const logPath = path.join(
    process.env.HOME || '/Users/caijunchang',
    'Desktop/小蔡/🧠核心文件/shared-activity.log',
  );
  try {
    if (!fs.existsSync(logPath)) {
      return res.json({ ok: true, lines: [], total: 0 });
    }
    const content = fs.readFileSync(logPath, 'utf-8');
    const allLines = content.split('\n').filter((l) => l.startsWith('['));
    const result = allLines.slice(-lines);
    res.json({ ok: true, lines: result, total: allLines.length });
  } catch (e) {
    log.error('[ActivityLog] read error:', e);
    res.status(500).json({ ok: false, message: String(e) });
  }
});

// Health
// Back-compat: some scripts (and older docs) probe /health.
app.get('/health', async (_req, res) => {
  // Back-compat: keep it lightweight but still informative.
  const ws = wsManager.getStats();
  res.json({
    ok: true,
    service: 'openclaw-server',
    supabase: hasSupabase(),
    telegram: isTelegramConfigured(),
    websocket: ws,
    autoExecutor: {
      isRunning: autoExecutorState.isRunning,
      pollIntervalMs: autoExecutorState.pollIntervalMs,
      maxTasksPerMinute: autoExecutorState.maxTasksPerMinute,
      lastPollAt: autoExecutorState.lastPollAt,
      lastExecutedAt: autoExecutorState.lastExecutedAt,
    },
  });
});
app.get('/api/health', async (_req, res) => {
  const ws = wsManager.getStats();
  const mem = process.memoryUsage();

  // Supabase ping check
  let supabasePing: 'ok' | 'fail' | 'not_configured' = 'not_configured';
  if (hasSupabase() && supabase) {
    try {
      const start = Date.now();
      await supabase.from('openclaw_tasks').select('id', { count: 'exact', head: true });
      supabasePing = Date.now() - start < 5000 ? 'ok' : 'fail';
    } catch { supabasePing = 'fail'; }
  }

  res.json({
    ok: true,
    service: 'openclaw-server',
    version: '2.5.25',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    services: {
      supabase: { configured: hasSupabase(), ping: supabasePing },
      telegram: { configured: isTelegramConfigured() },
      n8n: { configured: hasN8n() },
      websocket: ws,
    },
    memory: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      unit: 'MB',
    },
    autoExecutor: {
      isRunning: autoExecutorState.isRunning,
      dispatchMode: autoExecutorState.dispatchMode,
      pollIntervalMs: autoExecutorState.pollIntervalMs,
      maxTasksPerMinute: autoExecutorState.maxTasksPerMinute,
      lastPollAt: autoExecutorState.lastPollAt,
      lastExecutedAt: autoExecutorState.lastExecutedAt,
      totalExecutedToday: autoExecutorState.totalExecutedToday,
    },
  });
});

// 手動觸發 NEUXA 心跳
app.post('/api/neuxa/heartbeat', async (_req, res) => {
  try {
    const result = await triggerHeartbeat();
    res.json({ ok: true, message: result });
  } catch (e: unknown) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Safe to expose (no secrets): shows whether key security toggles are enabled.
app.get('/api/security/status', (_req, res) => {
  res.json({
    ok: true,
    auth: {
      enforceRead: OPENCLAW_ENFORCE_READ_AUTH,
      enforceWrite: OPENCLAW_ENFORCE_WRITE_AUTH,
      hasReadKeys: readKeySet.size > 0,
      hasWriteKeys: writeKeySet.size > 0,
      hasAdminKeys: adminKeySet.size > 0,
      dashboardBasicAuthEnabled: Boolean(
        process.env.OPENCLAW_DASHBOARD_BASIC_USER?.trim() &&
        process.env.OPENCLAW_DASHBOARD_BASIC_PASS?.trim()
      ),
    },
    network: {
      trustProxy: process.env.OPENCLAW_TRUST_PROXY === 'true',
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 1000,
    },
    cors: {
      allowedOriginsCount: allowedOrigins.length,
    },
  });
});

// 提示詞防護統計（供 AI 甲板 / 提示詞防護頁使用）
app.get('/api/security/prompt-guard-stats', (_req, res) => {
  res.json({
    ok: true,
    ...getPromptGuardStats(),
    rules: getPromptGuardRules(),
  });
});

// WebSocket 狀態
app.get('/api/websocket/status', (_req, res) => {
  const stats = wsManager.getStats();
  res.json({
    ok: true,
    ...stats,
  });
});

// ---- 批次向量索引（Admin） ----
// NOTE: This endpoint is admin-gated via requiredAccessLevel() in auth.ts.
app.post('/api/admin/batch-index', async (req, res) => {
  const { directory, category } = (req.body ?? {}) as { directory?: string; category?: string };
  if (!directory || typeof directory !== 'string') {
    return res.status(400).json({ ok: false, message: '缺少 directory 參數' });
  }
  if (!category || typeof category !== 'string') {
    return res.status(400).json({ ok: false, message: '缺少 category 參數' });
  }
  try {
    const { batchIndexDirectory } = await import('./utils/batch-index.js');
    const result = await batchIndexDirectory(directory, category);
    res.json({ ok: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[BatchIndex] endpoint error: ${msg}`);
    res.status(500).json({ ok: false, message: msg });
  }
});

// ---- Dashboard Auth (Static UI) ----
// The API layer already supports key-based auth under /api.
// This basic-auth gate is for the static dashboard (/) when you expose the UI publicly.
const OPENCLAW_DASHBOARD_BASIC_USER = process.env.OPENCLAW_DASHBOARD_BASIC_USER?.trim();
const OPENCLAW_DASHBOARD_BASIC_PASS = process.env.OPENCLAW_DASHBOARD_BASIC_PASS?.trim();
function requireDashboardBasicAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  // Only protect the dashboard/static assets. Keep API auth behavior unchanged.
  if (req.path.startsWith('/api')) return next();
  if (!OPENCLAW_DASHBOARD_BASIC_USER || !OPENCLAW_DASHBOARD_BASIC_PASS) return next();

  const auth = req.header('authorization') || '';
  const match = auth.match(/^basic\s+(.+)$/i);
  if (!match) {
    res.setHeader('WWW-Authenticate', 'Basic realm="OpenClaw Dashboard"');
    return res.status(401).send('Unauthorized');
  }

  let user = '';
  let pass = '';
  try {
    const decoded = Buffer.from(match[1], 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    user = idx >= 0 ? decoded.slice(0, idx) : decoded;
    pass = idx >= 0 ? decoded.slice(idx + 1) : '';
  } catch {
    res.setHeader('WWW-Authenticate', 'Basic realm="OpenClaw Dashboard"');
    return res.status(401).send('Unauthorized');
  }

  if (user !== OPENCLAW_DASHBOARD_BASIC_USER || pass !== OPENCLAW_DASHBOARD_BASIC_PASS) {
    res.setHeader('WWW-Authenticate', 'Basic realm="OpenClaw Dashboard"');
    return res.status(401).send('Unauthorized');
  }
  next();
}

// 生成網站靜態目錄（不需登入，方便分享）
const sitesPath = path.resolve(process.env.HOME || '/tmp', '.openclaw', 'workspace', 'sites');
if (!fs.existsSync(sitesPath)) fs.mkdirSync(sitesPath, { recursive: true });
app.use('/sites', express.static(sitesPath));

// 靜態前端檔案 (production build)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../../dist');
app.use(requireDashboardBasicAuth);
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// 建立 HTTP server 並整合 WebSocket
const server = http.createServer(app);

// 初始化 WebSocket
wsManager.initialize(server);

// 啟動時載入 FADP 封鎖清單到記憶體
loadBlocklistFromSupabase().catch(() => {});

server.listen(PORT, '127.0.0.1', () => {
  log.info(`OpenClaw API http://localhost:${PORT}`);
  log.info(`  WebSocket ws://localhost:${PORT}/ws`);
  log.info(`  GET  /api/tasks, /api/tasks/:id, PATCH /api/tasks/:id`);
  log.info(`  GET  /api/runs, /api/runs/:id, POST /api/tasks/:taskId/run, POST /api/runs/:id/rerun`);
  log.info(`  GET  /api/alerts, PATCH /api/alerts/:id`);
  log.info(`  AutoExecutor: GET/POST /api/openclaw/auto-executor/status|start|stop`);
  log.info(`  OpenClaw v4 (Supabase): GET/POST/PATCH /api/openclaw/tasks, /api/openclaw/reviews, /api/openclaw/automations`);
  log.info(`  FADP: GET /api/federation/status|members|attack/events|blocklist`);
  if (hasSupabase()) {
    log.info(`  [Supabase] 已連線 (openclaw_tasks / projects 等將正常運作)`);
  } else {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    log.warn(`  [Supabase] 未連線 → /api/openclaw/* 會回 503。請在專案根目錄 .env 設定 SUPABASE_URL 與 SUPABASE_SERVICE_ROLE_KEY 後重啟。`);
    if (!url) log.warn(`    - SUPABASE_URL 未設定`);
    if (!key) log.warn(`    - SUPABASE_SERVICE_ROLE_KEY 未設定`);
  }
  if (isTelegramConfigured()) {
    log.info(`  [Telegram] 已設定，任務開始/完成/失敗/超時通知將發送至 TG`);
  } else {
    log.warn(`  [Telegram] 未設定 → 不會發送通知。請在 .env 設定 TELEGRAM_BOT_TOKEN 與 TELEGRAM_CHAT_ID 後重啟。`);
  }

  // AutoExecutor bootstrap/self-heal (disk state is the source of truth).
  const disk = loadAutoExecutorDiskState();

  // ─── 啟動時 reconcile：把上次重啟留下的孤立 in_progress 改回 queued ───
  if (hasSupabase()) {
    (async () => {
      try {
        const ocTasks = await fetchOpenClawTasks();
        // pending_review 是等待老蔡審核的任務，不要重置
        const orphans = (ocTasks ?? []).filter((t) => t.status === 'in_progress');
        if (orphans.length > 0) {
          log.warn(`[StartupReconcile] 發現 ${orphans.length} 筆孤立 in_progress 任務，改回 queued`);
          for (const t of orphans) {
            await upsertOpenClawTask({ id: t.id, status: 'queued' });
            log.info(`[StartupReconcile] 重置: ${t.id} (${t.title})`);
          }
        } else {
          log.info('[StartupReconcile] 無孤立任務，狀態乾淨');
        }
        // 確認 pending_review 任務不被重置
        const pendingReviews = (ocTasks ?? []).filter((t) => t.status === 'pending_review');
        if (pendingReviews.length > 0) {
          log.info(`[StartupReconcile] 保留 ${pendingReviews.length} 筆 pending_review 任務（等待老蔡審核）`);
        }
      } catch (e) {
        log.error('[StartupReconcile] 失敗:', e);
      }
    })();
  }

  if (disk.enabled) {
    startAutoExecutor(disk.pollIntervalMs, disk.maxTasksPerMinute);
  }
  // 恢復派工模式
  if (disk.dispatchMode) {
    autoExecutorState.dispatchMode = true;
    autoExecutorState.dispatchStartedAt = new Date().toISOString();
    if (disk.digestIntervalMs && disk.digestIntervalMs >= 60000) {
      autoExecutorState.digestIntervalMs = disk.digestIntervalMs;
    }
    startDispatchDigestTimer();
    log.info('[AutoDispatch] 從磁碟狀態恢復派工模式');
  }
  setInterval(() => {
    const st = loadAutoExecutorDiskState();
    if (st.enabled && !autoExecutorState.isRunning) {
      log.warn('[AutoExecutor] detected stopped while enabled; restarting...');
      startAutoExecutor(st.pollIntervalMs, st.maxTasksPerMinute);
    }
  }, 15000);

  // ─── Graceful SIGTERM：把執行中的任務改回 queued 再退出 ───
  const gracefulShutdown = async (signal: string) => {
    log.warn(`[Server] 收到 ${signal}，開始 graceful shutdown...`);
    stopAutoExecutor();
    if (activeTaskIds.size > 0 && hasSupabase()) {
      log.warn(`[Server] 回滾 ${activeTaskIds.size} 筆執行中任務 → queued`);
      for (const taskId of activeTaskIds) {
        try {
          await upsertOpenClawTask({ id: taskId, status: 'queued' });
          log.info(`[Server] 回滾任務 ${taskId} → queued`);
        } catch (e) {
          log.error(`[Server] 回滾任務 ${taskId} 失敗:`, e);
        }
      }
    }
    process.exit(0);
  };
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Control bot via getUpdates polling (no webhook; works on localhost).
  startTelegramStopPoll();
});

// Export for integration tests (supertest)
export { app };
