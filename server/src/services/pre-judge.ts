import { logger } from '../utils/logger.js';

/**
 * 🎯 本地 Qwen3 預判服務 (Pre-Judge Service)
 * 
 * 使用本地 Qwen3:4b 模型進行快速預判
 * 減少無效工具呼叫，降低 Token 成本
 */

interface PreJudgeRequest {
  task: string;
  context?: string;
  availableTools: string[];
}

interface PreJudgeResult {
  shouldProceed: boolean;
  recommendedTools: string[];
  reasoning: string;
  confidence: number;
  estimatedTokens: number;
}

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const QWEN_MODEL = 'qwen3:4b';

/**
 * 執行預判
 */
export async function preJudge(
  request: PreJudgeRequest
): Promise<PreJudgeResult> {
  const startTime = Date.now();

  try {
    // 構建預判提示
    const prompt = buildPreJudgePrompt(request);

    // 呼叫本地 Qwen3:4b
    const response = await callQwen3(prompt);

    // 解析結果
    const result = parsePreJudgeResponse(response);

    logger.info({
      component: 'pre-judge',
      action: 'judgment-completed',
      task: request.task.substring(0, 50),
      shouldProceed: result.shouldProceed,
      confidence: result.confidence,
      duration: Date.now() - startTime,
    });

    return result;
  } catch (error) {
    logger.error({
      component: 'pre-judge',
      action: 'judgment-failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // 失敗時保守策略：允許繼續執行
    return {
      shouldProceed: true,
      recommendedTools: request.availableTools,
      reasoning: '預判服務失敗，採用保守策略允許執行',
      confidence: 0.5,
      estimatedTokens: 0,
    };
  }
}

/**
 * 構建預判提示
 */
function buildPreJudgePrompt(request: PreJudgeRequest): string {
  return `你是一個任務預判專家。請分析以下任務，判斷是否應該執行，並推薦最適合的工具。

【任務描述】
${request.task}

${request.context ? `【上下文】\n${request.context}\n` : ''}

【可用工具】
${request.availableTools.map(t => `- ${t}`).join('\n')}

請以 JSON 格式回覆：
{
  "shouldProceed": true/false,  // 是否建議執行此任務
  "recommendedTools": ["tool1", "tool2"],  // 推薦使用的工具
  "reasoning": "簡短說明原因",  // 判斷理由
  "confidence": 0.8,  // 信心指數 0-1
  "estimatedTokens": 1000  // 預估需要的 Token 數
}

只回覆 JSON，不要其他說明。`;
}

/**
 * 呼叫本地 Qwen3:4b
 */
async function callQwen3(prompt: string): Promise<string> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: QWEN_MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0.3,  // 低溫度確保穩定性
        num_predict: 500,  // 限制輸出長度
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}`);
  }

  const data = await response.json();
  return data.response || '';
}

/**
 * 解析預判回應
 */
function parsePreJudgeResponse(response: string): PreJudgeResult {
  try {
    // 提取 JSON 部分
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      shouldProceed: parsed.shouldProceed ?? true,
      recommendedTools: parsed.recommendedTools || [],
      reasoning: parsed.reasoning || '未提供理由',
      confidence: Math.min(Math.max(parsed.confidence ?? 0.5, 0), 1),
      estimatedTokens: parsed.estimatedTokens || 0,
    };
  } catch (error) {
    logger.warn({
      component: 'pre-judge',
      action: 'parse-failed',
      response: response.substring(0, 200),
    });

    // 解析失敗時返回預設值
    return {
      shouldProceed: true,
      recommendedTools: [],
      reasoning: '無法解析預判結果',
      confidence: 0.5,
      estimatedTokens: 0,
    };
  }
}

/**
 * 健康檢查
 */
export async function checkPreJudgeHealth(): Promise<{
  healthy: boolean;
  modelAvailable: boolean;
  latency: number;
}> {
  const startTime = Date.now();

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
    });

    const models = await response.json();
    const modelAvailable = models.models?.some(
      (m: any) => m.name === QWEN_MODEL
    ) ?? false;

    return {
      healthy: response.ok,
      modelAvailable,
      latency: Date.now() - startTime,
    };
  } catch (error) {
    return {
      healthy: false,
      modelAvailable: false,
      latency: Date.now() - startTime,
    };
  }
}
