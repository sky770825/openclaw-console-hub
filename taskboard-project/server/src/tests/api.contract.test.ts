import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index.js';

describe('API Contract Tests', () => {
  describe('Health Check API', () => {
    it('should return health status with required fields', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('services');
      expect(response.body).toHaveProperty('metrics');
    });

    it('should have status as "ok" or "degraded"', async () => {
      const response = await request(app).get('/health');
      expect(['ok', 'degraded']).toContain(response.body.status);
    });
  });

  describe('Tasks API - CRUD Operations', () => {
    beforeEach(async () => {
      const listResponse = await request(app).get('/api/tasks');
      const taskIds = listResponse.body.tasks.map((t: any) => t.id);
      if (taskIds.length > 0) {
        await request(app).delete('/api/tasks/batch').send({ ids: taskIds });
      }
    });

    describe('GET /api/tasks', () => {
      it('should return a list of tasks with correct schema', async () => {
        const response = await request(app)
          .get('/api/tasks')
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body).toHaveProperty('tasks');
        expect(response.body).toHaveProperty('count');
        expect(Array.isArray(response.body.tasks)).toBe(true);
        expect(typeof response.body.count).toBe('number');
      });
    });

    describe('POST /api/tasks', () => {
      it('should create a new task with valid data', async () => {
        const newTask = {
          title: 'New Test Task',
          description: 'Test description',
          status: 'ready'
        };

        const response = await request(app)
          .post('/api/tasks')
          .send(newTask)
          .expect('Content-Type', /json/)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.title).toBe(newTask.title);
        expect(response.body.description).toBe(newTask.description);
        expect(response.body.status).toBe(newTask.status);
        expect(response.body).toHaveProperty('createdAt');
        expect(response.body).toHaveProperty('updatedAt');
      });

      it('should return 400 when title is missing', async () => {
        await request(app)
          .post('/api/tasks')
          .send({ description: 'Missing title' })
          .expect('Content-Type', /json/)
          .expect(400);
      });
    });

    describe('PATCH /api/tasks/:id', () => {
      it('should update task fields', async () => {
        const createResponse = await request(app)
          .post('/api/tasks')
          .send({ title: 'Update Test' });

        const taskId = createResponse.body.id;

        const response = await request(app)
          .patch(`/api/tasks/${taskId}`)
          .send({ title: 'Updated Title', status: 'in_progress' })
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body.title).toBe('Updated Title');
        expect(response.body.status).toBe('in_progress');
      });
    });

    describe('DELETE /api/tasks/batch', () => {
      it('should batch delete multiple tasks', async () => {
        const task1 = await request(app).post('/api/tasks').send({ title: 'Task 1' });
        const task2 = await request(app).post('/api/tasks').send({ title: 'Task 2' });

        const response = await request(app)
          .delete('/api/tasks/batch')
          .send({ ids: [task1.body.id, task2.body.id] })
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body).toHaveProperty('deletedCount');
        expect(response.body.deletedCount).toBe(2);
      });
    });
  });

  describe('Reviews API - Proposal Flow', () => {
    let testTaskId: string;

    beforeEach(async () => {
      const taskResponse = await request(app)
        .post('/api/tasks')
        .send({ title: 'Review Test Task' });
      testTaskId = taskResponse.body.id;

      const reviewsResponse = await request(app).get('/api/reviews');
      for (const review of reviewsResponse.body.reviews) {
        await request(app).delete(`/api/reviews/${review.id}`);
      }
    });

    describe('POST /api/reviews - Create Proposal', () => {
      it('should create a new review with valid data', async () => {
        const newReview = {
          taskId: testTaskId,
          reviewer: 'John Doe',
          comment: 'Needs changes',
          status: 'pending'
        };

        const response = await request(app)
          .post('/api/reviews')
          .send(newReview)
          .expect('Content-Type', /json/)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.taskId).toBe(newReview.taskId);
        expect(response.body.status).toBe('pending');
      });

      it('should return 400 when required fields are missing', async () => {
        await request(app)
          .post('/api/reviews')
          .send({ comment: 'Missing taskId' })
          .expect('Content-Type', /json/)
          .expect(400);
      });
    });

    describe('PATCH /api/reviews/:id - Review Approval Flow', () => {
      it('should update review status to approved', async () => {
        const createResponse = await request(app)
          .post('/api/reviews')
          .send({ taskId: testTaskId, reviewer: 'Approver' });

        const reviewId = createResponse.body.id;

        const response = await request(app)
          .patch(`/api/reviews/${reviewId}`)
          .send({ status: 'approved', comment: 'Approved' })
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body.status).toBe('approved');
      });
    });
  });

  describe('End-to-End Proposal to Approval Flow', () => {
    it('should complete full proposal → review → approval workflow', async () => {
      const taskResponse = await request(app)
        .post('/api/tasks')
        .send({ title: 'Feature Proposal', description: 'Test', status: 'ready' });

      expect(taskResponse.status).toBe(201);
      const taskId = taskResponse.body.id;

      const reviewResponse = await request(app)
        .post('/api/reviews')
        .send({ taskId, reviewer: 'Tech Lead', comment: 'LGTM', status: 'pending' });

      expect(reviewResponse.status).toBe(201);
      const reviewId = reviewResponse.body.id;

      const updateTask = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .send({ status: 'in_progress' });
      expect(updateTask.body.status).toBe('in_progress');

      const approveReview = await request(app)
        .patch(`/api/reviews/${reviewId}`)
        .send({ status: 'approved' });
      expect(approveReview.body.status).toBe('approved');

      const doneTask = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .send({ status: 'done' });
      expect(doneTask.body.status).toBe('done');
    });
  });
});
