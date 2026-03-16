/**
 * Mock Data 統一 re-export（T-03 產出）
 * UI 使用 @/services/api 取得資料，底層由此處／data 各模組提供
 * @deprecated 新程式請改用 @/data 或 @/data/tasks、@/data/runs 等
 */
export {
  mockTasks,
  mockRuns,
  mockAlerts,
  mockLogs,
  mockAuditLogs,
  mockUser,
  mockStats,
} from './index';
