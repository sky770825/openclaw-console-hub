import { loadRuns, loadTasks } from './seed';
import { optionalDelay } from './config';

const DAY_LABELS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

export async function getDashboardStats() {
  await optionalDelay();

  const runs = loadRuns();
  const tasks = loadTasks();

  // Today Runs = runs filtered by startedAt is today
  const todayRuns = runs.filter((r) => isToday(r.startedAt)).length;

  // Success / Failed counts（只算已結束的）
  const success = runs.filter((r) => r.status === 'success').length;
  const failed = runs.filter((r) => r.status === 'failed').length;
  const completed = success + failed;

  // Success Rate = success / (success + failed)，無完成數時為 0
  const successRate = completed > 0 ? Math.round((success / completed) * 1000) / 10 : 0;

  // Failed Runs = failed count
  const failedRuns = failed;

  // Avg Duration = avg(durationMs)（只算有 durationMs 的）
  const withDuration = runs.filter((r) => r.durationMs != null && r.durationMs > 0);
  const avgDuration =
    withDuration.length > 0
      ? Math.round(
          withDuration.reduce((sum, r) => sum + (r.durationMs ?? 0), 0) / withDuration.length
        )
      : 0;

  // Queue Depth = 佇列中的 run 數
  const queueDepth = runs.filter((r) => r.status === 'queued').length;

  // Active Tasks = status === 'running' 的任務數
  const activeTasks = tasks.filter((t) => t.status === 'running').length;

  // Weekly Trend = 過去 7 天，每天的成功/失敗數
  const weeklyTrend = (() => {
    const result: { day: string; success: number; failed: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayRuns = runs.filter((r) => dateKey(r.startedAt) === key);
      const s = dayRuns.filter((r) => r.status === 'success').length;
      const f = dayRuns.filter((r) => r.status === 'failed').length;
      result.push({
        day: DAY_LABELS[d.getDay()],
        success: s,
        failed: f,
      });
    }
    return result;
  })();

  // Agent Usage Stats = 依 owner 統計執行數
  const agentStats = (() => {
    const stats: Record<string, { runs: number; success: number; failed: number }> = {};
    
    // 初始化所有可能的 agent
    const agents = ['小蔡', 'OpenClaw', 'Cursor', 'CoDEX', '老蔡'];
    agents.forEach(agent => {
      stats[agent] = { runs: 0, success: 0, failed: 0 };
    });
    
    // 從任務中統計
    tasks.forEach(task => {
      const owner = task.owner || 'Unknown';
      if (!stats[owner]) {
        stats[owner] = { runs: 0, success: 0, failed: 0 };
      }
    });
    
    // 從執行記錄中統計
    runs.forEach(run => {
      const task = tasks.find(t => t.id === run.taskId);
      const owner = task?.owner || 'Unknown';
      
      if (!stats[owner]) {
        stats[owner] = { runs: 0, success: 0, failed: 0 };
      }
      
      stats[owner].runs++;
      if (run.status === 'success') {
        stats[owner].success++;
      } else if (run.status === 'failed') {
        stats[owner].failed++;
      }
    });
    
    return Object.entries(stats)
      .filter(([_, data]) => data.runs > 0)
      .map(([name, data]) => ({
        name,
        ...data,
        successRate: data.runs > 0 ? Math.round((data.success / data.runs) * 100) : 0,
      }))
      .sort((a, b) => b.runs - a.runs);
  })();

  return {
    todayRuns,
    successRate,
    failedRuns,
    avgDuration,
    queueDepth,
    activeTasks,
    weeklyTrend,
    agentStats,
  };
}
