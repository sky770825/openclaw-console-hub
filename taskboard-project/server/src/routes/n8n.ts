import { Router, Request, Response } from "express";
import { logger } from "../utils/logger.js";

const router = Router();

/**
 * POST /api/n8n/webhook/:workflowId
 * Generic n8n webhook endpoint for triggering workflows
 */
router.post("/webhook/:workflowId", async (req: Request, res: Response) => {
  const { workflowId } = req.params;
  const payload = req.body;

  try {
    // Log the webhook call for debugging
    logger.info({
      category: "n8n",
      workflowId,
      timestamp: new Date().toISOString(),
      payload: JSON.stringify(payload).substring(0, 500),
    }, "Webhook received for workflow");

    // TODO: Implement actual n8n integration
    // This could:
    // 1. Forward to n8n webhook URL
    // 2. Store in queue for processing
    // 3. Trigger local workflow execution

    res.json({
      success: true,
      message: `Webhook for workflow ${workflowId} received`,
      workflowId,
      receivedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ category: "n8n", workflowId, error: error instanceof Error ? error.message : String(error) }, "Error processing webhook");
    res.status(500).json({
      success: false,
      error: "Failed to process webhook",
    });
  }
});

/**
 * GET /api/n8n/status
 * Check n8n integration status
 */
router.get("/status", async (_req: Request, res: Response) => {
  const n8nUrl = process.env.N8N_WEBHOOK_URL;
  
  res.json({
    enabled: !!n8nUrl,
    url: n8nUrl ? `${n8nUrl.replace(/\/+$/, '')}/webhook` : null,
    timestamp: new Date().toISOString(),
  });
});

export { router as n8nRouter };
