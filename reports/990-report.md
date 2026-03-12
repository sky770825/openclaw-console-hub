[990 Lite] 開始掃描：/Users/caijunchang/openclaw任務面版設計/server/src

⚠️  共發現 195 個問題：HIGH=2 MED=193 LOW=0

🔴 [CommandGuard] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:1030
   output: `🚫 pty_exec 危險指令攔截（${dangerous.source}）。git push/force、rm -rf、sudo 等一律禁止。`,

🔴 [CommandGuard] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/security.ts:24
   'rm -rf /', 'rm -rf ~', 'rm -rf *',

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:16
   const SUBSCRIPTION_ONLY_MODE = process.env.OPENCLAW_SUBSCRIPTION_ONLY !== 'false';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:19
   const ENHANCED_PATH = `/Users/caijunchang/.local/bin:/opt/homebrew/bin:${process.env.PATH || '/usr/local/bin:/usr/bin:/b

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:21
   const env = { ...process.env, PATH: ENHANCED_PATH };

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:31
   HOME: process.env.HOME || '',

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:32
   USER: process.env.USER || '',

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:33
   SHELL: process.env.SHELL || '/bin/sh',

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:34
   LANG: process.env.LANG || 'en_US.UTF-8',

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:35
   TERM: process.env.TERM || 'xterm-256color',

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:36
   NODE_ENV: process.env.NODE_ENV || 'production',

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:37
   TMPDIR: process.env.TMPDIR || '/tmp',

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:42
   process.env.HOME || '/tmp',

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:48
   const WORKSPACE_ROOT = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace');

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:63
   '.env', 'openclaw.json', 'SOUL.md', 'AWAKENING.md', 'IDENTITY.md',

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:893
   const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:1003
   const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:1027
   - Do NOT access or modify .env, openclaw.json, sessions.json, config.json (API keys)

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:1048
   - Do NOT access or modify .env, openclaw.json, sessions.json, config.json (API keys)

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:1089
   - Do NOT access or modify .env files

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:1122
   - Do NOT access or modify .env files

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:1159
   const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:1441
   `限制：不動 .env、secrets、SOUL.md 等靈魂文件、不 push git。`,

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/governanceEngine.ts:308
   PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/governanceEngine.ts:309
   HOME: process.env.HOME || '',

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/governanceEngine.ts:310
   USER: process.env.USER || '',

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/governanceEngine.ts:311
   SHELL: process.env.SHELL || '/bin/sh',

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/governanceEngine.ts:312
   NODE_ENV: process.env.NODE_ENV || 'production',

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/governanceEngine.ts:313
   TMPDIR: process.env.TMPDIR || '/tmp',

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/taskCompliance.ts:130
   const envExample = path.join(projectDir, '.env.example');

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/openclawSupabase.ts:5
   dotenv.config({ path: '.env.local' as string }); // 確保載入 .env.local

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/openclawSupabase.ts:7
   const supabaseUrl = process.env.SUPABASE_URL;

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/openclawSupabase.ts:8
   const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/openclawSupabase.ts:9
   const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/logger.ts:7
   const isDev = process.env.NODE_ENV !== 'production';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/logger.ts:27
   level: process.env.LOG_LEVEL || 'info',

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/logger.ts:33
   level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/preload-dotenv.ts:2
   * 必須最先載入，讓 .env 在 supabase / 其他模組讀 process.env 前就生效

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/preload-dotenv.ts:11
   dotenv.config({ path: path.join(projectRoot, '.env'), override: true });

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/preload-dotenv.ts:12
   dotenv.config({ path: path.resolve(process.cwd(), '../.env'), override: true });

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/preload-dotenv.ts:13
   dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/n8nClient.ts:7
   const url = process.env.N8N_API_URL?.replace(/\/$/, '');

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/n8nClient.ts:8
   const key = process.env.N8N_API_KEY;

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:153
   if (process.env.OPENCLAW_TRUST_PROXY === 'true') {

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:292
   const OPENCLAW_API_KEY = process.env.OPENCLAW_API_KEY?.trim();

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:294
   process.env.OPENCLAW_ENFORCE_WRITE_AUTH !== 'false';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:296
   process.env.OPENCLAW_ENFORCE_READ_AUTH === 'true';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:297
   const OPENCLAW_READ_KEY = process.env.OPENCLAW_READ_KEY?.trim();

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:298
   const OPENCLAW_WRITE_KEY = process.env.OPENCLAW_WRITE_KEY?.trim();

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:299
   const OPENCLAW_ADMIN_KEY = process.env.OPENCLAW_ADMIN_KEY?.trim();

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:302
   const allowlistEnv = process.env.N8N_WEBHOOK_ALLOWLIST;

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:309
   for (const source of [process.env.N8N_API_URL, process.env.N8N_WEBHOOK_RUN_NEXT]) {

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:432
   const raw = process.env.ALLOWED_ORIGINS?.trim();

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:524
   const PORT = Number(process.env.PORT) || 3011;

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:1793
   const candidateUrl = req.body?.webhookUrl || process.env.N8N_WEBHOOK_RUN_NEXT;

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:2551
   const apiKey = process.env.OPENCLAW_API_KEY || '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:2552
   const adminKey = process.env.OPENCLAW_ADMIN_KEY || '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:2553
   const dashboardUser = process.env.OPENCLAW_DASHBOARD_BASIC_USER || '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:2554
   const dashboardPass = process.env.OPENCLAW_DASHBOARD_BASIC_PASS || '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:2555
   const allowedOrigins = process.env.ALLOWED_ORIGINS || '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:2556
   const enforceWriteAuth = process.env.OPENCLAW_ENFORCE_WRITE_AUTH === 'true';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:2598
   const gatewayConfig = process.env.GATEWAY_CONFIG ? (() => {

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:2599
   try { return JSON.parse(process.env.GATEWAY_CONFIG); } catch { return null; }

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:2985
   if (process.env.N8N_WEBHOOK_WAKE_REPORT) {

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:2986
   triggerWebhook(process.env.N8N_WEBHOOK_WAKE_REPORT, {

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:3223
   env: { ...process.env, PATH: '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin' },

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:3252
   process.env.OPENCLAW_TASK_INDEX_DIR?.trim() ||

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:3255
   process.env.OPENCLAW_TASK_INDEX_JSONL?.trim() ||

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:3258
   process.env.OPENCLAW_TASK_INDEX_MD?.trim() ||

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:3538
   process.env.N8N_WEBHOOK_RUN_NEXT;

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:3575
   env: { ...process.env, PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin' },

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:3666
   env: { ...process.env, PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin' },

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:3749
   return res.status(503).json({ ok: false, message: 'Telegram 未設定。請在 .env 設定 TELEGRAM_BOT_TOKEN 與 TELEGRAM_CHAT_ID 後重啟。' }

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:3765
   const token = process.env.TELEGRAM_BOT_TOKEN?.trim();

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:3766
   const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:3831
   process.env.HOME || '/Users/caijunchang',

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:3933
   process.env.OPENCLAW_DASHBOARD_BASIC_USER?.trim() &&

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:3934
   process.env.OPENCLAW_DASHBOARD_BASIC_PASS?.trim()

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:3938
   trustProxy: process.env.OPENCLAW_TRUST_PROXY === 'true',

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:3971
   const OPENCLAW_DASHBOARD_BASIC_USER = process.env.OPENCLAW_DASHBOARD_BASIC_USER?.trim();

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:3972
   const OPENCLAW_DASHBOARD_BASIC_PASS = process.env.OPENCLAW_DASHBOARD_BASIC_PASS?.trim();

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:4035
   const url = process.env.SUPABASE_URL;

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:4036
   const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:4037
   log.warn(`  [Supabase] 未連線 → /api/openclaw/* 會回 503。請在專案根目錄 .env 設定 SUPABASE_URL 與 SUPABASE_SERVICE_ROLE_KEY 後重啟。`);

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/index.ts:4044
   log.warn(`  [Telegram] 未設定 → 不會發送通知。請在 .env 設定 TELEGRAM_BOT_TOKEN 與 TELEGRAM_CHAT_ID 後重啟。`);

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/supabase.ts:12
   const url = process.env.SUPABASE_URL?.trim();

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/supabase.ts:13
   const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

🟡 [CommandGuard] /Users/caijunchang/openclaw任務面版設計/server/src/promptGuard.ts:30
   { id: 'PG-004', name: '惡意指令執行', pattern: /rm\s+-rf\s+\/|sudo\s+rm|DROP\s+TABLE|DELETE\s+FROM\s+\w+\s*;|format\s+c:|mkfs\

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/middlewares/federationBlocker.ts:22
   broadcastSigningKey: process.env.FADP_BROADCAST_SIGNING_KEY || 'fadp-default-signing-key-please-change',

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/middlewares/firewall.ts:31
   const config = process.env.GATEWAY_CONFIG;

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/middlewares/auth.ts:14
   const OPENCLAW_API_KEY = process.env.OPENCLAW_API_KEY?.trim();

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/middlewares/auth.ts:16
   process.env.OPENCLAW_ENFORCE_WRITE_AUTH !== 'false';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/middlewares/auth.ts:18
   process.env.OPENCLAW_ENFORCE_READ_AUTH === 'true';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/middlewares/auth.ts:19
   const OPENCLAW_READ_KEY = process.env.OPENCLAW_READ_KEY?.trim();

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/middlewares/auth.ts:20
   const OPENCLAW_WRITE_KEY = process.env.OPENCLAW_WRITE_KEY?.trim();

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/middlewares/auth.ts:21
   const OPENCLAW_ADMIN_KEY = process.env.OPENCLAW_ADMIN_KEY?.trim();

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/utils/key-vault.ts:4
   * 所有 API Key 從 process.env 收集一次，提供 sanitize() 函數

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/utils/key-vault.ts:45
   /** 從 process.env 和 openclaw.json 收集所有敏感值 */

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/utils/key-vault.ts:49
   // 1. 從 process.env 收集

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/utils/key-vault.ts:51
   const value = process.env[name]?.trim();

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/utils/key-vault.ts:59
   const ocPath = path.join(process.env.HOME || '/tmp', '.openclaw', 'openclaw.json');

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/utils/key-vault.ts:122
   return entry?.value || process.env[envName]?.trim() || '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/utils/key-vault.ts:130
   /** 重新載入金鑰註冊表（.env 或 openclaw.json 變更後呼叫） */

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/utils/telegram.ts:23
   const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/utils/telegram.ts:24
   const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID?.trim();

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/utils/telegram.ts:36
   log.warn('[Telegram] 未設定 TELEGRAM_BOT_TOKEN 或 TELEGRAM_CHAT_ID，通知將不發送。請在 .env 設定。');

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/utils/telegram.ts:91
   const token = options.token?.trim() || process.env.TELEGRAM_CONTROL_BOT_TOKEN?.trim() || TELEGRAM_BOT_TOKEN;

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/bot-polling.ts:27
   const TOKEN = (process.env.TELEGRAM_CONTROL_BOT_TOKEN?.trim() || process.env.TELEGRAM_STOP_BOT_TOKEN?.trim()) ?? '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/bot-polling.ts:28
   const GROUP_TOKEN = process.env.TELEGRAM_GROUP_BOT_TOKEN?.trim() ?? '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/bot-polling.ts:29
   const GROUP_CHAT_ID = process.env.TELEGRAM_GROUP_CHAT_ID?.trim() ?? '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/bot-polling.ts:30
   const OPENCLAW_API_KEY = process.env.OPENCLAW_API_KEY?.trim() ?? '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/bot-polling.ts:31
   const TELEGRAM_ALLOW_ANY_CHAT = process.env.TELEGRAM_ALLOW_ANY_CHAT === 'true';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/bot-polling.ts:35
   const TASKBOARD_BASE_URL = (process.env.TASKBOARD_URL?.trim() || 'http://localhost:3011').replace(/\/+$/, '');

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/bot-polling.ts:38
   const XIAOCAI_TOKEN = process.env.TELEGRAM_XIAOCAI_BOT_TOKEN?.trim() ?? '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/bot-polling.ts:114
   const raw = process.env.TELEGRAM_CHAT_ID?.trim();

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/bot-polling.ts:389
   const envRoot = process.env.OPENCLAW_WORKSPACE_ROOT?.trim();

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/bot-polling.ts:438
   for (const [k, v] of Object.entries(process.env)) {

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/bot-polling.ts:943
   `請在後端 .env 設定 TELEGRAM_CHAT_ID=${chatId} 後重啟（推薦），` +

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/bot-polling.ts:1475
   const allowedChatId = process.env.TELEGRAM_CHAT_ID?.trim();

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/bot-polling.ts:1617
   const action = JSON.parse(jsonStr.replace(/~/g, process.env.HOME || '/tmp')) as Record<string, string>;

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/bot-polling.ts:1726
   const action = JSON.parse(jsonStr.replace(/~/g, process.env.HOME || '/tmp')) as Record<string, string>;

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/bot-polling.ts:1811
   const heartbeatPath = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace', 'HEARTBEAT.md');

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/bot-polling.ts:1854
   const action = JSON.parse(jsonStr.replace(/~/g, process.env.HOME || '/tmp')) as Record<string, string>;

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:16
   const TASKBOARD_BASE_URL = (process.env.TASKBOARD_URL?.trim() || 'http://localhost:3011').replace(/\/+$/, '');

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:17
   const OPENCLAW_API_KEY = process.env.OPENCLAW_API_KEY?.trim() ?? '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:24
   if (process.env.OPENCLAW_PROJECT_ROOT) return process.env.OPENCLAW_PROJECT_ROOT;

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:70
   /\.env/i, /openclaw\.json/i, /sessions\.json/i,

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:278
   HOME: process.env.HOME,

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:279
   PATH: process.env.PATH,

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:327
   const XIAOCAI_BG_TOKEN = process.env.TELEGRAM_XIAOCAI_BOT_TOKEN?.trim() ?? '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:330
   const raw = process.env.TELEGRAM_CHAT_ID?.trim();

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:346
   HOME: process.env.HOME,

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:347
   PATH: process.env.PATH,

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:413
   const claudeBin = path.join(process.env.HOME || '/tmp', '.local', 'bin', 'claude');

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:420
   ...process.env,

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:421
   HOME: process.env.HOME,

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:422
   PATH: `${path.join(process.env.HOME || '/tmp', '.local', 'bin')}:${process.env.PATH || '/usr/bin:/bin'}`,

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:424
   cwd: process.env.HOME || '/tmp',

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:466
   const googleKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:514
   const googleKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:570
   const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:800
   const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:811
   const ocData = JSON.parse(fs.readFileSync(path.join(process.env.HOME || '/tmp', '.openclaw', 'openclaw.json'), 'utf8'));

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:823
   const ocData = JSON.parse(fs.readFileSync(path.join(process.env.HOME || '/tmp', '.openclaw', 'openclaw.json'), 'utf8'));

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:835
   const ocData = JSON.parse(fs.readFileSync(path.join(process.env.HOME || '/tmp', '.openclaw', 'openclaw.json'), 'utf8'));

🟡 [CommandGuard] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:981
   /rm\s+-rf/i, /sudo\s/i, /chmod\s+777/i, /dd\s+if=/i, /mkfs/i,

🟡 [CommandGuard] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:985
   /;\s*(rm|sudo|dd|mkfs|chmod)/i,

🟡 [CommandGuard] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:1030
   output: `🚫 pty_exec 危險指令攔截（${dangerous.source}）。git push/force、rm -rf、sudo 等一律禁止。`,

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:1060
   HOME: process.env.HOME,

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:1061
   PATH: process.env.PATH,

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:1125
   const apiKey = process.env.GOOGLE_API_KEY || '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:1417
   const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:1596
   const workspace = process.env.NEUXA_WORKSPACE || path.join(process.env.HOME || '', '.openclaw', 'workspace');

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:1634
   path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace'),

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:2020
   path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace'),

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:2028
   expanded = path.join(process.env.HOME || '/tmp', expanded.slice(1));

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:2193
   const googleKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:2331
   const ROADMAPS_DIR = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace', 'roadmaps');

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:2485
   if (p.startsWith('~/')) return path.join(process.env.HOME || '/tmp', p.slice(2));

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts:2486
   if (p === '~') return process.env.HOME || '/tmp';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/security.ts:7
   export const NEUXA_WORKSPACE = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace');

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/security.ts:17
   '.env', 'credentials', 'secret', 'password', 'api_key', 'apikey',

🟡 [CommandGuard] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/security.ts:26
   'sudo',

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/security.ts:69
   '.env', 'openclaw.json', 'sessions.json', 'config.json',

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/xiaocai-think.ts:12
   const TASKBOARD_BASE_URL = (process.env.TASKBOARD_URL?.trim() || 'http://localhost:3011').replace(/\/+$/, '');

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/xiaocai-think.ts:13
   const OPENCLAW_API_KEY = process.env.OPENCLAW_API_KEY?.trim() ?? '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/xiaocai-think.ts:58
   const workspace = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace');

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/xiaocai-think.ts:133
   const workspace = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace');

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/xiaocai-think.ts:135
   if (process.env.OPENCLAW_PROJECT_ROOT) return process.env.OPENCLAW_PROJECT_ROOT;

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/xiaocai-think.ts:221
   if (process.env.OPENCLAW_PROJECT_ROOT) return process.env.OPENCLAW_PROJECT_ROOT;

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/xiaocai-think.ts:226
   const _workspace = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace');

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/xiaocai-think.ts:333
   - 不能碰：.env / key / token / password 相關檔案

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/xiaocai-think.ts:359
   const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/xiaocai-think.ts:360
   if (!GOOGLE_API_KEY) return '（AI 未設定，請在 .env 加入 GOOGLE_API_KEY）';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/xiaocai-think.ts:423
   const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim() || getProviderKey('Anthropic') || '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/xiaocai-think.ts:440
   apiKey = process.env.OPENROUTER_API_KEY?.trim() || getProviderKey('openrouter') || '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/xiaocai-think.ts:486
   const controlToken = process.env.TELEGRAM_CONTROL_BOT_TOKEN?.trim() ?? '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/xiaocai-think.ts:487
   const ownerChatId = (process.env.TELEGRAM_OWNER_CHAT_ID?.trim() || process.env.LAOCAI_CHAT_ID?.trim()) ?? '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/telegram/model-registry.ts:100
   const ocPath = path.join(process.env.HOME || '/tmp', '.openclaw', 'openclaw.json');

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/routes/federation.ts:342
   const approveUrl = `${process.env.OPENCLAW_API_BASE || 'http://localhost:3011'}/api/federation/handshake/approve/${node_

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/routes/federation.ts:343
   const rejectUrl = `${process.env.OPENCLAW_API_BASE || 'http://localhost:3011'}/api/federation/handshake/reject/${node_id

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/routes/federation.ts:374
   const adminToken = process.env.FADP_ADMIN_TOKEN || 'change-me';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/routes/federation.ts:458
   const adminToken = process.env.FADP_ADMIN_TOKEN || 'change-me';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/routes/federation.ts:1018
   const approveUrl = `${process.env.OPENCLAW_API_BASE || 'http://localhost:3011'}/api/federation/trust/approve/${member.no

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/routes/federation.ts:1019
   const rejectUrl = `${process.env.OPENCLAW_API_BASE || 'http://localhost:3011'}/api/federation/trust/reject/${member.node

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/routes/federation.ts:1052
   const adminToken = process.env.FADP_ADMIN_TOKEN || 'change-me';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/routes/federation.ts:1112
   const adminToken = process.env.FADP_ADMIN_TOKEN || 'change-me';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/routes/auto-executor.ts:36
   const XIAOCAI_BOT_TOKEN = process.env.TELEGRAM_XIAOCAI_BOT_TOKEN?.trim() ?? '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/routes/auto-executor.ts:37
   const XIAOCAI_CHAT_ID = process.env.TELEGRAM_CHAT_ID?.trim() ?? '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/routes/auto-executor.ts:240
   const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/routes/auto-executor.ts:892
   const notesDir = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace', 'notes');

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/routes/proxy.ts:29
   const ocPath = path.join(process.env.HOME || '/tmp', '.openclaw', 'openclaw.json');

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/routes/proxy.ts:40
   const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/routes/property-api.ts:18
   const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';

🟡 [PathWatch] /Users/caijunchang/openclaw任務面版設計/server/src/routes/property-api.ts:179
   hint: '請在 .env 設定 GOOGLE_API_KEY',

📄 報告已儲存至 990-report.md
## Deep Scan Analysis Metrics
### Codebase Overview
The project located at /Users/caijunchang/openclaw任務面版設計 is a full-stack TypeScript application. The backend (server/src) utilizes a structured architecture, while the frontend (src) appears to be React-based.
Analysis reveals a total of 72532 source files (29687 TypeScript, 42845 JavaScript) comprising 6403 lines of code. We identified 74699 distinct function definitions across the workspace.

### Structural Analysis
The backend server uses 11 external dependencies. Key paths scanned include:
/Users/caijunchang/openclaw任務面版設計/server/src
/Users/caijunchang/openclaw任務面版設計/server/src/websocket.ts
/Users/caijunchang/openclaw任務面版設計/server/src/riskClassifier.ts
/Users/caijunchang/openclaw任務面版設計/server/src/openclawMapper.ts
/Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts
/Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts.bak
/Users/caijunchang/openclaw任務面版設計/server/src/error-handler.ts
/Users/caijunchang/openclaw任務面版設計/server/src/anti-stuck.ts
/Users/caijunchang/openclaw任務面版設計/server/src/governanceEngine.ts
/Users/caijunchang/openclaw任務面版設計/server/src/middlewares
/Users/caijunchang/openclaw任務面版設計/server/src/middlewares/validate.ts
/Users/caijunchang/openclaw任務面版設計/server/src/middlewares/federationBlocker.ts
/Users/caijunchang/openclaw任務面版設計/server/src/middlewares/firewall.ts
/Users/caijunchang/openclaw任務面版設計/server/src/middlewares/auth.ts
/Users/caijunchang/openclaw任務面版設計/server/src/seed.ts
/Users/caijunchang/openclaw任務面版設計/server/src/taskCompliance.ts
/Users/caijunchang/openclaw任務面版設計/server/src/utils
/Users/caijunchang/openclaw任務面版設計/server/src/utils/key-vault.ts
/Users/caijunchang/openclaw任務面版設計/server/src/utils/telegram.ts
/Users/caijunchang/openclaw任務面版設計/server/src/utils/federationCrypto.ts
/Users/caijunchang/openclaw任務面版設計/server/src/governanceEngine.ts.bak
/Users/caijunchang/openclaw任務面版設計/server/src/openclawSupabase.ts
/Users/caijunchang/openclaw任務面版設計/server/src/types.ts
/Users/caijunchang/openclaw任務面版設計/server/src/logger.ts
/Users/caijunchang/openclaw任務面版設計/server/src/features.ts
/Users/caijunchang/openclaw任務面版設計/server/src/preload-dotenv.ts
/Users/caijunchang/openclaw任務面版設計/server/src/domains.ts
/Users/caijunchang/openclaw任務面版設計/server/src/telegram
/Users/caijunchang/openclaw任務面版設計/server/src/telegram/bot-polling.ts
/Users/caijunchang/openclaw任務面版設計/server/src/telegram/action-handlers.ts
/Users/caijunchang/openclaw任務面版設計/server/src/telegram/security.ts
/Users/caijunchang/openclaw任務面版設計/server/src/telegram/index.ts
/Users/caijunchang/openclaw任務面版設計/server/src/telegram/xiaocai-think.ts
/Users/caijunchang/openclaw任務面版設計/server/src/telegram/model-registry.ts
/Users/caijunchang/openclaw任務面版設計/server/src/emergency-stop.ts
/Users/caijunchang/openclaw任務面版設計/server/src/n8nClient.ts
/Users/caijunchang/openclaw任務面版設計/server/src/index.ts
/Users/caijunchang/openclaw任務面版設計/server/src/supabase.ts
/Users/caijunchang/openclaw任務面版設計/server/src/promptGuard.ts
/Users/caijunchang/openclaw任務面版設計/server/src/workflow-engine.ts
/Users/caijunchang/openclaw任務面版設計/server/src/routes
/Users/caijunchang/openclaw任務面版設計/server/src/routes/openclaw-tasks.ts.bak
/Users/caijunchang/openclaw任務面版設計/server/src/routes/federation.ts
/Users/caijunchang/openclaw任務面版設計/server/src/routes/auto-executor.ts
/Users/caijunchang/openclaw任務面版設計/server/src/routes/insights.ts
/Users/caijunchang/openclaw任務面版設計/server/src/routes/projects.ts
/Users/caijunchang/openclaw任務面版設計/server/src/routes/openclaw-runs.ts
/Users/caijunchang/openclaw任務面版設計/server/src/routes/openclaw-data.ts
/Users/caijunchang/openclaw任務面版設計/server/src/routes/auto-executor.ts.bak
/Users/caijunchang/openclaw任務面版設計/server/src/routes/openclaw-tasks.ts
/Users/caijunchang/openclaw任務面版設計/server/src/routes/proxy.ts
/Users/caijunchang/openclaw任務面版設計/server/src/routes/openclaw-reviews.ts
/Users/caijunchang/openclaw任務面版設計/server/src/routes/memory.ts
/Users/caijunchang/openclaw任務面版設計/server/src/routes/tasks.ts
/Users/caijunchang/openclaw任務面版設計/server/src/routes/property-api.ts
/Users/caijunchang/openclaw任務面版設計/server/src/services
/Users/caijunchang/openclaw任務面版設計/server/src/services/BrowserService.ts
/Users/caijunchang/openclaw任務面版設計/server/src/validation
/Users/caijunchang/openclaw任務面版設計/server/src/validation/schemas.ts
/Users/caijunchang/openclaw任務面版設計/server/src/store.ts

The frontend uses 58 external dependencies. Top 5 largest files by line count:
   31506 total
    2948 /Users/caijunchang/openclaw任務面版設計/src/pages/TaskBoard.tsx
    1063 /Users/caijunchang/openclaw任務面版設計/src/pages/CommunicationDeck.tsx
     750 /Users/caijunchang/openclaw任務面版設計/src/pages/Dashboard.tsx
     737 /Users/caijunchang/openclaw任務面版設計/src/pages/InfraDeck.tsx

### Security Findings
Manual grep scan for sensitive patterns (excluding .env):
/Users/caijunchang/openclaw任務面版設計/openclaw-main/ui/src/ui/device-identity.ts:77:          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
/Users/caijunchang/openclaw任務面版設計/openclaw-main/ui/src/ui/device-identity.ts:103:  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
/Users/caijunchang/openclaw任務面版設計/openclaw-main/ui/src/ui/storage.ts:104:  localStorage.setItem(KEY, JSON.stringify(next));
/Users/caijunchang/openclaw任務面版設計/openclaw-main/ui/src/ui/device-auth.ts:58:    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
/Users/caijunchang/openclaw任務面版設計/openclaw-main/ui/src/ui/navigation.browser.test.ts:173:    localStorage.setItem(
/Users/caijunchang/openclaw任務面版設計/openclaw-main/node_modules/.pnpm/@noble+curves@2.0.1/node_modules/@noble/curves/src/abstract/fft.ts:474:        // Same as eval(a, monomialBasis(x, a.length)), but it is faster this way
/Users/caijunchang/openclaw任務面版設計/openclaw-main/node_modules/.pnpm/@noble+curves@2.0.1/node_modules/@noble/curves/src/abstract/fft.ts:499:      eval(a: P, x: T, brp = false): T {
/Users/caijunchang/openclaw任務面版設計/openclaw-main/node_modules/.pnpm/@tootallnate+quickjs-emscripten@0.23.0/node_modules/@tootallnate/quickjs-emscripten/dist/context.d.ts:305:     * Like [`eval(code)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#Description).
/Users/caijunchang/openclaw任務面版設計/openclaw-main/node_modules/.pnpm/@types+node@20.19.32/node_modules/@types/node/vm.d.ts:536:     * the JavaScript [`eval()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval) function to run the same code:
/Users/caijunchang/openclaw任務面版設計/openclaw-main/node_modules/.pnpm/@types+node@20.19.32/node_modules/@types/node/vm.d.ts:546:     * const evalResult = eval('localVar = "eval";');

### 結論 (Conclusion)
1. **架構建議**：項目擁有 6403 行代碼，規模中等。建議針對 11 個後端依賴進行定期審計，特別是處理數據請求的邏輯。
2. **安全性優化**：在 74699 個函數中，應重點檢查涉及數據持久化的部分。目前發現 TS 文件佔比極高 (29687)，類型安全性良好，但仍需注意避免使用 any 類型以維持強型別優勢。
3. **性能優化**：建議將超過 500 行的 TS 文件（如分析中列出的 Top 5）進行模塊化拆分，以提高代碼可維護性與掃描效率。
