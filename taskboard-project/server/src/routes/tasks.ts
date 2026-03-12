import { Router, Request, Response } from "express";
import { logger } from "../utils/logger.js";

// In-memory task storage (for demo purposes)
interface Task {
  id: string;
  title: string;
  description: string;
  status: "ready" | "in_progress" | "review" | "done";
  createdAt: string;
  updatedAt: string;
}

let tasks: Task[] = [
  {
    id: "1",
    title: "Setup project",
    description: "Initialize the project structure",
    status: "done",
    createdAt: "2026-02-17T00:00:00Z",
    updatedAt: "2026-02-17T00:00:00Z",
  },
  {
    id: "2",
    title: "Create API endpoints",
    description: "Implement REST API for tasks",
    status: "in_progress",
    createdAt: "2026-02-17T00:00:00Z",
    updatedAt: "2026-02-17T00:00:00Z",
  },
  {
    id: "3",
    title: "Build frontend",
    description: "Create React components",
    status: "ready",
    createdAt: "2026-02-17T00:00:00Z",
    updatedAt: "2026-02-17T00:00:00Z",
  },
];

const router = Router();

// GET /api/tasks - List all tasks
router.get("/", (req: Request, res: Response) => {
  res.json({ tasks, count: tasks.length });
});

// GET /api/tasks/:id - Get a single task
router.get("/:id", (req: Request, res: Response) => {
  const task = tasks.find((t) => t.id === req.params.id);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(task);
});

// POST /api/tasks - Create a new task
router.post("/", (req: Request, res: Response) => {
  const { title, description, status = "ready" } = req.body;

  if (!title) {
    logger.warn({ category: "tasks", action: "create" }, "Task creation failed: Title is required");
    res.status(400).json({ error: "Title is required" });
    return;
  }

  const newTask: Task = {
    id: (tasks.length + 1).toString(),
    title,
    description: description || "",
    status: status as Task["status"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  tasks.push(newTask);
  logger.info({ category: "tasks", action: "create", taskId: newTask.id }, "Task created successfully");
  res.status(201).json(newTask);
});

// PATCH /api/tasks/:id - Update a task
router.patch("/:id", (req: Request, res: Response) => {
  const taskIndex = tasks.findIndex((t) => t.id === req.params.id);
  if (taskIndex === -1) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const { title, description, status } = req.body;
  tasks[taskIndex] = {
    ...tasks[taskIndex],
    ...(title && { title }),
    ...(description && { description }),
    ...(status && { status }),
    updatedAt: new Date().toISOString(),
  };

  res.json(tasks[taskIndex]);
});

// DELETE /api/tasks/batch - Batch delete tasks
router.delete("/batch", (req: Request, res: Response) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    logger.warn({ category: "tasks", action: "batch_delete" }, "Batch delete failed: ids must be a non-empty array");
    res.status(400).json({ error: "ids must be a non-empty array" });
    return;
  }

  const deletedTasks: Task[] = [];
  const notFoundIds: string[] = [];

  ids.forEach((id: string) => {
    const taskIndex = tasks.findIndex((t) => t.id === id);
    if (taskIndex !== -1) {
      deletedTasks.push(tasks.splice(taskIndex, 1)[0]);
    } else {
      notFoundIds.push(id);
    }
  });

  logger.info({
    category: "tasks",
    action: "batch_delete",
    deletedCount: deletedTasks.length,
    requestedCount: ids.length,
    notFoundCount: notFoundIds.length
  }, "Tasks batch deleted");

  res.json({
    message: `Deleted ${deletedTasks.length} tasks`,
    deletedCount: deletedTasks.length,
    deletedTasks,
    notFoundIds: notFoundIds.length > 0 ? notFoundIds : undefined,
  });
});

// DELETE /api/tasks/:id - Delete a single task
router.delete("/:id", (req: Request, res: Response) => {
  const taskIndex = tasks.findIndex((t) => t.id === req.params.id);
  if (taskIndex === -1) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const deletedTask = tasks.splice(taskIndex, 1)[0];
  res.json({ message: "Task deleted", task: deletedTask });
});

export { router as tasksRouter };
