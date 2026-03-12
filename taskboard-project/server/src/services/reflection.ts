import { logger } from "../utils/logger.js";

/**
 * 🧠 元認知監控層 (Meta-Cognition Layer)
 * 
 * 核心概念：在 Agent 執行任務前進行「自我意圖校準」
 * 減少無效工具呼叫，提升任務成功率
 */

interface IntentionCheck {
  timestamp: string;
  originalIntent: string;
  toolCalls: string[];
  confidence: number;
  suggestions: string[];
}

/**
 * 解析請求意圖
 */
export function parseIntent(path: string, body: any): {
  type: string;
  target: string;
  complexity: "low" | "medium" | "high";
} {
  if (path.includes("/tasks")) {
    return {
      type: body.id ? "update-task" : "create-task",
      target: "task-management",
      complexity: body.description && body.description.length > 100 ? "high" : "medium",
    };
  }

  if (path.includes("/system")) {
    return {
      type: "system-operation",
      target: "infrastructure",
      complexity: "high",
    };
  }

  return {
    type: "general-operation",
    target: "unknown",
    complexity: "low",
  };
}

/**
 * 判斷是否需要預判
 */
export function needsPreJudgment(intent: { complexity: string; type: string; target?: string }): boolean {
  return intent.complexity === "high" || intent.target === "infrastructure";
}

/**
 * 記錄思考路徑
 */
export async function recordThoughtChain(data: {
  intent: any;
  path: string;
  body: any;
  timestamp: string;
}): Promise<{ id: string }> {
  const chainId = `cot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  logger.debug({
    component: "reflection",
    action: "chain-recorded",
    chainId,
    intent: data.intent.type,
  });

  return { id: chainId };
}

/**
 * 獲取反思統計
 */
export async function getReflectionStats(): Promise<{
  totalChecks: number;
  avgConfidence: number;
  topSuggestions: string[];
}> {
  return {
    totalChecks: 0,
    avgConfidence: 0.85,
    topSuggestions: [
      "優先使用本地模型進行預判",
      "複雜任務拆分為子任務",
      "建立任務執行檢查點",
    ],
  };
}
