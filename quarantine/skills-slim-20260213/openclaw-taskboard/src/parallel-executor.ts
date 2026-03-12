/**
 * Parallel Executor (平行子代理執行器)
 * 將大任務拆分為多個子任務平行執行
 */

// import { sessions_spawn } from '../openclaw-api';

export interface SubTask {
  id: string;
  task: string;
  agentId?: string;
  timeoutSeconds?: number;
}

export interface SubTaskResult {
  subTaskId: string;
  success: boolean;
  result?: any;
  error?: string;
  executionTimeMs: number;
}

export interface ParallelExecutionOptions {
  maxConcurrency: number;        // 最大平行數量 (預設 3)
  timeoutSeconds: number;        // 每個子任務超時時間 (預設 300)
  continueOnError: boolean;      // 任一失敗是否繼續 (預設 true)
  model?: string;                // 指定模型
  thinking?: string;             // 思考模式
}

export interface ParallelExecutionResult {
  taskId: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  results: SubTaskResult[];
  totalExecutionTimeMs: number;
  allSuccessful: boolean;
}

const DEFAULT_OPTIONS: ParallelExecutionOptions = {
  maxConcurrency: 3,
  timeoutSeconds: 300,
  continueOnError: true
};

class ParallelExecutor {
  private runningTasks: Map<string, AbortController> = new Map();

  /**
   * 執行多個子任務（平行處理）
   */
  async execute(
    taskId: string,
    subTasks: SubTask[],
    options: Partial<ParallelExecutionOptions> = {}
  ): Promise<ParallelExecutionResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();
    
    console.log(`[ParallelExecutor] 開始執行任務 ${taskId}，共 ${subTasks.length} 個子任務`);

    // 使用 semaphore 控制並發數量
    const semaphore = new Semaphore(opts.maxConcurrency);
    const results: SubTaskResult[] = [];
    
    // 創建所有任務的 Promise
    const taskPromises = subTasks.map(async (subTask) => {
      await semaphore.acquire();
      
      try {
        const result = await this.executeSubTask(subTask, opts);
        results.push(result);
        
        // 如果不允許錯誤且失敗了，取消其他任務
        if (!opts.continueOnError && !result.success) {
          this.cancelAllTasks();
        }
        
        return result;
      } finally {
        semaphore.release();
      }
    });

    // 等待所有任務完成（或超時）
    try {
      await Promise.all(taskPromises);
    } catch (error) {
      console.error('[ParallelExecutor] 執行過程中發生錯誤:', error);
    }

    const totalTime = Date.now() - startTime;
    const completedTasks = results.filter(r => r.success).length;
    const failedTasks = results.filter(r => !r.success).length;

    const finalResult: ParallelExecutionResult = {
      taskId,
      totalTasks: subTasks.length,
      completedTasks,
      failedTasks,
      results,
      totalExecutionTimeMs: totalTime,
      allSuccessful: failedTasks === 0
    };

    console.log(`[ParallelExecutor] 任務 ${taskId} 完成：成功 ${completedTasks}/${subTasks.length}，耗時 ${totalTime}ms`);
    
    return finalResult;
  }

  /**
   * 執行單個子任務
   */
  private async executeSubTask(
    subTask: SubTask,
    options: ParallelExecutionOptions
  ): Promise<SubTaskResult> {
    const startTime = Date.now();
    const abortController = new AbortController();
    this.runningTasks.set(subTask.id, abortController);

    try {
      // 使用 sessions_spawn 啟動子代理
      const spawnResult = await this.spawnSubAgent(subTask, options, abortController.signal);
      
      const executionTime = Date.now() - startTime;
      
      return {
        subTaskId: subTask.id,
        success: true,
        result: spawnResult,
        executionTimeMs: executionTime
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error(`[ParallelExecutor] 子任務 ${subTask.id} 失敗:`, errorMessage);
      
      return {
        subTaskId: subTask.id,
        success: false,
        error: errorMessage,
        executionTimeMs: executionTime
      };
    } finally {
      this.runningTasks.delete(subTask.id);
    }
  }

  /**
   * 啟動子代理執行任務
   */
  private async spawnSubAgent(
    subTask: SubTask,
    options: ParallelExecutionOptions,
    signal: AbortSignal
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`子任務 ${subTask.id} 超時`));
      }, (subTask.timeoutSeconds || options.timeoutSeconds) * 1000);

      // 監聽 abort 信號
      signal.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(new Error(`子任務 ${subTask.id} 被取消`));
      });

      // 呼叫 OpenClaw API 啟動子代理
      sessions_spawn({
        task: subTask.task,
        agentId: subTask.agentId,
        timeoutSeconds: subTask.timeoutSeconds || options.timeoutSeconds,
        model: options.model,
        thinking: options.thinking,
        cleanup: 'delete'
      }).then(result => {
        clearTimeout(timeout);
        if (signal.aborted) {
          reject(new Error(`子任務 ${subTask.id} 被取消`));
        } else {
          resolve(result);
        }
      }).catch(error => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * 取消所有正在執行的任務
   */
  cancelAllTasks(): void {
    console.log(`[ParallelExecutor] 取消所有 ${this.runningTasks.size} 個正在執行的任務`);
    for (const [id, controller] of this.runningTasks) {
      controller.abort();
      console.log(`[ParallelExecutor] 已取消任務 ${id}`);
    }
    this.runningTasks.clear();
  }

  /**
   * 取消特定任務
   */
  cancelTask(taskId: string): boolean {
    const controller = this.runningTasks.get(taskId);
    if (controller) {
      controller.abort();
      this.runningTasks.delete(taskId);
      console.log(`[ParallelExecutor] 已取消任務 ${taskId}`);
      return true;
    }
    return false;
  }

  /**
   * 獲取正在執行的任務數量
   */
  getRunningCount(): number {
    return this.runningTasks.size;
  }

  /**
   * 獲取正在執行的任務 ID 列表
   */
  getRunningTaskIds(): string[] {
    return Array.from(this.runningTasks.keys());
  }
}

/**
 * Semaphore (信號量) - 控制並發數量
 */
class Semaphore {
  private permits: number;
  private queue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }
    
    return new Promise(resolve => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next?.();
    } else {
      this.permits++;
    }
  }
}

// 單例實例
export const parallelExecutor = new ParallelExecutor();

// 輔助函數：快速執行多個子任務
export async function executeParallel(
  taskId: string,
  tasks: string[],
  options?: Partial<ParallelExecutionOptions>
): Promise<ParallelExecutionResult> {
  const subTasks: SubTask[] = tasks.map((task, index) => ({
    id: `${taskId}-sub-${index}`,
    task
  }));
  
  return parallelExecutor.execute(taskId, subTasks, options);
}

/**
 * Mock 的 sessions_spawn 函數（實際使用時會從 openclaw-api 導入）
 */
async function sessions_spawn(options: {
  task: string;
  agentId?: string;
  timeoutSeconds?: number;
  model?: string;
  thinking?: string;
  cleanup?: 'delete' | 'keep';
}): Promise<any> {
  // 這裡會實際呼叫 OpenClaw 的 API
  // 目前是佔位符，實際使用時請從 '../openclaw-api' 導入
  throw new Error('請從 openclaw-api 導入實際的 sessions_spawn 函數');
}

export default ParallelExecutor;
export { ParallelExecutor };
