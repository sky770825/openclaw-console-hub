/**
 * 防卡關機制（超時/重試/降級）
 * - 5 分鐘超時自動取消任務
 * - 失敗重試 2 次機制
 * - 模型降級策略：與 OpenClaw 一致（主力 Gemini → 備援 Claude/Kimi/Ollama）
 * - Telegram 通知
 */

import {
  notifyTaskTimeout,
  notifyTaskRetry,
  notifyModelFallback,
  notifyTaskFailure,
  notifyTaskSuccess,
} from './utils/telegram.js';
import type { Run, Task, RunStatus, TimeoutMonitor, TelegramNotification, ModelFallbackStrategy } from './types.js';
import { updateOpenClawRun } from './openclawSupabase.js';

/** 預設配置 */
const DEFAULT_CONFIG = {
  timeoutMinutes: 5,
  maxRetries: 2,
  fallbackStrategy: 'primary-to-next' as ModelFallbackStrategy,
  notifyOnTimeout: true,
};

/** 防卡關機制管理器 */
export class AntiStuckManager {
  private timeoutMonitors: Map<string, TimeoutMonitor> = new Map();
  private retryCounts: Map<string, number> = new Map();
  private config: typeof DEFAULT_CONFIG;

  constructor(config: Partial<typeof DEFAULT_CONFIG> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 開始監控任務執行
   */
  startMonitoring(run: Run, task: Task): void {
    const runId = run.id;
    
    // 計算超時時間
    const timeoutMinutes = task.timeoutConfig?.timeoutMinutes || this.config.timeoutMinutes;
    const timeoutAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);

    // 設置超時檢查
    const checkInterval = setInterval(async () => {
      await this.checkTimeout(runId, task);
    }, 10000); // 每 10 秒檢查一次

    // 儲存監控器
    this.timeoutMonitors.set(runId, {
      runId,
      taskId: task.id,
      timeoutAt: timeoutAt.toISOString(),
      checkInterval,
    });

    // 初始化重試計數
    if (!this.retryCounts.has(runId)) {
      this.retryCounts.set(runId, 0);
    }
  }

  /**
   * 停止監控
   */
  stopMonitoring(runId: string): void {
    const monitor = this.timeoutMonitors.get(runId);
    if (monitor) {
      clearInterval(monitor.checkInterval);
      this.timeoutMonitors.delete(runId);
    }
  }

  /**
   * 檢查是否超時
   */
  private async checkTimeout(runId: string, task: Task): Promise<boolean> {
    const monitor = this.timeoutMonitors.get(runId);
    if (!monitor) return false;

    const now = new Date();
    const timeoutAt = new Date(monitor.timeoutAt);

    if (now >= timeoutAt) {
      // 超時處理
      await this.handleTimeout(runId, task);
      return true;
    }

    return false;
  }

  /**
   * 處理超時
   */
  private async handleTimeout(runId: string, task: Task): Promise<void> {
    console.log(`[AntiStuck] Run ${runId} timed out, attempting retry...`);

    // 停止監控
    this.stopMonitoring(runId);

    // 嘗試重試
    const canRetry = await this.attemptRetry(runId, task, 'timeout');
    
    if (!canRetry) {
      // 重試次數已用完，標記為超時
      await this.markRunStatus(runId, 'timeout', 'Task execution timed out after maximum retries');
      
      // 發送 Telegram 通知
      if (task.timeoutConfig?.notifyOnTimeout ?? this.config.notifyOnTimeout) {
        await this.sendTimeoutNotification(runId, task);
      }
    }
  }

  /**
   * 嘗試重試
   * @returns true 表示正在重試，false 表示重試次數已用完
   */
  async attemptRetry(runId: string, task: Task, reason: 'timeout' | 'failure'): Promise<boolean> {
    const currentRetries = this.retryCounts.get(runId) || 0;
    const maxRetries = task.timeoutConfig?.maxRetries || this.config.maxRetries;

    if (currentRetries >= maxRetries) {
      console.log(`[AntiStuck] Run ${runId} has exhausted all ${maxRetries} retries`);
      return false;
    }

    // 增加重試計數
    this.retryCounts.set(runId, currentRetries + 1);
    const newRetryCount = currentRetries + 1;

    console.log(`[AntiStuck] Retrying run ${runId} (attempt ${newRetryCount}/${maxRetries})`);

    // 發送重試通知
    await this.sendRetryNotification(runId, task, newRetryCount, maxRetries, reason);

    // 如果是失敗，嘗試模型降級
    if (reason === 'failure' && newRetryCount === maxRetries) {
      const fallbackStrategy = task.timeoutConfig?.fallbackStrategy || this.config.fallbackStrategy;
      if (fallbackStrategy !== 'none') {
        await this.applyModelFallback(runId, task, fallbackStrategy);
      }
    }

    // 標記為重試中
    await this.markRunStatus(runId, 'retrying', `Retry attempt ${newRetryCount}/${maxRetries}`);

    return true;
  }

  /**
   * 應用模型降級策略
   */
  private async applyModelFallback(
    runId: string,
    task: Task,
    strategy: ModelFallbackStrategy
  ): Promise<void> {
    console.log(`[AntiStuck] Applying model fallback for run ${runId}: ${strategy}`);

    let fallbackInfo: { from: string; to: string };

    switch (strategy) {
      case 'primary-to-next':
        // 與 OpenClaw 一致：主力 → 下一備援（Gemini Flash → Claude Haiku → Kimi → Ollama）
        fallbackInfo = { from: 'Gemini Flash', to: 'Claude Haiku / Kimi / Ollama' };
        break;
      case 'claude-to-gemini':
        fallbackInfo = { from: 'Claude', to: 'Gemini Flash' };
        break;
      default:
        console.log(`[AntiStuck] Unknown fallback strategy: ${strategy}`);
        return;
    }

    // 記錄降級資訊
    await this.recordFallback(runId, fallbackInfo.from, fallbackInfo.to, 'Maximum retries reached');

    // 發送降級通知
    await this.sendFallbackNotification(runId, task, fallbackInfo.from, fallbackInfo.to);
  }

  /**
   * 標記 Run 狀態
   */
  private async markRunStatus(runId: string, status: RunStatus, message: string): Promise<void> {
    console.log(`[AntiStuck] Marking run ${runId} as ${status}: ${message}`);

    // Persist to Supabase (when available). If Supabase is not configured, this is a no-op.
    const terminal = status === 'success' || status === 'failed' || status === 'cancelled' || status === 'timeout';
    const now = new Date().toISOString();
    await updateOpenClawRun(runId, {
      status,
      // For terminal states, close the run so reconcile logic can release the task.
      ...(terminal ? { ended_at: now, output_summary: message } : { output_summary: message }),
    }).catch(() => {});
  }

  /**
   * 記錄模型降級
   */
  private async recordFallback(
    runId: string,
    from: string,
    to: string,
    reason: string
  ): Promise<void> {
    const fallbackRecord = {
      from,
      to,
      reason,
      timestamp: new Date().toISOString(),
    };

    console.log(`[AntiStuck] Fallback recorded for run ${runId}:`, fallbackRecord);

    // TODO: 實作資料庫更新
    // await updateRunInDatabase(runId, { 
    //   fallbackHistory: [...existingFallbacks, fallbackRecord]
    // });
  }

  // ==================== Telegram 通知 ====================

  /**
   * 發送超時通知
   */
  private async sendTimeoutNotification(runId: string, task: Task): Promise<void> {
    await notifyTaskTimeout(
      task.name,
      task.id,
      runId,
      task.timeoutConfig?.timeoutMinutes || this.config.timeoutMinutes
    );
  }

  /**
   * 發送重試通知
   */
  private async sendRetryNotification(
    runId: string,
    task: Task,
    currentRetry: number,
    maxRetries: number,
    reason: 'timeout' | 'failure'
  ): Promise<void> {
    await notifyTaskRetry(
      task.name,
      task.id,
      runId,
      currentRetry,
      maxRetries,
      reason === 'timeout' ? '執行超時' : '執行失敗'
    );
  }

  /**
   * 發送降級通知
   */
  private async sendFallbackNotification(
    runId: string,
    task: Task,
    from: string,
    to: string
  ): Promise<void> {
    await notifyModelFallback(
      task.name,
      task.id,
      runId,
      from,
      to
    );
  }

  /**
   * 發送任務失敗通知
   */
  async sendFailureNotification(run: Run, task: Task, error: string): Promise<void> {
    await notifyTaskFailure(
      task.name,
      task.id,
      run.id,
      error,
      run.retryCount || 0
    );
  }

  /**
   * 發送任務成功通知（可選）
   */
  async sendSuccessNotification(run: Run, task: Task): Promise<void> {
    await notifyTaskSuccess(
      task.name,
      task.id,
      run.id,
      run.durationMs
    );
  }

  // ==================== 公共 API ====================

  /**
   * 獲取監控狀態
   */
  getMonitoringStatus(): {
    activeMonitors: number;
    monitoredRuns: string[];
  } {
    return {
      activeMonitors: this.timeoutMonitors.size,
      monitoredRuns: Array.from(this.timeoutMonitors.keys()),
    };
  }

  /**
   * 獲取重試計數
   */
  getRetryCount(runId: string): number {
    return this.retryCounts.get(runId) || 0;
  }

  /**
   * 重置重試計數
   */
  resetRetryCount(runId: string): void {
    this.retryCounts.delete(runId);
  }

  /**
   * 清理所有監控
   */
  cleanup(): void {
    for (const [runId, monitor] of this.timeoutMonitors) {
      clearInterval(monitor.checkInterval);
      console.log(`[AntiStuck] Cleaned up monitor for run ${runId}`);
    }
    this.timeoutMonitors.clear();
    this.retryCounts.clear();
  }
}

/** 重試裝飾器 */
export function withRetry<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: {
    maxRetries?: number;
    onRetry?: (attempt: number, error: Error) => void | Promise<void>;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): (...args: TArgs) => Promise<TResult> {
  const { maxRetries = 2, onRetry, shouldRetry } = options;

  return async (...args: TArgs): Promise<TResult> => {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxRetries) {
          throw lastError;
        }

        if (shouldRetry && !shouldRetry(lastError)) {
          throw lastError;
        }

        if (onRetry) {
          await onRetry(attempt + 1, lastError);
        }

        // 指數退避
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  };
}

/** 超時包裝器 */
export function withTimeout<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  timeoutMs: number
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    return new Promise<TResult>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      fn(...args)
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  };
}

/** 導出單例 */
export const antiStuckManager = new AntiStuckManager();

export { DEFAULT_CONFIG };
