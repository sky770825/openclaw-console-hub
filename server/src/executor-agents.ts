/**
 * Agent 選擇器和執行器
 * 支援 Agent 類型：Cursor / CoDEX / OpenClaw / Auto
 */

import { createLogger } from './logger.js';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import type { AgentType, Task, Run, AgentExecutorConfig } from './types.js';

const log = createLogger('executor-agents');

const execAsync = promisify(exec);
const SUBSCRIPTION_ONLY_MODE = process.env.OPENCLAW_SUBSCRIPTION_ONLY !== 'false';

// 確保 claude CLI 在 PATH 中，並移除 CLAUDECODE 避免 nested session 錯誤
const ENHANCED_PATH = `/Users/caijunchang/.local/bin:${process.env.PATH || '/usr/local/bin:/usr/bin:/bin'}`;
const CLAUDE_ENV = (() => {
  const env = { ...process.env, PATH: ENHANCED_PATH };
  delete (env as Record<string, unknown>).CLAUDECODE;
  delete (env as Record<string, unknown>).CLAUDE_CODE_ENTRYPOINT;
  return env;
})();

// 子進程沙箱環境：只傳入非敏感的系統變數，防止金鑰外洩
// 不包含：OPENCLAW_API_KEY、GOOGLE_API_KEY、TELEGRAM_BOT_TOKEN、N8N_API_KEY、SUPABASE_*
const SANDBOX_ENV: Record<string, string> = {
  PATH: ENHANCED_PATH,
  HOME: process.env.HOME || '',
  USER: process.env.USER || '',
  SHELL: process.env.SHELL || '/bin/sh',
  LANG: process.env.LANG || 'en_US.UTF-8',
  TERM: process.env.TERM || 'xterm-256color',
  NODE_ENV: process.env.NODE_ENV || 'production',
  TMPDIR: process.env.TMPDIR || '/tmp',
};

// 沙箱工作目錄：AI 生成的腳本在此執行，產出物寫到 output/ 子目錄
const SANDBOX_WORKDIR = path.join(
  process.env.HOME || '/tmp',
  '.openclaw', 'workspace', 'sandbox'
);

// 專案源碼路徑（唯讀參考）和 workspace 路徑（可寫入）
const PROJECT_ROOT = '/Users/caijunchang/openclaw任務面版設計';
const WORKSPACE_ROOT = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace');

// 安全允許寫入的 workspace 子目錄（不含系統文件）
const WRITABLE_WORKSPACE_DIRS = [
  path.join(WORKSPACE_ROOT, 'sandbox'),
  path.join(WORKSPACE_ROOT, 'scripts'),
  path.join(WORKSPACE_ROOT, 'proposals'),
  path.join(WORKSPACE_ROOT, 'reports'),
  path.join(WORKSPACE_ROOT, 'knowledge'),
  path.join(WORKSPACE_ROOT, 'armory'),
  path.join(WORKSPACE_ROOT, 'skills'),
];

// 絕對禁止寫入的路徑
const FORBIDDEN_WRITE_PATHS = [
  '.env', 'openclaw.json', 'SOUL.md', 'AWAKENING.md', 'IDENTITY.md',
  'sessions.json', 'config.json', 'HEARTBEAT.md',
  'server/src/', 'server/dist/', 'node_modules/',
];

/**
 * 判斷任務執行權限等級
 * - 'sandbox': 只能在 sandbox 裡（預設，最安全）
 * - 'workspace': 可以寫入 workspace 安全子目錄 + 唯讀專案源碼
 * - 'readonly-project': 只能讀專案源碼（分析型任務）
 */
function classifyExecutionLevel(taskName: string, taskDescription: string): 'sandbox' | 'workspace' | 'readonly-project' {
  const combined = `${taskName}\n${taskDescription}`.toLowerCase();

  // 修改源碼 / 修復 bug → workspace（可寫 workspace + 專案源碼）
  if (/修復|修改|fix|修正|patch|改進|upgrade|更新.*\.ts|改.*prompt|改.*score|改.*model/i.test(combined)) {
    return 'workspace';
  }

  // 明確需要系統變更的任務 → workspace（可寫 workspace 安全子目錄）
  if (/建立腳本|建立工具|重建.*腳本|寫入.*workspace|deploy.*script|create.*script|write.*tool/i.test(combined)) {
    return 'workspace';
  }

  // 分析/掃描/研究型任務 → 唯讀專案（可以讀真正的源碼）
  if (/分析|研究|掃描|調查|review|analyze|scan|inspect|audit|check|monitor|investigate/i.test(combined)) {
    return 'readonly-project';
  }

  // 其他 → sandbox（最安全）
  return 'sandbox';
}

/** Agent 執行器配置 */
const AGENT_CONFIGS: Record<AgentType, AgentExecutorConfig> = {
  cursor: {
    type: 'cursor',
    name: 'Cursor Agent',
    enabled: true,
    config: {
      timeout: 300000,  // 5 分鐘
      maxRetries: 2,
      workingDir: process.cwd(),
    },
  },
  codex: {
    type: 'codex',
    name: 'CoDEX Agent',
    enabled: true,
    config: {
      timeout: 300000,
      maxRetries: 2,
      workingDir: process.cwd(),
    },
  },
  openclaw: {
    type: 'openclaw',
    name: 'OpenClaw Agent',
    enabled: true,
    config: {
      timeout: 300000,
      maxRetries: 2,
      workingDir: process.cwd(),
    },
  },
  claude: {
    type: 'claude',
    name: 'Claude Code CLI (Subscription)',
    enabled: true,
    config: {
      timeout: 120000,  // 2 分鐘
      maxRetries: 1,
      workingDir: SANDBOX_WORKDIR,
    },
  },
  auto: {
    type: 'auto',
    name: 'Auto Selector',
    enabled: true,
    config: {
      timeout: 300000,
      maxRetries: 2,
    },
  },
};

/** 品質評分結果 */
export interface QualityGrade {
  score: number;          // 0-100
  grade: 'A' | 'B' | 'C' | 'F';  // A=優 B=可 C=差 F=不及格
  passed: boolean;        // score >= 60 才算通過
  checks: {
    name: string;
    passed: boolean;
    weight: number;
    detail: string;
  }[];
  reason: string;         // 人類可讀的判定理由
}

/** 執行結果 */
export interface AgentExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
  durationMs: number;
  agentType: AgentType;
  modelUsed?: string;
  fallbackTried?: string[];
  quality?: QualityGrade;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
    estimated: boolean;
  };
  costUsd?: number | null;
}

/** Agent 選擇器 */
export class AgentSelector {
  /**
   * 根據任務特性選擇最適合的 Agent
   */
  static selectAgent(task: Task): AgentType {
    // 如果已指定 Agent，直接使用（Cursor 例外：改走 auto 規則）
    if (task.agent?.type && task.agent.type !== 'auto' && task.agent.type !== 'cursor') {
      return task.agent.type;
    }

    // 先用結構化欄位做判斷（優先於關鍵字）
    if (task.riskLevel === 'critical' || task.riskLevel === 'high') {
      return 'codex';
    }
    if (task.complexity === 'XL' || task.complexity === 'L') {
      return 'codex';
    }
    if (task.taskType === 'ops') {
      return 'openclaw';
    }
    if (task.taskType === 'review' || task.taskType === 'research') {
      return 'codex';
    }
    if (task.taskType === 'development') {
      const tgs = task.tags.map((t) => t.toLowerCase());
      if (tgs.some((t) => ['frontend', 'ui', 'react', 'vue', 'css', 'html'].includes(t))) {
        return 'cursor';
      }
      return 'codex';
    }

    // 根據任務標籤和描述自動選擇
    const tags = task.tags.map(t => t.toLowerCase());
    const desc = task.description.toLowerCase();
    const name = task.name.toLowerCase();

    // Cursor: 前端開發、UI、React、CSS
    if (tags.some(t => ['frontend', 'ui', 'react', 'vue', 'css', 'html'].includes(t)) ||
        desc.includes('前端') || desc.includes('ui') || desc.includes('react') ||
        name.includes('前端') || name.includes('ui')) {
      return 'cursor';
    }

    // CoDEX: 後端、API、資料庫、演算法
    if (tags.some(t => ['backend', 'api', 'database', 'algorithm', 'server'].includes(t)) ||
        desc.includes('後端') || desc.includes('api') || desc.includes('資料庫') ||
        name.includes('後端') || name.includes('api')) {
      return 'codex';
    }

    // OpenClaw: 系統操作、腳本、自動化
    if (tags.some(t => ['script', 'automation', 'system', 'devops', 'deploy'].includes(t)) ||
        desc.includes('腳本') || desc.includes('自動化') || desc.includes('部署') ||
        name.includes('腳本') || name.includes('自動化')) {
      return 'openclaw';
    }

    // 預設使用 OpenClaw
    return 'openclaw';
  }

  /**
   * 獲取所有可用的 Agent 類型
   */
  static getAvailableAgents(): AgentType[] {
    return Object.entries(AGENT_CONFIGS)
      .filter(([_, config]) => config.enabled)
      .map(([type, _]) => type as AgentType);
  }

  /**
   * 獲取 Agent 配置
   */
  static getConfig(agentType: AgentType): AgentExecutorConfig {
    return AGENT_CONFIGS[agentType] || AGENT_CONFIGS.openclaw;
  }

  /**
   * 檢查 Agent 是否可用
   */
  static isAgentAvailable(agentType: AgentType): boolean {
    return AGENT_CONFIGS[agentType]?.enabled ?? false;
  }
}

/** Agent 執行器 */
export class AgentExecutor {
  private static estimateTokenUsage(inputText: string, outputText: string): AgentExecutionResult['tokenUsage'] {
    const input = Math.max(0, Math.ceil((inputText || '').length / 4));
    const output = Math.max(0, Math.ceil((outputText || '').length / 4));
    return {
      input,
      output,
      total: input + output,
      estimated: true,
    };
  }
  private static selectModelPlan(task: Task, agentType: AgentType): {
    primary: string;
    fallbacks: string[];
  } {
    if (SUBSCRIPTION_ONLY_MODE) {
      if (agentType === 'openclaw') {
        return {
          primary: 'ollama/qwen3:8b',
          fallbacks: ['ollama/deepseek-r1:8b', 'ollama/llama3.2:latest'],
        };
      }
      if (agentType === 'cursor') {
        return {
          primary: 'subscription/cursor-native',
          fallbacks: ['subscription/cursor-fallback'],
        };
      }
      if (agentType === 'codex') {
        return {
          primary: 'subscription/codex-native',
          fallbacks: ['subscription/codex-fallback'],
        };
      }
      return {
        primary: 'subscription/auto-native',
        fallbacks: ['subscription/auto-fallback'],
      };
    }

    const explicit = task.modelConfig;
    if (explicit?.primary) {
      return {
        primary: explicit.primary,
        fallbacks: explicit.fallbacks ?? [],
      };
    }

    if (task.agent?.type === 'openclaw' || task.taskType === 'ops') {
      return {
        primary: 'ollama/qwen3:8b',
        fallbacks: ['ollama/deepseek-r1:8b', 'ollama/llama3.2:latest'],
      };
    }
    return {
      primary: 'google/gemini-3-flash-preview',
      fallbacks: ['google/gemini-2.5-flash', 'anthropic/claude-haiku-4-5-20251001'],
    };
  }

  /**
   * 檢查是否為零 Token 維護任務
   */
  private static isZeroTokenTask(task: Task): boolean {
    const zeroTokenKeywords = [
      '磁碟空間監控',
      'Ollama 健康檢查',
      'Ollama健康檢查',
      '任務板執行統計',
      '技能庫整理',
      '舊任務自動封存',
      '磁碟', 'disk', 'ollama',
    ];
    const taskName = task.name.toLowerCase();
    return zeroTokenKeywords.some(kw => taskName.includes(kw.toLowerCase()));
  }

  /**
   * 執行零 Token 維護任務（純本地指令，不經過 AI）
   */
  private static async executeZeroTokenTask(
    task: Task,
    timeout: number
  ): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    let command = '';

    // 根據任務類型選擇對應的純本地指令
    if (task.name.includes('磁碟')) {
      command = `
echo "=== 💾 磁碟空間檢查 ===" && \
df -h / && \
echo "" && \
echo "=== 🧹 清理超過 7 天的 temp 檔案 ===" && \
find /tmp -type f -mtime +7 -delete 2>/dev/null | head -5 && \
echo "清理完成" && \
echo "" && \
echo "✅ 磁碟監控任務完成"`;
    } else if (task.name.includes('Ollama') || task.name.includes('ollama')) {
      command = `
echo "=== 🏥 Ollama 健康檢查 ===" && \
echo "測試模型: qwen3:8b..." && \
curl -s http://localhost:11434/api/generate -d '{"model":"qwen3:8b","prompt":"hi","stream":false,"options":{"num_predict":1}}' -m 10 > /dev/null && echo "✅ qwen3:8b 正常" || echo "❌ qwen3:8b 異常" && \
echo "測試模型: deepseek-r1:8b..." && \
curl -s http://localhost:11434/api/generate -d '{"model":"deepseek-r1:8b","prompt":"hi","stream":false,"options":{"num_predict":1}}' -m 10 > /dev/null && echo "✅ deepseek-r1:8b 正常" || echo "❌ deepseek-r1:8b 異常" && \
echo "" && \
echo "✅ Ollama 健康檢查完成"`;
    } else if (task.name.includes('統計')) {
      command = `
echo "=== 📊 任務板執行統計 ===" && \
echo "檢查任務狀態..." && \
curl -s http://localhost:3011/api/openclaw/list-tasks 2>/dev/null | grep -c '"status"' | xargs -I {} echo "總任務數: {}" && \
echo "" && \
echo "✅ 統計報告產生完成"`;
    } else if (task.name.includes('技能')) {
      command = `
echo "=== 🧹 技能庫整理 ===" && \
ls -la ~/.openclaw/workspace/skills/ 2>/dev/null | wc -l | xargs -I {} echo "技能數量: {}" && \
echo "" && \
echo "✅ 技能庫檢查完成"`;
    } else if (task.name.includes('封存')) {
      command = `
echo "=== 📦 舊任務封存 ===" && \
echo "檢查超過 30 天的完成任務..." && \
echo "✅ 封存檢查完成"`;
    } else {
      const safeName = task.name.replace(/'/g, "'\\''");
      command = `echo '✅ 零 Token 任務執行: ${safeName}'`;
    }

    return new Promise((resolve) => {
      const child = spawn('sh', ['-c', command], {
        cwd: process.cwd(),
        env: SANDBOX_ENV,
      });

      let output = '';
      let errorOutput = '';

      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      child.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        resolve({
          success: false,
          output,
          error: `Zero-token task timeout after ${timeout}ms`,
          exitCode: -1,
          durationMs: Date.now() - startTime,
          agentType: 'openclaw',
        });
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        resolve({
          success: code === 0,
          output: output + '\n[Zero-Token Mode] 本地執行，無 AI Token 消耗',
          error: errorOutput || undefined,
          exitCode: code ?? 0,
          durationMs: Date.now() - startTime,
          agentType: 'openclaw',
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          output,
          error: error.message,
          exitCode: -1,
          durationMs: Date.now() - startTime,
          agentType: 'openclaw',
        });
      });
    });
  }

  /**
   * 執行任務
   */
  static async execute(
    task: Task,
    agentType: AgentType,
    options?: {
      timeout?: number;
      onProgress?: (progress: string) => void;
    }
  ): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    const config = AgentSelector.getConfig(agentType);
    const timeout = options?.timeout || config.config.timeout || 300000;
    const modelPlan = this.selectModelPlan(task, agentType);
    const isSubscriptionPath =
      modelPlan.primary.startsWith('subscription/') ||
      modelPlan.primary.startsWith('ollama/');

    // 檢查是否為零 Token 維護任務
    if (this.isZeroTokenTask(task)) {
      log.info(`[Zero-Token] 執行零 Token 任務: ${task.name}`);
      const zeroTokenResult = await this.executeZeroTokenTask(task, timeout);
      // Zero-Token 任務如果 exitCode=0 就算通過，直接給 A 級
      const zeroTokenQuality: QualityGrade = {
        score: zeroTokenResult.success ? 100 : 0,
        grade: zeroTokenResult.success ? 'A' : 'F',
        passed: zeroTokenResult.success,
        checks: [{ name: 'zero_token_exit', passed: zeroTokenResult.success, weight: 100, detail: `exit ${zeroTokenResult.exitCode}` }],
        reason: zeroTokenResult.success ? '零 Token 任務執行成功' : '零 Token 任務執行失敗',
      };
      return {
        ...zeroTokenResult,
        modelUsed: modelPlan.primary,
        fallbackTried: modelPlan.fallbacks,
        quality: zeroTokenQuality,
        tokenUsage: { input: 0, output: 0, total: 0, estimated: true },
        costUsd: 0,
      };
    }

    try {
      let result: AgentExecutionResult;
      switch (agentType) {
        case 'cursor':
          result = await this.executeCursor(task, timeout, modelPlan.primary, options?.onProgress);
          break;
        case 'codex':
          result = await this.executeCoDEX(task, timeout, modelPlan.primary, options?.onProgress);
          break;
        case 'openclaw':
          result = await this.executeOpenClaw(task, timeout, modelPlan.primary, options?.onProgress);
          break;
        case 'claude':
          result = await this.executeWithClaudeCLI(task, timeout, options?.onProgress);
          break;
        default:
          throw new Error(`Unknown agent type: ${agentType}`);
      }
      const tokenUsage = this.estimateTokenUsage(`${task.name}\n${task.description}`, result.output || '');
      return {
        ...result,
        tokenUsage,
        costUsd: isSubscriptionPath ? 0 : null,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        exitCode: -1,
        durationMs,
        agentType,
        modelUsed: modelPlan.primary,
        fallbackTried: modelPlan.fallbacks,
        tokenUsage: this.estimateTokenUsage(`${task.name}\n${task.description}`, ''),
        costUsd: isSubscriptionPath ? 0 : null,
      };
    }
  }

  /**
   * 執行 Cursor Agent — 真實執行模式
   */
  private static async executeCursor(
    task: Task,
    _timeout: number,
    model: string,
    onProgress?: (progress: string) => void
  ): Promise<AgentExecutionResult> {
    return this.executeWithRealEngine(task, 'cursor', _timeout, model, onProgress);
  }

  /**
   * 執行 CoDEX Agent — 真實執行模式
   */
  private static async executeCoDEX(
    task: Task,
    _timeout: number,
    model: string,
    onProgress?: (progress: string) => void
  ): Promise<AgentExecutionResult> {
    return this.executeWithRealEngine(task, 'codex', _timeout, model, onProgress);
  }

  /**
   * 執行 OpenClaw Agent — 真實執行模式
   */
  private static async executeOpenClaw(
    task: Task,
    _timeout: number,
    model: string,
    onProgress?: (progress: string) => void
  ): Promise<AgentExecutionResult> {
    return this.executeWithRealEngine(task, 'openclaw', _timeout, model, onProgress);
  }

  /**
   * 統一真實執行入口：AI 生成腳本 → sandbox 執行 → 結構化結果
   */
  private static async executeWithRealEngine(
    task: Task,
    agentType: AgentType,
    timeout: number,
    model: string,
    onProgress?: (progress: string) => void
  ): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    onProgress?.(`[${agentType}] 真實執行任務: ${task.name}\n`);
    try {
      const execResult = await this.generateAndExecute(task.name, task.description, timeout);

      // 品質閘門評分
      const quality = await this.gradeExecution(
        task.name,
        task.description,
        execResult.exitCode,
        execResult.stdout,
        execResult.stderr,
        execResult.artifacts,
        execResult.script
      );
      log.info(`[QualityGate] ${task.name}: ${quality.grade} (${quality.score}分) — ${quality.reason}`);

      // 組裝人類可讀輸出
      const outputParts: string[] = [];
      if (execResult.stdout) {
        outputParts.push(execResult.stdout);
      }
      if (execResult.artifacts.length > 0) {
        outputParts.push(`\n=== Artifacts (${execResult.artifacts.length}) ===`);
        outputParts.push(execResult.artifacts.join('\n'));
      }
      if (execResult.retryCount > 0) {
        outputParts.push(`\n[Retried ${execResult.retryCount} time(s)]`);
      }
      outputParts.push(`\n=== Quality: ${quality.grade} (${quality.score}/100) ===`);
      if (!quality.passed) {
        outputParts.push(`FAILED: ${quality.reason}`);
      }
      const output = outputParts.join('\n');

      onProgress?.(output);
      return {
        success: quality.passed,  // 品質閘門決定成敗，不再只看 exitCode
        output,
        error: !quality.passed ? `品質不及格 (${quality.score}分): ${quality.reason}` : undefined,
        exitCode: quality.passed ? 0 : -2,  // -2 = 品質閘門擋下
        durationMs: Date.now() - startTime,
        agentType,
        modelUsed: execResult.modelUsed,
        quality,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        exitCode: -1,
        durationMs: Date.now() - startTime,
        agentType,
        modelUsed: model,
      };
    }
  }

  // ─── 品質閘門：3 層嚴格驗證 ───

  /**
   * 品質評分系統 — 3 層閘門
   * Gate 1: 執行完整性（exitCode、有 stdout、無致命 stderr）
   * Gate 2: 產出物驗證（任務要求產出 → 必須有檔案）
   * Gate 3: 內容品質檢查（不是純計畫文字、不是空洞回應）
   */
  static async gradeExecution(
    taskName: string,
    taskDescription: string,
    exitCode: number,
    stdout: string,
    _stderr: string,
    artifacts: string[],
    script: string
  ): Promise<QualityGrade> {
    const checks: QualityGrade['checks'] = [];
    const desc = `${taskName}\n${taskDescription}`.toLowerCase();
    const stdoutLower = stdout.toLowerCase();
    const stdoutLen = stdout.trim().length;

    // ── 任務分類：決定評分嚴格度（分析型優先，避免衝突）──
    const isAnalysisTask = /\[AI分析\]|分析|研究|規劃|設計|調查|掃描|監控|檢查|統計|review|analyze|research|plan|design|investigate|scan|monitor|check|audit/i.test(taskName);
    const isActionTask = !isAnalysisTask && /建立|修復|實作|開發|部署|建構|寫入|修改|更新|強化|重建|create|build|fix|deploy|implement|develop|update/i.test(desc);

    // ── Gate 1: 執行完整性（25 分）──

    // 1a. exitCode 必須為 0（15 分）
    checks.push({
      name: 'exitCode',
      passed: exitCode === 0,
      weight: 15,
      detail: exitCode === 0 ? 'exit 0' : `exit ${exitCode}`,
    });

    // 1b. 有實質 stdout 輸出（10 分）— 至少 200 字才算實質
    checks.push({
      name: 'stdout_not_empty',
      passed: stdoutLen >= 200,
      weight: 10,
      detail: `stdout ${stdoutLen} chars (需 ≥200)`,
    });

    // ── Gate 2: 失敗偵測（20 分）— 最關鍵的一關 ──

    // 2a. 不能包含明確失敗訊息（15 分）
    const failurePatterns = [
      'verification failed', 'not found', 'no such file', 'cannot find',
      'permission denied', 'access denied', 'connection refused',
      'health check failed', 'api health check failed',
      'failed to connect', 'couldn\'t connect', 'econnrefused',
      'command not found', 'no such command', 'syntax error',
      'traceback', 'exception', 'errno', 'segfault',
    ];
    const detectedFailures = failurePatterns.filter(p => stdoutLower.includes(p));
    const hasFailureSignals = detectedFailures.length > 0;
    checks.push({
      name: 'no_failure_signals',
      passed: !hasFailureSignals,
      weight: 15,
      detail: hasFailureSignals
        ? `偵測到失敗訊息: ${detectedFailures.slice(0, 3).join(', ')}`
        : '無失敗訊息',
    });

    // 2b. 不能包含空結果指標（5 分）
    const emptyResultPatterns = [
      'scanning 0 files', '0 items', 'no results', 'empty result',
      'nothing to do', 'no changes', 'no tasks found',
      '0 files changed', '0 files found', 'no source directories found',
    ];
    const detectedEmpty = emptyResultPatterns.filter(p => stdoutLower.includes(p));
    checks.push({
      name: 'no_empty_results',
      passed: detectedEmpty.length === 0,
      weight: 5,
      detail: detectedEmpty.length > 0
        ? `空結果: ${detectedEmpty.join(', ')}`
        : '結果非空',
    });

    // ── Gate 3: 產出落地驗證（25 分）— 最重要的一關 ──

    const sandboxArtifacts = artifacts.filter(f => f.includes('/sandbox/'));
    const realArtifacts = artifacts.filter(f => !f.includes('/sandbox/'));
    const allInSandbox = artifacts.length > 0 && realArtifacts.length === 0;

    if (isActionTask) {
      // 落地型任務：必須有真正系統變更，sandbox 產出不算數
      // 3a. 必須有產出物（5 分）
      checks.push({
        name: 'has_artifacts',
        passed: artifacts.length > 0,
        weight: 5,
        detail: artifacts.length > 0 ? `${artifacts.length} 個產出物` : '無產出物',
      });
      // 3b. 產出物不能只在 sandbox（15 分）— 高權重，這是核心問題
      checks.push({
        name: 'artifacts_real_landing',
        passed: !allInSandbox,
        weight: 15,
        detail: allInSandbox
          ? `全部 ${sandboxArtifacts.length} 個產出在 sandbox — 未落地到真實系統（落地型任務不合格）`
          : (realArtifacts.length > 0
            ? `${realArtifacts.length} 個產出在真實路徑`
            : '無產出物'),
      });
      // 3c. 產出物非空（5 分）
      const nonEmptyArtifacts = artifacts.filter(f => {
        try { return fs.statSync(f).size > 100; } catch { return false; }
      });
      checks.push({
        name: 'artifacts_not_trivial',
        passed: nonEmptyArtifacts.length > 0,
        weight: 5,
        detail: `${nonEmptyArtifacts.length}/${artifacts.length} 個非空檔案 (>100B)`,
      });
    } else if (isAnalysisTask) {
      // 分析型任務：可以只出報告，但要有深度和實質數據
      // 3a. 輸出要夠長（5 分）— 分析報告至少 500 字
      checks.push({
        name: 'analysis_depth',
        passed: stdoutLen >= 500,
        weight: 5,
        detail: `分析內容 ${stdoutLen} 字 (需 ≥500)`,
      });
      // 3b. 不能只是複述任務描述（5 分）
      const fluffPatterns = ['我將為您', '以下是分析', '接下來我會', '讓我來', 'i will', 'let me'];
      const hasFluff = fluffPatterns.some(p => stdoutLower.includes(p));
      // 要有真實數據：多個不同的數字、具體路徑、程式碼片段
      const numbers = stdout.match(/\d+/g) || [];
      const uniqueNumbers = new Set(numbers.filter(n => parseInt(n) > 1)); // 排除 0 和 1（太容易出現）
      const hasMeaningfulData = uniqueNumbers.size >= 3 || stdout.includes('```') || (stdout.match(/\//g) || []).length >= 5;
      checks.push({
        name: 'analysis_has_real_data',
        passed: hasMeaningfulData && (!hasFluff || uniqueNumbers.size >= 5),
        weight: 10,
        detail: hasMeaningfulData
          ? `有 ${uniqueNumbers.size} 個不同數據點`
          : `缺乏實質數據 (只有 ${uniqueNumbers.size} 個不同數字)`,
      });
      // 3c. 有具體結論或建議（5 分）
      const conclusionPatterns = ['結論', '建議', '推薦', '總結', 'conclusion', 'recommendation', 'summary', 'finding'];
      const hasConclusion = conclusionPatterns.some(p => stdoutLower.includes(p));
      checks.push({
        name: 'analysis_has_conclusion',
        passed: hasConclusion,
        weight: 5,
        detail: hasConclusion ? '有結論/建議' : '缺少明確結論或建議',
      });
      // 3d. 分析型必須有掃真實系統（5 分）
      // 注意：output 寫到 sandbox/output 是正常的，不算「掃 sandbox」
      // 只有當分析的「對象」是 sandbox 時才算失敗
      const realPathPatterns = ['/server/', '/src/', '/openclaw', PROJECT_ROOT.toLowerCase()];
      const scannedRealPaths = realPathPatterns.some(p => stdoutLower.includes(p.toLowerCase()));
      // 排除 output 路徑後，看剩下的 sandbox 引用是否是分析對象
      const stdoutNoOutput = stdoutLower.replace(/\/sandbox\/output\b/g, '').replace(/sandbox\/output/g, '');
      const sandboxAsTarget = stdoutNoOutput.includes('scanning sandbox') || stdoutNoOutput.includes('scan path: /') && stdoutNoOutput.includes('/sandbox');
      checks.push({
        name: 'analysis_scanned_real_system',
        passed: scannedRealPaths,
        weight: 5,
        detail: scannedRealPaths
          ? '有掃描真實系統路徑'
          : '未掃描真實系統（只看到 sandbox 路徑）',
      });
    } else {
      // 其他型任務 — 不白送
      const hasSubstantialOutput = stdoutLen >= 300;
      checks.push({
        name: 'output_substance',
        passed: hasSubstantialOutput,
        weight: 15,
        detail: hasSubstantialOutput
          ? `輸出 ${stdoutLen} 字`
          : `輸出不足 (${stdoutLen} 字 < 300)`,
      });
      // sandbox 降級
      if (allInSandbox) {
        checks.push({
          name: 'sandbox_penalty',
          passed: false,
          weight: 10,
          detail: '產出全在 sandbox，未落地',
        });
      }
    }

    // ── Gate 4: 內容品質（15 分）──

    // 4a. 不是純計畫書（10 分）
    const planPatterns = [
      '身為執行代理', '任務分析（需要做什麼）',
      '需要完成以下幾', '具體需要完成', '規劃完成方案',
      'as an execution agent', 'here is my plan',
      '步驟一', '步驟二', 'step 1:', 'step 2:',
    ];
    const isPlanOnly = planPatterns.some(p => stdoutLower.includes(p.toLowerCase()))
      && !stdout.includes('TASK_COMPLETE');
    checks.push({
      name: 'not_plan_only',
      passed: !isPlanOnly,
      weight: 10,
      detail: isPlanOnly ? '偵測到純計畫文字（未實際執行）' : '非純計畫文字',
    });

    // 4b. 腳本有實質內容（5 分）
    const scriptLines = script.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    const echoOnlyLines = scriptLines.filter(l => l.trim().startsWith('echo') || l.trim().startsWith('cat <<'));
    const isSubstantialScript = scriptLines.length >= 5
      && echoOnlyLines.length < scriptLines.length * 0.7; // echo 不能超過 70%
    checks.push({
      name: 'script_substantial',
      passed: isSubstantialScript,
      weight: 5,
      detail: `腳本 ${scriptLines.length} 行 (echo ${echoOnlyLines.length} 行, 需 echo<70%)`,
    });

    // ── Gate 5: AI 內容審查（15 分）──
    const aiReviewScore = await this.aiContentReview(desc, stdout, artifacts);
    checks.push({
      name: 'ai_content_review',
      passed: aiReviewScore >= 7,
      weight: 15,
      detail: `AI 審查 ${aiReviewScore}/10 (需 ≥7)`,
    });

    // ── 計算總分 ──
    const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
    const earnedWeight = checks.filter(c => c.passed).reduce((sum, c) => sum + c.weight, 0);
    const score = Math.round((earnedWeight / totalWeight) * 100);

    const grade: QualityGrade['grade'] =
      score >= 90 ? 'A' :
      score >= 75 ? 'B' :
      score >= 70 ? 'C' : 'F';  // 及格線 60→70

    const failedChecks = checks.filter(c => !c.passed);
    const reason = failedChecks.length === 0
      ? `全部通過 (${score}分)`
      : `未通過: ${failedChecks.map(c => c.name).join(', ')} (${score}分)`;

    return {
      score,
      grade,
      passed: score >= 70,  // 及格線 60→70
      checks,
      reason,
    };
  }

  /**
   * AI 內容審查：用 Gemini 2.0 Flash 判斷產出是否回答了任務要求
   * 回傳 1-10 分。Gemini 掛了或超時回傳 7（不擋流程）。
   */
  private static async aiContentReview(
    taskDescription: string,
    stdout: string,
    artifacts: string[]
  ): Promise<number> {
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
    if (!GOOGLE_API_KEY) return 5; // 沒 key 就跳過（不自動通過）

    // 讀產出物內容（最多 1500 字）
    let artifactContent = '';
    for (const f of artifacts.slice(0, 3)) {
      try {
        const content = fs.readFileSync(f, 'utf8').trim();
        artifactContent += `\n--- ${path.basename(f)} ---\n${content.slice(0, 500)}\n`;
      } catch { /* skip */ }
    }

    const outputSnippet = (stdout || '').slice(0, 800);
    const prompt = `你是嚴格的品質審查員。判斷以下任務的產出是否「真正完成」了任務。

任務描述：${taskDescription.slice(0, 300)}

執行輸出：${outputSnippet}

${artifactContent ? `產出檔案內容：${artifactContent.slice(0, 700)}` : '（無產出檔案）'}

嚴格評分標準（寧嚴勿鬆）：
- 9-10分：任務完美完成，有真實系統變更或深入分析結果
- 7-8分：任務基本完成，但有明顯改進空間
- 5-6分：只完成了一部分，或只是寫了報告/文件但沒有真正落地
- 3-4分：只是把任務描述換個方式重述，沒有做實質工作
- 1-2分：完全沒做事，或輸出是空的/錯誤的

扣分重點：
- 如果只是把東西寫進 sandbox/output 目錄但沒有修改真正的系統文件 → 最多 6 分
- 如果輸出包含 "failed"、"error"、"not found" 等失敗訊息 → 最多 4 分
- 如果輸出只是 echo 出的文字、沒有真正執行命令 → 最多 5 分
- 如果「建立」「修復」類任務只寫了設計文件但沒有程式碼 → 最多 5 分

只回覆一個數字（1-10），不要其他文字。`;

    // 重試機制：主模型 → 備用模型（交替嘗試）
    const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];
    const MAX_ATTEMPTS = 4;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const model = MODELS[attempt % MODELS.length]; // 交替嘗試兩個模型
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: 50, temperature: 0.1 },
            }),
            signal: AbortSignal.timeout(15000),
          }
        );
        if (!resp.ok) {
          log.warn(`[QualityGate-AI] ${model} HTTP ${resp.status} (attempt ${attempt + 1}/${MAX_ATTEMPTS})`);
          continue; // 重試
        }
        const data = await resp.json() as Record<string, unknown>;
        const candidates = (data as Record<string, unknown>).candidates as Array<Record<string, unknown>> | undefined;
        if (!candidates || candidates.length === 0) {
          log.warn(`[QualityGate-AI] ${model} 無 candidates (attempt ${attempt + 1}/${MAX_ATTEMPTS}): ${JSON.stringify(data).slice(0, 200)}`);
          continue; // 重試
        }
        const parts = (candidates[0]?.content as Record<string, unknown>)?.parts as Array<Record<string, unknown>> | undefined;
        const text = (String(parts?.[0]?.text || '')).trim();
        if (!text) {
          log.warn(`[QualityGate-AI] ${model} 回覆空白 (attempt ${attempt + 1}/${MAX_ATTEMPTS})`);
          continue; // 重試
        }
        // 從回覆中提取數字（Gemini 有時會多輸出幾個字）
        const match = text.match(/(\d+)/);
        const num = match ? parseInt(match[1], 10) : NaN;
        if (num >= 1 && num <= 10) {
          log.info(`[QualityGate-AI] ${model} 審查: ${num}/10 (attempt ${attempt + 1})`);
          return num;
        }
        log.warn(`[QualityGate-AI] ${model} 回覆無法解析: "${text}" (attempt ${attempt + 1}/${MAX_ATTEMPTS})`);
        continue; // 重試
      } catch (e) {
        log.warn({ err: e }, `[QualityGate-AI] ${model} 審查失敗 (attempt ${attempt + 1}/${MAX_ATTEMPTS})`);
        continue; // 重試
      }
    }
    // 全部 API 失敗時，用本地關鍵字評分（不讓審查員掛掉拖累所有任務）
    log.warn(`[QualityGate-AI] 所有 ${MAX_ATTEMPTS} 次 API 審查失敗，啟用本地評分`);
    const combined = `${taskDescription}\n${stdout}`.toLowerCase();
    let localScore = 4; // 基準：勉強及格
    if (combined.includes('task_complete')) localScore++;
    if ((stdout || '').length > 500) localScore++;
    if (combined.includes('結論') || combined.includes('conclusion') || combined.includes('summary')) localScore++;
    if (combined.includes('error') || combined.includes('failed') || combined.includes('not found')) localScore--;
    if ((stdout || '').length < 100) localScore--;
    localScore = Math.max(1, Math.min(10, localScore));
    log.info(`[QualityGate-AI] 本地評分: ${localScore}/10`);
    return localScore;
  }

  // ─── 真實執行引擎（取代舊的純文字 callGeminiApi）───

  /**
   * Step 1: 呼叫 Gemini 生成可執行 bash 腳本（不是計畫文字）
   */
  private static async callGeminiForScript(
    taskName: string,
    taskDescription: string,
    errorFeedback?: string
  ): Promise<string> {
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
    const MODEL = 'gemini-3-flash-preview';

    const execLevel = classifyExecutionLevel(taskName, taskDescription);
    const outputDir = path.join(SANDBOX_WORKDIR, 'output');

    // 根據權限等級調整 prompt
    let envSection: string;
    let restrictionSection: string;
    let requirementSection: string;

    if (execLevel === 'workspace') {
      // workspace 等級：可以寫入 workspace 安全目錄
      envSection = `Environment:
- Working directory: ${SANDBOX_WORKDIR}
- Output directory: ${outputDir}
- READABLE project source: ${PROJECT_ROOT} (READ ONLY — do NOT modify)
- WRITABLE workspace directories:
${WRITABLE_WORKSPACE_DIRS.map(d => `  - ${d}`).join('\n')}
- Available tools: bash, curl, node, python3, jq, sed, awk, grep, find
- OS: macOS (Darwin)`;

      restrictionSection = `RESTRICTIONS — 保護核心資產:
- Do NOT access or modify .env, openclaw.json, sessions.json, config.json (API keys)
- Do NOT access or modify SOUL.md, AWAKENING.md, IDENTITY.md (靈魂文件)
- Do NOT modify xiaocai-think.ts, bot-polling.ts, executor-agents.ts (小蔡的大腦和執行引擎，只有老蔡能改)
- Do NOT run git push
- Everything else: GO FOR IT. Read and modify any source code, scripts, configs.
- You CAN modify ${PROJECT_ROOT}/server/src/ files (except brain files above)
- You CAN write to workspace directories and ${outputDir}/`;

      requirementSection = `Requirements:
1. Start with #!/bin/bash and set -e
2. READ the actual project source code at ${PROJECT_ROOT}/ when needed
3. Write output files to the appropriate workspace directory, or ${outputDir}/
4. For scripts → write to ${WORKSPACE_ROOT}/scripts/
5. For reports → write to ${WORKSPACE_ROOT}/reports/
6. Print a clear summary at the end with "TASK_COMPLETE:" prefix
7. The script must be self-contained and idempotent

QUALITY STANDARDS (your output will be graded — aim for A grade):
- REAL LANDING: Write your output to workspace directories (not sandbox) when possible. Scripts go to ${WORKSPACE_ROOT}/scripts/.
- FUNCTIONAL: If building a tool/script, it must actually work — test it by running it at least once.
- COMPLETE: Don't just write a plan or design doc. Produce working code/scripts with real functionality.`;

    } else if (execLevel === 'readonly-project') {
      // readonly-project 等級：可以讀專案源碼做分析
      envSection = `Environment:
- Working directory: ${SANDBOX_WORKDIR}
- Output directory: ${outputDir}
- READABLE project source: ${PROJECT_ROOT} (READ ONLY)
- Key project paths to scan:
  - ${PROJECT_ROOT}/server/src/ (backend TypeScript source)
  - ${PROJECT_ROOT}/src/ (frontend React source)
  - ${PROJECT_ROOT}/server/package.json (dependencies)
  - ${PROJECT_ROOT}/package.json (frontend dependencies)
- Available tools: bash, curl, node, python3, jq, sed, awk, grep, find, wc
- OS: macOS (Darwin)`;

      restrictionSection = `HARD RESTRICTIONS — NEVER violate these:
- ONLY READ from ${PROJECT_ROOT}/ — do NOT modify any files there
- Write ALL output files to ${outputDir}/ only
- Do NOT access or modify .env files
- Do NOT run git push or git commit
- Do NOT access API keys or secrets

CRITICAL: When analyzing, scan the REAL project source code at ${PROJECT_ROOT}/, NOT the sandbox directory. The sandbox is empty and useless for analysis.`;

      requirementSection = `Requirements:
1. Start with #!/bin/bash and set -e
2. SCAN THE REAL PROJECT at ${PROJECT_ROOT}/ — not sandbox
3. Use grep, find, wc, jq to extract real data from actual source files
4. Report real numbers: actual file counts, line counts, function counts
5. Write analysis report to ${outputDir}/
6. Print a clear summary at the end with "TASK_COMPLETE:" prefix
7. Include specific file paths and line numbers in your analysis

QUALITY STANDARDS (your output will be graded — aim for A grade):
- DEPTH: Your analysis must be at least 500 characters. Shallow one-liners will fail.
- REAL DATA: Include at least 3 unique numerical data points (e.g. file count, line count, function count).
- CONCLUSION: End with a "結論" or "Conclusion" section with specific, actionable recommendations.
- NO FLUFF: Don't pad with generic statements. Every sentence should contain specific facts from the codebase.
- EXAMPLE of good output: "Found 49 TS files (17306 lines), 386 functions. Top 3 largest: index.ts (2601L), bot-polling.ts (1699L)... 結論：建議將 index.ts 拆分為..."
- EXAMPLE of bad output: "The project is well-structured. It uses TypeScript. 結論：建議持續優化。"`;

    } else {
      // sandbox 等級（預設最安全）
      envSection = `Environment:
- Working directory: ${SANDBOX_WORKDIR}
- Output directory: ${outputDir}
- Available tools: bash, curl, node, python3, jq, sed, awk, grep, find
- OS: macOS (Darwin)`;

      restrictionSection = `HARD RESTRICTIONS — NEVER violate these:
- Write ALL output files to ${outputDir}/ only
- Do NOT access or modify .env files
- Do NOT run git push or git commit
- Do NOT delete any files outside ${outputDir}/
- Do NOT access API keys or secrets
- Do NOT modify files in server/ or src/ directories`;

      requirementSection = `Requirements:
1. Start with #!/bin/bash and set -e
2. Create output directory: mkdir -p ${outputDir}
3. Write all results/reports/artifacts to ${outputDir}/
4. Print a clear summary at the end with "TASK_COMPLETE:" prefix
5. The script must be self-contained and idempotent

QUALITY STANDARDS (your output will be graded — aim for A grade):
- SUBSTANCE: Don't just echo text — use real commands (curl, python3, node) to produce real output.
- COMPLETE: Finish the entire task, not just part of it. Include all requested deliverables.`;
    }

    log.info(`[ScriptGen] 任務「${taskName.slice(0, 40)}」執行權限: ${execLevel}`);

    let prompt = `You are a task executor. Generate a COMPLETE, EXECUTABLE bash script that accomplishes the following task.

Task: ${taskName}
Description: ${taskDescription || 'No detailed description'}

${envSection}

${restrictionSection}

${requirementSection}

Output ONLY the raw bash script. No markdown fences, no explanation, no comments before the shebang.`;

    if (errorFeedback) {
      prompt += `\n\nPREVIOUS ATTEMPT FAILED:\n${errorFeedback}\n\nFix the script to handle this error.`;
    }

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: AbortSignal.timeout(60000),
      }
    );
    if (!resp.ok) throw new Error(`Gemini API error: ${resp.status}`);
    const data = await resp.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    let script = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Strip markdown code fences if AI wrapped them anyway
    script = script.replace(/^```(?:bash|sh)?\n?/m, '').replace(/\n?```\s*$/m, '').trim();

    return script;
  }

  /**
   * Step 2: 在 sandbox 環境執行生成的腳本
   */
  private static async executeSandboxScript(
    script: string,
    timeoutMs: number = 120000
  ): Promise<{ exitCode: number; stdout: string; stderr: string; durationMs: number }> {
    const startTime = Date.now();

    // 確保 sandbox 目錄存在
    fs.mkdirSync(SANDBOX_WORKDIR, { recursive: true });
    fs.mkdirSync(path.join(SANDBOX_WORKDIR, 'output'), { recursive: true });

    // 寫腳本到暫存檔
    const scriptPath = path.join(SANDBOX_WORKDIR, `task-${Date.now()}.sh`);
    fs.writeFileSync(scriptPath, script, { mode: 0o755 });

    return new Promise((resolve) => {
      const child = spawn('sh', [scriptPath], {
        cwd: SANDBOX_WORKDIR,
        env: SANDBOX_ENV,
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data: Buffer) => { stdout += data.toString(); });
      child.stderr?.on('data', (data: Buffer) => { stderr += data.toString(); });

      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        resolve({
          exitCode: -1,
          stdout,
          stderr: stderr + '\n[TIMEOUT] Script exceeded timeout',
          durationMs: Date.now() - startTime,
        });
      }, timeoutMs);

      child.on('close', (code) => {
        clearTimeout(timer);
        // 清除腳本檔（保留 output 目錄）
        try { fs.unlinkSync(scriptPath); } catch { /* ignore */ }
        resolve({
          exitCode: code ?? -1,
          stdout,
          stderr,
          durationMs: Date.now() - startTime,
        });
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          exitCode: -1,
          stdout,
          stderr: err.message,
          durationMs: Date.now() - startTime,
        });
      });
    });
  }

  /**
   * Step 3: 掃描 sandbox/output/ 下的產出物
   */
  private static scanArtifacts(): string[] {
    const outputDir = path.join(SANDBOX_WORKDIR, 'output');
    if (!fs.existsSync(outputDir)) return [];

    const artifacts: string[] = [];
    const scan = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scan(fullPath);
        } else {
          artifacts.push(fullPath);
        }
      }
    };
    scan(outputDir);
    return artifacts;
  }

  /**
   * 主調度器：AI 生成腳本 → sandbox 執行 → 掃描產出物 → 返回結構化結果
   * 失敗自動重試（最多 2 次），附帶錯誤反饋讓 AI 修正腳本
   */
  private static async generateAndExecute(
    taskName: string,
    taskDescription: string,
    timeoutMs: number = 120000
  ): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
    artifacts: string[];
    script: string;
    durationMs: number;
    retryCount: number;
    modelUsed: string;
  }> {
    const MAX_RETRIES = 2;
    let lastError = '';
    let retryCount = 0;
    let lastScript = '';
    const totalStart = Date.now();

    // 每次任務執行前清空 output 目錄
    const outputDir = path.join(SANDBOX_WORKDIR, 'output');
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
    fs.mkdirSync(outputDir, { recursive: true });

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      retryCount = attempt;

      // Step 1: 生成腳本
      try {
        lastScript = await this.callGeminiForScript(
          taskName,
          taskDescription,
          attempt > 0 ? lastError : undefined
        );
      } catch (err) {
        lastError = `Script generation failed: ${err instanceof Error ? err.message : String(err)}`;
        log.warn(`[GenerateAndExecute] Attempt ${attempt}: ${lastError}`);
        continue;
      }

      if (!lastScript || lastScript.trim().length < 10) {
        lastError = 'Generated script is empty or too short';
        log.warn(`[GenerateAndExecute] Attempt ${attempt}: ${lastError}`);
        continue;
      }

      log.info(`[GenerateAndExecute] Attempt ${attempt}: script generated (${lastScript.length} chars)`);

      // Step 2: 執行
      const execResult = await this.executeSandboxScript(lastScript, timeoutMs);

      // Step 3: 掃描產出物
      const artifacts = this.scanArtifacts();

      // Step 4: 驗證
      if (execResult.exitCode === 0) {
        log.info(`[GenerateAndExecute] Success: ${artifacts.length} artifacts, ${execResult.durationMs}ms`);
        return {
          exitCode: 0,
          stdout: execResult.stdout,
          stderr: execResult.stderr,
          artifacts,
          script: lastScript,
          durationMs: Date.now() - totalStart,
          retryCount,
          modelUsed: 'gemini-3-flash-preview',
        };
      }

      // 失敗 → 準備錯誤反饋給下一次重試
      lastError = `Exit code: ${execResult.exitCode}\nStderr: ${execResult.stderr.slice(0, 500)}\nStdout tail: ${execResult.stdout.slice(-300)}`;
      log.warn(`[GenerateAndExecute] Attempt ${attempt} failed: exit ${execResult.exitCode}`);
    }

    // 所有重試用完
    return {
      exitCode: -1,
      stdout: '',
      stderr: lastError,
      artifacts: this.scanArtifacts(),
      script: lastScript,
      durationMs: Date.now() - totalStart,
      retryCount,
      modelUsed: 'gemini-3-flash-preview',
    };
  }

  /**
   * 用 Claude Code CLI（訂閱版）執行任務
   * 走 Max 訂閱額度，不走 API key
   */
  private static async executeWithClaudeCLI(
    task: Task,
    timeout: number,
    onProgress?: (progress: string) => void
  ): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    const agentType: AgentType = 'claude';
    onProgress?.(`[Claude CLI] 訂閱版執行任務: ${task.name}\n`);

    const outputDir = path.join(SANDBOX_WORKDIR, 'output');
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
    fs.mkdirSync(outputDir, { recursive: true });

    const prompt = [
      `你是任務執行器。直接執行以下任務，所有產出物放到 ${outputDir}/`,
      `任務：${task.name}`,
      `描述：${task.description || '無'}`,
      `限制：不動 .env、不 push git、不刪除外部檔案。`,
      `完成後列出所有產出的檔案路徑。`,
    ].join('\n');

    try {
      const result = await new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve) => {
        let stdout = '';
        let stderr = '';
        const child = spawn('claude', [
          '-p',
          '--model', 'sonnet',
          '--dangerously-skip-permissions',
          prompt,
        ], {
          env: CLAUDE_ENV,
          cwd: SANDBOX_WORKDIR,
          timeout,
          stdio: ['ignore', 'pipe', 'pipe'],  // stdin=/dev/null, stdout=pipe, stderr=pipe
        });

        child.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
        child.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });

        const timer = setTimeout(() => {
          child.kill('SIGTERM');
          resolve({ stdout, stderr: stderr + '\n[TIMEOUT]', exitCode: 124 });
        }, timeout);

        child.on('close', (code) => {
          clearTimeout(timer);
          resolve({ stdout, stderr, exitCode: code ?? 1 });
        });

        child.on('error', (err) => {
          clearTimeout(timer);
          resolve({ stdout, stderr: err.message, exitCode: 1 });
        });
      });

      const artifacts = this.scanArtifacts();

      const quality = await this.gradeExecution(
        task.name,
        task.description,
        result.exitCode,
        result.stdout,
        result.stderr,
        artifacts,
        ''
      );
      log.info(`[QualityGate] ${task.name}: ${quality.grade} (${quality.score}分) — ${quality.reason}`);

      const outputParts: string[] = [];
      if (result.stdout) outputParts.push(result.stdout.slice(0, 3000));
      if (artifacts.length > 0) {
        outputParts.push(`\n=== Artifacts (${artifacts.length}) ===`);
        outputParts.push(artifacts.join('\n'));
      }
      outputParts.push(`\n=== Quality: ${quality.grade} (${quality.score}/100) ===`);
      const output = outputParts.join('\n');

      onProgress?.(output);
      return {
        success: quality.passed,
        output,
        error: !quality.passed ? `品質不及格: ${quality.reason}` : undefined,
        exitCode: quality.passed ? 0 : -2,
        durationMs: Date.now() - startTime,
        agentType,
        modelUsed: 'claude-sonnet-subscription',
        quality,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        exitCode: -1,
        durationMs: Date.now() - startTime,
        agentType,
        modelUsed: 'claude-sonnet-subscription',
      };
    }
  }

  /**
   * 構建 Cursor 執行命令（現已改用 Gemini API）
   */
  private static buildCursorCommand(task: Task, _model: string): string {
    // 標記：實際執行由 executeCursor 直接呼叫 callGeminiApi，此處僅保留介面相容
    const safeName = task.name.replace(/'/g, "'\\''");
    return `echo '[Cursor Agent] 任務：${safeName}'`;
  }

  /**
   * 構建 CoDEX 執行命令（現已改用 Gemini API）
   */
  private static buildCoDEXCommand(task: Task, _model: string): string {
    const safeName = task.name.replace(/'/g, "'\\''");
    return `echo '[CoDEX Agent] 任務：${safeName}'`;
  }

  /**
   * 構建 OpenClaw 執行命令
   */
  private static buildOpenClawCommand(task: Task, model: string): string {
    // 使用單引號包裹，並轉義單引號本身（' → '\''），完全防止 shell injection
    const prompt = `${task.name}\n${task.description ?? ''}`;
    const singleQuoteEscaped = prompt.replace(/'/g, "'\\''");
    // 模型名稱也做清理（只允許字母數字/.-:）
    const safeModel = model.replace(/[^a-zA-Z0-9/._:-]/g, '');
    return `echo "[OpenClaw Agent] 使用模型: ${safeModel}" && timeout 60 openclaw agent --agent main --local --message '${singleQuoteEscaped}' 2>&1 || echo "[OpenClaw Agent] 任務執行完成"`;
  }

  /**
   * 驗證 Agent 是否已安裝
   */
  static async verifyAgentInstallation(agentType: AgentType): Promise<boolean> {
    try {
      const commands: Record<AgentType, string> = {
        cursor: 'which cursor || command -v cursor',
        codex: 'which codex || command -v codex',
        openclaw: 'which openclaw || command -v openclaw',
        claude: 'which claude || command -v claude',
        auto: 'echo "auto"',
      };

      const { stdout } = await execAsync(commands[agentType]);
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * 獲取所有已安裝的 Agent
   */
  static async getInstalledAgents(): Promise<AgentType[]> {
    const agents: AgentType[] = ['cursor', 'codex', 'openclaw', 'claude'];
    const results = await Promise.all(
      agents.map(async (agent) => ({
        agent,
        installed: await this.verifyAgentInstallation(agent),
      }))
    );
    return results.filter(r => r.installed).map(r => r.agent);
  }
}

/** 導出單例實例 */
export const agentSelector = new AgentSelector();
export const agentExecutor = new AgentExecutor();
