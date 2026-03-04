function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toPercent(value) {
  return `${toNumber(value).toFixed(1)}%`;
}

function scenarioTableRows(scenarioSuite) {
  if (!scenarioSuite?.scenarios?.length) {
    return '| Scenario | Score | Ready |\n|---|---:|:---:|\n| Not executed | - | - |';
  }

  const rows = scenarioSuite.scenarios.map((scenario) => (
    `| ${scenario.label} | ${toNumber(scenario.overallScore).toFixed(1)} | ${scenario.releaseReady ? '✅' : '⚠️'} |`
  ));

  return ['| Scenario | Score | Ready |', '|---|---:|:---:|', ...rows].join('\n');
}

export function buildLaunchEvidencePack({
  workspace,
  readiness,
  scenarioSuite,
  benchmark,
  environmentProfile,
  trainingData,
}) {
  const now = new Date().toISOString();
  const trainingEpisodes = Array.isArray(trainingData) ? trainingData.length : 0;

  const payload = {
    schema: 'nexus-launch-evidence-pack',
    version: '1.0.0',
    generatedAt: now,
    workspace: {
      name: workspace?.name || 'Unnamed Project',
      template: workspace?.template || 'custom',
      projectId: workspace?.projectId || null,
      is2D: Boolean(workspace?.is2D),
    },
    readiness,
    scenarioSuite,
    benchmark,
    environment: {
      temperatureC: toNumber(environmentProfile?.temperatureC, 22),
      pressureKPa: toNumber(environmentProfile?.pressureKPa, 101.3),
      humidityPct: toNumber(environmentProfile?.humidityPct, 45),
      windMps: toNumber(environmentProfile?.windMps, 1.2),
    },
    training: {
      totalEpisodes: trainingEpisodes,
      recentSample: (trainingData || []).slice(-25),
    },
  };

  const md = [
    `# Nexus Sim2Real Launch Evidence Pack`,
    '',
    `Generated: ${now}`,
    '',
    `## Project`,
    `- Name: ${payload.workspace.name}`,
    `- Template: ${payload.workspace.template}`,
    `- Mode: ${payload.workspace.is2D ? '2D' : '3D'}`,
    '',
    `## Readiness Summary`,
    `- Overall Score: ${toNumber(readiness?.overallScore).toFixed(1)}`,
    `- Release Ready: ${readiness?.releaseReady ? 'Yes' : 'No'}`,
    `- Scene Complexity: ${toNumber(readiness?.categories?.sceneComplexity).toFixed(1)}`,
    `- Sensor Coverage: ${toNumber(readiness?.categories?.sensorCoverage).toFixed(1)}`,
    `- Environment Fidelity: ${toNumber(readiness?.categories?.environmentFidelity).toFixed(1)}`,
    `- Training Maturity: ${toNumber(readiness?.categories?.trainingMaturity).toFixed(1)}`,
    `- Benchmark Rigor: ${toNumber(readiness?.categories?.benchmarkRigor).toFixed(1)}`,
    '',
    `## Scenario Suite`,
    scenarioTableRows(scenarioSuite),
    '',
    `## Environment Profile`,
    `- Temperature: ${toNumber(environmentProfile?.temperatureC, 22).toFixed(1)} °C`,
    `- Pressure: ${toNumber(environmentProfile?.pressureKPa, 101.3).toFixed(1)} kPa`,
    `- Humidity: ${toPercent(environmentProfile?.humidityPct || 45)}`,
    `- Wind: ${toNumber(environmentProfile?.windMps, 1.2).toFixed(1)} m/s`,
    '',
    `## Training & Benchmark Evidence`,
    `- Training Episodes Recorded: ${trainingEpisodes}`,
    `- Deterministic Benchmark Episodes: ${toNumber(benchmark?.episodes).toFixed(0)}`,
    `- Deterministic Benchmark Score: ${toNumber(benchmark?.score).toFixed(1)}`,
    '',
    `## Recommended Actions`,
    ...(readiness?.recommendations?.length
      ? readiness.recommendations.map((item) => `- ${item}`)
      : ['- No blocking recommendation from automated readiness heuristics.']),
  ].join('\n');

  return { payload, markdown: md };
}
