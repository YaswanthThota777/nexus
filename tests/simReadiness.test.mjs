import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSimReadiness, runReadinessScenarioSuite } from '../src/lib/simReadiness.js';

const makeObject = (id, extras = {}) => ({
  id: `obj-${id}`,
  type: 'cube',
  mass: 1,
  ...extras,
});

test('returns bounded readiness payload for minimal scene', () => {
  const result = evaluateSimReadiness({
    objects: [makeObject(1, { agent: true, sensors: true })],
    trainingData: [],
    benchmarkSummary: null,
    environmentProfile: { temperatureC: 22, pressureKPa: 101.3, humidityPct: 45, windMps: 1.2 },
    is2D: false,
  });

  assert.equal(typeof result.overallScore, 'number');
  assert.equal(Array.isArray(result.gates), true);
  assert.equal(typeof result.releaseReady, 'boolean');
  assert.ok(result.overallScore >= 0 && result.overallScore <= 100);
});

test('improves readiness with richer scene and training evidence', () => {
  const thin = evaluateSimReadiness({
    objects: [makeObject(1, { agent: true, sensors: true })],
    trainingData: [{ reward: 5, solved: false }],
    benchmarkSummary: { episodes: 1, score: 10 },
    environmentProfile: { temperatureC: 22, pressureKPa: 101.3, humidityPct: 45, windMps: 1.2 },
    is2D: false,
  });

  const richObjects = [];
  for (let index = 0; index < 120; index += 1) {
    richObjects.push(makeObject(index, {
      type: index % 6 === 0 ? 'sphere' : index % 5 === 0 ? 'torus' : index % 7 === 0 ? 'sensor' : 'cube',
      mass: index % 3 === 0 ? 0 : 1,
      agent: index < 4,
      sensors: index < 8,
      sensorMount: index % 9 === 0,
    }));
  }

  const richTraining = Array.from({ length: 80 }, (_, index) => ({
    reward: 55 + (index % 8),
    solved: true,
  }));

  const rich = evaluateSimReadiness({
    objects: richObjects,
    trainingData: richTraining,
    benchmarkSummary: { episodes: 60, score: 92 },
    environmentProfile: { temperatureC: 18, pressureKPa: 96, humidityPct: 52, windMps: 6.5 },
    is2D: false,
  });

  assert.ok(rich.overallScore > thin.overallScore);
  assert.ok(rich.categories.sceneComplexity > thin.categories.sceneComplexity);
  assert.ok(rich.categories.trainingMaturity > thin.categories.trainingMaturity);
});

test('scenario suite returns deterministic market readiness summary', () => {
  const objects = Array.from({ length: 80 }, (_, index) => makeObject(index, {
    type: index % 5 === 0 ? 'sensor' : 'cube',
    agent: index < 3,
    sensors: index < 6,
  }));
  const trainingData = Array.from({ length: 90 }, (_, index) => ({
    reward: 45 + (index % 6),
    solved: true,
  }));

  const result = runReadinessScenarioSuite({
    objects,
    trainingData,
    benchmarkSummary: { episodes: 55, score: 88 },
    environmentProfile: { temperatureC: 20, pressureKPa: 100, humidityPct: 48, windMps: 4.2 },
    is2D: false,
  });

  assert.equal(result.scenarios.length, 4);
  assert.equal(typeof result.summary.averageScore, 'number');
  assert.ok(result.summary.transferStability >= 0 && result.summary.transferStability <= 100);
});
