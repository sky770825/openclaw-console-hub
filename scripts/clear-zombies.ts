import { db } from './db';
import { logger } from './logger';

/**
 * Requirement 2: clearZombies logic
 * To be called during server bootstrap.
 */
export async function clearZombies() {
  logger.info('Cleaning up zombie tasks from previous session...');
  
  // Mark all tasks that were 'running' during shutdown as 'failed' or 'interrupted'
  const result = await db.task.updateMany({
    where: { 
      status: 'running'
    },
    data: { 
      status: 'failed',
      error: 'System restart: Task interrupted (Zombie Cleanup)'
    }
  });

  logger.info(`Cleared ${result.count} zombie tasks.`);
}
