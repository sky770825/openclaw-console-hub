/**
 * 錯誤處理與自動指派模組
 * 根據錯誤類型自動創建除錯任務並指派給對應的 Agent
 */

import { createLogger } from './logger.js';
import type { AgentType } from './types.js';

const log = createLogger('error-handler');

// 錯誤類型定義
export type ErrorType = 
  | 'frontend'
  | 'backend'
  | 'system'
  | 'api'
  | 'database'
  | 'unknown';

// 錯誤分類規則
interface ErrorPattern {
  type: ErrorType;
  patterns: RegExp[];
  agent: AgentType;
}

// 錯誤模式資料庫
const errorPatterns: ErrorPattern[] = [
  {
    type: 'frontend',
    patterns: [
      /react|vue|angular/i,
      /component|render|jsx|tsx/i,
      /css|tailwind|style/i,
      /ui|button|modal|dialog/i,
      /hook|useState|useEffect/i,
      /TypeError.*undefined.*component/i,
      /Cannot read properties of null/i,
      /Rendered fewer hooks/i
    ],
    agent: 'cursor'
  },
  {
    type: 'backend',
    patterns: [
      /syntax.*error/i,
      /reference.*error/i,
      /type.*error/i,
      /logic|algorithm|function/i,
      /handler|controller|service/i,
      /Cannot find module/i,
      /is not a function/i,
      /undefined.*is.*not.*a/i
    ],
    agent: 'codex'
  },
  {
    type: 'system',
    patterns: [
      /permission.*denied/i,
      /eacces/i,
      /enospc/i,
      /file.*not.*found/i,
      /command.*not.*found/i,
      /spawn.*error/i,
      /SIGKILL|SIGTERM|SIGINT/i,
      /process.*exit/i
    ],
    agent: 'cursor'
  },
  {
    type: 'api',
    patterns: [
      /fetch|axios|request/i,
      /http|status|response/i,
      /timeout|etimedout/i,
      /econnrefused/i,
      /network.*error/i,
      /cors/i,
      /401|403|404|500|502|503/i
    ],
    agent: 'codex'
  },
  {
    type: 'database',
    patterns: [
      /supabase|postgres|sql/i,
      /query.*failed/i,
      /constraint.*violation/i,
      /connection.*refused/i,
      /table.*not.*exist/i,
      /column.*not.*found/i
    ],
    agent: 'codex'
  }
];

/**
 * 分析錯誤類型
 */
export function classifyError(error: Error | string): { type: ErrorType; agent: AgentType; confidence: number } {
  const errorMessage = typeof error === 'string' ? error : error.message + '\n' + (error.stack || '');
  const scores = new Map<ErrorType, number>();
  
  for (const pattern of errorPatterns) {
    let matchCount = 0;
    for (const regex of pattern.patterns) {
      if (regex.test(errorMessage)) {
        matchCount++;
      }
    }
    
    if (matchCount > 0) {
      const score = matchCount / pattern.patterns.length;
      scores.set(pattern.type, score);
    }
  }
  
  let bestType: ErrorType = 'unknown';
  let bestScore = 0;
  
  for (const [type, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }
  
  const pattern = errorPatterns.find(p => p.type === bestType);
  const agent: AgentType = pattern?.agent || 'cursor';
  
  return {
    type: bestType,
    agent,
    confidence: bestScore
  };
}

/**
 * 構建除錯任務描述
 */
function buildDebugDescription(
  originalTaskId: string,
  originalTaskName: string,
  errorMessage: string,
  errorStack: string,
  classification: { type: ErrorType; agent: AgentType; confidence: number },
  context?: { sourceFile?: string; lineNumber?: number; additionalInfo?: string }
): string {
  const sections = [
    `## 🔴 錯誤資訊`,
    `- **原始任務**: ${originalTaskName} (${originalTaskId})`,
    `- **錯誤類型**: ${classification.type}`,
    `- **指派給**: ${classification.agent}`,
    `- **信心度**: ${(classification.confidence * 100).toFixed(0)}%`,
    ``,
    `## 📝 錯誤訊息`,
    '```',
    errorMessage.slice(0, 500),
    '```',
    ``,
    `## 🔍 堆疊追蹤`,
    '```javascript',
    errorStack.slice(0, 1000),
    '```'
  ];
  
  if (context?.sourceFile) {
    sections.push(
      ``,
      `## 📁 相關檔案`,
      `- **檔案**: ${context.sourceFile}${context.lineNumber ? `:${context.lineNumber}` : ''}`
    );
  }
  
  if (context?.additionalInfo) {
    sections.push(
      ``,
      `## ℹ️ 補充資訊`,
      context.additionalInfo
    );
  }
  
  sections.push(
    ``,
    `## ✅ 完成標準`,
    `- [ ] 找出錯誤根本原因`,
    `- [ ] 提供修復方案`,
    `- [ ] 在任務日誌中記錄進度`,
    `- [ ] 標記任務完成並交代結果`,
    ``,
    `## 📝 Agent 回報格式`,
    `完成後請更新任務狀態並在日誌中記錄：`,
    `1. 問題原因`,
    `2. 修復方案`,
    `3. 驗證結果`
  );
  
  return sections.join('\n');
}

/**
 * 處理執行錯誤 - 主要入口
 * 返回除錯任務資訊供上層創建
 */
export function handleExecutionError(
  taskId: string,
  taskName: string,
  error: unknown,
  options?: {
    context?: {
      sourceFile?: string;
      lineNumber?: number;
      additionalInfo?: string;
    }
  }
): {
  shouldCreateDebugTask: boolean;
  debugTaskInfo?: {
    name: string;
    description: string;
    agentType: AgentType;
    errorType: ErrorType;
    parentTaskId: string;
  };
} {
  const err = error instanceof Error ? error : new Error(String(error));
  
  log.error({ taskId, errMsg: err.message }, '[ErrorHandler] 任務執行錯誤');
  
  // 分析錯誤類型
  const classification = classifyError(err);
  
  // 生成除錯任務描述
  const description = buildDebugDescription(
    taskId,
    taskName,
    err.message,
    err.stack || '',
    classification,
    options?.context
  );
  
  log.info(`[ErrorHandler] 建議創建除錯任務，指派給 ${classification.agent}`);
  
  return {
    shouldCreateDebugTask: true,
    debugTaskInfo: {
      name: `🔧 [除錯] ${taskName}`,
      description,
      agentType: classification.agent,
      errorType: classification.type,
      parentTaskId: taskId
    }
  };
}

export { buildDebugDescription };
