const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];
let content = fs.readFileSync(filePath, 'utf8');

// 1. Upgrade maxTasksPerMinute default value to 5
// Look for assignments or definitions: maxTasksPerMinute = 1 or maxTasksPerMinute: 1
content = content.replace(/(maxTasksPerMinute\s*[:=]\s*)(\d+)/g, (match, p1, p2) => {
    return p1 + "5";
});

// 2. Implement automatic promotion logic: [P0] + risk none/low -> ready
// We look for the part where tasks are being processed or polled.
// We'll inject a helper function or add logic inside the loop if found.
const promotionLogic = `
    // [P0] Auto-promotion logic
    if (task.title.includes('[P0]') && (task.risk === 'none' || task.risk === 'low') && task.status === 'pending') {
      console.log(\`[Auto-Executor] Promoting P0 task: \${task.id}\`);
      task.status = 'ready';
    }
`;

// Try to find a logical place to insert - typically inside a map or forEach loop over tasks
if (content.includes('tasks.forEach') || content.includes('for (const task of')) {
    content = content.replace(/(tasks\.forEach\(task => \{|for\s*\(const task of tasks\)\s*\{)/, (match) => {
        return match + promotionLogic;
    });
} else {
    // If we can't find a loop, we'll append a comment suggesting where it should be or try a broader match
    console.log("Warning: Could not find clear task loop for P0 logic insertion. Attempting broad insertion near status checks.");
    content = content.replace(/(if\s*\(task\.status\s*===\s*['"]pending['"]\)\s*\{)/, (match) => {
        return promotionLogic + "\n    " + match;
    });
}

// 3. Add zombie task cleanup mechanism
// Usually placed at the end of the file or near an init/start function.
const zombieCleanupLogic = `
/**
 * Zombie Task Cleanup
 * Clears tasks stuck in 'executing' status on system restart
 */
async function cleanupZombieTasks(db) {
  try {
    const result = await db.collection('tasks').updateMany(
      { status: 'executing' },
      { $set: { status: 'pending', updatedAt: new Date() } }
    );
    if (result.modifiedCount > 0) {
      console.log(\`[Auto-Executor] Cleaned up \${result.modifiedCount} zombie tasks.\`);
    }
  } catch (err) {
    console.error('[Auto-Executor] Zombie cleanup failed:', err);
  }
}
`;

// Inject cleanup logic before the main export or at the end
if (!content.includes('cleanupZombieTasks')) {
    content += "\n" + zombieCleanupLogic;
    
    // Attempt to find an initialization block to call it
    if (content.includes('async function init') || content.includes('const start = async')) {
        content = content.replace(/(async function init\(.*?\)\s*\{|const start = async\s*\(.*?\)\s*=>\s*\{)/, (match) => {
            return match + "\n  await cleanupZombieTasks(db);";
        });
    } else {
        // Fallback: just append a startup call if db is likely global or available
        content += "\n// Auto-run cleanup if DB is available\nif (typeof db !== 'undefined') cleanupZombieTasks(db);\n";
    }
}

fs.writeFileSync(filePath, content);
console.log("Successfully modified auto-executor.ts");
