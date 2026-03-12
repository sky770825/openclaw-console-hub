import { Router, Request, Response } from "express";
import { aiMemoryStore } from "../services/aiMemoryStore.js";
import { logger } from "../utils/logger.js";

const router = Router();

/**
 * GET /api/memories
 * Retrieve all AI memories
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const memories = await aiMemoryStore.getMemories();
    res.json(memories);
  } catch (error) {
    logger.error({ category: "memories", error: error instanceof Error ? error.message : String(error) }, "Error fetching memories");
    res.status(500).json({ error: "Failed to fetch memories" });
  }
});

/**
 * POST /api/memories
 * Add a new AI memory
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { content, metadata } = req.body;
    
    if (!content) {
      res.status(400).json({ error: "Content is required" });
      return;
    }
    
    const memory = await aiMemoryStore.addMemory(content, metadata);
    res.json(memory);
  } catch (error) {
    logger.error({ category: "memories", error: error instanceof Error ? error.message : String(error) }, "Error adding memory");
    res.status(500).json({ error: "Failed to add memory" });
  }
});

export { router as memoriesRouter };
