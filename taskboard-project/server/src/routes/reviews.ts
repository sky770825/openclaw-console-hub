import { Router, Request, Response } from "express";
import { logger } from "../utils/logger.js";

const router = Router();

// In-memory review storage (placeholder for future database integration)
interface Review {
  id: string;
  taskId: string;
  reviewer: string;
  status: "pending" | "approved" | "rejected" | "changes_requested";
  comment: string;
  createdAt: string;
  updatedAt: string;
}

let reviews: Review[] = [];

/**
 * GET /api/reviews
 * List all reviews (optionally filter by taskId)
 */
router.get("/", (req: Request, res: Response) => {
  const { taskId } = req.query;
  
  let result = reviews;
  if (taskId) {
    result = reviews.filter((r) => r.taskId === taskId);
  }
  
  res.json({ reviews: result, count: result.length });
});

/**
 * GET /api/reviews/:id
 * Get a single review by ID
 */
router.get("/:id", (req: Request, res: Response) => {
  const review = reviews.find((r) => r.id === req.params.id);
  if (!review) {
    res.status(404).json({ error: "Review not found" });
    return;
  }
  res.json(review);
});

/**
 * POST /api/reviews
 * Create a new review for a task
 */
router.post("/", (req: Request, res: Response) => {
  const { taskId, reviewer, comment, status = "pending" } = req.body;

  if (!taskId || !reviewer) {
    logger.warn({ category: "reviews", action: "create" }, "Review creation failed: taskId and reviewer are required");
    res.status(400).json({ error: "taskId and reviewer are required" });
    return;
  }

  const newReview: Review = {
    id: (reviews.length + 1).toString(),
    taskId,
    reviewer,
    comment: comment || "",
    status: status as Review["status"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  reviews.push(newReview);
  logger.info({ category: "reviews", action: "create", reviewId: newReview.id, taskId }, "Review created successfully");
  res.status(201).json(newReview);
});

/**
 * PATCH /api/reviews/:id
 * Update a review (status, comment)
 */
router.patch("/:id", (req: Request, res: Response) => {
  const reviewIndex = reviews.findIndex((r) => r.id === req.params.id);
  if (reviewIndex === -1) {
    logger.warn({ category: "reviews", action: "update", reviewId: req.params.id }, "Review update failed: Review not found");
    res.status(404).json({ error: "Review not found" });
    return;
  }

  const { status, comment } = req.body;
  const oldStatus = reviews[reviewIndex].status;
  reviews[reviewIndex] = {
    ...reviews[reviewIndex],
    ...(status && { status }),
    ...(comment && { comment }),
    updatedAt: new Date().toISOString(),
  };

  logger.info({
    category: "reviews",
    action: "update",
    reviewId: req.params.id,
    oldStatus,
    newStatus: status || oldStatus
  }, "Review updated successfully");

  res.json(reviews[reviewIndex]);
});

/**
 * GET /api/reviews/task/:taskId
 * Get all reviews for a specific task
 */
router.get("/task/:taskId", (req: Request, res: Response) => {
  const { taskId } = req.params;
  const taskReviews = reviews.filter((r) => r.taskId === taskId);
  res.json({ reviews: taskReviews, count: taskReviews.length });
});

/**
 * DELETE /api/reviews/:id
 * Delete a review
 */
router.delete("/:id", (req: Request, res: Response) => {
  const reviewIndex = reviews.findIndex((r) => r.id === req.params.id);
  if (reviewIndex === -1) {
    res.status(404).json({ error: "Review not found" });
    return;
  }

  const deletedReview = reviews.splice(reviewIndex, 1)[0];
  res.json({ message: "Review deleted", review: deletedReview });
});

export { router as reviewsRouter };
