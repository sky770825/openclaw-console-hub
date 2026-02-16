/**
 * 工作流程引擎
 * 支援 dependsOn 欄位，實作 parallel / sequential 執行模式，自動解析任務圖
 */

import type { Task, WorkflowNode, WorkflowExecutionPlan, ExecutionMode } from './types.js';

/** 工作流程圖 */
export class WorkflowGraph {
  private nodes: Map<string, WorkflowNode> = new Map();
  private taskMap: Map<string, Task> = new Map();

  constructor(tasks: Task[]) {
    // 建立任務映射
    for (const task of tasks) {
      this.taskMap.set(task.id, task);
    }

    // 建立節點
    for (const task of tasks) {
      this.nodes.set(task.id, {
        taskId: task.id,
        taskName: task.name,
        status: task.status,
        dependencies: task.dependsOn || [],
        dependents: [],
        level: 0,
      });
    }

    // 建立依賴關係和計算層級
    this.buildDependencies();
    this.calculateLevels();
  }

  /**
   * 建立依賴關係（雙向）
   */
  private buildDependencies(): void {
    for (const [taskId, node] of this.nodes) {
      for (const depId of node.dependencies) {
        const depNode = this.nodes.get(depId);
        if (depNode) {
          // 添加反向依賴
          if (!depNode.dependents.includes(taskId)) {
            depNode.dependents.push(taskId);
          }
        }
      }
    }
  }

  /**
   * 計算拓撲層級（用於確定執行順序）
   */
  private calculateLevels(): void {
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (taskId: string): number => {
      if (visiting.has(taskId)) {
        throw new Error(`Circular dependency detected: ${taskId}`);
      }
      if (visited.has(taskId)) {
        return this.nodes.get(taskId)?.level || 0;
      }

      visiting.add(taskId);
      const node = this.nodes.get(taskId);
      if (!node) {
        throw new Error(`Task not found: ${taskId}`);
      }

      let maxDepLevel = -1;
      for (const depId of node.dependencies) {
        const depLevel = visit(depId);
        maxDepLevel = Math.max(maxDepLevel, depLevel);
      }

      node.level = maxDepLevel + 1;
      visiting.delete(taskId);
      visited.add(taskId);

      return node.level;
    };

    for (const taskId of this.nodes.keys()) {
      visit(taskId);
    }
  }

  /**
   * 獲取所有節點
   */
  getNodes(): WorkflowNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * 獲取特定節點
   */
  getNode(taskId: string): WorkflowNode | undefined {
    return this.nodes.get(taskId);
  }

  /**
   * 獲取指定層級的所有節點
   */
  getNodesByLevel(level: number): WorkflowNode[] {
    return Array.from(this.nodes.values()).filter(n => n.level === level);
  }

  /**
   * 獲取最大層級
   */
  getMaxLevel(): number {
    return Math.max(...Array.from(this.nodes.values()).map(n => n.level), 0);
  }

  /**
   * 檢測循環依賴
   */
  hasCircularDependency(): boolean {
    try {
      this.calculateLevels();
      return false;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Circular dependency')) {
        return true;
      }
      throw error;
    }
  }

  /**
   * 獲取可執行的任務（所有依賴已完成）
   */
  getRunnableTasks(completedTaskIds: string[]): string[] {
    const completed = new Set(completedTaskIds);
    const runnable: string[] = [];

    for (const [taskId, node] of this.nodes) {
      // 已完成的跳過
      if (completed.has(taskId)) continue;

      // 檢查所有依賴是否已完成
      const allDepsCompleted = node.dependencies.every(depId => completed.has(depId));
      if (allDepsCompleted) {
        runnable.push(taskId);
      }
    }

    return runnable;
  }

  /**
   * 檢查任務是否準備好執行
   */
  isTaskReady(taskId: string, completedTaskIds: string[]): boolean {
    const node = this.nodes.get(taskId);
    if (!node) return false;

    const completed = new Set(completedTaskIds);
    return node.dependencies.every(depId => completed.has(depId));
  }
}

/** 工作流程執行器 */
export class WorkflowEngine {
  private graph: WorkflowGraph;
  private executionMode: ExecutionMode;
  private completedTasks: Set<string> = new Set();
  private runningTasks: Set<string> = new Set();
  private failedTasks: Set<string> = new Set();

  constructor(
    tasks: Task[],
    options: {
      executionMode?: ExecutionMode;
    } = {}
  ) {
    this.graph = new WorkflowGraph(tasks);
    this.executionMode = options.executionMode || 'sequential';
  }

  /**
   * 生成執行計畫
   */
  generateExecutionPlan(): WorkflowExecutionPlan[] {
    const nodes = this.graph.getNodes();
    const plans: WorkflowExecutionPlan[] = [];

    // 按層級排序
    const sortedNodes = nodes.sort((a, b) => a.level - b.level);

    let executionOrder = 0;
    for (const node of sortedNodes) {
      plans.push({
        taskId: node.taskId,
        executionOrder: executionOrder++,
        canRunInParallel: this.executionMode === 'parallel',
        dependencies: node.dependencies,
      });
    }

    return plans;
  }

  /**
   * 獲取下一批可執行的任務
   */
  getNextBatch(): string[] {
    const runnable = this.graph.getRunnableTasks(Array.from(this.completedTasks));
    
    // 過濾掉正在執行或已失敗的任務
    const available = runnable.filter(
      taskId => !this.runningTasks.has(taskId) && !this.failedTasks.has(taskId)
    );

    if (this.executionMode === 'sequential') {
      // 順序模式：只返回第一個
      return available.slice(0, 1);
    } else {
      // 並行模式：返回所有可執行的
      return available;
    }
  }

  /**
   * 標記任務開始執行
   */
  markTaskRunning(taskId: string): void {
    this.runningTasks.add(taskId);
  }

  /**
   * 標記任務完成
   */
  markTaskCompleted(taskId: string): void {
    this.runningTasks.delete(taskId);
    this.completedTasks.add(taskId);
  }

  /**
   * 標記任務失敗
   */
  markTaskFailed(taskId: string): void {
    this.runningTasks.delete(taskId);
    this.failedTasks.add(taskId);
  }

  /**
   * 檢查是否所有任務都已完成
   */
  isComplete(): boolean {
    return this.completedTasks.size + this.failedTasks.size >= this.graph.getNodes().length;
  }

  /**
   * 獲取執行狀態
   */
  getStatus(): {
    total: number;
    completed: number;
    running: number;
    failed: number;
    pending: number;
  } {
    const total = this.graph.getNodes().length;
    const completed = this.completedTasks.size;
    const running = this.runningTasks.size;
    const failed = this.failedTasks.size;
    const pending = total - completed - running - failed;

    return { total, completed, running, failed, pending };
  }

  /**
   * 獲取圖形資訊
   */
  getGraph(): WorkflowGraph {
    return this.graph;
  }

  /**
   * 獲取執行模式
   */
  getExecutionMode(): ExecutionMode {
    return this.executionMode;
  }

  /**
   * 檢查是否有循環依賴
   */
  hasCircularDependency(): boolean {
    return this.graph.hasCircularDependency();
  }

  /**
   * 獲取依賴鏈（某個任務依賴的所有任務）
   */
  getDependencyChain(taskId: string): string[] {
    const chain: string[] = [];
    const visited = new Set<string>();

    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      const node = this.graph.getNode(id);
      if (!node) return;

      for (const depId of node.dependencies) {
        visit(depId);
        chain.push(depId);
      }
    };

    visit(taskId);
    return chain;
  }

  /**
   * 獲取受影響的任務（依賴某個任務的所有任務）
   */
  getAffectedTasks(taskId: string): string[] {
    const affected: string[] = [];
    const visited = new Set<string>();

    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      const node = this.graph.getNode(id);
      if (!node) return;

      for (const depId of node.dependents) {
        visit(depId);
        affected.push(depId);
      }
    };

    visit(taskId);
    return affected;
  }

  /**
   * 驗證工作流程是否有效
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 檢查循環依賴
    if (this.hasCircularDependency()) {
      errors.push('Workflow contains circular dependencies');
    }

    // 檢查所有依賴的任務是否存在
    for (const node of this.graph.getNodes()) {
      for (const depId of node.dependencies) {
        if (!this.graph.getNode(depId)) {
          errors.push(`Task ${node.taskId} depends on non-existent task ${depId}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * 序列化工作流程
   */
  serialize(): {
    nodes: WorkflowNode[];
    executionMode: ExecutionMode;
    status: { total: number; completed: number; running: number; failed: number; pending: number };
  } {
    return {
      nodes: this.graph.getNodes(),
      executionMode: this.executionMode,
      status: this.getStatus(),
    };
  }
}

/** 批次執行器（用於並行執行） */
export class BatchWorkflowExecutor {
  private engine: WorkflowEngine;
  private concurrency: number;

  constructor(
    tasks: Task[],
    options: {
      executionMode?: ExecutionMode;
      concurrency?: number;
    } = {}
  ) {
    this.engine = new WorkflowEngine(tasks, options);
    this.concurrency = options.concurrency || 3;
  }

  /**
   * 執行所有任務
   * @param executor 任務執行函數
   */
  async executeAll(
    executor: (taskId: string) => Promise<{ success: boolean; error?: string }>
  ): Promise<{
    success: boolean;
    results: Map<string, { success: boolean; error?: string }>;
  }> {
    const results = new Map<string, { success: boolean; error?: string }>();

    while (!this.engine.isComplete()) {
      const batch = this.engine.getNextBatch();
      
      if (batch.length === 0) {
        // 如果沒有可執行的任務但有正在運行的，等待一下
        if (this.engine.getStatus().running > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }
        // 如果沒有正在運行的，可能是死鎖
        break;
      }

      // 限制並發數
      const limitedBatch = batch.slice(0, this.concurrency);

      // 並行執行批次
      await Promise.all(
        limitedBatch.map(async (taskId) => {
          this.engine.markTaskRunning(taskId);
          
          try {
            const result = await executor(taskId);
            results.set(taskId, result);
            
            if (result.success) {
              this.engine.markTaskCompleted(taskId);
            } else {
              this.engine.markTaskFailed(taskId);
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            results.set(taskId, { success: false, error: errorMessage });
            this.engine.markTaskFailed(taskId);
          }
        })
      );
    }

    // 檢查是否所有任務都成功
    const allSuccess = Array.from(results.values()).every(r => r.success);
    
    return { success: allSuccess, results };
  }

  /**
   * 獲取執行引擎
   */
  getEngine(): WorkflowEngine {
    return this.engine;
  }
}

/** 導出工具函數 */
export function createWorkflowEngine(tasks: Task[], options?: { executionMode?: ExecutionMode }): WorkflowEngine {
  return new WorkflowEngine(tasks, options);
}

export function createBatchExecutor(tasks: Task[], options?: { executionMode?: ExecutionMode; concurrency?: number }): BatchWorkflowExecutor {
  return new BatchWorkflowExecutor(tasks, options);
}
