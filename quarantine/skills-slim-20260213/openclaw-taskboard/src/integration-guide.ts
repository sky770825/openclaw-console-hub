/**
 * TaskBoard Integration Guide - 任務板整合指南
 * 
 * 說明如何將中控台整合到現有任務板系統
 */

import { Router } from 'express';
import { createTaskBoardRoutes } from './api-routes';
import { getCenter } from './taskboard-center';

// ============================================================
// 方法一：整合到現有 Express 伺服器
// ============================================================

/**
 * 方法1: 掛載到現有 Express 應用
 */
export function integrateWithExistingServer(app: any, apiPrefix = '/api/openclaw') {
  const routes = createTaskBoardRoutes();
  app.use(apiPrefix, routes);
  
  console.log(`✅ TaskBoard API 已掛載到 ${apiPrefix}`);
  
  // 初始化中控台
  const center = getCenter();
  center.initialize();
  
  return { routes, center };
}

// ============================================================
// 方法二：獨立啟動
// ============================================================

/**
 * 方法2: 獨立啟動任務板伺服器
 * 
 * 使用方式:
 * ```bash
 * # 設定環境變數
 * export TASKBOARD_PORT=3011
 * export TELEGRAM_ENABLED=true
 * export TELEGRAM_BOT_TOKEN=your_token
 * export TELEGRAM_CHAT_ID=your_chat_id
 * 
 * # 啟動
 * ts-node server.ts
 * ```
 */

// ============================================================
// 方法三：程式化使用
// ============================================================

/**
 * 方法3: 在程式中直接使用中控台
 */
export async function exampleProgrammaticUsage() {
  const { getCenter } = require('./taskboard-center');
  
  // 獲取中控台實例
  const center = getCenter({
    antiStuck: {
      circuitBreaker: true,
      watchdog: true,
      parallelExecutor: true
    }
  });
  
  // 初始化
  center.initialize();
  
  // 指派任務（自動分析並編排）
  const { workflowId, plan } = await center.assignTask(
    "寫一個電商網站，要有前後端",
    { workingDir: "~/project" }
  );
  
  console.log('執行計畫:', plan);
  
  // 執行
  const result = await center.execute(workflowId);
  
  console.log('執行結果:', result);
  
  return result;
}

// ============================================================
// API 端點一覽
// ============================================================

export const API_ENDPOINTS = {
  // 系統狀態
  'GET /api/openclaw/health': '系統健康檢查',
  'GET /api/openclaw/status': '詳細狀態報告',
  
  // 任務管理
  'POST /api/openclaw/tasks': '建立任務（自動分析編排）',
  'POST /api/openclaw/tasks/execute': '建立並立即執行',
  'GET /api/openclaw/tasks/:workflowId': '獲取任務詳情',
  'POST /api/openclaw/tasks/:workflowId/run': '執行任務',
  'POST /api/openclaw/tasks/:workflowId/cancel': '取消任務',
  
  // 工作流程
  'GET /api/openclaw/workflows': '獲取所有工作流程',
  'GET /api/openclaw/workflows/:workflowId/progress': '獲取進度',
  
  // Agent 管理
  'GET /api/openclaw/agents/health': '所有 Agent 健康狀態',
  'POST /api/openclaw/agents/analyze': '分析任務並建議 Agent',
  'POST /api/openclaw/agents/:agentType/reset': '重置特定 Agent',
  
  // Circuit Breaker
  'GET /api/openclaw/circuit-breaker/status': '斷路器狀態',
  'GET /api/openclaw/circuit-breaker/:agentId': '特定 Agent 狀態',
  'POST /api/openclaw/circuit-breaker/:agentId/reset': '重置斷路器',
  
  // Watchdog
  'GET /api/openclaw/watchdog/status': 'Watchdog 狀態',
  'POST /api/openclaw/watchdog/start': '啟動 Watchdog',
  'POST /api/openclaw/watchdog/stop': '停止 Watchdog',
  'POST /api/openclaw/watchdog/tasks/:runId/kill': '強制終止任務',
  
  // Parallel Executor
  'GET /api/openclaw/parallel/status': '平行執行器狀態',
  'POST /api/openclaw/parallel/cancel-all': '取消所有平行任務',
  
  // 控制中心
  'GET /api/openclaw/center/report': '完整系統報告',
  'POST /api/openclaw/center/initialize': '初始化中控台',
  'POST /api/openclaw/center/shutdown': '關閉中控台'
};

// ============================================================
// 使用範例
// ============================================================

/**
 * 範例1: 簡單任務
 */
export async function exampleSimpleTask() {
  // POST /api/openclaw/tasks
  const request = {
    description: "研究 Moltbook API 並整理重點",
    priority: "normal"
  };
  
  // 回應
  const response = {
    success: true,
    workflowId: "wf-1234567890",
    analysis: {
      type: "research",
      complexity: "low",
      scope: "single-file",
      requiresCoding: false,
      canParallelize: false
    },
    plan: "執行計畫..."
  };
  
  return { request, response };
}

/**
 * 範例2: 複雜開發任務（多層協作）
 */
export async function exampleComplexTask() {
  // POST /api/openclaw/tasks
  const request = {
    description: "開發一個完整的電商網站，包含前後端",
    workingDir: "~/projects/ecommerce",
    priority: "high"
  };
  
  // 回應
  const response = {
    success: true,
    workflowId: "wf-1234567890",
    analysis: {
      type: "composite",
      complexity: "high",
      scope: "project-wide",
      requiresCoding: true,
      canParallelize: true
    },
    plan: `
📋 執行計畫:
━━━━━━━━━━━━━━━━━━━━━

第 2 層 (專案經理):
  📊 architect - 模組規劃 (subagent)
  📊 backend - 模組規劃 (subagent)
  📊 frontend - 模組規劃 (subagent)

第 3 層 (工程師):
  ⚙️ backend - 程式實作 (codex)
  🔧 frontend - 程式實作 (cursor)
  🔧 architect - 程式實作 (cursor)

最終:
  📊 整合與驗證 (subagent)

━━━━━━━━━━━━━━━━━━━━━
    `
  };
  
  return { request, response };
}

/**
 * 範例3: 強制使用特定 Agent
 */
export async function exampleForceAgent() {
  // POST /api/openclaw/tasks
  const request = {
    description: "重構這個 React 元件",
    workingDir: "~/project",
    files: ["src/components/Button.tsx"],
    forceAgent: "cursor" // 強制使用 Cursor
  };
  
  return { request };
}

// ============================================================
// 前端整合範例
// ============================================================

/**
 * React Hook 範例
 */
export const reactHookExample = `
// useTaskBoard.ts
import { useState, useCallback } from 'react';

const API_BASE = 'http://localhost:3011/api/openclaw';

export function useTaskBoard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignTask = useCallback(async (description: string, options?: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(\`\${API_BASE}/tasks\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, ...options })
      });
      
      const data = await res.json();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const executeTask = useCallback(async (workflowId: string) => {
    setLoading(true);
    
    try {
      const res = await fetch(\`\${API_BASE}/tasks/\${workflowId}/run\`, {
        method: 'POST'
      });
      
      const data = await res.json();
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const getStatus = useCallback(async (workflowId?: string) => {
    const url = workflowId 
      ? \`\${API_BASE}/tasks/\${workflowId}\`
      : \`\${API_BASE}/status\`;
      
    const res = await fetch(url);
    return res.json();
  }, []);

  return { assignTask, executeTask, getStatus, loading, error };
}
`;

// 導出整合函數
export { integrateWithExistingServer };
export default integrateWithExistingServer;
