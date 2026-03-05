import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config.js';

export const commonMiddlewares = [
  helmet(),
  cors({ origin: config.corsOrigin }),
  express.json({ limit: '2mb' }),
  morgan('combined'),
  rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      const path = req.path || '';
      if (path === '/api/v1/ml/train-step') return true;
      if (path === '/api/v1/ml/save-model') return true;
      if (path === '/api/v1/ml/health') return true;
      if (path === '/api/v1/sim/bridge/health') return true;
      return false;
    },
    handler: (req, res) => {
      return res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please slow down and retry.',
        },
      });
    },
  }),
];

export function requireApiKey(req, res, next) {
  if (!config.apiKey) return next();

  const key = req.header('x-api-key');
  if (!key || key !== config.apiKey) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid API key.',
      },
    });
  }

  return next();
}
