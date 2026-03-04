import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLaunchEvidencePack } from '../src/lib/launchEvidencePack.js';

test('buildLaunchEvidencePack returns payload and markdown summary', () => {
  const result = buildLaunchEvidencePack({
    workspace: { name: 'Market Release', template: 'terrain', projectId: 'p1', is2D: false },
    readiness: {
      overallScore: 84.2,
      releaseReady: true,
      categories: {
        sceneComplexity: 88,
        sensorCoverage: 82,
        environmentFidelity: 78,
        trainingMaturity: 86,
        benchmarkRigor: 79,
      },
      recommendations: [],
    },
    scenarioSuite: {
      scenarios: [
        { id: 'baseline', label: 'Baseline Validation', overallScore: 85, releaseReady: true },
      ],
      summary: { averageScore: 85, passCount: 1, total: 1, transferStability: 100, marketReady: true },
    },
    benchmark: { episodes: 60, score: 89 },
    environmentProfile: { temperatureC: 20, pressureKPa: 100, humidityPct: 50, windMps: 5 },
    trainingData: Array.from({ length: 12 }, () => ({ reward: 50, solved: true })),
  });

  assert.equal(result.payload.schema, 'nexus-launch-evidence-pack');
  assert.equal(typeof result.markdown, 'string');
  assert.match(result.markdown, /Launch Evidence Pack/);
  assert.match(result.markdown, /Overall Score: 84.2/);
  assert.match(result.markdown, /Baseline Validation/);
});
