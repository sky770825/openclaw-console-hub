import { Router } from 'express';
import { preJudge, checkPreJudgeHealth } from '../services/pre-judge.js';
import { graftKnowledge, getGraftingStats } from '../services/grafting/index.js';
import { getReflectionStats } from '../services/reflection.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * 🧪 科研中心 API 路由
 * 
 * 提供 Agent 意識迭代與數據嫁接相關的 API 端點
 */

// 預判任務
router.post('/pre-judge', async (req, res) => {
  try {
    const { task, context, availableTools } = req.body;

    if (!task || !availableTools) {
      return res.status(400).json({
        error: 'Missing required fields: task, availableTools',
      });
    }

    const result = await preJudge({
      task,
      context,
      availableTools,
    });

    res.json({
      ok: true,
      result,
    });
  } catch (error) {
    logger.error({
      component: 'research-center',
      action: 'pre-judge-error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      error: 'Pre-judge failed',
    });
  }
});

// 數據嫁接
router.post('/graft', async (req, res) => {
  try {
    const { sourceProject, targetProject, query, context } = req.body;

    if (!sourceProject || !targetProject || !query) {
      return res.status(400).json({
        error: 'Missing required fields: sourceProject, targetProject, query',
      });
    }

    const result = await graftKnowledge({
      sourceProject,
      targetProject,
      query,
      context,
    });

    res.json({
      ok: true,
      result,
    });
  } catch (error) {
    logger.error({
      component: 'research-center',
      action: 'graft-error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      error: 'Grafting failed',
    });
  }
});

// 獲取統計資訊
router.get('/stats', async (req, res) => {
  try {
    const [preJudgeHealth, graftingStats, reflectionStats] = await Promise.all([
      checkPreJudgeHealth(),
      getGraftingStats(),
      getReflectionStats(),
    ]);

    res.json({
      ok: true,
      stats: {
        preJudge: preJudgeHealth,
        grafting: graftingStats,
        reflection: reflectionStats,
      },
    });
  } catch (error) {
    logger.error({
      component: 'research-center',
      action: 'stats-error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      error: 'Failed to get stats',
    });
  }
});

// 健康檢查
router.get('/health', async (req, res) => {
  const health = await checkPreJudgeHealth();

  res.json({
    ok: true,
    healthy: health.healthy,
    modelAvailable: health.modelAvailable,
    latency: health.latency,
  });
});

export default router;
