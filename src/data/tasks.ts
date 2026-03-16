import type { Task } from '@/types';

/**
 * 任務已改由 localStorage 提供（見 services/seed.ts）。
 * 僅保留此 export 供向後相容，實際讀寫請用 getTasks / loadTasks / saveTasks。
 */
export const taskStore: Task[] = [];
