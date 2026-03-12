/**
 * Watchdog (看門狗健康監控)
 * 定期檢查任務健康狀態，自動處理卡住任務
 */

export interface WatchdogConfig {
  checkIntervalMs: number;       // 檢查間隔 (預設 30 秒)
  stuckThresholdMs: number;      // 卡住閾值 (預設 5 分鐘)
  maxRetries: number;            // 最大重試次數
  autoKillStuck: boolean;        // 自動終止卡住任務
  notifyOnStuck: boolean;        // 卡住時發送通知
}

export interface MonitoredTask {
  taskId: string;
  runId: string;
  agentId: string;
  startTime: number;
  lastHeartbeat: number;
  status: 'running' | 'stuck' | 'killed' | 'completed';
  killAttempts: number;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'critical';
  totalTasks: number;
  runningTasks: number;
  stuckTasks: number;
  killedTasks: number;
  averageExecutionTime: number;
  lastCheckTime: number;
}

export interface WatchdogAlert {
  type: 'stuck_detected' | 'task_killed' | 'system_degraded' | 'system_critical';
  taskId?: string;
  runId?: string;
  agentId?: string;
  message: string;
  timestamp: number;
  details?: any;
}

const DEFAULT_CONFIG: WatchdogConfig = {
  checkIntervalMs: 30 * 1000,    // 30 秒
  stuckThresholdMs: 5 * 60 * 1000, // 5 分鐘
  maxRetries: 2,
  autoKillStuck: true,
  notifyOnStuck: true
};

class Watchdog {
  private config: WatchdogConfig;
  private tasks: Map<string, MonitoredTask> = new Map();
  private timer: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;
  private alertHandlers: Array<(alert: WatchdogAlert) => void> = [];
  private healthHistory: HealthStatus[] = [];
  private maxHistorySize: number = 100;

  constructor(config: Partial<WatchdogConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 啟動看門狗
   */
  start(): void {
    if (this.isRunning) {
      console.log('[Watchdog] 已經在運行中');
      return;
    }

    this.isRunning = true;
    console.log('[Watchdog] 已啟動，檢查間隔:', this.config.checkIntervalMs, 'ms');

    // 立即執行一次檢查
    this.check();

    // 定時檢查
    this.timer = setInterval(() => {
      this.check();
    }, this.config.checkIntervalMs);
  }

  /**
   * 停止看門狗
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('[Watchdog] 已停止');
  }

  /**
   * 註冊新任務
   */
  registerTask(taskId: string, runId: string, agentId: string): void {
    const now = Date.now();
    const task: MonitoredTask = {
      taskId,
      runId,
      agentId,
      startTime: now,
      lastHeartbeat: now,
      status: 'running',
      killAttempts: 0
    };
    
    this.tasks.set(runId, task);
    console.log(`[Watchdog] 註冊任務: ${taskId} (runId: ${runId}, agent: ${agentId})`);
  }

  /**
   * 更新任務心跳
   */
  heartbeat(runId: string): void {
    const task = this.tasks.get(runId);
    if (task && task.status === 'running') {
      task.lastHeartbeat = Date.now();
    }
  }

  /**
   * 標記任務完成
   */
  completeTask(runId: string): void {
    const task = this.tasks.get(runId);
    if (task) {
      task.status = 'completed';
      console.log(`[Watchdog] 任務完成: ${task.taskId} (runId: ${runId})`);
      
      // 延遲清理完成的任務
      setTimeout(() => {
        this.tasks.delete(runId);
      }, 60000); // 1 分鐘後清理
    }
  }

  /**
   * 強制終止任務
   */
  async killTask(runId: string, reason: string = '手動終止'): Promise<boolean> {
    const task = this.tasks.get(runId);
    if (!task) return false;

    console.log(`[Watchdog] 終止任務: ${task.taskId} (原因: ${reason})`);
    
    task.status = 'killed';
    task.killAttempts++;

    // 發送警報
    this.emitAlert({
      type: 'task_killed',
      taskId: task.taskId,
      runId: task.runId,
      agentId: task.agentId,
      message: `任務 ${task.taskId} 被終止: ${reason}`,
      timestamp: Date.now(),
      details: { reason, killAttempts: task.killAttempts }
    });

    // 這裡可以呼叫實際的終止 API
    try {
      await this.performKill(task);
      return true;
    } catch (error) {
      console.error(`[Watchdog] 終止任務 ${runId} 失敗:`, error);
      return false;
    }
  }

  /**
   * 獲取健康狀態
   */
  getHealthStatus(): HealthStatus {
    const now = Date.now();
    const allTasks = Array.from(this.tasks.values());
    
    const runningTasks = allTasks.filter(t => t.status === 'running');
    const stuckTasks = allTasks.filter(t => t.status === 'stuck');
    const killedTasks = allTasks.filter(t => t.status === 'killed');
    
    // 計算平均執行時間
    const completedTasks = allTasks.filter(t => t.status === 'completed');
    const avgTime = completedTasks.length > 0
      ? completedTasks.reduce((sum, t) => sum + (t.lastHeartbeat - t.startTime), 0) / completedTasks.length
      : 0;

    // 判斷系統狀態
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (stuckTasks.length > 5) {
      status = 'critical';
    } else if (stuckTasks.length > 0 || killedTasks.length > 3) {
      status = 'degraded';
    }

    const healthStatus: HealthStatus = {
      status,
      totalTasks: allTasks.length,
      runningTasks: runningTasks.length,
      stuckTasks: stuckTasks.length,
      killedTasks: killedTasks.length,
      averageExecutionTime: avgTime,
      lastCheckTime: now
    };

    return healthStatus;
  }

  /**
   * 獲取健康歷史
   */
  getHealthHistory(): HealthStatus[] {
    return [...this.healthHistory];
  }

  /**
   * 獲取所有任務
   */
  getAllTasks(): MonitoredTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 獲取卡住任務
   */
  getStuckTasks(): MonitoredTask[] {
    return Array.from(this.tasks.values()).filter(t => t.status === 'stuck');
  }

  /**
   * 註冊警報處理器
   */
  onAlert(handler: (alert: WatchdogAlert) => void): void {
    this.alertHandlers.push(handler);
  }

  /**
   * 移除警報處理器
   */
  offAlert(handler: (alert: WatchdogAlert) => void): void {
    const index = this.alertHandlers.indexOf(handler);
    if (index > -1) {
      this.alertHandlers.splice(index, 1);
    }
  }

  /**
   * 執行健康檢查
   */
  private check(): void {
    const now = Date.now();
    console.log('[Watchdog] 執行健康檢查...');

    for (const [runId, task] of this.tasks) {
      if (task.status !== 'running') continue;

      const idleTime = now - task.lastHeartbeat;
      
      if (idleTime > this.config.stuckThresholdMs) {
        // 檢測到卡住任務
        console.log(`[Watchdog] 檢測到卡住任務: ${task.taskId} (閒置 ${Math.round(idleTime / 1000)} 秒)`);
        
        task.status = 'stuck';
        
        // 發送警報
        this.emitAlert({
          type: 'stuck_detected',
          taskId: task.taskId,
          runId: task.runId,
          agentId: task.agentId,
          message: `任務 ${task.taskId} 已卡住 ${Math.round(idleTime / 1000)} 秒`,
          timestamp: now,
          details: { idleTime, threshold: this.config.stuckThresholdMs }
        });

        // 自動終止
        if (this.config.autoKillStuck) {
          this.killTask(runId, '自動終止（卡住超過閾值）');
        }
      }
    }

    // 記錄健康狀態
    const healthStatus = this.getHealthStatus();
    this.healthHistory.push(healthStatus);
    
    // 限制歷史記錄大小
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory.shift();
    }

    // 系統狀態警報
    if (healthStatus.status === 'critical') {
      this.emitAlert({
        type: 'system_critical',
        message: `系統處於嚴重狀態：${healthStatus.stuckTasks} 個卡住任務`,
        timestamp: now,
        details: healthStatus
      });
    } else if (healthStatus.status === 'degraded') {
      this.emitAlert({
        type: 'system_degraded',
        message: `系統性能下降：${healthStatus.stuckTasks} 個卡住任務`,
        timestamp: now,
        details: healthStatus
      });
    }

    console.log(`[Watchdog] 檢查完成: ${healthStatus.runningTasks} 運行中, ${healthStatus.stuckTasks} 卡住, ${healthStatus.killedTasks} 已終止`);
  }

  /**
   * 發送警報
   */
  private emitAlert(alert: WatchdogAlert): void {
    console.log(`[Watchdog] 🚨 警報: ${alert.message}`);
    
    for (const handler of this.alertHandlers) {
      try {
        handler(alert);
      } catch (error) {
        console.error('[Watchdog] 警報處理器錯誤:', error);
      }
    }
  }

  /**
   * 執行實際終止操作（需實現）
   */
  private async performKill(task: MonitoredTask): Promise<void> {
    // 這裡需要實現實際的終止邏輯
    // 例如呼叫 process.kill() 或發送終止請求到 OpenClaw
    console.log(`[Watchdog] 執行終止: ${task.taskId}`);
    
    // TODO: 實現實際的終止邏輯
    // 例如：
    // await fetch(`http://localhost:3011/api/runs/${task.runId}/kill`, { method: 'POST' });
  }
}

// 單例實例
export const watchdog = new Watchdog();

// 輔助函數：創建 Telegram 通知處理器
export function createTelegramNotifier(
  sendMessage: (message: string) => Promise<void>
): (alert: WatchdogAlert) => void {
  return (alert: WatchdogAlert) => {
    const emoji = alert.type === 'stuck_detected' ? '⚠️' : 
                  alert.type === 'task_killed' ? '🛑' : 
                  alert.type === 'system_critical' ? '🔴' : '🟡';
    
    const message = `${emoji} *Watchdog 警報*\n\n` +
      `類型: ${alert.type}\n` +
      `時間: ${new Date(alert.timestamp).toLocaleString('zh-TW')}\n` +
      `訊息: ${alert.message}`;
    
    sendMessage(message).catch(console.error);
  };
}

// 輔助函數：創建日誌處理器
export function createLogNotifier(): (alert: WatchdogAlert) => void {
  return (alert: WatchdogAlert) => {
    console.log(`[WatchdogNotifier] ${alert.type}: ${alert.message}`);
  };
}

export default Watchdog;
export { Watchdog };
