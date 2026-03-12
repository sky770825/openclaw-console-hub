import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../index.js';

// Define the interface to match server/src/routes/tasks.ts
interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
}

describe('Task API Contract Tests', () => {
  const apiKey = process.env.OPENCLAW_API_KEY || 'test-api-key';
  
  beforeEach(() => {
    // We might need to reset in-memory state if we had a way to do it
    // For now, we'll just test the current state
  });

  describe('GET /api/tasks', () => {
    it('should return a list of tasks', async () => {
      const response = await request(app).get('/api/tasks');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tasks');
      expect(Array.isArray(response.body.tasks)).toBe(true);
      expect(response.body).toHaveProperty('count');
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a new task when authenticated with API key', async () => {
      const newTask = {
        title: 'Test Integration Task',
        description: 'Testing the creation flow',
        status: 'ready'
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('x-api-key', apiKey)
        .send(newTask);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(newTask.title);
      expect(response.body.status).toBe(newTask.status);
    });

    it('should fail to create a task without API key', async () => {
      // Temporarily set NODE_ENV to production to trigger API key check if it relies on it
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.OPENCLAW_API_KEY = 'secret';

      const response = await request(app)
        .post('/api/tasks')
        .send({ title: 'Should fail' });

      expect(response.status).toBe(403);
      
      process.env.NODE_ENV = originalEnv;
      process.env.OPENCLAW_API_KEY = apiKey;
    });
  });

  describe('Task Workflow (Proposal -> Review -> Task)', () => {
    // In this simplified demo system, we simulate the flow
    it('should complete the lifecycle of a task', async () => {
      // 1. Create a "proposal" (represented as a task in ready status)
      const proposal = {
        title: 'New Feature Proposal',
        description: 'Enable dark mode',
        status: 'ready'
      };

      const createRes = await request(app)
        .post('/api/tasks')
        .set('x-api-key', apiKey)
        .send(proposal);
      
      const taskId = createRes.body.id;
      expect(createRes.status).toBe(201);

      // 2. Move to "review"
      const reviewRes = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('x-api-key', apiKey)
        .send({ status: 'review' });
      
      expect(reviewRes.status).toBe(200);
      expect(reviewRes.body.status).toBe('review');

      // 3. Move to "in_progress" (approved)
      const approveRes = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('x-api-key', apiKey)
        .send({ status: 'in_progress' });
      
      expect(approveRes.status).toBe(200);
      expect(approveRes.body.status).toBe('in_progress');

      // 4. Batch cleanup (simulate archiving/deleting)
      const deleteRes = await request(app)
        .delete('/api/tasks/batch')
        .set('x-api-key', apiKey)
        .send({ ids: [taskId] });
      
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.deletedCount).toBe(1);
    });
  });
});
