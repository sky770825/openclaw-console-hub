/**
 * Agent 選擇器和執行器
 * 支援 Agent 類型：Cursor / CoDEX / OpenClaw / Auto
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import type { AgentType, Task, Run, AgentExecutorConfig } from './types.js';

const execAsync = promisify(exec);

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
}

/** Agent 選擇器 */
export class AgentSelector {
  /**
   * 根據任務特性選擇最適合的 Agent
   */
  static selectAgent(task: Task): AgentType {
    // 如果已指定 Agent，直接使用
    if (task.agent?.type && task.agent.type !== 'auto') {
      return task.agent.type;
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

    try {
      switch (agentType) {
        case 'cursor':
          return await this.executeCursor(task, timeout, options?.onProgress);
        case 'codex':
          return await this.executeCoDEX(task, timeout, options?.onProgress);
        case 'openclaw':
          return await this.executeOpenClaw(task, timeout, options?.onProgress);
        default:
          throw new Error(`Unknown agent type: ${agentType}`);
      }
    } catch (error) {
      const durationMs = Date.now() - startTime;
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        exitCode: -1,
        durationMs,
        agentType,
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
    onProgress?: (progress: string) => void
  ): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    
    // 構建 Cursor 執行命令
    const command = this.buildCursorCommand(task);
    
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
    onProgress?: (progress: string) => void
  ): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    
    // 構建 CoDEX 執行命令
    const command = this.buildCoDEXCommand(task);
    
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
    onProgress?: (progress: string) => void
  ): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    
    // 構建 OpenClaw 執行命令
    const command = this.buildOpenClawCommand(task);
    
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
        });
      });
    });
  }

  /**
   * 構建 Cursor 執行命令
   */
  private static buildCursorCommand(task: Task): string {
    const prompt = `${task.name}\n${task.description}`;
    const escapedPrompt = prompt.replace(/"/g, '\\"');
    
    // 使用 cursor 命令行或 MCP Server
    // 優先使用 MCP Server，如果不可用則使用 cursor 命令行
    return `cursor --agent --prompt "${escapedPrompt}" 2>&1 || echo "Cursor command not available"`;
  }

  /**
   * 構建 CoDEX 執行命令
   */
  private static buildCoDEXCommand(task: Task): string {
    const prompt = `${task.name}\n${task.description}`;
    const escapedPrompt = prompt.replace(/"/g, '\\"');
    
    return `codex "${escapedPrompt}" 2>&1 || echo "CoDEX command not available"`;
  }

  /**
   * 構建 OpenClaw 執行命令
   */
  private static buildOpenClawCommand(task: Task): string {
    const prompt = `${task.name}\n${task.description}`;
    const escapedPrompt = prompt.replace(/"/g, '\\"');
    
    // 使用 OpenClaw CLI 或直接呼叫 API
    return `openclaw run --prompt "${escapedPrompt}" 2>&1 || echo "OpenClaw command not available"`;
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
