/**
 * 🔗 數據嫁接引擎 (Data Grafting Engine)
 * 
 * 核心概念：將不同專案的知識「嫁接」到一起
 * 實現跨專案的無縫知識流動
 */

import { logger } from '../utils/logger.js';

interface GraftingRequest {
  sourceProject: string;
  targetProject: string;
  query: string;
  context?: string;
}

interface GraftingResult {
  success: boolean;
  bridges: KnowledgeBridge[];
  confidence: number;
  suggestions: string[];
}

interface KnowledgeBridge {
  id: string;
  source: string;
  target: string;
  relevance: number;
  content: string;
}

/**
 * 執行數據嫁接
 */
export async function graftKnowledge(
  request: GraftingRequest
): Promise<GraftingResult> {
  const startTime = Date.now();

  try {
    logger.info({
      component: 'grafting',
      action: 'graft-start',
      source: request.sourceProject,
      target: request.targetProject,
      query: request.query.substring(0, 50),
    });

    // 1. 在源專案中檢索相關知識
    const sourceKnowledge = await searchProjectKnowledge(
      request.sourceProject,
      request.query
    );

    // 2. 建立知識橋接點
    const bridges = await createBridges(
      sourceKnowledge,
      request.targetProject
    );

    // 3. 評估嫁接品質
    const confidence = assessGraftingQuality(bridges);

    // 4. 生成建議
    const suggestions = generateGraftingSuggestions(bridges, confidence);

    logger.info({
      component: 'grafting',
      action: 'graft-completed',
      bridgesCreated: bridges.length,
      confidence,
      duration: Date.now() - startTime,
    });

    return {
      success: true,
      bridges,
      confidence,
      suggestions,
    };
  } catch (error) {
    logger.error({
      component: 'grafting',
      action: 'graft-failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      bridges: [],
      confidence: 0,
      suggestions: ['嫁接過程中發生錯誤，請檢查專案路徑'],
    };
  }
}

/**
 * 在專案中搜尋知識
 */
async function searchProjectKnowledge(
  projectPath: string,
  query: string
): Promise<Array<{ id: string; content: string; metadata: any }>> {
  // 實際實作會連接到向量資料庫
  // 這裡使用模擬數據
  logger.debug({
    component: 'grafting',
    action: 'search-knowledge',
    project: projectPath,
    query: query.substring(0, 50),
  });

  // TODO: 整合 Qdrant 向量搜尋
  return [];
}

/**
 * 建立知識橋接點
 */
async function createBridges(
  sourceKnowledge: Array<{ id: string; content: string; metadata: any }>,
  targetProject: string
): Promise<KnowledgeBridge[]> {
  const bridges: KnowledgeBridge[] = [];

  for (const knowledge of sourceKnowledge) {
    const bridge: KnowledgeBridge = {
      id: `bridge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      source: knowledge.id,
      target: targetProject,
      relevance: calculateRelevance(knowledge.content, targetProject),
      content: knowledge.content,
    };

    if (bridge.relevance > 0.5) {
      bridges.push(bridge);
    }
  }

  return bridges.sort((a, b) => b.relevance - a.relevance);
}

/**
 * 計算相關性
 */
function calculateRelevance(content: string, targetProject: string): number {
  // 簡單的相關性計算
  // 實際實作會使用向量相似度
  const contentLower = content.toLowerCase();
  const targetLower = targetProject.toLowerCase();

  // 檢查關鍵字匹配
  const keywords = targetLower.split(/[-_/]/);
  let matches = 0;

  for (const keyword of keywords) {
    if (keyword.length > 2 && contentLower.includes(keyword)) {
      matches++;
    }
  }

  return Math.min(matches / keywords.length, 1);
}

/**
 * 評估嫁接品質
 */
function assessGraftingQuality(bridges: KnowledgeBridge[]): number {
  if (bridges.length === 0) return 0;

  const avgRelevance = bridges.reduce((sum, b) => sum + b.relevance, 0) / bridges.length;
  
  // 考慮橋接點數量（太多或太少都不好）
  const optimalCount = 5;
  const countScore = 1 - Math.min(Math.abs(bridges.length - optimalCount) / optimalCount, 1);

  return (avgRelevance * 0.7 + countScore * 0.3);
}

/**
 * 生成嫁接建議
 */
function generateGraftingSuggestions(
  bridges: KnowledgeBridge[],
  confidence: number
): string[] {
  const suggestions: string[] = [];

  if (bridges.length === 0) {
    suggestions.push('未找到相關知識，建議擴展搜尋範圍');
  } else if (bridges.length > 10) {
    suggestions.push('找到過多相關知識，建議縮小搜尋範圍');
  }

  if (confidence < 0.5) {
    suggestions.push('嫁接信心度較低，建議人工審查');
  }

  if (confidence > 0.8) {
    suggestions.push('嫁接品質良好，可直接應用');
  }

  return suggestions;
}

/**
 * 獲取嫁接統計
 */
export async function getGraftingStats(): Promise<{
  totalGrafts: number;
  avgConfidence: number;
  topSourceProjects: string[];
}> {
  // 實際實作會查詢資料庫
  return {
    totalGrafts: 0,
    avgConfidence: 0.75,
    topSourceProjects: [
      'projects/openclaw/modules/knowledge',
      'projects/crm/modules/main',
      'projects/hbh-realty/modules/main',
    ],
  };
}
