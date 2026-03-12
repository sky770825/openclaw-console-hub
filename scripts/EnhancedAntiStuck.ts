import { db } from '../db';

/**
 * Enhanced AntiStuck Service
 * Requirement 3: DB Recovery & Periodic Full Scan
 */
export class EnhancedAntiStuck {
  private scanIntervalMs: number = 60000; // 1 minute full scan

  constructor() {
    this.startMonitoring();
  }

  /**
   * Periodically scans the database for stuck tasks
   * This provides recovery capability even if in-memory state is lost.
   */
  private startMonitoring() {
    setInterval(async () => {
      await this.performFullScan();
    }, this.scanIntervalMs);
  }

  public async performFullScan() {
    console.log("Performing full scan for stuck tasks...");
    
    // Define threshold (e.g., no update for 5 minutes)
    const timeoutThreshold = new Date(Date.now() - 5 * 60 * 1000);

    const stuckTasks = await db.task.findMany({
      where: {
        status: 'RUNNING',
        updatedAt: { lt: timeoutThreshold }
      }
    });

    if (stuckTasks.length > 0) {
      console.warn(`Found ${stuckTasks.length} stuck tasks. Attempting recovery...`);
      for (const task of stuckTasks) {
        await this.handleStuckTask(task);
      }
    }
  }

  private async handleStuckTask(task: any) {
    // Logic to either resume, restart, or fail the task
    await db.task.update({
      where: { id: task.id },
      data: { 
        status: 'STUCK',
        updatedAt: new Date() 
      }
    });
  }
}
