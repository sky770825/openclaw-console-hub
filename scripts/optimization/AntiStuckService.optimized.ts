/**
 * Optimized AntiStuck Logic
 * 1. Periodic full scanning of database
 * 2. Recovery logic for monitoring state
 */

import { TaskModel } from '../models/Task';
import { Logger } from '../utils/logger';

export class AntiStuckService {
  private checkIntervalMs: number = 300000; // 5 minutes

  /**
   * Task 3: Full Scan & Recovery
   * Scans the database for tasks that are marked as processing but have no activity.
   */
  public async performFullScan(): Promise<void> {
    Logger.info('Performing full anti-stuck scan...');
    
    const stuckThreshold = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes
    
    try {
      const stuckTasks = await TaskModel.find({
        status: { $in: ['RUNNING', 'PENDING'] },
        updatedAt: { $lt: stuckThreshold }
      });

      for (const task of stuckTasks) {
        Logger.warn(`AntiStuck: Found stuck task ${task._id}. Attempting recovery...`);
        // Logic to either restart the task or fail it
        await this.handleStuckTask(task);
      }
    } catch (error) {
      Logger.error('AntiStuck full scan failed:', error);
    }
  }

  private async handleStuckTask(task: any) {
    // If it's a critical task, we might reset it to PENDING
    // Otherwise, mark as FAILED
    task.status = 'FAILED';
    task.error = 'Task timed out (Anti-Stuck detection)';
    await task.save();
  }

  public start() {
    // Initial recovery scan on service start
    this.performFullScan();
    
    // Regular interval scanning
    setInterval(() => {
      this.performFullScan();
    }, this.checkIntervalMs);
  }
}
