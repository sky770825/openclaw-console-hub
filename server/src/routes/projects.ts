/**
 * Projects 專案製作 API
 * GET    /api/openclaw/projects
 * POST   /api/openclaw/projects
 * PATCH  /api/openclaw/projects/:id
 * DELETE /api/openclaw/projects/:id
 */

import { Router } from 'express';
import { createLogger } from '../logger.js';
import { hasSupabase } from '../supabase.js';
import {
  fetchOpenClawProjects,
  upsertOpenClawProject,
  deleteOpenClawProject,
  type OpenClawProject,
} from '../openclawSupabase.js';

const log = createLogger('projects-route');

export const projectsRouter = Router();

projectsRouter.get('/', async (_req, res) => {
  try {
    if (!hasSupabase()) {
      return res.status(503).json({ message: 'Supabase not connected' });
    }
    const projects = await fetchOpenClawProjects();
    res.json(projects);
  } catch (e) {
    log.error('[OpenClaw] GET /api/openclaw/projects error:', e);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
});

projectsRouter.post('/', async (req, res) => {
  try {
    if (!hasSupabase()) {
      return res.status(503).json({ message: 'Supabase not connected' });
    }
    const body = req.body as Partial<OpenClawProject>;
    const id = body.id || `proj-${Date.now()}`;
    const project = await upsertOpenClawProject({ ...body, id });
    if (!project) {
      return res.status(500).json({ message: 'Failed to create project' });
    }
    res.status(201).json(project);
  } catch (e) {
    log.error('[OpenClaw] POST /api/openclaw/projects error:', e);
    res.status(500).json({ message: 'Failed to create project' });
  }
});

projectsRouter.patch('/:id', async (req, res) => {
  try {
    if (!hasSupabase()) {
      return res.status(503).json({ message: 'Supabase not connected' });
    }
    const body = req.body as Partial<OpenClawProject>;
    const project = await upsertOpenClawProject({ ...body, id: req.params.id });
    if (!project) {
      return res.status(500).json({ message: 'Failed to update project' });
    }
    res.json(project);
  } catch (e) {
    log.error('[OpenClaw] PATCH /api/openclaw/projects error:', e);
    res.status(500).json({ message: 'Failed to update project' });
  }
});

projectsRouter.delete('/:id', async (req, res) => {
  try {
    if (!hasSupabase()) {
      return res.status(503).json({ message: 'Supabase not connected' });
    }
    const ok = await deleteOpenClawProject(req.params.id);
    if (!ok) {
      return res.status(500).json({ message: 'Failed to delete project' });
    }
    res.status(204).send();
  } catch (e) {
    log.error('[OpenClaw] DELETE /api/openclaw/projects error:', e);
    res.status(500).json({ message: 'Failed to delete project' });
  }
});

export default projectsRouter;
