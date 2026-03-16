/**
 * In-memory 儲存，與前端 seed 對齊
 */
import type { Task, Run, Alert } from './types.js';
import type { OpenClawReview } from './openclawSupabase.js';

export const tasks: Task[] = [];
export const runs: Run[] = [];
export const alerts: Alert[] = [];

/** in-memory proposals — Supabase 寫失敗時的 fallback */
export const memReviews: OpenClawReview[] = [];
