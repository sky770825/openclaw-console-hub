/**
 * Supabase 客戶端（後端用 service_role，可 bypass RLS）
 * 有設定 SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY 時啟用持久化
 * 延遲讀取 env，確保 preload-dotenv 已執行
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null | undefined;

function getClient(): SupabaseClient | null {
  if (_client === undefined) {
    const url = process.env.SUPABASE_URL?.trim();
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    _client = url && key ? createClient(url, key) : null;
  }
  return _client;
}

export const supabase: SupabaseClient | null = getClient();
export const hasSupabase = (): boolean => !!getClient();
