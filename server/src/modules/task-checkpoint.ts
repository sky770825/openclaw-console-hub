/**
 * task-checkpoint.ts — Sprint 7 步流程輕量 checkpoint 機制
 * ============================================================
 * 借用 LangGraph 的 checkpoint 概念（不引入 runtime 依賴），
 * 讓 Sprint 7 步 (analyze → plan → code → test → review → deploy → verify)
 * 在失敗時可以 replay、time-travel fork，而不必全部重做。
 *
 * 前置：需先在 Supabase 執行 `server/sql/task_checkpoints.sql` 建表。
 *
 * ── 使用方式 ─────────────────────────────────────────────
 *
 * 1. 每步成功後存 checkpoint：
 *    ```ts
 *    import { saveCheckpoint } from './modules/task-checkpoint';
 *    const cpId = await saveCheckpoint(taskId, 'analyze', 0, { summary: '...', plan: {...} });
 *    // 下一步把 cpId 當 parent 傳入，形成鏈
 *    await saveCheckpoint(taskId, 'plan', 1, { steps: [...] }, cpId);
 *    ```
 *
 * 2. 任務失敗重跑時，抓最新 checkpoint 接著跑：
 *    ```ts
 *    const latest = await getLatestCheckpoint(taskId);
 *    if (latest) {
 *      // 從 latest.step_index + 1 開始跑，state 從 latest.state_json 拿
 *    }
 *    ```
 *
 * 3. 檢視完整 7 步歷程（給 UI / 除錯用）：
 *    ```ts
 *    const history = await getCheckpointHistory(taskId);
 *    ```
 *
 * 4. replay — 從某個 checkpoint 重新拿 state：
 *    ```ts
 *    const cp = await replayFromCheckpoint(checkpointId);
 *    // 把 cp.state_json 餵給對應步驟的執行器重跑
 *    ```
 *
 * 5. fork（time-travel）— 從舊 checkpoint 分支出新 state：
 *    ```ts
 *    const newCpId = await forkCheckpoint(oldCheckpointId, { ...modifiedState });
 *    // 之後的 saveCheckpoint 傳 newCpId 當 parentId，就是新分支
 *    ```
 *
 * ── 注意 ────────────────────────────────────────────────
 * - 本模組只提供能力，尚未整合到 auto-executor（避免大改動）。
 * - state_json 沒有 schema 限制，由呼叫端自行約定結構。
 * - 表有 ON DELETE CASCADE，task 被刪時 checkpoints 一併清除。
 */

import { supabaseServiceRole } from '../openclawSupabase.js';

const TABLE = 'task_checkpoints';

export type SprintStep =
  | 'analyze'
  | 'plan'
  | 'code'
  | 'test'
  | 'review'
  | 'deploy'
  | 'verify';

export interface Checkpoint {
  id: string;
  task_id: string;
  step: SprintStep | string;
  step_index: number;
  state_json: Record<string, unknown>;
  parent_checkpoint_id: string | null;
  created_at: string;
}

/**
 * 儲存一個 checkpoint，回傳 checkpoint_id。
 * @param taskId     對應 openclaw_tasks.id
 * @param step       7 步其一 (analyze/plan/code/test/review/deploy/verify)
 * @param stepIndex  0-6
 * @param state      該步的輸出狀態（任意 JSON 結構）
 * @param parentId   可選。傳入上一步的 checkpoint_id 形成鏈；或 fork 來源
 */
export async function saveCheckpoint(
  taskId: string,
  step: SprintStep | string,
  stepIndex: number,
  state: Record<string, unknown>,
  parentId?: string,
): Promise<string> {
  const { data, error } = await supabaseServiceRole
    .from(TABLE)
    .insert({
      task_id: taskId,
      step,
      step_index: stepIndex,
      state_json: state,
      parent_checkpoint_id: parentId ?? null,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`saveCheckpoint failed: ${error?.message ?? 'no data'}`);
  }
  return data.id as string;
}

/**
 * 取得指定 task 最新的 checkpoint（依 step_index DESC，再 created_at DESC）。
 * 找不到回傳 null。用於失敗後決定從哪一步續跑。
 */
export async function getLatestCheckpoint(
  taskId: string,
): Promise<Checkpoint | null> {
  const { data, error } = await supabaseServiceRole
    .from(TABLE)
    .select('*')
    .eq('task_id', taskId)
    .order('step_index', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`getLatestCheckpoint failed: ${error.message}`);
  }
  return (data as Checkpoint | null) ?? null;
}

/**
 * 取得指定 task 的所有 checkpoint（依 step_index ASC，再 created_at ASC）。
 * 用於 UI 顯示 7 步執行歷程，或除錯追蹤 fork 鏈。
 */
export async function getCheckpointHistory(
  taskId: string,
): Promise<Checkpoint[]> {
  const { data, error } = await supabaseServiceRole
    .from(TABLE)
    .select('*')
    .eq('task_id', taskId)
    .order('step_index', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`getCheckpointHistory failed: ${error.message}`);
  }
  return (data as Checkpoint[] | null) ?? [];
}

/**
 * 讀取指定 checkpoint 給呼叫者重跑。
 * 本函式不執行任何重跑邏輯，只回傳狀態，由呼叫端決定如何使用 state_json。
 */
export async function replayFromCheckpoint(
  checkpointId: string,
): Promise<Checkpoint> {
  const { data, error } = await supabaseServiceRole
    .from(TABLE)
    .select('*')
    .eq('id', checkpointId)
    .single();

  if (error || !data) {
    throw new Error(
      `replayFromCheckpoint failed: ${error?.message ?? 'not found'}`,
    );
  }
  return data as Checkpoint;
}

/**
 * 從某 checkpoint time-travel 分支出新狀態。
 * - 新 checkpoint 沿用 source 的 task_id / step / step_index
 * - parent_checkpoint_id 指向 source，表示分支來源
 * - state_json 改為 newState
 * 回傳新 checkpoint_id。
 */
export async function forkCheckpoint(
  checkpointId: string,
  newState: Record<string, unknown>,
): Promise<string> {
  const source = await replayFromCheckpoint(checkpointId);

  const { data, error } = await supabaseServiceRole
    .from(TABLE)
    .insert({
      task_id: source.task_id,
      step: source.step,
      step_index: source.step_index,
      state_json: newState,
      parent_checkpoint_id: source.id,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`forkCheckpoint failed: ${error?.message ?? 'no data'}`);
  }
  return data.id as string;
}
