import express from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../store.js';
import { modelCreateSchema } from '../validators.js';

export const modelsRouter = express.Router();

modelsRouter.post('/', (req, res) => {
  const parsed = modelCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: parsed.error.message } });
  }

  const run = db.runs.get(parsed.data.runId);
  if (!run) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Run not found.' } });
  }

  const id = `model_${uuid().slice(0, 10)}`;
  const model = {
    id,
    status: 'registered',
    deployed: false,
    createdAt: new Date().toISOString(),
    ...parsed.data,
  };

  db.models.set(id, model);
  return res.status(201).json(model);
});

modelsRouter.get('/project/:projectId/list', (req, res) => {
  const items = [...db.models.values()]
    .filter((item) => item.projectId === req.params.projectId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.status(200).json({ items });
});

modelsRouter.post('/:modelId/deploy', (req, res) => {
  const model = db.models.get(req.params.modelId);
  if (!model) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Model not found.' } });
  }

  model.deployed = true;
  model.status = 'active';
  return res.status(200).json({ deployed: true, modelId: model.id });
});
