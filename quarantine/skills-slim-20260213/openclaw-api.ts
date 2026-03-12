/**
 * OpenClaw API Stub
 * 用於平行執行器的會話生成
 */

export interface SpawnOptions {
  task: string;
  agentId?: string;
  timeoutSeconds?: number;
}

export interface SpawnResult {
  sessionKey: string;
  result?: string;
  error?: string;
}

/**
 * 創建子 Agent 會話（Stub 實現）
 */
export async function sessions_spawn(options: SpawnOptions): Promise<SpawnResult> {
  console.log(`[Stub] sessions_spawn: ${options.task.substring(0, 50)}...`);
  
  // 模擬延遲
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return {
    sessionKey: `stub-session-${Date.now()}`,
    result: 'Stub execution completed'
  };
}

export default { sessions_spawn };
