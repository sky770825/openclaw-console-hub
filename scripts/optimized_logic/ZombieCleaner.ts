/**
 * Zombie Task Cleanup Logic
 * To be called during server bootstrap/initialization
 */
import { db } from '../db'; // Hypothetical DB import

export async function clearZombies() {
    console.log('[Maintenance] Starting zombie task cleanup...');
    try {
        // Mark all 'RUNNING' tasks as 'INTERRUPTED' or 'FAILED' on startup 
        // because the server was likely restarted, and previous in-memory process refs are gone.
        const result = await db.task.updateMany({
            where: {
                status: 'RUNNING'
            },
            data: {
                status: 'FAILED',
                error: 'Server restarted: Task execution interrupted (Zombie Cleanup)',
                updatedAt: new Date()
            }
        });
        console.log(`[Maintenance] Cleaned up ${result.count} zombie tasks.`);
    } catch (error) {
        console.error('[Maintenance] Failed to clear zombies:', error);
    }
}
