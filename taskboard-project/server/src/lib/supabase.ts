import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const checkSupabaseHealth = async () => {
  try {
    const { data, error } = await supabase.from('openclaw_memories').select('count', { count: 'exact', head: true });
    if (error) throw error;
    return true;
  } catch (error) {
    logger.error({ error, component: 'supabase', operation: 'healthCheck' }, 'Supabase health check failed');
    return false;
  }
};
