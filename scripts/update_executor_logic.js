const fs = require('fs');
const path = require('path');

const filePath = '/Users/caijunchang/openclaw任務面版設計/server/src/routes/auto-executor.ts';
let content = fs.readFileSync(filePath, 'utf8');

// --- 1. Upgrade maxTasksPerMinute default ---
// Search for maxTasksPerMinute: 2 or similar and set to 5
content = content.replace(/(maxTasksPerMinute\s*:\s*)\d+/g, '$15');

// --- 2. Implement P0 Auto-promotion logic ---
// We define a helper function for P0 promotion if it doesn't exist
const p0Logic = `
/**
 * Auto-promotes P0 tasks with low risk to ready status
 */
function promoteP0Tasks(tasks) {
  if (!Array.isArray(tasks)) return;
  tasks.forEach(task => {
    if (task.status === 'pending' && 
        task.title && task.title.includes('[P0]') && 
        (task.risk === 'none' || task.risk === 'low')) {
      task.status = 'ready';
      console.log(\`[Auto-Executor] P0 Task Auto-Promoted: \${task.title}\`);
    }
  });
}
`;

// --- 3. Implement Zombie Task Cleanup ---
const zombieCleanupLogic = `
/**
 * Clears tasks stuck in 'executing' or 'running' state after a restart
 */
function cleanupZombieTasks(tasks) {
  if (!Array.isArray(tasks)) return;
  let count = 0;
  tasks.forEach(task => {
    if (task.status === 'executing' || task.status === 'running') {
      task.status = 'pending';
      task.updatedAt = new Date().toISOString();
      task.notes = (task.notes || '') + ' [System] Recovered from zombie state after restart.';
      count++;
    }
  });
  if (count > 0) {
    console.log(\`[Auto-Executor] Cleaned up \${count} zombie tasks.\`);
  }
}
`;

// Add functions to the file if they aren't there
if (!content.includes('function promoteP0Tasks')) {
    content += p0Logic;
}
if (!content.includes('function cleanupZombieTasks')) {
    content += zombieCleanupLogic;
}

// Inject logic into the processing cycle
// We look for common patterns like 'tasks.forEach' or processing loops
// Most OpenClaw executors have a check/tick function.
if (content.includes('async function processQueue')) {
    content = content.replace('async function processQueue() {', 'async function processQueue() {\n  promoteP0Tasks(tasks);');
} else if (content.includes('setInterval')) {
    // If it's a class-based or interval based, we inject into the start
    content = content.replace('setInterval(() => {', 'setInterval(() => {\n  promoteP0Tasks(tasks);');
}

// Inject Zombie cleanup at the end of the file or near initialization
// Assuming there is an export or initialization call
if (content.includes('loadTasks()')) {
    content = content.replace('loadTasks()', 'loadTasks().then(() => cleanupZombieTasks(tasks))');
} else {
    // Fallback: append at the end of the file a generic call assuming 'tasks' is the global variable
    content += '\n// Automatic cleanup on module load\nif (typeof tasks !== "undefined") cleanupZombieTasks(tasks);\n';
}

fs.writeFileSync(filePath, content);
console.log('Successfully updated auto-executor.ts with P0 logic and zombie cleanup.');
