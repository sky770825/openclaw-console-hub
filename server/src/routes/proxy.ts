/**
 * API Key 安全代理 — Key 不出門
 *
 * POST /api/proxy/fetch — 代理外部 API 請求，server 自動注入 key
 * GET  /api/proxy/targets — 列出可用的代理目標（不暴露 key）
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { createLogger } from '../logger.js';
import { sanitize } from '../utils/key-vault.js';
import { hasSupabase, supabase } from '../supabase.js';
import fs from 'fs';
import path from 'path';

const log = createLogger('proxy');
const proxyRouter = Router();

// ─── 代理目標定義 ───

interface ProxyTarget {
  name: string;
  urlPattern: RegExp;
  inject: (url: string, headers: Record<string, string>) => { url: string; headers: Record<string, string> };
}

function readProviderKey(provider: string): string {
  try {
    const ocPath = path.join(process.env.HOME || '/tmp', '.openclaw', 'openclaw.json');
    const data = JSON.parse(fs.readFileSync(ocPath, 'utf8'));
    return data?.models?.providers?.[provider]?.apiKey?.trim() || '';
  } catch { return ''; }
}

const PROXY_TARGETS: ProxyTarget[] = [
  {
    name: 'Gemini',
    urlPattern: /^https:\/\/generativelanguage\.googleapis\.com\//,
    inject: (url, headers) => {
      const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';
      const sep = url.includes('?') ? '&' : '?';
      return { url: `${url}${sep}key=${key}`, headers };
    },
  },
  {
    name: 'Kimi',
    urlPattern: /^https:\/\/api\.moonshot\.ai\//,
    inject: (url, headers) => ({
      url,
      headers: { ...headers, Authorization: `Bearer ${readProviderKey('kimi')}` },
    }),
  },
  {
    name: 'xAI',
    urlPattern: /^https:\/\/api\.x\.ai\//,
    inject: (url, headers) => ({
      url,
      headers: { ...headers, Authorization: `Bearer ${readProviderKey('xai')}` },
    }),
  },
  {
    name: 'OpenAI',
    urlPattern: /^https:\/\/api\.openai\.com\//,
    inject: (url, headers) => ({
      url,
      headers: { ...headers, Authorization: `Bearer ${readProviderKey('openai')}` },
    }),
  },
];

// ─── POST /api/proxy/fetch ───

proxyRouter.post('/fetch', async (req: Request, res: Response) => {
  const { url, method = 'POST', headers = {}, body, timeout = 30000 } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ ok: false, error: 'Missing or invalid "url"' });
  }

  // 安全：刪除 caller 帶的 auth header（key 只能由 server 注入）
  const safeHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    const lower = k.toLowerCase();
    if (lower === 'authorization' || lower === 'x-api-key' || lower === 'x-goog-api-key') continue;
    if (typeof v === 'string') safeHeaders[k] = v;
  }

  const target = PROXY_TARGETS.find(t => t.urlPattern.test(url));
  if (!target) {
    return res.status(403).json({
      ok: false,
      error: `URL not allowed. Targets: ${PROXY_TARGETS.map(t => t.name).join(', ')}`,
    });
  }

  const cappedTimeout = Math.min(Math.max(Number(timeout) || 30000, 5000), 90000);

  log.info(`[Proxy] ${method} → ${target.name}`);

  try {
    const injected = target.inject(url, safeHeaders);
    const fetchOpts: RequestInit = {
      method: method.toUpperCase(),
      headers: { 'Content-Type': 'application/json', ...injected.headers },
      signal: AbortSignal.timeout(cappedTimeout),
    };

    if (body && method.toUpperCase() !== 'GET') {
      fetchOpts.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const resp = await fetch(injected.url, fetchOpts);
    const contentType = resp.headers.get('content-type') || '';
    let data: unknown;
    if (contentType.includes('application/json')) {
      data = await resp.json();
    } else {
      data = await resp.text();
    }

    // 脫敏：確保回應不含任何 key
    const sanitizedData = typeof data === 'string'
      ? sanitize(data)
      : JSON.parse(sanitize(JSON.stringify(data)));

    res.json({ ok: resp.ok, status: resp.status, data: sanitizedData });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    log.warn(`[Proxy] ${target.name} failed: ${sanitize(errMsg)}`);
    res.status(502).json({ ok: false, error: sanitize(`Proxy to ${target.name} failed: ${errMsg}`) });
  }
});

// ─── GET /api/proxy/targets ───

proxyRouter.get('/targets', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    targets: PROXY_TARGETS.map(t => ({ name: t.name, pattern: t.urlPattern.source })),
  });
});

// ─── POST /api/proxy/supabase ─── 安全 Supabase 查詢代理

/** 允許查詢的表白名單 */
const ALLOWED_TABLES = new Set([
  'openclaw_tasks', 'openclaw_reviews', 'openclaw_automations',
  'openclaw_evolution_log', 'openclaw_runs', 'openclaw_audit_logs',
  'fadp_members', 'fadp_attack_events', 'fadp_blocklist',
  // 注意：schedules/shifts/attendance/employees 是楊梅餐車的表，在另一個 Supabase，這裡查不到
]);

proxyRouter.post('/supabase', async (req: Request, res: Response) => {
  if (!hasSupabase() || !supabase) {
    return res.status(503).json({ ok: false, error: 'Supabase not configured' });
  }

  const { table, select = '*', filters, order, limit = 100, single = false } = req.body;

  if (!table || typeof table !== 'string') {
    return res.status(400).json({ ok: false, error: 'Missing "table" field' });
  }

  if (!ALLOWED_TABLES.has(table)) {
    return res.status(403).json({
      ok: false,
      error: `Table "${table}" not allowed. Allowed: ${[...ALLOWED_TABLES].join(', ')}`,
    });
  }

  const cappedLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);

  log.info(`[Proxy/Supabase] SELECT ${select} FROM ${table} LIMIT ${cappedLimit}`);

  try {
    let query: any = supabase.from(table).select(select);

    // 套用 filters: [{ column, op, value }]
    if (Array.isArray(filters)) {
      for (const f of filters) {
        if (!f.column || !f.op) continue;
        switch (f.op) {
          case 'eq': query = query.eq(f.column, f.value); break;
          case 'neq': query = query.neq(f.column, f.value); break;
          case 'gt': query = query.gt(f.column, f.value); break;
          case 'gte': query = query.gte(f.column, f.value); break;
          case 'lt': query = query.lt(f.column, f.value); break;
          case 'lte': query = query.lte(f.column, f.value); break;
          case 'like': query = query.like(f.column, f.value); break;
          case 'ilike': query = query.ilike(f.column, f.value); break;
          case 'in': query = query.in(f.column, f.value); break;
          case 'is': query = query.is(f.column, f.value); break;
          default: break;
        }
      }
    }

    // 排序
    if (order && typeof order === 'object' && order.column) {
      query = query.order(order.column, { ascending: order.ascending ?? false });
    }

    query = query.limit(cappedLimit);

    if (single) {
      const { data, error } = await query.single();
      if (error) return res.status(400).json({ ok: false, error: error.message });
      return res.json({ ok: true, data: JSON.parse(sanitize(JSON.stringify(data))) });
    }

    const { data, error, count } = await query;
    if (error) return res.status(400).json({ ok: false, error: error.message });

    res.json({
      ok: true,
      count: data?.length ?? 0,
      data: JSON.parse(sanitize(JSON.stringify(data))),
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    log.warn(`[Proxy/Supabase] Error: ${sanitize(errMsg)}`);
    res.status(500).json({ ok: false, error: sanitize(errMsg) });
  }
});

// ─── GET /api/proxy/supabase/tables ─── 列出可查詢的表

proxyRouter.get('/supabase/tables', (_req: Request, res: Response) => {
  res.json({ ok: true, tables: [...ALLOWED_TABLES] });
});

export { proxyRouter };
