import express from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../store.js';
import { projectCreateSchema, sceneSaveSchema } from '../validators.js';

export const projectsRouter = express.Router();

projectsRouter.post('/', (req, res) => {
  const parsed = projectCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: parsed.error.message } });
  }

  const id = `proj_${uuid().slice(0, 10)}`;
  const project = {
    id,
    ...parsed.data,
    status: 'ready',
    createdAt: new Date().toISOString(),
    scene: { schemaVersion: '1.0.0', objects: [] },
  };

  db.projects.set(id, project);
  return res.status(201).json(project);
});

projectsRouter.put('/:projectId/scene', (req, res) => {
  const project = db.projects.get(req.params.projectId);
  if (!project) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found.' } });
  }

  const parsed = sceneSaveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: parsed.error.message } });
  }

  project.scene = parsed.data;
  return res.status(200).json({ saved: true, objectCount: parsed.data.objects.length });
});

projectsRouter.get('/:projectId/export', (req, res) => {
  const project = db.projects.get(req.params.projectId);
  if (!project) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found.' } });
  }

  const runs = [...db.runs.values()].filter((item) => item.projectId === project.id);
  const models = [...db.models.values()].filter((item) => item.projectId === project.id);

  return res.status(200).json({
    schemaVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    workspace: {
      name: project.name,
      template: project.template,
      projectId: project.id,
      is2D: project.is2D,
      config: project.config || null,
    },
    scene: project.scene,
    training: {
      model: project.config?.model || 'ppo',
      queuedRuns: runs,
      models,
    },
  });
});
