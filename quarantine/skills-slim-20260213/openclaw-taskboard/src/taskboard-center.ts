/**
 * TaskBoard Center - 中控台統一入口
 * 
 * 整合所有防卡機制與多層 Agent 指揮系統
 * 這是任務板的核心大腦 🧠
 */

// 導入所有模組
import {
  executorAgents,
  planTaskExecution,
  getAgentHealth,
  analyzeTask,
  selectAgent,
  type AgentType,
  type TaskAnalysis,
  type ExecutorConfig
} from './executor-agents';

import {
  workflowEngine,
  type Workflow,
  type WorkflowTask,
  type WorkflowResult
} from './workflow-engine';

import {
  circuitBreaker,
  watchdog,
  parallelExecutor,
  withCircuitBreaker,
  createTelegramNotifier,
  getFullHealthReport,
  initializeTaskBoard,
  type HealthStatus,
  type WatchdogAlert
} from './anti-stuck-index';

import {
  getMemoryClient,
  memoryIntegration,
  type TaskMemory,
  type MemoryContext,
  type MemoryQueryOptions
} from './lib/memory-integration';

// ============================================================
// 中控台配置
// ============================================================

export interface CenterConfig {
  // 通知設定
  telegram?: {
    enabled: boolean;
    sendMessage: (message: string) => Promise<void>;
  };
  
  // 防卡機制
  antiStuck: {
    circuitBreaker: boolean;
    watchdog: boolean;
    parallelExecutor: boolean;
  };
  
  // 記憶系統
  memory?: {
    enabled: boolean;
    recordFailures?: boolean;
    similarityThreshold?: number;
  };
  
  // 預設值
  defaults: {
    timeout: number;
    maxRetries: number;
    approvalMode: 'auto' | 'manual' | 'suggest';
  };
}

const DEFAULT_CONFIG: CenterConfig = {
  antiStuck: {
    circuitBreaker: true,
    watchdog: true,
    parallelExecutor: true
  },
  memory: {
    enabled: true,
    recordFailures: true,
    similarityThreshold: 0.6
  },
  defaults: {
    timeout: 300,
    maxRetries: 2,
    approvalMode: 'auto'
  }
};

// ============================================================
// TaskBoard Center 類
// ============================================================

class TaskBoardCenter {
  private config: CenterConfig;
  private isInitialized: boolean = false;
  private memoryClient: ReturnType<typeof getMemoryClient> | null = null;
  private currentMemoryContext: MemoryContext | null = null;

  constructor(config: Partial<CenterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 初始化中控台
   */
  initialize(): void {
    if (this.isInitialized) {
      console.log('[TaskBoardCenter] 已經初始化');
      return;
    }

    console.log('🚀 [TaskBoardCenter] 初始化多層 Agent 指揮中心...');

    // 初始化防卡機制
    if (this.config.antiStuck.watchdog) {
      watchdog.start();
      
      // 設定 Telegram 通知
      if (this.config.telegram?.enabled) {
        watchdog.onAlert(createTelegramNotifier(this.config.telegram.sendMessage));
      }
      
      console.log('  ✅ Watchdog 已啟動');
    }

    if (this.config.antiStuck.circuitBreaker) {
      console.log('  ✅ Circuit Breaker 已啟用');
    }

    if (this.config.antiStuck.parallelExecutor) {
      console.log('  ✅ Parallel Executor 就緒');
    }

    console.log('  ✅ Workflow Engine 就緒');
    console.log('  ✅ Agent Selector 就緒');

    // 初始化記憶系統
    if (this.config.memory?.enabled !== false) {
      memoryIntegration.initialize();
      console.log('  ✅ SeekDB Memory 就緒');
    }

    this.isInitialized = true;
    console.log('🎯 [TaskBoardCenter] 中控台已就緒！');
  }

  /**
   * 指派任務（智能分析 + 自動編排 + 記憶查詢）
   */
  async assignTask(
    taskDescription: string,
    options: {
      workingDir?: string;
      files?: string[];
      forceAgent?: AgentType;
      priority?: 'low' | 'normal' | 'high';
      useMemory?: boolean;
    } = {}
  ): Promise<{
    workflowId: string;
    analysis: TaskAnalysis;
    plan: string;
    memoryContext?: MemoryContext;
  }> {
    if (!this.isInitialized) {
      this.initialize();
    }

    console.log(`\n📋 [TaskBoardCenter] 收到任務: ${taskDescription}`);

    // 1. 查詢相關記憶（如果啟用）
    let memoryContext: MemoryContext | undefined;
    const useMemory = options.useMemory !== false && this.config.memory?.enabled !== false;
    
    if (useMemory && this.memoryClient) {
      try {
        console.log('  🔍 查詢相關記憶...');
        memoryContext = await this.memoryClient.getMemoryContext(taskDescription, {
          strategy: 'hybrid',
          threshold: this.config.memory?.similarityThreshold ?? 0.5,
          limit: 5,
          hours: 168 // 7天
        });
        this.currentMemoryContext = memoryContext;
        
        if (memoryContext.relevantMemories.length > 0) {
          console.log(`  💡 ${memoryContext.summary}`);
          if (memoryContext.suggestions) {
            memoryContext.suggestions.forEach(s => console.log(`     💬 ${s}`));
          }
        } else {
          console.log('  💡 沒有找到相關歷史記憶');
        }
      } catch (error) {
        console.warn('  ⚠️ 記憶查詢失敗:', error);
      }
    }

    // 2. 分析任務
    const analysis = analyzeTask(taskDescription);
    console.log('  📊 任務分析:', {
      類型: analysis.type,
      複雜度: analysis.complexity,
      範圍: analysis.scope,
      可平行化: analysis.canParallelize
    });

    // 3. 選擇 Agent
    const plan = planTaskExecution(
      taskDescription,
      options.workingDir,
      options.files
    );

    // 如果強制指定 Agent，覆蓋選擇
    if (options.forceAgent) {
      plan.config.agentType = options.forceAgent;
    }

    console.log('  🤖 選擇 Agent:', plan.config.agentType);
    console.log('  📐 執行層級:', plan.layer);

    // 4. 創建工作流程
    const workflow = workflowEngine.createWorkflow(
      taskDescription,
      taskDescription,
      analysis,
      plan.config,
      plan.multiLayerConfig
    );

    // 如果有記憶上下文，注入到工作流程的元數據中
    if (memoryContext && workflow.tasks.length > 0) {
      (workflow as any).memoryContext = memoryContext;
    }

    console.log(`  📁 創建工作流程: ${workflow.id} (${workflow.tasks.length} 個子任務)`);

    // 5. 顯示執行計畫
    const planDescription = this.generatePlanDescription(workflow, analysis, memoryContext);
    console.log('\n' + planDescription);

    const result: any = {
      workflowId: workflow.id,
      analysis,
      plan: planDescription
    };
    
    if (memoryContext) {
      result.memoryContext = memoryContext;
    }
    
    return result;
  }

  /**
   * 執行工作流程
   */
  async execute(workflowId: string): Promise<WorkflowResult> {
    console.log(`\n▶️ [TaskBoardCenter] 開始執行: ${workflowId}`);
    
    const startTime = Date.now();
    const result = await workflowEngine.executeWorkflow(workflowId);
    const duration = Date.now() - startTime;

    console.log('\n✅ [TaskBoardCenter] 執行完成!');
    console.log(`  成功: ${result.success}`);
    console.log(`  完成任務: ${result.completedTasks}/${result.totalTasks}`);
    console.log(`  耗時: ${(duration / 1000).toFixed(1)} 秒`);

    // 記錄執行結果到記憶系統
    await this.recordTaskMemory(workflowId, result, duration);

    return result;
  }

  /**
   * 記錄任務記憶
   */
  private async recordTaskMemory(
    workflowId: string,
    result: WorkflowResult,
    duration: number
  ): Promise<void> {
    if (!this.memoryClient || this.config.memory?.enabled === false) {
      return;
    }

    try {
      const workflow = workflowEngine.getWorkflow(workflowId);
      if (!workflow) return;

      // 構建任務記憶
      const taskMemory: TaskMemory = {
        id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        taskDescription: workflow.name,
        taskType: this.inferTaskType(workflow.name),
        complexity: workflow.tasks.length > 3 ? 'high' : workflow.tasks.length > 1 ? 'medium' : 'low',
        agentType: workflow.tasks.map(t => t.agentType).join(','),
        status: result.success ? 'success' : 'failed',
        result: this.summarizeResult(result),
        duration: duration,
        timestamp: Date.now(),
        workflowId: workflowId,
      };

      // 如果失敗，嘗試提取錯誤信息
      if (!result.success) {
        const errors: string[] = [];
        for (const [taskId, taskResult] of Object.entries(result.results)) {
          if (taskResult && typeof taskResult === 'object' && 'error' in taskResult) {
            errors.push(String(taskResult.error));
          }
        }
        if (errors.length > 0) {
          taskMemory.error = errors.join('; ').substring(0, 500);
        }
      }

      const success = await this.memoryClient.recordMemory(taskMemory);
      if (success) {
        console.log(`  📝 任務記憶已記錄: ${taskMemory.id}`);
      }
    } catch (error) {
      console.warn('  ⚠️ 記錄任務記憶失敗:', error);
    }
  }

  /**
   * 推斷任務類型
   */
  private inferTaskType(description: string): TaskMemory['taskType'] {
    const lower = description.toLowerCase();
    if (lower.includes('寫') || lower.includes('code') || lower.includes('程式') || 
        lower.includes('開發') || lower.includes('api') || lower.includes('功能')) {
      return 'coding';
    } else if (lower.includes('分析') || lower.includes('review')) {
      return 'analysis';
    } else if (lower.includes('自動') || lower.includes('批次') || lower.includes('定時')) {
      return 'automation';
    } else if (lower.includes('網站') || lower.includes('網頁') || lower.includes('前後端') ||
               lower.includes('完整') || lower.includes('系統')) {
      return 'composite';
    }
    return 'research';
  }

  /**
   * 摘要執行結果
   */
  private summarizeResult(result: WorkflowResult): string {
    if (result.success) {
      return `成功完成 ${result.completedTasks}/${result.totalTasks} 個子任務`;
    } else {
      return `失敗：完成 ${result.completedTasks} 個，失敗 ${result.failedTasks} 個`;
    }
  }

  /**
   * 指派並立即執行
   */
  async assignAndExecute(
    taskDescription: string,
    options?: Parameters<typeof this.assignTask>[1]
  ): Promise<WorkflowResult> {
    const { workflowId } = await this.assignTask(taskDescription, options);
    return this.execute(workflowId);
  }

  /**
   * 獲取任務狀態
   */
  getStatus(workflowId?: string): any {
    if (workflowId) {
      const workflow = workflowEngine.getWorkflow(workflowId);
      const progress = workflowEngine.getProgress(workflowId);
      return {
        workflow,
        progress,
        health: getFullHealthReport()
      };
    }

    // 獲取所有狀態
    return {
      workflows: workflowEngine.getAllWorkflows(),
      agentHealth: getAgentHealth(),
      systemHealth: getFullHealthReport(),
      parallelTasks: {
        running: parallelExecutor.getRunningCount(),
        taskIds: parallelExecutor.getRunningTaskIds()
      }
    };
  }

  /**
   * 獲取系統健康報告
   */
  getHealthReport(): {
    agents: ReturnType<typeof getAgentHealth>;
    system: ReturnType<typeof getFullHealthReport>;
    timestamp: number;
  } {
    return {
      agents: getAgentHealth(),
      system: getFullHealthReport(),
      timestamp: Date.now()
    };
  }

  /**
   * 取消任務
   */
  cancel(workflowId: string): boolean {
    return workflowEngine.cancelWorkflow(workflowId);
  }

  /**
   * 重置 Agent
   */
  resetAgent(agentType: AgentType): void {
    executorAgents.resetAgent(agentType);
  }

  /**
   * 停止中控台
   */
  shutdown(): void {
    console.log('\n🛑 [TaskBoardCenter] 關閉中控台...');
    watchdog.stop();
    parallelExecutor.cancelAllTasks();
    this.isInitialized = false;
    console.log('  ✅ 已安全關閉');
  }

  /**
   * 查詢記憶
   */
  async queryMemories(
    query: string,
    options?: MemoryQueryOptions
  ): Promise<ReturnType<typeof getMemoryClient> extends null ? never : any> {
    if (!this.memoryClient) {
      throw new Error('記憶系統未初始化');
    }
    return this.memoryClient.queryMemories(query, options);
  }

  /**
   * 取得記憶統計
   */
  async getMemoryStats(): Promise<{ total: number; isInitialized: boolean }> {
    if (!this.memoryClient) {
      return { total: 0, isInitialized: false };
    }
    return this.memoryClient.getStats();
  }

  /**
   * 手動記錄記憶
   */
  async recordMemory(memory: TaskMemory): Promise<boolean> {
    if (!this.memoryClient) {
      throw new Error('記憶系統未初始化');
    }
    return this.memoryClient.recordMemory(memory);
  }

  // ============================================================
  // 私有方法
  // ============================================================

  private generatePlanDescription(workflow: Workflow, analysis: TaskAnalysis, memoryContext?: MemoryContext): string {
    let plan = '📋 執行計畫:\n';
    plan += '━━━━━━━━━━━━━━━━━━━━━\n';

    // 如果有記憶上下文，顯示相關信息
    if (memoryContext && memoryContext.relevantMemories.length > 0) {
      plan += `\n💡 歷史記憶參考:\n`;
      memoryContext.relevantMemories.slice(0, 3).forEach((mem, i) => {
        const statusIcon = mem.memory.status === 'success' ? '✅' : '❌';
        plan += `  ${statusIcon} [${(mem.similarity * 100).toFixed(0)}%相似] ${mem.memory.taskDescription.substring(0, 50)}...\n`;
      });
      
      if (memoryContext.suggestions && memoryContext.suggestions.length > 0) {
        plan += `\n💬 建議:\n`;
        memoryContext.suggestions.slice(0, 2).forEach(s => {
          plan += `  • ${s.substring(0, 60)}${s.length > 60 ? '...' : ''}\n`;
        });
      }
      plan += '\n';
    }

    // 按層級分組
    const layers = new Map<number, WorkflowTask[]>();
    for (const task of workflow.tasks) {
      if (!layers.has(task.layer)) {
        layers.set(task.layer, []);
      }
      layers.get(task.layer)!.push(task);
    }

    for (const [layer, tasks] of layers) {
      const layerName = layer === 1 ? '指揮官' : layer === 2 ? '專案經理' : '工程師';
      plan += `\n第 ${layer} 層 (${layerName}):\n`;
      
      for (const task of tasks) {
        const agentIcon = task.agentType === 'cursor' ? '🔧' :
                         task.agentType === 'codex' ? '⚙️' :
                         task.agentType === 'subagent' ? '📊' : '🤖';
        plan += `  ${agentIcon} ${task.title} (${task.agentType})\n`;
        
        if (task.dependsOn && task.dependsOn.length > 0) {
          plan += `     └─ 依賴: ${task.dependsOn.join(', ')}\n`;
        }
      }
    }

    plan += '━━━━━━━━━━━━━━━━━━━━━';
    return plan;
  }
}

// ============================================================
// 導出
// ============================================================

// 單例實例
let centerInstance: TaskBoardCenter | null = null;

export function getCenter(config?: Partial<CenterConfig>): TaskBoardCenter {
  if (!centerInstance) {
    centerInstance = new TaskBoardCenter(config);
  }
  return centerInstance;
}

export function createCenter(config?: Partial<CenterConfig>): TaskBoardCenter {
  return new TaskBoardCenter(config);
}

// 重新導出所有類型
export type {
  AgentType,
  TaskAnalysis,
  ExecutorConfig,
  Workflow,
  WorkflowTask,
  WorkflowResult,
  HealthStatus,
  WatchdogAlert
};

// 導出記憶相關類型
export type {
  TaskMemory,
  MemoryContext,
  MemoryQueryOptions
} from './lib/memory-integration';

// 導出所有模組（方便進階使用）
export {
  executorAgents,
  workflowEngine,
  circuitBreaker,
  watchdog,
  parallelExecutor,
  withCircuitBreaker,
  createTelegramNotifier,
  getFullHealthReport,
  initializeTaskBoard
};

export default TaskBoardCenter;
export { TaskBoardCenter };
