/**
 * OpenClaw 資料路由 — automations CRUD + evolution-log + ui-actions
 *
 * GET    /automations         — 列出自動化
 * POST   /automations         — 新增自動化
 * PATCH  /automations/:id     — 更新自動化
 * GET    /evolution-log       — 取得演化日誌
 * POST   /evolution-log       — 寫入演化日誌
 * GET    /ui-actions          — 取得 UI 操作紀錄
 *
 * 注意：/automations/:id/run 路由因依賴執行引擎，保留在 index.ts
 */

import { Router } from 'express';
import { createLogger } from '../logger.js';
import {
  fetchOpenClawAutomations,
  upsertOpenClawAutomation,
  fetchOpenClawEvolutionLog,
  insertOpenClawEvolutionLog,
  fetchOpenClawUIActions,
} from '../openclawSupabase.js';

const log = createLogger('openclaw-data-route');

export const openclawDataRouter = Router();

// ── Automations CRUD ──

openclawDataRouter.get('/automations', async (_req, res) => {
  try {
    const data = await fetchOpenClawAutomations();
    res.json(data);
  } catch (e) {
    log.error('[OpenClaw] GET /automations error:', e);
    res.status(500).json({ message: 'Failed to fetch automations' });
  }
});

openclawDataRouter.post('/automations', async (req, res) => {
  try {
    const a = await upsertOpenClawAutomation(req.body);
    if (!a) return res.status(500).json({ message: 'Failed to save automation' });
    res.status(201).json(a);
  } catch (e) {
    log.error('[OpenClaw] POST /automations error:', e);
    res.status(500).json({ message: 'Failed to save automation' });
  }
});

openclawDataRouter.patch('/automations/:id', async (req, res) => {
  try {
    const a = await upsertOpenClawAutomation({ ...req.body, id: req.params.id });
    if (!a) return res.status(500).json({ message: 'Failed to update automation' });
    res.json(a);
  } catch (e) {
    log.error('[OpenClaw] PATCH /automations error:', e);
    res.status(500).json({ message: 'Failed to update automation' });
  }
});

// ── Evolution Log ──

openclawDataRouter.get('/evolution-log', async (_req, res) => {
  try {
    const data = await fetchOpenClawEvolutionLog();
    res.json(data);
  } catch (e) {
    log.error('[OpenClaw] GET /evolution-log error:', e);
    res.status(500).json({ message: 'Failed to fetch evolution log' });
  }
});

openclawDataRouter.post('/evolution-log', async (req, res) => {
  try {
    const ok = await insertOpenClawEvolutionLog(req.body);
    if (!ok) return res.status(500).json({ message: 'Failed to insert evolution log' });
    res.status(201).json({ ok: true });
  } catch (e) {
    log.error('[OpenClaw] POST /evolution-log error:', e);
    res.status(500).json({ message: 'Failed to insert evolution log' });
  }
});

// ── UI Actions ──

openclawDataRouter.get('/ui-actions', async (_req, res) => {
  try {
    const data = await fetchOpenClawUIActions();
    res.json(data);
  } catch (e) {
    log.error('[OpenClaw] GET /ui-actions error:', e);
    res.status(500).json({ message: 'Failed to fetch ui actions' });
  }
});

export default openclawDataRouter;
