/**
 * Workflow Engine - 工作流程引擎
 * 
 * 編排多層 Agent 協作：
 * 第1層：我（指揮官）→ 拆分任務
 * 第2層：Sub-agents（PM）→ 各自負責模組
 * 第3層：Cursor/CoDEX（工程師）→ 實際寫code
 */

import {
  TaskAnalysis,
  ExecutorConfig,
  MultiLayerConfig,
  ExecutionLayer,
  AgentType
} from './executor-agents';
import {
  parallelExecutor,
  ParallelExecutionResult,
  SubTask
} from './parallel-executor';
import { watchdog, WatchdogAlert } from './watchdog';
import { circuitBreaker } from './circuit-breaker';
import { memoryIntegration, MemoryContext } from './lib/memory-integration';

export interface WorkflowTask {
  id: string;
  parentId?: string;
  title: string;
  description: string;
  agentType: AgentType;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  dependsOn?: string[];
  layer: number; // 第幾層 (1, 2, 3)
  role?: string; // architect, backend, frontend, etc.
  result?: any;
  error?: string;
  startTime?: number;
  endTime?: number;
  memoryContext?: MemoryContext; // 記憶上下文
}

export interface Workflow {
  id: string;
  name: string;
  tasks: WorkflowTask[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  layer: ExecutionLayer;
  progress: number;
  startTime?: number;
  endTime?: number;
}

export interface WorkflowResult {
  workflowId: string;
  success: boolean;
  completedTasks: number;
  failedTasks: number;
  totalTasks: number;
  duration: number;
  results: Record<string, any>;
}

class WorkflowEngine {
  private workflows: Map<string, Workflow> = new Map();
  private runningWorkflows: Set<string> = new Set();

  /**
   * 創建工作流程
   */
  createWorkflow(
    name: string,
    taskDescription: string,
    analysis: TaskAnalysis,
    config: ExecutorConfig,
    multiLayerConfig?: MultiLayerConfig
  ): Workflow {
    const workflowId = `wf-${Date.now()}`;
    const tasks: WorkflowTask[] = [];

    if (multiLayerConfig && multiLayerConfig.subAgentCount > 0) {
      // 多層工作流程
      
      // 第1層：指揮官（我）- 已經在執行，不用創建
      
      // 第2層：Sub-agents（各模組負責人）
      for (let i = 0; i < multiLayerConfig.subAgentCount; i++) {
        const role = multiLayerConfig.subAgentRoles[i] || `sub-${i}`;
        tasks.push({
          id: `${workflowId}-l2-${role}`,
          parentId: workflowId,
          title: `${role} - 模組規劃`,
          description: `負責 ${role} 模組的分析與規劃`,
          agentType: 'subagent',
          status: 'pending',
          layer: 2,
          role
        });

        // 第3層：執行 Agent（Cursor/CoDEX）
        if (analysis.requiresCoding) {
          tasks.push({
            id: `${workflowId}-l3-${role}`,
            parentId: `${workflowId}-l2-${role}`,
            title: `${role} - 程式實作`,
            description: `執行 ${role} 的程式開發`,
            agentType: role === 'backend' ? 'codex' : 'cursor',
            status: 'pending',
            dependsOn: [`${workflowId}-l2-${role}`],
            layer: 3,
            role
          });
        }
      }

      // 最終整合任務
      tasks.push({
        id: `${workflowId}-final`,
        parentId: workflowId,
        title: '整合與驗證',
        description: '整合所有模組並驗證',
        agentType: 'subagent',
        status: 'pending',
        dependsOn: tasks.filter(t => t.layer === 3).map(t => t.id),
        layer: 2
      });
    } else {
      // 單層工作流程
      tasks.push({
        id: `${workflowId}-single`,
        parentId: workflowId,
        title: name,
        description: taskDescription,
        agentType: config.agentType,
        status: 'pending',
        layer: 1
      });
    }

    const workflow: Workflow = {
      id: workflowId,
      name,
      tasks,
      status: 'pending',
      layer: multiLayerConfig ? 'multi' : 'single',
      progress: 0
    };

    this.workflows.set(workflowId, workflow);
    console.log(`[WorkflowEngine] 創建工作流程: ${workflowId} (${tasks.length} 個任務)`);
    
    return workflow;
  }

  /**
   * 執行工作流程
   */
  async executeWorkflow(workflowId: string): Promise<WorkflowResult> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`工作流程 ${workflowId} 不存在`);
    }

    if (this.runningWorkflows.has(workflowId)) {
      throw new Error(`工作流程 ${workflowId} 正在執行中`);
    }

    this.runningWorkflows.add(workflowId);
    workflow.status = 'running';
    workflow.startTime = Date.now();

    console.log(`[WorkflowEngine] 開始執行工作流程: ${workflowId}`);

    // 註冊到 Watchdog
    const runId = `wf-run-${Date.now()}`;
    watchdog.registerTask(workflowId, runId, 'workflow-engine');

    try {
      // 依層級執行
      const maxLayer = Math.max(...workflow.tasks.map(t => t.layer));
      
      for (let layer = 1; layer <= maxLayer; layer++) {
        const layerTasks = workflow.tasks.filter(t => t.layer === layer && t.status === 'pending');
        
        if (layerTasks.length === 0) continue;

        console.log(`[WorkflowEngine] 執行第 ${layer} 層: ${layerTasks.length} 個任務`);

        // 檢查依賴
        const readyTasks = layerTasks.filter(t => {
          if (!t.dependsOn || t.dependsOn.length === 0) return true;
          return t.dependsOn.every(depId => {
            const dep = workflow.tasks.find(task => task.id === depId);
            return dep?.status === 'completed';
          });
        });

        // 平行執行該層任務
        await this.executeLayerTasks(workflow, readyTasks);

        // 更新進度
        const completedCount = workflow.tasks.filter(t => t.status === 'completed').length;
        workflow.progress = Math.round((completedCount / workflow.tasks.length) * 100);
      }

      workflow.status = workflow.tasks.every(t => t.status === 'completed') ? 'completed' : 'failed';
      workflow.endTime = Date.now();

    } catch (error) {
      workflow.status = 'failed';
      workflow.endTime = Date.now();
      console.error(`[WorkflowEngine] 工作流程 ${workflowId} 執行失敗:`, error);
    } finally {
      this.runningWorkflows.delete(workflowId);
      watchdog.completeTask(runId);
    }

    return this.generateResult(workflow);
  }

  /**
   * 執行單層任務（平行）
   */
  private async executeLayerTasks(workflow: Workflow, tasks: WorkflowTask[]): Promise<void> {
    // 🔍 為每個任務查詢相關記憶
    console.log('[WorkflowEngine] 🔍 查詢相關記憶...');
    for (const task of tasks) {
      try {
        task.memoryContext = await memoryIntegration.generateContext(task.description);
        if (task.memoryContext.relevantMemories.length > 0) {
          console.log(`  📚 任務 "${task.title}" 找到 ${task.memoryContext.relevantMemories.length} 條相關記憶`);
        }
      } catch (error) {
        console.warn(`[WorkflowEngine] 記憶查詢失敗: ${error}`);
        task.memoryContext = undefined;
      }
    }

    const subTasks: SubTask[] = tasks.map(task => ({
      id: task.id,
      task: this.generateSubAgentPrompt(task, workflow),
      agentId: task.agentType,
      timeoutSeconds: 600
    }));

    const result = await parallelExecutor.execute(workflow.id, subTasks, {
      maxConcurrency: 3,
      timeoutSeconds: 600,
      continueOnError: false
    });

    // 更新任務狀態
    for (const subResult of result.results) {
      const task = workflow.tasks.find(t => t.id === subResult.subTaskId);
      if (task) {
        task.startTime = task.startTime || Date.now();
        task.endTime = Date.now();
        
        if (subResult.success) {
          task.status = 'completed';
          task.result = subResult.result;
          
          // 記錄成功到斷路器
          circuitBreaker.recordSuccess(task.agentType);
          
          // 🧠 記錄成功記憶
          await memoryIntegration.recordTaskMemory(task, workflow, {
            success: true,
            duration: task.endTime - task.startTime
          });
        } else {
          task.status = 'failed';
          task.error = subResult.error;
          
          // 記錄失敗到斷路器
          circuitBreaker.recordFailure(task.agentType);
          
          // 🧠 記錄失敗記憶
          await memoryIntegration.recordTaskMemory(task, workflow, {
            success: false,
            error: subResult.error,
            duration: task.endTime - task.startTime
          });
        }
      }
    }
  }

  /**
   * 生成 Sub-agent 的 Prompt
   */
  private generateSubAgentPrompt(task: WorkflowTask, workflow: Workflow): string {
    let prompt = `## 任務: ${task.title}\n\n`;
    prompt += `描述: ${task.description}\n\n`;
    prompt += `角色: ${task.role || '執行者'}\n`;
    prompt += `所屬工作流程: ${workflow.name}\n\n`;

    // 🧠 注入記憶上下文
    if (task.memoryContext && task.memoryContext.relevantMemories.length > 0) {
      prompt = memoryIntegration.injectMemoryContext(prompt, task.memoryContext);
      prompt += '\n\n';
    }

    if (task.layer === 2) {
      // Sub-agent (PM 層)
      prompt += `## 你的職責\n`;
      prompt += `1. 分析需求，制定詳細計畫\n`;
      prompt += `2. 如果需要寫程式，指揮 Cursor/CoDEX 執行\n`;
      prompt += `3. 確保交付品質\n\n`;
      prompt += `## 重要限制\n`;
      prompt += `- 你是「專案經理」角色，不直接寫大量程式碼\n`;
      prompt += `- 編碼工作請指派給第3層的執行 Agent\n`;
      prompt += `- 回傳結構化的計畫和執行結果\n`;
    } else if (task.layer === 3) {
      // Cursor/CoDEX (工程師層)
      prompt += `## 你的職責\n`;
      prompt += `1. 根據規劃執行編碼任務\n`;
      prompt += `2. 寫出高品質、可執行的程式碼\n`;
      prompt += `3. 測試確保功能正常\n\n`;
      prompt += `## 輸出要求\n`;
      prompt += `- 提供完成的程式碼檔案\n`;
      prompt += `- 說明主要邏輯和關鍵決策\n`;
      prompt += `- 標註任何需要注意的地方\n`;
    }

    return prompt;
  }

  /**
   * 生成執行結果
   */
  private generateResult(workflow: Workflow): WorkflowResult {
    const completedTasks = workflow.tasks.filter(t => t.status === 'completed').length;
    const failedTasks = workflow.tasks.filter(t => t.status === 'failed').length;
    const duration = workflow.endTime && workflow.startTime 
      ? workflow.endTime - workflow.startTime 
      : 0;

    const results: Record<string, any> = {};
    for (const task of workflow.tasks) {
      if (task.result) {
        results[task.id] = task.result;
      }
    }

    return {
      workflowId: workflow.id,
      success: workflow.status === 'completed',
      completedTasks,
      failedTasks,
      totalTasks: workflow.tasks.length,
      duration,
      results
    };
  }

  /**
   * 獲取工作流程
   */
  getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * 獲取所有工作流程
   */
  getAllWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * 取消工作流程
   */
  cancelWorkflow(workflowId: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || workflow.status !== 'running') {
      return false;
    }

    workflow.status = 'cancelled';
    workflow.endTime = Date.now();
    this.runningWorkflows.delete(workflowId);
    
    // 取消所有平行任務
    parallelExecutor.cancelAllTasks();

    console.log(`[WorkflowEngine] 工作流程 ${workflowId} 已取消`);
    return true;
  }

  /**
   * 獲取進度
   */
  getProgress(workflowId: string): { progress: number; status: string } | null {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return null;

    return {
      progress: workflow.progress,
      status: workflow.status
    };
  }
}

// 單例實例
export const workflowEngine = new WorkflowEngine();

export default WorkflowEngine;
export { WorkflowEngine };
