/**
 * 緊急終止機制 - Emergency Stop Module
 * 提供 /stop 指令功能，立即停止當前執行中的任務
 */

// 全域執行狀態追蹤
interface RunningTask {
  taskId: string;
  taskName: string;
  agentType: string;
  startTime: Date;
  abortController: AbortController;
  pid?: number;
}

// 儲存當前執行中的任務
const runningTasks = new Map<string, RunningTask>();

/**
 * 註冊正在執行的任務
 */
export function registerRunningTask(
  taskId: string,
  taskName: string,
  agentType: string,
  abortController: AbortController,
  pid?: number
): void {
  runningTasks.set(taskId, {
    taskId,
    taskName,
    agentType,
    startTime: new Date(),
    abortController,
    pid
  });
  
  console.log(`[EmergencyStop] 任務已註冊: ${taskId} (${taskName})`);
}

/**
 * 取消註冊任務（正常完成時）
 */
export function unregisterRunningTask(taskId: string): void {
  runningTasks.delete(taskId);
  console.log(`[EmergencyStop] 任務已取消註冊: ${taskId}`);
}

/**
 * 獲取所有執行中的任務
 */
export function getRunningTasks(): RunningTask[] {
  return Array.from(runningTasks.values());
}

/**
 * 緊急終止指定任務
 */
export async function emergencyStopTask(taskId: string, reason: string = '用戶緊急終止'): Promise<{ success: boolean; message: string }> {
  const task = runningTasks.get(taskId);
  
  if (!task) {
    return { success: false, message: `任務 ${taskId} 未在執行中` };
  }
  
  try {
    console.log(`[EmergencyStop] 🚨 緊急終止任務: ${taskId} (${task.taskName})`);
    
    // 1. 發送中止信號
    task.abortController.abort();
    
    // 2. 如果有系統進程 ID，嘗試終止進程
    if (task.pid) {
      try {
        process.kill(task.pid, 'SIGTERM');
        setTimeout(() => {
          try {
            process.kill(task.pid!, 'SIGKILL');
          } catch (e) {
            // 進程可能已終止
          }
        }, 2000);
      } catch (e) {
        console.log(`[EmergencyStop] 進程 ${task.pid} 可能已終止`);
      }
    }
    
    // 3. 從執行列表移除
    runningTasks.delete(taskId);
    
    console.log(`[EmergencyStop] ✅ 任務已終止: ${taskId}`);
    
    return { success: true, message: `任務 "${task.taskName}" 已緊急終止` };
  } catch (error) {
    console.error('[EmergencyStop] 終止任務失敗:', error);
    return { success: false, message: `終止失敗: ${error}` };
  }
}

/**
 * 終止所有執行中的任務
 */
export async function emergencyStopAll(reason: string = '用戶緊急終止全部'): Promise<{ success: boolean; stopped: number; failed: number }> {
  const tasks = getRunningTasks();
  let stopped = 0;
  let failed = 0;
  
  console.log(`[EmergencyStop] 🚨 緊急終止所有任務 (${tasks.length} 個)`);
  
  for (const task of tasks) {
    const result = await emergencyStopTask(task.taskId, reason);
    if (result.success) {
      stopped++;
    } else {
      failed++;
    }
  }
  
  return { success: failed === 0, stopped, failed };
}

/**
 * 檢查任務是否正在執行
 */
export function isTaskRunning(taskId: string): boolean {
  return runningTasks.has(taskId);
}

/**
 * 處理 /stop 指令
 */
export async function handleStopCommand(args: string[]): Promise<{ success: boolean; message: string }> {
  if (args.length === 0 || args[0] === 'all') {
    const result = await emergencyStopAll();
    return {
      success: result.success,
      message: `已終止 ${result.stopped} 個任務${result.failed > 0 ? `，${result.failed} 個失敗` : ''}`
    };
  }
  
  const taskId = args[0];
  return await emergencyStopTask(taskId);
}

/**
 * 創建帶有超時控制的 AbortController
 */
export function createTimeoutController(timeoutMs: number = 300000): AbortController {
  const controller = new AbortController();
  
  const timeoutId = setTimeout(() => {
    console.log(`[EmergencyStop] ⏱️ 任務超時，自動終止`);
    controller.abort();
  }, timeoutMs);
  
  controller.signal.addEventListener('abort', () => {
    clearTimeout(timeoutId);
  });
  
  return controller;
}
