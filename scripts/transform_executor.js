const fs = require('fs');
const path = require('path');

const sourcePath = process.argv[2];
let code = fs.readFileSync(sourcePath, 'utf8');

// 1. Upgrade maxTasksPerMinute default value to 5
// Look for common patterns like "maxTasksPerMinute = 3" or "maxTasksPerMinute: 3"
code = code.replace(/(maxTasksPerMinute\s*[:=]\s*)3(\b)/g, '$15$2');

// 2. Implement P0 Auto-promotion logic
// We look for where tasks are processed or filtered.
// We search for logic that handles task status and inject our P0 logic there.
const p0Logic = `
    // [P0] Auto-promotion Logic
    if (task.title.includes('[P0]') && (task.risk === 'none' || task.risk === 'low')) {
      if (task.status === 'pending' || task.status === 'todo') {
        task.status = 'ready';
        console.log(\`[Auto-Executor] P0 Task Promoted: \${task.title}\`);
      }
    }
`;

// Try to find a place where tasks are iterated, e.g., tasks.forEach or for (const task of tasks)
if (code.includes('tasks.forEach')) {
    code = code.replace(/(tasks\.forEach\(.*task.*=>\s*\{)/, `$1${p0Logic}`);
} else if (code.includes('for (const task of')) {
    code = code.replace(/(for\s*\(const\s*task\s*of\s*.*\)\s*\{)/, `$1${p0Logic}`);
} else {
    // Fallback: append a helper function if we can't find the loop
    code += `\n/** P0 Promotion Utility **/\nfunction promoteP0Tasks(tasks) { tasks.forEach(task => { ${p0Logic} }); }\n`;
}

// 3. Zombie Task Cleanup
// We look for an 'init' or 'constructor' or 'start' method to inject cleanup.
const zombieCleanupLogic = `
  async cleanupZombieTasks() {
    console.log('[Auto-Executor] Cleaning up zombie tasks...');
    // Logic to find tasks stuck in 'running' and mark as 'failed' or 'ready' for retry
    // This is a placeholder for the actual DB/State update logic
    if (typeof this.tasks !== 'undefined') {
        this.tasks.filter(t => t.status === 'running').forEach(t => {
            t.status = 'ready'; 
            t.error = 'Recovered from zombie state after restart';
        });
    }
  }
`;

if (code.includes('class AutoExecutor')) {
    // Inject method into the class
    code = code.replace(/(class\s+AutoExecutor\s*\{)/, `$1\n${zombieCleanupLogic}`);
    
    // Attempt to call it in constructor or start
    if (code.includes('constructor')) {
        code = code.replace(/(constructor\s*\(.*\)\s*\{)/, `$1\n    this.cleanupZombieTasks();`);
    }
}

fs.writeFileSync(process.argv[3], code);
console.log('Transformation complete.');
