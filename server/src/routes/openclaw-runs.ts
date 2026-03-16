import { Router } from 'express';
import { createLogger } from '../logger.js';
import { supabase } from '../supabase.js';

const log = createLogger('openclaw-runs-route');
export const openclawRunsRouter = Router();

openclawRunsRouter.get('/', async (req, res) => {
  try {
    if (!supabase) { res.status(503).json({ error: 'Supabase not connected' }); return; }
    const { data, error } = await supabase.from('openclaw_runs').select('*').order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    log.error('GET /runs failed:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});