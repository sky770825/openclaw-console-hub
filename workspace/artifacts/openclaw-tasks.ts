import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// Existing GET /
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('openclaw_tasks')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ADDED: GET /:id - Get specific task details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('openclaw_tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Task not found' });
    
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
