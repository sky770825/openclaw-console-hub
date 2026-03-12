/**
 * TaskBoard API Routes - 任務板後端 API 路由
 * 
 * 整合中控台的所有功能
 */

import { Router, Request, Response } from 'express';
import {
  getCenter,
  createCenter,
  executorAgents,
  workflowEngine,
  circuitBreaker,
  watchdog,
  parallelExecutor,
  getFullHealthReport,
  type AgentType,
  type MemoryContext
} from './taskboard-center';

// 獲取中控台實例
function getTaskBoardCenter() {
  return getCenter({
    antiStuck: {
      circuitBreaker: true,
      watchdog: true,
      parallelExecutor: true
    },
    defaults: {
      timeout: 300,
      maxRetries: 2,
      approvalMode: 'auto'
    }
  });
}

// 創建路由
export function createTaskBoardRoutes(): Router {
  const router = Router();
  const center = getTaskBoardCenter();

  // ============================================================
  // 系統狀態 API
  // ============================================================

  /**
   * GET /api/health - 系統健康檢查
   */
  router.get('/health', (req: Request, res: Response) => {
    const health = getFullHealthReport();
    const agentHealth = executorAgents.getAgentHealth();
    
    res.json({
      status: health.watchdog.status,
      timestamp: Date.now(),
      system: health,
      agents: agentHealth,
      parallel: {
        runningTasks: parallelExecutor.getRunningCount(),
        runningTaskIds: parallelExecutor.getRunningTaskIds()
      }
    });
  });

  /**
   * GET /api/status - 詳細狀態
   */
  router.get('/status', (req: Request, res: Response) => {
    const status = center.getStatus();
    res.json(status);
  });

  // ============================================================
  // 任務管理 API
  // ============================================================

  /**
   * POST /api/tasks - 建立並指派任務
   * Body: { description: string, workingDir?: string, files?: string[], forceAgent?: string }
   */
  router.post('/tasks', async (req: Request, res: Response) => {
    try {
      const { description, workingDir, files, forceAgent, priority } = req.body;

      if (!description) {
        return res.status(400).json({ error: '缺少任務描述 (description)' });
      }

      const result = await center.assignTask(description, {
        workingDir,
        files,
        forceAgent: forceAgent as AgentType,
        priority
      });

      res.json({
        success: true,
        workflowId: result.workflowId,
        analysis: result.analysis,
        plan: result.plan
      });
    } catch (error) {
      console.error('[API] 建立任務失敗:', error);
      res.status(500).json({
        error: '建立任務失敗',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * POST /api/tasks/execute - 建立並立即執行任務
   */
  router.post('/tasks/execute', async (req: Request, res: Response) => {
    try {
      const { description, workingDir, files, forceAgent } = req.body;

      if (!description) {
        return res.status(400).json({ error: '缺少任務描述' });
      }

      // 先指派
      const { workflowId } = await center.assignTask(description, {
        workingDir,
        files,
        forceAgent: forceAgent as AgentType
      });

      // 立即執行（非同步）
      center.execute(workflowId).catch(console.error);

      res.json({
        success: true,
        workflowId,
        message: '任務已建立並開始執行',
        status: 'running'
      });
    } catch (error) {
      console.error('[API] 執行任務失敗:', error);
      res.status(500).json({ error: '執行任務失敗', message: String(error) });
    }
  });

  /**
   * GET /api/tasks/:workflowId - 獲取任務詳情
   */
  router.get('/tasks/:workflowId', (req: Request, res: Response) => {
    const workflowId = req.params.workflowId as string;
    const status = center.getStatus(workflowId);
    
    if (!status.workflow) {
      return res.status(404).json({ error: '任務不存在' });
    }

    res.json(status);
  });

  /**
   * POST /api/tasks/:workflowId/run - 執行任務
   */
  router.post('/tasks/:workflowId/run', async (req: Request, res: Response) => {
    try {
      const workflowId = req.params.workflowId as string;
      const result = await center.execute(workflowId);
      
      res.json({
        success: result.success,
        workflowId: result.workflowId,
        completedTasks: result.completedTasks,
        failedTasks: result.failedTasks,
        totalTasks: result.totalTasks,
        duration: result.duration,
        results: result.results
      });
    } catch (error) {
      console.error('[API] 執行任務失敗:', error);
      res.status(500).json({ error: '執行失敗', message: String(error) });
    }
  });

  /**
   * POST /api/tasks/:workflowId/cancel - 取消任務
   */
  router.post('/tasks/:workflowId/cancel', (req: Request, res: Response) => {
    const workflowId = req.params.workflowId as string;
    const success = center.cancel(workflowId);
    
    res.json({
      success,
      message: success ? '任務已取消' : '取消失敗（可能任務不在執行中）'
    });
  });

  // ============================================================
  // 工作流程 API
  // ============================================================

  /**
   * GET /api/workflows - 獲取所有工作流程
   */
  router.get('/workflows', (req: Request, res: Response) => {
    const workflows = workflowEngine.getAllWorkflows();
    res.json({ workflows });
  });

  /**
   * GET /api/workflows/:workflowId/progress - 獲取進度
   */
  router.get('/workflows/:workflowId/progress', (req: Request, res: Response) => {
    const workflowId = req.params.workflowId as string;
    const progress = workflowEngine.getProgress(workflowId);
    
    if (!progress) {
      return res.status(404).json({ error: '工作流程不存在' });
    }

    res.json(progress);
  });

  // ============================================================
  // Circuit Breaker API
  // ============================================================

  /**
   * GET /api/circuit-breaker/status - 斷路器狀態
   */
  router.get('/circuit-breaker/status', (req: Request, res: Response) => {
    res.json({
      summary: circuitBreaker.getSummary(),
      agents: circuitBreaker.getAllStates()
    });
  });

  /**
   * GET /api/circuit-breaker/:agentId - 特定 Agent 狀態
   */
  router.get('/circuit-breaker/:agentId', (req: Request, res: Response) => {
    const agentId = req.params.agentId as string;
    const state = circuitBreaker.getState(agentId);
    
    if (!state) {
      return res.status(404).json({ error: 'Agent 不存在' });
    }

    res.json(state);
  });

  /**
   * POST /api/circuit-breaker/:agentId/reset - 重置斷路器
   */
  router.post('/circuit-breaker/:agentId/reset', (req: Request, res: Response) => {
    const { agentId } = req.params;
    center.resetAgent(agentId as AgentType);
    res.json({ success: true, message: `Agent ${agentId} 已重置` });
  });

  // ============================================================
  // Watchdog API
  // ============================================================

  /**
   * GET /api/watchdog/status - Watchdog 狀態
   */
  router.get('/watchdog/status', (req: Request, res: Response) => {
    res.json({
      health: watchdog.getHealthStatus(),
      tasks: watchdog.getAllTasks(),
      stuckTasks: watchdog.getStuckTasks(),
      history: watchdog.getHealthHistory().slice(-10) // 最近10筆
    });
  });

  /**
   * POST /api/watchdog/start - 啟動 Watchdog
   */
  router.post('/watchdog/start', (req: Request, res: Response) => {
    watchdog.start();
    res.json({ success: true, message: 'Watchdog 已啟動' });
  });

  /**
   * POST /api/watchdog/stop - 停止 Watchdog
   */
  router.post('/watchdog/stop', (req: Request, res: Response) => {
    watchdog.stop();
    res.json({ success: true, message: 'Watchdog 已停止' });
  });

  /**
   * POST /api/watchdog/tasks/:runId/kill - 強制終止任務
   */
  router.post('/watchdog/tasks/:runId/kill', async (req: Request, res: Response) => {
    const runId = req.params.runId as string;
    const { reason } = req.body;
    
    const success = await watchdog.killTask(runId, reason || '手動終止');
    res.json({ success, message: success ? '已終止' : '終止失敗' });
  });

  // ============================================================
  // Parallel Executor API
  // ============================================================

  /**
   * GET /api/parallel/status - 平行執行器狀態
   */
  router.get('/parallel/status', (req: Request, res: Response) => {
    res.json({
      runningCount: parallelExecutor.getRunningCount(),
      runningTaskIds: parallelExecutor.getRunningTaskIds()
    });
  });

  /**
   * POST /api/parallel/cancel-all - 取消所有平行任務
   */
  router.post('/parallel/cancel-all', (req: Request, res: Response) => {
    parallelExecutor.cancelAllTasks();
    res.json({ success: true, message: '已取消所有平行任務' });
  });

  // ============================================================
  // Agent 管理 API
  // ============================================================

  /**
   * GET /api/agents/health - 所有 Agent 健康狀態
   */
  router.get('/agents/health', (req: Request, res: Response) => {
    const health = executorAgents.getAgentHealth();
    res.json(health);
  });

  /**
   * POST /api/agents/:agentType/reset - 重置特定 Agent
   */
  router.post('/agents/:agentType/reset', (req: Request, res: Response) => {
    const { agentType } = req.params;
    executorAgents.resetAgent(agentType as AgentType);
    res.json({ success: true, message: `${agentType} 已重置` });
  });

  /**
   * POST /api/agents/analyze - 分析任務並建議 Agent
   */
  router.post('/agents/analyze', (req: Request, res: Response) => {
    const { task } = req.body;
    
    if (!task) {
      return res.status(400).json({ error: '缺少任務描述' });
    }

    const analysis = executorAgents.analyzeTask(task);
    const config = executorAgents.selectAgent(analysis);

    res.json({
      analysis,
      recommendedAgent: config.agentType,
      config
    });
  });

  // ============================================================
  // 控制中心 API
  // ============================================================

  /**
   * POST /api/center/initialize - 初始化中控台
   */
  router.post('/center/initialize', (req: Request, res: Response) => {
    center.initialize();
    res.json({ success: true, message: '中控台已初始化' });
  });

  /**
   * POST /api/center/shutdown - 關閉中控台
   */
  router.post('/center/shutdown', (req: Request, res: Response) => {
    center.shutdown();
    res.json({ success: true, message: '中控台已關閉' });
  });

  /**
   * GET /api/center/report - 完整報告
   */
  router.get('/center/report', (req: Request, res: Response) => {
    const report = center.getHealthReport();
    res.json(report);
  });

  // ============================================================
  // 記憶系統 API
  // ============================================================

  /**
   * GET /api/memory/status - 記憶系統狀態
   */
  router.get('/memory/status', async (req: Request, res: Response) => {
    try {
      const stats = await center.getMemoryStats();
      res.json({
        enabled: true,
        ...stats,
        timestamp: Date.now()
      });
    } catch (error) {
      res.json({
        enabled: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      });
    }
  });

  /**
   * POST /api/memory/query - 查詢記憶
   * Body: { query: string, options?: MemoryQueryOptions }
   */
  router.post('/memory/query', async (req: Request, res: Response) => {
    try {
      const { query, options } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: '缺少查詢文本 (query)' });
      }

      const memories = await center.queryMemories(query, options);
      
      res.json({
        success: true,
        query,
        count: memories.length,
        memories
      });
    } catch (error) {
      console.error('[API] 查詢記憶失敗:', error);
      res.status(500).json({
        error: '查詢記憶失敗',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * POST /api/memory/record - 手動記錄記憶
   * Body: TaskMemory
   */
  router.post('/memory/record', async (req: Request, res: Response) => {
    try {
      const memory = req.body;
      
      if (!memory.taskDescription) {
        return res.status(400).json({ error: '缺少必要欄位: taskDescription' });
      }

      const success = await center.recordMemory({
        id: memory.id || `mem-${Date.now()}`,
        timestamp: Date.now(),
        ...memory
      });

      res.json({
        success,
        message: success ? '記憶已記錄' : '記錄失敗'
      });
    } catch (error) {
      console.error('[API] 記錄記憶失敗:', error);
      res.status(500).json({
        error: '記錄記憶失敗',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * GET /api/memory/context/:workflowId - 取得任務的記憶上下文
   */
  router.get('/memory/context/:workflowId', async (req: Request, res: Response) => {
    try {
      const workflowId = req.params.workflowId as string;
      const workflow = workflowEngine.getWorkflow(workflowId);
      
      if (!workflow) {
        return res.status(404).json({ error: '工作流程不存在' });
      }

      // 獲取記憶上下文
      const memories = await center.queryMemories(workflow.name, {
        strategy: 'hybrid',
        limit: 5
      });

      res.json({
        workflowId,
        taskDescription: workflow.name,
        relevantMemories: memories,
        count: memories.length
      });
    } catch (error) {
      console.error('[API] 取得記憶上下文失敗:', error);
      res.status(500).json({
        error: '取得記憶上下文失敗',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  return router;
}

// 導出路由創建函數
export default createTaskBoardRoutes;
