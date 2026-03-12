const fs = require('fs');
const path = require('path');

const targetFile = '/Users/caijunchang/openclaw任務面版設計/server/src/routes/auto-executor.ts';

if (!fs.existsSync(targetFile)) {
    console.error(`Error: ${targetFile} not found.`);
    process.exit(1);
}

let content = fs.readFileSync(targetFile, 'utf8');

// 1. Upgrade maxTasksPerMinute to 5
// Handles both 'maxTasksPerMinute: 1' and 'maxTasksPerMinute = 1'
const oldMax = content.match(/maxTasksPerMinute\s*[:=]\s*(\d+)/);
if (oldMax) {
    console.log(`Updating maxTasksPerMinute from ${oldMax[1]} to 5`);
    content = content.replace(/(maxTasksPerMinute\s*[:=]\s*)\d+/g, '$15');
} else {
    // If not found, look for where it might be defined or just skip if it's dynamic
    console.log('maxTasksPerMinute not found with simple regex, attempting fallback...');
    content = content.replace(/(let|const|var)\s+maxTasksPerMinute\s*=\s*\d+/g, '$1 maxTasksPerMinute = 5');
}

// 2. Zombie Task Cleanup Logic
// We want to reset tasks stuck in 'executing' to 'ready' on startup
if (!content.includes('Zombie task cleanup')) {
    console.log('Injecting zombie task cleanup logic...');
    
    // Identify the DB access pattern (e.g., prisma.task or db.task)
    const dbMatch = content.match(/(db|prisma|Task)\.task/i) || ['db'];
    const dbVar = dbMatch[1] || 'db';
    
    const cleanupCode = `
  // [Auto-Executor] Zombie task cleanup: Reset tasks stuck in 'executing' on restart
  try {
    await ${dbVar}.task.updateMany({
      where: { status: 'executing' },
      data: { status: 'ready' }
    });
    console.log('[Auto-Executor] Cleaned up zombie tasks.');
  } catch (err) {
    console.error('[Auto-Executor] Zombie cleanup failed:', err);
  }
`;

    // Inject into startAutoExecutor or similar entry point
    if (content.includes('async function startAutoExecutor')) {
        content = content.replace(/(async function startAutoExecutor.*{)/, `$1${cleanupCode}`);
    } else if (content.includes('export const start')) {
        content = content.replace(/(export const start = .*?{)/, `$1${cleanupCode}`);
    } else {
        // Fallback: inject at the end of the file or near exports
        content = content.replace(/(export default)/, `${cleanupCode}\n$1`);
    }
}

// 3. P0 Automatic Promotion Logic
if (!content.includes('P0 Auto-promotion')) {
    console.log('Injecting P0 auto-promotion logic...');
    
    const p0Code = `
    // [Auto-Executor] P0 Auto-promotion: [P0] + low/none risk -> ready
    tasks = tasks.map(task => {
      if (task.title?.includes('[P0]') && (task.risk === 'none' || task.risk === 'low') && task.status === 'pending') {
        return { ...task, status: 'ready' };
      }
      return task;
    });
`;

    // Inject where tasks are fetched or processed
    if (content.includes('tasks.map')) {
        // Try to find the line where tasks are assigned after fetching
        content = content.replace(/(const tasks = await.*?;)/, `$1${p0Code}`);
    } else if (content.includes('for (const task of tasks)')) {
        content = content.replace(/(for \(const task of tasks\)\s*{)/, `$1\n      if (task.title?.includes('[P0]') && (task.risk === 'none' || task.risk === 'low')) task.status = 'ready';`);
    }
}

fs.writeFileSync(targetFile, content);
console.log('Successfully patched auto-executor.ts');
