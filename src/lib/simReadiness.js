function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function avg(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return values.reduce((sum, item) => sum + item, 0) / values.length;
}

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function scoreRange(value, min, max) {
  if (value < min || value > max) return 0;
  const center = (min + max) / 2;
  const halfRange = (max - min) / 2;
  const delta = Math.abs(value - center);
  return clamp((1 - delta / halfRange) * 100, 0, 100);
}

export function evaluateSimReadiness({
  objects = [],
  trainingData = [],
  benchmarkSummary = null,
  environmentProfile = null,
  is2D = false,
}) {
  const totalObjects = Array.isArray(objects) ? objects.length : 0;
  const objectTypes = new Set((objects || []).map((item) => item?.type).filter(Boolean));
  const dynamicObjects = (objects || []).filter((item) => asNumber(item?.mass, 0) > 0);
  const sensorObjects = (objects || []).filter((item) => Boolean(item?.sensors) || Boolean(item?.sensorMount) || item?.type === 'sensor');
  const agentObjects = (objects || []).filter((item) => Boolean(item?.agent));

  const sceneComplexity = clamp(
    clamp(totalObjects / 180, 0, 1) * 55 + clamp(objectTypes.size / 8, 0, 1) * 25 + clamp(dynamicObjects.length / 35, 0, 1) * 20,
    0,
    100,
  );

  const sensorCoverage = clamp(
    clamp(sensorObjects.length / Math.max(3, agentObjects.length * 2), 0, 1) * 65 + clamp(agentObjects.length / 4, 0, 1) * 35,
    0,
    100,
  );

  const temperatureC = asNumber(environmentProfile?.temperatureC, 22);
  const pressureKPa = asNumber(environmentProfile?.pressureKPa, 101.3);
  const humidityPct = asNumber(environmentProfile?.humidityPct, 45);
  const windMps = asNumber(environmentProfile?.windMps, 1.2);

  const environmentFidelity = clamp(
    avg([
      scoreRange(temperatureC, -20, 60),
      scoreRange(pressureKPa, 35, 125),
      scoreRange(humidityPct, 5, 95),
      scoreRange(windMps, 0, 30),
    ]),
    0,
    100,
  );

  const recentTraining = trainingData.slice(-60);
  const rewards = recentTraining.map((item) => asNumber(item?.reward));
  const solvedRate = recentTraining.length
    ? (recentTraining.filter((item) => Boolean(item?.solved)).length / recentTraining.length) * 100
    : 0;
  const rewardScore = clamp(((avg(rewards) + 40) / 120) * 100, 0, 100);
  const consistencyScore = clamp((recentTraining.length / 60) * 100, 0, 100);
  const trainingMaturity = clamp(avg([rewardScore, solvedRate, consistencyScore]), 0, 100);

  const benchmarkEpisodes = asNumber(benchmarkSummary?.episodes, 0);
  const benchmarkScore = asNumber(benchmarkSummary?.score, 0);
  const benchmarkRigor = clamp(
    avg([
      clamp((benchmarkEpisodes / 40) * 100, 0, 100),
      clamp(benchmarkScore, 0, 100),
    ]),
    0,
    100,
  );

  const dimensionalityScore = is2D ? 72 : 95;

  const overallScore = clamp(
    avg([
      sceneComplexity * 0.24,
      sensorCoverage * 0.2,
      environmentFidelity * 0.2,
      trainingMaturity * 0.2,
      benchmarkRigor * 0.12,
      dimensionalityScore * 0.04,
    ]),
    0,
    100,
  );

  const gates = [
    {
      id: 'scene-complexity',
      label: 'Scene complexity',
      target: 72,
      value: sceneComplexity,
      pass: sceneComplexity >= 72,
    },
    {
      id: 'sensor-coverage',
      label: 'Sensor coverage',
      target: 70,
      value: sensorCoverage,
      pass: sensorCoverage >= 70,
    },
    {
      id: 'environment-fidelity',
      label: 'Environment fidelity',
      target: 75,
      value: environmentFidelity,
      pass: environmentFidelity >= 75,
    },
    {
      id: 'training-maturity',
      label: 'Training maturity',
      target: 68,
      value: trainingMaturity,
      pass: trainingMaturity >= 68,
    },
    {
      id: 'benchmark-rigor',
      label: 'Benchmark rigor',
      target: 65,
      value: benchmarkRigor,
      pass: benchmarkRigor >= 65,
    },
  ];

  const recommendations = [];
  if (sceneComplexity < 72) recommendations.push('Increase scene diversity with more dynamic obstacles and varied object types.');
  if (sensorCoverage < 70) recommendations.push('Add sensor pods and enable richer sensor stacks across primary agents.');
  if (environmentFidelity < 75) recommendations.push('Expand atmospheric variance (temperature/pressure/humidity/wind) for domain robustness.');
  if (trainingMaturity < 68) recommendations.push('Run longer training sessions and improve reward shaping until solved-rate stabilizes.');
  if (benchmarkRigor < 65) recommendations.push('Run deterministic benchmark episodes and export reports for release evidence.');

  return {
    generatedAt: new Date().toISOString(),
    overallScore: Number(overallScore.toFixed(1)),
    categories: {
      sceneComplexity: Number(sceneComplexity.toFixed(1)),
      sensorCoverage: Number(sensorCoverage.toFixed(1)),
      environmentFidelity: Number(environmentFidelity.toFixed(1)),
      trainingMaturity: Number(trainingMaturity.toFixed(1)),
      benchmarkRigor: Number(benchmarkRigor.toFixed(1)),
      dimensionality: Number(dimensionalityScore.toFixed(1)),
    },
    metrics: {
      totalObjects,
      dynamicObjects: dynamicObjects.length,
      objectTypeCount: objectTypes.size,
      agents: agentObjects.length,
      sensorObjects: sensorObjects.length,
      trainingEpisodes: recentTraining.length,
      solvedRate: Number(solvedRate.toFixed(1)),
      benchmarkEpisodes,
      benchmarkScore: Number(benchmarkScore.toFixed(1)),
      environment: {
        temperatureC,
        pressureKPa,
        humidityPct,
        windMps,
      },
    },
    gates,
    releaseReady: overallScore >= 78 && gates.every((gate) => gate.pass),
    recommendations,
  };
}

export function runReadinessScenarioSuite({
  objects = [],
  trainingData = [],
  benchmarkSummary = null,
  environmentProfile = null,
  is2D = false,
}) {
  const scenarios = [
    {
      id: 'baseline',
      label: 'Baseline Validation',
      environment: {
        temperatureC: environmentProfile?.temperatureC ?? 22,
        pressureKPa: environmentProfile?.pressureKPa ?? 101.3,
        humidityPct: environmentProfile?.humidityPct ?? 45,
        windMps: environmentProfile?.windMps ?? 1.2,
      },
      rewardShift: 0,
      solvePenalty: 0,
    },
    {
      id: 'thermal-extremes',
      label: 'Thermal Extremes',
      environment: { temperatureC: 52, pressureKPa: 94, humidityPct: 32, windMps: 7.5 },
      rewardShift: -8,
      solvePenalty: 0.12,
    },
    {
      id: 'low-pressure-wind',
      label: 'Low Pressure + Wind',
      environment: { temperatureC: 8, pressureKPa: 72, humidityPct: 58, windMps: 16.5 },
      rewardShift: -10,
      solvePenalty: 0.15,
    },
    {
      id: 'humid-slip',
      label: 'Humid Surface Slip',
      environment: { temperatureC: 25, pressureKPa: 99, humidityPct: 92, windMps: 3.4 },
      rewardShift: -6,
      solvePenalty: 0.08,
    },
  ];

  const resultRows = scenarios.map((scenario) => {
    const adjustedTraining = trainingData.map((item, index) => {
      const solvedBase = Boolean(item?.solved);
      const solvedDropInterval = scenario.solvePenalty <= 0 ? Number.POSITIVE_INFINITY : Math.max(2, Math.round(1 / scenario.solvePenalty));
      const solved = solvedBase && (solvedDropInterval === Number.POSITIVE_INFINITY || index % solvedDropInterval !== 0);
      return {
        ...item,
        reward: asNumber(item?.reward) + scenario.rewardShift,
        solved,
      };
    });

    const summary = evaluateSimReadiness({
      objects,
      trainingData: adjustedTraining,
      benchmarkSummary,
      environmentProfile: scenario.environment,
      is2D,
    });

    return {
      id: scenario.id,
      label: scenario.label,
      overallScore: summary.overallScore,
      releaseReady: summary.releaseReady,
      solvedRate: summary.metrics.solvedRate,
      benchmarkRigor: summary.categories.benchmarkRigor,
    };
  });

  const passCount = resultRows.filter((item) => item.releaseReady).length;
  const averageScore = Number(avg(resultRows.map((item) => item.overallScore)).toFixed(1));
  const transferStability = Number((resultRows.reduce((acc, item) => acc + (item.releaseReady ? 1 : 0), 0) / resultRows.length * 100).toFixed(1));

  return {
    generatedAt: new Date().toISOString(),
    scenarios: resultRows,
    summary: {
      averageScore,
      passCount,
      total: resultRows.length,
      transferStability,
      marketReady: averageScore >= 80 && passCount >= resultRows.length - 1,
    },
  };
}
