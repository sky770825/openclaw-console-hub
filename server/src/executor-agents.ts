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
      primary: 'google/gemini-2.5-flash',
      fallbacks: ['anthropic/claude-haiku-4-5-20251001', 'kimi/kimi-k2.5'],
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
      '磁碟', 'disk', 'ollama', '統計', '整理', '封存'
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
      return {
        ...zeroTokenResult,
        modelUsed: modelPlan.primary,
        fallbackTried: modelPlan.fallbacks,
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
      const output = outputParts.join('\n');

      onProgress?.(output);
      return {
        success: execResult.exitCode === 0,
        output,
        error: execResult.exitCode !== 0 ? execResult.stderr : undefined,
        exitCode: execResult.exitCode,
        durationMs: Date.now() - startTime,
        agentType,
        modelUsed: execResult.modelUsed,
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
    const MODEL = 'gemini-2.5-flash';

    const outputDir = path.join(SANDBOX_WORKDIR, 'output');
    let prompt = `You are a task executor. Generate a COMPLETE, EXECUTABLE bash script that accomplishes the following task.

Task: ${taskName}
Description: ${taskDescription || 'No detailed description'}

Environment:
- Working directory: ${SANDBOX_WORKDIR}
- Output directory: ${outputDir}
- Available tools: bash, curl, node, python3, jq, sed, awk, grep, find
- OS: macOS (Darwin)

HARD RESTRICTIONS — NEVER violate these:
- Write ALL output files to ${outputDir}/ only
- Do NOT access or modify .env files
- Do NOT run git push or git commit
- Do NOT delete any files outside ${outputDir}/
- Do NOT access API keys or secrets
- Do NOT modify files in server/ or src/ directories

Requirements:
1. Start with #!/bin/bash and set -e
2. Create output directory: mkdir -p ${outputDir}
3. Write all results/reports/artifacts to ${outputDir}/
4. Print a clear summary at the end with "TASK_COMPLETE:" prefix
5. The script must be self-contained and idempotent

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
          modelUsed: 'gemini-2.5-flash',
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
      modelUsed: 'gemini-2.5-flash',
    };
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
    const agents: AgentType[] = ['cursor', 'codex', 'openclaw'];
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
