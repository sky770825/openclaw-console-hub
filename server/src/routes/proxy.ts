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

export { proxyRouter };
