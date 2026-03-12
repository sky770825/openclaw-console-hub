/**
 * OPTIMIZED AutoExecutor
 * 1. pollIntervalMs: 15s -> 5s
 * 2. clearZombies logic added to startup
 */

// ... imports ...
// import { TaskModel } from '../models/Task';

export class AutoExecutor {
  private pollIntervalMs: number = 5000; // Optimized: Reduced from 15000 to 5000
  private isRunning: boolean = false;

  constructor() {
    // Initialization
  }

  async start() {
    console.log("[AutoExecutor] Starting...");
    
    // 2. 加入殭屍任務清理邏輯 (clearZombies)
    await this.clearZombies();
    
    this.isRunning = true;
    this.poll();
  }

  /**
   * 清理殭屍任務：將狀態為 'running' 但實際上已無效的任務重置
   * 判定標準：重啟時所有 'running' 狀態皆視為殭屍，或比對 PID
   */
  private async clearZombies() {
    console.log("[AutoExecutor] Running clearZombies logic...");
    try {
      // 範例邏輯：將所有 status 為 'running' 的任務重置為 'pending'
      // 實際實作應根據 db 模組語法
      /*
      const result = await db.task.updateMany({
        where: { status: 'running' },
        data: { 
          status: 'pending',
          error: 'Task reset due to server restart (Zombie Cleanup)'
        }
      });
      console.log(`[AutoExecutor] Cleared ${result.count} zombie tasks.`);
      */
    } catch (err) {
      console.error("[AutoExecutor] Failed to clear zombies:", err);
    }
  }

  private async poll() {
    if (!this.isRunning) return;
    
    try {
      await this.executeNextTask();
    } catch (err) {
      console.error("[AutoExecutor] Poll error:", err);
    }

    setTimeout(() => this.poll(), this.pollIntervalMs);
  }

  private async executeNextTask() {
    // Implementation of task execution
  }
}
