import { Router, Request, Response } from "express";
import { generateDailyReport, sendTelegramNotification } from "../services/reportService.js";
import { logger } from "../utils/logger.js";

const router = Router();

/**
 * POST /api/system/daily-report
 * Daily Report Trigger (usually called by a cron job/webhook)
 * Generates and sends a daily report via Telegram
 */
router.post("/daily-report", async (_req: Request, res: Response) => {
  try {
    const report = await generateDailyReport();
    await sendTelegramNotification(report);
    res.json({ message: "Daily report generated and sent", report });
  } catch (error) {
    logger.error({ category: "system", error: error instanceof Error ? error.message : String(error) }, "Error generating daily report");
    res.status(500).json({ error: "Failed to generate daily report" });
  }
});

export { router as systemRouter };
