import { db } from '../store.js';
import { config } from '../config.js';

const DEFAULT_BRIDGE_STEP_PATH = '/runs/step';
const BRIDGE_MAX_RETRIES = 1;

function getHighFidelityBridgeUrl() {
  return (config.highFidelityBridgeUrl || '').trim();
}

function isHighFidelityBridgeConfigured() {
  return Boolean(getHighFidelityBridgeUrl());
}

function createSeededRandom(seedValue) {
  let state = Number(seedValue);
  if (!Number.isFinite(state) || state <= 0) state = Date.now();
  state = Math.floor(state) % 2147483647;
  if (state <= 0) state += 2147483646;

  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

const providerCatalog = [
  {
    id: 'local-deterministic',
    name: 'Local Deterministic Simulator',
    fidelity: 'high-web',
    realtime: true,
    availability: () => true,
    description: 'Deterministic, scene-aware training worker with reproducible metrics.',
  },
  {
    id: 'high-fidelity-bridge',
    name: 'High Fidelity Bridge Adapter',
    fidelity: 'external-native',
    realtime: true,
    availability: () => isHighFidelityBridgeConfigured(),
    description: 'HTTP bridge adapter for external native simulators (Isaac/Gazebo/MuJoCo bridge).',
  },
];

function clampNumber(value, min, max, fallback = min) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

function pickNumeric(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeProviderCatalogItem(item) {
  return {
    id: item.id,
    name: item.name,
    fidelity: item.fidelity,
    realtime: item.realtime,
    available: item.availability(),
    description: item.description,
  };
}

function buildBridgeHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };
  const key = (config.highFidelityBridgeApiKey || '').trim();
  if (key) {
    headers['x-api-key'] = key;
  }
  return headers;
}

function getBridgeStepUrl() {
  const baseUrl = getHighFidelityBridgeUrl();
  if (!baseUrl) return '';
  return `${baseUrl.replace(/\/$/, '')}${DEFAULT_BRIDGE_STEP_PATH}`;
}

function getBridgeHealthUrl() {
  const baseUrl = getHighFidelityBridgeUrl();
  if (!baseUrl) return '';
  return `${baseUrl.replace(/\/$/, '')}/health`;
}

function shouldRetryBridgeRequest(statusCode) {
  return !statusCode || statusCode >= 500 || statusCode === 429;
}

function mapBridgeError(error) {
  if (error?.name === 'AbortError') {
    return {
      code: 'BRIDGE_TIMEOUT',
      message: `High-fidelity bridge request timed out after ${config.highFidelityBridgeTimeoutMs}ms.`,
      retryable: true,
    };
  }

  if (typeof error?.status === 'number') {
    const bodyMessage = typeof error.body?.error?.message === 'string'
      ? error.body.error.message
      : typeof error.body?.message === 'string'
        ? error.body.message
        : '';
    return {
      code: 'BRIDGE_HTTP_ERROR',
      message: bodyMessage || `High-fidelity bridge returned HTTP ${error.status}.`,
      retryable: shouldRetryBridgeRequest(error.status),
    };
  }

  if (error instanceof Error) {
    return {
      code: 'BRIDGE_REQUEST_FAILED',
      message: error.message || 'Failed to reach high-fidelity bridge.',
      retryable: true,
    };
  }

  return {
    code: 'BRIDGE_UNKNOWN',
    message: 'Unknown high-fidelity bridge failure.',
    retryable: false,
  };
}

async function requestBridgeStep(payload) {
  const url = getBridgeStepUrl();
  if (!url) {
    throw new Error('High-fidelity bridge URL is not configured.');
  }

  let lastError;

  for (let attempt = 0; attempt <= BRIDGE_MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.highFidelityBridgeTimeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: buildBridgeHeaders(),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      let body = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok) {
        const httpError = new Error(`High-fidelity bridge returned HTTP ${response.status}.`);
        httpError.status = response.status;
        httpError.body = body;
        throw httpError;
      }

      return body || {};
    } catch (error) {
      lastError = error;
      const normalized = mapBridgeError(error);
      const canRetry = normalized.retryable && attempt < BRIDGE_MAX_RETRIES;
      if (!canRetry) {
        throw normalized;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw mapBridgeError(lastError);
}

async function requestBridgeHealth() {
  const url = getBridgeHealthUrl();
  if (!url) {
    throw new Error('High-fidelity bridge URL is not configured.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.highFidelityBridgeTimeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: buildBridgeHeaders(),
      signal: controller.signal,
    });

    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok) {
      const httpError = new Error(`High-fidelity bridge health check returned HTTP ${response.status}.`);
      httpError.status = response.status;
      httpError.body = body;
      throw httpError;
    }

    return {
      statusCode: response.status,
      body,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function getSceneComplexity(project) {
  const objects = project?.scene?.objects || [];
  const obstacleCount = objects.filter((item) => ['cube', 'sphere', 'torus'].includes(item.type)).length;
  const agentCount = objects.filter((item) => item.agent).length;
  return {
    objectCount: objects.length,
    obstacleCount,
    agentCount,
  };
}

function ensureProviderState(run, project) {
  if (run.providerState) return run.providerState;

  const complexity = getSceneComplexity(project);
  const random = createSeededRandom(run.config.seed ?? 42);

  const maxEpisodes = Math.max(60, Math.min(3000, Math.floor((run.config.maxSteps ?? 200000) / 1200)));
  const targetReward = 38 + (complexity.obstacleCount * 0.18) + (run.config.model === 'ppo' ? 4 : 1);

  run.providerState = {
    version: '1.0.0',
    startedAt: Date.now(),
    tick: 0,
    maxEpisodes,
    targetReward,
    bestReward: -50,
    solvedEpisodes: 0,
    randomStateSeed: run.config.seed ?? 42,
    complexity,
  };

  run.metrics = {
    episode: 0,
    meanReward: -10,
    successRate: 0,
    benchmarkScore: 0,
  };

  run._rng = random;
  return run.providerState;
}

function getRunRandom(run) {
  if (!run._rng) {
    run._rng = createSeededRandom(run.providerState?.randomStateSeed ?? run.config.seed ?? 42);
  }
  return run._rng;
}

export function getSimProviders() {
  return providerCatalog.map(normalizeProviderCatalogItem);
}

export function isProviderSupported(providerId) {
  const provider = getSimProviders().find((item) => item.id === providerId);
  return Boolean(provider?.available);
}

export async function getHighFidelityBridgeHealthSnapshot() {
  const checkedAt = new Date().toISOString();
  const configured = isHighFidelityBridgeConfigured();
  const bridgeUrl = getHighFidelityBridgeUrl();

  if (!configured) {
    return {
      provider: 'high-fidelity-bridge',
      configured: false,
      available: false,
      status: 'disabled',
      checkedAt,
      bridgeUrl: '',
      timeoutMs: config.highFidelityBridgeTimeoutMs,
      message: 'Set HF_BRIDGE_URL to enable external high-fidelity bridge checks.',
    };
  }

  try {
    const response = await requestBridgeHealth();
    return {
      provider: 'high-fidelity-bridge',
      configured: true,
      available: true,
      status: 'ok',
      checkedAt,
      bridgeUrl,
      timeoutMs: config.highFidelityBridgeTimeoutMs,
      upstreamStatusCode: response.statusCode,
      upstream: response.body || {},
    };
  } catch (error) {
    const mappedError = mapBridgeError(error);
    return {
      provider: 'high-fidelity-bridge',
      configured: true,
      available: false,
      status: 'unreachable',
      checkedAt,
      bridgeUrl,
      timeoutMs: config.highFidelityBridgeTimeoutMs,
      error: {
        code: mappedError.code,
        message: mappedError.message,
        retryable: Boolean(mappedError.retryable),
      },
    };
  }
}

function stepRunWithLocalDeterministic(run, project) {
  const state = ensureProviderState(run, project);
  const random = getRunRandom(run);

  state.tick += 1;

  const complexityPenalty = Math.min(20, state.complexity.obstacleCount * 0.25);
  const learningRate = run.config.model === 'ppo' ? 1.25 : 1.0;
  const exploration = Math.max(0.05, 1 - (run.metrics.episode / state.maxEpisodes));

  const episodeJump = Math.max(1, Math.floor((2 + random() * 6) * learningRate));
  run.metrics.episode += episodeJump;

  const rewardDrift = (state.targetReward - run.metrics.meanReward) * (0.045 + learningRate * 0.01);
  const rewardNoise = (random() * 2 - 1) * (2.8 * exploration);
  const rewardPenalty = complexityPenalty * 0.01;
  const nextReward = run.metrics.meanReward + rewardDrift + rewardNoise - rewardPenalty;
  run.metrics.meanReward = Number(Math.max(-60, Math.min(120, nextReward)).toFixed(2));

  if (run.metrics.meanReward > state.bestReward) state.bestReward = run.metrics.meanReward;
  if (run.metrics.meanReward >= state.targetReward * 0.92) state.solvedEpisodes += 1;

  const progressFromEpisodes = (run.metrics.episode / state.maxEpisodes) * 100;
  const progressFromReward = ((run.metrics.meanReward + 60) / (state.targetReward + 60)) * 100;
  run.progress = Number(Math.max(run.progress || 0, Math.min(100, Math.max(progressFromEpisodes, progressFromReward))).toFixed(1));

  const successRate = run.metrics.episode > 0
    ? Math.min(1, state.solvedEpisodes / Math.max(1, Math.floor(run.metrics.episode / 10)))
    : 0;
  run.metrics.successRate = Number((successRate * 100).toFixed(1));

  const benchmarkScore =
    Math.max(0, Math.min(100, (run.metrics.meanReward + 50))) * 0.5 +
    run.metrics.successRate * 0.4 +
    Math.max(0, 10 - complexityPenalty) * 1.0;
  run.metrics.benchmarkScore = Number(Math.max(0, Math.min(100, benchmarkScore)).toFixed(2));

  if (run.progress >= 100 || run.metrics.episode >= state.maxEpisodes) {
    run.status = 'completed';
    run.progress = 100;
    run.finishedAt = new Date().toISOString();
  }
}

function applyBridgeStepResult(run, result) {
  const nextStatus = typeof result?.status === 'string' ? result.status : run.status;
  if (['queued', 'running', 'completed', 'failed'].includes(nextStatus)) {
    run.status = nextStatus;
  }

  run.progress = Number(clampNumber(result?.progress, 0, 100, run.progress).toFixed(1));

  if (result?.metrics && typeof result.metrics === 'object') {
    run.metrics = {
      ...run.metrics,
      episode: Math.floor(clampNumber(result.metrics.episode, 0, Number.MAX_SAFE_INTEGER, run.metrics.episode)),
      meanReward: Number(pickNumeric(result.metrics.meanReward, run.metrics.meanReward).toFixed(2)),
      successRate: Number(clampNumber(result.metrics.successRate, 0, 100, run.metrics.successRate).toFixed(1)),
      benchmarkScore: Number(clampNumber(result.metrics.benchmarkScore, 0, 100, run.metrics.benchmarkScore).toFixed(2)),
    };
  }

  if (result?.providerState && typeof result.providerState === 'object') {
    run.providerState = result.providerState;
  }

  if (run.status === 'running' && !run.startedAt) {
    run.startedAt = new Date().toISOString();
  }

  if (run.status === 'completed') {
    run.progress = 100;
    run.finishedAt = run.finishedAt || new Date().toISOString();
  }

  if (run.status === 'failed') {
    run.failureReason = typeof result?.failureReason === 'string' && result.failureReason.length > 0
      ? result.failureReason
      : run.failureReason || 'High-fidelity provider marked run as failed.';
    run.finishedAt = run.finishedAt || new Date().toISOString();
  }
}

async function stepRunWithHighFidelityBridge(run, project) {
  const payload = {
    runId: run.id,
    projectId: run.projectId,
    provider: run.provider,
    status: run.status,
    progress: run.progress,
    config: run.config,
    metrics: run.metrics,
    providerState: run.providerState ?? null,
    scene: project.scene || null,
  };

  const response = await requestBridgeStep(payload);
  applyBridgeStepResult(run, response);
}

export async function stepRunWithProvider(runId) {
  const run = db.runs.get(runId);
  if (!run) return null;

  const project = db.projects.get(run.projectId);
  if (!project) {
    run.status = 'failed';
    run.failureReason = 'Project not found for run.';
    return run;
  }

  const providerId = run.provider || 'local-deterministic';
  if (!isProviderSupported(providerId)) {
    run.status = 'failed';
    run.failureReason = `Provider '${providerId}' is not available.`;
    return run;
  }

  if (run.status === 'queued') {
    run.status = 'running';
    run.startedAt = new Date().toISOString();
    run.progress = Math.max(3, run.progress || 0);
  }

  if (run.status !== 'running') return run;
  try {
    if (providerId === 'high-fidelity-bridge') {
      await stepRunWithHighFidelityBridge(run, project);
    } else {
      stepRunWithLocalDeterministic(run, project);
    }
  } catch (error) {
    run.status = 'failed';
    run.failureReason = error?.message || 'Provider step failed.';
    run.finishedAt = new Date().toISOString();
  }

  return run;
}
