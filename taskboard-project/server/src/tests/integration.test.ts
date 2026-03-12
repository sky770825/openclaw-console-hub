import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../index.js";

describe("TaskBoard API Integration Tests", () => {
  // Reset state before each test by using fresh in-memory data
  beforeEach(() => {
    // The in-memory arrays are module-level and persist across tests
    // In a real scenario, we would reset them here
  });

  describe("GET /api/tasks", () => {
    it("should return a list of tasks with correct schema", async () => {
      const response = await request(app)
        .get("/api/tasks")
        .expect("Content-Type", /json/)
        .expect(200);

      // API Contract: Response should have tasks array and count
      expect(response.body).toHaveProperty("tasks");
      expect(response.body).toHaveProperty("count");
      expect(Array.isArray(response.body.tasks)).toBe(true);
      expect(typeof response.body.count).toBe("number");

      // API Contract: Each task should have required fields
      if (response.body.tasks.length > 0) {
        const task = response.body.tasks[0];
        expect(task).toHaveProperty("id");
        expect(task).toHaveProperty("title");
        expect(task).toHaveProperty("description");
        expect(task).toHaveProperty("status");
        expect(task).toHaveProperty("createdAt");
        expect(task).toHaveProperty("updatedAt");

        // Validate status enum values
        expect(["ready", "in_progress", "review", "done"]).toContain(task.status);
      }
    });

    it("should return task with correct data types", async () => {
      const response = await request(app).get("/api/tasks");

      if (response.body.tasks.length > 0) {
        const task = response.body.tasks[0];
        expect(typeof task.id).toBe("string");
        expect(typeof task.title).toBe("string");
        expect(typeof task.description).toBe("string");
        expect(typeof task.status).toBe("string");
        expect(typeof task.createdAt).toBe("string");
        expect(typeof task.updatedAt).toBe("string");
      }
    });
  });

  describe("POST /api/tasks - Create Task Flow", () => {
    it("should create a new task with valid data", async () => {
      const newTask = {
        title: "Integration Test Task",
        description: "Test description",
        status: "ready"
      };

      const response = await request(app)
        .post("/api/tasks")
        .send(newTask)
        .expect("Content-Type", /json/)
        .expect(201);

      // API Contract: Response should match created task
      expect(response.body).toHaveProperty("id");
      expect(response.body.title).toBe(newTask.title);
      expect(response.body.description).toBe(newTask.description);
      expect(response.body.status).toBe(newTask.status);
      expect(response.body).toHaveProperty("createdAt");
      expect(response.body).toHaveProperty("updatedAt");
    });

    it("should return 400 when title is missing", async () => {
      const invalidTask = {
        description: "Test description",
        status: "ready"
      };

      const response = await request(app)
        .post("/api/tasks")
        .send(invalidTask)
        .expect("Content-Type", /json/)
        .expect(400);

      // API Contract: Error response should have error message
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Title is required");
    });

    it("should create task with default status when not provided", async () => {
      const newTask = {
        title: "Task without status"
      };

      const response = await request(app)
        .post("/api/tasks")
        .send(newTask)
        .expect(201);

      expect(response.body.status).toBe("ready");
    });
  });

  describe("GET /api/tasks/:id - Single Task Retrieval", () => {
    it("should return a single task by ID", async () => {
      // First get all tasks to find a valid ID
      const allTasks = await request(app).get("/api/tasks");
      if (allTasks.body.tasks.length === 0) {
        return; // Skip if no tasks
      }

      const taskId = allTasks.body.tasks[0].id;

      const response = await request(app)
        .get(`/api/tasks/${taskId}`)
        .expect("Content-Type", /json/)
        .expect(200);

      expect(response.body).toHaveProperty("id", taskId);
    });

    it("should return 404 for non-existent task", async () => {
      const response = await request(app)
        .get("/api/tasks/non-existent-id")
        .expect("Content-Type", /json/)
        .expect(404);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Task not found");
    });
  });

  describe("PATCH /api/tasks/:id - Update Task", () => {
    it("should update task status", async () => {
      // Create a task first
      const createResponse = await request(app)
        .post("/api/tasks")
        .send({ title: "Task to update", status: "ready" });

      const taskId = createResponse.body.id;

      const updateResponse = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .send({ status: "in_progress" })
        .expect("Content-Type", /json/)
        .expect(200);

      expect(updateResponse.body.status).toBe("in_progress");
      expect(updateResponse.body).toHaveProperty("updatedAt");
    });

    it("should return 404 when updating non-existent task", async () => {
      const response = await request(app)
        .patch("/api/tasks/non-existent-id")
        .send({ status: "done" })
        .expect("Content-Type", /json/)
        .expect(404);

      expect(response.body).toHaveProperty("error");
    });
  });

  describe("DELETE /api/tasks/:id - Delete Task", () => {
    it("should delete a task", async () => {
      // Create a task first
      const createResponse = await request(app)
        .post("/api/tasks")
        .send({ title: "Task to delete" });

      const taskId = createResponse.body.id;

      const deleteResponse = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .expect("Content-Type", /json/)
        .expect(200);

      expect(deleteResponse.body).toHaveProperty("message");
      expect(deleteResponse.body).toHaveProperty("task");
      expect(deleteResponse.body.task.id).toBe(taskId);

      // Verify task is deleted
      await request(app)
        .get(`/api/tasks/${taskId}`)
        .expect(404);
    });
  });

  describe("POST /api/reviews - Review Flow", () => {
    it("should create a review for a task", async () => {
      // First create a task
      const taskResponse = await request(app)
        .post("/api/tasks")
        .send({ title: "Task for review" });

      const taskId = taskResponse.body.id;

      const review = {
        taskId: taskId,
        reviewer: "Test Reviewer",
        comment: "Please review this task",
        status: "pending"
      };

      const response = await request(app)
        .post("/api/reviews")
        .send(review)
        .expect("Content-Type", /json/)
        .expect(201);

      // API Contract: Review response schema
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("taskId", taskId);
      expect(response.body).toHaveProperty("reviewer", review.reviewer);
      expect(response.body).toHaveProperty("comment", review.comment);
      expect(response.body).toHaveProperty("status", review.status);
      expect(response.body).toHaveProperty("createdAt");
      expect(response.body).toHaveProperty("updatedAt");
    });

    it("should return 400 when required fields are missing", async () => {
      const invalidReview = {
        comment: "Missing taskId and reviewer"
      };

      const response = await request(app)
        .post("/api/reviews")
        .send(invalidReview)
        .expect("Content-Type", /json/)
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("taskId and reviewer are required");
    });

    it("should get reviews by taskId", async () => {
      // Create a task and review
      const taskResponse = await request(app)
        .post("/api/tasks")
        .send({ title: "Task with reviews" });

      const taskId = taskResponse.body.id;

      await request(app)
        .post("/api/reviews")
        .send({
          taskId: taskId,
          reviewer: "Reviewer 1",
          comment: "First review"
        });

      const response = await request(app)
        .get(`/api/reviews/task/${taskId}`)
        .expect("Content-Type", /json/)
        .expect(200);

      expect(response.body).toHaveProperty("reviews");
      expect(response.body).toHaveProperty("count");
      expect(Array.isArray(response.body.reviews)).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
    });

    it("should update review status", async () => {
      // Create task and review
      const taskResponse = await request(app)
        .post("/api/tasks")
        .send({ title: "Task for review update" });

      const reviewResponse = await request(app)
        .post("/api/reviews")
        .send({
          taskId: taskResponse.body.id,
          reviewer: "Reviewer",
          comment: "Review comment",
          status: "pending"
        });

      const reviewId = reviewResponse.body.id;

      const updateResponse = await request(app)
        .patch(`/api/reviews/${reviewId}`)
        .send({ status: "approved" })
        .expect(200);

      expect(updateResponse.body.status).toBe("approved");
    });
  });

  describe("DELETE /api/tasks/batch - Batch Delete", () => {
    it("should batch delete multiple tasks", async () => {
      // Create multiple tasks
      const task1 = await request(app).post("/api/tasks").send({ title: "Batch Task 1" });
      const task2 = await request(app).post("/api/tasks").send({ title: "Batch Task 2" });

      const ids = [task1.body.id, task2.body.id];

      const response = await request(app)
        .delete("/api/tasks/batch")
        .send({ ids })
        .expect("Content-Type", /json/)
        .expect(200);

      // API Contract: Batch delete response schema
      expect(response.body).toHaveProperty("message");
      expect(response.body).toHaveProperty("deletedCount", 2);
      expect(response.body).toHaveProperty("deletedTasks");
      expect(Array.isArray(response.body.deletedTasks)).toBe(true);
    });

    it("should return 400 for empty ids array", async () => {
      const response = await request(app)
        .delete("/api/tasks/batch")
        .send({ ids: [] })
        .expect("Content-Type", /json/)
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });
  });

  describe("Health Check", () => {
    it("should return health status", async () => {
      const response = await request(app)
        .get("/health")
        .expect("Content-Type", /json/)
        .expect(200);

      expect(response.body).toHaveProperty("status");
      expect(response.body).toHaveProperty("timestamp");
    });
  });
});

describe("End-to-End Workflow: Proposal → Review → Task", () => {
  it("should complete full workflow from task creation to review approval", async () => {
    // Step 1: Create a new task (Proposal)
    const taskData = {
      title: "Feature Proposal: Dark Mode",
      description: "Implement dark mode for the application",
      status: "ready"
    };

    const taskResponse = await request(app)
      .post("/api/tasks")
      .send(taskData)
      .expect(201);

    const taskId = taskResponse.body.id;
    expect(taskResponse.body.status).toBe("ready");

    // Step 2: Move task to "in_progress"
    const progressResponse = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .send({ status: "in_progress" })
      .expect(200);

    expect(progressResponse.body.status).toBe("in_progress");

    // Step 3: Create a review for the task
    const reviewData = {
      taskId: taskId,
      reviewer: "Tech Lead",
      comment: "Code review requested",
      status: "pending"
    };

    const reviewResponse = await request(app)
      .post("/api/reviews")
      .send(reviewData)
      .expect(201);

    const reviewId = reviewResponse.body.id;
    expect(reviewResponse.body.status).toBe("pending");

    // Step 4: Update review to approved
    const approveResponse = await request(app)
      .patch(`/api/reviews/${reviewId}`)
      .send({ status: "approved", comment: "LGTM! Great implementation." })
      .expect(200);

    expect(approveResponse.body.status).toBe("approved");

    // Step 5: Move task to "review" status
    const reviewStatusResponse = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .send({ status: "review" })
      .expect(200);

    expect(reviewStatusResponse.body.status).toBe("review");

    // Step 6: Complete the task
    const completeResponse = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .send({ status: "done" })
      .expect(200);

    expect(completeResponse.body.status).toBe("done");

    // Verify final state
    const finalTask = await request(app)
      .get(`/api/tasks/${taskId}`)
      .expect(200);

    expect(finalTask.body.status).toBe("done");
  });
});
