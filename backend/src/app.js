import express from 'express';
import { commonMiddlewares, requireApiKey } from './middlewares.js';
import { projectsRouter } from './routes/projects.js';
import { runsRouter } from './routes/runs.js';
import { modelsRouter } from './routes/models.js';
import { templatesRouter } from './routes/templates.js';
import { simRouter } from './routes/sim.js';

export function createApp() {
  const app = express();
  commonMiddlewares.forEach((middleware) => app.use(middleware));

  app.get('/health', (req, res) => {
    res.status(200).json({ ok: true, service: 'nexus-ai-sim-api' });
  });

  app.use('/api/v1', requireApiKey);
  app.use('/api/v1/projects', projectsRouter);
  app.use('/api/v1/runs', runsRouter);
  app.use('/api/v1/models', modelsRouter);
  app.use('/api/v1/templates', templatesRouter);
  app.use('/api/v1/sim', simRouter);

  app.use((req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    });
  });

  return app;
}
