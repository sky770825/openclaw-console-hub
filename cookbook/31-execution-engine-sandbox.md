# 31 — 執行引擎與沙盒機制 (Execution Engine & Sandbox)

> 基於 server/src/executor-agents.ts 的核心實作解析。這是 OpenClaw 安全執行 AI 腳本的心臟。

---

## 一、核心架構

執行引擎負責接收自然語言任務，將其轉化為可執行的 Bash 腳本，並在受限的沙盒環境中運行。它包含三個關鍵層級：

1.  Agent 選擇器：根據任務類型選擇合適的執行者 (Cursor/CoDEX/OpenClaw)。
2.  環境隔離：剝離敏感環境變數，建立乾淨的 Process 環境。
3.  路徑控制：限制寫入權限，防止系統破壞。

---

## 二、沙盒環境實作 (Sandbox Implementation)

這是防止 AI 腳本「越獄」或「洩密」的第一道防線。

### 1. 環境變數清洗

我們不直接傳遞 process.env，而是重建一個乾淨的 SANDBOX_ENV。

``typescript
const ENHANCED_PATH = /Users/sky770825/.local/bin:${process.env.PATH || '/usr/local/bin:/usr/bin:/bin'};

// 只保留非敏感變數
const SANDBOX_ENV: Record<string, string> = {
  PATH: ENHANCED_PATH,
  HOME: process.env.HOME || '',
  USER: process.env.USER || '',
  SHELL: process.env.SHELL || '/bin/sh',
  LANG: process.env.LANG || 'en_US.UTF-8',
  NODE_ENV: 'production',
  TMPDIR: process.env.TMPDIR || '/tmp',
};
// 注意：這裡完全沒有 OPENCLAW_API_KEY 或 SUPABASE_KEY
`

### 2. 工作目錄鎖定

所有腳本預設在 /Users/sky770825/.openclaw/workspace/sandbox 執行。產出物必須寫入此處或指定的白名單目錄。

`typescript
const SANDBOX_WORKDIR = path.join(
  process.env.HOME || '/tmp',
  '.openclaw', 'workspace', 'sandbox'
);
`

### 3. Claude CLI 特別處理

為了支援子代理調用，我們必須清理 CLAUDECODE 相關變數，避免遞迴調用導致的 Session 鎖死。

`typescript
const CLAUDE_ENV = (() => {
  const env = { ...process.env, PATH: ENHANCED_PATH };
  delete (env as any).CLAUDECODE;
  delete (env as any).CLAUDE_CODE_ENTRYPOINT;
  return env;
})();
`

---

## 三、安全寫入白名單

AI 只能寫入以下目錄，嘗試寫入其他地方（如專案源碼根目錄）會被拒絕或無效。

`typescript
const WORKSPACE_ROOT = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace');

const WRITABLE_WORKSPACE_DIRS = [
  path.join(WORKSPACE_ROOT, 'sandbox'),
  path.join(WORKSPACE_ROOT, 'scripts'),
  path.join(WORKSPACE_ROOT, 'proposals'),
  path.join(WORKSPACE_ROOT, 'reports'),
  path.join(WORKSPACE_ROOT, 'knowledge'),
  path.join(WORKSPACE_ROOT, 'armory'),
];
`

---

## 四、最佳實踐

1.  永遠不要在腳本中硬編碼 Key：因為沙盒環境裡沒有 Key。如果需要 Key，必須透過 proxy_fetch 或由 Server 端代理解析。
2.  產出物路徑：腳本產生的檔案應放在 ./output/ 或絕對路徑的 workspace/reports/ 下。
3.  使用絕對路徑：雖然有 WORKDIR，但使用 path.join` 組合絕對路徑最安全。
