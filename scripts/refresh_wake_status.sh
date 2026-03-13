#!/bin/bash
# refresh_wake_status.sh - Forces a fresh sync from Supabase to WAKE_STATUS.md
set -e

WORKSPACE_ROOT="/Users/sky770825/.openclaw/workspace"
WAKE_STATUS_PATH="$WORKSPACE_ROOT/sandbox/WAKE_STATUS.md"
PROJECT_ROOT="/Users/sky770825/openclaw任務面版設計"

echo "🔄 Initiating Real-time Status Sync..."

# Locate the core status service
STATUS_SERVICE="$PROJECT_ROOT/server/src/services/status-service.ts"

# Identify the project's node executor
RUNNER="npx tsx"

# Implementation strategy: 
# We call the project's internal logic but pass a flag or environment variable to disable cache
# If the project doesn't have a direct CLI, we use a temporary bridge script.

BRIDGE_SCRIPT="/tmp/supabase_sync_bridge.ts"

cat << 'BRIDGE_EOF' > "$BRIDGE_SCRIPT"
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Use environment variables provided by the host system
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase Credentials. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function updateStatus() {
    console.log("📡 Querying Supabase for LIVE task status...");
    
    const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, title, status, updated_at')
        .in('status', ['running', 'pending'])
        .order('updated_at', { ascending: false });

    if (error) {
        console.error("❌ Supabase Query Error:", error.message);
        process.exit(1);
    }

    const running = tasks.filter(t => t.status === 'running');
    const pending = tasks.filter(t => t.status === 'pending');

    let md = `# WAKE_STATUS\n\n`;
    md += `> 💡 Last Synced: ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })} (Real-time)\n\n`;
    
    md += `## 🏃 Running Tasks (${running.length})\n`;
    if (running.length === 0) md += "_No active tasks._\n";
    running.forEach(t => md += `- [${t.id}] **${t.title}**\n`);

    md += `\n## ⏳ Pending Tasks (${pending.length})\n`;
    if (pending.length === 0) md += "_No pending tasks._\n";
    pending.forEach(t => md += `- [${t.id}] ${t.title}\n`);

    fs.writeFileSync('/Users/sky770825/.openclaw/workspace/sandbox/WAKE_STATUS.md', md);
    console.log("✅ WAKE_STATUS.md has been synchronized with Supabase.");
}

updateStatus().catch(err => {
    console.error(err);
    process.exit(1);
});
BRIDGE_EOF

# Run the bridge script
if [ -f "$PROJECT_ROOT/server/package.json" ]; then
    cd "$PROJECT_ROOT/server"
    # Execute using the project's context to ensure dependencies are available
    $RUNNER "$BRIDGE_SCRIPT" || echo "Execution failed. Check environment variables."
else
    echo "Project structure mismatch. Manual check required."
fi
