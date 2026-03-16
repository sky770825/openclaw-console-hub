/**
 * 種子資料：Runs + Alerts（展示用）
 * 型別與 src/types/run.ts、alert.ts 一致
 */
import type { Run, Alert } from '@/types';

const iso = (d: Date) => d.toISOString();
const minutesAgo = (m: number) => iso(new Date(Date.now() - m * 60 * 1000));

export const seedRuns: Run[] = [
  // 失敗案例：T-08 Run Detail（讓你有 error panel 可以展示）
  {
    id: 'R-1008-01',
    taskId: 'T-08',
    taskName: 'Run Detail（Timeline + Error + Input/Output）',
    status: 'failed',
    startedAt: minutesAgo(92),
    endedAt: minutesAgo(90),
    durationMs: 2 * 60 * 1000,
    inputSummary: `{"runId":"R-1008-01","mode":"drawer","includeTimeline":true}`,
    outputSummary: `{"updatedFiles":["src/pages/Runs.tsx","src/components/RunDetailDrawer.tsx"]}`,
    steps: [
      { name: 'queued', status: 'success', startedAt: minutesAgo(92), endedAt: minutesAgo(92), message: 'Queued' },
      { name: 'started', status: 'success', startedAt: minutesAgo(92), endedAt: minutesAgo(92), message: 'Runner started' },
      { name: 'build-ui', status: 'success', startedAt: minutesAgo(92), endedAt: minutesAgo(91), message: 'Rendered timeline + error panel' },
      { name: 'wire-actions', status: 'failed', startedAt: minutesAgo(91), endedAt: minutesAgo(90), message: 'Missing handler: rerun()' },
    ],
    error: {
      code: 'HANDLER_MISSING',
      message: 'Re-run handler not implemented (mock API missing endpoint).',
      stack: 'at RunDetailDrawer (src/components/RunDetailDrawer.tsx:118)\n    at onClick (src/components/Button.tsx:44)',
    },
  },

  // 成功案例：T-05 Task Board
  {
    id: 'R-1005-01',
    taskId: 'T-05',
    taskName: 'Task Board（Kanban）',
    status: 'success',
    startedAt: minutesAgo(210),
    endedAt: minutesAgo(206),
    durationMs: 4 * 60 * 1000,
    inputSummary: `{"columns":["Draft","Ready","Running","Review","Done","Blocked"]}`,
    outputSummary: `{"components":["TaskCard","BoardColumn","FilterBar"],"rwd":"ok"}`,
    steps: [
      { name: 'queued', status: 'success', startedAt: minutesAgo(210), endedAt: minutesAgo(210) },
      { name: 'started', status: 'success', startedAt: minutesAgo(210), endedAt: minutesAgo(210) },
      { name: 'render-board', status: 'success', startedAt: minutesAgo(210), endedAt: minutesAgo(208), message: 'Board rendered' },
      { name: 'rwd-pass', status: 'success', startedAt: minutesAgo(208), endedAt: minutesAgo(206), message: 'Mobile card list OK' },
    ],
  },

  // 執行中案例：T-10 Logs Explorer
  {
    id: 'R-1010-01',
    taskId: 'T-10',
    taskName: 'Logs Explorer（日誌查詢）',
    status: 'running',
    startedAt: minutesAgo(6),
    endedAt: null,
    durationMs: null,
    inputSummary: `{"filters":{"level":"error","keyword":"HANDLER"}}`,
    outputSummary: '',
    steps: [
      { name: 'queued', status: 'success', startedAt: minutesAgo(6), endedAt: minutesAgo(6) },
      { name: 'started', status: 'success', startedAt: minutesAgo(6), endedAt: minutesAgo(6) },
      { name: 'stream-logs', status: 'running', startedAt: minutesAgo(5), message: 'Streaming logs…' },
    ],
  },

  // 成功案例：T-02 types
  {
    id: 'R-1002-01',
    taskId: 'T-02',
    taskName: '任務板資料模型（Task / Run / Alert）',
    status: 'success',
    startedAt: minutesAgo(320),
    endedAt: minutesAgo(315),
    durationMs: 5 * 60 * 1000,
    inputSummary: `{"models":["Task","Run","Alert"]}`,
    outputSummary: `{"files":["src/types/task.ts","src/types/run.ts","src/types/alert.ts"]}`,
    steps: [
      { name: 'queued', status: 'success', startedAt: minutesAgo(320), endedAt: minutesAgo(320) },
      { name: 'started', status: 'success', startedAt: minutesAgo(320), endedAt: minutesAgo(320) },
      { name: 'define-types', status: 'success', startedAt: minutesAgo(319), endedAt: minutesAgo(316) },
      { name: 'lint', status: 'success', startedAt: minutesAgo(316), endedAt: minutesAgo(315) },
    ],
  },

  // 失敗案例：T-03 mock API（讓 alerts 有第二個來源）
  {
    id: 'R-1003-01',
    taskId: 'T-03',
    taskName: 'Mock Data 與 API 抽象層',
    status: 'failed',
    startedAt: minutesAgo(140),
    endedAt: minutesAgo(137),
    durationMs: 3 * 60 * 1000,
    inputSummary: `{"target":"src/services/api.ts"}`,
    outputSummary: '',
    steps: [
      { name: 'queued', status: 'success', startedAt: minutesAgo(140), endedAt: minutesAgo(140) },
      { name: 'started', status: 'success', startedAt: minutesAgo(140), endedAt: minutesAgo(140) },
      { name: 'implement-mock', status: 'failed', startedAt: minutesAgo(139), endedAt: minutesAgo(137), message: 'Circular import detected' },
    ],
    error: { code: 'CIRCULAR_IMPORT', message: 'Circular import between api.ts and mock.ts.' },
  },
];

export const seedAlerts: Alert[] = [
  {
    id: 'A-0001',
    type: 'task_run_failed',
    severity: 'high',
    status: 'open',
    createdAt: minutesAgo(89),
    message: 'Run failed: Missing handler rerun() in Run Detail.',
    relatedTaskId: 'T-08',
    relatedRunId: 'R-1008-01',
  },
  {
    id: 'A-0002',
    type: 'task_run_failed',
    severity: 'medium',
    status: 'open',
    createdAt: minutesAgo(136),
    message: 'Run failed: Circular import in mock API layer.',
    relatedTaskId: 'T-03',
    relatedRunId: 'R-1003-01',
  },
  {
    id: 'A-0003',
    type: 'runner_streaming',
    severity: 'low',
    status: 'acked',
    createdAt: minutesAgo(5),
    message: 'Log stream is running (mock).',
    relatedTaskId: 'T-10',
    relatedRunId: 'R-1010-01',
  },
  {
    id: 'A-0004',
    type: 'queue_backlog',
    severity: 'medium',
    status: 'snoozed',
    createdAt: minutesAgo(30),
    message: 'Queue depth is increasing (mock). Consider triage failed runs first.',
  },
];
