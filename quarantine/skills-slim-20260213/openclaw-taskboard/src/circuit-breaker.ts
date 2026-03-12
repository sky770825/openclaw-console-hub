/**
 * Circuit Breaker (斷路器模式)
 * 防止持續發送任務給已經失敗的 Agent
 */

export enum CircuitState {
  CLOSED = 'closed',     // 正常運作
  OPEN = 'open',         // 斷路中
  HALF_OPEN = 'half_open' // 測試恢復中
}

export interface CircuitBreakerConfig {
  failureThreshold: number;    // 連續失敗多少次後斷路 (預設 3)
  recoveryTimeout: number;     // 冷卻時間 ms (預設 5 分鐘)
  halfOpenMaxCalls: number;    // 測試狀態最大請求數 (預設 1)
}

export interface AgentCircuitState {
  agentId: string;
  state: CircuitState;
  failureCount: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  halfOpenCalls: number;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  recoveryTimeout: 5 * 60 * 1000, // 5 分鐘
  halfOpenMaxCalls: 1
};

class CircuitBreaker {
  private states: Map<string, AgentCircuitState> = new Map();
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 檢查是否可以執行任務
   */
  canExecute(agentId: string): { allowed: boolean; reason?: string } {
    const state = this.getOrCreateState(agentId);

    if (state.state === CircuitState.OPEN) {
      // 檢查是否應該嘗試恢復
      if (this.shouldAttemptReset(state)) {
        state.state = CircuitState.HALF_OPEN;
        state.halfOpenCalls = 0;
        return { allowed: true, reason: '進入測試恢復狀態' };
      }
      return { 
        allowed: false, 
        reason: `Agent ${agentId} 斷路中，請等待 ${this.getRemainingCooldown(state)} 秒` 
      };
    }

    if (state.state === CircuitState.HALF_OPEN) {
      if (state.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        return { 
          allowed: false, 
          reason: '測試狀態請求數已達上限' 
        };
      }
      state.halfOpenCalls++;
      return { allowed: true, reason: '測試恢復中' };
    }

    return { allowed: true };
  }

  /**
   * 記錄成功
   */
  recordSuccess(agentId: string): void {
    const state = this.getOrCreateState(agentId);
    state.totalCalls++;
    state.successfulCalls++;
    state.lastSuccessTime = Date.now();

    if (state.state === CircuitState.HALF_OPEN) {
      // 測試成功，恢復正常
      state.state = CircuitState.CLOSED;
      state.failureCount = 0;
      state.halfOpenCalls = 0;
      console.log(`[CircuitBreaker] Agent ${agentId} 測試成功，恢復正常運作`);
    }
  }

  /**
   * 記錄失敗
   */
  recordFailure(agentId: string): void {
    const state = this.getOrCreateState(agentId);
    state.totalCalls++;
    state.failedCalls++;
    state.failureCount++;
    state.lastFailureTime = Date.now();

    if (state.state === CircuitState.HALF_OPEN) {
      // 測試失敗，重新斷路
      state.state = CircuitState.OPEN;
      state.halfOpenCalls = 0;
      console.log(`[CircuitBreaker] Agent ${agentId} 測試失敗，重新斷路`);
    } else if (state.failureCount >= this.config.failureThreshold) {
      // 達到失敗閾值，斷路
      state.state = CircuitState.OPEN;
      console.log(`[CircuitBreaker] Agent ${agentId} 連續失敗 ${state.failureCount} 次，已斷路`);
    }
  }

  /**
   * 手動重置斷路器
   */
  reset(agentId: string): void {
    this.states.delete(agentId);
    console.log(`[CircuitBreaker] Agent ${agentId} 已手動重置`);
  }

  /**
   * 獲取所有 Agent 狀態
   */
  getAllStates(): AgentCircuitState[] {
    return Array.from(this.states.values());
  }

  /**
   * 獲取特定 Agent 狀態
   */
  getState(agentId: string): AgentCircuitState | null {
    return this.states.get(agentId) || null;
  }

  /**
   * 獲取統計摘要
   */
  getSummary(): {
    totalAgents: number;
    closed: number;
    open: number;
    halfOpen: number;
  } {
    const states = this.getAllStates();
    return {
      totalAgents: states.length,
      closed: states.filter(s => s.state === CircuitState.CLOSED).length,
      open: states.filter(s => s.state === CircuitState.OPEN).length,
      halfOpen: states.filter(s => s.state === CircuitState.HALF_OPEN).length
    };
  }

  private getOrCreateState(agentId: string): AgentCircuitState {
    if (!this.states.has(agentId)) {
      this.states.set(agentId, {
        agentId,
        state: CircuitState.CLOSED,
        failureCount: 0,
        lastFailureTime: null,
        lastSuccessTime: null,
        halfOpenCalls: 0,
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0
      });
    }
    return this.states.get(agentId)!;
  }

  private shouldAttemptReset(state: AgentCircuitState): boolean {
    if (!state.lastFailureTime) return false;
    const elapsed = Date.now() - state.lastFailureTime;
    return elapsed >= this.config.recoveryTimeout;
  }

  private getRemainingCooldown(state: AgentCircuitState): number {
    if (!state.lastFailureTime) return 0;
    const elapsed = Date.now() - state.lastFailureTime;
    const remaining = this.config.recoveryTimeout - elapsed;
    return Math.max(0, Math.ceil(remaining / 1000));
  }
}

// 單例實例
export const circuitBreaker = new CircuitBreaker();

// 輔助函數：包裝執行函數
export async function withCircuitBreaker<T>(
  agentId: string,
  fn: () => Promise<T>
): Promise<T> {
  const check = circuitBreaker.canExecute(agentId);
  if (!check.allowed) {
    throw new Error(`CircuitBreaker: ${check.reason}`);
  }

  try {
    const result = await fn();
    circuitBreaker.recordSuccess(agentId);
    return result;
  } catch (error) {
    circuitBreaker.recordFailure(agentId);
    throw error;
  }
}

export default CircuitBreaker;
export { CircuitBreaker };
