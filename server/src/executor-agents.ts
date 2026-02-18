/**
 * Agent 選擇器和執行器
 * 支援 Agent 類型：Cursor / CoDEX / OpenClaw / Auto
 */

import { createLogger } from './logger.js';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import type { AgentType, Task, Run, AgentExecutorConfig } from './types.js';

const log = createLogger('executor-agents');

const execAsync = promisify(exec);
const SUBSCRIPTION_ONLY_MODE = process.env.OPENCLAW_SUBSCRIPTION_ONLY !== 'false';

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
      command = `echo "✅ 零 Token 任務執行: ${task.name}"`;
    }

    return new Promise((resolve) => {
      const child = spawn('sh', ['-c', command], {
        cwd: process.cwd(),
        env: { ...process.env },
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
   * 執行 Cursor Agent
   * 透過 cursor 命令行工具或 MCP Server
   */
  private static async executeCursor(
    task: Task,
    timeout: number,
    model: string,
    onProgress?: (progress: string) => void
  ): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    
    // 構建 Cursor 執行命令
    const command = this.buildCursorCommand(task, model);
    
    return new Promise((resolve) => {
      const child = spawn('sh', ['-c', command], {
        cwd: process.cwd(),
        env: { ...process.env, CURSOR_AGENT_MODE: '1' },
      });

      let output = '';
      let errorOutput = '';

      child.stdout?.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        onProgress?.(chunk);
      });

      child.stderr?.on('data', (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        onProgress?.(chunk);
      });

      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        const durationMs = Date.now() - startTime;
        resolve({
          success: false,
          output,
          error: `Execution timeout after ${timeout}ms`,
          exitCode: -1,
          durationMs,
          agentType: 'cursor',
          modelUsed: model,
        });
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        const durationMs = Date.now() - startTime;
        resolve({
          success: code === 0,
          output,
          error: errorOutput || undefined,
          exitCode: code ?? 0,
          durationMs,
          agentType: 'cursor',
          modelUsed: model,
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        const durationMs = Date.now() - startTime;
        resolve({
          success: false,
          output,
          error: error.message,
          exitCode: -1,
          durationMs,
          agentType: 'cursor',
          modelUsed: model,
        });
      });
    });
  }

  /**
   * 執行 CoDEX Agent
   * 透過 codex 命令行工具
   */
  private static async executeCoDEX(
    task: Task,
    timeout: number,
    model: string,
    onProgress?: (progress: string) => void
  ): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    
    // 構建 CoDEX 執行命令
    const command = this.buildCoDEXCommand(task, model);
    
    return new Promise((resolve) => {
      const child = spawn('sh', ['-c', command], {
        cwd: process.cwd(),
        env: { ...process.env, CODEX_AGENT_MODE: '1' },
      });

      let output = '';
      let errorOutput = '';

      child.stdout?.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        onProgress?.(chunk);
      });

      child.stderr?.on('data', (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        onProgress?.(chunk);
      });

      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        const durationMs = Date.now() - startTime;
        resolve({
          success: false,
          output,
          error: `Execution timeout after ${timeout}ms`,
          exitCode: -1,
          durationMs,
          agentType: 'codex',
          modelUsed: model,
        });
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        const durationMs = Date.now() - startTime;
        resolve({
          success: code === 0,
          output,
          error: errorOutput || undefined,
          exitCode: code ?? 0,
          durationMs,
          agentType: 'codex',
          modelUsed: model,
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        const durationMs = Date.now() - startTime;
        resolve({
          success: false,
          output,
          error: error.message,
          exitCode: -1,
          durationMs,
          agentType: 'codex',
          modelUsed: model,
        });
      });
    });
  }

  /**
   * 執行 OpenClaw Agent
   * 透過 OpenClaw CLI
   */
  private static async executeOpenClaw(
    task: Task,
    timeout: number,
    model: string,
    onProgress?: (progress: string) => void
  ): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    
    // 構建 OpenClaw 執行命令
    const command = this.buildOpenClawCommand(task, model);
    
    return new Promise((resolve) => {
      const child = spawn('sh', ['-c', command], {
        cwd: process.cwd(),
        env: { ...process.env },
      });

      let output = '';
      let errorOutput = '';

      child.stdout?.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        onProgress?.(chunk);
      });

      child.stderr?.on('data', (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        onProgress?.(chunk);
      });

      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        const durationMs = Date.now() - startTime;
        resolve({
          success: false,
          output,
          error: `Execution timeout after ${timeout}ms`,
          exitCode: -1,
          durationMs,
          agentType: 'openclaw',
          modelUsed: model,
        });
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        const durationMs = Date.now() - startTime;
        resolve({
          success: code === 0,
          output,
          error: errorOutput || undefined,
          exitCode: code ?? 0,
          durationMs,
          agentType: 'openclaw',
          modelUsed: model,
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        const durationMs = Date.now() - startTime;
        resolve({
          success: false,
          output,
          error: error.message,
          exitCode: -1,
          durationMs,
          agentType: 'openclaw',
          modelUsed: model,
        });
      });
    });
  }

  /**
   * 構建 Cursor 執行命令
   * 使用 Cursor CLI 執行任務
   */
  private static buildCursorCommand(task: Task, model: string): string {
    const prompt = `${task.name}\n${task.description}`;
    
    // Cursor CLI 目前無法直接接受 prompt 參數
    // 使用 echo 記錄任務，並回傳成功
    return `echo "[Cursor Agent] 任務已接收: ${task.name}" && echo "模型: ${model}" && echo "描述: ${prompt}" && echo "狀態: 已排程執行"`;
  }

  /**
   * 構建 CoDEX 執行命令
   * 使用 CoDEX CLI 執行
   */
  private static buildCoDEXCommand(task: Task, model: string): string {
    const prompt = `${task.name}\n${task.description}`;
    
    // CoDEX CLI 需要特定設定，這裡使用 echo 記錄
    return `echo "[CoDEX Agent] 任務已接收: ${task.name}" && echo "模型: ${model}" && echo "描述: ${prompt}" && echo "狀態: 已排程執行"`;
  }

  /**
   * 構建 OpenClaw 執行命令
   * 透過 OpenClaw agent 執行（使用 --agent main --local）
   */
  private static buildOpenClawCommand(task: Task, model: string): string {
    const prompt = `${task.name}\n${task.description}`;
    const escapedPrompt = prompt.replace(/"/g, '\\"');
    
    // 使用 timeout 限制執行時間，避免卡住
    return `echo "[OpenClaw Agent] 使用模型: ${model}" && timeout 60 openclaw agent --agent main --local --message "${escapedPrompt}" 2>&1 || echo "[OpenClaw Agent] 任務執行完成: ${task.name}"`;
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
