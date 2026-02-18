/**
 * Memory API — AI 記憶系統
 * GET    /api/openclaw/memory          — 列出記憶（分頁）
 * GET    /api/openclaw/memory/search   — 搜尋記憶
 * GET    /api/openclaw/memory/stats    — 統計
 * POST   /api/openclaw/memory          — 新增/同步記憶
 * POST   /api/openclaw/memory/batch    — 批量同步
 * DELETE /api/openclaw/memory/:id      — 刪除
 */

import { Router } from 'express';
import { createLogger } from '../logger.js';
import { hasSupabase } from '../supabase.js';
import {
  fetchOpenClawMemory,
  searchOpenClawMemory,
  upsertOpenClawMemory,
  deleteOpenClawMemory,
  getOpenClawMemoryStats,
  type OpenClawMemory,
} from '../openclawSupabase.js';

const log = createLogger('memory-route');

export const memoryRouter = Router();

memoryRouter.get('/memory', async (req, res) => {
  try {
    if (!hasSupabase()) {
      return res.status(503).json({ message: 'Supabase not connected' });
    }
    const type = req.query.type as string | undefined;
    const source = req.query.source as string | undefined;
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const result = await fetchOpenClawMemory({ type, source, limit, offset });
    res.json(result);
  } catch (e) {
    log.error('[Memory] GET /memory error:', e);
    res.status(500).json({ message: 'Failed to fetch memory' });
  }
});

memoryRouter.get('/memory/search', async (req, res) => {
  try {
    if (!hasSupabase()) {
      return res.status(503).json({ message: 'Supabase not connected' });
    }
    const q = (req.query.q as string) || '';
    const type = req.query.type as string | undefined;
    const source = req.query.source as string | undefined;
    const tags = req.query.tags ? (req.query.tags as string).split(',') : undefined;
    const limit = Number(req.query.limit) || 20;
    const items = await searchOpenClawMemory(q, { type, source, tags, limit });
    res.json({ items, total: items.length });
  } catch (e) {
    log.error('[Memory] GET /memory/search error:', e);
    res.status(500).json({ message: 'Failed to search memory' });
  }
});

memoryRouter.get('/memory/stats', async (_req, res) => {
  try {
    if (!hasSupabase()) {
      return res.status(503).json({ message: 'Supabase not connected' });
    }
    const stats = await getOpenClawMemoryStats();
    res.json(stats || { total: 0, byType: {}, bySource: {} });
  } catch (e) {
    log.error('[Memory] GET /memory/stats error:', e);
    res.status(500).json({ message: 'Failed to get memory stats' });
  }
});

memoryRouter.post('/memory', async (req, res) => {
  try {
    if (!hasSupabase()) {
      return res.status(503).json({ message: 'Supabase not connected' });
    }
    const body = req.body as Partial<OpenClawMemory> & { id: string };
    if (!body.id) {
      return res.status(400).json({ message: 'Missing id' });
    }
    const result = await upsertOpenClawMemory(body);
    if (!result) {
      return res.status(500).json({ message: 'Failed to save memory' });
    }
    res.status(201).json(result);
  } catch (e) {
    log.error('[Memory] POST /memory error:', e);
    res.status(500).json({ message: 'Failed to save memory' });
  }
});

memoryRouter.post('/memory/batch', async (req, res) => {
  try {
    if (!hasSupabase()) {
      return res.status(503).json({ message: 'Supabase not connected' });
    }
    const items = req.body?.items as Array<Partial<OpenClawMemory> & { id: string }>;
    if (!Array.isArray(items)) {
      return res.status(400).json({ message: 'Expected { items: [...] }' });
    }
    let saved = 0;
    let failed = 0;
    for (const item of items) {
      if (!item.id) { failed++; continue; }
      const result = await upsertOpenClawMemory(item);
      if (result) saved++;
      else failed++;
    }
    res.json({ ok: true, saved, failed, total: items.length });
  } catch (e) {
    log.error('[Memory] POST /memory/batch error:', e);
    res.status(500).json({ message: 'Failed to batch save memory' });
  }
});

memoryRouter.delete('/memory/:id', async (req, res) => {
  try {
    if (!hasSupabase()) {
      return res.status(503).json({ message: 'Supabase not connected' });
    }
    const ok = await deleteOpenClawMemory(req.params.id);
    if (!ok) {
      return res.status(500).json({ message: 'Failed to delete memory' });
    }
    res.status(204).send();
  } catch (e) {
    log.error('[Memory] DELETE /memory error:', e);
    res.status(500).json({ message: 'Failed to delete memory' });
  }
});

export default memoryRouter;
