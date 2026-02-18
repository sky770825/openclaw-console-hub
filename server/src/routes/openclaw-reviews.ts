/**
 * OpenClaw 審核路由 — /api/openclaw/reviews/*
 *
 * GET    /reviews           — 列出審核項目
 * POST   /reviews           — 新增/更新審核
 * PATCH  /reviews/:id       — 更新審核狀態
 * DELETE /reviews/:id       — 刪除審核
 * GET    /reviews/:id/tasks — 取得與審核關聯的任務
 */

import { Router } from 'express';
import { createLogger } from '../logger.js';
import { hasSupabase } from '../supabase.js';
import {
  fetchOpenClawReviews,
  upsertOpenClawReview,
  deleteOpenClawReview,
  seedOpenClawReviewsIfEmpty,
  fetchOpenClawTasksByFromReviewId,
  type OpenClawReview,
} from '../openclawSupabase.js';
import { openClawTaskToTask } from '../openclawMapper.js';
import { memReviews } from '../store.js';

const log = createLogger('openclaw-reviews-route');

export const openclawReviewsRouter = Router();

/** 將 openclaw_reviews 轉成發想審核頁面使用的 Review 格式 */
function openClawReviewToReview(r: OpenClawReview, index: number) {
  const proposalCat = r.src?.startsWith('agent-proposal:') ? r.src.split(':')[1] : undefined;
  return {
    id: r.id,
    number: index + 1,
    title: r.title,
    type: r.type ?? 'tool',
    pri: r.pri ?? 'medium',
    desc: r.desc ?? '',
    reasoning: r.reasoning ?? '',
    src: r.src ?? '',
    date: r.created_at ? new Date(r.created_at).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' }) : '',
    status: r.status as 'pending' | 'approved' | 'rejected' | 'archived',
    createdAt: r.created_at ?? new Date().toISOString(),
    reviewedAt: r.status !== 'pending' ? r.created_at : undefined,
    reviewNote: r.reasoning ?? undefined,
    tags: [r.type, r.pri, proposalCat].filter(Boolean),
    proposalCategory: proposalCat,
  };
}

// 匯出供其他模組使用
export { openClawReviewToReview };

// GET /api/openclaw/reviews
openclawReviewsRouter.get('/', async (_req, res) => {
  try {
    let data = await fetchOpenClawReviews();
    if (data.length === 0 && hasSupabase()) {
      try {
        await seedOpenClawReviewsIfEmpty();
        data = await fetchOpenClawReviews();
      } catch (_) {
        /* seed 失敗仍回傳 []，不中斷請求 */
      }
    }
    // 合併 in-memory proposals（Supabase 寫失敗時的 fallback）
    const supabaseIds = new Set(data.map((r) => r.id));
    for (const mr of memReviews) {
      if (!supabaseIds.has(mr.id)) data.push(mr);
    }
    res.json(data.map((r, i) => openClawReviewToReview(r, i)));
  } catch (e) {
    log.error('[OpenClaw] GET /reviews error:', e);
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

// POST /api/openclaw/reviews
openclawReviewsRouter.post('/', async (req, res) => {
  try {
    const review = await upsertOpenClawReview(req.body);
    if (!review) return res.status(500).json({ message: 'Failed to save review' });
    res.status(201).json(review);
  } catch (e) {
    log.error('[OpenClaw] POST /reviews error:', e);
    res.status(500).json({ message: 'Failed to save review' });
  }
});

// PATCH /api/openclaw/reviews/:id
openclawReviewsRouter.patch('/:id', async (req, res) => {
  try {
    const body = req.body as { status?: string; reviewNote?: string; reviewedAt?: string };
    let existing = (await fetchOpenClawReviews()).find((r) => r.id === req.params.id);
    // fallback: 從 in-memory proposals 找
    if (!existing) existing = memReviews.find((r) => r.id === req.params.id);
    if (!existing) return res.status(404).json({ message: 'Review not found' });
    const payload = {
      ...existing,
      id: req.params.id,
      status: body.status ?? existing.status,
      reasoning: body.reviewNote !== undefined ? body.reviewNote : existing.reasoning,
    };
    const review = await upsertOpenClawReview(payload);
    // 如果 Supabase 寫失敗，更新 in-memory
    if (!review) {
      const mr = memReviews.find((r) => r.id === req.params.id);
      if (mr) {
        mr.status = payload.status;
        mr.reasoning = payload.reasoning;
        return res.json(openClawReviewToReview(mr, 0));
      }
      return res.status(500).json({ message: 'Failed to update review' });
    }
    const list = await fetchOpenClawReviews();
    const idx = list.findIndex((r) => r.id === review.id);
    res.json(openClawReviewToReview(review, idx >= 0 ? idx : 0));
  } catch (e) {
    log.error('[OpenClaw] PATCH /reviews error:', e);
    res.status(500).json({ message: 'Failed to update review' });
  }
});

// DELETE /api/openclaw/reviews/:id
openclawReviewsRouter.delete('/:id', async (req, res) => {
  try {
    const existing = (await fetchOpenClawReviews()).find((r) => r.id === req.params.id);
    if (!existing) return res.status(404).json({ message: 'Review not found' });
    const ok = await deleteOpenClawReview(req.params.id);
    if (!ok) return res.status(500).json({ message: 'Failed to delete review' });
    return res.status(204).send();
  } catch (e) {
    log.error('[OpenClaw] DELETE /reviews error:', e);
    res.status(500).json({ message: 'Failed to delete review' });
  }
});

// GET /api/openclaw/reviews/:id/tasks
openclawReviewsRouter.get('/:id/tasks', async (req, res) => {
  try {
    const ocTasks = await fetchOpenClawTasksByFromReviewId(req.params.id);
    const mapped = ocTasks.map(openClawTaskToTask);
    return res.json(mapped);
  } catch (e) {
    log.error('[OpenClaw] GET /reviews/:id/tasks error:', e);
    res.status(500).json({ message: 'Failed to fetch tasks for review' });
  }
});

export default openclawReviewsRouter;
