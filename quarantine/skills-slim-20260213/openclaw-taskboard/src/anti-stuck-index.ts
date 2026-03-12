/**
 * Anti-Stuck System + Multi-Layer Orchestrator (防卡機制 + 多層指揮中心)
 * 
 * 整合所有任務板核心模組：
 * 1. Circuit Breaker - 斷路器模式
 * 2. Parallel Executor - 平行子代理執行
 * 3. Watchdog - 健康監控
 * 4. Executor Agents - Agent 選擇器
 * 5. Workflow Engine - 工作流程引擎
 * 6. Multi-Layer Orchestrator - 多層指揮中心
 */

// ============================================================
// Circuit Breaker
// ============================================================
export {
  CircuitBreaker,
  circuitBreaker,
  withCircuitBreaker,
  CircuitState,
  type CircuitBreakerConfig,
  type AgentCircuitState
} from './circuit-breaker';

// ============================================================
// Parallel Executor
// ============================================================
export {
  ParallelExecutor,
  parallelExecutor,
  executeParallel,
  type SubTask,
  type SubTaskResult,
  type ParallelExecutionOptions,
  type ParallelExecutionResult
} from './parallel-executor';

// ============================================================
// Watchdog
// ============================================================
export {
  Watchdog,
  watchdog,
  createTelegramNotifier,
  createLogNotifier,
  type WatchdogConfig,
  type MonitoredTask,
  type HealthStatus,
  type WatchdogAlert
} from './watchdog';

// ============================================================
// Executor Agents (Agent 選擇器)
// ============================================================
export {
  executorAgents,
  analyzeTask,
  selectAgent,
  planTaskExecution,
  getAgentHealth,
  resetAgent,
  type AgentType,
  type TaskAnalysis,
  type ExecutorConfig,
  type MultiLayerConfig,
  type ExecutionLayer
} from './executor-agents';

// ============================================================
// Workflow Engine (工作流程引擎)
// ============================================================
export {
  WorkflowEngine,
  workflowEngine,
  type Workflow,
  type WorkflowTask,
  type WorkflowResult
} from './workflow-engine';

// ============================================================
// Multi-Layer Orchestrator (多層指揮中心)
// ============================================================
export {
  MultiLayerOrchestrator,
  orchestrator,
  initOrchestrator,
  submitTask,
  getStatus,
  createOrchestratorRoutes,
  type TaskRequest,
  type TaskResponse,
  type SystemStatus
} from './multi-layer-orchestrator';

// ============================================================
// 快速啟動函數
// ============================================================

export interface OrchestratorOptions {
  enableWatchdog?: boolean;
  enableCircuitBreaker?: boolean;
  telegramSendMessage?: (message: string) => Promise<void>;
}

/**
 * 一鍵啟動完整中控台
 */
export function initializeTaskBoard(options: OrchestratorOptions = {}): {
  orchestrator: typeof import('./multi-layer-orchestrator').orchestrator;
  circuitBreaker: typeof import('./circuit-breaker').circuitBreaker;
  parallelExecutor: typeof import('./parallel-executor').parallelExecutor;
  watchdog: typeof import('./watchdog').watchdog;
} {
  const { initOrchestrator } = require('./multi-layer-orchestrator');
  const { circuitBreaker } = require('./circuit-breaker');
  const { parallelExecutor } = require('./parallel-executor');
  const { watchdog } = require('./watchdog');

  // 初始化指揮中心
  const orchestrator = initOrchestrator(options.telegramSendMessage);

  console.log('🚀 TaskBoard 中控台已啟動');
  console.log('========================');
  console.log('✅ Circuit Breaker: 已啟用');
  console.log('✅ Parallel Executor: 已啟用');
  console.log('✅ Watchdog: 已啟用');
  console.log('✅ Executor Agents: 已啟用');
  console.log('✅ Workflow Engine: 已啟用');
  console.log('✅ Multi-Layer Orchestrator: 已啟用');

  return {
    orchestrator,
    circuitBreaker,
    parallelExecutor,
    watchdog
  };
}

/**
 * 獲取完整健康報告
 */
export function getFullHealthReport(): {
  orchestrator: ReturnType<typeof import('./multi-layer-orchestrator').orchestrator.getSystemStatus>;
  circuitBreaker: ReturnType<typeof import('./circuit-breaker').circuitBreaker.getSummary>;
  watchdog: ReturnType<typeof import('./watchdog').watchdog.getHealthStatus>;
  timestamp: number;
} {
  const { orchestrator } = require('./multi-layer-orchestrator');
  const { circuitBreaker } = require('./circuit-breaker');
  const { watchdog } = require('./watchdog');

  return {
    orchestrator: orchestrator.getSystemStatus(),
    circuitBreaker: circuitBreaker.getSummary(),
    watchdog: watchdog.getHealthStatus(),
    timestamp: Date.now()
  };
}

// 版本
export const VERSION = '2.0.0';
export const BUILD_DATE = '2026-02-11';
