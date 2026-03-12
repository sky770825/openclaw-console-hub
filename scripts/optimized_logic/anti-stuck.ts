/**
 * Enhanced Anti-Stuck Mechanism
 * Optimized for performance and persistence recovery
 */
import { db } from '../db';

export class AntiStuckService {
    private monitorMap: Map<string, NodeJS.Timeout> = new Map();

    /**
     * Recovery Logic: Initialize monitoring state from Database
     * Prevents tasks from getting stuck if the server crashes/restarts
     */
    async syncFromDatabase() {
        console.log('[Anti-Stuck] Syncing state from database...');
        const activeTasks = await db.task.findMany({
            where: {
                status: { in: ['RUNNING', 'PENDING'] }
            }
        });

        for (const task of activeTasks) {
            this.registerMonitor(task.id, task.timeout || 300000); // 5 min default
        }
        console.log(`[Anti-Stuck] Restored monitoring for ${activeTasks.length} tasks.`);
    }

    registerMonitor(taskId: string, timeoutMs: number) {
        if (this.monitorMap.has(taskId)) {
            clearTimeout(this.monitorMap.get(taskId)!);
        }

        const timer = setTimeout(async () => {
            await this.handleStuckTask(taskId);
        }, timeoutMs);

        this.monitorMap.set(taskId, timer);
    }

    private async handleStuckTask(taskId: string) {
        console.warn(`[Anti-Stuck] Task ${taskId} detected as STUCK. Triggering recovery...`);
        await db.task.update({
            where: { id: taskId },
            data: { status: 'FAILED', error: 'Task timed out (Anti-Stuck Protection)' }
        });
        this.monitorMap.delete(taskId);
    }

    /**
     * Periodic Full Scan (Safety Net)
     */
    startPeriodicScan(intervalMs: number = 60000) {
        setInterval(() => this.syncFromDatabase(), intervalMs);
    }
}
