/**
 * Ollama 統一代理路由
 * 所有 Ollama 請求走 Server (port 3011) → Ollama (port 11434)
 * 方便日誌/監控/管理，避免各服務直連
 */
import { Router, type Request, type Response } from 'express';

const router = Router();
const OLLAMA_BASE = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_TIMEOUT = 300_000; // 5 分鐘（大模型首次載入較慢）

// 請求統計
let totalRequests = 0;
let generateCalls = 0;
let chatCalls = 0;
let errors = 0;
let lastRequestAt = '';

function recordRequest(type: 'generate' | 'chat' | 'other') {
  totalRequests++;
  if (type === 'generate') generateCalls++;
  if (type === 'chat') chatCalls++;
  lastRequestAt = new Date().toISOString();
}

// POST /generate
router.post('/generate', async (req: Request, res: Response) => {
  recordRequest('generate');
  try {
    const resp = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(OLLAMA_TIMEOUT),
    });
    if (req.body.stream) {
      res.setHeader('Content-Type', 'application/x-ndjson');
      if (resp.body) {
        const reader = resp.body as unknown as NodeJS.ReadableStream;
        reader.pipe(res);
      } else {
        res.status(502).json({ ok: false, error: 'no stream body' });
      }
    } else {
      const data = await resp.json();
      res.json(data);
    }
  } catch (err) {
    errors++;
    res.status(502).json({ ok: false, error: (err as Error).message });
  }
});

// POST /chat
router.post('/chat', async (req: Request, res: Response) => {
  recordRequest('chat');
  try {
    const resp = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(OLLAMA_TIMEOUT),
    });
    if (req.body.stream) {
      res.setHeader('Content-Type', 'application/x-ndjson');
      if (resp.body) {
        const reader = resp.body as unknown as NodeJS.ReadableStream;
        reader.pipe(res);
      } else {
        res.status(502).json({ ok: false, error: 'no stream body' });
      }
    } else {
      const data = await resp.json();
      res.json(data);
    }
  } catch (err) {
    errors++;
    res.status(502).json({ ok: false, error: (err as Error).message });
  }
});

// GET /tags — 列出本地模型
router.get('/tags', async (_req: Request, res: Response) => {
  recordRequest('other');
  try {
    const resp = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: AbortSignal.timeout(10_000),
    });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    errors++;
    res.status(502).json({ ok: false, error: (err as Error).message });
  }
});

// GET /ps — 查看正在運行的模型
router.get('/ps', async (_req: Request, res: Response) => {
  recordRequest('other');
  try {
    const resp = await fetch(`${OLLAMA_BASE}/api/ps`, {
      signal: AbortSignal.timeout(10_000),
    });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    errors++;
    res.status(502).json({ ok: false, error: (err as Error).message });
  }
});

// GET /health — 健康檢查 + 統計
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const resp = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: AbortSignal.timeout(5_000),
    });
    const startMs = Date.now();
    const data = await resp.json() as { models?: Array<{ name: string }> };
    const latencyMs = Date.now() - startMs;
    const models = (data.models || []).map((m: { name: string }) => m.name);
    res.json({
      ok: true,
      ollamaReachable: true,
      latencyMs,
      modelsAvailable: models.length,
      models,
      stats: { totalRequests, generateCalls, chatCalls, errors, lastRequestAt },
    });
  } catch {
    res.json({
      ok: false,
      ollamaReachable: false,
      stats: { totalRequests, generateCalls, chatCalls, errors, lastRequestAt },
    });
  }
});

// GET /stats
router.get('/stats', (_req: Request, res: Response) => {
  res.json({ totalRequests, generateCalls, chatCalls, errors, lastRequestAt });
});

// ALL /v1/* — OpenAI-compatible proxy（給 Gateway 等用）
router.all('/v1/*path', async (req: Request, res: Response) => {
  recordRequest('other');
  const subPath = (req.params as { path: string }).path;
  try {
    const resp = await fetch(`${OLLAMA_BASE}/v1/${subPath}`, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      ...(req.method !== 'GET' && req.method !== 'HEAD' ? { body: JSON.stringify(req.body) } : {}),
      signal: AbortSignal.timeout(OLLAMA_TIMEOUT),
    });
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (err) {
    errors++;
    res.status(502).json({ ok: false, error: (err as Error).message });
  }
});

export { router as ollamaProxyRouter };
