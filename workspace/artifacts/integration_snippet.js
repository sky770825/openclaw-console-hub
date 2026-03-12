/**
 * NEUXA Memory Compression Notification Logic
 * 
 * Instructions:
 * Integrate the following function into the Agent Runtime Core where 
 * the memory compression event is handled.
 */

const { exec } = require('child_process');
const path = require('path');

/**
 * Sends a Telegram notification when memory is compressed.
 * @param {number} before - Context usage percentage before compression.
 * @param {number} after - Context usage percentage after compression.
 */
function notifyMemoryCompression(before, after) {
    const scriptPath = '/Users/caijunchang/.openclaw/workspace/sandbox/armory/send-tg-notify.sh';
    const message = `🚀 NEUXA 記憶體壓縮：${before}% -> ${after}%`;
    
    // Command execution
    const cmd = `bash "${scriptPath}" "${message}"`;
    
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`[NEUXA Notify Error]: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`[NEUXA Notify Stderr]: ${stderr}`);
            return;
        }
        console.log('[NEUXA Notify] Telegram message sent successfully.');
    });
}

// Example Trigger:
// if (contextLength > threshold) {
//    const compressed = compress(context);
//    notifyMemoryCompression(85, 40);
// }
