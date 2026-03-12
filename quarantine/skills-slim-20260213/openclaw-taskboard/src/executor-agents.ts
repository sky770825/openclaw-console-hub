/**
 * Executor Agents - Agent 選擇器與執行器
 * 
 * 根據任務類型、複雜度、成本限制，選擇最適合的 Agent
 */

import { CircuitBreaker, circuitBreaker } from './circuit-breaker';
import { parallelExecutor } from './parallel-executor';

export type AgentType = 'cursor' | 'codex' | 'openclaw' | 'subagent' | 'auto';
export type ExecutionLayer = 'single' | 'multi' | 'parallel';

export interface TaskAnalysis {
  type: 'coding' | 'research' | 'analysis' | 'automation' | 'writing' | 'composite';
  complexity: 'low' | 'medium' | 'high';
  scope: 'single-file' | 'multi-file' | 'project-wide';
  requiresCoding: boolean;
  canParallelize: boolean;
  estimatedDuration: 'short' | 'medium' | 'long';
}

export interface ExecutorConfig {
  agentType: AgentType;
  model?: string;
  approvalMode: 'auto' | 'manual' | 'suggest';
  timeout: number;
  maxRetries: number;
  workingDir?: string;
  files?: string[];
}

export interface MultiLayerConfig {
  enableParallel: boolean;
  subAgentCount: number;
  subAgentRoles: string[];
  executionStrategy: 'sequential' | 'parallel' | 'hybrid';
}

/**
 * 分析任務特性
 */
export function analyzeTask(taskDescription: string): TaskAnalysis {
  const lower = taskDescription.toLowerCase();
  
  // 判斷類型
  let type: TaskAnalysis['type'] = 'research';
  if (lower.includes('寫') || lower.includes('code') || lower.includes('程式') || 
      lower.includes('開發') || lower.includes('api') || lower.includes('功能')) {
    type = 'coding';
  } else if (lower.includes('分析') || lower.includes('分析') || lower.includes('review')) {
    type = 'analysis';
  } else if (lower.includes('自動') || lower.includes('批次') || lower.includes('定時')) {
    type = 'automation';
  } else if (lower.includes('網站') || lower.includes('網頁') || lower.includes('前後端') ||
             lower.includes('完整') || lower.includes('系統')) {
    type = 'composite';
  }

  // 判斷複雜度
  let complexity: TaskAnalysis['complexity'] = 'low';
  const highComplexityKeywords = ['重構', '重寫', '架構', '系統', '完整', '大型', '複雜'];
  const mediumComplexityKeywords = ['修改', '優化', '新增功能', '多個', '整合'];
  
  if (highComplexityKeywords.some(k => lower.includes(k))) {
    complexity = 'high';
  } else if (mediumComplexityKeywords.some(k => lower.includes(k))) {
    complexity = 'medium';
  }

  // 判斷範圍
  let scope: TaskAnalysis['scope'] = 'single-file';
  if (lower.includes('專案') || lower.includes('整個') || lower.includes('全部')) {
    scope = 'project-wide';
  } else if (lower.includes('多個') || lower.includes('幾個') || lower.includes('批次')) {
    scope = 'multi-file';
  }

  // 是否需要編碼
  const requiresCoding = type === 'coding' || type === 'composite';

  // 可否平行化
  const canParallelize = complexity === 'high' || scope === 'project-wide';

  // 預估時間
  let estimatedDuration: TaskAnalysis['estimatedDuration'] = 'short';
  if (complexity === 'high') {
    estimatedDuration = 'long';
  } else if (complexity === 'medium' || scope === 'multi-file') {
    estimatedDuration = 'medium';
  }

  return {
    type,
    complexity,
    scope,
    requiresCoding,
    canParallelize,
    estimatedDuration
  };
}

/**
 * 選擇最適合的 Agent
 */
export function selectAgent(analysis: TaskAnalysis): ExecutorConfig {
  // 檢查斷路器狀態
  const agentStates: Record<AgentType, { allowed: boolean; reason?: string }> = {
    cursor: circuitBreaker.canExecute('cursor'),
    codex: circuitBreaker.canExecute('codex'),
    openclaw: circuitBreaker.canExecute('openclaw'),
    subagent: circuitBreaker.canExecute('subagent'),
    auto: { allowed: true }
  };

  // 根據任務類型選擇
  if (analysis.type === 'automation' || analysis.type === 'research') {
    // 自動化和研究任務用 OpenClaw
    if (agentStates.openclaw.allowed) {
      return {
        agentType: 'openclaw',
        approvalMode: 'auto',
        timeout: analysis.estimatedDuration === 'long' ? 600 : 300,
        maxRetries: 2
      };
    }
  }

  if (analysis.type === 'coding') {
    if (analysis.complexity === 'high' || analysis.scope === 'project-wide') {
      // 高複雜度用 CoDEX
      if (agentStates.codex.allowed) {
        return {
          agentType: 'codex',
          approvalMode: analysis.complexity === 'high' ? 'suggest' : 'auto',
          timeout: 1800, // 30分鐘
          maxRetries: 2
        };
      }
    }

    // 一般編碼用 Cursor
    if (agentStates.cursor.allowed) {
      return {
        agentType: 'cursor',
        approvalMode: analysis.complexity === 'low' ? 'auto' : 'suggest',
        timeout: analysis.estimatedDuration === 'long' ? 900 : 600,
        maxRetries: 2
      };
    }
  }

  if (analysis.type === 'composite') {
    // 複合任務用 Sub-agent 編排
    if (agentStates.subagent.allowed) {
      return {
        agentType: 'subagent',
        approvalMode: 'auto',
        timeout: 3600, // 1小時
        maxRetries: 1
      };
    }
  }

  // 預設用 OpenClaw
  return {
    agentType: 'openclaw',
    approvalMode: 'auto',
    timeout: 300,
    maxRetries: 2
  };
}

/**
 * 決定執行層級（單層、多層、平行）
 */
export function determineExecutionLayer(
  analysis: TaskAnalysis,
  config: ExecutorConfig
): ExecutionLayer {
  // 複合任務 → 多層
  if (analysis.type === 'composite') {
    return 'multi';
  }

  // 可平行化的高複雜度任務 → 平行
  if (analysis.canParallelize && analysis.complexity === 'high') {
    return 'parallel';
  }

  // 其他 → 單層
  return 'single';
}

/**
 * 生成多層配置
 */
export function generateMultiLayerConfig(analysis: TaskAnalysis): MultiLayerConfig {
  if (analysis.type === 'composite' && analysis.scope === 'project-wide') {
    // 完整網站開發：設計 + 後端 + 前端
    return {
      enableParallel: true,
      subAgentCount: 3,
      subAgentRoles: ['architect', 'backend', 'frontend'],
      executionStrategy: 'hybrid'
    };
  }

  if (analysis.type === 'coding' && analysis.complexity === 'high') {
    // 複雜編碼：分析 + 實作 + 測試
    return {
      enableParallel: false,
      subAgentCount: 3,
      subAgentRoles: ['analyzer', 'implementer', 'tester'],
      executionStrategy: 'sequential'
    };
  }

  // 預設平行研究
  return {
    enableParallel: true,
    subAgentCount: 2,
    subAgentRoles: ['researcher-1', 'researcher-2'],
    executionStrategy: 'parallel'
  };
}

/**
 * 完整的任務規劃
 */
export function planTaskExecution(
  taskDescription: string,
  workingDir?: string,
  files?: string[]
): {
  analysis: TaskAnalysis;
  config: ExecutorConfig;
  layer: ExecutionLayer;
  multiLayerConfig?: MultiLayerConfig;
} {
  const analysis = analyzeTask(taskDescription);
  const config = selectAgent(analysis);
  const layer = determineExecutionLayer(analysis, config);

  // 設定工作目錄和檔案
  if (workingDir) config.workingDir = workingDir;
  if (files) config.files = files;

  let multiLayerConfig: MultiLayerConfig | undefined;
  if (layer === 'multi' || layer === 'parallel') {
    multiLayerConfig = generateMultiLayerConfig(analysis);
  }

  return {
    analysis,
    config,
    layer,
    multiLayerConfig
  };
}

/**
 * 取得 Agent 健康狀態
 */
export function getAgentHealth(): {
  cursor: { state: string; available: boolean };
  codex: { state: string; available: boolean };
  openclaw: { state: string; available: boolean };
  subagent: { state: string; available: boolean };
} {
  return {
    cursor: {
      state: circuitBreaker.getState('cursor')?.state || 'closed',
      available: circuitBreaker.canExecute('cursor').allowed
    },
    codex: {
      state: circuitBreaker.getState('codex')?.state || 'closed',
      available: circuitBreaker.canExecute('codex').allowed
    },
    openclaw: {
      state: circuitBreaker.getState('openclaw')?.state || 'closed',
      available: circuitBreaker.canExecute('openclaw').allowed
    },
    subagent: {
      state: circuitBreaker.getState('subagent')?.state || 'closed',
      available: circuitBreaker.canExecute('subagent').allowed
    }
  };
}

/**
 * 重置 Agent 狀態
 */
export function resetAgent(agentType: AgentType): void {
  circuitBreaker.reset(agentType);
  console.log(`[ExecutorAgents] ${agentType} 已重置`);
}

// 導出預設實例
export const executorAgents = {
  analyzeTask,
  selectAgent,
  planTaskExecution,
  getAgentHealth,
  resetAgent
};

export default executorAgents;
