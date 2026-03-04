import express from 'express';
import { db } from '../store.js';
import {
  getHighFidelityBridgeHealthSnapshot,
  getSimProviders,
  stepRunWithProvider,
} from '../services/simBridge.js';

export const simRouter = express.Router();

simRouter.get('/providers', (req, res) => {
  return res.status(200).json({ items: getSimProviders() });
});

simRouter.get('/bridge/health', async (req, res) => {
  try {
    const snapshot = await getHighFidelityBridgeHealthSnapshot();
    return res.status(200).json(snapshot);
  } catch (error) {
    return res.status(200).json({
      provider: 'high-fidelity-bridge',
      configured: false,
      available: false,
      status: 'unreachable',
      checkedAt: new Date().toISOString(),
      error: {
        code: 'BRIDGE_HEALTH_UNCAUGHT',
        message: error?.message || 'Bridge health check failed unexpectedly.',
      },
    });
  }
});

simRouter.get('/runs/:runId/snapshot', (req, res) => {
  const run = db.runs.get(req.params.runId);
  if (!run) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Run not found.' } });
  }

  return res.status(200).json({
    runId: run.id,
    status: run.status,
    provider: run.provider,
    progress: run.progress,
    metrics: run.metrics,
    config: run.config,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
  });
});

simRouter.post('/runs/:runId/step', async (req, res) => {
  const run = await stepRunWithProvider(req.params.runId);
  if (!run) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Run not found.' } });
  }

  return res.status(200).json({
    runId: run.id,
    status: run.status,
    provider: run.provider,
    progress: run.progress,
    metrics: run.metrics,
    failureReason: run.failureReason || null,
  });
});
