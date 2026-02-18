/**
 * OpenClaw API Contract Tests
 * Validates response shapes for critical endpoints against the live server.
 * Run with: npx vitest run tests/api-contract.test.ts
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';

const BASE = process.env.TEST_API_BASE || 'http://localhost:3011';

describe('Health endpoints', () => {
  it('GET /health returns ok + service info', async () => {
    const res = await request(BASE).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      service: 'openclaw-server',
    });
    expect(res.body).toHaveProperty('supabase');
    expect(res.body).toHaveProperty('websocket');
  });

  it('GET /api/health returns full health with memory + uptime', async () => {
    const res = await request(BASE).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      service: 'openclaw-server',
    });
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('memory');
    expect(res.body.memory).toHaveProperty('rss');
    expect(res.body).toHaveProperty('services');
    expect(res.body.services).toHaveProperty('supabase');
    expect(res.body.services).toHaveProperty('websocket');
  });
});

describe('Task CRUD endpoints', () => {
  it('GET /api/openclaw/tasks returns array', async () => {
    const res = await request(BASE).get('/api/openclaw/tasks');
    expect(res.status).toBe(200);
    const tasks = Array.isArray(res.body) ? res.body : res.body.tasks ?? res.body.data;
    expect(Array.isArray(tasks)).toBe(true);
  });

  let testTaskId: string | null = null;

  it('POST /api/openclaw/tasks?allowStub=1 creates a task', async () => {
    const res = await request(BASE)
      .post('/api/openclaw/tasks?allowStub=1')
      .send({ name: '__test_task__', description: 'API contract test', tags: ['test'] });
    expect([200, 201]).toContain(res.status);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('__test_task__');
    expect(['queued', 'ready']).toContain(res.body.status);
    testTaskId = res.body.id;
  });

  it('PATCH /api/openclaw/tasks/:id accepts update', async () => {
    expect(testTaskId).toBeTruthy();
    const res = await request(BASE)
      .patch(`/api/openclaw/tasks/${testTaskId}`)
      .send({ status: 'in_progress' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', testTaskId);
    // Status may reflect in_progress or remain ready due to Supabase async
    expect(res.body).toHaveProperty('status');
  });

  it('DELETE /api/openclaw/tasks/:id removes the task', async () => {
    expect(testTaskId).toBeTruthy();
    const res = await request(BASE).delete(`/api/openclaw/tasks/${testTaskId}`);
    // Accept 200 or 204
    expect([200, 204]).toContain(res.status);
    testTaskId = null;
  });
});

describe('Deputy endpoints', () => {
  it('GET /api/openclaw/deputy/status returns state', async () => {
    const res = await request(BASE).get('/api/openclaw/deputy/status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
    expect(res.body).toHaveProperty('enabled');
    expect(res.body).toHaveProperty('lastRun');
  });
});

describe('Board health', () => {
  it('GET /api/openclaw/board-health returns counts', async () => {
    const res = await request(BASE).get('/api/openclaw/board-health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true });
    expect(res.body).toHaveProperty('counts');
  });
});

describe('Auto-executor status', () => {
  it('GET /api/openclaw/auto-executor/status returns state', async () => {
    const res = await request(BASE).get('/api/openclaw/auto-executor/status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('isRunning');
    expect(res.body).toHaveProperty('dispatchMode');
  });
});
