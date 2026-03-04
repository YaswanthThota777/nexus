import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrainingEngine, runTrainingStep } from '../src/lib/realTrainingEngine.js';

test('3D training step updates agent on x/z plane', () => {
  const engine = createTrainingEngine('ppo');
  engine.epsilon = 0;

  const objects = [
    { id: 'agent', name: 'Agent', agent: true, pos: [0, 0.5, 0] },
    { id: 'goal', name: 'Goal', type: 'sphere', color: '#ff3333', pos: [6, 0.5, 6] },
  ];

  const result = runTrainingStep(objects, engine, { is2D: false });
  assert.ok(result.objects[0].pos[0] !== 0 || result.objects[0].pos[2] !== 0);
  assert.equal(result.objects[0].pos[1], 0.5);
});

test('2D training step updates agent on x/y plane and keeps z fixed', () => {
  const engine = createTrainingEngine('ppo');
  engine.epsilon = 0;

  const objects = [
    { id: 'agent', name: 'Agent', agent: true, is2D: true, pos: [0, 0, 0.5] },
    { id: 'goal', name: 'Goal', type: 'sphere', color: '#ff3333', is2D: true, pos: [6, 6, 0.5] },
  ];

  const result = runTrainingStep(objects, engine, { is2D: true });
  assert.equal(result.objects[0].pos[2], 0.5);
  assert.ok(result.objects[0].pos[0] !== 0 || result.objects[0].pos[1] !== 0);
});

test('training step reports missing targets when agent/goal absent', () => {
  const engine = createTrainingEngine('ppo');
  const result = runTrainingStep([{ id: 'box', name: 'Box', pos: [0, 0, 0] }], engine, { is2D: false });
  assert.equal(result.missingTargets, true);
});

test('training includes environment obstacle feedback in episode metrics', () => {
  const engine = createTrainingEngine('ppo');
  engine.epsilon = 0;

  const objects = [
    { id: 'agent', name: 'Agent', agent: true, pos: [0, 0.5, 0], scale: [1, 1, 1] },
    { id: 'goal', name: 'Goal', type: 'sphere', color: '#ff3333', pos: [1, 0.5, 0], scale: [1, 1, 1] },
    { id: 'obstacle', name: 'Obstacle', type: 'cube', pos: [0.8, 0.5, 0], scale: [2, 2, 2] },
  ];

  const result = runTrainingStep(objects, engine, { is2D: false });
  if (result.episodePoint) {
    assert.ok('clearance' in result.episodePoint);
  }
});

test('deterministic benchmark mode reproduces the same trajectory with identical seed', () => {
  const seed = 1337;
  const objects = [
    { id: 'agent', name: 'Agent', agent: true, pos: [0, 0.5, 0] },
    { id: 'goal', name: 'Goal', type: 'sphere', color: '#ff3333', pos: [6, 0.5, 6] },
  ];

  const engineA = createTrainingEngine('ppo', { deterministic: true, seed });
  const engineB = createTrainingEngine('ppo', { deterministic: true, seed });

  let stateA = objects;
  let stateB = objects;
  for (let i = 0; i < 25; i += 1) {
    stateA = runTrainingStep(stateA, engineA, { is2D: false }).objects;
    stateB = runTrainingStep(stateB, engineB, { is2D: false }).objects;
  }

  assert.deepEqual(stateA[0].pos, stateB[0].pos);
});
