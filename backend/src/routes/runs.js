import express from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../store.js';
import { runCreateSchema } from '../validators.js';
import { getSimProviders } from '../services/simBridge.js';

export const runsRouter = express.Router();

runsRouter.post('/', (req, res) => {
  const parsed = runCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: parsed.error.message } });
  }

  const project = db.projects.get(parsed.data.projectId);
  if (!project) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found.' } });
  }

  const id = `run_${uuid().slice(0, 10)}`;
  const requestedProvider = parsed.data.provider || 'local-deterministic';
  const provider = getSimProviders().find((item) => item.id === requestedProvider);
  if (!provider) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_FAILED',
        message: `Unknown provider '${requestedProvider}'.`,
      },
    });
  }

  if (!provider.available) {
    return res.status(400).json({
      error: {
        code: 'PROVIDER_UNAVAILABLE',
        message: `Provider '${requestedProvider}' is not available in this environment.`,
      },
    });
  }

  const selectedProvider = provider.id;
  const run = {
    id,
    projectId: parsed.data.projectId,
    status: 'queued',
    progress: 0,
    etaMinutes: 4,
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
    config: {
      model: parsed.data.model,
      environment: parsed.data.environment,
      robot: parsed.data.robot,
      maxSteps: parsed.data.maxSteps ?? 200000,
      seed: parsed.data.seed ?? 42,
      deterministic: parsed.data.deterministic ?? true,
    },
    provider: selectedProvider,
    metrics: {
      episode: 0,
      meanReward: -10,
      successRate: 0,
      benchmarkScore: 0,
    },
  };

  db.runs.set(id, run);
  return res.status(202).json({ runId: id, status: run.status, etaMinutes: run.etaMinutes });
});

runsRouter.get('/:runId', (req, res) => {
  const run = db.runs.get(req.params.runId);
  if (!run) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Run not found.' } });
  }

  return res.status(200).json(run);
});

runsRouter.get('/project/:projectId/list', (req, res) => {
  const runs = [...db.runs.values()]
    .filter((item) => item.projectId === req.params.projectId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.status(200).json({ items: runs });
});
