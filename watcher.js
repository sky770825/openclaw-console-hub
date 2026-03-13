// watcher.js
const fs = require('fs');
const path = require('path');

const WORKSPACE_DIR = '/Users/sky770825/.openclaw/workspace';
const CORE_FILES = [
  'OMEGA_LOG.md',
  'AGENTS.md',
  'MEMORY.md',
  'projects/l2_sandbox/mission.json'
];

console.log('🚀 Mirror Protocol Activated. Initializing Watcher...');
console.log(`Watching directory: ${WORKSPACE_DIR}`);
console.log('------------------------------------');

const watchers = new Map();

function setupWatcher(filePath) {
  try {
    // Check if watcher for this file already exists
    if (watchers.has(filePath)) {
      return;
    }

    const watcher = fs.watch(filePath, (eventType, filename) => {
      if (eventType === 'change') {
        console.log(`[${new Date().toISOString()}] DETECTED CHANGE in ${filename || path.basename(filePath)}.`);
        console.log('>>> TRIGGERING SELF-RESYNCHRONIZATION <<<');
        // In a real OpenClaw environment, this would trigger an internal event
        // to force the agent to re-read the file into its context.
        // For this simulation, we just log it.
      }
    });

    watcher.on('error', (error) => {
      console.error(`Error watching file ${filePath}:`, error);
      // If the file is deleted and re-created, the watcher might fail. We should try to re-establish it.
      watchers.delete(filePath);
      setTimeout(() => setupWatcher(filePath), 5000); // Retry after 5 seconds
    });
    
    watchers.set(filePath, watcher);
    console.log(`[OK] Now watching: ${path.basename(filePath)}`);

  } catch (error) {
    console.error(`Failed to set up watcher for ${filePath}:`, error.code);
  }
}

CORE_FILES.forEach(file => {
  const fullPath = path.join(WORKSPACE_DIR, file);
  setupWatcher(fullPath);
});

// Also watch the skills directory for new skills
const SKILLS_DIR = path.join(WORKSPACE_DIR, 'skills');
fs.watch(SKILLS_DIR, { recursive: true }, (eventType, filename) => {
   if (filename && (eventType === 'rename' || eventType === 'change')) {
     console.log(`[${new Date().toISOString()}] DETECTED CHANGE in skills directory: ${filename}.`);
     console.log('>>> TRIGGERING SKILL RE-INDEXING <<<');
   }
});
console.log(`[OK] Now watching for new skills in: ${SKILLS_DIR}`);


// Keep the process alive
setInterval(() => {
  // Check if any watchers have died and try to restart them
  CORE_FILES.forEach(file => {
    const fullPath = path.join(WORKSPACE_DIR, file);
    if (!watchers.has(fullPath)) {
      console.log(`[INFO] Watcher for ${path.basename(fullPath)} seems to be down. Attempting to restart...`);
      setupWatcher(fullPath);
    }
  });
}, 60000); // Check every minute
