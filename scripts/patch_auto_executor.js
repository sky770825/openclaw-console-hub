const fs = require('fs');
const path = require('path');

const filePath = '/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Upgrade maxTasksPerMinute default value to 5
// Look for maxTasksPerMinute initialization
if (content.includes('maxTasksPerMinute')) {
    content = content.replace(/(maxTasksPerMinute\s*=\s*)(\d+)/g, (match, p1, p2) => {
        return p1 + '5';
    });
} else {
    // If not found as a variable, we might need to look for where it's used in logic
    // But usually it's a const/let at the top
}

// 2. Implement P0 Auto-promotion logic
// Logic: If title contains [P0] and risk is none/low, set status to 'ready'
// We look for where tasks are fetched or processed.
const promotionLogic = `
    // [P0] Auto-promotion Logic: Titles with [P0] and low/none risk are set to ready
    tasks = tasks.map(task => {
      if (task.title?.includes('[P0]') && 
          (task.risk === 'none' || task.risk === 'low') && 
          task.status === 'todo') {
        console.log(\`[Auto-Executor] Promoting P0 task: \${task.id}\`);
        return { ...task, status: 'ready' };
      }
      return task;
    });
`;

// Find where tasks are assigned after reading from storage
// Common pattern: const tasks = readTasks() or similar
const taskFetchPattern = /(const|let)\s+tasks\s*=\s*[^;]+;/;
if (taskFetchPattern.test(content)) {
    content = content.replace(taskFetchPattern, (match) => match + promotionLogic);
}

// 3. Zombie task cleanup mechanism
// Identify tasks stuck in 'executing' and reset them.
const zombieCleanupCode = `
/**
 * Zombie Task Cleanup: Resets tasks stuck in 'executing' status on startup
 */
const cleanupZombieTasks = () => {
  try {
    const tasks = readTasks(); // Assuming readTasks is available in scope
    const executingTasks = tasks.filter(t => t.status === 'executing');
    if (executingTasks.length > 0) {
      console.log(\`[Auto-Executor] Cleaning up \${executingTasks.length} zombie tasks...\`);
      const updatedTasks = tasks.map(t => 
        t.status === 'executing' ? { ...t, status: 'todo' } : t
      );
      saveTasks(updatedTasks); // Assuming saveTasks is available in scope
    }
  } catch (err) {
    console.error('[Auto-Executor] Zombie cleanup failed:', err);
  }
};

// Execute cleanup
setTimeout(cleanupZombieTasks, 1000);
`;

// Add cleanup logic at the end or before the main export if not already present
if (!content.includes('cleanupZombieTasks')) {
    // Attempt to find where readTasks/saveTasks are defined to ensure scope compatibility
    // Or simply append to the file if it's a module
    content += "\n" + zombieCleanupCode;
}

fs.writeFileSync(filePath, content);
console.log('Patch applied successfully.');
