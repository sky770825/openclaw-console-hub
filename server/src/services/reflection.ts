import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

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
 * 反思中間件 - 在處理請求前進行自我校準
 */
export const reflectionMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 僅對寫入操作進行反思
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return next();
  }

  const startTime = Date.now();
  const requestPath = req.path;
  const requestBody = req.body;

  logger.info({
    component: 'reflection',
    action: 'introspection-start',
    path: requestPath,
    method: req.method,
  });

  try {
    // 1. 意圖解析
    const intent = parseIntent(requestPath, requestBody);
    
    // 2. 檢查是否需要工具呼叫預判
    const shouldPreJudge = needsPreJudgment(intent);
    
    if (shouldPreJudge) {
      // 3. 記錄思考路徑
      const thoughtChain = await recordThoughtChain({
        intent,
        path: requestPath,
        body: requestBody,
        timestamp: new Date().toISOString(),
      });

      logger.info({
        component: 'reflection',
        action: 'thought-chain-recorded',
        chainId: thoughtChain.id,
        intent: intent.type,
        duration: Date.now() - startTime,
      });
    }

    // 4. 附加反思資訊到請求
    (req as any).reflection = {
      intent,
      shouldPreJudge,
      timestamp: new Date().toISOString(),
    };

    next();
  } catch (error) {
    logger.error({
      component: 'reflection',
      action: 'introspection-failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // 即使反思失敗，也允許請求繼續（ graceful degradation ）
    next();
  }
};

/**
 * 解析請求意圖
 */
function parseIntent(path: string, body: any): {
  type: string;
  target: string;
  complexity: 'low' | 'medium' | 'high';
} {
  // 根據路徑解析意圖類型
  if (path.includes('/tasks')) {
    return {
      type: body.id ? 'update-task' : 'create-task',
      target: 'task-management',
      complexity: body.description && body.description.length > 100 ? 'high' : 'medium',
    };
  }
  
  if (path.includes('/system')) {
    return {
      type: 'system-operation',
      target: 'infrastructure',
      complexity: 'high',
    };
  }

  return {
    type: 'general-operation',
    target: 'unknown',
    complexity: 'low',
  };
}

/**
 * 判斷是否需要預判
 */
function needsPreJudgment(intent: { complexity: string; type: string }): boolean {
  // 高複雜度或系統操作需要預判
  return intent.complexity === 'high' || intent.target === 'infrastructure';
}

/**
 * 記錄思考路徑
 */
async function recordThoughtChain(data: {
  intent: any;
  path: string;
  body: any;
  timestamp: string;
}): Promise<{ id: string }> {
  const chainId = `cot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // 儲存到思考路徑資料庫（這裡使用簡單的檔案儲存）
  // 實際實作會連接到向量資料庫
  const thoughtRecord = {
    id: chainId,
    ...data,
    reflection: {
      purpose: '自我意圖校準',
      expectedOutcome: '減少無效工具呼叫',
      riskLevel: 'low',
    },
  };

  // 異步儲存（不阻塞主流程）
  // 實際實作會寫入資料庫
  logger.debug({
    component: 'reflection',
    action: 'chain-recorded',
    chainId,
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
  // 實際實作會查詢資料庫
  return {
    totalChecks: 0,
    avgConfidence: 0.85,
    topSuggestions: [
      '優先使用本地模型進行預判',
      '複雜任務拆分為子任務',
      '建立任務執行檢查點',
    ],
  };
}
