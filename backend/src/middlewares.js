import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
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
