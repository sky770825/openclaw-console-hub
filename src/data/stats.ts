/** 儀表板統計（mock 可替換為 API 彙總） */
export const dashboardStats = {
  todayRuns: 0,
  successRate: 0,
  failedRuns: 0,
  avgDuration: 0,
  queueDepth: 0,
  activeTasks: 0,
  weeklyTrend: [
    { day: '週一', success: 0, failed: 0 },
    { day: '週二', success: 0, failed: 0 },
    { day: '週三', success: 0, failed: 0 },
    { day: '週四', success: 0, failed: 0 },
    { day: '週五', success: 0, failed: 0 },
    { day: '週六', success: 0, failed: 0 },
    { day: '週日', success: 0, failed: 0 },
  ],
};
