import { logger } from "../../utils/logger.js";

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

export async function graftKnowledge(
  request: GraftingRequest
): Promise<GraftingResult> {
  const startTime = Date.now();

  try {
    logger.info({
      component: "grafting",
      action: "graft-start",
      source: request.sourceProject,
      target: request.targetProject,
    });

    const sourceKnowledge = await searchProjectKnowledge(
      request.sourceProject,
      request.query
    );

    const bridges = await createBridges(sourceKnowledge, request.targetProject);
    const confidence = assessGraftingQuality(bridges);
    const suggestions = generateGraftingSuggestions(bridges, confidence);

    logger.info({
      component: "grafting",
      action: "graft-completed",
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
      component: "grafting",
      action: "graft-failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      success: false,
      bridges: [],
      confidence: 0,
      suggestions: ["嫁接過程中發生錯誤，請檢查專案路徑"],
    };
  }
}

async function searchProjectKnowledge(
  projectPath: string,
  query: string
): Promise<Array<{ id: string; content: string; metadata: any }>> {
  logger.debug({
    component: "grafting",
    action: "search-knowledge",
    project: projectPath,
  });

  // TODO: 整合 Qdrant 向量搜尋
  return [];
}

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

function calculateRelevance(content: string, targetProject: string): number {
  const contentLower = content.toLowerCase();
  const targetLower = targetProject.toLowerCase();

  const keywords = targetLower.split(/[-_/]/);
  let matches = 0;

  for (const keyword of keywords) {
    if (keyword.length > 2 && contentLower.includes(keyword)) {
      matches++;
    }
  }

  return Math.min(matches / keywords.length, 1);
}

function assessGraftingQuality(bridges: KnowledgeBridge[]): number {
  if (bridges.length === 0) return 0;

  const avgRelevance =
    bridges.reduce((sum, b) => sum + b.relevance, 0) / bridges.length;

  const optimalCount = 5;
  const countScore =
    1 - Math.min(Math.abs(bridges.length - optimalCount) / optimalCount, 1);

  return avgRelevance * 0.7 + countScore * 0.3;
}

function generateGraftingSuggestions(
  bridges: KnowledgeBridge[],
  confidence: number
): string[] {
  const suggestions: string[] = [];

  if (bridges.length === 0) {
    suggestions.push("未找到相關知識，建議擴展搜尋範圍");
  } else if (bridges.length > 10) {
    suggestions.push("找到過多相關知識，建議縮小搜尋範圍");
  }

  if (confidence < 0.5) {
    suggestions.push("嫁接信心度較低，建議人工審查");
  }

  if (confidence > 0.8) {
    suggestions.push("嫁接品質良好，可直接應用");
  }

  return suggestions;
}

export async function getGraftingStats(): Promise<{
  totalGrafts: number;
  avgConfidence: number;
  topSourceProjects: string[];
}> {
  return {
    totalGrafts: 0,
    avgConfidence: 0.75,
    topSourceProjects: [
      "projects/openclaw/modules/knowledge",
      "projects/crm/modules/main",
      "projects/hbh-realty/modules/main",
    ],
  };
}
