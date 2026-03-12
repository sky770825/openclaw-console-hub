/**
 * Multi-Layer Orchestrator - 多層指揮中心
 * 
 * 中控台的核心整合模組，串接：
 * - Executor Agents (選擇器)
 * - Workflow Engine (編排器)
 * - Anti-Stuck System (防卡機制)
 */

import {
  executorAgents,
  analyzeTask,
  selectAgent,
  planTaskExecution,
  getAgentHealth,
  TaskAnalysis,
  ExecutorConfig,
  AgentType
} from './executor-agents';

import {
  workflowEngine,
  Workflow,
  WorkflowResult
} from './workflow-engine';

import {
  circuitBreaker,
  CircuitState,
  withCircuitBreaker
} from './circuit-breaker';

import {
  parallelExecutor,
  executeParallel,
  ParallelExecutionResult
} from './parallel-executor';

import {
  watchdog,
  createTelegramNotifier,
  createLogNotifier,
  HealthStatus,
  WatchdogAlert
} from './watchdog';

// ============================================================
// 類型定義
// ============================================================

export interface TaskRequest {
  title: string;
  description: string;
  workingDir?: string;
  files?: string[];
  priority?: 'low' | 'medium' | 'high';
  notifyOnComplete?: boolean;
}

export interface TaskResponse {
  taskId: string;
  workflowId: string;
  analysis: TaskAnalysis;
  executionPlan: {
    agentType: AgentType;
    layer: 'single' | 'multi' | 'parallel';
    subAgents?: string[];
  };
  status: string;
  message: string;
}

export interface SystemStatus {
  orchestrator: 'healthy' | 'degraded' | 'critical';
  agents: {
    cursor: { available: boolean; state: string };
    codex: { available: boolean; state: string };
    openclaw: { available: boolean; state: string };
    subagent: { available: boolean; state: string };
  };
  workflows: {
    total: number;
    running: number;
    completed: number;
    failed: number;
  };
  circuitBreaker: {
    total: number;
    closed: number;
    open: number;
    halfOpen: number;
  };
}

// ============================================================
// 多層指揮中心類別
// ============================================================

class MultiLayerOrchestrator {
  private isInitialized: boolean = false;
  private notificationHandler?: (alert: WatchdogAlert) => void;

  /**
   * 初始化指揮中心
   */
  initialize(options: {
    enableWatchdog?: boolean;
    notifyHandler?: (alert: WatchdogAlert) => void;
  } = {}): void {
    if (this.isInitialized) {
      console.log('[Orchestrator] 已初始化');
      return;
    }

    console.log('[Orchestrator] 初始化多層指揮中心...');

    // 啟動 Watchdog
    if (options.enableWatchdog !== false) {
      watchdog.start();
      
      // 註冊通知處理器
      if (options.notifyHandler) {
        this.notificationHandler = options.notifyHandler;
        watchdog.onAlert(options.notifyHandler);
      }
      
      // 預設日誌通知
      watchdog.onAlert(createLogNotifier());
    }

    this.isInitialized = true;
    console.log('[Orchestrator] ✅ 初始化完成');
  }

  /**
   * 關閉指揮中心
   */
  shutdown(): void {
    console.log('[Orchestrator] 關閉指揮中心...');
    
    watchdog.stop();
    parallelExecutor.cancelAllTasks();
    
    this.isInitialized = false;
    console.log('[Orchestrator] 已關閉');
  }

  /**
   * 提交任務（主要入口）
   */
  async submitTask(request: TaskRequest): Promise<TaskResponse> {
    this.ensureInitialized();

    console.log(`[Orchestrator] 收到任務: ${request.title}`);

    // 1. 分析任務
    const analysis = analyzeTask(request.description);
    console.log(`[Orchestrator] 分析結果: ${analysis.type}, 複雜度: ${analysis.complexity}`);

    // 2. 規劃執行
    const plan = planTaskExecution(
      request.description,
      request.workingDir,
      request.files
    );

    // 3. 檢查斷路器
    const breakerCheck = circuitBreaker.canExecute(plan.config.agentType);
    if (!breakerCheck.allowed) {
      return {
        taskId: '',
        workflowId: '',
        analysis,
        executionPlan: {
          agentType: plan.config.agentType,
          layer: plan.layer
        },
        status: 'rejected',
        message: `Agent ${plan.config.agentType} 目前不可用: ${breakerCheck.reason}`
      };
    }

    // 4. 創建工作流程
    const workflow = workflowEngine.createWorkflow(
      request.title,
      request.description,
      analysis,
      plan.config,
      plan.multiLayerConfig
    );

    // 5. 啟動執行（非同步）
    this.executeWorkflowAsync(workflow, request);

    return {
      taskId: workflow.tasks[0]?.id || '',
      workflowId: workflow.id,
      analysis,
      executionPlan: {
        agentType: plan.config.agentType,
        layer: plan.layer,
        subAgents: plan.multiLayerConfig?.subAgentRoles
      },
      status: 'accepted',
      message: `工作流程已創建: ${workflow.id}，包含 ${workflow.tasks.length} 個子任務`
    };
  }

  /**
   * 非同步執行工作流程
   */
  private async executeWorkflowAsync(workflow: Workflow, request: TaskRequest): Promise<void> {
    try {
      // 使用斷路器包裝執行
      await withCircuitBreaker('workflow-engine', async () => {
        const result = await workflowEngine.executeWorkflow(workflow.id);
        
        console.log(`[Orchestrator] 工作流程 ${workflow.id} 完成:`, result.success ? '成功' : '失敗');
        
        // 發送完成通知
        if (request.notifyOnComplete !== false && this.notificationHandler) {
          this.notificationHandler({
            type: result.success ? 'task_completed' : 'task_failed',
            message: `任務「${request.title}」${result.success ? '完成' : '失敗'}`,
            timestamp: Date.now(),
            details: { workflowId: workflow.id, result }
          } as WatchdogAlert);
        }
      });
    } catch (error) {
      console.error(`[Orchestrator] 工作流程 ${workflow.id} 執行錯誤:`, error);
    }
  }

  /**
   * 獲取任務狀態
   */
  getTaskStatus(workflowId: string): {
    workflow?: Workflow;
    progress: number;
    status: string;
  } | null {
    const workflow = workflowEngine.getWorkflow(workflowId);
    if (!workflow) return null;

    return {
      workflow,
      progress: workflow.progress,
      status: workflow.status
    };
  }

  /**
   * 獲取所有任務
   */
  getAllTasks(): Workflow[] {
    return workflowEngine.getAllWorkflows();
  }

  /**
   * 取消任務
   */
  cancelTask(workflowId: string): boolean {
    return workflowEngine.cancelWorkflow(workflowId);
  }

  /**
   * 獲取系統狀態
   */
  getSystemStatus(): SystemStatus {
    const workflows = workflowEngine.getAllWorkflows();
    const cbSummary = circuitBreaker.getSummary();
    const agentHealth = getAgentHealth();

    // 判斷系統健康狀態
    let orchestratorStatus: SystemStatus['orchestrator'] = 'healthy';
    const openAgents = Object.values(agentHealth).filter(a => !a.available).length;
    if (openAgents >= 3) {
      orchestratorStatus = 'critical';
    } else if (openAgents >= 1) {
      orchestratorStatus = 'degraded';
    }

    return {
      orchestrator: orchestratorStatus,
      agents: agentHealth,
      workflows: {
        total: workflows.length,
        running: workflows.filter(w => w.status === 'running').length,
        completed: workflows.filter(w => w.status === 'completed').length,
        failed: workflows.filter(w => w.status === 'failed').length
      },
      circuitBreaker: cbSummary
    };
  }

  /**
   * 獲取詳細健康報告
   */
  getDetailedHealth(): {
    system: SystemStatus;
    watchdog: HealthStatus;
    timestamp: number;
  } {
    return {
      system: this.getSystemStatus(),
      watchdog: watchdog.getHealthStatus(),
      timestamp: Date.now()
    };
  }

  /**
   * 重置 Agent
   */
  resetAgent(agentType: AgentType): void {
    circuitBreaker.reset(agentType);
    console.log(`[Orchestrator] Agent ${agentType} 已重置`);
  }

  /**
   * 快速執行簡單任務（無多層）
   */
  async executeSimple(
    description: string,
    agentType: AgentType = 'openclaw'
  ): Promise<ParallelExecutionResult> {
    this.ensureInitialized();

    return executeParallel('simple-task', [description], {
      maxConcurrency: 1,
      timeoutSeconds: 300
    });
  }

  /**
   * 確保已初始化
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('指揮中心尚未初始化，請先呼叫 initialize()');
    }
  }
}

// ============================================================
// 單例實例與便利函數
// ============================================================

export const orchestrator = new MultiLayerOrchestrator();

/**
 * 快速初始化
 */
export function initOrchestrator(
  telegramSendMessage?: (msg: string) => Promise<void>
): MultiLayerOrchestrator {
  const notifyHandler = telegramSendMessage 
    ? createTelegramNotifier(telegramSendMessage)
    : createLogNotifier();

  orchestrator.initialize({
    enableWatchdog: true,
    notifyHandler
  });

  return orchestrator;
}

/**
 * 快速提交任務
 */
export async function submitTask(
  title: string,
  description: string,
  options?: Partial<TaskRequest>
): Promise<TaskResponse> {
  return orchestrator.submitTask({
    title,
    description,
    ...options
  });
}

/**
 * 獲取狀態
 */
export function getStatus(): SystemStatus {
  return orchestrator.getSystemStatus();
}

// ============================================================
// Express API 路由（供中控台使用）
// ============================================================

import { Router, Request, Response } from 'express';

export function createOrchestratorRoutes(): Router {
  const router = Router();

  // 提交任務
  router.post('/tasks', async (req: Request, res: Response) => {
    try {
      const request: TaskRequest = req.body;
      const response = await orchestrator.submitTask(request);
      res.json(response);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // 獲取任務狀態
  router.get('/tasks/:workflowId', (req: Request, res: Response) => {
    const { workflowId } = req.params;
    const status = orchestrator.getTaskStatus(workflowId);
    if (!status) {
      res.status(404).json({ error: '任務不存在' });
      return;
    }
    res.json(status);
  });

  // 獲取所有任務
  router.get('/tasks', (_req: Request, res: Response) => {
    res.json(orchestrator.getAllTasks());
  });

  // 取消任務
  router.post('/tasks/:workflowId/cancel', (req: Request, res: Response) => {
    const { workflowId } = req.params;
    const success = orchestrator.cancelTask(workflowId);
    res.json({ success, message: success ? '已取消' : '取消失敗或任務已完成' });
  });

  // 系統狀態
  router.get('/status', (_req: Request, res: Response) => {
    res.json(orchestrator.getSystemStatus());
  });

  // 詳細健康報告
  router.get('/health', (_req: Request, res: Response) => {
    res.json(orchestrator.getDetailedHealth());
  });

  // 重置 Agent
  router.post('/agents/:agentType/reset', (req: Request, res: Response) => {
    const { agentType } = req.params;
    orchestrator.resetAgent(agentType as AgentType);
    res.json({ message: `Agent ${agentType} 已重置` });
  });

  // Agent 健康狀態
  router.get('/agents/health', (_req: Request, res: Response) => {
    res.json(getAgentHealth());
  });

  return router;
}

// ============================================================
// 導出
// ============================================================

export {
  // 核心類別
  MultiLayerOrchestrator,
  orchestrator,
  
  // Executor Agents
  executorAgents,
  analyzeTask,
  selectAgent,
  planTaskExecution,
  getAgentHealth,
  
  // Workflow Engine
  workflowEngine,
  
  // Anti-Stuck System
  circuitBreaker,
  parallelExecutor,
  watchdog,
  createTelegramNotifier,
  createLogNotifier,
  
  // 類型
  type TaskRequest,
  type TaskResponse,
  type SystemStatus,
  type TaskAnalysis,
  type ExecutorConfig,
  type AgentType
};

export default orchestrator;
