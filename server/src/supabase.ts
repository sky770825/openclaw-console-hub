/**
 * Supabase 客戶端（後端用 service_role，可 bypass RLS）
 * 有設定 SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY 時啟用持久化
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null;

export const hasSupabase = (): boolean => !!supabase;
