/**
 * 資料層統一匯出
 * 各模組獨立，之後可替換為 API 或狀態管理而不影響呼叫端
 */
export { taskStore } from './tasks';
export { runStore } from './runs';
export { alertStore } from './alerts';
export { logStore } from './logs';
export { auditStore } from './audit';
export { currentUser } from './user';
export { dashboardStats } from './stats';

// 向後相容：保留舊名稱 mock* 的 re-export（若有其他地方直接 import @/data/mock 再改）
export { taskStore as mockTasks } from './tasks';
export { runStore as mockRuns } from './runs';
export { alertStore as mockAlerts } from './alerts';
export { logStore as mockLogs } from './logs';
export { auditStore as mockAuditLogs } from './audit';
export { currentUser as mockUser } from './user';
export { dashboardStats as mockStats } from './stats';
