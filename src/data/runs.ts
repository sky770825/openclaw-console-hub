import type { Run } from '@/types';

/**
 * 執行紀錄已改由 localStorage 提供（見 services/seed.ts）。
 * 僅保留此 export 供向後相容，實際讀寫請用 loadRuns / saveRuns。
 */
export const runStore: Run[] = [];
