const fs = require('fs');
const path = require('path');

function patchSupabase(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Vulnerability 2: insertOpenClawRun and updateOpenClawRun error handling + retry
    // Defining a reusable retry helper for Supabase within the file or using local scope
    const retrySnippet = `
async function withRetry<T>(fn: () => Promise<{ data: T | null, error: any }>, retries = 3): Promise<T | null> {
  let lastError = null;
  for (let i = 0; i < retries; i++) {
    try {
      const { data, error } = await fn();
      if (error) {
        lastError = error;
        console.error(\`[Supabase Attempt \${i + 1}] Error:\`, error);
        await new Promise(res => setTimeout(res, 1000 * (i + 1)));
        continue;
      }
      return data;
    } catch (e) {
      lastError = e;
      await new Promise(res => setTimeout(res, 1000 * (i + 1)));
    }
  }
  console.error('[Supabase] Max retries reached. Final Error:', lastError);
  // Circuit breaker logic: could throw or signal system health here
  return null;
}
`;

    // Add retry helper if not exists
    if (!content.includes('async function withRetry')) {
        content = content.replace('export async function insertOpenClawRun', retrySnippet + '\nexport async function insertOpenClawRun');
    }

    // Replace insertOpenClawRun
    const insertRegex = /export async function insertOpenClawRun\([\s\S]*?\}\n\}/;
    const newInsert = `export async function insertOpenClawRun(run: Partial<OpenClawRunRow>): Promise<OpenClawRunRow | null> {
  return withRetry(async () => {
    return await supabaseServiceRole.from(TABLE_RUNS).insert(run as Record<string, unknown>).select().single();
  });
}`;
    content = content.replace(insertRegex, newInsert);

    // Replace updateOpenClawRun (assuming similar pattern exists)
    const updateRegex = /export async function updateOpenClawRun\(id: string, updates: Partial<OpenClawRunRow>\): Promise<OpenClawRunRow | null> \{[\s\S]*?\}\n\}/;
    const newUpdate = `export async function updateOpenClawRun(id: string, updates: Partial<OpenClawRunRow>): Promise<OpenClawRunRow | null> {
  return withRetry(async () => {
    return await supabaseServiceRole.from(TABLE_RUNS).update(updates as Record<string, unknown>).eq('id', id).select().single();
  });
}`;
    if (content.match(updateRegex)) {
        content = content.replace(updateRegex, newUpdate);
    }

    fs.writeFileSync(filePath, content);
    console.log('Successfully patched openclawSupabase.ts');
}

function patchExecutor(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Vulnerability 1: Race conditions in pendingReviews
    // We'll use a local 'processingIds' Set to lock tasks during the async gap of the poll loop.
    if (!content.includes('const processingIds = new Set<string>();')) {
        content = content.replace('let pendingReviews', 'const processingIds = new Set<string>();\nlet pendingReviews');
    }

    // Inject logic to check processingIds before pushing to pendingReviews
    // Find where tasks are pushed to pendingReviews
    content = content.replace(
        /if \(!pendingReviews\.find\(r => r\.taskId === (.*?)\)\) \{(\s+)pendingReviews\.push/g,
        'if (!pendingReviews.find(r => r.taskId === $1) && !processingIds.has($1)) {\n      processingIds.add($1);\n$2pendingReviews.push'
    );

    // Ensure processingIds are cleared when pendingReviews is cleared
    content = content.replace('pendingReviews = [];', 'pendingReviews = [];\n  processingIds.clear();');

    // Vulnerability 3: Fix status machine error (queued -> ready)
    // Looking for the specific line 753 pattern: upsertOpenClawTask({ status: 'queued', ... })
    // We change it to 'ready' so AutoExecutor can pick it up again.
    const failurePattern = /upsertOpenClawTask\(\{\s+status: 'queued',/g;
    content = content.replace(failurePattern, "upsertOpenClawTask({\n      status: 'ready',");

    // Also handle specific code snippet if exactly matched
    content = content.replace(/status: 'queued', \/\/ 失敗後重回隊列/g, "status: 'ready', // 修正：設為 ready 以便 AutoExecutor 重新抓取");

    fs.writeFileSync(filePath, content);
    console.log('Successfully patched auto-executor.ts');
}

try {
    const supabasePath = process.argv[2];
    const executorPath = process.argv[3];
    patchSupabase(supabasePath);
    patchExecutor(executorPath);
} catch (err) {
    console.error('Patching failed:', err);
    process.exit(1);
}
