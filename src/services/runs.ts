import { getTask } from './tasks';
import { loadRuns, saveRuns } from './seed';
import type { Run } from '@/types';
import { optionalDelay } from './config';

export async function getRuns(): Promise<Run[]> {
  await optionalDelay();
  return loadRuns();
}

export async function getRun(id: string): Promise<Run | undefined> {
  await optionalDelay();
  return loadRuns().find((r) => r.id === id);
}

export async function getRunsByTask(taskId: string): Promise<Run[]> {
  await optionalDelay();
  return loadRuns().filter((r) => r.taskId === taskId);
}

export async function triggerRun(taskId: string): Promise<Run> {
  await optionalDelay();
  const task = await getTask(taskId);
  const runs = loadRuns();
  const newRun: Run = {
    id: `run-${String(runs.length + 1).padStart(4, '0')}`,
    taskId,
    taskName: task?.name || '未知任務',
    status: 'running',
    startedAt: new Date().toISOString(),
    steps: [
      { name: '佇列中', status: 'success', startedAt: new Date().toISOString() },
      { name: '初始化', status: 'running', startedAt: new Date().toISOString() },
      { name: '處理', status: 'pending' },
      { name: '完成', status: 'pending' },
    ],
    inputSummary: { source: 'manual', triggeredBy: 'user' },
  };
  runs.unshift(newRun);
  saveRuns(runs);
  return newRun;
}
