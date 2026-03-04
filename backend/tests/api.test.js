import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

test('health endpoint returns ok', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
});

test('project creation and run queue flow works', async () => {
  const createProject = await request(app).post('/api/v1/projects').send({
    name: 'Enterprise Project',
    template: 'custom',
    is2D: false,
    config: { environment: 'warehouse', robot: 'quadruped', model: 'ppo' },
  });

  assert.equal(createProject.status, 201);
  const projectId = createProject.body.id;

  const createRun = await request(app).post('/api/v1/runs').send({
    projectId,
    model: 'ppo',
    environment: 'warehouse',
    robot: 'quadruped',
    provider: 'local-deterministic',
    deterministic: true,
  });

  assert.equal(createRun.status, 202);
  assert.equal(createRun.body.status, 'queued');
});

test('simulation providers endpoint returns adapter catalog', async () => {
  const listed = await request(app).get('/api/v1/sim/providers');
  assert.equal(listed.status, 200);
  assert.equal(Array.isArray(listed.body.items), true);
  assert.equal(listed.body.items.some((item) => item.id === 'local-deterministic'), true);
});

test('bridge health endpoint reports disabled when not configured', async () => {
  const health = await request(app).get('/api/v1/sim/bridge/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.provider, 'high-fidelity-bridge');
  assert.equal(health.body.configured, false);
  assert.equal(health.body.status, 'disabled');
});

test('run creation rejects unknown provider', async () => {
  const createProject = await request(app).post('/api/v1/projects').send({
    name: 'Provider Validation Project',
    template: 'custom',
    is2D: false,
    config: { environment: 'warehouse', robot: 'quadruped', model: 'ppo' },
  });

  const projectId = createProject.body.id;
  const createRun = await request(app).post('/api/v1/runs').send({
    projectId,
    model: 'ppo',
    environment: 'warehouse',
    robot: 'quadruped',
    provider: 'invalid-provider',
    deterministic: true,
  });

  assert.equal(createRun.status, 400);
  assert.equal(createRun.body.error.code, 'VALIDATION_FAILED');
});

test('run creation rejects unavailable provider', async () => {
  const createProject = await request(app).post('/api/v1/projects').send({
    name: 'Unavailable Provider Project',
    template: 'custom',
    is2D: false,
    config: { environment: 'warehouse', robot: 'quadruped', model: 'ppo' },
  });

  const projectId = createProject.body.id;
  const createRun = await request(app).post('/api/v1/runs').send({
    projectId,
    model: 'ppo',
    environment: 'warehouse',
    robot: 'quadruped',
    provider: 'high-fidelity-bridge',
    deterministic: true,
  });

  assert.equal(createRun.status, 400);
  assert.equal(createRun.body.error.code, 'PROVIDER_UNAVAILABLE');
});

test('template marketplace publish and list works', async () => {
  const created = await request(app).post('/api/v1/templates').send({
    name: 'Warehouse PPO Template',
    tags: ['warehouse', 'ppo'],
    template: {
      environment: 'warehouse',
      robot: 'quadruped',
      model: 'ppo',
      task: 'navigation',
      sensorProfile: 'fusion',
      obstacleDensity: 30,
      domainRandomization: true,
      arenaScale: 120,
      elevationVariance: 0.4,
      lightIntensity: 1.2,
    },
  });

  assert.equal(created.status, 201);

  const listed = await request(app).get('/api/v1/templates');
  assert.equal(listed.status, 200);
  assert.equal(Array.isArray(listed.body.items), true);
  assert.equal(listed.body.items.length > 0, true);
});
